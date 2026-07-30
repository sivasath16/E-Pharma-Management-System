from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class MedicineCreate(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    price: Decimal
    stock_quantity: int = 0
    requires_prescription: bool = False


class MedicineUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    price: Decimal | None = None
    stock_quantity: int | None = None
    requires_prescription: bool | None = None


class MedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pharmacy_id: int
    pharmacy_name: str | None = None
    name: str
    category: str | None
    description: str | None
    price: Decimal
    stock_quantity: int
    requires_prescription: bool
    created_at: datetime
