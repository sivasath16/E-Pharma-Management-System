# API Documentation

The backend is a FastAPI service and generates its own interactive, always-in-sync
API reference from the code — that's the primary API documentation, not this file:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Raw OpenAPI 3.1 schema**: `http://localhost:8000/openapi.json`

Every request/response shape below is a Pydantic schema (`backend/app/schemas/`), so
the generated docs are never out of date with the implementation. This file is a
condensed index over that schema, organized by module, for anyone who wants an
overview without spinning up the server.

All routes are mounted under `/api/v1` except `/health`. All routes except
`POST /auth/register`, `POST /auth/login`, `GET /doctors`, `GET /doctors/{id}`,
`GET /pharmacies`, and `GET /health` require `Authorization: Bearer <JWT>` (issued
by `/auth/login`). RBAC is enforced server-side per route (see
`app/core/deps.py::require_role`) — this list notes the role each route requires.

## Auth — `/auth`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create a Patient/Doctor/Pharmacy/Admin account. Doctor/Pharmacy accounts start unapproved. |
| POST | `/auth/login` | public | Exchange email + password for a JWT. |
| GET | `/auth/me` | any authenticated | Current user's account record. |

## Patients — `/patients`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/patients/me` | patient | Own profile. |
| PUT | `/patients/me` | patient | Update own profile. |

## Doctors — `/doctors`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/doctors` | public | Paginated list of **approved** doctors. |
| GET | `/doctors/{doctor_id}` | public | Approved doctor detail. |
| GET | `/doctors/me` | doctor | Own profile. |
| PUT | `/doctors/me` | doctor | Update own profile. |
| POST | `/doctors/{user_id}/approve` | admin | Approve a pending doctor account. |
| POST | `/doctors/availability-slots` | doctor | Publish a bookable slot. |
| GET | `/doctors/{doctor_id}/availability-slots` | public | List a doctor's open slots. |
| DELETE | `/doctors/availability-slots/{slot_id}` | doctor (owner) | Remove an unbooked slot. |

## Pharmacies — `/pharmacies`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/pharmacies` | public | Paginated list of **approved** pharmacies. |
| GET | `/pharmacies/me` | pharmacy | Own profile. |
| PUT | `/pharmacies/me` | pharmacy | Update own profile. |
| POST | `/pharmacies/{user_id}/approve` | admin | Approve a pending pharmacy account. |

## Medicines — `/medicines`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/medicines` | any authenticated | Search/browse across all pharmacies (name/category filters). |
| POST | `/medicines` | pharmacy | Add an inventory item. `price` must be `> 0`, `stock_quantity` must be `>= 0`. |
| GET | `/medicines/{medicine_id}` | any authenticated | Medicine detail. |
| PUT | `/medicines/{medicine_id}` | pharmacy (owner) | Update price/stock/etc. |

## Prescriptions — `/prescriptions`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/prescriptions` | patient | Upload a prescription (document URL). |
| GET | `/prescriptions/me` | patient | Own prescriptions, including doctor-issued e-prescriptions. |

## Orders — `/orders`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/orders` | patient | Place an order (single pharmacy per order; rejected if any item requires a prescription the patient hasn't supplied). |
| GET | `/orders/me` | patient | Own order history. |
| GET | `/orders/pharmacy/me` | pharmacy | Orders placed with the caller's pharmacy. |
| GET | `/orders/{order_id}` | participant | Order detail. |
| PATCH | `/orders/{order_id}/status` | pharmacy (owner) | Advance status along the allowed transition graph (`pending → paid → preparing → out_for_delivery/ready_for_pickup → completed`, or `cancelled`). |

## Appointments — `/appointments`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/appointments` | patient | Book an open slot (chat or video mode). |
| GET | `/appointments/me` | patient | Own appointments. |
| GET | `/appointments/doctor/me` | doctor | Own appointments. |
| GET | `/appointments/{appointment_id}` | participant | Appointment detail. |
| PATCH | `/appointments/{appointment_id}/status` | doctor (owner) | `confirmed` (optionally with a `meeting_url` for video) / `completed` / `rejected`; patient may `cancel` while `pending`. |
| POST | `/appointments/{appointment_id}/messages` | participant | Send a chat message (only once `confirmed`). `body` must be non-empty. |
| GET | `/appointments/{appointment_id}/messages` | participant | List chat thread. |
| POST | `/appointments/{appointment_id}/prescription` | doctor (owner) | Issue an e-prescription tied to the appointment. |

## Payments — `/payments`
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/payments` | patient (order owner) | Pay a `pending` order via the mock payment provider (supports a `simulate_failure` flag for demoing the failure path). Advances the order to `paid`. |
| GET | `/payments/order/{order_id}` | participant | Payment history for an order. |

## Notifications — `/notifications`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/notifications/me` | any authenticated | Own notifications (booking confirmations, payment receipts, order status updates, reminders — patients are currently the only recipients since every trigger targets them). |
| POST | `/notifications/send-appointment-reminders` | admin | Trigger the mock reminder job for upcoming confirmed appointments. |

## Admin — `/admin`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/admin/users` | admin | List/filter all users. |
| GET | `/admin/users/{user_id}` | admin | User detail. |
| PATCH | `/admin/users/{user_id}/status` | admin | Activate/deactivate a user (cannot deactivate self). |
| GET | `/admin/pending-approvals` | admin | Doctors/pharmacies awaiting approval. |
| GET | `/admin/orders` | admin | All orders (monitoring). |
| GET | `/admin/appointments` | admin | All appointments (monitoring). |
| GET | `/admin/reports/summary` | admin | Dashboard counters (users by role, pending approvals, orders by status, revenue, appointments by status). |

## Health — `/health`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness probe used by the deployment guide's smoke test and by orchestrators (Docker/Kubernetes) to gate traffic. |

## Errors
Every error is a JSON body `{"detail": ...}`. Validation errors (`422`) follow FastAPI's
standard Pydantic error-array shape. Unhandled server errors are caught by a global
exception handler (`app/main.py`) and always return a sanitized `500
{"detail": "Internal server error"}` — the real traceback is logged server-side only,
never leaked to the client.
