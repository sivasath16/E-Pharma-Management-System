from tests.conftest import auth_header, token_for


def test_patient_can_upload_and_list_prescriptions(client):
    token = token_for(client, "patient@example.com", "secret123", "patient")
    response = client.post(
        "/api/v1/prescriptions",
        json={"file_url": "https://example.com/rx1.pdf", "notes": "For flu"},
        headers=auth_header(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["file_url"] == "https://example.com/rx1.pdf"

    listing = client.get("/api/v1/prescriptions/me", headers=auth_header(token))
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_non_patient_cannot_upload_prescription(client):
    token = token_for(client, "doc@example.com", "secret123", "doctor")
    response = client.post(
        "/api/v1/prescriptions",
        json={"file_url": "https://example.com/rx1.pdf"},
        headers=auth_header(token),
    )
    assert response.status_code == 403


def test_unauthenticated_cannot_upload_prescription(client):
    response = client.post("/api/v1/prescriptions", json={"file_url": "https://example.com/rx1.pdf"})
    assert response.status_code == 401
