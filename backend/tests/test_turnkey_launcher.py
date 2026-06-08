"""Tests for the repo-root turnkey demo launcher script.

Run: backend/.venv/bin/python -m pytest backend/tests/test_turnkey_launcher.py -q
"""
from __future__ import annotations

import os
import socket
import subprocess
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "run_turnkey_demo.sh"
SETUP_SCRIPT = REPO_ROOT / "scripts" / "setup.sh"
EXPORT_SCRIPT = REPO_ROOT / "scripts" / "export_cxas_agent.sh"
BOOTSTRAP_SCRIPT = REPO_ROOT / "scripts" / "bootstrap_new_project.sh"


def _free_port() -> str:
    """Return a currently free localhost port for script smoke tests."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return str(sock.getsockname()[1])


def test_turnkey_launcher_is_executable_and_shell_syntax_valid():
    """The launcher is a real executable Bash script."""
    for script in (SCRIPT, SETUP_SCRIPT):
        assert script.exists()
        assert os.access(script, os.X_OK)

        result = subprocess.run(
            ["bash", "-n", str(script)],
            capture_output=True,
            text=True,
            check=False,
        )

        assert result.returncode == 0, result.stderr


def test_turnkey_launcher_help_explains_modes_routes_and_live_provisioning():
    """The help text tells demoers how to launch mock and live flows."""
    result = subprocess.run(
        [str(SCRIPT), "--help"],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0
    assert "--mode mock|live" in result.stdout
    assert "--provision-agent" in result.stdout
    assert "--prepare-gcp" in result.stdout
    assert "--agent-zip" in result.stdout
    assert "--deployment-id" in result.stdout
    assert "--backend-installer" in result.stdout
    assert "--pip-index-url" in result.stdout
    assert "--ignore-pip-config" in result.stdout
    assert "/google" in result.stdout
    assert "/google/live" in result.stdout
    assert "VITE_API_URL" in result.stdout
    assert "first free: 8000, 8001, 8002" in result.stdout


def test_turnkey_launcher_setup_only_configures_env_without_servers():
    """Setup-only mode writes launch env and exits without requiring deps."""
    env_path = REPO_ROOT / ".env"
    original_env = env_path.read_text(encoding="utf-8") if env_path.exists() else None
    backend_port = _free_port()
    frontend_port = _free_port()

    try:
        result = subprocess.run(
            [
                str(SCRIPT),
                "--setup-only",
                "--skip-install",
                "--no-open",
                "--frontend-port",
                frontend_port,
                "--backend-port",
                backend_port,
                "--mode",
                "mock",
            ],
            capture_output=True,
            text=True,
            check=False,
        )

        assert result.returncode == 0, result.stderr or result.stdout
        assert "--setup-only requested" in result.stdout
        env_text = env_path.read_text(encoding="utf-8")
        assert "DEMO_MODE=scripted" in env_text
        assert "VITE_DEMO_MODE=scripted" in env_text
        assert f"VITE_API_URL=http://127.0.0.1:{backend_port}" in env_text
    finally:
        if original_env is None:
            env_path.unlink(missing_ok=True)
        else:
            env_path.write_text(original_env, encoding="utf-8")


def test_migration_scripts_are_executable_and_shell_syntax_valid():
    """The migration helper scripts are executable Bash scripts."""
    for script in (EXPORT_SCRIPT, BOOTSTRAP_SCRIPT):
        assert script.exists()
        assert os.access(script, os.X_OK)

        result = subprocess.run(
            ["bash", "-n", str(script)],
            capture_output=True,
            text=True,
            check=False,
        )

        assert result.returncode == 0, result.stderr


def test_export_cxas_agent_creates_clean_zip(tmp_path):
    """The export script produces a portable zip with the CXAS app at the root."""
    output_zip = tmp_path / "booking-concierge-cxas-agent.zip"

    result = subprocess.run(
        [str(EXPORT_SCRIPT), "--output", str(output_zip)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert output_zip.exists()
    with zipfile.ZipFile(output_zip) as archive:
        names = set(archive.namelist())
    assert "app.json" in names
    assert "agents/Concierge/Concierge.json" in names
    assert "tools/search_properties/search_properties.json" in names
    assert not any("__pycache__" in name for name in names)


def test_bootstrap_new_project_help_describes_repo_and_zip_paths():
    """The new-project wrapper explains both source-tree and zip workflows."""
    result = subprocess.run(
        [str(BOOTSTRAP_SCRIPT), "--help"],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0
    assert "--project-id YOUR_PROJECT_ID" in result.stdout
    assert "--agent-zip" in result.stdout
    assert "--backend-installer" in result.stdout
    assert "--pip-index-url" in result.stdout
    assert "--ignore-pip-config" in result.stdout
    assert "new computer" in result.stdout.lower()


def test_setup_script_supports_pip_installer_dry_run():
    """A uv-blocked machine can choose the Python venv + pip backend installer."""
    result = subprocess.run(
        [str(SETUP_SCRIPT), "--dry-run", "--backend-installer", "pip"],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert "backend installer: pip" in result.stdout
    assert "using Python venv + pip backend installer" in result.stdout
    assert "python -m venv" in result.stdout


def test_setup_script_can_ignore_pip_config_and_use_public_index():
    """A locked pip config can be bypassed for this one setup command."""
    result = subprocess.run(
        [
            str(SETUP_SCRIPT),
            "--dry-run",
            "--backend-installer",
            "pip",
            "--ignore-pip-config",
            "--pip-index-url",
            "https://pypi.org/simple",
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert "ignoring pip config for backend dependency installs" in result.stdout
    assert "PIP_CONFIG_FILE=/dev/null" in result.stdout
    assert "--index-url https://pypi.org/simple" in result.stdout


def test_setup_script_auto_falls_back_to_pip_when_uv_is_missing(tmp_path):
    """Auto mode should not hard-fail just because uv is unavailable."""
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_python = fake_bin / "python3"
    fake_python.write_text(
        "#!/usr/bin/env bash\n"
        "case \"$*\" in\n"
        "  \"--version\") printf 'Python 3.12.0\\n'; exit 0 ;;\n"
        "  *) exit 0 ;;\n"
        "esac\n",
        encoding="utf-8",
    )
    fake_python.chmod(0o755)
    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}{os.pathsep}/bin{os.pathsep}/usr/bin"

    result = subprocess.run(
        [str(SETUP_SCRIPT), "--dry-run"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    assert "uv not found; falling back to Python venv + pip" in result.stdout


def test_setup_script_rejects_old_python_for_pip_installer(tmp_path):
    """Old Python versions fail FastAPI resolution, so setup should explain it."""
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_python = fake_bin / "python3"
    fake_python.write_text(
        "#!/usr/bin/env bash\n"
        "case \"$*\" in\n"
        "  \"--version\") printf 'Python 3.7.17\\n'; exit 0 ;;\n"
        "  *) exit 0 ;;\n"
        "esac\n",
        encoding="utf-8",
    )
    fake_python.chmod(0o755)
    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}{os.pathsep}/bin{os.pathsep}/usr/bin"

    result = subprocess.run(
        [str(SETUP_SCRIPT), "--dry-run", "--backend-installer", "pip"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )

    assert result.returncode == 1
    assert "Python 3.10+ is required" in result.stderr
    assert "Python 3.7.17" in result.stderr


def test_turnkey_launcher_prepare_gcp_derives_project_number(tmp_path):
    """New-computer live setup can prepare GCP and write env without hand edits."""
    env_path = REPO_ROOT / ".env"
    original_env = env_path.read_text(encoding="utf-8") if env_path.exists() else None
    backend_port = _free_port()
    frontend_port = _free_port()
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    gcloud_log = tmp_path / "gcloud.log"
    fake_gcloud = fake_bin / "gcloud"
    fake_gcloud.write_text(
        f"""#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> {gcloud_log}
