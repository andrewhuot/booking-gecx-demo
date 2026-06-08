"""Unit tests for scripts/create_agent.py helpers."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "create_agent.py"


def _load_create_agent_module():
    """Load create_agent.py as an importable module for helper tests."""
    spec = importlib.util.spec_from_file_location("create_agent_for_tests", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_write_config_records_deployment_id_and_version(tmp_path, monkeypatch):
    module = _load_create_agent_module()
    config_path = tmp_path / "agent_config.json"
    monkeypatch.setattr(module, "CONFIG_PATH", config_path)

    module._write_config(
        project_id="demo-project",
        location="us",
        display_name="Booking.com Concierge Demo",
        app_id="booking-concierge",
        model="gemini-2.5-flash",
        app_name="projects/demo-project/locations/us/apps/app-1",
        deployment_id="live-demo",
        deployment_name="projects/demo-project/locations/us/apps/app-1/deployments/live-demo",
        version_name="projects/demo-project/locations/us/apps/app-1/versions/version-1",
        provisioned=True,
        note="Provisioned via cxas push.",
    )

    data = json.loads(config_path.read_text(encoding="utf-8"))
    assert data["app_name"] == "projects/demo-project/locations/us/apps/app-1"
    assert data["deployment_id"] == "live-demo"
    assert data["deployment_name"] == (
        "projects/demo-project/locations/us/apps/app-1/deployments/live-demo"
    )
    assert data["version_name"] == (
        "projects/demo-project/locations/us/apps/app-1/versions/version-1"
    )


def test_upsert_env_records_app_and_deployment(tmp_path, monkeypatch):
    module = _load_create_agent_module()
    env_path = tmp_path / ".env"
    env_path.write_text(
        "CXAS_APP_NAME=old-app\nCXAS_DEPLOYMENT_ID=old-deployment\nDEMO_MODE=live\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(module, "ENV_PATH", env_path)

    module._upsert_env(
        app_name="projects/demo-project/locations/us/apps/app-1",
        deployment_id="live-demo",
    )

    env_text = env_path.read_text(encoding="utf-8")
    assert "CXAS_APP_NAME=projects/demo-project/locations/us/apps/app-1" in env_text
    assert "CXAS_DEPLOYMENT_ID=live-demo" in env_text
    assert "DEMO_MODE=live" in env_text
