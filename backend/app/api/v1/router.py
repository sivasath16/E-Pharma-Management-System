from fastapi import APIRouter

from app.api.v1 import (
    admin,
    appointments,
    auth,
    doctors,
    medicines,
    notifications,
    orders,
    patients,
    payments,
    pharmacies,
    prescriptions,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(doctors.router)
api_router.include_router(pharmacies.router)
api_router.include_router(medicines.router)
api_router.include_router(prescriptions.router)
api_router.include_router(orders.router)
api_router.include_router(appointments.router)
api_router.include_router(admin.router)
api_router.include_router(payments.router)
api_router.include_router(notifications.router)
