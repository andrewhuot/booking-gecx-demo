"""Return the saved-payment checkout panel for the July 4 booking demo."""


def prepare_checkout(
    destination_id: str = "",
    hotel_id: str = "",
    flight_id: str = "",
    experience_id: str = "",
    travelers: int = 2,
    total: float = 1561,
) -> dict:
    """Prepare checkout and return the payment-panel card payload.

    Args:
      destination_id: Expected July 4 destination id, normally marthas-vineyard.
      hotel_id: Expected hotel id, normally summercamp.
      flight_id: Expected flight id, normally jetblue.
      experience_id: Expected experience id, normally sunset-sailing.
      travelers: Traveler count for context.
      total: Package total in USD.

    Returns:
      Dict with checkout context and a payload whose card renders the saved
      payment choices in the desktop chat.
    """
    if total and total < 0:
        return {
            "success": False,
            "error": "invalid_total",
            "agent_action": "Ask the guest to review the package total before checkout.",
        }

    card = {
        "type": "payment_panel",
        "title": "Complete booking",
        "options": [
            {
                "id": "visa",
                "title": "Visa ending in 4242",
                "subtitle": "Saved card",
                "icon": "💳",
                "replyText": "Use my saved Visa and confirm",
            },
            {
                "id": "google-pay",
                "title": "Google Pay",
                "subtitle": "Fast checkout",
                "icon": "G",
                "replyText": "Use Google Pay",
            },
            {
                "id": "new-card",
                "title": "Enter new card",
                "subtitle": "Secure payment",
                "icon": "+",
                "replyText": "Enter a new card",
            },
        ],
    }
    return {
        "success": True,
        "destination_id": destination_id or "marthas-vineyard",
        "hotel_id": hotel_id or "summercamp",
        "flight_id": flight_id or "jetblue",
        "experience_id": experience_id or "sunset-sailing",
        "travelers": travelers or 2,
        "total": total or 1561,
        "payload": {"action": "prepare_checkout", "card": card},
    }
