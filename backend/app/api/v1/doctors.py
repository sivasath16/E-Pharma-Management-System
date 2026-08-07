from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.appointment import DoctorAvailabilitySlot
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.appointment import AvailabilitySlotCreate, AvailabilitySlotResponse
from app.schemas.doctor import DoctorProfile, DoctorProfileUpdate

router = APIRouter(prefix="/doctors", tags=["doctors"])


def _get_doctor_or_404(db: Session, user_id: int) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.user_id == user_id).first()
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return doctor


def _to_profile(doctor: Doctor) -> DoctorProfile:
    return DoctorProfile(
        id=doctor.id,
        full_name=doctor.full_name,
        qualification=doctor.qualification,
        specialization=doctor.specialization,
        degree_doc_url=doctor.degree_doc_url,
        license_doc_url=doctor.license_doc_url,
        availability=doctor.availability,
        is_approved=doctor.user.is_approved,
    )


@router.get("/me", response_model=DoctorProfile)
def get_my_profile(
    current_user: User = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, current_user.id)
    return _to_profile(doctor)


@router.put("/me", response_model=DoctorProfile)
def update_my_profile(
    payload: DoctorProfileUpdate,
    current_user: User = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return _to_profile(doctor)


@router.post("/{user_id}/approve", response_model=DoctorProfile)
def approve_doctor(
    user_id: int,
    _: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, user_id)
    doctor.user.is_approved = True
    db.commit()
    db.refresh(doctor)
    return _to_profile(doctor)


@router.post(
    "/availability-slots", response_model=AvailabilitySlotResponse, status_code=status.HTTP_201_CREATED
)
def create_availability_slot(
    payload: AvailabilitySlotCreate,
    current_user: User = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, current_user.id)

    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time must be before end_time")
    if payload.start_time <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time must be in the future")

    overlapping = (
        db.query(DoctorAvailabilitySlot)
        .filter(
            DoctorAvailabilitySlot.doctor_id == doctor.id,
            DoctorAvailabilitySlot.start_time < payload.end_time,
            DoctorAvailabilitySlot.end_time > payload.start_time,
        )
        .first()
    )
    if overlapping is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This slot overlaps with an existing availability slot"
        )

    slot = DoctorAvailabilitySlot(
        doctor_id=doctor.id, start_time=payload.start_time, end_time=payload.end_time
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.get("/{doctor_id}/availability-slots", response_model=list[AvailabilitySlotResponse])
def list_availability_slots(
    doctor_id: int,
    available_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(DoctorAvailabilitySlot).filter(DoctorAvailabilitySlot.doctor_id == doctor_id)
    if available_only:
        query = query.filter(
            DoctorAvailabilitySlot.is_booked.is_(False),
            DoctorAvailabilitySlot.start_time > datetime.now(timezone.utc),
        )
    return query.order_by(DoctorAvailabilitySlot.start_time).all()


@router.delete("/availability-slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_availability_slot(
    slot_id: int,
    current_user: User = Depends(require_role(UserRole.doctor)),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(db, current_user.id)
    slot = db.get(DoctorAvailabilitySlot, slot_id)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found")
    if slot.doctor_id != doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this slot"
        )
    if slot.is_booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a booked slot")
    db.delete(slot)
    db.commit()
