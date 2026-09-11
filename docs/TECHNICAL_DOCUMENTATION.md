# Technical Documentation

Architecture and design reference for the Techmentee E-Pharma Management System.
For the endpoint-by-endpoint reference see [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md);
for how to run/deploy it see [`../DEPLOYMENT.md`](../DEPLOYMENT.md); for a module-by-module
source map see [`SOURCE_CODE_DOCUMENTATION.md`](SOURCE_CODE_DOCUMENTATION.md).

## System overview

A pharmacy + telehealth platform for four roles — **Patient, Doctor, Pharmacy,
Admin** — covering account registration/approval, medicine search and ordering
(with e-prescription enforcement), appointment booking with chat/video
consultation, payments, notifications, and admin monitoring.

```
┌────────────────────┐        HTTPS/JSON        ┌──────────────────────┐        SQL        ┌──────────────┐
│  React SPA          │  ───────────────────►   │  FastAPI backend      │  ─────────────►  │  PostgreSQL   │
│  (Vite, Mantine,     │  ◄───────────────────   │  (Uvicorn, SQLAlchemy,│  ◄─────────────  │               │
│  React Query)        │       JWT bearer         │  Alembic, Pydantic)   │                   │               │
└────────────────────┘                          └──────────────────────┘                   └──────────────┘
```

There is no server-side session state — the backend is stateless and horizontally
scalable behind a load balancer; the only shared state is PostgreSQL.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend framework | FastAPI + Uvicorn | async-capable, auto-generates OpenAPI docs from the same Pydantic schemas used for validation |
| ORM / migrations | SQLAlchemy 2.x (`Mapped`/`mapped_column`) + Alembic | typed models, versioned schema history (`backend/alembic/versions/`) |
| Database | PostgreSQL 17 | relational integrity for orders/payments/appointments; used identically in dev and in the Docker Compose stack |
| Auth | JWT (`python-jose`) + `bcrypt` password hashing | stateless bearer auth; no session store to scale |
| Frontend framework | React + TypeScript + Vite | fast dev/build, typed API layer |
| Frontend UI | Mantine | accessible component library, avoided hand-rolling forms/tables/dates |
| Frontend server state | TanStack Query | caching/refetch for all `src/api/*.ts` calls |
| Payments / notifications | Mock providers behind a `Protocol` interface (`app/services/payments.py`, `app/services/notifications.py`) | swappable for Stripe/Twilio/SendGrid later without touching call sites — no real provider was in scope for this engagement |

## Data model

Core entities (`backend/app/models/`), one table each:

- **`User`** — account row for all four roles (`UserRole` enum), holds the password
  hash, `is_active`, `is_approved` (Doctor/Pharmacy only — Patient/Admin are
  auto-approved).
- **`Patient` / `Doctor` / `Pharmacy`** — one-to-one role-specific profile rows,
  keyed by `user_id`, each with their own `id` (the "business entity" id used in
  URLs like `/doctors/{doctor_id}` — distinct from `User.id`, a deliberate split
  that shows up throughout the API and frontend).
- **`Medicine`** — pharmacy inventory (`pharmacy_id`, price, stock, `requires_prescription`).
- **`Prescription`** — patient-uploaded or doctor-issued (`appointment_id` set for the latter).
- **`Order` → `OrderItem`** — single-pharmacy-per-order; status is a finite state
  machine (`pending → paid → preparing → out_for_delivery|ready_for_pickup →
  completed`, or `cancelled`), transitions validated server-side, never trusted
  from the client.
- **`DoctorAvailabilitySlot` → `Appointment` → `ConsultationMessage`** — a slot is
  consumed when booked; an appointment carries `ConsultationMode` (chat/video) and
  its own status machine (`pending → confirmed → completed`, or `rejected`/`cancelled`);
  messages only exist once `confirmed`.
  Indexes: `orders.status`, `appointments.status`, `users.role` (added in Phase 7
  after these became the hot filter columns for the admin/pharmacy/doctor list views).
- **`Payment`** — one row per payment attempt against an order (supports the mock
  provider's simulated-failure path for demoing error handling).
  Indexed on `orders.status` (Phase 7) as the busiest filter column.
- **`Notification`** — patient-facing inbox row, written by the backend at each
  trigger point (booking confirmed, payment receipt, order status change,
  appointment reminder).

## Request lifecycle & cross-cutting concerns

Every request passes through (`app/main.py`):
1. `CORSMiddleware` — origin allowlist from `settings.cors_origins`.
2. `SecurityHeadersMiddleware` — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
3. `RequestLoggingMiddleware` — assigns/propagates `X-Request-ID`, structured log per request (`app/core/logging.py`).
4. Route handler → `get_current_user`/`require_role(*roles)` dependency (`app/core/deps.py`) decodes and validates the JWT, enforces RBAC before the handler body runs.
5. A global `@app.exception_handler(Exception)` catches anything unhandled, logs the full traceback server-side, and returns a sanitized `500` — no internal detail ever reaches the client.

## Security

- Passwords hashed with `bcrypt` directly (not via `passlib`, which proved
  incompatible with current `bcrypt` releases during Phase 2).
- JWTs signed with `HS256` and a secret that **must** be overridden per environment
  (`JWT_SECRET_KEY` — see the Deployment Guide's checklist; the repo default is a
  dev-only placeholder).
- Server-side input validation everywhere via Pydantic (`Field(gt=0)`,
  `Field(min_length=...)`, etc.) — the frontend's own validation is UX only, never
  trusted as the source of truth (this exact gap — an unenforced password-length
  rule that only existed client-side — was one of the bugs found and fixed in Phase 8).
  See [`code-review` in-repo history / Phase 8 report] for the full list.
- RBAC enforced per-route server-side, not just hidden in the UI.
- Rate limiting was explicitly scoped out (no shared/Redis infra for this
  engagement) — documented as a known gap, not an oversight.

## Known simplifications (explicit, scoped-out for this engagement)

- Payments and notifications use mock providers, not live Stripe/Twilio/SendGrid.
- Chat is REST-polling based, not WebSocket.
- No rate limiting.
- Document/license "uploads" are plain URL strings, not real file storage.

These are documented here (and in the backend/frontend READMEs) rather than hidden,
so a future engineer knows exactly what to swap in before a real production launch
beyond staging.
