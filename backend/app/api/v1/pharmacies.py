from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole
from app.schemas.pharmacy import PharmacyProfile, PharmacyProfileUpdate

router = APIRouter(prefix="/pharmacies", tags=["pharmacies"])


def _get_pharmacy_or_404(db: Session, user_id: int) -> Pharmacy:
    pharmacy = db.query(Pharmacy).filter(Pharmacy.user_id == user_id).first()
    if pharmacy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pharmacy profile not found")
    return pharmacy


def _to_profile(pharmacy: Pharmacy) -> PharmacyProfile:
    return PharmacyProfile(
        store_name=pharmacy.store_name,
        license_number=pharmacy.license_number,
        drug_license_url=pharmacy.drug_license_url,
        gstin=pharmacy.gstin,
        address=pharmacy.address,
        is_approved=pharmacy.user.is_approved,
    )


@router.get("/me", response_model=PharmacyProfile)
def get_my_profile(
    current_user: User = Depends(require_role(UserRole.pharmacy)),
    db: Session = Depends(get_db),
):
    pharmacy = _get_pharmacy_or_404(db, current_user.id)
    return _to_profile(pharmacy)


@router.put("/me", response_model=PharmacyProfile)
def update_my_profile(
    payload: PharmacyProfileUpdate,
    current_user: User = Depends(require_role(UserRole.pharmacy)),
    db: Session = Depends(get_db),
):
    pharmacy = _get_pharmacy_or_404(db, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pharmacy, field, value)
    db.commit()
    db.refresh(pharmacy)
    return _to_profile(pharmacy)


@router.post("/{user_id}/approve", response_model=PharmacyProfile)
def approve_pharmacy(
    user_id: int,
    _: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    pharmacy = _get_pharmacy_or_404(db, user_id)
    pharmacy.user.is_approved = True
    db.commit()
    db.refresh(pharmacy)
    return _to_profile(pharmacy)
