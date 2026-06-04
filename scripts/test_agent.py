#!/usr/bin/env python3
"""Live smoke test for the Booking.com GECX demo agent.

Runs the 3 golden scenarios (Rachel / David / Melissa — intent → match → book →
upsell) against the LIVE CXAS agent via the backend ``CXASClient``, printing each
agent reply and the parsed structured payload mapped into the frontend's card /
site_action shapes.

This is the live smoke test against the provisioned CXAS agent. It catches
CXAS-unavailability (rate-limit/permission/connection) and prints a clear notice
instead of crashing.

NOTE ON QUOTA: the project's ``RunSession LLM tokens`` quota is per-minute and
the concierge prompt is large, so running every scenario's turns back-to-back can
hit ``429`` rate limits. ``CXASClient.run_turn`` retries 429s with backoff; this
script also paces turns. Pass ``--scenario rachel`` (default runs only the first
scenario) to keep token usage modest. Request a quota increase for
``ces.googleapis.com`` to run the full suite at speed.

Run:  backend/.venv/bin/python scripts/test_agent.py
      backend/.venv/bin/python scripts/test_agent.py --all   # all 3 scenarios
"""

from __future__ import annotations

import argparse
import json
import sys
import time
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


def run(scenarios: dict[str, list[tuple[str, str]]], pace_seconds: float) -> int:
    """Execute the given scenarios; never crash if CXAS is unavailable."""
    client = CXASClient()

    # Quick reachability probe so we fail fast with a clear message.
    status = client.health()
    print(f"CXAS health: reachable={status['cxas_reachable']} — {status['reason']}\n")
    if not status["cxas_reachable"]:
        print("Skipping live scenarios: CXAS is not reachable (see reason above).")
        print("Provision the agent (scripts/create_agent.py) and ensure ADC creds, then rerun.")
        return 0

    overall_ok = True
    for name, turns in scenarios.items():
        print("=" * 78)
        print(f"  SCENARIO: {name}")
        print("=" * 78)
        try:
            session_id = client.start_session()
            print(f"  session_id: {session_id}\n")
            for i, (channel, message) in enumerate(turns, start=1):
                structured = client.run_turn(session_id=session_id, text=message, channel=channel)
                _print_turn(i, channel, message, structured)
                # Pace turns to respect the per-minute LLM-token quota.
                if pace_seconds > 0 and i < len(turns):
                    time.sleep(pace_seconds)
        except CXASUnavailable as exc:
            overall_ok = False
            print(f"  ! CXAS unavailable mid-scenario: {exc.reason}")
            print("  Stopping scenarios; wait for the quota window or raise the quota, then rerun.\n")
            break

    print("=" * 78)
    print("Live smoke test complete." if overall_ok else "Live smoke test halted (CXAS unavailable).")
    print("=" * 78)
    return 0


def main() -> int:
    """Parse args and run the smoke test (one scenario by default)."""
    parser = argparse.ArgumentParser(description="Live CXAS smoke test for the concierge agent.")
    parser.add_argument("--all", action="store_true", help="Run all three golden scenarios.")
    parser.add_argument(
        "--scenario",
        choices=list(GOLDEN_SCENARIOS.keys()),
        help="Run a single named scenario (default: the first scenario).",
    )
    parser.add_argument(
        "--pace-seconds", type=float, default=20.0,
        help="Seconds to wait between turns to respect the per-minute token quota.",
    )
    args = parser.parse_args()

    if args.all:
        scenarios = GOLDEN_SCENARIOS
    elif args.scenario:
        scenarios = {args.scenario: GOLDEN_SCENARIOS[args.scenario]}
    else:
        first = next(iter(GOLDEN_SCENARIOS))
        scenarios = {first: GOLDEN_SCENARIOS[first]}
    return run(scenarios, pace_seconds=args.pace_seconds)


if __name__ == "__main__":
    sys.exit(main())
