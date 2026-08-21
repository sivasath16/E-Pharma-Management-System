from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.orders import _get_order_or_404
from app.api.v1.patients import _get_patient_or_404
from app.api.v1.pharmacies import _get_pharmacy_or_404
from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.notifications import get_notification_service, notify_payment_receipt
from app.services.payments import get_payment_provider

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)
    order = _get_order_or_404(db, payload.order_id)
    if order.patient_id != patient.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your order")

    already_paid = (
        db.query(Payment)
        .filter(Payment.order_id == order.id, Payment.status == PaymentStatus.succeeded)
        .first()
    )
    if already_paid is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order already paid")

    result = get_payment_provider().charge(order.total_amount, simulate_failure=payload.simulate_failure)

    payment = Payment(
        order_id=order.id,
        amount=order.total_amount,
        status=PaymentStatus.succeeded if result.success else PaymentStatus.failed,
        provider="mock",
        provider_reference=result.reference or None,
    )
    db.add(payment)

    if result.success:
        notify_payment_receipt(db, get_notification_service(), order.patient.user, order.id, order.total_amount)

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/order/{order_id}", response_model=list[PaymentResponse])
def list_order_payments(
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these payments")

    return db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.created_at.desc()).all()
