from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.patients import _get_patient_or_404
from app.api.v1.pharmacies import _get_pharmacy_or_404
from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.medicine import Medicine
from app.models.order import FulfillmentType, Order, OrderItem, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.pharmacy import Pharmacy
from app.models.prescription import Prescription
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderItemResponse, OrderResponse, OrderStatusUpdate
from app.services.notifications import get_notification_service, notify_order_status_update

router = APIRouter(prefix="/orders", tags=["orders"])

ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {OrderStatus.preparing, OrderStatus.cancelled},
    OrderStatus.preparing: {OrderStatus.shipped, OrderStatus.ready_for_pickup, OrderStatus.cancelled},
    OrderStatus.shipped: {OrderStatus.delivered},
    OrderStatus.ready_for_pickup: {OrderStatus.delivered},
    OrderStatus.delivered: set(),
    OrderStatus.cancelled: set(),
}


def _get_order_or_404(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        patient_id=order.patient_id,
        pharmacy_id=order.pharmacy_id,
        prescription_id=order.prescription_id,
        prescription_file_url=order.prescription.file_url if order.prescription else None,
        fulfillment_type=order.fulfillment_type,
        delivery_address=order.delivery_address,
        status=order.status,
        total_amount=order.total_amount,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[
            OrderItemResponse(
                medicine_id=item.medicine_id,
                medicine_name=item.medicine.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in order.items
        ],
    )


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)

    pharmacy = db.get(Pharmacy, payload.pharmacy_id)
    if pharmacy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pharmacy not found")
    if not pharmacy.user.is_approved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy is not approved yet")

    prescription = None
    if payload.prescription_id is not None:
        prescription = db.get(Prescription, payload.prescription_id)
        if prescription is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
        if prescription.patient_id != patient.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Prescription does not belong to you"
            )

    if payload.fulfillment_type == FulfillmentType.delivery and not payload.delivery_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Delivery address is required for delivery orders"
        )

    resolved_items: list[tuple[Medicine, int]] = []
    total_amount = Decimal("0")
    for item in payload.items:
        medicine = db.get(Medicine, item.medicine_id)
        if medicine is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Medicine {item.medicine_id} not found"
            )
        if medicine.pharmacy_id != pharmacy.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Medicine '{medicine.name}' does not belong to the selected pharmacy",
            )
        if medicine.requires_prescription and prescription is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A valid prescription is required for '{medicine.name}'",
            )
        if medicine.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for '{medicine.name}'"
            )
        resolved_items.append((medicine, item.quantity))
        total_amount += medicine.price * item.quantity

    order = Order(
        patient_id=patient.id,
        pharmacy_id=pharmacy.id,
        prescription_id=prescription.id if prescription else None,
        fulfillment_type=payload.fulfillment_type,
        delivery_address=payload.delivery_address,
        status=OrderStatus.pending,
        total_amount=total_amount,
    )
    db.add(order)
    db.flush()

    for medicine, quantity in resolved_items:
        medicine.stock_quantity -= quantity
        db.add(OrderItem(order_id=order.id, medicine_id=medicine.id, quantity=quantity, unit_price=medicine.price))

    db.commit()
    db.refresh(order)
    return _to_response(order)


@router.get("/me", response_model=list[OrderResponse])
def list_my_orders(
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)
    orders = (
        db.query(Order).filter(Order.patient_id == patient.id).order_by(Order.created_at.desc()).all()
    )
    return [_to_response(o) for o in orders]


@router.get("/pharmacy/me", response_model=list[OrderResponse])
def list_pharmacy_orders(
    current_user: User = Depends(require_role(UserRole.pharmacy)),
    db: Session = Depends(get_db),
):
    pharmacy = _get_pharmacy_or_404(db, current_user.id)
    orders = (
        db.query(Order).filter(Order.pharmacy_id == pharmacy.id).order_by(Order.created_at.desc()).all()
    )
    return [_to_response(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = _get_order_or_404(db, order_id)

    if current_user.role == UserRole.admin:
        pass
    elif current_user.role == UserRole.patient:
        patient = _get_patient_or_404(db, current_user.id)
        if order.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")
    elif current_user.role == UserRole.pharmacy:
        pharmacy = _get_pharmacy_or_404(db, current_user.id)
        if order.pharmacy_id != pharmacy.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this order")

    return _to_response(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.pharmacy, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update order status")

    order = _get_order_or_404(db, order_id)

    if current_user.role == UserRole.pharmacy:
        pharmacy = _get_pharmacy_or_404(db, current_user.id)
        if order.pharmacy_id != pharmacy.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")

    new_status = payload.status
    allowed = ALLOWED_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition order from '{order.status.value}' to '{new_status.value}'",
        )

    if order.status == OrderStatus.pending and new_status != OrderStatus.cancelled:
        has_succeeded_payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.id, Payment.status == PaymentStatus.succeeded)
            .first()
            is not None
        )
        if not has_succeeded_payment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Order must be paid before it can be processed"
            )

    if new_status == OrderStatus.cancelled and order.status in (OrderStatus.pending, OrderStatus.preparing):
        for item in order.items:
            item.medicine.stock_quantity += item.quantity

    order.status = new_status
    notify_order_status_update(db, get_notification_service(), order.patient.user, order.id, new_status.value)
    db.commit()
    db.refresh(order)
    return _to_response(order)
