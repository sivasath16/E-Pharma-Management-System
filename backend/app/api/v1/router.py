from fastapi import APIRouter

from app.api.v1 import auth, doctors, medicines, orders, patients, pharmacies, prescriptions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(doctors.router)
api_router.include_router(pharmacies.router)
api_router.include_router(medicines.router)
api_router.include_router(prescriptions.router)
api_router.include_router(orders.router)
