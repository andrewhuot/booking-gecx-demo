"""Check availability for a property + dates; return room, nights, total.

Self-contained: CES executes each tool in isolation and `cxas push` does not
bundle shared sibling modules under tools/, so the room data and helpers are
embedded here. Room data mirrors frontend/src/data/properties.ts.
"""

# property id -> ordered rooms (lead room first). Mirrors the frontend.
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

_JULY4_OPTIONS = {
    "hotels": {
        "variant": "hotel",
        "title": "Martha's Vineyard hotels",
        "options": [
            {
                "id": "harbor-view",
                "title": "Harbor View Hotel",
                "subtitle": "⭐ 4.6 · Edgartown · Waterfront",
                "price": "$289/night · $867 total",
                "description": "Steps from Edgartown Harbor. Classic Vineyard charm, rooftop deck, complimentary bikes.",
                "replyText": "Harbor View looks good",
            },
            {
                "id": "summercamp",
                "title": "Summercamp Hotel",
                "subtitle": "⭐ 4.4 · Oak Bluffs · Near beach",
                "price": "$245/night · $735 total",
                "description": "Renovated with a playful, retro vibe. Pool, fire pits, live music, and walking distance to the ferry.",
                "replyText": "This one — looks fun and the price is right",
            },
            {
                "id": "christopher",
                "title": "The Christopher",
                "subtitle": "⭐ 4.7 · Edgartown · Boutique",
                "price": "$310/night · $930 total",
                "description": "Intimate boutique hotel with a celebrated on-site restaurant. Quiet luxury.",
                "replyText": "The Christopher sounds nice",
            },
        ],
    },
    "flights": {
        "variant": "flight",
        "title": "NYC to Martha's Vineyard flights",
        "options": [
            {
                "id": "jetblue",
                "title": "JetBlue",
                "subtitle": "JFK → MVY · Nonstop",
                "meta": "Depart 9:15 AM → Arrive 10:05 AM · Return 6:30 PM → 7:25 PM",
                "price": "$318/person · $636 total for 2",
                "description": "Nonstop from JFK — under an hour each way.",
                "replyText": "JetBlue for sure",
            },
            {
                "id": "cape-air",
                "title": "Cape Air",
                "subtitle": "JFK → BOS → MVY · 1 stop",
                "meta": "Depart 9:30 AM → Arrive 11:35 AM · Return 4:45 PM → 7:20 PM",
                "price": "$248/person · $496 total for 2",
                "description": "A bit less, but you connect through Boston before the short Cape Air hop to MVY.",
                "replyText": "Cape Air is fine",
            },
        ],
    },
    "experiences": {
        "variant": "experience",
        "title": "Holiday weekend experiences",
        "options": [
            {
                "id": "sunset-sailing",
                "title": "Sunset Sailing Cruise",
                "subtitle": "Edgartown Harbor · 2 hours",
                "meta": "July 4 · Departs 6:30 PM",
                "price": "$95/person · $190 for 2",
                "description": "Watch the 250th anniversary fireworks from the water. BYOB, small group, golden hour views.",
                "replyText": "The sunset cruise on July 4th sounds amazing, let’s do it",
            },
            {
                "id": "bike-wine",
                "title": "Island Bike & Wine Tour",
                "subtitle": "Vineyard Haven → Aquinnah · 4 hours",
                "meta": "July 5 · Departs 10:00 AM",
                "price": "$75/person · $150 for 2",
                "description": "A guided ride through rolling farmland with stops at two vineyards for tastings.",
                "replyText": "The bike and wine tour sounds fun",
            },
        ],
    },
}


def _canonical_id(property_id: str) -> str:
    """Normalize an LLM-supplied property id to the canonical hyphenated form.

    The model often passes 'mii_amo', 'Mii amo', or 'MII-AMO'; map all of these
    to 'mii-amo' so lookups don't spuriously fail.
    """
    norm = (property_id or "").strip().lower().replace("_", "-").replace(" ", "-")
    while "--" in norm:
        norm = norm.replace("--", "-")
    return norm


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
    property_id: str = "",
    check_in: str = "",
    check_out: str = "",
    room_id: str = "",
    stage: str = "",
    destination_id: str = "",
) -> dict:
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
    stage_key = (stage or "").strip().lower()
    if stage_key in _JULY4_OPTIONS:
        option_set = _JULY4_OPTIONS[stage_key]
        card = {
            "type": "choice_group",
            "variant": option_set["variant"],
            "title": option_set["title"],
            "layout": "cards",
            "options": list(option_set["options"]),
        }
        return {
            "success": True,
            "destination_id": destination_id or "marthas-vineyard",
            "stage": stage_key,
            "payload": {"action": "show_options", "card": card},
        }

    property_id = _canonical_id(property_id)
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
