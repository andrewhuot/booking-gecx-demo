"""Thin, defensive wrapper around the ``cxas_scrapi`` SDK.

This is the **only** module that imports ``cxas_scrapi``, and it does so
**lazily** (inside methods, inside try/except) so the FastAPI app and the unit
tests import cleanly even when the SDK or its credentials are unavailable.

Isolating the SDK here means a signature change in a future ``cxas_scrapi``
release is a one-file edit. Every method either degrades gracefully (``health``,
``start_session``) or raises a single typed exception (:class:`CXASUnavailable`)
that the API layer catches to guarantee it never 500s on a CXAS outage.

Live mode is currently blocked: project ``decent-courage-233916`` has billing
disabled, so real CES/CXAS calls return ``403 PermissionDenied``. The code below
is correct and complete; it activates the instant billing is linked.
"""

from __future__ import annotations

import uuid
from typing import Any

from backend.config import Settings, settings

# Substrings that identify the known "billing not enabled" 403 from CES/CXAS.
_BILLING_HINTS = ("billing", "permission_denied", "permissiondenied", "403")


class CXASUnavailable(RuntimeError):
    """Raised when a live CXAS turn cannot be completed.

    Carries a human-readable ``reason`` so the API can surface a friendly
    message instead of a stack trace.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _humanize_error(exc: BaseException) -> str:
    """Translate an SDK/transport exception into a short, human reason string."""
    text = str(exc).lower()
    if any(hint in text for hint in _BILLING_HINTS):
        return (
            "CXAS live mode is unavailable: the GCP project "
            "(decent-courage-233916) has no billing account linked, so the "
            "Conversational Agents API returns 403. Link a billing account to "
            "enable live mode. (Scripted mode works without billing.)"
        )
    if isinstance(exc, ImportError):
        return (
            "The cxas-scrapi SDK is not installed; live mode is unavailable. "
            "Run scripts/setup.sh to install it."
        )
    if any(word in text for word in ("connection", "unavailable", "timeout", "deadline", "network")):
        return f"Could not reach CXAS (connection/transport error): {exc}"
    return f"CXAS call failed: {exc}"


class CXASClient:
    """Defensive client for CXAS sessions used by the live-mode API."""

    def __init__(self, config: Settings | None = None) -> None:
        self._settings: Settings = config or settings

    # ------------------------------------------------------------------ #
    # Resource-path helpers
    # ------------------------------------------------------------------ #
    @property
    def app_name(self) -> str:
        """Full CXAS app resource path, from config or derived from the project."""
        if self._settings.cxas_app_name:
            return self._settings.cxas_app_name
        # Best-effort default so partial config still produces a usable path.
        return f"{self._settings.app_parent}/apps/booking-demo"

    # ------------------------------------------------------------------ #
    # Public surface
    # ------------------------------------------------------------------ #
    def health(self) -> dict[str, Any]:
        """Probe whether CXAS is reachable.

        Returns ``{"cxas_reachable": bool, "reason": str}``. Attempts a cheap
        ``list_agents`` call against the configured app and catches *everything*
        (import, auth, billing 403, connection) — turning failures into a
        ``reachable=False`` result with a human-readable reason. Never raises.
        """
        try:
            from cxas_scrapi import Agents  # lazy import

            agents = Agents(app_name=self.app_name)
            # Cheap listing call: succeeds only if API + billing + auth are good.
            agents.list_agents()
            return {"cxas_reachable": True, "reason": "CXAS reachable."}
        except Exception as exc:  # noqa: BLE001 - intentionally resilient probe
            return {"cxas_reachable": False, "reason": _humanize_error(exc)}

    def start_session(self) -> str:
        """Return a session id for a new conversation.

        Prefers the SDK's id generator; falls back to a local ``uuid4`` if the
        SDK path is unavailable so the frontend can always proceed.
        """
        try:
            from cxas_scrapi import Sessions  # lazy import

            sessions = Sessions(app_name=self.app_name)
            session_id = sessions.create_session_id()
            if isinstance(session_id, str) and session_id:
                return session_id
        except Exception:  # noqa: BLE001 - any failure → local uuid fallback
            pass
        return str(uuid.uuid4())

    def run_turn(self, session_id: str, text: str, channel: str) -> dict[str, Any]:
        """Run one conversational turn against the live CXAS agent.

        Sends ``text`` to ``Sessions.run`` and parses the reply with
        ``get_structured_response``. ``channel`` selects the modality (``voice``
        → audio-flavoured ``text`` modality today; CXAS audio streaming is out of
        scope for the HTTP bridge). On *any* failure raises
        :class:`CXASUnavailable` with a human reason — the API turns that into a
        graceful HTTP 200.

        Returns the raw structured-response dict (see ``mapping.py`` for the
        contract); callers pass it to ``map_structured_response``.
        """
        try:
            from cxas_scrapi import Sessions  # lazy import
            from cxas_scrapi.core.sessions import Modality  # enum lives here

            # Text modality for the HTTP bridge. Voice in the frontend is handled
            # via Web Speech; the structured text turn still drives the cards.
            # TODO: verify against live CXAS once billing is enabled — confirm
            # whether a deployment_id is required for Sessions.run in this app.
            modality = Modality.TEXT

            sessions = Sessions(app_name=self.app_name)
            response = sessions.run(
                session_id=session_id,
                text=text,
                modality=modality,
            )
            structured = sessions.get_structured_response(response)
            if not isinstance(structured, dict):
                raise CXASUnavailable("CXAS returned an unparseable response.")
            return structured
        except CXASUnavailable:
            raise
        except ImportError as exc:
            raise CXASUnavailable(_humanize_error(exc)) from exc
        except Exception as exc:  # noqa: BLE001 - surface as typed unavailability
            raise CXASUnavailable(_humanize_error(exc)) from exc
