from typing import Protocol

from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationChannel, NotificationType
from app.models.user import User


class NotificationService(Protocol):
    def send(
        self,
        db: Session,
        user: User,
        channel: NotificationChannel,
        notification_type: NotificationType,
        subject: str,
        message: str,
    ) -> Notification: ...


class MockNotificationService:
    """Records a notification instead of calling a real email/SMS provider.

    No external account or API keys needed. A real provider (SendGrid, Twilio, etc.)
    can be swapped in later behind the same `NotificationService` protocol.
    """

    def send(
        self,
        db: Session,
        user: User,
        channel: NotificationChannel,
        notification_type: NotificationType,
        subject: str,
        message: str,
    ) -> Notification:
        notification = Notification(
            user_id=user.id,
            channel=channel,
            notification_type=notification_type,
            subject=subject,
            message=message,
        )
        db.add(notification)
        db.flush()
        return notification


def get_notification_service() -> NotificationService:
    return MockNotificationService()


def notify_booking_confirmation(db: Session, service: NotificationService, patient: User, doctor_name: str) -> None:
    service.send(
        db,
        patient,
        NotificationChannel.email,
        NotificationType.booking_confirmation,
        "Appointment request received",
        f"Your appointment request with {doctor_name or 'the doctor'} has been sent and is pending confirmation.",
    )


def notify_prescription_uploaded(db: Session, service: NotificationService, patient: User) -> None:
    service.send(
        db,
        patient,
        NotificationChannel.email,
        NotificationType.prescription_uploaded,
        "Prescription received",
        "We've received your prescription upload.",
    )


def notify_payment_receipt(db: Session, service: NotificationService, patient: User, order_id: int, amount) -> None:
    service.send(
        db,
        patient,
        NotificationChannel.email,
        NotificationType.payment_receipt,
        "Payment receipt",
        f"Payment of ${amount} for order #{order_id} was successful.",
    )


def notify_order_status_update(db: Session, service: NotificationService, patient: User, order_id: int, new_status: str) -> None:
    subject = "Order status update"
    message = f"Your order #{order_id} is now '{new_status}'."
    service.send(db, patient, NotificationChannel.email, NotificationType.order_status_update, subject, message)
    service.send(db, patient, NotificationChannel.sms, NotificationType.order_status_update, subject, message)


def notify_appointment_reminder(db: Session, service: NotificationService, patient: User, doctor_name: str, start_time: str) -> None:
    subject = "Appointment reminder"
    message = f"Reminder: your appointment with {doctor_name or 'the doctor'} is at {start_time}."
    service.send(db, patient, NotificationChannel.email, NotificationType.appointment_reminder, subject, message)
    service.send(db, patient, NotificationChannel.sms, NotificationType.appointment_reminder, subject, message)
