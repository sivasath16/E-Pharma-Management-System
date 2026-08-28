"""performance optimization: indexes on frequently-filtered columns

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-24

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_appointments_status", "appointments", ["status"])
    op.create_index("ix_users_role", "users", ["role"])


def downgrade() -> None:
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_appointments_status", table_name="appointments")
    op.drop_index("ix_orders_status", table_name="orders")
