"""Unit tests for ``backend.mapping`` — pure, no network, no cxas_scrapi.

These must pass with only ``fastapi`` + ``pydantic`` + ``pytest`` installed::

    backend/.venv/bin/python -m pytest backend/tests/test_mapping.py -q

They lock the contract between the CXAS structured response (input) and the
frontend chat shape (output: ``agent_response`` / ``cards`` / ``site_action``).
"""

from __future__ import annotations

from typing import Any

from backend.mapping import map_structured_response


# --------------------------------------------------------------------------- #
# search_properties → property card + navigate→search (highlight)
# --------------------------------------------------------------------------- #
def test_search_payload_maps_to_property_card_and_highlight() -> None:
    structured: dict[str, Any] = {
        "agent_text": "I'd recommend Enchantment Resort in Sedona.",
        "tool_calls": [{"action": "search_properties", "args": {"vibe": "spa"}}],
        "payload": {
            "action": "search_properties",
            "card": {
                "type": "property",
                "id": "enchantment-resort",
                "name": "Enchantment Resort",
                "location": "Boynton Canyon, Sedona, AZ",
                "rating": 9.2,
                "ratingLabel": "Wonderful",
                "reviews": 847,
                "price": "$340",
                "priceUnit": "/night",
                "tags": ["Spa & Wellness", "Canyon Views", "Adults Preferred"],
                "cta": "Check Availability",
            },
        },
    }

    result = map_structured_response(structured)

    assert result["agent_response"].startswith("I'd recommend Enchantment Resort")
    assert len(result["cards"]) == 1
    card = result["cards"][0]
    assert card["type"] == "property"
    assert card["id"] == "enchantment-resort"
    assert card["name"] == "Enchantment Resort"
    assert card["price"] == "$340"
    assert card["priceUnit"] == "/night"
    assert card["tags"] == ["Spa & Wellness", "Canyon Views", "Adults Preferred"]

    site = result["site_action"]
    assert site is not None
    assert site["type"] == "navigate"
    assert site["to"] == "search"
    assert site["highlight"] == "enchantment-resort"


def test_search_synthesises_card_from_tool_response_without_handbuilt_card() -> None:
    """Agent returns only tool data; mapping synthesises the property card."""
    structured: dict[str, Any] = {
        "agent_text": "Here's a great match.",
        "tool_calls": [{"action": "search_properties", "args": {}}],
        "tool_responses": [
            {
                "action": "_response:search_properties",
                "args": {},
                "response": {
                    "id": "mii-amo",
                    "name": "Mii amo",
                    "location": "Boynton Canyon, Sedona, AZ",
                    "rating": 9.6,
                    "rating_label": "Exceptional",
                    "reviews": 389,
                    "nightly_rate": 325,
                    "price_unit": "/night, all-inclusive",
                    "tags": ["Destination Spa", "Solo-Friendly"],
                },
            }
        ],
        "payload": None,
    }

    result = map_structured_response(structured)

    assert len(result["cards"]) == 1
    card = result["cards"][0]
    assert card["type"] == "property"
    assert card["id"] == "mii-amo"
    assert card["ratingLabel"] == "Exceptional"  # snake_case → camelCase
    assert card["price"] == "$325"  # numeric nightly_rate → formatted string
    assert card["priceUnit"] == "/night, all-inclusive"
    assert result["site_action"] == {
        "type": "navigate",
        "to": "search",
        "highlight": "mii-amo",
    }


# --------------------------------------------------------------------------- #
# create_booking → confirmation card + navigate→confirmation with data
# --------------------------------------------------------------------------- #
def test_booking_payload_maps_to_confirmation_card_and_navigate_with_data() -> None:
    structured: dict[str, Any] = {
        "agent_text": "Done. You're booked at Enchantment Resort, Oct 16-19.",
        "tool_calls": [{"action": "create_booking", "args": {}}],
        "payload": {
            "action": "create_booking",
            "card": {
                "type": "confirmation",
                "confirmationNumber": "BK-7824091",
                "property": "Enchantment Resort",
                "dates": "Oct 16 - Oct 19, 2025",
                "room": "Canyon View Suite",
                "nights": 3,
                "total": "$1,017",
                "status": "Confirmed",
                "itinerarySections": [
                    {
                        "title": "Hotel",
                        "rows": [
                            {"label": "Property", "value": "Enchantment Resort"},
                            {"label": "Stay", "value": "Oct 16 - Oct 19, 2025"},
                        ],
                    }
                ],
            },
        },
    }

    result = map_structured_response(structured)

    assert len(result["cards"]) == 1
    card = result["cards"][0]
    assert card["type"] == "confirmation"
    assert card["confirmationNumber"] == "BK-7824091"
    assert card["nights"] == 3
    assert card["total"] == "$1,017"
    assert card["status"] == "Confirmed"

    site = result["site_action"]
    assert site is not None
    assert site["type"] == "navigate"
    assert site["to"] == "confirmation"
    assert site["data"] == {
        "confirmationNumber": "BK-7824091",
        "property": "Enchantment Resort",
        "dates": "Oct 16 - Oct 19, 2025",
        "room": "Canyon View Suite",
        "total": "$1,017",
        "itinerarySections": [
            {
                "title": "Hotel",
                "rows": [
                    {"label": "Property", "value": "Enchantment Resort"},
                    {"label": "Stay", "value": "Oct 16 - Oct 19, 2025"},
                ],
            }
        ],
    }


