from datetime import datetime, timedelta, timezone

from tests.conftest import approved_doctor_token, auth_header, token_for


def _future(hours):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _create_slot(client, token, start_hours=24, duration_hours=1):
    payload = {"start_time": _future(start_hours), "end_time": _future(start_hours + duration_hours)}
    return client.post("/api/v1/doctors/availability-slots", json=payload, headers=auth_header(token))


def test_unapproved_doctor_can_still_create_slot(client):
    # Slot creation itself doesn't require approval -- approval is enforced at booking time.
    token = token_for(client, "doc@example.com", "secret123", "doctor", full_name="Dr. Who")
    response = _create_slot(client, token)
    assert response.status_code == 201


def test_non_doctor_cannot_create_slot(client):
    token = token_for(client, "patient@example.com", "secret123", "patient")
    response = _create_slot(client, token)
    assert response.status_code == 403


def test_slot_rejects_start_after_end(client):
    token = approved_doctor_token(client)
    payload = {"start_time": _future(25), "end_time": _future(24)}
    response = client.post("/api/v1/doctors/availability-slots", json=payload, headers=auth_header(token))
    assert response.status_code == 400


def test_slot_rejects_past_start(client):
    token = approved_doctor_token(client)
    payload = {"start_time": _future(-2), "end_time": _future(-1)}
    response = client.post("/api/v1/doctors/availability-slots", json=payload, headers=auth_header(token))
    assert response.status_code == 400


def test_slot_rejects_overlap(client):
    token = approved_doctor_token(client)
    _create_slot(client, token, start_hours=24, duration_hours=2)
    response = _create_slot(client, token, start_hours=25, duration_hours=1)
    assert response.status_code == 400


def test_public_can_list_available_slots(client):
    token = approved_doctor_token(client)
    created = _create_slot(client, token).json()

    doctor_profile = client.get("/api/v1/doctors/me", headers=auth_header(token)).json()
    listing = client.get(f"/api/v1/doctors/{doctor_profile['id']}/availability-slots")
    assert listing.status_code == 200
    ids = [s["id"] for s in listing.json()]
    assert created["id"] in ids


def test_owner_can_delete_unbooked_slot(client):
    token = approved_doctor_token(client)
    created = _create_slot(client, token).json()
    response = client.delete(f"/api/v1/doctors/availability-slots/{created['id']}", headers=auth_header(token))
    assert response.status_code == 204


def test_other_doctor_cannot_delete_slot(client):
    owner_token = approved_doctor_token(client, email="owner@example.com", full_name="Dr. Owner")
    created = _create_slot(client, owner_token).json()

    other_token = approved_doctor_token(client, email="other@example.com", full_name="Dr. Other")
    response = client.delete(f"/api/v1/doctors/availability-slots/{created['id']}", headers=auth_header(other_token))
    assert response.status_code == 403
