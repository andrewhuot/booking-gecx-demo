"""Create a booking and return a confirmation card payload.

Self-contained: CES executes each tool in isolation and `cxas push` does not
bundle shared sibling modules under tools/, so the room data and helpers are
embedded here. Room data mirrors frontend/src/data/properties.ts.
"""

import hashlib

# property id -> (display name, ordered rooms). Mirrors the frontend.
_PROPERTY_NAMES = {
    "enchantment-resort": "Enchantment Resort",
    "lauberge-sedona": "L'Auberge de Sedona",
    "mii-amo": "Mii amo",
    "amara-resort": "Amara Resort & Spa",
    "ambiente-hotel": "Ambiente, A Landscape Hotel",
    "sedona-rouge": "Sedona Rouge Hotel & Spa",
}

_ROOMS = {
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


def _canonical_id(property_id: str) -> str:
    """Normalize an LLM-supplied property id (e.g. 'mii_amo' -> 'mii-amo')."""
    norm = (property_id or "").strip().lower().replace("_", "-").replace(" ", "-")
    while "--" in norm:
        norm = norm.replace("--", "-")
    return norm


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


def _july4_itinerary_sections() -> list[dict]:
    """Return the high-fidelity July 4 package details for the confirmation UI."""
    return [
        {
            "title": "Hotel",
            "rows": [
                {"label": "Property", "value": "Summercamp Hotel"},
                {"label": "Stay", "value": "Jul 3 - Jul 6, 2026"},
                {"label": "Guests", "value": "Two guests · 3 nights"},
                {"label": "Hotel total", "value": "$735"},
            ],
        },
        {
            "title": "Flights",
            "rows": [
                {"label": "Airline", "value": "JetBlue"},
                {"label": "Route", "value": "JFK → MVY · Nonstop"},
                {"label": "Outbound", "value": "Jul 3 · 9:15 AM → 10:05 AM"},
                {"label": "Return", "value": "Jul 6 · 6:30 PM → 7:25 PM"},
                {"label": "Flight total", "value": "$636"},
            ],
        },
        {
            "title": "Activity",
            "rows": [
                {"label": "Experience", "value": "Sunset Sailing Cruise"},
                {"label": "When", "value": "Jul 4 · 2 hours"},
                {"label": "Where", "value": "Edgartown Harbor"},
                {"label": "Activity total", "value": "$190"},
            ],
        },
    ]


def create_booking(
    property_id: str = "",
    room_id: str = "",
    check_in: str = "",
    check_out: str = "",
    guest_name: str = "",
    payment_method: str = "card on file",
    destination_id: str = "",
    hotel_id: str = "",
    flight_id: str = "",
    experience_id: str = "",
    travelers: int = 0,
) -> dict:
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
    if destination_id or hotel_id or flight_id or experience_id:
        card = {
            "type": "confirmation",
            "confirmationNumber": "BK-4JUL-29571",
            "property": "Summercamp Hotel",
            "dates": "Jul 3 - Jul 6, 2026",
            "room": "Two guests · 3 nights",
            "nights": 3,
            "total": "$1,561",
            "status": "Confirmed",
            "itinerarySections": _july4_itinerary_sections(),
        }
        return {
            "confirmation_number": "BK-4JUL-29571",
            "destination": "Martha's Vineyard",
            "hotel": "Summercamp Hotel",
            "flight": "JetBlue JFK↔MVY",
            "experience": "Sunset Sailing Cruise",
            "travelers": travelers or 2,
            "total": 1561,
            "success": True,
            "payload": {"action": "create_booking", "card": card},
        }

    property_id = _canonical_id(property_id)
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
