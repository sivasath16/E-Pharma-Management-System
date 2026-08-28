import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FulfillmentType(str, enum.Enum):
    delivery = "delivery"
    pickup = "pickup"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    shipped = "shipped"
    ready_for_pickup = "ready_for_pickup"
    delivered = "delivered"
    cancelled = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    pharmacy_id: Mapped[int] = mapped_column(ForeignKey("pharmacies.id"), nullable=False, index=True)
    prescription_id: Mapped[int | None] = mapped_column(ForeignKey("prescriptions.id"), nullable=True)
    fulfillment_type: Mapped[FulfillmentType] = mapped_column(Enum(FulfillmentType), nullable=False)
    delivery_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), nullable=False, default=OrderStatus.pending, index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    patient: Mapped["Patient"] = relationship()
    pharmacy: Mapped["Pharmacy"] = relationship()
    prescription: Mapped["Prescription | None"] = relationship()
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
    medicine: Mapped["Medicine"] = relationship()
