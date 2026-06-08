"""Unit tests for the CXAS concierge tools — pure logic, no network.

Run: backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q

Each tool's python_code.py is SELF-CONTAINED (it embeds the property data and
helpers it needs) because CES executes each tool in isolation and `cxas push`
does not bundle shared sibling modules under tools/. These tests load each tool
module directly and verify its behavior + the payload contract that
backend/mapping.py depends on.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TOOLS = REPO / "agent" / "cxas_app" / "booking-concierge" / "tools"


def _load(module_path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, module_path)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)
    return mod


def _tool(name: str):
    return _load(TOOLS / name / "python_function" / "python_code.py", f"tool_{name}")


# --------------------------------------------------------------------------- #
# Self-containment guard: no tool may import a shared sibling module.
# --------------------------------------------------------------------------- #
def test_tools_are_self_contained_no_shared_import():
    for name in (
        "search_properties",
        "check_availability",
        "prepare_package_summary",
        "prepare_checkout",
        "create_booking",
        "add_upsell",
    ):
        src = (TOOLS / name / "python_function" / "python_code.py").read_text()
        assert "_shared" not in src, f"{name} must not import the removed _shared module"
        assert "import data" not in src, f"{name} must be self-contained (no shared data import)"
    # The shared package must be gone (it broke `cxas push`).
    assert not (TOOLS / "_shared").exists(), "tools/_shared must not exist (breaks cxas push)"


# --------------------------------------------------------------------------- #
# search_properties
# --------------------------------------------------------------------------- #
def test_search_properties_returns_property_card_payload():
    t = _tool("search_properties")
    out = t.search_properties(vibe="spa_wellness", budget_per_night=400)
    assert out["success"] is True
    payload = out["payload"]
    assert payload["action"] == "search_properties"
    card = payload["card"]
    assert card["type"] == "property"
    assert card["id"] == "enchantment-resort"
    assert card["price"] == "$339"
    assert card["priceUnit"] == "/night"
    assert card["cta"] == "Check Availability"
    assert isinstance(card["tags"], list) and card["tags"]


def test_search_properties_respects_vibe_and_budget():
    t = _tool("search_properties")
    # Under a tight budget, falls to the first in-budget ranked property (mii-amo @325).
    out = t.search_properties(vibe="spa_wellness", budget_per_night=330)
    assert out["payload"]["card"]["id"] == "mii-amo"
    assert out["payload"]["card"]["price"] == "$325"
    # romance_couples top pick with no budget limit -> lauberge.
    out2 = t.search_properties(vibe="romance_couples", budget_per_night=0)
    assert out2["payload"]["card"]["id"] == "lauberge-sedona"
    # No vibe still returns a valid property card.
    out3 = t.search_properties()
    assert out3["success"] is True and out3["payload"]["card"]["type"] == "property"


# --------------------------------------------------------------------------- #
# check_availability
# --------------------------------------------------------------------------- #
def test_check_availability_returns_room_and_nav_data():
    t = _tool("check_availability")
    out = t.check_availability(
        property_id="enchantment-resort", check_in="2025-10-16", check_out="2025-10-19")
    assert out["success"] is True
    assert out["nights"] == 3
    assert out["room_id"] == "canyon-view-suite"
    assert out["total"] == 339 * 3
    payload = out["payload"]
    assert payload["action"] == "check_availability"
    assert payload["data"]["property_id"] == "enchantment-resort"
    assert payload["data"]["room_id"] == "canyon-view-suite"


def test_check_availability_unknown_property_fails_gracefully():
    t = _tool("check_availability")
    out = t.check_availability(property_id="does-not-exist", check_in="2025-10-16", check_out="2025-10-19")
    assert out["success"] is False
    assert out["error"] == "unknown_property"
    assert "payload" not in out  # no card/nav on failure


def test_check_availability_tolerates_id_variants():
    """The LLM often passes 'mii_amo' / 'Mii amo' — tools must normalize these."""
    t = _tool("check_availability")
    for variant in ("mii_amo", "Mii amo", "MII-AMO", " mii-amo "):
        out = t.check_availability(property_id=variant, check_in="2025-10-16", check_out="2025-10-19")
        assert out["success"] is True, f"variant {variant!r} should resolve"
        assert out["payload"]["data"]["property_id"] == "mii-amo"


# --------------------------------------------------------------------------- #
# create_booking
# --------------------------------------------------------------------------- #
def test_create_booking_returns_confirmation_card_payload():
    t = _tool("create_booking")
    out = t.create_booking(
        property_id="enchantment-resort", room_id="canyon-view-suite",
        check_in="2025-10-16", check_out="2025-10-19",
        guest_name="Rachel Nguyen", payment_method="Visa on file")
    assert out["success"] is True
    assert out["confirmation_number"].startswith("BK-")
    # Deterministic: same inputs -> same number (across processes too, sha256).
    again = t.create_booking(
        property_id="enchantment-resort", room_id="canyon-view-suite",
        check_in="2025-10-16", check_out="2025-10-19",
        guest_name="Rachel Nguyen", payment_method="Visa on file")
    assert out["confirmation_number"] == again["confirmation_number"]
    assert len(out["confirmation_number"]) == 10 and out["confirmation_number"][3:].isdigit()
    card = out["payload"]["card"]
    assert card["type"] == "confirmation"
    assert card["property"] == "Enchantment Resort"
    assert card["dates"] == "Oct 16 - Oct 19, 2025"
    assert card["nights"] == 3
    assert card["total"] == "$1,017"
    assert card["status"] == "Confirmed"
    assert out["payload"]["action"] == "create_booking"


def test_create_booking_tolerates_id_variants():
    t = _tool("create_booking")
    out = t.create_booking(
        property_id="mii_amo", check_in="2025-10-16", check_out="2025-10-19",
        guest_name="Rachel Nguyen")
    assert out["success"] is True
    assert out["payload"]["card"]["property"] == "Mii amo"


# --------------------------------------------------------------------------- #
# add_upsell
# --------------------------------------------------------------------------- #
def test_add_upsell_returns_confirmation_update_payload():
    t = _tool("add_upsell")
    out = t.add_upsell(
        confirmation_number="BK-1234567", property_id="mii-amo",
        addon_id="intention-session", current_total=975)
    assert out["success"] is True
    card = out["payload"]["card"]
    assert card["type"] == "confirmation_update"
    assert card["confirmationNumber"] == "BK-1234567"
    assert card["addOn"] == "Intention-Setting Session"
    assert card["addOnPrice"] == "$180"
    assert card["updatedTotal"] == "$1,155"
    assert card["status"] == "Updated"
    assert out["payload"]["action"] == "add_upsell"


def test_add_upsell_unknown_property_uses_zero_addon():
    t = _tool("add_upsell")
    out = t.add_upsell(confirmation_number="BK-9", property_id="nope", current_total=500)
    assert out["success"] is True  # never blocks; falls back to a $0 add-on
    assert out["payload"]["card"]["updatedTotal"] == "$500"


def test_add_upsell_tolerates_id_variants():
    t = _tool("add_upsell")
    out = t.add_upsell(confirmation_number="BK-1", property_id="mii_amo", current_total=975)
    assert out["payload"]["card"]["addOn"] == "Intention-Setting Session"
    assert out["payload"]["card"]["updatedTotal"] == "$1,155"


# --------------------------------------------------------------------------- #
# July 4 turnkey chat flow for the Booking.com CEO demo
# --------------------------------------------------------------------------- #
def test_july4_destination_search_returns_choice_group_payload():
    t = _tool("search_properties")
    out = t.search_properties(
        destination_type="beach_coast",
        budget_total=2000,
        travelers=2,
        origin="New York City",
        check_in="2026-07-03",
        check_out="2026-07-06",
    )
    assert out["success"] is True
    card = out["payload"]["card"]
    assert out["payload"]["action"] == "show_options"
    assert card["type"] == "choice_group"
    assert card["variant"] == "destination"
    assert [option["title"] for option in card["options"]] == [
        "Martha's Vineyard, MA",
        "Outer Banks, NC",
        "Kennebunkport, ME",
    ]
    assert card["options"][0]["price"] == "~$1,600"
    assert card["options"][0]["replyText"] == "Let's go with the Vineyard!"


def test_july4_hotel_flight_experience_and_booking_payloads():
    availability = _tool("check_availability")

    hotels = availability.check_availability(stage="hotels", destination_id="marthas-vineyard")
    assert hotels["success"] is True
    assert hotels["payload"]["card"]["variant"] == "hotel"
    assert hotels["payload"]["card"]["options"][1]["title"] == "Summercamp Hotel"

    flights = availability.check_availability(stage="flights", destination_id="marthas-vineyard")
    assert flights["payload"]["card"]["variant"] == "flight"
    assert flights["payload"]["card"]["options"][0]["title"] == "JetBlue"
    cape_air = flights["payload"]["card"]["options"][1]
    assert cape_air["title"] == "Cape Air"
    assert cape_air["subtitle"] == "JFK → BOS → MVY · 1 stop"
    assert "Boston" in cape_air["description"]

    experiences = availability.check_availability(stage="experiences", destination_id="marthas-vineyard")
    assert experiences["payload"]["card"]["variant"] == "experience"
    assert experiences["payload"]["card"]["options"][0]["title"] == "Sunset Sailing Cruise"

    summary = _tool("prepare_package_summary").prepare_package_summary(
        destination_id="marthas-vineyard",
        hotel_id="summercamp",
        flight_id="jetblue",
        experience_id="sunset-sailing",
        travelers=2,
    )
    assert summary["success"] is True
    assert summary["payload"]["action"] == "prepare_package_summary"
    summary_card = summary["payload"]["card"]
    assert summary_card["type"] == "cost_summary"
    assert summary_card["total"] == "$1,561"
    assert summary_card["cta"] == "Book This Trip"
    assert summary_card["replyText"] == "Book This Trip"

    bad_summary = _tool("prepare_package_summary").prepare_package_summary(travelers=-1)
    assert bad_summary["success"] is False
    assert bad_summary["error"] == "invalid_travelers"
    assert "agent_action" in bad_summary

    checkout = _tool("prepare_checkout").prepare_checkout(
        destination_id="marthas-vineyard",
        hotel_id="summercamp",
        flight_id="jetblue",
        experience_id="sunset-sailing",
        travelers=2,
        total=1561,
    )
    assert checkout["success"] is True
    assert checkout["payload"]["action"] == "prepare_checkout"
    card = checkout["payload"]["card"]
    assert card["type"] == "payment_panel"
    assert card["title"] == "Complete booking"
    assert card["options"][0]["title"] == "Visa ending in 4242"
    assert card["options"][0]["replyText"] == "Use my saved Visa and confirm"

    booking = _tool("create_booking").create_booking(
        destination_id="marthas-vineyard",
        hotel_id="summercamp",
        flight_id="jetblue",
        experience_id="sunset-sailing",
        travelers=2,
        payment_method="Visa ending in 4242",
    )
    assert booking["success"] is True
    assert booking["confirmation_number"] == "BK-4JUL-29571"
    card = booking["payload"]["card"]
    assert card["type"] == "confirmation"
    assert card["property"] == "Summercamp Hotel"
    assert card["total"] == "$1,561"
    assert card["itinerarySections"] == [
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
