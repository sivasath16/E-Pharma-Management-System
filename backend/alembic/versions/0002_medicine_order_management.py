"""medicine & order management: medicines, prescriptions, orders, order_items

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

fulfillment_type_enum = sa.Enum("delivery", "pickup", name="fulfillmenttype")
order_status_enum = sa.Enum(
    "pending", "preparing", "shipped", "ready_for_pickup", "delivered", "cancelled", name="orderstatus"
)


def upgrade() -> None:
    op.create_table(
        "medicines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pharmacy_id", sa.Integer(), sa.ForeignKey("pharmacies.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("requires_prescription", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_medicines_pharmacy_id", "medicines", ["pharmacy_id"])

    op.create_table(
        "prescriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_prescriptions_patient_id", "prescriptions", ["patient_id"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("pharmacy_id", sa.Integer(), sa.ForeignKey("pharmacies.id"), nullable=False),
        sa.Column("prescription_id", sa.Integer(), sa.ForeignKey("prescriptions.id"), nullable=True),
        sa.Column("fulfillment_type", fulfillment_type_enum, nullable=False),
        sa.Column("delivery_address", sa.String(500), nullable=True),
        sa.Column("status", order_status_enum, nullable=False, server_default="pending"),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_orders_patient_id", "orders", ["patient_id"])
    op.create_index("ix_orders_pharmacy_id", "orders", ["pharmacy_id"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("medicine_id", sa.Integer(), sa.ForeignKey("medicines.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])


def downgrade() -> None:
    op.drop_table("order_items")
    op.drop_index("ix_orders_pharmacy_id", table_name="orders")
    op.drop_index("ix_orders_patient_id", table_name="orders")
    op.drop_table("orders")
    op.drop_index("ix_prescriptions_patient_id", table_name="prescriptions")
    op.drop_table("prescriptions")
    op.drop_index("ix_medicines_pharmacy_id", table_name="medicines")
    op.drop_table("medicines")
    order_status_enum.drop(op.get_bind(), checkfirst=True)
    fulfillment_type_enum.drop(op.get_bind(), checkfirst=True)
