#!/usr/bin/env python3
"""Live smoke test for the Booking.com GECX demo agent.

Runs the 3 golden scenarios (Rachel / David / Melissa — intent → match → book →
upsell) against the LIVE CXAS agent via the backend ``CXASClient``, printing each
agent reply and the parsed structured payload mapped into the frontend's card /
site_action shapes.

This is the live smoke test for when billing is enabled. Until then it catches
CXAS-unavailability and prints the billing-blocked notice instead of crashing.

Run:  backend/.venv/bin/python scripts/test_agent.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Make the repo root importable so ``backend`` resolves when run as a script.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.cxas_client import CXASClient, CXASUnavailable  # noqa: E402
from backend.mapping import map_structured_response  # noqa: E402

# Each scenario is a list of (channel, user_message) turns that walk the funnel.
GOLDEN_SCENARIOS: dict[str, list[tuple[str, str]]] = {
    "Rachel (web chat)": [
        ("chat", "I need a vacation. Something relaxing, not a big city. Maybe a few days?"),
        ("chat", "US. Spa and wellness, 100%. Budget around $250-400 a night."),
        ("chat", "Yes - Thursday to Sunday next week. Rachel Nguyen, Visa on file."),
        ("chat", "Add the spa package."),
    ],
    "David (voice call)": [
        ("voice", "My anniversary is coming up and I want to plan something special, nothing too far from Austin."),
        ("voice", "Pampered - my wife wants a real spa trip. Under five hundred a night."),
        ("voice", "Our anniversary is November 8th, Friday through Sunday. Book it to my Genius Visa."),
        ("voice", "Add the couples package."),
    ],
    "Melissa (mobile chat)": [
        ("mobile", "I need a solo reset - work has been nonstop. Something immersive and wellness-focused."),
        ("mobile", "Two weeks from now, Wednesday through Friday. Up to $350 a night."),
        ("mobile", "Book it to my Mastercard on file."),
        ("mobile", "Yes, add the intention setting session."),
    ],
}


def _print_turn(turn_no: int, channel: str, user_message: str, structured: dict) -> None:
    """Pretty-print one turn: user input, agent reply, and mapped output."""
    mapped = map_structured_response(structured)
    print(f"  ── Turn {turn_no} [{channel}] ──")
    print(f"    user : {user_message}")
    print(f"    agent: {mapped['agent_response']}")
    if mapped["cards"]:
        print(f"    cards: {json.dumps(mapped['cards'], ensure_ascii=False)}")
    if mapped["site_action"]:
        print(f"    site_action: {json.dumps(mapped['site_action'], ensure_ascii=False)}")
    print()


def run() -> int:
    """Execute the golden scenarios; never crash if CXAS is unavailable."""
    client = CXASClient()

    # Quick reachability probe so we fail fast with a clear message.
    status = client.health()
    print(f"CXAS health: reachable={status['cxas_reachable']} — {status['reason']}\n")
    if not status["cxas_reachable"]:
        print("Skipping live scenarios: CXAS is not reachable (see reason above).")
        print("Once billing is enabled and the agent is provisioned, rerun this script.")
        return 0

    overall_ok = True
    for name, turns in GOLDEN_SCENARIOS.items():
        print("=" * 78)
        print(f"  SCENARIO: {name}")
        print("=" * 78)
        try:
            session_id = client.start_session()
            print(f"  session_id: {session_id}\n")
            for i, (channel, message) in enumerate(turns, start=1):
                structured = client.run_turn(session_id=session_id, text=message, channel=channel)
                _print_turn(i, channel, message, structured)
        except CXASUnavailable as exc:
            overall_ok = False
            print(f"  ! CXAS unavailable mid-scenario: {exc.reason}")
            print("  Stopping scenarios; rerun after billing is enabled.\n")
            break

    print("=" * 78)
    print("Live smoke test complete." if overall_ok else "Live smoke test halted (CXAS unavailable).")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(run())
