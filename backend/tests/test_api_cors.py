from __future__ import annotations

from fastapi.testclient import TestClient

from backend.api import app


def test_cors_allows_127_frontend_fallback_port() -> None:
    client = TestClient(app)

    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://127.0.0.1:3001",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3001"


def test_cors_allows_unique_local_demo_port_for_chat_preflight() -> None:
    client = TestClient(app)

    response = client.options(
        "/api/chat",
        headers={
            "Origin": "http://127.0.0.1:3010",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3010"
