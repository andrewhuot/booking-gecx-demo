#!/usr/bin/env python3
"""One-shot CXAS provisioner for the Booking.com GECX demo agent.

Reads the version-controlled agent definition from ``agent/`` (instructions,
four tool JSON files, guardrails) and provisions it on Google Cloud CXAS:

  1. create (or reuse) the app  "Booking.com Demo"
  2. create the LLM agent       (gemini-2.5-flash) with the instructions
  3. register the 4 tools        (search_properties, check_availability,
                                  create_booking, add_upsell)
  4. attach guardrails

RESILIENCE (required): the whole provisioning is wrapped in try/except. On the
known billing 403 (or any auth / connection / import error) it:
  (a) prints clear, formatted remediation steps (billing is disabled on project
      decent-courage-233916 and gcloud has no active account),
  (b) writes/refreshes ``agent/agent_config.json`` capturing the INTENDED config
      (app id, display name, model, instruction path, tool files, guardrails),
  (c) exits 0 (gracefully) so a rerun *after* billing is linked completes
      provisioning.

On success it writes the real returned app/agent resource names into
``agent/agent_config.json`` and reminds you to set CXAS_APP_NAME / CXAS_AGENT_ID
in ``.env``.

Run:  backend/.venv/bin/python scripts/create_agent.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

# --- Paths (repo-root relative) ------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[1]
AGENT_DIR = REPO_ROOT / "agent"
TOOLS_DIR = AGENT_DIR / "tools"
GUARDRAILS_DIR = AGENT_DIR / "guardrails"
INSTRUCTIONS_PATH = AGENT_DIR / "instructions.txt"
GUARDRAILS_PATH = GUARDRAILS_DIR / "system_guardrails.txt"
CONFIG_PATH = AGENT_DIR / "agent_config.json"

# --- Intended provisioning constants ------------------------------------------
PROJECT_ID = "decent-courage-233916"
PROJECT_NUMBER = "1078946815141"
LOCATION = "us"  # CES/CXAS region is 'us' (global → 404)
APP_ID = "booking-demo"
APP_DISPLAY_NAME = "Booking.com Demo"
AGENT_ID = "concierge"
AGENT_DISPLAY_NAME = "Booking.com Concierge"
MODEL = "gemini-2.5-flash"

TOOL_FILES = [
    "search_properties.json",
    "check_availability.json",
    "create_booking.json",
    "add_upsell.json",
]

# Substrings identifying the known "billing not enabled" / permission failure.
_BILLING_HINTS = ("billing", "permission_denied", "permissiondenied", "403")


def _read_text(path: Path) -> str:
    """Read a UTF-8 text file, returning '' if it does not exist."""
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _load_tool_payloads() -> dict[str, dict[str, Any]]:
    """Load the four tool JSON definitions keyed by filename."""
    payloads: dict[str, dict[str, Any]] = {}
    for filename in TOOL_FILES:
        path = TOOLS_DIR / filename
        try:
            payloads[filename] = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"  ! could not load tool {filename}: {exc}")
    return payloads


def _build_config(
    *,
    provisioned: bool,
    app_name: str | None = None,
    agent_name: str | None = None,
    registered_tools: list[str] | None = None,
    guardrail_name: str | None = None,
    note: str = "",
) -> dict[str, Any]:
    """Assemble the agent_config.json contents (intended or provisioned)."""
    return {
        "provisioned": provisioned,
        "note": note,
        "project_id": PROJECT_ID,
        "project_number": PROJECT_NUMBER,
        "location": LOCATION,
        "app_id": APP_ID,
        "app_display_name": APP_DISPLAY_NAME,
        "app_name": app_name,  # full resource path once provisioned
        "agent_id": AGENT_ID,
        "agent_display_name": AGENT_DISPLAY_NAME,
        "agent_name": agent_name,  # full resource path once provisioned
        "model": MODEL,
        "instruction_path": str(INSTRUCTIONS_PATH.relative_to(REPO_ROOT)),
        "tool_files": [str((TOOLS_DIR / f).relative_to(REPO_ROOT)) for f in TOOL_FILES],
        "registered_tools": registered_tools or [],
        "guardrails_path": str(GUARDRAILS_PATH.relative_to(REPO_ROOT)),
        "guardrail_name": guardrail_name,
    }


def _write_config(config: dict[str, Any]) -> None:
    """Persist agent_config.json (creating the directory if needed)."""
    AGENT_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    print(f"  → wrote {CONFIG_PATH.relative_to(REPO_ROOT)}")


def _is_billing_error(exc: BaseException) -> bool:
    """Heuristically detect the billing/permission 403."""
    return any(hint in str(exc).lower() for hint in _BILLING_HINTS)


def _print_billing_blocked(exc: BaseException) -> None:
    """Print formatted remediation instructions for the billing block."""
    billing = _is_billing_error(exc)
    bar = "=" * 78
    print()
    print(bar)
    if billing:
        print("  CXAS PROVISIONING BLOCKED — BILLING NOT ENABLED")
    else:
        print("  CXAS PROVISIONING BLOCKED — CXAS UNAVAILABLE")
    print(bar)
    print(f"  Reason: {exc}")
    print()
    if billing:
        print(f"  The Conversational Agents (CES/CXAS) API is enabled on project")
        print(f"  {PROJECT_ID} (number {PROJECT_NUMBER}) and Application Default")
        print("  Credentials work, BUT the project has no billing account linked,")
        print("  so CXAS calls return 403 PermissionDenied.")
        print()
        print("  To enable live mode, link a billing account:")
        print(f"    1. Open: https://console.cloud.google.com/billing/linkedaccount?project={PROJECT_ID}")
        print(f"    2. Link an active billing account to project {PROJECT_ID}.")
        print("    3. (CLI alternative, requires an authenticated gcloud account —")
        print("        note: there is currently NO active gcloud account, only ADC):")
        print(f"           gcloud billing projects link {PROJECT_ID} \\")
        print("             --billing-account=<BILLING_ACCOUNT_ID>")
        print(f"    4. Re-run this script: backend/.venv/bin/python scripts/create_agent.py")
    else:
        print("  Could not reach CXAS. Check credentials / network, then re-run:")
        print("    backend/.venv/bin/python scripts/create_agent.py")
    print()
    print("  The intended agent configuration has been preserved in")
    print(f"  {CONFIG_PATH.relative_to(REPO_ROOT)} — a single rerun after billing is")
    print("  linked will complete provisioning. Scripted mode works regardless.")
    print(bar)
    print()


def provision() -> int:
    """Provision the agent. Returns a process exit code (always 0-ish)."""
    print("Provisioning Booking.com GECX demo agent on CXAS...")
    print(f"  project={PROJECT_ID}  location={LOCATION}  model={MODEL}")

    instructions = _read_text(INSTRUCTIONS_PATH)
    guardrail_text = _read_text(GUARDRAILS_PATH)
    tool_payloads = _load_tool_payloads()
    if not instructions:
        print(f"  ! instructions not found at {INSTRUCTIONS_PATH} — aborting.")
        return 1
    print(f"  loaded instructions ({len(instructions)} chars), "
          f"{len(tool_payloads)} tools, guardrails={'yes' if guardrail_text else 'no'}")

    try:
        # Lazy import so this file parses even without the SDK installed.
        from cxas_scrapi import Agents, Apps, Guardrails, Tools

        app_parent_apps = Apps(project_id=PROJECT_ID, location=LOCATION)

        # 1. Create (or reuse) the app -----------------------------------------
        app_name: str
        existing_app = app_parent_apps.get_app_by_display_name(APP_DISPLAY_NAME)
        if existing_app is not None and getattr(existing_app, "name", None):
            app_name = existing_app.name
            print(f"  reusing existing app: {app_name}")
        else:
            app = app_parent_apps.create_app(
                app_id=APP_ID,
                display_name=APP_DISPLAY_NAME,
                description="Booking.com GECX conversational booking demo.",
            )
            app_name = app.name
            print(f"  created app: {app_name}")

        # 2. Create the LLM agent ----------------------------------------------
        agents = Agents(app_name=app_name)
        agent = agents.create_agent(
            display_name=AGENT_DISPLAY_NAME,
            agent_id=AGENT_ID,
            agent_type="llm",
            model=MODEL,
            instruction=instructions,
        )
        agent_name = getattr(agent, "name", None)
        print(f"  created agent: {agent_name}")

        # 3. Register the 4 tools ----------------------------------------------
        tools_client = Tools(app_name=app_name)
        registered_tools: list[str] = []
        for filename, payload in tool_payloads.items():
            tool_id = str(payload.get("name") or Path(filename).stem)
            try:
                created = tools_client.create_tool(
                    tool_id=tool_id,
                    display_name=tool_id,
                    payload=payload,
                    tool_type="python_function",
                    description=str(payload.get("description", "")),
                )
                registered_tools.append(getattr(created, "name", tool_id) or tool_id)
                print(f"    registered tool: {tool_id}")
            except Exception as tool_exc:  # noqa: BLE001 - keep registering others
                print(f"    ! tool {tool_id} failed: {tool_exc}")

        # 4. Attach guardrails -------------------------------------------------
        guardrail_name: str | None = None
        if guardrail_text:
            try:
                guardrail = Guardrails(app_name=app_name).create_guardrail(
                    guardrail_id="booking-scope",
                    display_name="Booking scope guardrail",
                    payload={
                        # Free-form policy text → llm_policy guardrail type.
                        # TODO: verify the exact guardrail payload schema against
                        # live CXAS once billing is enabled.
                        "llm_policy": {"policy": guardrail_text}
                    },
                    description="Travel/booking scope, no fabricated data, no PII.",
                )
                guardrail_name = getattr(guardrail, "name", None)
                print(f"  attached guardrail: {guardrail_name}")
            except Exception as g_exc:  # noqa: BLE001 - non-fatal
                print(f"  ! guardrail attach failed (non-fatal): {g_exc}")

        # Success → persist real resource names.
        config = _build_config(
            provisioned=True,
            app_name=app_name,
            agent_name=agent_name,
            registered_tools=registered_tools,
            guardrail_name=guardrail_name,
            note="Provisioned successfully against live CXAS.",
        )
        _write_config(config)

        print()
        print("Provisioning complete.")
        print("  Put these in your .env:")
        print(f"    CXAS_APP_NAME={app_name}")
        print(f"    CXAS_AGENT_ID={agent_name}")
        print("  Then run the live smoke test:")
        print("    backend/.venv/bin/python scripts/test_agent.py")
        return 0

    except Exception as exc:  # noqa: BLE001 - resilient: never crash on outage
        # Persist the INTENDED config so a rerun after billing completes setup.
        config = _build_config(
            provisioned=False,
            note=(
                "Provisioning blocked (billing not enabled or CXAS unavailable). "
                "Intended config preserved; rerun after billing is linked."
            ),
        )
        _write_config(config)
        _print_billing_blocked(exc)
        # Exit gracefully (0) so this is a non-crashing, rerunnable step.
        return 0


if __name__ == "__main__":
    sys.exit(provision())
