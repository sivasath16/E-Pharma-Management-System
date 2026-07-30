from tests.conftest import approved_pharmacy_token, auth_header, token_for


def _create_medicine(client, pharm_token, **overrides):
    payload = {
        "name": "Paracetamol 500mg",
        "category": "Pain Relief",
        "price": "5.00",
        "stock_quantity": 10,
        "requires_prescription": False,
        **overrides,
    }
    response = client.post("/api/v1/medicines", json=payload, headers=auth_header(pharm_token))
    assert response.status_code == 201
    return response.json()


def _patient_token(client, email="patient@example.com"):
    return token_for(client, email, "secret123", "patient")


def test_create_order_happy_path_pickup(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)

    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 3}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 3

    updated_medicine = client.get(f"/api/v1/medicines/{medicine['id']}").json()
    assert updated_medicine["stock_quantity"] == 7


def test_create_order_delivery_requires_address(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)

    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 1}],
            "fulfillment_type": "delivery",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 400


def test_create_order_insufficient_stock(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token, stock_quantity=2)
    patient_token = _patient_token(client)

    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 5}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 400


def test_create_order_requires_prescription(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token, requires_prescription=True)
    patient_token = _patient_token(client)

    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 1}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 400

    rx = client.post(
        "/api/v1/prescriptions",
        json={"file_url": "https://example.com/rx.pdf"},
        headers=auth_header(patient_token),
    ).json()

    response2 = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 1}],
            "fulfillment_type": "pickup",
            "prescription_id": rx["id"],
        },
        headers=auth_header(patient_token),
    )
    assert response2.status_code == 201
    assert response2.json()["prescription_file_url"] == "https://example.com/rx.pdf"


def test_create_order_medicine_wrong_pharmacy(client):
    pharm_a_token = approved_pharmacy_token(client, email="a@example.com", store_name="Pharmacy A")
    pharm_b_token = approved_pharmacy_token(client, email="b@example.com", store_name="Pharmacy B")
    medicine_a = _create_medicine(client, pharm_a_token)
    medicine_b = _create_medicine(client, pharm_b_token)
    patient_token = _patient_token(client)

    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine_a["pharmacy_id"],
            "items": [{"medicine_id": medicine_b["id"], "quantity": 1}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 400


def test_create_order_unapproved_pharmacy_rejected(client):
    pharm_token = token_for(client, "unapproved@example.com", "secret123", "pharmacy", store_name="New Pharmacy")
    profile = client.get("/api/v1/pharmacies/me", headers=auth_header(pharm_token)).json()
    assert profile["is_approved"] is False

    patient_token = _patient_token(client)
    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": profile["id"],
            "items": [{"medicine_id": 1, "quantity": 1}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 400


def test_list_orders_for_patient_and_pharmacy(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)

    client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 1}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )

    patient_orders = client.get("/api/v1/orders/me", headers=auth_header(patient_token))
    assert patient_orders.status_code == 200
    assert len(patient_orders.json()) == 1

    pharmacy_orders = client.get("/api/v1/orders/pharmacy/me", headers=auth_header(pharm_token))
    assert pharmacy_orders.status_code == 200
    assert len(pharmacy_orders.json()) == 1


def test_order_detail_ownership(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
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

    other_patient_token = _patient_token(client, email="other_patient@example.com")
    forbidden = client.get(f"/api/v1/orders/{order['id']}", headers=auth_header(other_patient_token))
    assert forbidden.status_code == 403

    owner_view = client.get(f"/api/v1/orders/{order['id']}", headers=auth_header(patient_token))
    assert owner_view.status_code == 200

    pharmacy_view = client.get(f"/api/v1/orders/{order['id']}", headers=auth_header(pharm_token))
    assert pharmacy_view.status_code == 200


def test_status_transitions_valid_and_invalid(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
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

    invalid = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "delivered"},
        headers=auth_header(pharm_token),
    )
    assert invalid.status_code == 400

    step1 = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "preparing"},
        headers=auth_header(pharm_token),
    )
    assert step1.status_code == 200
    assert step1.json()["status"] == "preparing"

    step2 = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "ready_for_pickup"},
        headers=auth_header(pharm_token),
    )
    assert step2.status_code == 200

    step3 = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "delivered"},
        headers=auth_header(pharm_token),
    )
    assert step3.status_code == 200
    assert step3.json()["status"] == "delivered"


def test_cancel_restocks_medicine(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token, stock_quantity=10)
    patient_token = _patient_token(client)

    order = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 4}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    ).json()

    after_order = client.get(f"/api/v1/medicines/{medicine['id']}").json()
    assert after_order["stock_quantity"] == 6

    cancel = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "cancelled"},
        headers=auth_header(pharm_token),
    )
    assert cancel.status_code == 200

    after_cancel = client.get(f"/api/v1/medicines/{medicine['id']}").json()
    assert after_cancel["stock_quantity"] == 10


def test_other_pharmacy_cannot_update_status(client):
    pharm_token = approved_pharmacy_token(client, email="owner@example.com", store_name="Owner Pharmacy")
    medicine = _create_medicine(client, pharm_token)
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

    other_pharm_token = approved_pharmacy_token(client, email="other@example.com", store_name="Other Pharmacy")
    response = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "preparing"},
        headers=auth_header(other_pharm_token),
    )
    assert response.status_code == 403
