from datetime import datetime, timedelta, timezone

from tests.conftest import approved_doctor_token, approved_pharmacy_token, auth_header, pay_order, token_for


def _future(hours):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _patient_token(client, email="patient@example.com"):
    return token_for(client, email, "secret123", "patient")


def _book_appointment(client, doc_token, patient_token, hours_ahead=24):
    slot = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": _future(hours_ahead), "end_time": _future(hours_ahead + 1)},
        headers=auth_header(doc_token),
    ).json()
    doctor_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_token)).json()["id"]
    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )
    assert appointment.status_code == 201
    return appointment.json()


def test_booking_creates_confirmation_notification(client):
    doc_token = approved_doctor_token(client)
    patient_token = _patient_token(client)
    _book_appointment(client, doc_token, patient_token)

    notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_token)).json()
    assert any(n["notification_type"] == "booking_confirmation" for n in notifications)


def test_prescription_upload_creates_notification(client):
    patient_token = _patient_token(client)
    client.post(
        "/api/v1/prescriptions",
        json={"file_url": "https://example.com/rx.pdf"},
        headers=auth_header(patient_token),
    )

    notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_token)).json()
    assert any(n["notification_type"] == "prescription_uploaded" for n in notifications)


def test_order_status_update_notifies_both_channels(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = client.post(
        "/api/v1/medicines",
        json={"name": "Ibuprofen", "price": "3.00", "stock_quantity": 10},
        headers=auth_header(pharm_token),
    ).json()
    patient_token = _patient_token(client)
    order = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 1}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    ).json()
    pay_order(client, patient_token, order["id"])

    client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "preparing"},
        headers=auth_header(pharm_token),
    )

    notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_token)).json()
    status_updates = [n for n in notifications if n["notification_type"] == "order_status_update"]
    channels = {n["channel"] for n in status_updates}
    assert channels == {"email", "sms"}


def test_notifications_scoped_to_own_user(client):
    patient_a = _patient_token(client, email="a@example.com")
    patient_b = _patient_token(client, email="b@example.com")

    client.post(
        "/api/v1/prescriptions",
        json={"file_url": "https://example.com/rx.pdf"},
        headers=auth_header(patient_a),
    )

    b_notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_b)).json()
    assert b_notifications == []


def test_non_admin_cannot_trigger_reminders(client):
    patient_token = _patient_token(client)
    response = client.post("/api/v1/notifications/send-appointment-reminders", headers=auth_header(patient_token))
    assert response.status_code == 403


def test_appointment_reminder_job_is_idempotent(client):
    doc_token = approved_doctor_token(client)
    patient_token = _patient_token(client)
    appointment = _book_appointment(client, doc_token, patient_token, hours_ahead=2)

    client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "confirmed"},
        headers=auth_header(doc_token),
    )

    admin_token = token_for(client, "admin@example.com", "secret123", "admin")

    first_run = client.post("/api/v1/notifications/send-appointment-reminders", headers=auth_header(admin_token))
    assert first_run.status_code == 200
    assert first_run.json()["reminders_sent"] == 1

    second_run = client.post("/api/v1/notifications/send-appointment-reminders", headers=auth_header(admin_token))
    assert second_run.json()["reminders_sent"] == 0

    notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_token)).json()
    reminders = [n for n in notifications if n["notification_type"] == "appointment_reminder"]
    assert len(reminders) == 2  # email + sms, sent once


def test_appointment_reminder_job_skips_far_future_and_unconfirmed(client):
    doc_token = approved_doctor_token(client)
    patient_token = _patient_token(client)

    far_future = _book_appointment(client, doc_token, patient_token, hours_ahead=48)
    client.patch(
        f"/api/v1/appointments/{far_future['id']}/status",
        json={"status": "confirmed"},
        headers=auth_header(doc_token),
    )

    still_pending = _book_appointment(client, doc_token, patient_token, hours_ahead=3)
    # left as "pending" -- never confirmed

    admin_token = token_for(client, "admin@example.com", "secret123", "admin")
    response = client.post("/api/v1/notifications/send-appointment-reminders", headers=auth_header(admin_token))
    assert response.json()["reminders_sent"] == 0
