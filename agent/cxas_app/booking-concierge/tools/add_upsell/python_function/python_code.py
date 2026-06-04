"""Apply a contextual add-on to a booking and return an updated-total payload."""
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


def add_upsell(
    confirmation_number: str,
    property_id: str = "",
    addon_id: str = "",
    current_total: float = 0,
) -> dict[str, Any]:
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
    prop = data.BY_ID.get(property_id)
    addon = prop["addon"] if prop else {
        "name": "Add-on", "description": "", "price": 0, "price_context": ""}
    try:
        base = float(current_total or 0)
    except (TypeError, ValueError):
        base = 0.0
    updated = base + float(addon["price"])
    card = {
        "type": "confirmation_update",
        "confirmationNumber": confirmation_number,
        "addOn": addon["name"],
        "addOnPrice": data.fmt_price(addon["price"]),
        "updatedTotal": data.fmt_price(updated),
        "status": "Updated",
    }
    return {
        "confirmation_number": confirmation_number,
        "add_on": addon["name"],
        "updated_total": updated,
        "success": True,
        "payload": {"action": "add_upsell", "card": card},
    }