def test_booking_from_tool_response_formats_numeric_total() -> None:
    """create_booking via tool response with a numeric total → '$930'."""
    structured: dict[str, Any] = {
        "agent_text": "Done. Confirmation Bravo-Kilo-9-3-0-1-2-7-7.",
        "tool_responses": [
            {
                "action": "_response:create_booking",
                "args": {},
                "response": {
                    "confirmation_number": "BK-9301277",
                    "property": "L'Auberge de Sedona",
                    "dates": "Nov 7 - Nov 9, 2025",
                    "room": "Creekside Vista Cottage",
                    "nights": 2,
                    "total": 930,
                },
            }
        ],
        "payload": {"action": "create_booking"},
    }

    result = map_structured_response(structured)

    card = result["cards"][0]
    assert card["type"] == "confirmation"
    assert card["confirmationNumber"] == "BK-9301277"
    assert card["total"] == "$930"
    assert result["site_action"]["to"] == "confirmation"
    assert result["site_action"]["data"]["total"] == "$930"


# --------------------------------------------------------------------------- #
# add_upsell → confirmation_update card + updateConfirmation site_action
# --------------------------------------------------------------------------- #
def test_upsell_applied_maps_to_confirmation_update_and_update_site_action() -> None:
    structured: dict[str, Any] = {
        "agent_text": "Added. Updated total: $1,492 before taxes.",
        "tool_calls": [{"action": "add_upsell", "args": {}}],
        "payload": {
            "action": "add_upsell",
            "card": {
                "type": "confirmation_update",
                "confirmationNumber": "BK-7824091",
                "addOn": "Journey Package",
                "addOnPrice": "$475",
                "updatedTotal": "$1,492",
                "status": "Updated",
            },
        },
    }

    result = map_structured_response(structured)

    cards = result["cards"]
    assert any(c["type"] == "confirmation_update" for c in cards)
    update = next(c for c in cards if c["type"] == "confirmation_update")
    assert update["confirmationNumber"] == "BK-7824091"
    assert update["addOn"] == "Journey Package"
    assert update["updatedTotal"] == "$1,492"
    assert update["status"] == "Updated"

    site = result["site_action"]
    assert site is not None
    assert site["type"] == "updateConfirmation"
    assert site["addOn"] == "Journey Package"
    assert site["updatedTotal"] == "$1,492"
    # An updateConfirmation action must not carry a (invalid) navigate target.
    assert "to" not in site


def test_upsell_offer_only_yields_upsell_card_and_no_site_action() -> None:
    """An upsell *offer* (not yet accepted) → upsell card, no site_action."""
    structured: dict[str, Any] = {
        "agent_text": "Mii amo offers a Journey Package. Want me to add it?",
        "payload": {
            "action": "add_upsell",
            "card": {
                "type": "upsell",
                "name": "Mii amo Journey Package",
                "description": "2x 80-min spa sessions + daily guided meditation",
                "price": "$475",
                "priceContext": "for 3 days",
                "cta": "Add to Booking",
            },
        },
    }

    result = map_structured_response(structured)

    assert len(result["cards"]) == 1
    card = result["cards"][0]
    assert card["type"] == "upsell"
    assert card["name"] == "Mii amo Journey Package"
    assert card["priceContext"] == "for 3 days"
    assert result["site_action"] is None


# --------------------------------------------------------------------------- #
# check_availability → navigate→property (select room), no card
# --------------------------------------------------------------------------- #
def test_availability_maps_to_navigate_property_with_select_room() -> None:
    structured: dict[str, Any] = {
        "agent_text": "Canyon View Suite, $339/night, 3 nights - $1,017.",
        "tool_responses": [
            {
                "action": "_response:check_availability",
                "args": {},
                "response": {"property_id": "enchantment-resort", "room_id": "canyon-view-suite"},
            }
        ],
        "payload": {"action": "check_availability"},
    }

    result = map_structured_response(structured)

    assert result["cards"] == []
    site = result["site_action"]
    assert site is not None
    assert site["type"] == "navigate"
    assert site["to"] == "property"
    assert site["selectRoom"] == "canyon-view-suite"


