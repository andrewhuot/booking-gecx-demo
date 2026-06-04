# Live CXAS Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Booking.com concierge to a real CX Agent Studio (CXAS) app via SCRAPI and wire the demo end-to-end so the frontend can run live (non-mocked) turns against it.

**Architecture:** A single LLM agent (gemini-2.5-flash) with 4 `python_function` tools is defined as a pushable CXAS app tree under `agent/cxas_app/booking-concierge/` and deployed with `cxas push`. Each tool returns data plus a custom `payload` that a tiny `after_tool` callback emits as a CES response payload; the FastAPI backend reads it via `Sessions.get_structured_response` and `map_structured_response` turns it into the frontend's `{agent_response, cards, site_action}` shape. The frontend's already-built live toggle routes chat through the backend.

**Tech Stack:** Python 3.12 (FastAPI, pydantic, cxas-scrapi), the `cxas` CLI, React + Vite + Zustand (TypeScript), Vitest, pytest. GCP project `decent-courage-233916`, location `us`, ADC auth.

---

## Key facts the engineer must know (verified 2026-06-04)

- **Live CXAS is reachable. Billing is NOT blocked** (the committed comments are stale). `ces.googleapis.com` is enabled; ADC works; `backend/.venv/bin/cxas` exists.
- All commands run from the repo root: `/Users/andrew/Desktop/booking-gecx-demo/.claude/worktrees/magical-goldberg-372f49`.
- Python is `backend/.venv/bin/python`; the CLI is `backend/.venv/bin/cxas`. The venv already has `cxas-scrapi`.
- Tests run as a module from repo root: `backend/.venv/bin/python -m pytest backend/tests -q`. There is a `backend/__init__.py` and `backend/tests/__init__.py`, so `from backend.mapping import ...` resolves.
- **The card/payload contract is locked by `backend/tests/test_mapping.py`.** Tools MUST emit payloads in exactly those shapes. Do not change `backend/mapping.py`'s contract; make the tools conform to it.
- **Real CXAS tool format** (mirror `examples` in `/tmp/cxas-scrapi-inspect/examples/bella_notte/`, already inspected):
  - `tools/<name>/<name>.json` = `{"name": "<uuid>", "displayName": "<name>", "pythonFunction": {"name": "<name>", "pythonCode": "tools/<name>/python_function/python_code.py", "description": "<LLM-facing description>"}}`.
  - `tools/<name>/python_function/python_code.py` = a module with a function named `<name>`; params are inferred from the typed signature; returns a plain dict.
  - Agent JSON = `{"name": "<uuid>", "displayName": "<Name>", "instruction": "agents/<Name>/instruction.txt", "tools": [<displayNames>], "afterToolCallbacks": [{"pythonCode": "<relpath>", "description": "<text>"}]}`.
  - `app.json` = `{"name": "<uuid>", "displayName": "<App>", "rootAgent": "<AgentName>", "variableDeclarations": []}`.
  - Callback signature: `after_tool_callback(tool, tool_input, callback_context, tool_response)`. CES injects `Part`, `Content`, `Tool` as globals (no import). Tool result is read via `tool_response.get("result", tool_response)`.
  - Each tool's `python_code.py` is bundled standalone, so **shared data must be inlined into a module each tool imports relative to the bundle** — to avoid cross-file import fragility in the sandbox, each tool file embeds the property data it needs via a small shared module placed at `tools/_shared/data.py` AND we verify it bundles. (Task 2 handles this with a self-contained approach: the data lives in one module and tools import it; if push rejects it, the fallback is to inline per tool. The plan uses the import approach first and Task 9's live test catches any bundling issue.)
- `uuid` values in JSON `name` fields: generate real UUIDs (e.g. `python -c "import uuid;print(uuid.uuid4())"`); `cxas push` accepts them.

---

## File Structure

**Create (CXAS app tree — pushable):**
- `agent/cxas_app/booking-concierge/app.json`
- `agent/cxas_app/booking-concierge/agents/Concierge/Concierge.json`
- `agent/cxas_app/booking-concierge/agents/Concierge/instruction.txt`
- `agent/cxas_app/booking-concierge/agents/Concierge/after_tool_callbacks/after_tool_callbacks_01/python_code.py`
- `agent/cxas_app/booking-concierge/tools/_shared/data.py` (shared property data + helpers)
- `agent/cxas_app/booking-concierge/tools/search_properties/search_properties.json`
- `agent/cxas_app/booking-concierge/tools/search_properties/python_function/python_code.py`
- `agent/cxas_app/booking-concierge/tools/check_availability/check_availability.json`
- `agent/cxas_app/booking-concierge/tools/check_availability/python_function/python_code.py`
- `agent/cxas_app/booking-concierge/tools/create_booking/create_booking.json`
- `agent/cxas_app/booking-concierge/tools/create_booking/python_function/python_code.py`
- `agent/cxas_app/booking-concierge/tools/add_upsell/add_upsell.json`
- `agent/cxas_app/booking-concierge/tools/add_upsell/python_function/python_code.py`

