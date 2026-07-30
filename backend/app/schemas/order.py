from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import FulfillmentType, OrderStatus


class OrderItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    pharmacy_id: int
    items: list[OrderItemCreate] = Field(min_length=1)
    fulfillment_type: FulfillmentType
    delivery_address: str | None = None
    prescription_id: int | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    medicine_id: int
    medicine_name: str
    quantity: int
    unit_price: Decimal


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    pharmacy_id: int
    prescription_id: int | None
    prescription_file_url: str | None = None
    fulfillment_type: FulfillmentType
    delivery_address: str | None
    status: OrderStatus
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]
