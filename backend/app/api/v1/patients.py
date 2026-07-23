from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.patient import PatientProfile, PatientProfileUpdate

router = APIRouter(prefix="/patients", tags=["patients"])


def _get_patient_or_404(db: Session, user_id: int) -> Patient:
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
    return patient


@router.get("/me", response_model=PatientProfile)
def get_my_profile(
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    return _get_patient_or_404(db, current_user.id)


@router.put("/me", response_model=PatientProfile)
def update_my_profile(
    payload: PatientProfileUpdate,
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient
