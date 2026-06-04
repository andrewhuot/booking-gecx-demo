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
    """Run a subprocess, capturing stdout/stderr, returning the completed proc."""
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
    print(f"  -> wrote {CONFIG_PATH.relative_to(REPO_ROOT)}")


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
    print(f"  -> set CXAS_APP_NAME in {ENV_PATH.relative_to(REPO_ROOT)}")


def main() -> int:
    print("Deploying Booking.com Concierge to live CXAS...")
    print(f"  app_dir={APP_DIR.relative_to(REPO_ROOT)}  project={PROJECT_ID}  location={LOCATION}")

    # 1. Lint.
    lint = _run([CXAS, "lint", "--app-dir", str(APP_DIR)])
    print(lint.stdout)
    if lint.returncode != 0:
        print(lint.stderr)
        print("  ! lint failed - fix the app tree before pushing.")
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
