from pydantic import BaseModel, ConfigDict


class PharmacyProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_name: str | None = None
    license_number: str | None = None
    drug_license_url: str | None = None
    gstin: str | None = None
    address: str | None = None
    is_approved: bool


class PharmacyProfileUpdate(BaseModel):
    store_name: str | None = None
    license_number: str | None = None
    drug_license_url: str | None = None
    gstin: str | None = None
    address: str | None = None
