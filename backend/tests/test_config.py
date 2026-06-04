"""Unit tests for backend.config — env-driven, no network.

Run: backend/.venv/bin/python -m pytest backend/tests/test_config.py -q

Locks the "configurable for any project" contract: project-specific fields
default empty (so a fresh clone never targets someone else's project), and every
value is overridable via the environment.
"""
from __future__ import annotations

import importlib

import backend.config as config_module


def _reload_with_env(monkeypatch, **env: str):
    """Reload backend.config with ONLY the given env vars set.

    Neutralizes a repo-root ``.env`` (which would otherwise repopulate cleared
    vars) by making ``load_dotenv`` a no-op, so this tests the code's behavior
    for a given environment rather than the developer's local ``.env``.
    """
    import dotenv
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *a, **k: False)
    for key in (
        "GCP_PROJECT_ID", "GCP_PROJECT_NUMBER", "GCP_LOCATION",
        "CXAS_APP_NAME", "CXAS_AGENT_ID", "DEMO_MODE",
        "CXAS_REQUESTS_PER_MINUTE", "CXAS_APP_DISPLAY_NAME",
        "CXAS_APP_ID", "CXAS_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    # Reload so module-level load_dotenv()/load_settings() re-run under the patch.
    return importlib.reload(config_module)


def test_defaults_are_project_neutral(monkeypatch):
    """With nothing set, project fields are empty and mode is scripted."""
    mod = _reload_with_env(monkeypatch)
    s = mod.load_settings()
    assert s.gcp_project_id == ""
    assert s.gcp_project_number == ""
    assert s.cxas_app_name == ""
    assert s.demo_mode == "scripted"
    assert s.is_live is False
    # Sensible non-empty provisioning defaults.
    assert s.gcp_location == "us"
    assert s.cxas_app_display_name == "Booking.com Concierge Demo"
    assert s.cxas_app_id == "booking-concierge"
    assert s.cxas_model == "gemini-2.5-flash"
    assert s.cxas_requests_per_minute == 6.0


def test_env_overrides_everything(monkeypatch):
    mod = _reload_with_env(
        monkeypatch,
        GCP_PROJECT_ID="my-proj",
        GCP_PROJECT_NUMBER="42",
        GCP_LOCATION="us",
        CXAS_APP_NAME="projects/42/locations/us/apps/abc",
        DEMO_MODE="live",
        CXAS_REQUESTS_PER_MINUTE="12",
        CXAS_APP_DISPLAY_NAME="My Concierge",
        CXAS_APP_ID="my-concierge",
        CXAS_MODEL="gemini-2.5-pro",
    )
    s = mod.load_settings()
    assert s.gcp_project_id == "my-proj"
    assert s.gcp_project_number == "42"
    assert s.cxas_app_name == "projects/42/locations/us/apps/abc"
    assert s.is_live is True
    assert s.cxas_requests_per_minute == 12.0
    assert s.cxas_app_display_name == "My Concierge"
    assert s.cxas_app_id == "my-concierge"
    assert s.cxas_model == "gemini-2.5-pro"


def test_invalid_requests_per_minute_falls_back(monkeypatch):
    mod = _reload_with_env(monkeypatch, CXAS_REQUESTS_PER_MINUTE="not-a-number")
    assert mod.load_settings().cxas_requests_per_minute == 6.0


def teardown_module(module):  # noqa: D401 - restore the real module state
    """Reload config once more with the ambient env so other tests are unaffected."""
    importlib.reload(config_module)
