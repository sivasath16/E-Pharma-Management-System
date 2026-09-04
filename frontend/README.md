# E-Pharma Management System — Frontend

React + Vite + TypeScript frontend for the E-Pharma Management System backend. All
Patient/Doctor/Pharmacy/Admin functionality the backend supports (Phases 2–6) now has
a working screen.

## Stack

- Vite + React + TypeScript
- `react-router-dom` for routing
- `@tanstack/react-query` for server state/caching
- Mantine (`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`,
  `@mantine/dates`) + `@tabler/icons-react` for UI
- `jwt-decode` to read `{id, role}` from the JWT client-side (the backend still verifies
  every request; the frontend only uses this for UI routing)
- `decimal.js` for cart/total math on money fields (which are strings on the wire, since
  FastAPI serializes Python `Decimal` to a JSON string, not a number)

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

## E2E tests (Phase 8)

```bash
npx playwright install chromium   # first time only
npm run test:e2e
```

Requires the backend + local PostgreSQL already running separately (same
precondition as `npm run dev`) — `playwright.config.ts` only auto-starts the
frontend dev server, not the backend. `e2e/` covers auth (register/login/role
guards), the patient order+payment flow (including the payment gate and a
simulated failure), the full appointment lifecycle (booking → confirm → chat →
complete → e-prescription) in both chat and video mode, pharmacy inventory and
order fulfillment, and admin approvals/user management. This formalizes what had
previously only been verified via one-off scripts during development into a
permanent, re-runnable suite.

## Structure

- `src/api/` — one typed module per backend router (`auth.ts`, `patients.ts`,
  `doctors.ts`, `pharmacies.ts`, `medicines.ts`, `prescriptions.ts`, `orders.ts`,
  `payments.ts`, `appointments.ts`, `notifications.ts`, `admin.ts`), a shared fetch
  wrapper (`client.ts`), and `types.ts` mirroring the backend's Pydantic schemas.
- `src/auth/` — `AuthContext` (token + current user, backed by `localStorage` +
  `GET /auth/me`) and `ProtectedRoute` (role-gated route guard; omit `allowedRoles` to
  require only "any authenticated user").
- `src/cart/` — `CartContext`, a `localStorage`-persisted client-side cart. Since a
  backend order can only include items from one pharmacy, adding an item from a
  different pharmacy replaces the cart (with an explanatory notification) rather than
  supporting a multi-pharmacy cart.
- `src/components/ChatThread.tsx` — shared consultation chat UI (message list + send
  box), used by both the patient and doctor appointment-detail pages. Polls on a short
  interval rather than using a WebSocket, matching the backend's REST-based chat design.
- `src/layout/` — `AppShellLayout`, a Mantine `AppShell` with role-aware nav and a cart
  badge for patients.
- `src/pages/public/` — Landing, Login, Register, Medicine Search (with "Add to Cart"
  for patients), Doctor Directory, Doctor Detail (with an appointment-booking modal
  opened from each available slot).
- `src/pages/patient/` — Profile, Cart/checkout, Order History, Order Detail (payment,
  including a "simulate failure" demo toggle exposing the backend's mock-provider
  testing hook), Prescriptions (upload + list, including doctor-issued ones),
  Appointments (list) and Appointment Detail (meeting link for video, chat for chat
  mode, cancel while pending, linked e-prescription once issued).
- `src/pages/doctor/` — Profile, Availability (create/list/delete slots), Appointments
  (list) and Appointment Detail (confirm/reject with an optional meeting link, complete,
  chat, e-prescription issuance).
- `src/pages/pharmacy/` — Profile, Inventory (add medicines, inline stock/price edit),
  Orders (view + advance status through the backend's allowed transitions, mirrored
  client-side for UX but not authoritative — the backend still validates every
  transition).
- `src/pages/admin/` — Dashboard (report summary cards), Users (filter + activate/
  deactivate), Pending Approvals, Orders and Appointments (read-only monitoring tables).
- `src/pages/notifications/` — a role-agnostic notifications inbox (`/notifications`).
  Only Patients currently ever receive notifications (every backend trigger targets the
  patient), so this is empty for other roles until later triggers are added for them.

## Known simplifications

- Registering as Admin has no UI (by design, matching the backend README's note that
  public admin registration is a dev-only convenience) — create one via
  `POST /auth/register` directly or the existing `/docs` page.
- Chat is polling-based, not real-time (no WebSocket) — matches the backend's design.
- Doctor/Pharmacy/Patient profile forms don't support real file uploads; document/license
  fields are plain URL strings, same convention used throughout the backend.
