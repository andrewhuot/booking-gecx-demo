"""Shared, deterministic Sedona property data for the concierge tools.

Mirrors frontend/src/data/properties.ts exactly (ids, names, prices, rooms) so
the live agent's recommendations land on the same cards the site renders.
No network, no randomness — confirmation numbers are derived deterministically.
"""
from __future__ import annotations

from typing import Any

# vibe -> ordered list of property ids best matching that vibe.
VIBE_RANK: dict[str, list[str]] = {
    "spa_wellness": ["enchantment-resort", "mii-amo", "amara-resort"],
    "romance_couples": ["lauberge-sedona", "enchantment-resort", "ambiente-hotel"],
    "solo_reset": ["mii-amo", "enchantment-resort", "sedona-rouge"],
    "nature_hiking": ["enchantment-resort", "amara-resort", "sedona-rouge"],
    "value": ["sedona-rouge", "amara-resort", "enchantment-resort"],
    "unique_design": ["ambiente-hotel", "mii-amo", "lauberge-sedona"],
}

PROPERTIES: list[dict[str, Any]] = [
    {
        "id": "enchantment-resort", "name": "Enchantment Resort",
        "location": "Boynton Canyon, Sedona, AZ", "rating": 9.2,
        "rating_label": "Wonderful", "reviews": 847, "nightly_rate": 339,
        "tags": ["Spa & Wellness", "Canyon Views", "Adults Preferred"],
        "why": "70-acre wellness resort in Boynton Canyon, home to the Mii amo spa.",
        "rooms": [
            {"id": "canyon-view-suite", "name": "Canyon View Suite", "price": 339},
            {"id": "casita-king", "name": "Casita King", "price": 299},
            {"id": "junior-suite", "name": "Junior Suite", "price": 389},
        ],
        "addon": {"id": "spa-package", "name": "Mii amo Spa Package",
                  "description": "Two 80-minute treatments plus daily guided meditation.",
                  "price": 475, "price_context": "for your stay"},
    },
    {
        "id": "lauberge-sedona", "name": "L'Auberge de Sedona",
        "location": "Oak Creek, Sedona, AZ", "rating": 9.4,
        "rating_label": "Exceptional", "reviews": 612, "nightly_rate": 465,
        "tags": ["Luxury", "Couples", "Creekside"],
        "why": "Creekside cottages and an open-air spa, built for couples.",
        "rooms": [
            {"id": "creekside-vista-cottage", "name": "Creekside Vista Cottage", "price": 465},
            {"id": "luxury-cottage", "name": "Luxury Cottage", "price": 429},
            {"id": "vista-king-suite", "name": "Vista King Suite", "price": 399},
        ],
        "addon": {"id": "couples-package", "name": "Couples Spa Package",
                  "description": "Side-by-side creekside massages and a private dinner.",
                  "price": 525, "price_context": "for two"},
    },
    {
        "id": "mii-amo", "name": "Mii amo",
        "location": "Boynton Canyon, Sedona, AZ", "rating": 9.6,
        "rating_label": "Exceptional", "reviews": 389, "nightly_rate": 325,
        "tags": ["All-Inclusive", "Destination Spa", "Solo-Friendly"],
        "why": "All-inclusive destination spa; immersive solo-friendly wellness journeys.",
        "rooms": [
            {"id": "canyon-suite-ai", "name": "Canyon Suite, All-Inclusive", "price": 325},
            {"id": "spa-suite-ai", "name": "Spa Suite, All-Inclusive", "price": 395},
        ],
        "addon": {"id": "intention-session", "name": "Intention-Setting Session",
                  "description": "A private one-on-one consult to shape your journey.",
                  "price": 180, "price_context": "one-time"},
    },
    {
        "id": "amara-resort", "name": "Amara Resort & Spa",
        "location": "Uptown Sedona, AZ", "rating": 8.8,
        "rating_label": "Excellent", "reviews": 1203, "nightly_rate": 275,
        "tags": ["Pool", "Spa", "Central Location"],
        "why": "Contemporary resort with an infinity pool, walkable to Uptown.",
        "rooms": [{"id": "amara-king", "name": "Resort King", "price": 275}],
        "addon": {"id": "spa-credit", "name": "Spa Credit",
                  "description": "A $150 credit toward any spa treatment.",
                  "price": 150, "price_context": "credit"},
    },
    {
        "id": "ambiente-hotel", "name": "Ambiente, A Landscape Hotel",
        "location": "Sedona, AZ", "rating": 9.1,
        "rating_label": "Wonderful", "reviews": 234, "nightly_rate": 520,
        "tags": ["Unique", "Views", "Luxury"],
        "why": "Adults-only glass Atriums with 360-degree red-rock views.",
        "rooms": [{"id": "ambiente-atrium", "name": "Landscape Atrium", "price": 520}],
        "addon": {"id": "stargazing", "name": "Private Stargazing Experience",
                  "description": "A guided rooftop-deck astronomy session.",
                  "price": 220, "price_context": "for two"},
    },
    {
        "id": "sedona-rouge", "name": "Sedona Rouge Hotel & Spa",
        "location": "West Sedona, AZ", "rating": 8.4,
        "rating_label": "Very Good", "reviews": 567, "nightly_rate": 189,
        "tags": ["Boutique", "Value", "Spa"],
        "why": "Boutique Mediterranean-inspired value pick with a rooftop pool.",
        "rooms": [{"id": "rouge-king", "name": "Deluxe King", "price": 189}],
        "addon": {"id": "rooftop-dinner", "name": "Rooftop Dinner for Two",
                  "description": "A sunset three-course dinner on the terrace.",
                  "price": 160, "price_context": "for two"},
    },
]

BY_ID: dict[str, dict[str, Any]] = {p["id"]: p for p in PROPERTIES}


def pick_property(vibe: str = "", budget_per_night: float = 0) -> dict[str, Any]:
    """Return the best-fit property dict for a vibe within an optional budget."""
    ranked_ids = VIBE_RANK.get(vibe or "", [p["id"] for p in PROPERTIES])
    ranked = [BY_ID[i] for i in ranked_ids if i in BY_ID]
    if budget_per_night and budget_per_night > 0:
        in_budget = [p for p in ranked if p["nightly_rate"] <= budget_per_night]
        if in_budget:
            return in_budget[0]
    return ranked[0] if ranked else PROPERTIES[0]


def fmt_price(value: float) -> str:
    """Format a number as a display price string, e.g. 1017 -> '$1,017'."""
    n = float(value)
    return f"${int(n):,}" if n.is_integer() else f"${n:,.2f}"


def nights_between(check_in: str, check_out: str) -> int:
    """Whole nights between two YYYY-MM-DD dates; defaults to 3 if unparseable."""
    from datetime import date
    try:
        y1, m1, d1 = (int(x) for x in check_in.split("-"))
        y2, m2, d2 = (int(x) for x in check_out.split("-"))
        delta = (date(y2, m2, d2) - date(y1, m1, d1)).days
        return delta if delta > 0 else 3
    except Exception:
        return 3


def confirmation_number(*parts: str) -> str:
    """Deterministic confirmation code from inputs, e.g. 'BK-7824091'."""
    import hashlib
    seed = "|".join(str(p) for p in parts)
    digits = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % 10_000_000
    return f"BK-{digits:07d}"
