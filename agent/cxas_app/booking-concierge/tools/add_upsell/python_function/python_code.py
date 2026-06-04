"""Apply a contextual add-on to a booking and return an updated-total payload.

Self-contained: CES executes each tool in isolation and `cxas push` does not
bundle shared sibling modules under tools/, so the add-on data and helper are
embedded here. Add-ons mirror the per-property add-ons used across the demo.
"""

# property id -> its one contextual add-on.
_ADDONS = {
    "enchantment-resort": {"id": "spa-package", "name": "Mii amo Spa Package",
                           "description": "Two 80-minute treatments plus daily guided meditation.",
                           "price": 475, "price_context": "for your stay"},
    "lauberge-sedona": {"id": "couples-package", "name": "Couples Spa Package",
                        "description": "Side-by-side creekside massages and a private dinner.",
                        "price": 525, "price_context": "for two"},
    "mii-amo": {"id": "intention-session", "name": "Intention-Setting Session",
                "description": "A private one-on-one consult to shape your journey.",
                "price": 180, "price_context": "one-time"},
    "amara-resort": {"id": "spa-credit", "name": "Spa Credit",
                     "description": "A $150 credit toward any spa treatment.",
                     "price": 150, "price_context": "credit"},
    "ambiente-hotel": {"id": "stargazing", "name": "Private Stargazing Experience",
                       "description": "A guided rooftop-deck astronomy session.",
                       "price": 220, "price_context": "for two"},
    "sedona-rouge": {"id": "rooftop-dinner", "name": "Rooftop Dinner for Two",
                     "description": "A sunset three-course dinner on the terrace.",
                     "price": 160, "price_context": "for two"},
}

_DEFAULT_ADDON = {
    "name": "Add-on", "description": "", "price": 0, "price_context": ""}


def _canonical_id(property_id: str) -> str:
    """Normalize an LLM-supplied property id (e.g. 'mii_amo' -> 'mii-amo')."""
    norm = (property_id or "").strip().lower().replace("_", "-").replace(" ", "-")
    while "--" in norm:
        norm = norm.replace("--", "-")
    return norm


def _fmt_price(value: float) -> str:
    """Format a number as a display price string, e.g. 1155 -> '$1,155'."""
    n = float(value)
    return f"${int(n):,}" if n.is_integer() else f"${n:,.2f}"


def add_upsell(
    confirmation_number: str,
    property_id: str = "",
    addon_id: str = "",
    current_total: float = 0,
) -> dict:
    """Add the property's relevant add-on and return the updated total.

    Args:
      confirmation_number: The existing booking's confirmation number.
      property_id: The booked property id (selects the relevant add-on).
      addon_id: Optional specific add-on id; defaults to the property's add-on.
      current_total: The pre-addon total in USD (for computing the new total).

    Returns:
      Dict with updated_total, success, and a payload that renders a
      confirmation-update card and updates the confirmation on the site.
    """
    if not confirmation_number:
        return {
            "success": False,
            "error": "missing_confirmation_number",
            "agent_action": "Let the guest know the add-on can only be applied to a confirmed booking, then confirm the booking first.",
        }
    addon = _ADDONS.get(_canonical_id(property_id), _DEFAULT_ADDON)
    try:
        base = float(current_total or 0)
    except (TypeError, ValueError):
        base = 0.0
    updated = base + float(addon["price"])
    card = {
        "type": "confirmation_update",
        "confirmationNumber": confirmation_number,
        "addOn": addon["name"],
        "addOnPrice": _fmt_price(addon["price"]),
        "updatedTotal": _fmt_price(updated),
        "status": "Updated",
    }
    return {
        "confirmation_number": confirmation_number,
        "add_on": addon["name"],
        "updated_total": updated,
        "success": True,
        "payload": {"action": "add_upsell", "card": card},
    }
