"""FastAPI app bridging the frontend to the live CXAS agent.

Run with::

    uvicorn backend.api:app --port 8000

Endpoints:
  * ``POST /api/session``  → ``{session_id}``
  * ``POST /api/chat``     → ``{agent_response, cards, site_action, session_id}``
  * ``GET  /api/health``   → ``{cxas_reachable, reason, mode}``

Resilience guarantee: the API **never returns 500 on a CXAS outage**. When the
live agent is unavailable (e.g. a rate-limit/quota 429, or the agent isn't
provisioned), ``/api/chat`` returns HTTP 200 with a friendly ``agent_response``
and empty cards, so the frontend can fall back to scripted mode without error
handling on the wire.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.cxas_client import CXASClient, CXASUnavailable
from backend.mapping import map_structured_response

app = FastAPI(
    title="Booking.com GECX Demo — CXAS Bridge",
    description="Live-mode backend bridging the frontend to a CXAS agent.",
    version="1.0.0",
)

# Permissive CORS for the local Vite/CRA dev servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single shared client (stateless wrapper around the SDK).
_client = CXASClient()


# --------------------------------------------------------------------------- #
# Request / response models
# --------------------------------------------------------------------------- #
class SessionResponse(BaseModel):
    """Response for ``POST /api/session``."""

    session_id: str


class ChatRequest(BaseModel):
    """Request body for ``POST /api/chat``."""

    session_id: str
    message: str
    channel: Literal["chat", "voice", "mobile", "none"] = "chat"


class ChatResponse(BaseModel):
    """Response for ``POST /api/chat`` — mirrors the frontend's expected shape."""

    agent_response: str
    cards: list[dict[str, Any]] = Field(default_factory=list)
    site_action: dict[str, Any] | None = None
    session_id: str


class HealthResponse(BaseModel):
    """Response for ``GET /api/health``."""

    cxas_reachable: bool
    reason: str
    mode: str


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.post("/api/session", response_model=SessionResponse)
def create_session() -> SessionResponse:
    """Start a new conversation session.

    Always returns a usable id: the SDK's session id when available, otherwise a
    locally generated uuid (so the frontend can proceed even if CXAS is down).
    """
    session_id = _client.start_session()
    return SessionResponse(session_id=session_id)


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """Run one conversational turn and map the reply to the frontend shape.

    On :class:`CXASUnavailable` (rate-limit/permission/connection/import),
    returns HTTP 200 with a friendly explanation and empty cards — never a 500.
    """
    try:
        structured = _client.run_turn(
            session_id=request.session_id,
            text=request.message,
            channel=request.channel,
        )
        mapped = map_structured_response(structured)
        return ChatResponse(
            agent_response=mapped["agent_response"],
            cards=mapped["cards"],
            site_action=mapped["site_action"],
            session_id=request.session_id,
        )
    except CXASUnavailable as exc:
        # Graceful degradation: surface the reason (rate-limit, not provisioned, etc.).
        return ChatResponse(
            agent_response=(
                "Live mode isn't available right now. " + exc.reason + " "
                "You can continue with the scripted demo in the meantime."
            ),
            cards=[],
            site_action=None,
            session_id=request.session_id,
        )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Report CXAS reachability plus the configured demo mode."""
    status = _client.health()
    return HealthResponse(
        cxas_reachable=bool(status["cxas_reachable"]),
        reason=str(status["reason"]),
        mode=settings.demo_mode,
    )