def test_availability_unwraps_ces_result_envelope() -> None:
    """Real CES wraps the tool return under response['result'] (+ nested payload).

    This mirrors a live get_structured_response for a check_availability turn:
    the canonical (hyphenated) property_id lives inside result, while the agent's
    raw args may use a different form — the mapping must use the result's ids.
    """
    structured: dict[str, Any] = {
        "agent_text": "Canyon Suite (All-Inclusive) is available — $975 for 3 nights.",
        "tool_calls": [{"action": "check_availability", "args": {"property_id": "mii_amo"}}],
        "tool_responses": [
            {
                "action": "_response:check_availability",
                "args": {},
                "response": {
                    "result": {
                        "property_id": "mii-amo",
                        "room_id": "canyon-suite-ai",
                        "room": "Canyon Suite, All-Inclusive",
                        "nightly_rate": 325,
                        "nights": 3,
                        "total": 975,
                        "success": True,
                        "payload": {
                            "action": "check_availability",
                            "data": {"property_id": "mii-amo", "room_id": "canyon-suite-ai"},
                        },
                    }
                },
            }
        ],
        "payload": None,
    }

    result = map_structured_response(structured)
    site = result["site_action"]
    assert site is not None
    assert site["type"] == "navigate"
    assert site["to"] == "property"
    # Must use the canonical hyphenated ids from result, not the raw "mii_amo" arg.
    assert site["selectRoom"] == "canyon-suite-ai"
    assert site["highlight"] == "mii-amo"


def test_search_unwraps_ces_result_envelope_to_property_card() -> None:
    """A search_properties turn with the real CES result envelope → property card."""
    structured: dict[str, Any] = {
        "agent_text": "I'd recommend Mii amo.",
        "tool_responses": [
            {
                "action": "_response:search_properties",
                "args": {},
                "response": {
                    "result": {
                        "id": "mii-amo",
                        "name": "Mii amo",
                        "nightly_rate": 325,
                        "success": True,
                        "payload": {
                            "action": "search_properties",
                            "card": {
                                "type": "property",
                                "id": "mii-amo",
                                "name": "Mii amo",
                                "location": "Boynton Canyon, Sedona, AZ",
                                "rating": 9.6,
                                "ratingLabel": "Exceptional",
                                "reviews": 389,
                                "price": "$325",
                                "priceUnit": "/night",
                                "tags": ["All-Inclusive", "Destination Spa"],
                                "cta": "Check Availability",
                            },
                        },
                    }
                },
            }
        ],
        "payload": None,
    }

    result = map_structured_response(structured)
    assert len(result["cards"]) == 1
    card = result["cards"][0]
    assert card["type"] == "property"
    assert card["id"] == "mii-amo"
    assert card["price"] == "$325"
    # Rich fields from the tool's payload.card flow through (not just sparse ones).
    assert card["location"] == "Boynton Canyon, Sedona, AZ"
    assert card["ratingLabel"] == "Exceptional"
    assert card["tags"] == ["All-Inclusive", "Destination Spa"]
    assert result["site_action"]["highlight"] == "mii-amo"


# --------------------------------------------------------------------------- #
# Empty / missing payload → just agent_response
# --------------------------------------------------------------------------- #
def test_empty_payload_yields_only_agent_response() -> None:
    structured: dict[str, Any] = {
        "agent_text": "When you say relaxing, more spa or more nature?",
        "tool_calls": [],
        "tool_responses": [],
        "payload": None,
    }

    result = map_structured_response(structured)

    assert result == {
        "agent_response": "When you say relaxing, more spa or more nature?",
        "cards": [],
        "site_action": None,
    }


def test_completely_empty_input_is_safe() -> None:
    """A malformed/empty structured response never raises."""
    result = map_structured_response({})
    assert result == {"agent_response": "", "cards": [], "site_action": None}

    # Non-dict input is tolerated too.
    result_none = map_structured_response(None)  # type: ignore[arg-type]
    assert result_none == {"agent_response": "", "cards": [], "site_action": None}


def test_invalid_view_in_explicit_site_action_is_stripped() -> None:
    """An explicit site_action with an unknown ``to`` drops the navigation."""
    structured: dict[str, Any] = {
        "agent_text": "Here you go.",
        "payload": {"site_action": {"type": "navigate", "to": "checkout"}},
    }

    result = map_structured_response(structured)
    assert result["cards"] == []
    assert result["site_action"] == {"type": "navigate"}  # invalid 'to' removed


def test_missing_keys_in_property_card_are_tolerated() -> None:
    """Partial property data still yields a property card + highlight."""
    structured: dict[str, Any] = {
        "agent_text": "Take a look.",
        "payload": {"action": "search_properties", "card": {"type": "property", "id": "amara-resort"}},
    }

    result = map_structured_response(structured)
    card = result["cards"][0]
    assert card["type"] == "property"
    assert card["id"] == "amara-resort"
    assert card["priceUnit"] == "/night"  # default applied
    assert card["cta"] == "Check Availability"  # default applied
    assert card["tags"] == []  # default applied
    assert result["site_action"]["highlight"] == "amara-resort"
