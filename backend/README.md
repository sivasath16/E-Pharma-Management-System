# E-Pharma Management System — Backend (Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8)

FastAPI backend covering:
- **Phase 2**: authentication, authorization (RBAC), Patient / Doctor / Pharmacy profile management
- **Phase 3**: medicine search, prescription upload, medicine ordering, inventory management, order tracking
- **Phase 4**: doctor availability, appointment booking, chat/video consultation, e-prescriptions
- **Phase 5**: admin user management, order/appointment monitoring, document verification, reports
- **Phase 6**: payment integration (mock gateway) and notification services (email/SMS)
- **Phase 7**: performance (DB indexes), structured request logging, security headers, sanitized exception handling
- **Phase 8**: input-validation bug fixes and a cross-module integration test

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

## Admin dashboard (Phase 5)

All endpoints under `/api/v1/admin` are Admin-only. No new tables were needed — this
phase is read/aggregate access over existing data, plus one write on the existing
`User.is_active` field (already enforced: `get_current_user` rejects inactive users,
and login itself returns 403 for an inactive account).

- `GET /api/v1/admin/users?role=&is_active=&is_approved=&skip=0&limit=50` — filtered,
  paginated user list.
- `GET /api/v1/admin/users/{user_id}` — single user detail.
- `PATCH /api/v1/admin/users/{user_id}/status` — body `{"is_active": bool}`. An admin
  cannot deactivate their own account (400).
- `GET /api/v1/admin/pending-approvals` — doctors/pharmacies awaiting approval, as a
  single oversight view; the approve action itself stays on the existing
  `POST /doctors/{user_id}/approve` / `POST /pharmacies/{user_id}/approve` endpoints.
- `GET /api/v1/admin/orders?status=&skip=0&limit=50` — all orders across every
  pharmacy (reuses `orders._to_response`).
- `GET /api/v1/admin/appointments?status=&skip=0&limit=50` — all appointments across
  every doctor (reuses `appointments._to_response`).
- `GET /api/v1/admin/reports/summary` — `users_by_role`, `pending_approvals_count`,
  `orders_by_status`, `total_revenue` (sum of `total_amount` for `delivered` orders),
  `appointments_by_status`.

Note: pagination here is scoped to these new admin endpoints only. Broader query/index
optimization is deferred to Phase 7 (Performance Optimization & Security).

## Frontend integration additions (Phase 5)

Small additions made to support the new `frontend/` app (see its own README):

- `GET /api/v1/auth/me` — returns the current authenticated user's `UserResponse`
  (email, role, `is_active`, `is_approved`). Previously there was no way for any
  client to fetch its own account info — the role-specific `/me` endpoints only
  return profile fields, never email, and Admin has no profile table at all.
- `GET /api/v1/doctors` — public list of **approved** doctors, filterable by
  `specialization`, paginated. `GET /api/v1/doctors/{doctor_id}` — public single-doctor
  detail (404 if missing or unapproved). Previously there was no way to discover a
  doctor's id at all unless you already had it.
- `GET /api/v1/pharmacies` — public list of **approved** pharmacies, paginated. Same
  motivation as above, for the "choose a pharmacy" flow.
- **CORS**: `app/main.py` now adds `CORSMiddleware`, allowed origins configured via
  `settings.cors_origins` (defaults to the Vite dev server on `localhost:5173`/
  `127.0.0.1:5173`). Without this, every browser-based frontend request was silently
  blocked by the browser's CORS preflight check — found by actually running the
  frontend against the API for the first time.

## Payments & notifications (Phase 6)

No real payment or email/SMS provider account is required. Both are built behind a
pluggable interface (`app/services/payments.py`, `app/services/notifications.py`) with
a **mock provider** by default — a real provider (Stripe, Twilio, SendGrid, ...) can be
swapped in later without touching any call site.

- `POST /api/v1/payments` — Patient-only. Body: `{order_id, simulate_failure?}`.
  `simulate_failure` is a mock-only testing hook to exercise the failure path
  deterministically. Rejects a second payment attempt once one has already succeeded
  (400 "Order already paid"). On success, fires a `payment_receipt` notification.
