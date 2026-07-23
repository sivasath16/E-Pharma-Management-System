from pydantic import BaseModel, ConfigDict


class PatientProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str | None = None
    health_conditions: str | None = None
    address: str | None = None


class PatientProfileUpdate(BaseModel):
    full_name: str | None = None
    health_conditions: str | None = None
    address: str | None = None
