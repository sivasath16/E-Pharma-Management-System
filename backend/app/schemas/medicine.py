from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MedicineCreate(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    price: Decimal = Field(gt=0)
    stock_quantity: int = Field(default=0, ge=0)
    requires_prescription: bool = False


class MedicineUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    stock_quantity: int | None = Field(default=None, ge=0)
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