- `GET /api/v1/payments/order/{order_id}` — order's patient/pharmacy owner or admin —
  full payment attempt history (list, newest first).
- **Order status gate**: `PATCH /orders/{id}/status` (Phase 3) now requires a
  `succeeded` payment before an order can leave `pending` for anything other than
  `cancelled` (400 "Order must be paid before it can be processed" otherwise) —
  matches the workflow doc's "Make Payment → Pharmacy Prepares Order" ordering.
  Every successful transition also fires an `order_status_update` notification
  (both `email` and `sms`).
- `GET /api/v1/notifications/me` — any authenticated user — their own notification
  log; this is the mock "inbox" used to verify a trigger actually fired.
- `POST /api/v1/notifications/send-appointment-reminders` — Admin-only. There's no
  background job/scheduler in this stack, so this is an explicit, idempotent endpoint
  (meant to be hit by an external cron later, or manually now): notifies patients for
  `confirmed` appointments starting within the next 24h that haven't been reminded yet,
  and marks them `reminder_sent=True`. Returns `{"reminders_sent": <count>}`.
- Booking a new appointment and uploading a prescription also fire notifications
  (`booking_confirmation`, `prescription_uploaded`) — small one-line hooks into the
  existing Phase 3/4 endpoints, reusing the same notification helpers.

## Performance & security (Phase 7)

No rate limiting was added — there's no Redis/external infra in this stack, consistent
with the mock-provider approach used for payments/notifications, and per-process rate
limiting wouldn't hold up in a real multi-instance deployment anyway. Everything else:

- **DB indexes** (`alembic/versions/0005_performance_indexes.py`): `orders.status`,
  `appointments.status`, `users.role` — columns the admin/pharmacy/doctor list
  endpoints filter on that weren't indexed before.
- **Structured request logging** (`app/core/middleware.py`'s `RequestLoggingMiddleware`):
  every request is logged with method, path, status code, and duration, tagged with a
  short request id that's also returned as an `X-Request-ID` response header for
  cross-referencing a specific client request to its log line.
- **Security headers** (`SecurityHeadersMiddleware`): `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` on every response.
- **Sanitized exception handling** (`app/main.py`'s global `Exception` handler): any
  unhandled exception is logged with its full traceback server-side but returns only a
  generic `{"detail": "Internal server error"}` to the client — no stack trace or
  internal detail leakage.
- **"Resolve integration issues"**: this phase's validation activity was the full-stack
  integration pass across every remaining Phase 2–5 frontend gap (profile editing,
  pharmacy inventory, the full appointment/consultation/e-prescription flow, and the
  admin dashboard), verified end-to-end with Playwright against the real backend —
  zero console/page errors, same bar as every prior phase.

## Testing & bug resolution (Phase 8)

A read-only audit of the request schemas found four real validation gaps, each fixed
with a `pydantic.Field` constraint and a rejection test:
- `MedicineCreate`/`MedicineUpdate.price` had no positivity constraint — a pharmacy
  could set a negative price. Now `Field(gt=0)`.
- Same schemas' `stock_quantity` had no non-negativity constraint. Now `Field(ge=0)`.
- `ConsultationMessageCreate.body` had no `min_length` — an empty chat message could
  be sent. Now `Field(min_length=1)`.
- `RegisterRequest.password` had no server-side minimum length at all — the frontend
  enforces ≥6 characters, but a direct API call bypassed it entirely. Now
  `Field(min_length=6)`, matching the frontend's own rule.

`tests/test_integration.py` adds one full cross-module flow no single module's test
file exercised on its own: register all four roles → admin approves doctor & pharmacy
→ patient books and the doctor confirms/completes/e-prescribes an appointment →
patient orders a prescription-required medicine using that e-prescription → pays →
pharmacy advances the order → admin's monitoring and reports endpoints reflect all of
it. This validates that Phases 3, 4, 5, and 6's modules actually compose correctly
together.

See `../frontend/README.md` for the new committed Playwright E2E suite, which
formalizes what had previously only been verified via one-off scripts during
development.
