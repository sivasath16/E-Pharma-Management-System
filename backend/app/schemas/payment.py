from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.payment import PaymentStatus


class PaymentCreate(BaseModel):
    order_id: int
    simulate_failure: bool = False


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    amount: Decimal
    status: PaymentStatus
    provider: str
    provider_reference: str | None
    created_at: datetime
    updated_at: datetime
