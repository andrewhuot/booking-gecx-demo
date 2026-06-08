"""Unit tests for scripts/create_agent.py helpers."""
from __future__ import annotations

import importlib.util
import json
import zipfile
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
        app_dir=module.REPO_ROOT / "agent" / "cxas_app" / "booking-concierge",
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
    assert data["app_dir"] == "agent/cxas_app/booking-concierge"


def test_find_cxas_app_dir_accepts_nested_export(tmp_path):
    """A downloaded or exported bundle may contain the app inside one folder."""
    module = _load_create_agent_module()
    app_dir = tmp_path / "booking-concierge"
    app_dir.mkdir()
    (app_dir / "app.json").write_text("{}", encoding="utf-8")
    (app_dir / "agents").mkdir()

    assert module._find_cxas_app_dir(tmp_path) == app_dir


def test_extract_app_zip_finds_root_app_json(tmp_path):
    """Zip imports should work when app.json is at the zip root."""
    module = _load_create_agent_module()
    zip_path = tmp_path / "booking-concierge.zip"
    extract_root = tmp_path / "extracted"
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("app.json", "{}")
        archive.writestr("agents/Concierge/Concierge.json", "{}")

    app_dir = module._extract_app_zip(zip_path, extract_root)

    assert app_dir == extract_root
    assert (app_dir / "app.json").exists()


def test_extract_app_zip_rejects_path_traversal(tmp_path):
    """Imported zip files must not write outside the extraction directory."""
    module = _load_create_agent_module()
    zip_path = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("../app.json", "{}")

    try:
        module._extract_app_zip(zip_path, tmp_path / "extracted")
    except ValueError as exc:
        assert "unsafe path" in str(exc)
    else:
        raise AssertionError("expected unsafe zip path to be rejected")


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
