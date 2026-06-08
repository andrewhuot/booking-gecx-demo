#!/usr/bin/env python3
"""Provision (deploy) the Booking.com Concierge app to live CXAS via `cxas push`.

Configuration is environment-driven so you can point the demo at ANY GCP project
without editing code (see README → "Point this at your own GCP project"):

  * Reads defaults from .env / the environment via backend.config:
      GCP_PROJECT_ID (required), GCP_LOCATION, CXAS_APP_DISPLAY_NAME,
      CXAS_APP_ID, CXAS_MODEL.
  * Any of those can be overridden per run with CLI flags (see --help).

It lints the version-controlled app tree, pushes it (creating the app on first
run, overwriting it on reruns), creates or updates an API deployment, then
records the app/deployment resource names into agent/agent_config.json and .env
so the backend picks them up.

Examples:
  # Use everything from .env:
  backend/.venv/bin/python scripts/create_agent.py

  # Deploy an independent copy to a different project:
  backend/.venv/bin/python scripts/create_agent.py \\
      --project-id my-other-project --display-name "My Concierge" --app-id my-concierge

  # See exactly what it would do without touching GCP:
  backend/.venv/bin/python scripts/create_agent.py --dry-run

Requires: ADC auth (gcloud auth application-default login) and the cxas CLI
(installed with cxas-scrapi in backend/.venv).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
# Make the repo root importable so `backend.config` resolves when run as a script.
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.config import settings  # noqa: E402  (after sys.path setup)

DEFAULT_APP_DIR = REPO_ROOT / "agent" / "cxas_app" / "booking-concierge"
CONFIG_PATH = REPO_ROOT / "agent" / "agent_config.json"
ENV_PATH = REPO_ROOT / ".env"
DEFAULT_DEPLOYMENT_ID = "live-demo"

# Invoke the CLI as a module with the CURRENT interpreter (sys.executable). This
# avoids depending on the `cxas` console-script wrapper, whose baked-in absolute
# shebang breaks if the venv was created elsewhere or relocated.
CXAS = [sys.executable, "-m", "cxas_scrapi.cli.main"]
# A short, readable label for the CLI in printed commands.
CXAS_LABEL = "cxas"


def _run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    """Run a subprocess, capturing stdout/stderr, returning the completed proc."""
    print("  $", " ".join(cmd))
    return subprocess.run(cmd, cwd=str(REPO_ROOT), text=True, capture_output=True)


def _find_existing_app_name(project_id: str, location: str, display_name: str) -> str | None:
    """Return the resource name of an app with our display name, if it exists."""
    try:
        from cxas_scrapi import Apps
        apps = Apps(project_id=project_id, location=location)
        for app in apps.list_apps():
            if getattr(app, "display_name", None) == display_name:
                return app.name
    except Exception as exc:  # noqa: BLE001
        print(f"  ! could not list existing apps (continuing): {exc}")
    return None


def _extract_app_name(output: str) -> str | None:
    """Pull a projects/.../apps/<id> resource name out of push output."""
    m = re.search(r"projects/[^/\s]+/locations/[^/\s]+/apps/[^/\s\"']+", output)
    return m.group(0) if m else None


def _display_path(path: Path) -> Path:
    """Return a readable repo-relative path when possible."""
    try:
        return path.relative_to(REPO_ROOT)
    except ValueError:
        return path


def _find_cxas_app_dir(root: Path) -> Path:
    """Find the CXAS app directory under ``root`` by locating its app.json."""
    resolved = root.expanduser().resolve()
    if not resolved.exists():
        raise ValueError(f"App source does not exist: {resolved}")
    if (resolved / "app.json").is_file():
        return resolved

    candidates = sorted({path.parent for path in resolved.rglob("app.json")})
    if len(candidates) == 1:
        return candidates[0]

    preferred = [candidate for candidate in candidates if candidate.name == "booking-concierge"]
    if len(preferred) == 1:
        return preferred[0]

    if not candidates:
        raise ValueError(
            f"No CXAS app found under {resolved}. Expected app.json at the app root.",
        )

    formatted = ", ".join(str(_display_path(candidate)) for candidate in candidates[:5])
    raise ValueError(
        f"Found multiple CXAS app candidates under {resolved}: {formatted}. "
        "Pass --app-dir to the exact app directory.",
    )


def _is_within(parent: Path, child: Path) -> bool:
    """Return whether ``child`` is safely contained inside ``parent``."""
    return child == parent or parent in child.parents


def _extract_app_zip(zip_path: Path, extract_root: Path) -> Path:
    """Extract a CXAS app zip safely and return the resolved app directory."""
    resolved_zip = zip_path.expanduser().resolve()
    if not resolved_zip.is_file():
        raise ValueError(f"Agent zip does not exist: {resolved_zip}")
    if not zipfile.is_zipfile(resolved_zip):
        raise ValueError(f"Agent zip is not a valid zip file: {resolved_zip}")

    resolved_root = extract_root.expanduser().resolve()
    resolved_root.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(resolved_zip) as archive:
        for member in archive.infolist():
            if member.filename.startswith("/") or member.filename.strip() == "":
                raise ValueError(f"Agent zip contains unsafe path: {member.filename}")
            target = (resolved_root / member.filename).resolve()
            if not _is_within(resolved_root, target):
                raise ValueError(f"Agent zip contains unsafe path: {member.filename}")
        archive.extractall(resolved_root)

    return _find_cxas_app_dir(resolved_root)


def _write_config(
    *, project_id: str, location: str, display_name: str, app_id: str, model: str,
    app_name: str | None, deployment_id: str | None = None,
    deployment_name: str | None = None, version_name: str | None = None,
    app_dir: Path, provisioned: bool, note: str,
) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps({
        "provisioned": provisioned,
        "note": note,
        "project_id": project_id,
        "location": location,
        "app_display_name": display_name,
        "app_id": app_id,
        "app_name": app_name,
        "deployment_id": deployment_id,
        "deployment_name": deployment_name,
        "version_name": version_name,
        "app_dir": str(_display_path(app_dir)),
        "model": model,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"  -> wrote {_display_path(CONFIG_PATH)}")


def _upsert_env(app_name: str, deployment_id: str | None) -> None:
    """Set live CXAS resource values in .env, creating it from the template if needed."""
    if not ENV_PATH.exists():
        example = REPO_ROOT / ".env.example"
        if example.exists():
            ENV_PATH.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
    lines = ENV_PATH.read_text(encoding="utf-8").splitlines() if ENV_PATH.exists() else []
    values = {"CXAS_APP_NAME": app_name}
    if deployment_id:
        values["CXAS_DEPLOYMENT_ID"] = deployment_id

    out: list[str] = []
    found: set[str] = set()
    for line in lines:
        key = line.split("=", 1)[0] if "=" in line else ""
        if key in values:
            out.append(f"{key}={values[key]}")
            found.add(key)
            continue
        out.append(line)
    for key, value in values.items():
        if key not in found:
            out.append(f"{key}={value}")
    ENV_PATH.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"  -> set CXAS_APP_NAME in {_display_path(ENV_PATH)}")
    if deployment_id:
        print(f"  -> set CXAS_DEPLOYMENT_ID in {_display_path(ENV_PATH)}")


def _create_current_version(app_name: str) -> str:
    """Create a deployable version snapshot of the currently pushed app."""
    from cxas_scrapi import Versions

    versions = Versions(app_name=app_name)
    version = versions.create_version(
        display_name="Live demo",
        description="Created by scripts/create_agent.py for the Booking.com July 4 demo.",
    )
    return version.name


def _ensure_deployment(app_name: str, deployment_id: str, version_name: str) -> str:
    """Create or update the API deployment so it points at ``version_name``."""
    from cxas_scrapi import Deployments

    deployments = Deployments(app_name=app_name)
    deployment_name = f"{app_name}/deployments/{deployment_id}"
    existing_names = {deployment.name for deployment in deployments.list_deployments()}
    if deployment_name in existing_names:
        deployment = deployments.update_deployment(
            deployment_id=deployment_id,
            app_version=version_name,
        )
        return deployment.name

    deployment = deployments.create_deployment(
        deployment_id=deployment_id,
        display_name=deployment_id,
        app_version=version_name,
    )
    return deployment.name


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Provision the Booking.com Concierge app on CXAS (env-driven, CLI-overridable).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--project-id", default=settings.gcp_project_id,
                   help="GCP project id (default: $GCP_PROJECT_ID from .env).")
    p.add_argument("--location", default=settings.gcp_location,
                   help="CES/CXAS region (default: $GCP_LOCATION or 'us').")
    p.add_argument("--display-name", default=settings.cxas_app_display_name,
                   help="App display name (default: $CXAS_APP_DISPLAY_NAME).")
    p.add_argument("--app-id", default=settings.cxas_app_id,
                   help="App id for a new app (default: $CXAS_APP_ID).")
    p.add_argument("--model", default=settings.cxas_model,
                   help="Agent model (default: $CXAS_MODEL). Recorded in agent_config.json.")
    p.add_argument("--deployment-id", default=settings.cxas_deployment_id or DEFAULT_DEPLOYMENT_ID,
                   help=f"API deployment id to create/update (default: {DEFAULT_DEPLOYMENT_ID}).")
    source = p.add_mutually_exclusive_group()
    source.add_argument("--app-dir",
                        help="Path to a CXAS app directory. Defaults to agent/cxas_app/booking-concierge.")
    source.add_argument("--app-zip",
                        help="Path to an exported CXAS app zip. The zip may contain app.json at the root or in one nested app folder.")
    p.add_argument("--dry-run", action="store_true",
                   help="Print the resolved config and the commands that would run, then exit.")
    return p.parse_args()


def main() -> int:
    args = _parse_args()
    temp_dir: tempfile.TemporaryDirectory[str] | None = None
    try:
        if args.app_zip:
            temp_dir = tempfile.TemporaryDirectory(prefix="booking-cxas-app-")
            app_dir = _extract_app_zip(Path(args.app_zip), Path(temp_dir.name))
        elif args.app_dir:
            app_dir = _find_cxas_app_dir(Path(args.app_dir))
        else:
            app_dir = _find_cxas_app_dir(DEFAULT_APP_DIR)
    except ValueError as exc:
        print(f"\n  ! {exc}")
        if temp_dir is not None:
            temp_dir.cleanup()
        return 2

    project_id = (args.project_id or "").strip()
    location = (args.location or "us").strip()
    display_name = args.display_name
    app_id = args.app_id
    model = args.model
    deployment_id = args.deployment_id

    print("Provisioning the Booking.com Concierge on CXAS")
    print(f"  app_dir      = {_display_path(app_dir)}")
    if args.app_zip:
        print(f"  app_zip      = {Path(args.app_zip).expanduser()}")
    print(f"  project_id   = {project_id or '(unset)'}")
    print(f"  location     = {location}")
    print(f"  display_name = {display_name}")
    print(f"  app_id       = {app_id}")
    print(f"  model        = {model}")
    print(f"  deployment   = {deployment_id}")

    if not project_id:
        print(
            "\n  ! No GCP project configured. Set GCP_PROJECT_ID in .env "
            "(copy .env.example), or pass --project-id. See the README "
            "'Point this at your own GCP project' section.",
        )
        return 2

    if args.dry_run:
        print("\n[dry-run] Would run:")
        print(f"  {CXAS_LABEL} lint --app-dir {app_dir}")
        print(f"  {CXAS_LABEL} push --app-dir {app_dir} "
              f"(--to <existing> | --display-name {display_name!r}) "
              f"--project-id {project_id} --location {location}")
        print("  create a fresh app version, create/update an API deployment,")
        print("  then write agent/agent_config.json, CXAS_APP_NAME, and CXAS_DEPLOYMENT_ID into .env.")
        return 0

    # 1. Lint.
    lint = _run([*CXAS, "lint", "--app-dir", str(app_dir)])
    print(lint.stdout)
    if lint.returncode != 0:
        print(lint.stderr)
        print("  ! lint failed - fix the app tree before pushing.")
        _write_config(project_id=project_id, location=location, display_name=display_name,
                      app_id=app_id, model=model, app_name=None, provisioned=False,
                      deployment_id=deployment_id, deployment_name=None, version_name=None,
                      app_dir=app_dir, note="Lint failed; not pushed.")
        return 1

    # 2. Push (overwrite if an app with this display name already exists, else create).
    existing = _find_existing_app_name(project_id, location, display_name)
    if existing:
        print(f"  app exists, overwriting: {existing}")
        push = _run([*CXAS, "push", "--app-dir", str(app_dir), "--to", existing,
                     "--project-id", project_id, "--location", location])
    else:
        push = _run([*CXAS, "push", "--app-dir", str(app_dir),
                     "--display-name", display_name,
                     "--project-id", project_id, "--location", location])
    print(push.stdout)
    if push.returncode != 0:
        print(push.stderr)
        _write_config(project_id=project_id, location=location, display_name=display_name,
                      app_id=app_id, model=model, app_name=existing, provisioned=False,
                      deployment_id=deployment_id, deployment_name=None, version_name=None,
                      app_dir=app_dir, note="Push failed.")
        return 1

    app_name = _extract_app_name(push.stdout) or _extract_app_name(push.stderr) \
        or existing or _find_existing_app_name(project_id, location, display_name)
    if not app_name:
        print("  ! could not determine the deployed app name from output.")
        _write_config(project_id=project_id, location=location, display_name=display_name,
                      app_id=app_id, model=model, app_name=None, provisioned=False,
                      deployment_id=deployment_id, deployment_name=None, version_name=None,
                      app_dir=app_dir, note="Pushed but app name not captured.")
        return 1

    print("  creating deployable app version")
    version_name = _create_current_version(app_name)
    print(f"  version={version_name}")

    print(f"  ensuring API deployment: {deployment_id}")
    deployment_name = _ensure_deployment(app_name, deployment_id, version_name)
    print(f"  deployment={deployment_name}")

    _write_config(project_id=project_id, location=location, display_name=display_name,
                  app_id=app_id, model=model, app_name=app_name,
                  deployment_id=deployment_id, deployment_name=deployment_name,
                  version_name=version_name, app_dir=app_dir, provisioned=True,
                  note="Provisioned via cxas push.")
    _upsert_env(app_name, deployment_id)
    print("\nDeployment complete.")
    print(f"  CXAS_APP_NAME={app_name}")
    print(f"  CXAS_DEPLOYMENT_ID={deployment_id}")
    print("  Smoke test:  backend/.venv/bin/python scripts/test_agent.py")
    if temp_dir is not None:
        temp_dir.cleanup()
    return 0


if __name__ == "__main__":
    sys.exit(main())
