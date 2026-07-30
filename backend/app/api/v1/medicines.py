from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.pharmacies import _get_pharmacy_or_404
from app.core.deps import require_role
from app.db.session import get_db
from app.models.medicine import Medicine
from app.models.user import User, UserRole
from app.schemas.medicine import MedicineCreate, MedicineResponse, MedicineUpdate

router = APIRouter(prefix="/medicines", tags=["medicines"])


def _get_medicine_or_404(db: Session, medicine_id: int) -> Medicine:
    medicine = db.get(Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return medicine


def _to_response(medicine: Medicine) -> MedicineResponse:
    return MedicineResponse(
        id=medicine.id,
        pharmacy_id=medicine.pharmacy_id,
        pharmacy_name=medicine.pharmacy.store_name,
        name=medicine.name,
        category=medicine.category,
        description=medicine.description,
        price=medicine.price,
        stock_quantity=medicine.stock_quantity,
        requires_prescription=medicine.requires_prescription,
        created_at=medicine.created_at,
    )


@router.get("", response_model=list[MedicineResponse])
def search_medicines(
    q: str | None = None,
    category: str | None = None,
    pharmacy_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Medicine)
    if q:
        query = query.filter(Medicine.name.ilike(f"%{q}%"))
    if category:
        query = query.filter(Medicine.category == category)
    if pharmacy_id:
        query = query.filter(Medicine.pharmacy_id == pharmacy_id)
    return [_to_response(m) for m in query.all()]


@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(medicine_id: int, db: Session = Depends(get_db)):
    medicine = _get_medicine_or_404(db, medicine_id)
    return _to_response(medicine)


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    payload: MedicineCreate,
    current_user: User = Depends(require_role(UserRole.pharmacy)),
    db: Session = Depends(get_db),
):
    pharmacy = _get_pharmacy_or_404(db, current_user.id)
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pharmacy must be approved by an Admin before adding medicines",
        )
    medicine = Medicine(pharmacy_id=pharmacy.id, **payload.model_dump())
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return _to_response(medicine)


@router.put("/{medicine_id}", response_model=MedicineResponse)
def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    current_user: User = Depends(require_role(UserRole.pharmacy)),
    db: Session = Depends(get_db),
):
    pharmacy = _get_pharmacy_or_404(db, current_user.id)
    medicine = _get_medicine_or_404(db, medicine_id)
    if medicine.pharmacy_id != pharmacy.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this medicine",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(medicine, field, value)
    db.commit()
    db.refresh(medicine)
    return _to_response(medicine)
