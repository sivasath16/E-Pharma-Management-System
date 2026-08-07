from datetime import datetime, timedelta, timezone

from tests.conftest import approved_doctor_token, auth_header, token_for


def _future(hours):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _doctor_with_slot(client, email="doc@example.com", full_name="Dr. Who"):
    doc_token = approved_doctor_token(client, email=email, full_name=full_name)
    slot = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": _future(24), "end_time": _future(25)},
        headers=auth_header(doc_token),
    ).json()
    doctor_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_token)).json()["id"]
    return doc_token, doctor_id, slot


def _patient_token(client, email="patient@example.com"):
    return token_for(client, email, "secret123", "patient")


def test_book_appointment_happy_path(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    response = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["doctor_id"] == doctor_id

    # slot is now booked and no longer listed as available
    listing = client.get(f"/api/v1/doctors/{doctor_id}/availability-slots").json()
    assert slot["id"] not in [s["id"] for s in listing]


def test_double_booking_same_slot_rejected(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient1 = _patient_token(client, email="p1@example.com")
    patient2 = _patient_token(client, email="p2@example.com")

    first = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient1),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient2),
    )
    assert second.status_code == 400


def test_book_unapproved_doctor_rejected(client):
    doc_token = token_for(client, "unapproved@example.com", "secret123", "doctor", full_name="Dr. New")
    slot = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": _future(24), "end_time": _future(25)},
        headers=auth_header(doc_token),
    ).json()
    doctor_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_token)).json()["id"]

    patient_token = _patient_token(client)
    response = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )
    assert response.status_code == 400


def test_status_transitions_and_slot_release_on_reject(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "video"},
        headers=auth_header(patient_token),
    ).json()

    # patient cannot confirm
    forbidden = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "confirmed"},
        headers=auth_header(patient_token),
    )
    assert forbidden.status_code == 403

    # invalid transition
    invalid = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "completed"},
        headers=auth_header(doc_token),
    )
    assert invalid.status_code == 400

    rejected = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "rejected"},
        headers=auth_header(doc_token),
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    # slot freed up again
    listing = client.get(f"/api/v1/doctors/{doctor_id}/availability-slots").json()
    assert slot["id"] in [s["id"] for s in listing]


def test_confirm_with_meeting_url_then_complete(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "video"},
        headers=auth_header(patient_token),
    ).json()

    confirmed = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "confirmed", "meeting_url": "https://meet.example.com/xyz"},
        headers=auth_header(doc_token),
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["meeting_url"] == "https://meet.example.com/xyz"

    completed = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "completed"},
        headers=auth_header(doc_token),
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"


def test_patient_can_cancel_pending_appointment(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    ).json()

    response = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "cancelled"},
        headers=auth_header(patient_token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


def test_messages_only_after_confirmed_and_participants_only(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    ).json()

    too_early = client.post(
        f"/api/v1/appointments/{appointment['id']}/messages",
        json={"body": "hello"},
        headers=auth_header(patient_token),
    )
    assert too_early.status_code == 400

    client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "confirmed"},
        headers=auth_header(doc_token),
    )

    sent = client.post(
        f"/api/v1/appointments/{appointment['id']}/messages",
        json={"body": "hello doctor"},
        headers=auth_header(patient_token),
    )
    assert sent.status_code == 201

    outsider_token = _patient_token(client, email="outsider@example.com")
    blocked = client.post(
        f"/api/v1/appointments/{appointment['id']}/messages",
        json={"body": "sneaky"},
        headers=auth_header(outsider_token),
    )
    assert blocked.status_code == 403

    messages = client.get(
        f"/api/v1/appointments/{appointment['id']}/messages", headers=auth_header(doc_token)
    )
    assert messages.status_code == 200
    assert len(messages.json()) == 1


def test_eprescription_issued_and_visible_to_patient(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    ).json()

    # cannot issue before confirmed
    too_early = client.post(
        f"/api/v1/appointments/{appointment['id']}/prescription",
        json={"file_url": "https://example.com/rx.pdf"},
        headers=auth_header(doc_token),
    )
    assert too_early.status_code == 400

    client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "confirmed"},
        headers=auth_header(doc_token),
    )

    issued = client.post(
        f"/api/v1/appointments/{appointment['id']}/prescription",
        json={"file_url": "https://example.com/rx.pdf", "notes": "Take twice daily"},
        headers=auth_header(doc_token),
    )
    assert issued.status_code == 201
    body = issued.json()
    assert body["appointment_id"] == appointment["id"]
    assert body["issued_by_doctor_id"] == doctor_id

    listing = client.get("/api/v1/prescriptions/me", headers=auth_header(patient_token))
    assert listing.status_code == 200
    assert any(p["id"] == body["id"] for p in listing.json())


def test_appointment_detail_ownership(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    ).json()

    outsider_token = _patient_token(client, email="outsider2@example.com")
    forbidden = client.get(f"/api/v1/appointments/{appointment['id']}", headers=auth_header(outsider_token))
    assert forbidden.status_code == 403

    owner_view = client.get(f"/api/v1/appointments/{appointment['id']}", headers=auth_header(patient_token))
    assert owner_view.status_code == 200

    doctor_view = client.get(f"/api/v1/appointments/{appointment['id']}", headers=auth_header(doc_token))
    assert doctor_view.status_code == 200


def test_list_endpoints_for_patient_and_doctor(client):
    doc_token, doctor_id, slot = _doctor_with_slot(client)
    patient_token = _patient_token(client)

    client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )

    patient_list = client.get("/api/v1/appointments/me", headers=auth_header(patient_token))
    assert patient_list.status_code == 200
    assert len(patient_list.json()) == 1

    doctor_list = client.get("/api/v1/appointments/doctor/me", headers=auth_header(doc_token))
    assert doctor_list.status_code == 200
    assert len(doctor_list.json()) == 1
