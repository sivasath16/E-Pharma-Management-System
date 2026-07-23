from pydantic import BaseModel, ConfigDict


class DoctorProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str | None = None
    qualification: str | None = None
    specialization: str | None = None
    degree_doc_url: str | None = None
    license_doc_url: str | None = None
    availability: dict | None = None
    is_approved: bool


class DoctorProfileUpdate(BaseModel):
    full_name: str | None = None
    qualification: str | None = None
    specialization: str | None = None
    degree_doc_url: str | None = None
    license_doc_url: str | None = None
    availability: dict | None = None
