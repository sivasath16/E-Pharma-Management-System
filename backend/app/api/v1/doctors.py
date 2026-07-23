from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.doctor import Doctor
from app.models.user import User, UserRole
from app.schemas.doctor import DoctorProfile, DoctorProfileUpdate

router = APIRouter(prefix="/doctors", tags=["doctors"])


def _get_doctor_or_404(db: Session, user_id: int) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.user_id == user_id).first()
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
    return doctor


def _to_profile(doctor: Doctor) -> DoctorProfile:
    return DoctorProfile(
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