**Create (tests):**
- `backend/tests/test_tools.py` (pure unit tests for the 4 tools' logic + payload shapes)
- `frontend/src/hooks/useLiveHealth.test.ts` (the health→liveAvailable wiring, if logic added)

**Modify:**
- `scripts/create_agent.py` (rewrite to deploy via `cxas push`)
- `backend/cxas_client.py` (correct billing copy; text-only modality; deployment_id optional)
- `backend/config.py` (no behavior change beyond reading `CXAS_APP_NAME`; correct a comment)
- `scripts/test_agent.py` (already correct; verify it runs against live)
- `frontend/src/App.tsx` (call health check once on mount → `setLiveAvailable`)
- `.env.example` (already has the right vars; verify)
- `agent/agent_config.json` (rewritten by the script on deploy — not hand-edited)

**Delete:** the 4 old OpenAI-style tool JSONs at `agent/tools/*.json` (replaced by the new tree). Keep `agent/instructions.txt` and `agent/guardrails/` as source-of-truth text (the new instruction.txt is copied from it).

---

## Task 1: Scaffold the pushable app tree (app.json + agent + instruction)

**Files:**
- Create: `agent/cxas_app/booking-concierge/app.json`
- Create: `agent/cxas_app/booking-concierge/agents/Concierge/Concierge.json`
- Create: `agent/cxas_app/booking-concierge/agents/Concierge/instruction.txt`

- [ ] **Step 1: Generate three UUIDs for the `name` fields**

Run: `backend/.venv/bin/python -c "import uuid; print(uuid.uuid4()); print(uuid.uuid4()); print(uuid.uuid4())"`
Use the first for `app.json`, the second for `Concierge.json`. (Third reserved for later use.)

- [ ] **Step 2: Write `app.json`**

```json
{
  "name": "<UUID-1>",
  "displayName": "Booking.com Concierge Demo",
  "rootAgent": "Concierge",
  "variableDeclarations": []
}
```

- [ ] **Step 3: Write `agents/Concierge/Concierge.json`**

```json
{
  "name": "<UUID-2>",
  "displayName": "Concierge",
  "instruction": "agents/Concierge/instruction.txt",
  "tools": ["search_properties", "check_availability", "create_booking", "add_upsell"],
  "afterToolCallbacks": [
    {
      "pythonCode": "agents/Concierge/after_tool_callbacks/after_tool_callbacks_01/python_code.py",
      "description": "Emit the tool's custom payload as a CES response payload so it surfaces to the client."
    }
  ]
}
```

- [ ] **Step 4: Create `instruction.txt` by copying the existing persona**

Run: `cp agent/instructions.txt agent/cxas_app/booking-concierge/agents/Concierge/instruction.txt`

Then append this explicit payload/tool-contract block to the END of the new file (the agent must call tools and trust their structured output):

```
================================================================================
TOOL OUTPUT CONTRACT (do not narrate this section)
================================================================================
Every tool returns real data AND a structured "payload" that renders a card and
moves the website. Always call the right tool before quoting any price, room,
availability, or confirmation number. After a tool returns, describe its result
naturally in one or two sentences — never restate the raw JSON, never invent
fields the tool did not return. Call exactly one funnel tool per turn:
  • search_properties → when ready to recommend (Phase 2)
  • check_availability → before quoting a total (Phase 3)
  • create_booking → after the guest confirms summary + payment (Phase 3)
  • add_upsell → only after booking, only if the guest accepts (Phase 4)
```

- [ ] **Step 5: Commit**

```bash
git add agent/cxas_app/booking-concierge/app.json agent/cxas_app/booking-concierge/agents/Concierge/Concierge.json agent/cxas_app/booking-concierge/agents/Concierge/instruction.txt
git commit -m "feat: scaffold CXAS app tree (app.json, Concierge agent, instruction)"
```

---

## Task 2: Shared property data module (mirrors frontend properties.ts)

**Files:**
- Create: `agent/cxas_app/booking-concierge/tools/_shared/data.py`
- Test: `backend/tests/test_tools.py`

The data MUST match `frontend/src/data/properties.ts` (ids, names, prices, rooms). This module is the single source for all 4 tools.

- [ ] **Step 1: Write the failing test (data integrity)**

Create `backend/tests/test_tools.py`:

```python
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q`
Expected: FAIL (ModuleNotFoundError / file not found for `_shared/data.py`).

- [ ] **Step 3: Write `tools/_shared/data.py`**

```python
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
    seed = "|".join(str(p) for p in parts)
    digits = abs(hash(seed)) % 10_000_000
    return f"BK-{digits:07d}"
```

Note: `confirmation_number` uses Python's `hash`, which is salted per-process by default. For deterministic output across runs/tests, disable hash randomization by exporting `PYTHONHASHSEED=0`, OR (preferred, no env dependency) replace `hash(seed)` with a stable digest. Use the stable digest:

Replace the body of `confirmation_number` with:
```python
    import hashlib
    seed = "|".join(str(p) for p in parts)
    digits = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % 10_000_000
    return f"BK-{digits:07d}"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add agent/cxas_app/booking-concierge/tools/_shared/data.py backend/tests/test_tools.py
git commit -m "feat: shared concierge property data mirroring frontend (with tests)"
```

---

## Task 3: `search_properties` tool

**Files:**
- Create: `agent/cxas_app/booking-concierge/tools/search_properties/search_properties.json`
- Create: `agent/cxas_app/booking-concierge/tools/search_properties/python_function/python_code.py`
- Test: `backend/tests/test_tools.py` (extend)

- [ ] **Step 1: Add the failing test**

Append to `backend/tests/test_tools.py`:

```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py::test_search_properties_returns_property_card_payload -q`
Expected: FAIL (file not found).

- [ ] **Step 3: Write the tool function**

`tools/search_properties/python_function/python_code.py`:

```python
"""Find the best-fit Sedona property for the traveler's vibe and budget."""
from __future__ import annotations

import os
import sys
from typing import Any

# Make the bundled _shared module importable regardless of CES's sandbox cwd.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "_shared"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
try:
    from _shared import data  # type: ignore
except Exception:  # pragma: no cover - fallback path layout
    import data  # type: ignore


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
    prop = data.pick_property(vibe=vibe, budget_per_night=budget)
    card = {
        "type": "property",
        "id": prop["id"],
        "name": prop["name"],
        "location": prop["location"],
        "rating": prop["rating"],
        "ratingLabel": prop["rating_label"],
        "reviews": prop["reviews"],
        "price": data.fmt_price(prop["nightly_rate"]),
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
```

- [ ] **Step 4: Write the tool JSON**

Run: `backend/.venv/bin/python -c "import uuid; print(uuid.uuid4())"` and use it for `name`.

`tools/search_properties/search_properties.json`:

```json
{
  "name": "<UUID>",
  "displayName": "search_properties",
  "pythonFunction": {
    "name": "search_properties",
    "pythonCode": "tools/search_properties/python_function/python_code.py",
    "description": "Find the single best-fit Sedona property for the traveler's vibe and budget. Call this when you are ready to recommend (Phase 2). Pass vibe (spa_wellness, romance_couples, solo_reset, nature_hiking, value, unique_design) and, if known, budget_per_night, party, check_in, check_out. Returns the best match plus a payload that renders a property card and highlights it on the site."
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q`
Expected: PASS (all tests so far).

- [ ] **Step 6: Commit**

```bash
git add agent/cxas_app/booking-concierge/tools/search_properties backend/tests/test_tools.py
git commit -m "feat: search_properties CXAS tool (property card payload)"
```

---

## Task 4: `check_availability` tool

**Files:**
- Create: `agent/cxas_app/booking-concierge/tools/check_availability/check_availability.json`
- Create: `agent/cxas_app/booking-concierge/tools/check_availability/python_function/python_code.py`
- Test: `backend/tests/test_tools.py` (extend)

The payload for availability uses `action: "check_availability"` with a `data` dict (no card). `mapping.py:_build_availability` reads `data.room_id`/`property_id` to drive `navigate→property` + `selectRoom`.

- [ ] **Step 1: Add the failing test**

```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py::test_check_availability_returns_room_and_nav_data -q`
Expected: FAIL.

- [ ] **Step 3: Write the tool function**

`tools/check_availability/python_function/python_code.py`:

```python
"""Check availability for a property + dates; return room, nights, total."""
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


def check_availability(
    property_id: str,
    check_in: str = "",
    check_out: str = "",
    room_id: str = "",
) -> dict[str, Any]:
    """Return the recommended room, nights, and total for the stay.

    Args:
      property_id: The property id from search_properties.
      check_in: Check-in date (YYYY-MM-DD).
      check_out: Check-out date (YYYY-MM-DD).
      room_id: Optional specific room id; defaults to the property's lead room.

    Returns:
      Dict with room, nightly_rate, nights, total, success, and a payload that
      navigates to the property page and pre-selects the room.
    """
    prop = data.BY_ID.get(property_id)
    if not prop:
        return {"success": False, "error": "unknown_property", "property_id": property_id}
    rooms = prop["rooms"]
    room = next((r for r in rooms if r["id"] == room_id), rooms[0])
    nights = data.nights_between(check_in, check_out)
    total = room["price"] * nights
    return {
        "property_id": property_id,
        "room_id": room["id"],
        "room": room["name"],
        "nightly_rate": room["price"],
        "nights": nights,
        "total": total,
        "success": True,
        "payload": {
            "action": "check_availability",
            "data": {
                "property_id": property_id,
                "room_id": room["id"],
                "room": room["name"],
                "nightly_rate": room["price"],
                "nights": nights,
                "total": total,
            },
        },
    }
```

- [ ] **Step 4: Write the tool JSON** (new UUID)

`tools/check_availability/check_availability.json`:

```json
{
  "name": "<UUID>",
  "displayName": "check_availability",
  "pythonFunction": {
    "name": "check_availability",
    "pythonCode": "tools/check_availability/python_function/python_code.py",
    "description": "Check availability and pricing for a chosen property and dates before quoting a total (Phase 3). Pass property_id plus check_in and check_out (YYYY-MM-DD). Returns the recommended room, nights, and total, and a payload that opens the property page with the room pre-selected. Use the returned nightly rate, nights, and total verbatim."
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add agent/cxas_app/booking-concierge/tools/check_availability backend/tests/test_tools.py
git commit -m "feat: check_availability CXAS tool (room + navigate payload)"
```

---

## Task 5: `create_booking` tool

**Files:**
- Create: `agent/cxas_app/booking-concierge/tools/create_booking/create_booking.json`
- Create: `agent/cxas_app/booking-concierge/tools/create_booking/python_function/python_code.py`
- Test: `backend/tests/test_tools.py` (extend)

- [ ] **Step 1: Add the failing test**

```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py::test_create_booking_returns_confirmation_card_payload -q`
Expected: FAIL.

- [ ] **Step 3: Write the tool function**

`tools/create_booking/python_function/python_code.py`:

```python
"""Create a booking and return a confirmation card payload."""
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

_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _fmt_dates(check_in: str, check_out: str) -> str:
    """Render 'Oct 16 - Oct 19, 2025' from two YYYY-MM-DD strings (best effort)."""
    try:
        y1, m1, d1 = (int(x) for x in check_in.split("-"))
        _, m2, d2 = (int(x) for x in check_out.split("-"))
        return f"{_MONTHS[m1-1]} {d1} - {_MONTHS[m2-1]} {d2}, {y1}"
    except Exception:
        return f"{check_in} - {check_out}".strip(" -")


def create_booking(
    property_id: str,
    room_id: str = "",
    check_in: str = "",
    check_out: str = "",
    guest_name: str = "",
    payment_method: str = "card on file",
) -> dict[str, Any]:
    """Book the stay and return a confirmation card payload.

    Args:
      property_id: The property id.
      room_id: The room id (defaults to the property's lead room).
      check_in: Check-in date (YYYY-MM-DD).
      check_out: Check-out date (YYYY-MM-DD).
      guest_name: Name on the reservation.
      payment_method: Reference to the method on file (never full card details).

    Returns:
      Dict with confirmation_number, success, and a payload that renders a
      confirmation card and navigates to the confirmation page.
    """
    prop = data.BY_ID.get(property_id)
    if not prop:
        return {"success": False, "error": "unknown_property", "property_id": property_id}
    rooms = prop["rooms"]
    room = next((r for r in rooms if r["id"] == room_id), rooms[0])
    nights = data.nights_between(check_in, check_out)
    total = room["price"] * nights
    conf = data.confirmation_number(property_id, room["id"], check_in, check_out, guest_name)
    dates = _fmt_dates(check_in, check_out)
    card = {
        "type": "confirmation",
        "confirmationNumber": conf,
        "property": prop["name"],
        "dates": dates,
        "room": room["name"],
        "nights": nights,
        "total": data.fmt_price(total),
        "status": "Confirmed",
    }
    return {
        "confirmation_number": conf,
        "property": prop["name"],
        "room": room["name"],
        "nights": nights,
        "total": total,
        "success": True,
        "payload": {"action": "create_booking", "card": card},
    }
```

- [ ] **Step 4: Write the tool JSON** (new UUID)

`tools/create_booking/create_booking.json`:

```json
{
  "name": "<UUID>",
  "displayName": "create_booking",
  "pythonFunction": {
    "name": "create_booking",
    "pythonCode": "tools/create_booking/python_function/python_code.py",
    "description": "Create the booking after the guest confirms the summary and payment method (Phase 3). Pass property_id, room_id, check_in, check_out (YYYY-MM-DD), guest_name, and payment_method (reference the method on file only). Returns the confirmation_number and a payload that renders a confirmation card and navigates to the confirmation page. Announce the returned confirmation number exactly."
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add agent/cxas_app/booking-concierge/tools/create_booking backend/tests/test_tools.py
git commit -m "feat: create_booking CXAS tool (deterministic confirmation card)"
```

---

## Task 6: `add_upsell` tool

**Files:**
- Create: `agent/cxas_app/booking-concierge/tools/add_upsell/add_upsell.json`
- Create: `agent/cxas_app/booking-concierge/tools/add_upsell/python_function/python_code.py`
- Test: `backend/tests/test_tools.py` (extend)

The applied-upsell payload uses `action: "add_upsell"` with a `confirmation_update` card. `mapping.py:_build_upsell` turns it into an `updateConfirmation` site_action.

- [ ] **Step 1: Add the failing test**

```python
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py::test_add_upsell_returns_confirmation_update_payload -q`
Expected: FAIL.

- [ ] **Step 3: Write the tool function**

`tools/add_upsell/python_function/python_code.py`:

```python
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
```

- [ ] **Step 4: Write the tool JSON** (new UUID)

`tools/add_upsell/add_upsell.json`:

```json
{
  "name": "<UUID>",
  "displayName": "add_upsell",
  "pythonFunction": {
    "name": "add_upsell",
    "pythonCode": "tools/add_upsell/python_function/python_code.py",
    "description": "Apply one relevant add-on AFTER a booking is confirmed and only if the guest accepts (Phase 4). Pass confirmation_number, property_id, and current_total. Returns the updated_total and a payload that renders a confirmation-update card and updates the confirmation on the site. Read back the updated total exactly. Never call before booking; never offer twice."
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_tools.py -q`
Expected: PASS (all tool tests).

- [ ] **Step 6: Commit**

```bash
git add agent/cxas_app/booking-concierge/tools/add_upsell backend/tests/test_tools.py
git commit -m "feat: add_upsell CXAS tool (confirmation-update payload)"
```

---

## Task 7: The `after_tool` callback (emit tool payload as a CES response payload)

**Files:**
- Create: `agent/cxas_app/booking-concierge/agents/Concierge/after_tool_callbacks/after_tool_callbacks_01/python_code.py`

This is the bridge that makes a tool's `payload` surface in `get_structured_response(...)["payload"]`. CES injects `Part` as a global. Tool result is under `tool_response["result"]` (or the dict itself).

- [ ] **Step 1: Write the callback**

```python
# pylint: disable=invalid-name,undefined-variable,unused-argument,broad-exception-caught
"""After-tool callback: surface a tool's custom 'payload' to the client.

Each concierge tool returns a dict that includes a "payload" key shaped for the
frontend (an {action, card|data} object). CES does not automatically forward a
tool's return value as a response payload, so we emit it here as a JSON Part. It
then appears in Sessions.get_structured_response(...)["payload"], which the
backend maps into the chat card + site action.
"""
import json as json_lib
from typing import Any, Optional


def after_tool_callback(
    tool,
    tool_input: dict[str, Any],
    callback_context,
    tool_response: Any,
) -> Optional[dict]:
    """Emit tool_response['payload'] as a JSON response payload, if present."""
    try:
        result = tool_response.get("result", tool_response) if isinstance(
            tool_response, dict) else tool_response
        payload = result.get("payload") if isinstance(result, dict) else None
        if not payload:
            return None
        # Part is injected by CES at runtime.
        part = Part.from_json(json_lib.dumps(payload))  # noqa: F821
        # Returning Content with the payload part appends it to the turn output.
        return Content(parts=[part])  # noqa: F821
    except Exception:
        # Never break a turn because of payload emission.
        return None
```

Note: the exact return protocol for appending a payload part from `after_tool_callback` should be confirmed against live behavior in Task 9. If returning `Content(parts=[...])` does not surface the payload, the fallback (already supported by `mapping.py`) is to rely on the tool-response synthesis path — in that case this callback can return `None` and the mapping still builds cards from `tool_responses[].response`. Task 9's live smoke test is the decision point; do not block deployment on the payload path.

- [ ] **Step 2: Commit**

```bash
git add agent/cxas_app/booking-concierge/agents/Concierge/after_tool_callbacks
git commit -m "feat: after_tool callback to surface tool payloads to the client"
```

---

## Task 8: Rewrite the provisioning script to deploy via `cxas push`

**Files:**
- Modify: `scripts/create_agent.py` (full rewrite)
- Delete: `agent/tools/search_properties.json`, `agent/tools/check_availability.json`, `agent/tools/create_booking.json`, `agent/tools/add_upsell.json`

- [ ] **Step 1: Delete the obsolete OpenAI-style tool JSONs**

```bash
git rm agent/tools/search_properties.json agent/tools/check_availability.json agent/tools/create_booking.json agent/tools/add_upsell.json
```

- [ ] **Step 2: Lint the app tree (real command, must pass before push)**

Run: `backend/.venv/bin/cxas lint --app-dir agent/cxas_app/booking-concierge`
Expected: no errors (warnings acceptable). If it reports structural errors, fix the JSON/paths from Tasks 1–7 before continuing. (Pushing with lint errors yields opaque `400 Reference not found`.)

- [ ] **Step 3: Rewrite `scripts/create_agent.py`**

Replace the entire file with a thin wrapper around `cxas push` that records the result:

```python
#!/usr/bin/env python3
"""Deploy the Booking.com Concierge app to live CXAS via `cxas push`.

Lints the version-controlled app tree, pushes it (creating the app on first run,
overwriting it on reruns), then records the deployed app resource name into
agent/agent_config.json and upserts CXAS_APP_NAME into .env.

Run: backend/.venv/bin/python scripts/create_agent.py
Requires: ADC auth (gcloud auth application-default login) and the cxas CLI
(installed with cxas-scrapi in backend/.venv).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
APP_DIR = REPO_ROOT / "agent" / "cxas_app" / "booking-concierge"
CONFIG_PATH = REPO_ROOT / "agent" / "agent_config.json"
ENV_PATH = REPO_ROOT / ".env"
VENV_BIN = REPO_ROOT / "backend" / ".venv" / "bin"
CXAS = str(VENV_BIN / "cxas")

PROJECT_ID = "decent-courage-233916"
LOCATION = "us"
DISPLAY_NAME = "Booking.com Concierge Demo"


def _run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    """Run a subprocess, streaming stdout/stderr, returning the completed proc."""
    print("  $", " ".join(cmd))
    return subprocess.run(cmd, cwd=str(REPO_ROOT), text=True, capture_output=True)


def _find_existing_app_name() -> str | None:
    """Return the resource name of an app with our display name, if it exists."""
    try:
        from cxas_scrapi import Apps
        apps = Apps(project_id=PROJECT_ID, location=LOCATION)
        for app in apps.list_apps():
            if getattr(app, "display_name", None) == DISPLAY_NAME:
                return app.name
    except Exception as exc:  # noqa: BLE001
        print(f"  ! could not list existing apps (continuing): {exc}")
    return None


def _extract_app_name(output: str) -> str | None:
    """Pull a projects/.../apps/<id> resource name out of push output."""
    m = re.search(r"projects/[^/\s]+/locations/[^/\s]+/apps/[^/\s\"']+", output)
    return m.group(0) if m else None


def _write_config(app_name: str | None, provisioned: bool, note: str) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps({
        "provisioned": provisioned,
        "note": note,
        "project_id": PROJECT_ID,
        "location": LOCATION,
        "app_display_name": DISPLAY_NAME,
        "app_name": app_name,
        "app_dir": str(APP_DIR.relative_to(REPO_ROOT)),
        "model": "gemini-2.5-flash",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"  → wrote {CONFIG_PATH.relative_to(REPO_ROOT)}")


def _upsert_env(app_name: str) -> None:
    """Set CXAS_APP_NAME=<app_name> in .env (create from .env.example if absent)."""
    if not ENV_PATH.exists():
        example = REPO_ROOT / ".env.example"
        if example.exists():
            ENV_PATH.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    out, found = [], False
    for line in lines:
        if line.startswith("CXAS_APP_NAME="):
            out.append(f"CXAS_APP_NAME={app_name}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"CXAS_APP_NAME={app_name}")
    ENV_PATH.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"  → set CXAS_APP_NAME in {ENV_PATH.relative_to(REPO_ROOT)}")


def main() -> int:
    print("Deploying Booking.com Concierge to live CXAS...")
    print(f"  app_dir={APP_DIR.relative_to(REPO_ROOT)}  project={PROJECT_ID}  location={LOCATION}")

    # 1. Lint.
    lint = _run([CXAS, "lint", "--app-dir", str(APP_DIR)])
    print(lint.stdout)
    if lint.returncode != 0:
        print(lint.stderr)
        print("  ! lint failed — fix the app tree before pushing.")
        _write_config(None, False, "Lint failed; not pushed.")
        return 1

    # 2. Push (overwrite if the app already exists, else create).
    existing = _find_existing_app_name()
    if existing:
        print(f"  app exists, overwriting: {existing}")
        push = _run([CXAS, "push", "--app-dir", str(APP_DIR), "--to", existing,
                     "--project-id", PROJECT_ID, "--location", LOCATION])
    else:
        push = _run([CXAS, "push", "--app-dir", str(APP_DIR),
                     "--display-name", DISPLAY_NAME,
                     "--project-id", PROJECT_ID, "--location", LOCATION])
    print(push.stdout)
    if push.returncode != 0:
        print(push.stderr)
        _write_config(existing, False, "Push failed.")
        return 1

    app_name = _extract_app_name(push.stdout) or _extract_app_name(push.stderr) \
        or existing or _find_existing_app_name()
    if not app_name:
        print("  ! could not determine the deployed app name from output.")
        _write_config(None, False, "Pushed but app name not captured.")
        return 1

    _write_config(app_name, True, "Provisioned via cxas push.")
    _upsert_env(app_name)
    print("\nDeployment complete.")
    print(f"  CXAS_APP_NAME={app_name}")
    print("  Smoke test:  backend/.venv/bin/python scripts/test_agent.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Commit (deploy happens in Task 9)**

```bash
git add scripts/create_agent.py agent/tools
git commit -m "feat: deploy concierge via cxas push (rewrite create_agent.py)"
```

---

## Task 9: Deploy to live CXAS and run the real smoke test (EVIDENCE GATE)

**Files:**
- Modify: `agent/agent_config.json` (written by the script), `.env` (written by the script)
- Verify: `scripts/test_agent.py` runs green against live CXAS

This is the gate that proves the integration is real. No code is written blind here — we run, observe, and fix.

- [ ] **Step 1: Confirm ADC is present**

Run: `gcloud auth application-default print-access-token >/dev/null 2>&1 && echo "ADC OK" || echo "ADC MISSING"`
Expected: `ADC OK`. (If MISSING: `gcloud auth application-default login` — ask the user.)

- [ ] **Step 2: Deploy**

Run: `backend/.venv/bin/python scripts/create_agent.py`
Expected: prints lint OK, push output containing a `projects/decent-courage-233916/locations/us/apps/<id>` name, and "Deployment complete." `agent/agent_config.json` now has `provisioned: true` and a real `app_name`; `.env` has `CXAS_APP_NAME=…`.
If push fails with `400 Reference not found`: re-run `cxas lint --app-dir agent/cxas_app/booking-concierge`, fix the reported reference (usually a tool displayName mismatch between `Concierge.json` `tools` and a tool's `displayName`), and re-deploy.

- [ ] **Step 3: Verify the agent + tools landed**

Run:
```bash
backend/.venv/bin/python - <<'PY'
import json
from pathlib import Path
from cxas_scrapi import Agents, Tools
cfg = json.loads(Path("agent/agent_config.json").read_text())
app = cfg["app_name"]
print("app:", app)
print("agents:", [a.display_name for a in Agents(app_name=app).list_agents()])
print("tools:", sorted(t.display_name for t in Tools(app_name=app).list_tools()))
PY
```
Expected: `agents: ['Concierge']` and `tools` containing all four: `add_upsell, check_availability, create_booking, search_properties`.

- [ ] **Step 4: Run the live smoke test**

Run: `backend/.venv/bin/python scripts/test_agent.py`
Expected: `CXAS health: reachable=True`, then for the Rachel scenario, agent replies across the 4 turns with at least one turn showing a mapped `cards:` (a `property` then a `confirmation`) and `site_action:` (navigate→search, navigate→confirmation). Capture this output verbatim for the final report.

- [ ] **Step 5: Decide the payload path**

- If Step 4 shows `cards`/`site_action` populated → the payload + mapping path works. Done.
- If `agent_text` appears but `cards` are empty on tool turns → inspect one raw structured response:
```bash
backend/.venv/bin/python - <<'PY'
import json
from backend.cxas_client import CXASClient
c = CXASClient()
sid = c.start_session()
out = c.run_turn(sid, "I want a spa weekend in Sedona under $400, Thursday to Sunday.", "chat")
print(json.dumps(out, indent=2, default=str)[:2000])
PY
```
  - If `payload` is populated but cards empty → bug in mapping usage; re-check `map_structured_response` is applied (it is, in `api.py`). 
  - If `payload` is null but `tool_responses` has the data → the `after_tool` callback isn't surfacing the payload. The mapping's tool-response synthesis still builds cards from `tool_responses[].response` for `search`/`booking`/`availability`; for `add_upsell` confirm the response keys map. This is acceptable per the design. Optionally adjust the callback per Task 7's note. Do NOT loop more than 3 times — if blocked, STOP and report (per global rules).

- [ ] **Step 6: Commit the deploy artifacts**

```bash
git add agent/agent_config.json
git commit -m "chore: record live CXAS app name after deploy"
```
(Do not commit `.env` — it's gitignored. Verify: `git check-ignore .env` prints `.env`.)

---

## Task 10: Backend corrections (billing copy + text-only modality)

**Files:**
- Modify: `backend/cxas_client.py`
- Modify: `backend/config.py`

- [ ] **Step 1: Correct the stale billing narrative in `cxas_client.py`**

In `backend/cxas_client.py`, replace the module docstring paragraph that begins "Live mode is currently blocked:" with:

```
Live mode is enabled: project ``decent-courage-233916`` has the CES API
(``ces.googleapis.com``) enabled and ADC credentials work, so real CXAS calls
succeed once the agent is provisioned (``scripts/create_agent.py``). This module
stays defensive: any transport/auth/not-provisioned failure raises a single typed
``CXASUnavailable`` the API turns into a graceful HTTP 200.
```

- [ ] **Step 2: Replace the billing-specific hint in `_humanize_error`**

In `backend/cxas_client.py`, change `_BILLING_HINTS` and `_humanize_error` so it no longer asserts billing is disabled. Replace the `_BILLING_HINTS` constant and the first `if` branch of `_humanize_error` with:

```python
# Substrings that identify a permission/not-provisioned failure from CES.
_PERMISSION_HINTS = ("permission_denied", "permissiondenied", "403", "not found", "404")
```

and in `_humanize_error`, replace the billing branch:

```python
    if any(hint in text for hint in _PERMISSION_HINTS):
        return (
            "CXAS returned a permission/not-found error. Ensure the agent is "
            "provisioned (run scripts/create_agent.py) and CXAS_APP_NAME points "
            "to the deployed app, with ADC credentials available."
        )
```

(Keep the ImportError and connection branches as-is.)

- [ ] **Step 3: Make the HTTP bridge text-only in `run_turn`**

In `backend/cxas_client.py` `run_turn`, replace the modality block and the `sessions.run(...)` call so modality is always TEXT and `app_name`/`deployment_id` come from settings:

```python
            from cxas_scrapi import Sessions  # lazy import
            from cxas_scrapi.core.sessions import Modality

            # The HTTP bridge is text-only; voice replies are spoken client-side
            # via Web Speech. Audio modality uses a separate bidi path (out of scope).
            sessions = Sessions(app_name=self.app_name)
            response = sessions.run(
                session_id=session_id,
                text=text,
                modality=Modality.TEXT,
            )
```

(Remove the now-unused `channel`-to-modality logic; `channel` stays in the signature for API compatibility but is unused — add `# noqa`/comment noting it's accepted but text-only.)

- [ ] **Step 4: Fix the `app_name` source**

`CXASClient.app_name` currently falls back to `f"{self._settings.app_parent}/apps/booking-demo"`. After deploy, `CXAS_APP_NAME` is set in `.env`, so `self._settings.cxas_app_name` is used. Verify `backend/config.py` reads `CXAS_APP_NAME` (it does). Update the fallback string comment in `cxas_client.py` `app_name` property to note it's only a last resort and the real value comes from `.env` after `create_agent.py`.

- [ ] **Step 5: Correct the stale comment in `config.py`**

In `backend/config.py`, update the module docstring line mentioning billing to: "Live-mode wiring reads ``CXAS_APP_NAME`` once ``scripts/create_agent.py`` has provisioned the agent (CES API is enabled; ADC required)."

- [ ] **Step 6: Run backend tests (no regression)**

Run: `backend/.venv/bin/python -m pytest backend/tests -q`
Expected: PASS (mapping + tools).

- [ ] **Step 7: Restart-free health check against live**

Run:
```bash
backend/.venv/bin/python - <<'PY'
from backend.cxas_client import CXASClient
print(CXASClient().health())
PY
```
Expected: `{'cxas_reachable': True, 'reason': 'CXAS reachable.'}` (config is loaded at import; if it still shows the old app, ensure `.env` has `CXAS_APP_NAME` and re-run).

- [ ] **Step 8: Commit**

```bash
git add backend/cxas_client.py backend/config.py
git commit -m "fix: correct stale billing copy; text-only modality in CXAS bridge"
```

---

## Task 11: Frontend — light up `liveAvailable` via the health check

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/store/demoStore.test.ts` already covers `setLiveAvailable`; no new store logic.

The toggle UI, `useCXASAgent`, and `submitLive` already exist. The only gap: call `checkHealth()` once on load and set `liveAvailable`.

- [ ] **Step 1: Read the current `App.tsx` to find the mount point**

Run: `sed -n '1,60p' frontend/src/App.tsx`
Identify the top-level component and its imports.

- [ ] **Step 2: Add the health-check effect**

In `frontend/src/App.tsx`, add the import and a `useEffect` that runs once on mount:

```tsx
import { useEffect } from 'react';
import { useCXASAgent } from './hooks/useCXASAgent';
import { useDemoStore } from './store/demoStore';
```

Inside the top-level component body (before the return), add:

```tsx
  const setLiveAvailable = useDemoStore((s) => s.setLiveAvailable);
  const { checkHealth } = useCXASAgent();
  useEffect(() => {
    let cancelled = false;
    void checkHealth().then((ok) => {
      if (!cancelled) setLiveAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [checkHealth, setLiveAvailable]);
```

(If `App.tsx` already imports `useEffect`/`useDemoStore`, do not duplicate the imports — merge them.)

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit && npx eslint src --max-warnings=0`
Expected: no errors. (Return to repo root after: `cd ..`.)

- [ ] **Step 4: Run frontend unit tests**

Run: `cd frontend && npm test -- --run && cd ..`
Expected: PASS (existing `demoStore.test.ts`, `scripts.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: probe backend health on load to enable live mode toggle"
```

---

## Task 12: Full end-to-end manual verification (EVIDENCE GATE)

**Files:** none (verification only). Uses `superpowers:verification-before-completion`.

- [ ] **Step 1: Start the backend (live mode)**

Run (background): `DEMO_MODE=live backend/.venv/bin/python -m uvicorn backend.api:app --port 8000`
Verify: `curl -s localhost:8000/api/health` → `{"cxas_reachable": true, "reason": "CXAS reachable.", "mode": "live"}`.

- [ ] **Step 2: One real chat turn over HTTP**

Run:
```bash
SID=$(curl -s -XPOST localhost:8000/api/session | backend/.venv/bin/python -c "import sys,json;print(json.load(sys.stdin)['session_id'])")
curl -s -XPOST localhost:8000/api/chat -H 'Content-Type: application/json' \
  -d "{\"session_id\":\"$SID\",\"message\":\"I want a relaxing spa weekend in Sedona under \$400, Thursday to Sunday.\",\"channel\":\"chat\"}" \
  | backend/.venv/bin/python -m json.tool
```
Expected: JSON with non-empty `agent_response` and (on the recommend turn) a `cards[0]` of `type: "property"` and a `site_action` navigate→search. Capture this output.

- [ ] **Step 3: Start the frontend**

Run (background): `cd frontend && npm install && npm run dev` (note the localhost URL, typically `http://localhost:5173`).

- [ ] **Step 4: Drive the live demo in a browser (Playwright MCP or manual)**

Using the browser: open the dev URL, open the presenter panel, switch mode to **Live** (the `liveAvailable` dot should be green), open the chat widget, send "I want a relaxing spa weekend in Sedona under $400, Thursday to Sunday." Observe: a real agent reply, a property card in chat, and the site navigating/highlighting. Take a screenshot as evidence.

- [ ] **Step 5: Run the entire test suite once more**

Run: `backend/.venv/bin/python -m pytest backend/tests -q && cd frontend && npm test -- --run && cd ..`
Expected: all PASS.

- [ ] **Step 6: Final report**

Summarize with evidence: the deployed `app_name`, the captured smoke-test output (Task 9 Step 4), the captured HTTP turn (Step 2), the screenshot (Step 4), and the passing test counts. State plainly what works and any caveat (e.g. if the payload path fell back to tool-response synthesis).

---

## Self-review notes (addressed)

- **Spec coverage:** app tree (T1), tools in real format (T2–T6), payload surfacing callback (T7), `cxas push` provisioning (T8), live deploy + smoke test (T9), backend billing/modality corrections (T10), frontend toggle health wiring (T11), full e2e (T12). All spec sections mapped.
- **Card/payload shapes** match `backend/tests/test_mapping.py` exactly (property/confirmation/confirmation_update/check_availability-data).
- **Method/name consistency:** tool function names == JSON `pythonFunction.name` == `displayName` == entries in `Concierge.json` `tools`. Data helpers (`pick_property`, `fmt_price`, `nights_between`, `confirmation_number`, `BY_ID`) are defined in T2 and used consistently in T3–T6.
- **Determinism:** `confirmation_number` uses `hashlib.sha256` (not salted `hash`) so tests are stable without env vars.
- **Risk/limit honored:** T9 Step 5 caps payload-path debugging at 3 attempts then STOP+report (global rule); the tool-response synthesis fallback means cards work even if the callback path doesn't.
