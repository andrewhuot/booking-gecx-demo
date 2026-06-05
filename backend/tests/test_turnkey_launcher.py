"""Tests for the repo-root turnkey demo launcher script.

Run: backend/.venv/bin/python -m pytest backend/tests/test_turnkey_launcher.py -q
"""
from __future__ import annotations

import os
import socket
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "run_turnkey_demo.sh"


def _free_port() -> str:
    """Return a currently free localhost port for script smoke tests."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return str(sock.getsockname()[1])


def test_turnkey_launcher_is_executable_and_shell_syntax_valid():
    """The launcher is a real executable Bash script."""
    assert SCRIPT.exists()
    assert os.access(SCRIPT, os.X_OK)

    result = subprocess.run(
        ["bash", "-n", str(SCRIPT)],
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
