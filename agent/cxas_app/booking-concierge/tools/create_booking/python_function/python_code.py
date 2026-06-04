"""Create a booking and return a confirmation card payload."""
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

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


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
    prop = data.BY_ID.get(property_id)
    if not prop:
        return {"success": False, "error": "unknown_property", "property_id": property_id}
    rooms = prop["rooms"]
    room = next((r for r in rooms if r["id"] == room_id), rooms[0])
    nights = data.nights_between(check_in, check_out)
    total = room["price"] * nights
    conf = data.confirmation_number(property_id, room["id"], check_in, check_out, guest_name)
    dates = _fmt_dates(check_in, check_out)
    card = {
        "type": "confirmation",
        "confirmationNumber": conf,
        "property": prop["name"],
        "dates": dates,
        "room": room["name"],
        "nights": nights,
        "total": data.fmt_price(total),
        "status": "Confirmed",
    }
    return {
        "confirmation_number": conf,
        "property": prop["name"],
        "room": room["name"],
        "nights": nights,
        "total": total,
        "success": True,
        "payload": {"action": "create_booking", "card": card},
    }
