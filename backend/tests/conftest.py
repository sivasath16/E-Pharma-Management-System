import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Doctor, Medicine, Order, OrderItem, Patient, Pharmacy, Prescription, User  # noqa: F401

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture()
def client():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def register_user(client, email, password, role, **extra):
    payload = {"email": email, "password": password, "role": role, **extra}
    return client.post("/api/v1/auth/register", json=payload)


def login_user(client, email, password):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    return response


def token_for(client, email, password, role, **extra):
    register_user(client, email, password, role, **extra)
    return login_user(client, email, password).json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def user_id_from_token(token):
    from app.core.security import decode_access_token

    payload = decode_access_token(token)
    return int(payload["sub"])


def approved_pharmacy_token(client, email="pharm@example.com", password="secret123", store_name="City Pharmacy"):
    """Register a pharmacy, register+login an admin, approve the pharmacy, return the pharmacy's token."""
    pharm_token = token_for(client, email, password, "pharmacy", store_name=store_name)
    admin_token = token_for(client, f"admin-{email}", "adminpass1", "admin")
    pharmacy_user_id = user_id_from_token(pharm_token)
    client.post(f"/api/v1/pharmacies/{pharmacy_user_id}/approve", headers=auth_header(admin_token))
    return pharm_token
