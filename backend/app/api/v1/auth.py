from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.pharmacy import Pharmacy
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Doctor and Pharmacy accounts require Admin approval before becoming active;
    # Patient and Admin accounts are approved immediately.
    is_approved = payload.role not in (UserRole.doctor, UserRole.pharmacy)

    user = User(
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_approved=is_approved,
    )
    db.add(user)
    db.flush()

    if payload.role == UserRole.patient:
        db.add(Patient(user_id=user.id, full_name=payload.full_name))
    elif payload.role == UserRole.doctor:
        db.add(Doctor(user_id=user.id, full_name=payload.full_name))
    elif payload.role == UserRole.pharmacy:
        db.add(
            Pharmacy(
                user_id=user.id,
                store_name=payload.store_name,
                license_number=payload.license_number,
            )
        )

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token)
