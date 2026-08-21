import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NotificationChannel(str, enum.Enum):
    email = "email"
    sms = "sms"


class NotificationType(str, enum.Enum):
    booking_confirmation = "booking_confirmation"
    prescription_uploaded = "prescription_uploaded"
    payment_receipt = "payment_receipt"
    order_status_update = "order_status_update"
    appointment_reminder = "appointment_reminder"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel), nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship()
