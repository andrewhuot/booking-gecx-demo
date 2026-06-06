"""Backend configuration, loaded from the environment via python-dotenv.

All settings have sensible defaults baked in for the demo project so the API
and scripts run even when ``.env`` is absent. Live-mode wiring reads
``CXAS_APP_NAME`` once ``scripts/create_agent.py`` has provisioned the agent
(the CES API is enabled and ADC credentials are required).
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# Load the repo-root ``.env`` if present. ``override=False`` so real shell
# environment variables win over the file (handy in CI / containers).
load_dotenv(override=False)


def _env(key: str, default: str) -> str:
    """Return a stripped env var, falling back to ``default`` when unset/empty."""
    value = os.getenv(key)
    if value is None:
        return default
    value = value.strip()
    return value if value else default


def _env_float(key: str, default: float) -> float:
    """Return an env var parsed as float, falling back on unset/empty/invalid."""
    raw = _env(key, "")
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    """Immutable, fully-typed view of the backend configuration.

    Every value comes from the environment / ``.env`` so the demo can target any
    GCP project without code edits (see README "Point this at your own GCP
    project"). Defaults are deliberately empty for project-specific fields:
    scripted mode needs no GCP at all, and live mode fails with a clear message
    if these are unset rather than silently targeting someone else's project.
    """

    gcp_project_id: str
    gcp_project_number: str
    gcp_location: str
    cxas_app_name: str
    cxas_agent_id: str
    demo_mode: str
    # Client-side pacing for the CES per-minute "RunSession LLM tokens" quota.
    cxas_requests_per_minute: float
    # Provisioning knobs (used by scripts/create_agent.py; safe defaults).
    cxas_app_display_name: str
    cxas_app_id: str
    cxas_model: str

    @property
    def is_live(self) -> bool:
        """True when the demo is configured to attempt real CXAS calls."""
        return self.demo_mode.lower() == "live"


def load_settings() -> Settings:
    """Build a :class:`Settings` instance from the current environment."""
    return Settings(
        gcp_project_id=_env("GCP_PROJECT_ID", ""),
        gcp_project_number=_env("GCP_PROJECT_NUMBER", ""),
        # CES/CXAS region is ``us`` (``global`` returns 404 for this API).
        gcp_location=_env("GCP_LOCATION", "us"),
        cxas_app_name=_env("CXAS_APP_NAME", ""),
        cxas_agent_id=_env("CXAS_AGENT_ID", ""),
        demo_mode=_env("DEMO_MODE", "scripted"),
        cxas_requests_per_minute=_env_float("CXAS_REQUESTS_PER_MINUTE", 30.0),
        cxas_app_display_name=_env("CXAS_APP_DISPLAY_NAME", "Booking.com Concierge Demo"),
        cxas_app_id=_env("CXAS_APP_ID", "booking-concierge"),
        cxas_model=_env("CXAS_MODEL", "gemini-2.5-flash"),
    )


# Module-level singleton for convenient import: ``from backend.config import settings``.
settings: Settings = load_settings()
