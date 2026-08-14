from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.appointments import _to_response as appointment_to_response
from app.api.v1.orders import _to_response as order_to_response
from app.core.deps import require_role
from app.db.session import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.models.order import Order, OrderStatus
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole
from app.schemas.admin import PendingApprovalItem, PendingApprovalsResponse, ReportSummary, UserStatusUpdate
from app.schemas.appointment import AppointmentResponse
from app.schemas.auth import UserResponse
from app.schemas.order import OrderResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(require_role(UserRole.admin))])
def list_users(
    role: UserRole | None = None,
    is_active: bool | None = None,
    is_approved: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role is not None:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_approved is not None:
        query = query.filter(User.is_approved == is_approved)
    return query.order_by(User.id).offset(skip).limit(limit).all()


@router.get("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(require_role(UserRole.admin))])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own active status")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/pending-approvals",
    response_model=PendingApprovalsResponse,
    dependencies=[Depends(require_role(UserRole.admin))],
)
def list_pending_approvals(db: Session = Depends(get_db)):
    doctors = db.query(Doctor).filter(Doctor.user.has(User.is_approved.is_(False))).all()
    pharmacies = db.query(Pharmacy).filter(Pharmacy.user.has(User.is_approved.is_(False))).all()
    return PendingApprovalsResponse(
        doctors=[
            PendingApprovalItem(user_id=d.user_id, email=d.user.email, name=d.full_name, role=UserRole.doctor)
            for d in doctors
        ],
        pharmacies=[
            PendingApprovalItem(user_id=p.user_id, email=p.user.email, name=p.store_name, role=UserRole.pharmacy)
            for p in pharmacies
        ],
    )


@router.get(
    "/orders", response_model=list[OrderResponse], dependencies=[Depends(require_role(UserRole.admin))]
)
def list_all_orders(
    status_filter: OrderStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Order)
    if status_filter is not None:
        query = query.filter(Order.status == status_filter)
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return [order_to_response(o) for o in orders]


@router.get(
    "/appointments",
    response_model=list[AppointmentResponse],
    dependencies=[Depends(require_role(UserRole.admin))],
)
def list_all_appointments(
    status_filter: AppointmentStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment)
    if status_filter is not None:
        query = query.filter(Appointment.status == status_filter)
    appointments = query.order_by(Appointment.created_at.desc()).offset(skip).limit(limit).all()
    return [appointment_to_response(a) for a in appointments]


@router.get(
    "/reports/summary", response_model=ReportSummary, dependencies=[Depends(require_role(UserRole.admin))]
)
def report_summary(db: Session = Depends(get_db)):
    users_by_role = {
        role.value: db.query(User).filter(User.role == role).count() for role in UserRole
    }

    pending_doctors = db.query(Doctor).filter(Doctor.user.has(User.is_approved.is_(False))).count()
    pending_pharmacies = db.query(Pharmacy).filter(Pharmacy.user.has(User.is_approved.is_(False))).count()

    orders_by_status = {
        s.value: db.query(Order).filter(Order.status == s).count() for s in OrderStatus
    }
    appointments_by_status = {
        s.value: db.query(Appointment).filter(Appointment.status == s).count() for s in AppointmentStatus
    }

    delivered_orders = db.query(Order).filter(Order.status == OrderStatus.delivered).all()
    total_revenue = sum((o.total_amount for o in delivered_orders), Decimal("0"))

    return ReportSummary(
        users_by_role=users_by_role,
        pending_approvals_count=pending_doctors + pending_pharmacies,
        orders_by_status=orders_by_status,
        total_revenue=total_revenue,
        appointments_by_status=appointments_by_status,
    )