case "$*" in
  "config set project demo-project") exit 0 ;;
  "auth application-default set-quota-project demo-project") exit 0 ;;
  "services enable ces.googleapis.com") exit 0 ;;
  "projects describe demo-project --format=value(projectNumber)") printf '987654321\\n'; exit 0 ;;
  *) echo "unexpected gcloud args: $*" >&2; exit 7 ;;
esac
""",
        encoding="utf-8",
    )
    fake_gcloud.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}{os.pathsep}{env['PATH']}"

    try:
        result = subprocess.run(
            [
                str(SCRIPT),
                "--setup-only",
                "--skip-install",
                "--no-open",
                "--frontend-port",
                frontend_port,
                "--backend-port",
                backend_port,
                "--mode",
                "live",
                "--prepare-gcp",
                "--project-id",
                "demo-project",
            ],
            capture_output=True,
            text=True,
            check=False,
            env=env,
        )

        assert result.returncode == 0, result.stderr or result.stdout
        assert "preparing GCP project demo-project" in result.stdout
        assert "derived GCP project number: 987654321" in result.stdout
        env_text = env_path.read_text(encoding="utf-8")
        assert "DEMO_MODE=live" in env_text
        assert "VITE_DEMO_MODE=live" in env_text
        assert "GCP_PROJECT_ID=demo-project" in env_text
        assert "GCP_PROJECT_NUMBER=987654321" in env_text
        assert f"VITE_API_URL=http://127.0.0.1:{backend_port}" in env_text
        gcloud_calls = gcloud_log.read_text(encoding="utf-8")
        assert "config set project demo-project" in gcloud_calls
        assert "auth application-default set-quota-project demo-project" in gcloud_calls
        assert "services enable ces.googleapis.com" in gcloud_calls
    finally:
        if original_env is None:
            env_path.unlink(missing_ok=True)
        else:
            env_path.write_text(original_env, encoding="utf-8")
