from app.core.security import decode_access_token
from tests.conftest import login_user, register_user


def _token(client, email, password, role, **extra):
    register_user(client, email, password, role, **extra)
    return login_user(client, email, password).json()["access_token"]


def _user_id_from_token(token):
    payload = decode_access_token(token)
    return int(payload["sub"])


def test_pharmacy_starts_unapproved_and_can_view_own_profile(client):
    token = _token(client, "pharm@example.com", "secret123", "pharmacy", store_name="City Pharmacy")
    response = client.get("/api/v1/pharmacies/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["is_approved"] is False
    assert body["store_name"] == "City Pharmacy"


def test_non_admin_cannot_approve_pharmacy(client):
    pharm_token = _token(client, "pharm2@example.com", "secret123", "pharmacy")
    patient_token = _token(client, "patient2@example.com", "secret123", "patient")

    pharmacy_id = _user_id_from_token(pharm_token)
    response = client.post(
        f"/api/v1/pharmacies/{pharmacy_id}/approve",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert response.status_code == 403


def test_admin_can_approve_pharmacy(client):
    pharm_token = _token(client, "pharm3@example.com", "secret123", "pharmacy")
    admin_token = _token(client, "admin2@example.com", "secret123", "admin")

    pharmacy_id = _user_id_from_token(pharm_token)
    response = client.post(
        f"/api/v1/pharmacies/{pharmacy_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_approved"] is True


def test_public_pharmacy_list_excludes_unapproved(client):
    unapproved_token = _token(
        client, "unapproved@example.com", "secret123", "pharmacy", store_name="Hidden Pharmacy"
    )

    approved_token = _token(
        client, "approved@example.com", "secret123", "pharmacy", store_name="Visible Pharmacy"
    )
    admin_token = _token(client, "admin5@example.com", "secret123", "admin")
    client.post(
        f"/api/v1/pharmacies/{_user_id_from_token(approved_token)}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = client.get("/api/v1/pharmacies")
    assert response.status_code == 200
    names = [p["store_name"] for p in response.json()]
    assert "Visible Pharmacy" in names
    assert "Hidden Pharmacy" not in names


def test_update_own_pharmacy_profile(client):
    token = _token(client, "pharm4@example.com", "secret123", "pharmacy")
    response = client.put(
        "/api/v1/pharmacies/me",
        json={"gstin": "GST123456", "address": "45 Market Rd"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["gstin"] == "GST123456"
    assert body["address"] == "45 Market Rd"
