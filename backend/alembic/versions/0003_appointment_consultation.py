"""appointment & consultation: availability slots, appointments, messages, e-prescription links

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

consultation_mode_enum = sa.Enum("chat", "video", name="consultationmode")
appointment_status_enum = sa.Enum(
    "pending", "confirmed", "rejected", "cancelled", "completed", name="appointmentstatus"
)


def upgrade() -> None:
    op.create_table(
        "doctor_availability_slots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_booked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_doctor_availability_slots_doctor_id", "doctor_availability_slots", ["doctor_id"])

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column(
            "slot_id", sa.Integer(), sa.ForeignKey("doctor_availability_slots.id"), nullable=False, unique=True
        ),
        sa.Column("consultation_mode", consultation_mode_enum, nullable=False),
        sa.Column("status", appointment_status_enum, nullable=False, server_default="pending"),
        sa.Column("meeting_url", sa.String(500), nullable=True),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_appointments_patient_id", "appointments", ["patient_id"])
    op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])

    op.create_table(
        "consultation_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id"), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_consultation_messages_appointment_id", "consultation_messages", ["appointment_id"])

    op.add_column("prescriptions", sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id"), nullable=True))
    op.add_column(
        "prescriptions", sa.Column("issued_by_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("prescriptions", "issued_by_doctor_id")
    op.drop_column("prescriptions", "appointment_id")

    op.drop_index("ix_consultation_messages_appointment_id", table_name="consultation_messages")
    op.drop_table("consultation_messages")

    op.drop_index("ix_appointments_doctor_id", table_name="appointments")
    op.drop_index("ix_appointments_patient_id", table_name="appointments")
    op.drop_table("appointments")

    op.drop_index("ix_doctor_availability_slots_doctor_id", table_name="doctor_availability_slots")
    op.drop_table("doctor_availability_slots")

    appointment_status_enum.drop(op.get_bind(), checkfirst=True)
    consultation_mode_enum.drop(op.get_bind(), checkfirst=True)
