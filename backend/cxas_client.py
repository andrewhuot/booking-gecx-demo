"""Thin, defensive wrapper around the ``cxas_scrapi`` SDK.

This is the **only** module that imports ``cxas_scrapi``, and it does so
**lazily** (inside methods, inside try/except) so the FastAPI app and the unit
tests import cleanly even when the SDK or its credentials are unavailable.

Isolating the SDK here means a signature change in a future ``cxas_scrapi``
release is a one-file edit. Every method either degrades gracefully (``health``,
``start_session``) or raises a single typed exception (:class:`CXASUnavailable`)
that the API layer catches to guarantee it never 500s on a CXAS outage.

Live mode targets whatever GCP project ``.env`` configures (``GCP_PROJECT_ID`` /
``CXAS_APP_NAME`` — see the README). Given that project has the CES API
(``ces.googleapis.com``) enabled and ADC credentials work, real CXAS calls
succeed once the agent is provisioned (``scripts/create_agent.py`` →
``CXAS_APP_NAME`` in ``.env``). The main practical limit is the project's
``RunSession LLM tokens`` quota (1000/min/region by default); this client paces
requests with a :class:`RateLimiter` and retries transient ``429`` rate-limit
errors with backoff before surfacing a friendly :class:`CXASUnavailable`.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from backend.config import Settings, settings

# Substrings identifying a CES rate-limit / quota exhaustion (HTTP 429).
_RATE_LIMIT_HINTS = ("429", "resource has been exhausted", "resource_exhausted", "quota")
# Substrings identifying a permission / not-provisioned failure from CES.
_PERMISSION_HINTS = ("permission_denied", "permissiondenied", "403", "not found", "404")

# Retry policy for transient 429s. The project's "RunSession LLM tokens" quota is
# per-minute, so backoff steps climb toward a minute for the final attempt.
_RETRY_BACKOFFS_SECONDS = (5.0, 20.0, 45.0)


class CXASUnavailable(RuntimeError):
    """Raised when a live CXAS turn cannot be completed.

    Carries a human-readable ``reason`` so the API can surface a friendly
    message instead of a stack trace.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _is_rate_limit(exc: BaseException) -> bool:
    """True when the exception looks like a CES 429 / quota exhaustion."""
    return any(hint in str(exc).lower() for hint in _RATE_LIMIT_HINTS)


def _humanize_error(exc: BaseException) -> str:
    """Translate an SDK/transport exception into a short, human reason string."""
    text = str(exc).lower()
    if _is_rate_limit(exc):
        return (
            "CXAS is rate-limited right now: the project's per-minute "
            "'RunSession LLM tokens' quota was exhausted (HTTP 429). Wait a "
            "moment and try again, or request a quota increase for "
            "ces.googleapis.com in the GCP console."
        )
    if any(hint in text for hint in _PERMISSION_HINTS):
        return (
            "CXAS returned a permission/not-found error. Ensure the agent is "
            "provisioned (run scripts/create_agent.py) and CXAS_APP_NAME points "
            "to the deployed app, with ADC credentials available."
        )
    if isinstance(exc, ImportError):
        return (
            "The cxas-scrapi SDK is not installed; live mode is unavailable. "
            "Run scripts/setup.sh to install it."
        )
    if any(word in text for word in ("connection", "unavailable", "timeout", "deadline", "network")):
        return f"Could not reach CXAS (connection/transport error): {exc}"
    return f"CXAS call failed: {exc}"


def _dedupe_agent_text(text: str) -> str:
    """Collapse the doubled agent text CES/get_structured_response can return.

    ``ParsedSessionResponse`` joins ``agent_texts`` with a space, and CES often
    reports the final reply twice (a streamed chunk + the final output), yielding
    ``"X X"``. If the text is exactly two identical halves split on a single
    space boundary, return one half. Otherwise return the text unchanged.
    """
    if not text:
        return text
    stripped = text.strip()
    # Try splitting into two equal halves around the midpoint separator space.
    mid = len(stripped) // 2
    if len(stripped) % 2 == 1 and stripped[mid] == " ":
        first, second = stripped[:mid], stripped[mid + 1:]
        if first == second and first:
            return first
    return text


