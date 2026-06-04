"""Find the best-fit Sedona property for the traveler's vibe and budget."""
from __future__ import annotations

import os
import sys
from typing import Any

# Make the bundled _shared module importable regardless of CES's sandbox cwd.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "_shared"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
try:
    from _shared import data  # type: ignore
except Exception:  # pragma: no cover - fallback path layout
    import data  # type: ignore


def search_properties(
    vibe: str = "",
    budget_per_night: float = 0,
    party: str = "",
    check_in: str = "",
    check_out: str = "",
    location: str = "Sedona, AZ",
) -> dict[str, Any]:
    """Return the single best-fit property plus a card payload.

    Args:
      vibe: One of spa_wellness, romance_couples, solo_reset, nature_hiking,
        value, unique_design.
      budget_per_night: Upper nightly budget in USD (0 = no limit).
      party: solo, couple, anniversary, family, or group.
      check_in: Desired check-in (YYYY-MM-DD or loose phrase).
      check_out: Desired check-out (YYYY-MM-DD or loose phrase).
      location: Destination (always Sedona, AZ for this demo).

    Returns:
      Dict with match data, success=True, and a payload that renders a property
      card and highlights it in search results.
    """
    try:
        budget = float(budget_per_night or 0)
    except (TypeError, ValueError):
        budget = 0.0
    try:
        prop = data.pick_property(vibe=vibe, budget_per_night=budget)
    except Exception as exc:
        return {"success": False, "error": str(exc),
                "agent_action": "Apologize that the property search is temporarily unavailable and ask the guest to try again in a moment."}
    card = {
        "type": "property",
        "id": prop["id"],
        "name": prop["name"],
        "location": prop["location"],
        "rating": prop["rating"],
        "ratingLabel": prop["rating_label"],
        "reviews": prop["reviews"],
        "price": data.fmt_price(prop["nightly_rate"]),
        "priceUnit": "/night",
        "tags": list(prop["tags"]),
        "cta": "Check Availability",
    }
    return {
        "id": prop["id"],
        "name": prop["name"],
        "nightly_rate": prop["nightly_rate"],
        "why": prop["why"],
        "success": True,
        "payload": {"action": "search_properties", "card": card},
    }
