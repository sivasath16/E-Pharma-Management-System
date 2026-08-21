from tests.conftest import approved_pharmacy_token, auth_header, pay_order, token_for


def _create_medicine(client, pharm_token, **overrides):
    payload = {
        "name": "Paracetamol 500mg",
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


def _create_order(client, patient_token, medicine, quantity=1):
    response = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": quantity}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )
    assert response.status_code == 201
    return response.json()


def test_successful_payment(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)
    order = _create_order(client, patient_token, medicine)

    response = pay_order(client, patient_token, order["id"])
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "succeeded"
    assert body["order_id"] == order["id"]
    assert body["provider_reference"]


def test_simulated_failed_payment(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)
    order = _create_order(client, patient_token, medicine)

    response = pay_order(client, patient_token, order["id"], simulate_failure=True)
    assert response.status_code == 201
    assert response.json()["status"] == "failed"

    # order still unpaid -> retry should succeed
    retry = pay_order(client, patient_token, order["id"])
    assert retry.status_code == 201
    assert retry.json()["status"] == "succeeded"


def test_double_payment_rejected(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)
    order = _create_order(client, patient_token, medicine)

    first = pay_order(client, patient_token, order["id"])
    assert first.status_code == 201

    second = pay_order(client, patient_token, order["id"])
    assert second.status_code == 400


def test_non_owner_cannot_pay(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    owner_token = _patient_token(client, email="owner@example.com")
    order = _create_order(client, owner_token, medicine)

    other_token = _patient_token(client, email="other@example.com")
    response = pay_order(client, other_token, order["id"])
    assert response.status_code == 403


def test_payment_history_visibility(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)
    order = _create_order(client, patient_token, medicine)
    pay_order(client, patient_token, order["id"], simulate_failure=True)
    pay_order(client, patient_token, order["id"])

    owner_view = client.get(f"/api/v1/payments/order/{order['id']}", headers=auth_header(patient_token))
    assert owner_view.status_code == 200
    assert len(owner_view.json()) == 2

    pharmacy_view = client.get(f"/api/v1/payments/order/{order['id']}", headers=auth_header(pharm_token))
    assert pharmacy_view.status_code == 200

    outsider_token = _patient_token(client, email="outsider@example.com")
    forbidden = client.get(f"/api/v1/payments/order/{order['id']}", headers=auth_header(outsider_token))
    assert forbidden.status_code == 403


def test_successful_payment_creates_receipt_notification(client):
    pharm_token = approved_pharmacy_token(client)
    medicine = _create_medicine(client, pharm_token)
    patient_token = _patient_token(client)
    order = _create_order(client, patient_token, medicine)

    pay_order(client, patient_token, order["id"])

    notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_token)).json()
    assert any(n["notification_type"] == "payment_receipt" for n in notifications)
