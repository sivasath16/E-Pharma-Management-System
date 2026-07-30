from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PrescriptionCreate(BaseModel):
    file_url: str
    notes: str | None = None


class PrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    file_url: str
    notes: str | None
    uploaded_at: datetime
