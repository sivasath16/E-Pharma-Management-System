from tests.conftest import login_user, register_user


def _auth_headers(client, email="patient@example.com", password="secret123"):
    register_user(client, email, password, "patient", full_name="Pat Ient")
    token = login_user(client, email, password).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_own_profile(client):
    headers = _auth_headers(client)
    response = client.get("/api/v1/patients/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Pat Ient"


def test_update_own_profile(client):
    headers = _auth_headers(client)
    response = client.put(
        "/api/v1/patients/me",
        json={"address": "123 Main St", "health_conditions": "None"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["address"] == "123 Main St"
    assert body["health_conditions"] == "None"


def test_non_patient_cannot_access_patient_endpoint(client):
    register_user(client, "doc@example.com", "secret123", "doctor")
    token = login_user(client, "doc@example.com", "secret123").json()["access_token"]
    response = client.get("/api/v1/patients/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_unauthenticated_request_rejected(client):
    response = client.get("/api/v1/patients/me")
    assert response.status_code == 401
