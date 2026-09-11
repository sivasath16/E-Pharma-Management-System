# Source Code Documentation

A module-by-module map of the repository, for onboarding without reading every
file. Endpoint behavior is in [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md);
architecture/rationale is in [`TECHNICAL_DOCUMENTATION.md`](TECHNICAL_DOCUMENTATION.md).

## Repository layout

```
Project/
├── backend/                 FastAPI service
├── frontend/                React SPA
├── docker-compose.yml       staging/production-shaped stack (db + backend + frontend)
├── .env.example             docker-compose environment template
├── DEPLOYMENT.md            deployment guide
├── docs/                    this directory
└── Phase 1 .. Phase 10/     weekly status reports (project-management artifacts, not code)
```

## Backend — `backend/app/`

```
app/
├── main.py            FastAPI app: middleware wiring, router mount, global
│                       exception handler, /health.
├── core/
│   ├── config.py       Settings (pydantic-settings) — reads .env / process env.
│   ├── deps.py          get_current_user, require_role(*roles) — JWT decode + RBAC.
│   ├── security.py      password hashing (bcrypt) + JWT encode/decode helpers.
│   ├── logging.py        structured logging configuration.
│   └── middleware.py     RequestLoggingMiddleware, SecurityHeadersMiddleware.
├── db/
│   └── base.py           SQLAlchemy declarative Base + session dependency.
├── models/                one SQLAlchemy model per file (user, patient, doctor,
│                          pharmacy, medicine, prescription, order, appointment,
│                          payment, notification) — see TECHNICAL_DOCUMENTATION.md
│                          for the entity relationships.
├── schemas/                Pydantic request/response models, one file per
│                          resource, mirroring `models/` — this is what
│                          FastAPI uses to build the OpenAPI schema and to
│                          validate every request body server-side.
├── api/v1/                 one router module per resource (auth, patients,
│                          doctors, pharmacies, medicines, prescriptions,
│                          orders, appointments, payments, notifications,
│                          admin) + router.py wiring them all under /api/v1.
└── services/                business logic that isn't pure CRUD:
    ├── payments.py          PaymentProvider protocol + MockPaymentProvider.
    └── notifications.py      NotificationService protocol + MockNotificationService.
```

**Conventions used throughout:**
- Route handlers stay thin — validation lives in `schemas/`, RBAC in `deps.py`
  dependencies declared on the route, and any real business logic (status-transition
  validation, payment gating, e-prescription enforcement) lives in the router module
  itself close to the routes that need it, since none of it is currently reused
  across more than one router.
- Every list endpoint is paginated; every mutating endpoint requires
  `Authorization: Bearer <JWT>` unless explicitly noted in `API_DOCUMENTATION.md`.
- `tests/` mirrors `api/v1/` one-to-one (`test_auth.py`, `test_medicines.py`, …)
  plus `test_integration.py` for the cross-module flow added in Phase 8.
  `tests/conftest.py` provides the shared `client` fixture (FastAPI `TestClient`
  against an in-memory SQLite DB) and auth helpers (`register_user`, `login_user`,
  `token_for`, `auth_header`, `approved_doctor_token`, `approved_pharmacy_token`, `pay_order`).

## Frontend — `frontend/src/`

```
src/
├── api/            one typed module per backend router (client.ts is the shared
│                   fetch wrapper; types.ts mirrors the backend's Pydantic schemas).
│                   This layer was built once, early, and never needed changes as
│                   later phases added screens — every screen since has just been
│                   UI calling an already-typed function here.
├── auth/           AuthContext (token + current user, backed by localStorage +
│                   GET /auth/me) and ProtectedRoute (role-gated route guard).
├── cart/           CartContext — localStorage-persisted, single-pharmacy-per-cart
│                   (matches the backend's single-pharmacy-per-order rule).
├── components/     shared UI, e.g. ChatThread.tsx (polling-based consultation chat,
│                   used by both patient and doctor appointment-detail pages).
├── layout/         AppShellLayout — role-aware nav + cart badge.
└── pages/
    ├── public/      Landing, Login, Register, Medicine Search, Doctor Directory/Detail.
    ├── patient/     Profile, Cart/checkout, Orders, Prescriptions, Appointments.
    ├── doctor/      Profile, Availability, Appointments (confirm/complete/chat/e-Rx).
    ├── pharmacy/    Profile, Inventory, Orders (fulfillment).
    ├── admin/       Dashboard, Users, Pending Approvals, Orders/Appointments monitoring.
    └── notifications/  role-agnostic notifications inbox.
```

`e2e/` (Phase 8) is the committed Playwright test suite — `helpers.ts` has the
shared seed/login utilities; each `*.spec.ts` covers one functional area (auth,
patient flow, appointment flow, pharmacy/admin).

## Where to look for X

| Need to... | Look at |
|---|---|
| Add a new field to an existing resource | its `models/*.py` + `schemas/*.py`, then a new Alembic revision |
| Add a new endpoint | `api/v1/<resource>.py` + `schemas/<resource>.py` |
| Change an RBAC rule | the `Depends(require_role(...))` on the route in `api/v1/<resource>.py` |
| Change a status-transition rule (orders/appointments) | the relevant `api/v1/orders.py` / `api/v1/appointments.py` handler — transitions are validated inline, not in a separate state-machine module |
| Add a UI screen | `frontend/src/pages/<role>/`, wired into `frontend/src/App.tsx`'s routes and, if role-gated, `ProtectedRoute` |
| Add/replace a payment or notification provider | implement `PaymentProvider`/`NotificationService` in `app/services/`, swap the instance wired in the relevant router |
