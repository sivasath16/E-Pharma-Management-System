"""End-to-end cross-module integration test.

Chains Phase 3 (medicine/order), Phase 4 (appointment/e-prescription), Phase 5
(admin monitoring/reports), and Phase 6 (payment/notifications) together in one
continuous flow -- something no single module's test file exercises on its own.
"""

from tests.conftest import auth_header, token_for, user_id_from_token


def test_full_patient_doctor_pharmacy_admin_flow(client):
    # --- Registration ---
    patient_token = token_for(client, "patient@example.com", "secret123", "patient", full_name="Jordan Lee")
    doc_token = token_for(client, "doc@example.com", "secret123", "doctor", full_name="Dr. Sam Rivera")
    pharm_token = token_for(client, "pharm@example.com", "secret123", "pharmacy", store_name="Main Street Pharmacy")
    admin_token = token_for(client, "admin@example.com", "secret123", "admin")

    doc_user_id = user_id_from_token(doc_token)
    pharm_user_id = user_id_from_token(pharm_token)

    # --- Admin approves doctor and pharmacy ---
    assert client.post(f"/api/v1/doctors/{doc_user_id}/approve", headers=auth_header(admin_token)).status_code == 200
    assert (
        client.post(f"/api/v1/pharmacies/{pharm_user_id}/approve", headers=auth_header(admin_token)).status_code
        == 200
    )

    doctor_business_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_token)).json()["id"]
    pharmacy_business_id = client.get("/api/v1/pharmacies/me", headers=auth_header(pharm_token)).json()["id"]

    # --- Doctor creates a slot, patient books a video appointment ---
    from datetime import datetime, timedelta, timezone

    start = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(hours=25)).isoformat()
    slot = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": start, "end_time": end},
        headers=auth_header(doc_token),
    ).json()

    appointment = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_business_id, "slot_id": slot["id"], "consultation_mode": "video"},
        headers=auth_header(patient_token),
    ).json()
    assert appointment["status"] == "pending"

    # --- Doctor confirms, completes, issues an e-prescription ---
    confirmed = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "confirmed", "meeting_url": "https://meet.example.com/integration-test"},
        headers=auth_header(doc_token),
    )
    assert confirmed.status_code == 200

    completed = client.patch(
        f"/api/v1/appointments/{appointment['id']}/status",
        json={"status": "completed"},
        headers=auth_header(doc_token),
    )
    assert completed.status_code == 200

    prescription = client.post(
        f"/api/v1/appointments/{appointment['id']}/prescription",
        json={"file_url": "https://example.com/integration-rx.pdf", "notes": "Take with food"},
        headers=auth_header(doc_token),
    ).json()
    assert prescription["appointment_id"] == appointment["id"]
    assert prescription["issued_by_doctor_id"] == doctor_business_id

    # --- Pharmacy lists a prescription-required medicine ---
    medicine = client.post(
        "/api/v1/medicines",
        json={
            "name": "Integration Test Med",
            "price": "19.99",
            "stock_quantity": 10,
            "requires_prescription": True,
        },
        headers=auth_header(pharm_token),
    ).json()

    # --- Patient orders it using the doctor-issued e-prescription ---
    order = client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": pharmacy_business_id,
            "items": [{"medicine_id": medicine["id"], "quantity": 2}],
            "fulfillment_type": "pickup",
            "prescription_id": prescription["id"],
        },
        headers=auth_header(patient_token),
    )
    assert order.status_code == 201
    order = order.json()
    assert order["prescription_id"] == prescription["id"]
    assert order["total_amount"] == "39.98"

    updated_medicine = client.get(f"/api/v1/medicines/{medicine['id']}").json()
    assert updated_medicine["stock_quantity"] == 8

    # --- Payment gate blocks processing, then patient pays, then pharmacy advances it ---
    blocked = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "preparing"},
        headers=auth_header(pharm_token),
    )
    assert blocked.status_code == 400

    payment = client.post(
        "/api/v1/payments", json={"order_id": order["id"]}, headers=auth_header(patient_token)
    )
    assert payment.status_code == 201
    assert payment.json()["status"] == "succeeded"

    advanced = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        json={"status": "preparing"},
        headers=auth_header(pharm_token),
    )
    assert advanced.status_code == 200
    assert advanced.json()["status"] == "preparing"

    # --- Patient sees the e-prescription and notifications ---
    prescriptions = client.get("/api/v1/prescriptions/me", headers=auth_header(patient_token)).json()
    assert any(p["id"] == prescription["id"] for p in prescriptions)

    notifications = client.get("/api/v1/notifications/me", headers=auth_header(patient_token)).json()
    notification_types = {n["notification_type"] for n in notifications}
    assert {"booking_confirmation", "payment_receipt", "order_status_update"} <= notification_types

    # --- Admin monitoring and reports reflect the whole flow ---
    admin_orders = client.get("/api/v1/admin/orders", headers=auth_header(admin_token)).json()
    assert any(o["id"] == order["id"] and o["status"] == "preparing" for o in admin_orders)

    admin_appointments = client.get("/api/v1/admin/appointments", headers=auth_header(admin_token)).json()
    assert any(a["id"] == appointment["id"] and a["status"] == "completed" for a in admin_appointments)

    summary = client.get("/api/v1/admin/reports/summary", headers=auth_header(admin_token)).json()
    assert summary["orders_by_status"]["preparing"] >= 1
    assert summary["appointments_by_status"]["completed"] >= 1
    assert summary["pending_approvals_count"] == 0
