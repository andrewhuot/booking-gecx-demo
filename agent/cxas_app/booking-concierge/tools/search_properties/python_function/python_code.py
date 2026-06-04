"""Find the best-fit Sedona property for the traveler's vibe and budget.

Self-contained: CES executes each tool's code in isolation and `cxas push` does
not bundle shared sibling modules under tools/, so the property data and helpers
this tool needs are embedded here. The data mirrors frontend/src/data/properties.ts.
"""
from __future__ import annotations

from typing import Any

# vibe -> ordered list of property ids best matching that vibe.
_VIBE_RANK: dict[str, list[str]] = {
    "spa_wellness": ["enchantment-resort", "mii-amo", "amara-resort"],
    "romance_couples": ["lauberge-sedona", "enchantment-resort", "ambiente-hotel"],
    "solo_reset": ["mii-amo", "enchantment-resort", "sedona-rouge"],
    "nature_hiking": ["enchantment-resort", "amara-resort", "sedona-rouge"],
    "value": ["sedona-rouge", "amara-resort", "enchantment-resort"],
    "unique_design": ["ambiente-hotel", "mii-amo", "lauberge-sedona"],
}

# Minimal per-property fields this tool needs to build a property card.
_PROPERTIES: list[dict[str, Any]] = [
    {"id": "enchantment-resort", "name": "Enchantment Resort",
     "location": "Boynton Canyon, Sedona, AZ", "rating": 9.2,
     "rating_label": "Wonderful", "reviews": 847, "nightly_rate": 339,
     "tags": ["Spa & Wellness", "Canyon Views", "Adults Preferred"],
     "why": "70-acre wellness resort in Boynton Canyon, home to the Mii amo spa."},
    {"id": "lauberge-sedona", "name": "L'Auberge de Sedona",
     "location": "Oak Creek, Sedona, AZ", "rating": 9.4,
     "rating_label": "Exceptional", "reviews": 612, "nightly_rate": 465,
     "tags": ["Luxury", "Couples", "Creekside"],
     "why": "Creekside cottages and an open-air spa, built for couples."},
    {"id": "mii-amo", "name": "Mii amo",
     "location": "Boynton Canyon, Sedona, AZ", "rating": 9.6,
     "rating_label": "Exceptional", "reviews": 389, "nightly_rate": 325,
     "tags": ["All-Inclusive", "Destination Spa", "Solo-Friendly"],
     "why": "All-inclusive destination spa; immersive solo-friendly wellness journeys."},
    {"id": "amara-resort", "name": "Amara Resort & Spa",
     "location": "Uptown Sedona, AZ", "rating": 8.8,
     "rating_label": "Excellent", "reviews": 1203, "nightly_rate": 275,
     "tags": ["Pool", "Spa", "Central Location"],
     "why": "Contemporary resort with an infinity pool, walkable to Uptown."},
    {"id": "ambiente-hotel", "name": "Ambiente, A Landscape Hotel",
     "location": "Sedona, AZ", "rating": 9.1,
     "rating_label": "Wonderful", "reviews": 234, "nightly_rate": 520,
     "tags": ["Unique", "Views", "Luxury"],
     "why": "Adults-only glass Atriums with 360-degree red-rock views."},
    {"id": "sedona-rouge", "name": "Sedona Rouge Hotel & Spa",
     "location": "West Sedona, AZ", "rating": 8.4,
     "rating_label": "Very Good", "reviews": 567, "nightly_rate": 189,
     "tags": ["Boutique", "Value", "Spa"],
     "why": "Boutique Mediterranean-inspired value pick with a rooftop pool."},
]

_BY_ID: dict[str, dict[str, Any]] = {p["id"]: p for p in _PROPERTIES}


def _fmt_price(value: float) -> str:
    """Format a number as a display price string, e.g. 1017 -> '$1,017'."""
    n = float(value)
    return f"${int(n):,}" if n.is_integer() else f"${n:,.2f}"


def _pick_property(vibe: str, budget_per_night: float) -> dict[str, Any]:
    """Return the best-fit property for a vibe within an optional budget."""
    ranked_ids = _VIBE_RANK.get(vibe or "", [p["id"] for p in _PROPERTIES])
    ranked = [_BY_ID[i] for i in ranked_ids if i in _BY_ID]
    if budget_per_night and budget_per_night > 0:
        in_budget = [p for p in ranked if p["nightly_rate"] <= budget_per_night]
        if in_budget:
            return in_budget[0]
    return ranked[0] if ranked else _PROPERTIES[0]


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
        prop = _pick_property(vibe=vibe, budget_per_night=budget)
    except Exception as exc:  # defensive: never crash a turn
        return {
            "success": False,
            "error": str(exc),
            "agent_action": "Apologize that the property search is temporarily unavailable and ask the guest to try again in a moment.",
        }
    card = {
        "type": "property",
        "id": prop["id"],
        "name": prop["name"],
        "location": prop["location"],
        "rating": prop["rating"],
        "ratingLabel": prop["rating_label"],
        "reviews": prop["reviews"],
        "price": _fmt_price(prop["nightly_rate"]),
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
