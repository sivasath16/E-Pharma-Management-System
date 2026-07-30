from tests.conftest import approved_pharmacy_token, auth_header, token_for


def _create_medicine(client, token, **overrides):
    payload = {
        "name": "Paracetamol 500mg",
        "category": "Pain Relief",
        "description": "Basic pain reliever",
        "price": "5.50",
        "stock_quantity": 100,
        "requires_prescription": False,
        **overrides,
    }
    return client.post("/api/v1/medicines", json=payload, headers=auth_header(token))


def test_unapproved_pharmacy_cannot_create_medicine(client):
    token = token_for(client, "pharm@example.com", "secret123", "pharmacy", store_name="City Pharmacy")
    response = _create_medicine(client, token)
    assert response.status_code == 403


def test_approved_pharmacy_can_create_medicine(client):
    token = approved_pharmacy_token(client)
    response = _create_medicine(client, token)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Paracetamol 500mg"
    assert body["pharmacy_name"] == "City Pharmacy"
    assert body["stock_quantity"] == 100


def test_non_pharmacy_cannot_create_medicine(client):
    token = token_for(client, "patient@example.com", "secret123", "patient")
    response = _create_medicine(client, token)
    assert response.status_code == 403


def test_public_search_and_get(client):
    token = approved_pharmacy_token(client)
    created = _create_medicine(client, token).json()

    search = client.get("/api/v1/medicines", params={"q": "Paracetamol"})
    assert search.status_code == 200
    names = [m["name"] for m in search.json()]
    assert "Paracetamol 500mg" in names

    detail = client.get(f"/api/v1/medicines/{created['id']}")
    assert detail.status_code == 200
    assert detail.json()["id"] == created["id"]


def test_owner_can_update_medicine(client):
    token = approved_pharmacy_token(client)
    created = _create_medicine(client, token).json()

    response = client.put(
        f"/api/v1/medicines/{created['id']}",
        json={"stock_quantity": 50, "price": "6.00"},
        headers=auth_header(token),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stock_quantity"] == 50
    assert body["price"] == "6.00"


def test_other_pharmacy_cannot_update_medicine(client):
    owner_token = approved_pharmacy_token(client, email="owner@example.com", store_name="Owner Pharmacy")
    created = _create_medicine(client, owner_token).json()

    other_token = approved_pharmacy_token(client, email="other@example.com", store_name="Other Pharmacy")
    response = client.put(
        f"/api/v1/medicines/{created['id']}",
        json={"stock_quantity": 999},
        headers=auth_header(other_token),
    )
    assert response.status_code == 403
