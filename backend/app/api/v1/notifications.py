from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.appointments import _ensure_aware
from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.schemas.notification import NotificationResponse
from app.services.notifications import get_notification_service, notify_appointment_reminder

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me", response_model=list[NotificationResponse])
def list_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.sent_at.desc())
        .all()
    )


@router.post("/send-appointment-reminders")
def send_appointment_reminders(
    _: User = Depends(require_role(UserRole.admin)),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=24)

    due_candidates = (
        db.query(Appointment)
        .filter(Appointment.status == AppointmentStatus.confirmed, Appointment.reminder_sent.is_(False))
        .all()
    )

    service = get_notification_service()
    sent_count = 0
    for appointment in due_candidates:
        start_time = _ensure_aware(appointment.slot.start_time)
        if now < start_time <= window_end:
            notify_appointment_reminder(
                db, service, appointment.patient.user, appointment.doctor.full_name, start_time.isoformat()
            )
            appointment.reminder_sent = True
            sent_count += 1

    db.commit()
    return {"reminders_sent": sent_count}
