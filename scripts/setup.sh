#!/usr/bin/env bash
#
# setup.sh — provision the Python backend for the Booking.com GECX demo.
#
# Idempotent: safe to run repeatedly. Ensures the uv venv exists at
# backend/.venv, installs all Python deps (including cxas-scrapi from GitHub
# source — it is NOT on PyPI), copies .env.example -> .env if absent, and prints
# next steps.
#
# Usage:  ./scripts/setup.sh   (run from anywhere; it cd's to the repo root)

set -euo pipefail

# Resolve repo root from this script's location and work from there.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

VENV_DIR="backend/.venv"
VENV_PY="${VENV_DIR}/bin/python"

echo "==> Booking.com GECX demo — backend setup"
echo "    repo: ${REPO_ROOT}"

# --- 1. Ensure uv is available -------------------------------------------------
if ! command -v uv >/dev/null 2>&1; then
  echo "ERROR: 'uv' is not installed or not on PATH." >&2
  echo "       Install it from https://docs.astral.sh/uv/ and re-run." >&2
  exit 1
fi

# --- 2. Ensure the venv exists (it usually already does) -----------------------
if [ -x "${VENV_PY}" ]; then
  echo "==> venv already present at ${VENV_DIR} (reusing)"
else
  echo "==> creating venv at ${VENV_DIR} (python 3.12)"
  uv venv --python 3.12 "${VENV_DIR}"
fi

# --- 3. Install core dependencies ---------------------------------------------
echo "==> installing core deps (fastapi, uvicorn, pydantic, python-dotenv, pytest)"
uv pip install --python "${VENV_PY}" \
  fastapi "uvicorn[standard]" pydantic python-dotenv pytest

# --- 4. Install cxas-scrapi from GitHub source (NOT on PyPI) -------------------
echo "==> installing cxas-scrapi from GitHub source"
if uv pip install --python "${VENV_PY}" \
     "git+https://github.com/GoogleCloudPlatform/cxas-scrapi.git"; then
  echo "    cxas-scrapi installed."
else
  echo "WARNING: cxas-scrapi install failed. The API and unit tests still work" >&2
  echo "         (the SDK is imported lazily). Live mode needs it — retry later." >&2
fi

# --- 5. Seed .env from the example if missing ----------------------------------
if [ -f ".env" ]; then
  echo "==> .env already exists (leaving as-is)"
elif [ -f ".env.example" ]; then
  cp .env.example .env
  echo "==> created .env from .env.example"
else
  echo "==> no .env.example found; skipping .env creation"
fi

# --- 6. Next steps -------------------------------------------------------------
cat <<'EOF'

==> Setup complete. Next steps:

  1. (Optional) Provision the live CXAS agent — needs ADC credentials
     (gcloud auth application-default login) and the CES API enabled. First set
     GCP_PROJECT_ID in .env (copy .env.example), then run — it lints the app tree,
     pushes it, and writes CXAS_APP_NAME back into .env:
       backend/.venv/bin/python scripts/create_agent.py
     (Targeting your own project? See README - "Point this at your own GCP project".)

  2. Start the backend API:
       backend/.venv/bin/python -m uvicorn backend.api:app --port 8000

  3. Start the frontend (separate terminal):
       cd frontend && npm install && npm run dev

  4. Run the backend unit tests (no network / credentials needed):
       backend/.venv/bin/python -m pytest backend/tests -q

Scripted mode is the default demo path and needs no GCP access at all.
EOF
