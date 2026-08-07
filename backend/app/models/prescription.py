from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    issued_by_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    patient: Mapped["Patient"] = relationship()
    appointment: Mapped["Appointment | None"] = relationship()
    issued_by_doctor: Mapped["Doctor | None"] = relationship()
