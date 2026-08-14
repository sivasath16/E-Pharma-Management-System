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


def test_public_doctor_list_excludes_unapproved(client):
    unapproved_token = _token(client, "unapproved@example.com", "secret123", "doctor", full_name="Dr. Unseen")

    approved_token = _token(client, "approved@example.com", "secret123", "doctor", full_name="Dr. Seen")
    admin_token = _token(client, "admin4@example.com", "secret123", "admin")
    client.post(
        f"/api/v1/doctors/{_user_id_from_token(approved_token)}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = client.get("/api/v1/doctors")
    assert response.status_code == 200
    names = [d["full_name"] for d in response.json()]
    assert "Dr. Seen" in names
    assert "Dr. Unseen" not in names


def test_public_doctor_list_filters_by_specialization(client):
    doc_token = _token(
        client, "specialist@example.com", "secret123", "doctor", full_name="Dr. Cardio"
    )
    admin_token = _token(client, "admin5@example.com", "secret123", "admin")
    client.post(
        f"/api/v1/doctors/{_user_id_from_token(doc_token)}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    client.put(
        "/api/v1/doctors/me",
        json={"specialization": "Cardiology"},
        headers={"Authorization": f"Bearer {doc_token}"},
    )

    match = client.get("/api/v1/doctors", params={"specialization": "cardio"})
    assert match.status_code == 200
    assert len(match.json()) == 1

    no_match = client.get("/api/v1/doctors", params={"specialization": "dermatology"})
    assert len(no_match.json()) == 0


def test_get_doctor_detail_public_for_approved(client):
    doc_token = _token(client, "detail@example.com", "secret123", "doctor", full_name="Dr. Detail")
    admin_token = _token(client, "admin6@example.com", "secret123", "admin")
    client.post(
        f"/api/v1/doctors/{_user_id_from_token(doc_token)}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    doctor_business_id = client.get(
        "/api/v1/doctors/me", headers={"Authorization": f"Bearer {doc_token}"}
    ).json()["id"]

    response = client.get(f"/api/v1/doctors/{doctor_business_id}")
    assert response.status_code == 200
    assert response.json()["full_name"] == "Dr. Detail"


def test_get_doctor_detail_404_for_unapproved(client):
    doc_token = _token(client, "notyet@example.com", "secret123", "doctor", full_name="Dr. Not Yet")
    doctor_business_id = client.get(
        "/api/v1/doctors/me", headers={"Authorization": f"Bearer {doc_token}"}
    ).json()["id"]

    response = client.get(f"/api/v1/doctors/{doctor_business_id}")
    assert response.status_code == 404


def test_get_doctor_detail_404_for_missing(client):
    response = client.get("/api/v1/doctors/999999")
    assert response.status_code == 404
