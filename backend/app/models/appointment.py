import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ConsultationMode(str, enum.Enum):
    chat = "chat"
    video = "video"


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"


class DoctorAvailabilitySlot(Base):
    __tablename__ = "doctor_availability_slots"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_booked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    doctor: Mapped["Doctor"] = relationship()


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False, index=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("doctor_availability_slots.id"), nullable=False, unique=True)
    consultation_mode: Mapped[ConsultationMode] = mapped_column(Enum(ConsultationMode), nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.pending, index=True
    )
    meeting_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    patient: Mapped["Patient"] = relationship()
    doctor: Mapped["Doctor"] = relationship()
    slot: Mapped["DoctorAvailabilitySlot"] = relationship()
    messages: Mapped[list["ConsultationMessage"]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan", order_by="ConsultationMessage.sent_at"
    )


class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), nullable=False, index=True)
    sender_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    appointment: Mapped["Appointment"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship()
