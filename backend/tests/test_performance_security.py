import asyncio

from starlette.requests import Request

from app.main import unhandled_exception_handler


def test_security_headers_present(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"


def test_request_id_header_present(client):
    response = client.get("/health")
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) == 12


def test_unhandled_exception_handler_sanitizes_response():
    scope = {"type": "http", "method": "GET", "path": "/boom", "headers": []}
    request = Request(scope)
    exc = RuntimeError("some sensitive internal detail that must not leak to clients")

    response = asyncio.run(unhandled_exception_handler(request, exc))

    assert response.status_code == 500
    body = response.body.decode()
    assert body == '{"detail":"Internal server error"}'
    assert "sensitive internal detail" not in body
