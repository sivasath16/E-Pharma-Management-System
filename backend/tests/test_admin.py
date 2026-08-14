from datetime import datetime, timedelta, timezone

from tests.conftest import approved_doctor_token, approved_pharmacy_token, auth_header, token_for, user_id_from_token


def _future(hours):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _admin_token(client, email="admin@example.com"):
    return token_for(client, email, "secret123", "admin")


def test_non_admin_forbidden_on_all_admin_endpoints(client):
    patient_token = token_for(client, "patient@example.com", "secret123", "patient")
    headers = auth_header(patient_token)

    assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/users/1", headers=headers).status_code == 403
    assert client.patch("/api/v1/admin/users/1/status", json={"is_active": False}, headers=headers).status_code == 403
    assert client.get("/api/v1/admin/pending-approvals", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/orders", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/appointments", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/reports/summary", headers=headers).status_code == 403


def test_list_users_filters_and_pagination(client):
    admin_token = _admin_token(client)
    for i in range(3):
        token_for(client, f"patient{i}@example.com", "secret123", "patient")

    all_patients = client.get("/api/v1/admin/users", params={"role": "patient"}, headers=auth_header(admin_token))
    assert all_patients.status_code == 200
    assert len(all_patients.json()) == 3

    page1 = client.get(
        "/api/v1/admin/users", params={"role": "patient", "limit": 2}, headers=auth_header(admin_token)
    )
    assert len(page1.json()) == 2

    page2 = client.get(
        "/api/v1/admin/users",
        params={"role": "patient", "limit": 2, "skip": 2},
        headers=auth_header(admin_token),
    )
    assert len(page2.json()) == 1


def test_get_user_detail(client):
    admin_token = _admin_token(client)
    patient_token = token_for(client, "patient@example.com", "secret123", "patient")
    patient_id = user_id_from_token(patient_token)

    found = client.get(f"/api/v1/admin/users/{patient_id}", headers=auth_header(admin_token))
    assert found.status_code == 200
    assert found.json()["id"] == patient_id

    missing = client.get("/api/v1/admin/users/999999", headers=auth_header(admin_token))
    assert missing.status_code == 404


def test_update_user_status_blocks_further_access(client):
    admin_token = _admin_token(client)
    patient_token = token_for(client, "patient@example.com", "secret123", "patient")
    patient_id = user_id_from_token(patient_token)

    deactivate = client.patch(
        f"/api/v1/admin/users/{patient_id}/status", json={"is_active": False}, headers=auth_header(admin_token)
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    still_using_old_token = client.get("/api/v1/patients/me", headers=auth_header(patient_token))
    assert still_using_old_token.status_code == 401

    relogin = client.post("/api/v1/auth/login", data={"username": "patient@example.com", "password": "secret123"})
    assert relogin.status_code == 403


def test_admin_cannot_deactivate_self(client):
    admin_token = _admin_token(client)
    admin_id = user_id_from_token(admin_token)

    response = client.patch(
        f"/api/v1/admin/users/{admin_id}/status", json={"is_active": False}, headers=auth_header(admin_token)
    )
    assert response.status_code == 400


def test_non_admin_cannot_update_status(client):
    patient_token = token_for(client, "patient@example.com", "secret123", "patient")
    other_token = token_for(client, "other@example.com", "secret123", "patient")
    other_id = user_id_from_token(other_token)

    response = client.patch(
        f"/api/v1/admin/users/{other_id}/status", json={"is_active": False}, headers=auth_header(patient_token)
    )
    assert response.status_code == 403


def test_pending_approvals_reflects_unapproved_and_excludes_approved(client):
    admin_token = _admin_token(client)
    doc_token = token_for(client, "doc@example.com", "secret123", "doctor", full_name="Dr. Pending")
    doc_id = user_id_from_token(doc_token)
    pharm_token = token_for(client, "pharm@example.com", "secret123", "pharmacy", store_name="Pending Pharmacy")
    pharm_id = user_id_from_token(pharm_token)

    before = client.get("/api/v1/admin/pending-approvals", headers=auth_header(admin_token)).json()
    assert doc_id in [d["user_id"] for d in before["doctors"]]
    assert pharm_id in [p["user_id"] for p in before["pharmacies"]]

    client.post(f"/api/v1/doctors/{doc_id}/approve", headers=auth_header(admin_token))

    after = client.get("/api/v1/admin/pending-approvals", headers=auth_header(admin_token)).json()
    assert doc_id not in [d["user_id"] for d in after["doctors"]]
    assert pharm_id in [p["user_id"] for p in after["pharmacies"]]


def test_order_monitoring_across_pharmacies(client):
    admin_token = _admin_token(client)

    pharm_a = approved_pharmacy_token(client, email="a@example.com", store_name="Pharmacy A")
    med_a = client.post(
        "/api/v1/medicines",
        json={"name": "Med A", "price": "3.00", "stock_quantity": 10},
        headers=auth_header(pharm_a),
    ).json()

    pharm_b = approved_pharmacy_token(client, email="b@example.com", store_name="Pharmacy B")
    med_b = client.post(
        "/api/v1/medicines",
        json={"name": "Med B", "price": "4.00", "stock_quantity": 10},
        headers=auth_header(pharm_b),
    ).json()

    patient_token = token_for(client, "patient@example.com", "secret123", "patient")
    client.post(
        "/api/v1/orders",
        json={"pharmacy_id": med_a["pharmacy_id"], "items": [{"medicine_id": med_a["id"], "quantity": 1}], "fulfillment_type": "pickup"},
        headers=auth_header(patient_token),
    )
    client.post(
        "/api/v1/orders",
        json={"pharmacy_id": med_b["pharmacy_id"], "items": [{"medicine_id": med_b["id"], "quantity": 1}], "fulfillment_type": "pickup"},
        headers=auth_header(patient_token),
    )

    response = client.get("/api/v1/admin/orders", headers=auth_header(admin_token))
    assert response.status_code == 200
    pharmacy_ids = {o["pharmacy_id"] for o in response.json()}
    assert {med_a["pharmacy_id"], med_b["pharmacy_id"]} <= pharmacy_ids

    filtered = client.get("/api/v1/admin/orders", params={"status": "pending"}, headers=auth_header(admin_token))
    assert len(filtered.json()) == 2


def test_appointment_monitoring_across_doctors(client):
    admin_token = _admin_token(client)

    doc_a = approved_doctor_token(client, email="doc_a@example.com", full_name="Dr. A")
    slot_a = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": _future(24), "end_time": _future(25)},
        headers=auth_header(doc_a),
    ).json()
    doctor_a_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_a)).json()["id"]

    doc_b = approved_doctor_token(client, email="doc_b@example.com", full_name="Dr. B")
    slot_b = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": _future(24), "end_time": _future(25)},
        headers=auth_header(doc_b),
    ).json()
    doctor_b_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_b)).json()["id"]

    patient_token = token_for(client, "patient@example.com", "secret123", "patient")
    client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_a_id, "slot_id": slot_a["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )
    client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_b_id, "slot_id": slot_b["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )

    response = client.get("/api/v1/admin/appointments", headers=auth_header(admin_token))
    assert response.status_code == 200
    doctor_ids = {a["doctor_id"] for a in response.json()}
    assert {doctor_a_id, doctor_b_id} <= doctor_ids

    filtered = client.get(
        "/api/v1/admin/appointments", params={"status": "pending"}, headers=auth_header(admin_token)
    )
    assert len(filtered.json()) == 2


def test_report_summary_counts(client):
    admin_token = _admin_token(client)

    token_for(client, "p1@example.com", "secret123", "patient")
    token_for(client, "p2@example.com", "secret123", "patient")

    doc_token = token_for(client, "doc@example.com", "secret123", "doctor", full_name="Dr. Report")
    doc_user_id = user_id_from_token(doc_token)
    client.post(f"/api/v1/doctors/{doc_user_id}/approve", headers=auth_header(admin_token))

    pharm_token = token_for(client, "pharm@example.com", "secret123", "pharmacy", store_name="Report Pharmacy")
    pharm_user_id = user_id_from_token(pharm_token)
    client.post(f"/api/v1/pharmacies/{pharm_user_id}/approve", headers=auth_header(admin_token))

    medicine = client.post(
        "/api/v1/medicines",
        json={"name": "Report Med", "price": "2.00", "stock_quantity": 5},
        headers=auth_header(pharm_token),
    ).json()
    patient_token = token_for(client, "p3@example.com", "secret123", "patient")
    client.post(
        "/api/v1/orders",
        json={
            "pharmacy_id": medicine["pharmacy_id"],
            "items": [{"medicine_id": medicine["id"], "quantity": 1}],
            "fulfillment_type": "pickup",
        },
        headers=auth_header(patient_token),
    )

    slot = client.post(
        "/api/v1/doctors/availability-slots",
        json={"start_time": _future(24), "end_time": _future(25)},
        headers=auth_header(doc_token),
    ).json()
    doctor_id = client.get("/api/v1/doctors/me", headers=auth_header(doc_token)).json()["id"]
    client.post(
        "/api/v1/appointments",
        json={"doctor_id": doctor_id, "slot_id": slot["id"], "consultation_mode": "chat"},
        headers=auth_header(patient_token),
    )

    response = client.get("/api/v1/admin/reports/summary", headers=auth_header(admin_token))
    assert response.status_code == 200
    body = response.json()

    assert body["users_by_role"] == {"patient": 3, "doctor": 1, "pharmacy": 1, "admin": 1}
    assert body["pending_approvals_count"] == 0
    assert body["orders_by_status"]["pending"] == 1
    assert body["appointments_by_status"]["pending"] == 1
    assert float(body["total_revenue"]) == 0.0
