from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment import AppointmentStatus, ConsultationMode


class AvailabilitySlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailabilitySlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    is_booked: bool


class AppointmentCreate(BaseModel):
    doctor_id: int
    slot_id: int
    consultation_mode: ConsultationMode
    notes: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus
    meeting_url: str | None = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    slot_id: int
    consultation_mode: ConsultationMode
    status: AppointmentStatus
    meeting_url: str | None
    notes: str | None
    start_time: datetime
    end_time: datetime
    created_at: datetime
    updated_at: datetime


class ConsultationMessageCreate(BaseModel):
    body: str = Field(min_length=1)


class ConsultationMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appointment_id: int
    sender_user_id: int
    body: str
    sent_at: datetime
