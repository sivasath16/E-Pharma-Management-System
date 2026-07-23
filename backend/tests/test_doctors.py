from app.core.security import decode_access_token
from tests.conftest import login_user, register_user


def _token(client, email, password, role, **extra):
    register_user(client, email, password, role, **extra)
    return login_user(client, email, password).json()["access_token"]


def _user_id_from_token(token):
    payload = decode_access_token(token)
    return int(payload["sub"])


def test_doctor_starts_unapproved_and_can_view_own_profile(client):
    token = _token(client, "doc@example.com", "secret123", "doctor", full_name="Dr. Who")
    response = client.get("/api/v1/doctors/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["is_approved"] is False
    assert body["full_name"] == "Dr. Who"


def test_non_admin_cannot_approve_doctor(client):
    doc_token = _token(client, "doc2@example.com", "secret123", "doctor")
    other_patient_token = _token(client, "patient@example.com", "secret123", "patient")

    doctor_id = _user_id_from_token(doc_token)
    response = client.post(
        f"/api/v1/doctors/{doctor_id}/approve",
        headers={"Authorization": f"Bearer {other_patient_token}"},
    )
    assert response.status_code == 403


def test_admin_can_approve_doctor(client):
    doc_token = _token(client, "doc3@example.com", "secret123", "doctor")
    admin_token = _token(client, "admin@example.com", "secret123", "admin")

    doctor_id = _user_id_from_token(doc_token)
    response = client.post(
        f"/api/v1/doctors/{doctor_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_approved"] is True
