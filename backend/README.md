# E-Pharma Management System — Backend (Phase 2 + Phase 3)

FastAPI backend covering:
- **Phase 2**: authentication, authorization (RBAC), Patient / Doctor / Pharmacy profile management
- **Phase 3**: medicine search, prescription upload, medicine ordering, inventory management, order tracking

Appointments, notifications, and payments are out of scope for these phases.

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
