# E-Pharma Management System — Backend (Phase 2 + Phase 3 + Phase 4)

FastAPI backend covering:
- **Phase 2**: authentication, authorization (RBAC), Patient / Doctor / Pharmacy profile management
- **Phase 3**: medicine search, prescription upload, medicine ordering, inventory management, order tracking
- **Phase 4**: doctor availability, appointment booking, chat/video consultation, e-prescriptions

Notifications and payments are out of scope for these phases.

## Stack
- Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL
- JWT auth (`python-jose`), password hashing (`bcrypt`)
- Tests: `pytest` + FastAPI `TestClient` against an in-memory SQLite DB

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit DATABASE_URL / JWT_SECRET_KEY as needed
```

Provision a PostgreSQL database matching `DATABASE_URL` in `.env`, then run migrations:

```bash
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Test

```bash
pytest
```

Tests run against an isolated in-memory SQLite database and do not require a running
PostgreSQL instance.

## Auth model

- `POST /api/v1/auth/register` — registers a Patient, Doctor, Pharmacy, or Admin.
  Doctor and Pharmacy accounts are created with `is_approved=False` until an Admin
  approves them.
- `POST /api/v1/auth/login` — OAuth2 password flow (form fields `username`=email,
  `password`), returns a JWT bearer token.
- Protected endpoints require `Authorization: Bearer <token>`.
- `POST /api/v1/doctors/{user_id}/approve` and `POST /api/v1/pharmacies/{user_id}/approve`
  are Admin-only.

Note: admin registration is currently open via `/auth/register` for development
convenience. Before production deployment, lock this down (e.g. seed the first admin
directly in the database and remove `admin` from the public registration role choices).

## Medicine & order model (Phase 3)

- `GET /api/v1/medicines`, `GET /api/v1/medicines/{id}` — public, no auth required.
- `POST /api/v1/medicines`, `PUT /api/v1/medicines/{id}` — Pharmacy-only, and the
  pharmacy must be Admin-approved (`is_approved=True`) to create medicines.
- `POST /api/v1/prescriptions`, `GET /api/v1/prescriptions/me` — Patient-only.
  `file_url` is a plain string reference (same convention as doctor/pharmacy license
  URLs) — there is no real file-upload endpoint yet.
- `POST /api/v1/orders` — Patient-only. Validates: target pharmacy is approved, the
  prescription (if given) belongs to the caller, each medicine belongs to the target
  pharmacy and has sufficient stock, prescription-required medicines have a
  prescription attached, and delivery orders have a delivery address. Stock is
  decremented and `total_amount` is computed server-side.
- `GET /api/v1/orders/me` (patient), `GET /api/v1/orders/pharmacy/me` (pharmacy),
  `GET /api/v1/orders/{id}` (owner or admin).
- `PATCH /api/v1/orders/{id}/status` — Pharmacy owner or Admin only. Valid transitions:
  `pending → preparing/cancelled`, `preparing → shipped/ready_for_pickup/cancelled`,
  `shipped|ready_for_pickup → delivered`. Cancelling from `pending`/`preparing`
  restocks the reserved quantities.

`PharmacyProfile` now exposes its own `id` (the business-entity id used as
`pharmacy_id` elsewhere) — patients/pharmacies pick this up from `GET /pharmacies/me`
or from `Medicine.pharmacy_id` in search results.

## Appointment & consultation model (Phase 4)

- `POST /api/v1/doctors/availability-slots` — Doctor-only. Rejects `start_time >=
  end_time`, past start times, and overlaps with the doctor's existing slots.
- `GET /api/v1/doctors/{doctor_id}/availability-slots?available_only=true` — public;
  defaults to unbooked, future slots only.
- `DELETE /api/v1/doctors/availability-slots/{slot_id}` — Doctor-only, ownership-checked;
  rejects deleting an already-booked slot.
- `POST /api/v1/appointments` — Patient-only. Validates the doctor is approved, the slot
  belongs to that doctor, is unbooked, and is in the future. Books the slot and creates
  the appointment (`status=pending`) in one transaction.
- `GET /api/v1/appointments/me` (patient), `GET /api/v1/appointments/doctor/me` (doctor),
  `GET /api/v1/appointments/{id}` (owner or admin).
- `PATCH /api/v1/appointments/{id}/status` — Doctor may set `confirmed`/`rejected`/
  `completed` (own appointments only); Patient may set `cancelled` (own appointments
  only); Admin may set any valid transition. Valid transitions: `pending →
  confirmed/rejected/cancelled`, `confirmed → completed/cancelled`. Rejecting or
  cancelling frees the slot. The doctor can attach a `meeting_url` in the same request
  when confirming a video appointment.
- `POST /api/v1/appointments/{id}/messages`, `GET /api/v1/appointments/{id}/messages` —
  participant-only (the patient or doctor on that appointment), and only once the
  appointment is `confirmed`. This is simple REST-persisted chat, not real-time
  (no WebSocket) — sufficient for chat-mode consultations; video-mode uses the
  external `meeting_url` instead of in-app video infra.
- `POST /api/v1/appointments/{id}/prescription` — Doctor-only, must be the appointment's
  doctor, appointment must be `confirmed` or `completed`. Reuses Phase 3's `Prescription`
  model (now with `appointment_id`/`issued_by_doctor_id`), so an issued e-prescription is
  immediately visible via the existing `GET /api/v1/prescriptions/me` and usable as
  `prescription_id` in `POST /orders` — no separate consumption endpoint was needed.

`DoctorProfile` now exposes its own `id` too (same fix as `PharmacyProfile.id` in
Phase 3), since patients need `doctor_id` to list slots and book appointments.
