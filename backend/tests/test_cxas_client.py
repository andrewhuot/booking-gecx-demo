"""Unit tests for backend.cxas_client pure helpers (no network, no SDK calls).

Run: backend/.venv/bin/python -m pytest backend/tests/test_cxas_client.py -q

These cover the rate-limit detection, the friendly error messaging, and the
agent-text de-duplication that the live bridge applies to CES responses.
"""
from __future__ import annotations

import sys
from types import ModuleType, SimpleNamespace

from backend.config import Settings
from backend.cxas_client import CXASClient
from backend.cxas_client import (
    _dedupe_agent_text,
    _humanize_error,
    _is_rate_limit,
)


def _settings(**overrides):
    """Build a Settings object with project fields filled for client tests."""
    values = {
        "gcp_project_id": "demo-project",
        "gcp_project_number": "42",
        "gcp_location": "us",
        "cxas_app_name": "projects/42/locations/us/apps/app-1",
        "cxas_agent_id": "",
        "cxas_deployment_id": "live-demo",
        "demo_mode": "live",
        "cxas_requests_per_minute": 30.0,
        "cxas_app_display_name": "Booking.com Concierge Demo",
        "cxas_app_id": "booking-concierge",
        "cxas_model": "gemini-2.5-flash",
    }
    values.update(overrides)
    return Settings(**values)


# --------------------------------------------------------------------------- #
# _is_rate_limit
# --------------------------------------------------------------------------- #
def test_is_rate_limit_detects_429_and_quota():
    assert _is_rate_limit(RuntimeError("429 Resource has been exhausted (e.g. check quota).")) is True
    assert _is_rate_limit(RuntimeError("RESOURCE_EXHAUSTED")) is True
    assert _is_rate_limit(RuntimeError("quota exceeded")) is True


def test_is_rate_limit_false_for_other_errors():
    assert _is_rate_limit(RuntimeError("connection refused")) is False
    assert _is_rate_limit(RuntimeError("403 permission denied")) is False


# --------------------------------------------------------------------------- #
# _humanize_error
# --------------------------------------------------------------------------- #
def test_humanize_error_rate_limit_is_friendly_and_mentions_quota():
    msg = _humanize_error(RuntimeError("429 Resource has been exhausted (e.g. check quota)."))
    assert "rate-limited" in msg.lower()
    assert "quota" in msg.lower()
    # Must NOT claim billing is disabled (that was the old, stale message).
    assert "billing" not in msg.lower()


def test_humanize_error_permission_points_at_provisioning():
    msg = _humanize_error(RuntimeError("403 permission denied"))
    assert "provision" in msg.lower() or "cxas_app_name" in msg.lower()
    assert "billing" not in msg.lower()


def test_humanize_error_importerror_mentions_sdk():
    msg = _humanize_error(ImportError("No module named 'cxas_scrapi'"))
    assert "cxas-scrapi" in msg.lower() or "sdk" in msg.lower()


def test_humanize_error_connection_is_passed_through():
    msg = _humanize_error(RuntimeError("connection timeout"))
    assert "connection" in msg.lower() or "transport" in msg.lower()


# --------------------------------------------------------------------------- #
# _dedupe_agent_text
# --------------------------------------------------------------------------- #
def test_dedupe_collapses_exact_doubled_text():
    half = "Absolutely, I can help with that!"
    doubled = f"{half} {half}"
    assert _dedupe_agent_text(doubled) == half


def test_dedupe_leaves_normal_text_untouched():
    normal = "Sedona is a wonderful choice for a relaxing getaway."
    assert _dedupe_agent_text(normal) == normal
    # A sentence that merely repeats a word is not exact-half duplication.
    tricky = "I can help help you book a room."
    assert _dedupe_agent_text(tricky) == tricky


def test_dedupe_handles_empty_and_whitespace():
    assert _dedupe_agent_text("") == ""
    # Two identical multi-word halves.
    assert _dedupe_agent_text("hello world hello world") == "hello world"


def test_dedupe_collapses_doubled_text_with_newline_separator():
    half = "Perfect, New York City. And how many travelers will there be?"
    doubled = f"{half}\n {half}"
    assert _dedupe_agent_text(doubled) == half


def test_start_session_passes_configured_deployment_id(monkeypatch):
    calls = []

    class FakeSessions:
        def __init__(self, **kwargs):
            calls.append(kwargs)

        def create_session_id(self):
            return "session-123"

    fake_cxas = ModuleType("cxas_scrapi")
    fake_cxas.Sessions = FakeSessions
    monkeypatch.setitem(sys.modules, "cxas_scrapi", fake_cxas)

    session_id = CXASClient(config=_settings()).start_session()

    assert session_id == "session-123"
    assert calls == [
        {
            "app_name": "projects/42/locations/us/apps/app-1",
            "deployment_id": "live-demo",
        }
    ]


def test_run_turn_passes_configured_deployment_id(monkeypatch):
    calls = []

    class FakeSessions:
        def __init__(self, **kwargs):
            calls.append({"init": kwargs})

        def run(self, **kwargs):
            calls.append({"run": kwargs})
            return object()

        def get_structured_response(self, response):
            return {"agent_text": "Ready."}

    fake_cxas = ModuleType("cxas_scrapi")
    fake_cxas.Sessions = FakeSessions
    fake_sessions_module = ModuleType("cxas_scrapi.core.sessions")
    fake_sessions_module.Modality = SimpleNamespace(TEXT="text")
    monkeypatch.setitem(sys.modules, "cxas_scrapi", fake_cxas)
    monkeypatch.setitem(sys.modules, "cxas_scrapi.core.sessions", fake_sessions_module)

    result = CXASClient(config=_settings()).run_turn(
        session_id="session-123",
        text="Hello",
        channel="chat",
    )

    assert result == {"agent_text": "Ready."}
    assert calls[0] == {
        "init": {
            "app_name": "projects/42/locations/us/apps/app-1",
            "deployment_id": "live-demo",
            "rate_limiter": None,
        }
    }
    assert calls[1]["run"]["deployment_id"] == "live-demo"
