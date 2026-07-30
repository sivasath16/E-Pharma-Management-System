from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.patients import _get_patient_or_404
from app.core.deps import require_role
from app.db.session import get_db
from app.models.prescription import Prescription
from app.models.user import User, UserRole
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def upload_prescription(
    payload: PrescriptionCreate,
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)
    prescription = Prescription(patient_id=patient.id, **payload.model_dump())
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription


@router.get("/me", response_model=list[PrescriptionResponse])
def list_my_prescriptions(
    current_user: User = Depends(require_role(UserRole.patient)),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(db, current_user.id)
    return (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient.id)
        .order_by(Prescription.uploaded_at.desc())
        .all()
    )
