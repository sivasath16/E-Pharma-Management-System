# E-Pharma Management System — Frontend (Frontend Phase 1)

React + Vite + TypeScript frontend for the E-Pharma Management System backend. This
first pass covers the shared foundation and the public-facing screens; role-specific
dashboards (Patient/Doctor/Pharmacy/Admin) land in later Frontend Phases.

## Stack

- Vite + React + TypeScript
- `react-router-dom` for routing
- `@tanstack/react-query` for server state/caching
- Mantine (`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`,
  `@mantine/dates`) + `@tabler/icons-react` for UI
- `jwt-decode` to read `{id, role}` from the JWT client-side (the backend still verifies
  every request; the frontend only uses this for UI routing)

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # defaults to http://localhost:8000/api/v1
```

Requires the backend running locally (see `../backend/README.md`) — including its CORS
config, which allows `http://localhost:5173` by default.

## Run

```bash
npm run dev
```

Serves at http://localhost:5173.

## Build

```bash
npm run build
```

Runs `tsc -b` (type-check) then `vite build`.

## Structure

- `src/api/` — one typed module per backend router (`auth.ts`, `patients.ts`,
  `doctors.ts`, `pharmacies.ts`, `medicines.ts`, `prescriptions.ts`, `orders.ts`,
  `appointments.ts`, `admin.ts`), a shared fetch wrapper (`client.ts`), and `types.ts`
  mirroring the backend's Pydantic schemas. Only the auth/public modules are used by
  screens built so far — the rest exist now so later phases don't redo this layer.
  **Note**: `price`/`total_amount`/`unit_price`/`total_revenue` are typed as `string`,
  not `number` — FastAPI serializes Python `Decimal` to a JSON string.
- `src/auth/` — `AuthContext` (token + current user, backed by `localStorage` +
  `GET /auth/me`) and `ProtectedRoute` (role-gated route guard).
- `src/layout/` — `AppShellLayout`, a Mantine `AppShell` with role-aware nav.
- `src/pages/public/` — Landing, Login, Register, MedicineSearch, DoctorDirectory,
  DoctorDetail. All built and working against the real backend.
- `src/pages/{patient,doctor,pharmacy,admin}/` — currently just a placeholder home per
  role (confirms auth/routing end-to-end); full dashboards are Frontend Phases 2–5.

## Roadmap

- **Frontend Phase 2 (Patient)**: profile, prescription upload/list, medicine ordering
  (cart → checkout), order history, appointment booking, appointment detail (chat,
  meeting link, e-prescription view)
- **Frontend Phase 3 (Doctor)**: profile, availability slot management, appointment
  detail (confirm/reject/complete, meeting link, chat, e-prescription issuance)
- **Frontend Phase 4 (Pharmacy)**: profile, inventory management, order fulfillment
- **Frontend Phase 5 (Admin)**: report dashboard, user management, pending approvals,
  order/appointment monitoring