class CXASClient:
    """Defensive client for CXAS sessions used by the live-mode API."""

    def __init__(self, config: Settings | None = None) -> None:
        self._settings: Settings = config or settings
        # Built lazily on first use so importing this module never needs the SDK.
        self._rate_limiter: Any | None = None

    def _get_rate_limiter(self) -> Any | None:
        """Return a shared RateLimiter sized to the CES per-minute token quota.

        The binding quota is ``RunSession LLM tokens`` (1000/min by default), and
        the concierge prompt is large, so we pace conservatively at ~6 req/min.
        Returns ``None`` if the SDK's RateLimiter is unavailable (paces nothing).
        """
        if self._rate_limiter is None:
            try:
                from cxas_scrapi.utils.rate_limiter import RateLimiter

                self._rate_limiter = RateLimiter(
                    requests_per_minute=float(self._settings.cxas_requests_per_minute)
                )
            except Exception:  # noqa: BLE001 - pacing is best-effort
                self._rate_limiter = None
        return self._rate_limiter

    # ------------------------------------------------------------------ #
    # Resource-path helpers
    # ------------------------------------------------------------------ #
    @property
    def app_name(self) -> str:
        """Full CXAS app resource path from ``CXAS_APP_NAME``.

        Raises :class:`CXASUnavailable` (with a clear, actionable message) when it
        is unset, rather than fabricating a path that would target the wrong or a
        nonexistent project. Set it by running ``scripts/create_agent.py``, which
        provisions the agent and writes ``CXAS_APP_NAME`` back into ``.env``.
        """
        if self._settings.cxas_app_name:
            return self._settings.cxas_app_name
        raise CXASUnavailable(
            "CXAS_APP_NAME is not set. Provision the agent for your project with "
            "`python scripts/create_agent.py` (it writes CXAS_APP_NAME into .env), "
            "or set CXAS_APP_NAME to an existing app resource path."
        )

    # ------------------------------------------------------------------ #
    # Public surface
    # ------------------------------------------------------------------ #
    def health(self) -> dict[str, Any]:
        """Probe whether CXAS is reachable.

        Returns ``{"cxas_reachable": bool, "reason": str}``. Attempts a cheap
        ``list_agents`` call against the configured app and catches *everything*
        (unset config, import, auth/permission, rate-limit, connection) — turning
        failures into a ``reachable=False`` result with a human-readable reason.
        Never raises.
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
        ``get_structured_response``. The HTTP bridge is **text-only**: ``modality``
        is always :attr:`Modality.TEXT` regardless of ``channel`` (voice replies
        are spoken client-side via Web Speech; CXAS audio uses a separate bidi
        path that is out of scope). ``channel`` is accepted for API symmetry but
        unused here.

        Transient ``429`` rate-limit errors (the per-minute LLM-token quota) are
        retried with backoff. On *any* terminal failure raises
        :class:`CXASUnavailable` with a human reason — the API turns that into a
        graceful HTTP 200.

        Returns the raw structured-response dict (see ``mapping.py`` for the
        contract); callers pass it to ``map_structured_response``.
        """
        try:
            from cxas_scrapi import Sessions  # lazy import
            from cxas_scrapi.core.sessions import Modality  # enum lives here
        except ImportError as exc:
            raise CXASUnavailable(_humanize_error(exc)) from exc

        try:
            sessions = Sessions(
                app_name=self.app_name,
                rate_limiter=self._get_rate_limiter(),
            )
        except TypeError:
            # Older SDKs without a rate_limiter kwarg: construct without it.
            sessions = Sessions(app_name=self.app_name)
        except CXASUnavailable:
            # e.g. CXAS_APP_NAME unset — surface its clear message verbatim.
            raise
        except Exception as exc:  # noqa: BLE001
            raise CXASUnavailable(_humanize_error(exc)) from exc

        last_exc: BaseException | None = None
        # One initial attempt + one retry per backoff step.
        for attempt in range(len(_RETRY_BACKOFFS_SECONDS) + 1):
            try:
                response = sessions.run(
                    session_id=session_id,
                    text=text,
                    modality=Modality.TEXT,
                )
                structured = sessions.get_structured_response(response)
                if not isinstance(structured, dict):
                    raise CXASUnavailable("CXAS returned an unparseable response.")
                # Collapse the doubled agent text CES tends to return.
                if "agent_text" in structured:
                    structured["agent_text"] = _dedupe_agent_text(
                        str(structured.get("agent_text") or "")
                    )
                return structured
            except CXASUnavailable:
                raise
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                # Only retry transient rate-limit errors; fail fast otherwise.
                if _is_rate_limit(exc) and attempt < len(_RETRY_BACKOFFS_SECONDS):
                    time.sleep(_RETRY_BACKOFFS_SECONDS[attempt])
                    continue
                raise CXASUnavailable(_humanize_error(exc)) from exc

        # Exhausted retries (all rate-limited).
        raise CXASUnavailable(_humanize_error(last_exc or RuntimeError("CXAS unavailable")))
