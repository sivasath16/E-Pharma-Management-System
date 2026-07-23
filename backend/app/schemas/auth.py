from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str
    role: UserRole
    full_name: str | None = None
    # pharmacy-only
    store_name: str | None = None
    license_number: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool
    is_approved: bool
