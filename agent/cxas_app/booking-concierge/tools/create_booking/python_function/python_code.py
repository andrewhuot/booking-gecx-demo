"""Create a booking and return a confirmation card payload.

Self-contained: CES executes each tool in isolation and `cxas push` does not
bundle shared sibling modules under tools/, so the room data and helpers are
embedded here. Room data mirrors frontend/src/data/properties.ts.
"""
from __future__ import annotations

import hashlib
from typing import Any

# property id -> (display name, ordered rooms). Mirrors the frontend.
_PROPERTY_NAMES: dict[str, str] = {
    "enchantment-resort": "Enchantment Resort",
    "lauberge-sedona": "L'Auberge de Sedona",
    "mii-amo": "Mii amo",
    "amara-resort": "Amara Resort & Spa",
    "ambiente-hotel": "Ambiente, A Landscape Hotel",
    "sedona-rouge": "Sedona Rouge Hotel & Spa",
}

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

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _fmt_price(value: float) -> str:
    """Format a number as a display price string, e.g. 1017 -> '$1,017'."""
    n = float(value)
    return f"${int(n):,}" if n.is_integer() else f"${n:,.2f}"


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


def _confirmation_number(*parts: str) -> str:
    """Deterministic confirmation code from inputs, e.g. 'BK-7824091'."""
    seed = "|".join(str(p) for p in parts)
    digits = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % 10_000_000
    return f"BK-{digits:07d}"


def _fmt_dates(check_in: str, check_out: str) -> str:
    """Render 'Oct 16 - Oct 19, 2025' from two YYYY-MM-DD strings (best effort)."""
    try:
        y1, m1, d1 = (int(x) for x in check_in.split("-"))
        _, m2, d2 = (int(x) for x in check_out.split("-"))
        return f"{_MONTHS[m1-1]} {d1} - {_MONTHS[m2-1]} {d2}, {y1}"
    except Exception:
        return f"{check_in} - {check_out}".strip(" -")


def create_booking(
    property_id: str,
    room_id: str = "",
    check_in: str = "",
    check_out: str = "",
    guest_name: str = "",
    payment_method: str = "card on file",
) -> dict[str, Any]:
    """Book the stay and return a confirmation card payload.

    Args:
      property_id: The property id.
      room_id: The room id (defaults to the property's lead room).
      check_in: Check-in date (YYYY-MM-DD).
      check_out: Check-out date (YYYY-MM-DD).
      guest_name: Name on the reservation.
      payment_method: Reference to the method on file (never full card details).

    Returns:
      Dict with confirmation_number, success, and a payload that renders a
      confirmation card and navigates to the confirmation page.
    """
    rooms = _ROOMS.get(property_id)
    if not rooms:
        return {
            "success": False,
            "error": "unknown_property",
            "property_id": property_id,
            "agent_action": "Inform the guest the selected property could not be found and offer to search for alternatives.",
        }
    room = next((r for r in rooms if r["id"] == room_id), rooms[0])
    nights = _nights_between(check_in, check_out)
    total = room["price"] * nights
    conf = _confirmation_number(property_id, room["id"], check_in, check_out, guest_name)
    dates = _fmt_dates(check_in, check_out)
    name = _PROPERTY_NAMES.get(property_id, property_id)
    card = {
        "type": "confirmation",
        "confirmationNumber": conf,
        "property": name,
        "dates": dates,
        "room": room["name"],
        "nights": nights,
        "total": _fmt_price(total),
        "status": "Confirmed",
    }
    return {
        "confirmation_number": conf,
        "property": name,
        "room": room["name"],
        "nights": nights,
        "total": total,
        "success": True,
        "payload": {"action": "create_booking", "card": card},
    }
