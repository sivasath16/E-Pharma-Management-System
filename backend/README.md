# E-Pharma Management System — Backend (Phase 2)

FastAPI backend covering Phase 2 scope: authentication, authorization (RBAC), and
Patient / Doctor / Pharmacy profile management. Medicine ordering, appointments,
notifications, and payments are out of scope for this phase.

## Stack
- Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL
- JWT auth (`python-jose`), password hashing (`passlib[bcrypt]`)
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
