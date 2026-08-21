from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationChannel, NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel: NotificationChannel
    notification_type: NotificationType
    subject: str
    message: str
    sent_at: datetime
