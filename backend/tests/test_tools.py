"""Unit tests for the CXAS concierge tools — pure logic, no network.

Run: backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q
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


def _data():
    return _load(TOOLS / "_shared" / "data.py", "concierge_data")


def test_six_properties_match_frontend_ids():
    d = _data()
    ids = {p["id"] for p in d.PROPERTIES}
    assert ids == {
        "enchantment-resort", "lauberge-sedona", "mii-amo",
        "amara-resort", "ambiente-hotel", "sedona-rouge",
    }


def test_property_prices_match_frontend():
    d = _data()
    by_id = {p["id"]: p for p in d.PROPERTIES}
    assert by_id["enchantment-resort"]["nightly_rate"] == 339
    assert by_id["lauberge-sedona"]["nightly_rate"] == 465
    assert by_id["mii-amo"]["nightly_rate"] == 325
    assert by_id["sedona-rouge"]["nightly_rate"] == 189


def test_pick_property_respects_vibe_and_budget():
    d = _data()
    # spa_wellness top pick is enchantment-resort when budget allows.
    assert d.pick_property(vibe="spa_wellness", budget_per_night=400)["id"] == "enchantment-resort"
    # Under a tight budget, falls to the first in-budget ranked property (mii-amo @325).
    assert d.pick_property(vibe="spa_wellness", budget_per_night=330)["id"] == "mii-amo"
    # No vibe -> returns a valid property (first overall).
    assert d.pick_property()["id"] in {p["id"] for p in d.PROPERTIES}
    # Budget of 0 means "no limit" -> top ranked, not filtered out.
    assert d.pick_property(vibe="romance_couples", budget_per_night=0)["id"] == "lauberge-sedona"


def test_fmt_price_formats_whole_and_fractional():
    d = _data()
    assert d.fmt_price(339) == "$339"
    assert d.fmt_price(1017) == "$1,017"
    assert d.fmt_price(1017.5) == "$1,017.50"


def test_nights_between_counts_and_defaults():
    d = _data()
    assert d.nights_between("2025-10-16", "2025-10-19") == 3
    assert d.nights_between("2025-11-07", "2025-11-09") == 2
    # Unparseable / empty -> safe default of 3.
    assert d.nights_between("", "") == 3
    assert d.nights_between("not-a-date", "also-bad") == 3
    # Non-positive span -> default 3.
    assert d.nights_between("2025-10-19", "2025-10-16") == 3


def test_confirmation_number_deterministic_and_formatted():
    d = _data()
    a = d.confirmation_number("enchantment-resort", "canyon-view-suite", "2025-10-16", "2025-10-19", "Rachel Nguyen")
    b = d.confirmation_number("enchantment-resort", "canyon-view-suite", "2025-10-16", "2025-10-19", "Rachel Nguyen")
    assert a == b  # deterministic across calls
    assert a.startswith("BK-") and len(a) == 10  # 'BK-' + 7 digits
    assert a[3:].isdigit()
    # Different inputs -> (almost certainly) different code.
    c = d.confirmation_number("mii-amo", "canyon-suite-ai", "2025-06-18", "2025-06-20", "Melissa")
    assert c != a


def _tool(name: str):
    return _load(TOOLS / name / "python_function" / "python_code.py", f"tool_{name}")


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


def test_create_booking_returns_confirmation_card_payload():
    t = _tool("create_booking")
    out = t.create_booking(
        property_id="enchantment-resort", room_id="canyon-view-suite",
        check_in="2025-10-16", check_out="2025-10-19",
        guest_name="Rachel Nguyen", payment_method="Visa on file")
    assert out["success"] is True
    assert out["confirmation_number"].startswith("BK-")
    # Deterministic: same inputs -> same number.
    again = t.create_booking(
        property_id="enchantment-resort", room_id="canyon-view-suite",
        check_in="2025-10-16", check_out="2025-10-19",
        guest_name="Rachel Nguyen", payment_method="Visa on file")
    assert out["confirmation_number"] == again["confirmation_number"]
    card = out["payload"]["card"]
    assert card["type"] == "confirmation"
    assert card["nights"] == 3
    assert card["total"] == "$1,017"
    assert card["status"] == "Confirmed"
    assert out["payload"]["action"] == "create_booking"
