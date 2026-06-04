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
