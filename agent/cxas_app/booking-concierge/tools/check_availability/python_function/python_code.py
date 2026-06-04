"""Check availability for a property + dates; return room, nights, total.

Self-contained: CES executes each tool in isolation and `cxas push` does not
bundle shared sibling modules under tools/, so the room data and helpers are
embedded here. Room data mirrors frontend/src/data/properties.ts.
"""
from __future__ import annotations

from typing import Any

# property id -> ordered rooms (lead room first). Mirrors the frontend.
_ROOMS: dict[str, list[dict[str, Any]]] = {
    "enchantment-resort": [
        {"id": "canyon-view-suite", "name": "Canyon View Suite", "price": 339},
        {"id": "casita-king", "name": "Casita King", "price": 299},
        {"id": "junior-suite", "name": "Junior Suite", "price": 389},
    ],
    "lauberge-sedona": [
        {"id": "creekside-vista-cottage", "name": "Creekside Vista Cottage", "price": 465},
        {"id": "luxury-cottage", "name": "Luxury Cottage", "price": 429},
        {"id": "vista-king-suite", "name": "Vista King Suite", "price": 399},
    ],
    "mii-amo": [
        {"id": "canyon-suite-ai", "name": "Canyon Suite, All-Inclusive", "price": 325},
        {"id": "spa-suite-ai", "name": "Spa Suite, All-Inclusive", "price": 395},
    ],
    "amara-resort": [
        {"id": "amara-king", "name": "Resort King", "price": 275},
    ],
    "ambiente-hotel": [
        {"id": "ambiente-atrium", "name": "Landscape Atrium", "price": 520},
    ],
    "sedona-rouge": [
        {"id": "rouge-king", "name": "Deluxe King", "price": 189},
    ],
}


def _nights_between(check_in: str, check_out: str) -> int:
    """Whole nights between two YYYY-MM-DD dates; defaults to 3 if unparseable."""
    from datetime import date
    try:
        y1, m1, d1 = (int(x) for x in check_in.split("-"))
        y2, m2, d2 = (int(x) for x in check_out.split("-"))
        delta = (date(y2, m2, d2) - date(y1, m1, d1)).days
        return delta if delta > 0 else 3
    except Exception:
        return 3


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
    rooms = _ROOMS.get(property_id)
    if not rooms:
        return {
            "success": False,
            "error": "unknown_property",
            "property_id": property_id,
            "agent_action": "Inform the guest the selected property could not be found and offer to search again.",
        }
    room = next((r for r in rooms if r["id"] == room_id), rooms[0])
    nights = _nights_between(check_in, check_out)
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
