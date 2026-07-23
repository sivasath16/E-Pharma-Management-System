from tests.conftest import login_user, register_user


def test_register_patient_is_auto_approved(client):
    response = register_user(client, "patient@example.com", "secret123", "patient", full_name="Pat Ient")
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "patient"
    assert body["is_approved"] is True


def test_register_doctor_is_not_auto_approved(client):
    response = register_user(client, "doc@example.com", "secret123", "doctor", full_name="Doc Tor")
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "doctor"
    assert body["is_approved"] is False


def test_register_duplicate_email_rejected(client):
    register_user(client, "dup@example.com", "secret123", "patient")
    response = register_user(client, "dup@example.com", "secret123", "patient")
    assert response.status_code == 400


def test_login_success(client):
    register_user(client, "login@example.com", "secret123", "patient")
    response = login_user(client, "login@example.com", "secret123")
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client):
    register_user(client, "wrongpw@example.com", "secret123", "patient")
    response = login_user(client, "wrongpw@example.com", "not-the-password")
    assert response.status_code == 401
