"""Check availability for a property + dates; return room, nights, total."""
from __future__ import annotations

import os
import sys
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "_shared"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
try:
    from _shared import data  # type: ignore
except Exception:  # pragma: no cover
    import data  # type: ignore


def check_availability(
    property_id: str,
    check_in: str = "",
    check_out: str = "",
    room_id: str = "",
) -> dict[str, Any]:
    """Return the recommended room, nights, and total for the stay.

    Args:
      property_id: The property id from search_properties.
      check_in: Check-in date (YYYY-MM-DD).
      check_out: Check-out date (YYYY-MM-DD).
      room_id: Optional specific room id; defaults to the property's lead room.

    Returns:
      Dict with room, nightly_rate, nights, total, success, and a payload that
      navigates to the property page and pre-selects the room.
    """
    prop = data.BY_ID.get(property_id)
    if not prop:
        return {"success": False, "error": "unknown_property", "property_id": property_id}
    rooms = prop["rooms"]
    room = next((r for r in rooms if r["id"] == room_id), rooms[0])
    nights = data.nights_between(check_in, check_out)
    total = room["price"] * nights
    return {
        "property_id": property_id,
        "room_id": room["id"],
        "room": room["name"],
        "nightly_rate": room["price"],
        "nights": nights,
        "total": total,
        "success": True,
        "payload": {
            "action": "check_availability",
            "data": {
                "property_id": property_id,
                "room_id": room["id"],
                "room": room["name"],
                "nightly_rate": room["price"],
                "nights": nights,
                "total": total,
            },
        },
    }
