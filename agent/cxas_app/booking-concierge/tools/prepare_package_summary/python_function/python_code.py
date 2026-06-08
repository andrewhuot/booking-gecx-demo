"""Return the complete-trip cost summary for the July 4 booking demo."""


def prepare_package_summary(
    destination_id: str = "",
    hotel_id: str = "",
    flight_id: str = "",
    experience_id: str = "",
    travelers: int = 2,
) -> dict:
    """Prepare the deterministic July 4 package summary card.

    Args:
      destination_id: Expected July 4 destination id, normally marthas-vineyard.
      hotel_id: Expected hotel id, normally summercamp.
      flight_id: Expected flight id, normally jetblue.
      experience_id: Expected experience id, normally sunset-sailing.
      travelers: Traveler count for context.

    Returns:
      Dict with a cost_summary payload that renders the pre-checkout trip review.
    """
    if travelers and travelers < 1:
        return {
            "success": False,
            "error": "invalid_travelers",
            "agent_action": "Ask the guest to confirm the traveler count before summarizing the package.",
        }

    card = {
        "type": "cost_summary",
        "title": "July 4th Weekend — Martha's Vineyard",
        "rows": [
            {"label": "JetBlue JFK↔MVY (2 pax)", "value": "$636"},
            {"label": "Summercamp Hotel, 3 nights", "value": "$735"},
            {"label": "Sunset Sailing Cruise (2 pax)", "value": "$190"},
        ],
        "total": "$1,561",
        "note": "That's $439 under your budget.",
        "cta": "Book This Trip",
        "replyText": "Book This Trip",
    }
    return {
        "success": True,
        "destination_id": destination_id or "marthas-vineyard",
        "hotel_id": hotel_id or "summercamp",
        "flight_id": flight_id or "jetblue",
        "experience_id": experience_id or "sunset-sailing",
        "travelers": travelers or 2,
        "total": 1561,
        "payload": {"action": "prepare_package_summary", "card": card},
    }
