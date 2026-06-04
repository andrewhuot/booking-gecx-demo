"""Backend configuration, loaded from the environment via python-dotenv.

All settings have sensible defaults baked in for the demo project so the API
and scripts run even when ``.env`` is absent. Live-mode wiring reads
``CXAS_APP_NAME`` / ``CXAS_AGENT_ID`` once ``scripts/create_agent.py`` has
provisioned the agent (and billing is enabled).
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


@dataclass(frozen=True)
class Settings:
    """Immutable, fully-typed view of the backend configuration."""

    gcp_project_id: str
    gcp_project_number: str
    gcp_location: str
    cxas_app_name: str
    cxas_agent_id: str
    demo_mode: str

    @property
    def app_parent(self) -> str:
        """The CXAS parent resource path for the configured project/location."""
        return f"projects/{self.gcp_project_id}/locations/{self.gcp_location}"

    @property
    def is_live(self) -> bool:
        """True when the demo is configured to attempt real CXAS calls."""
        return self.demo_mode.lower() == "live"


def load_settings() -> Settings:
    """Build a :class:`Settings` instance from the current environment."""
    return Settings(
        gcp_project_id=_env("GCP_PROJECT_ID", "decent-courage-233916"),
        gcp_project_number=_env("GCP_PROJECT_NUMBER", "1078946815141"),
        # CES/CXAS region is ``us`` (``global`` returns 404 for this API).
        gcp_location=_env("GCP_LOCATION", "us"),
        cxas_app_name=_env("CXAS_APP_NAME", ""),
        cxas_agent_id=_env("CXAS_AGENT_ID", ""),
        demo_mode=_env("DEMO_MODE", "scripted"),
    )


# Module-level singleton for convenient import: ``from backend.config import settings``.
settings: Settings = load_settings()
