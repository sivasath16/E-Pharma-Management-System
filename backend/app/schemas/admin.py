from decimal import Decimal

from pydantic import BaseModel

from app.models.user import UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class PendingApprovalItem(BaseModel):
    user_id: int
    email: str
    name: str | None
    role: UserRole


class PendingApprovalsResponse(BaseModel):
    doctors: list[PendingApprovalItem]
    pharmacies: list[PendingApprovalItem]


class ReportSummary(BaseModel):
    users_by_role: dict[str, int]
    pending_approvals_count: int
    orders_by_status: dict[str, int]
    total_revenue: Decimal
    appointments_by_status: dict[str, int]
