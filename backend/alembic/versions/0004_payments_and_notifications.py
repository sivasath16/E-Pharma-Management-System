"""payment & notification integration: payments, notifications, appointment reminder flag

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_status_enum = sa.Enum("pending", "succeeded", "failed", "refunded", name="paymentstatus")
notification_channel_enum = sa.Enum("email", "sms", name="notificationchannel")
notification_type_enum = sa.Enum(
    "booking_confirmation",
    "prescription_uploaded",
    "payment_receipt",
    "order_status_update",
    "appointment_reminder",
    name="notificationtype",
)


def upgrade() -> None:
    op.add_column(
        "appointments", sa.Column("reminder_sent", sa.Boolean(), nullable=False, server_default=sa.false())
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", payment_status_enum, nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(50), nullable=False, server_default="mock"),
        sa.Column("provider_reference", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payments_order_id", "payments", ["order_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("channel", notification_channel_enum, nullable=False),
        sa.Column("notification_type", notification_type_enum, nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_payments_order_id", table_name="payments")
    op.drop_table("payments")

    op.drop_column("appointments", "reminder_sent")

    notification_type_enum.drop(op.get_bind(), checkfirst=True)
    notification_channel_enum.drop(op.get_bind(), checkfirst=True)
    payment_status_enum.drop(op.get_bind(), checkfirst=True)
