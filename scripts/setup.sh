#!/usr/bin/env bash
#
# setup.sh — provision the Python backend for the Booking.com GECX demo.
#
# Idempotent: safe to run repeatedly. Ensures the backend venv exists at
# backend/.venv, installs all Python deps (including cxas-scrapi from GitHub
# source — it is NOT on PyPI), copies .env.example -> .env if absent, and prints
# next steps. Uses uv when available, or Python venv + pip when uv is blocked.
#
# Usage:  ./scripts/setup.sh   (run from anywhere; it cd's to the repo root)

set -euo pipefail

BACKEND_INSTALLER="${BOOKING_DEMO_BACKEND_INSTALLER:-auto}"
PIP_INDEX_URL_OVERRIDE="${BOOKING_DEMO_PIP_INDEX_URL:-}"
IGNORE_PIP_CONFIG="${BOOKING_DEMO_IGNORE_PIP_CONFIG:-0}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/setup.sh [options]

Provision the Python backend environment for the Booking.com GECX demo.

Options:
  --backend-installer auto|uv|pip   Backend installer to use. auto prefers uv
                                    and falls back to Python venv + pip.
  --pip-index-url URL               Use this package index for pip installs
                                    during this run only.
  --ignore-pip-config               Ignore user/global pip config for backend
                                    dependency installs during this run.
  --dry-run                         Print the selected install commands only.
  -h, --help                        Show this help.
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_value() {
  local option="$1"
  local value="${2:-}"
  if [[ -z "${value}" || "${value}" == --* ]]; then
    die "${option} requires a value."
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-installer)
      need_value "$1" "${2:-}"
      BACKEND_INSTALLER="$2"
      shift 2
      ;;
    --backend-installer=*)
      BACKEND_INSTALLER="${1#*=}"
      shift
      ;;
    --pip-index-url)
      need_value "$1" "${2:-}"
      PIP_INDEX_URL_OVERRIDE="$2"
      shift 2
      ;;
    --pip-index-url=*)
      PIP_INDEX_URL_OVERRIDE="${1#*=}"
      shift
      ;;
    --ignore-pip-config)
      IGNORE_PIP_CONFIG=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1. Run ./scripts/setup.sh --help."
      ;;
  esac
done

case "${BACKEND_INSTALLER}" in
  auto|uv|pip)
    ;;
  *)
    die "--backend-installer must be auto, uv, or pip."
    ;;
esac

# Resolve repo root from this script's location and work from there.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

VENV_DIR="backend/.venv"
VENV_PY="${VENV_DIR}/bin/python"
PYTHON_BIN=""
SELECTED_INSTALLER=""
MIN_PYTHON_MAJOR=3
MIN_PYTHON_MINOR=10

echo "==> Booking.com GECX demo — backend setup"
echo "    repo: ${REPO_ROOT}"
echo "==> backend installer: ${BACKEND_INSTALLER}"
if [[ "${IGNORE_PIP_CONFIG}" == "1" ]]; then
  echo "==> ignoring pip config for backend dependency installs"
fi
if [[ -n "${PIP_INDEX_URL_OVERRIDE}" ]]; then
  echo "==> pip index override: ${PIP_INDEX_URL_OVERRIDE}"
fi

run_cmd() {
  printf '  $'
  printf ' %q' "$@"
  printf '\n'
  if [[ "${DRY_RUN}" -eq 0 ]]; then
    "$@"
  fi
}

run_pip_cmd() {
  if [[ "${IGNORE_PIP_CONFIG}" == "1" ]]; then
    printf '  $ PIP_CONFIG_FILE=/dev/null'
    printf ' %q' "$@"
    printf '\n'
    if [[ "${DRY_RUN}" -eq 0 ]]; then
      PIP_CONFIG_FILE=/dev/null "$@"
    fi
    return
  fi

  run_cmd "$@"
}

run_pip_install() {
  if [[ -n "${PIP_INDEX_URL_OVERRIDE}" ]]; then
    run_pip_cmd "${VENV_PY}" -m pip install --index-url "${PIP_INDEX_URL_OVERRIDE}" "$@"
    return
  fi

  run_pip_cmd "${VENV_PY}" -m pip install "$@"
}

find_python() {
  if command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3.12)"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
  else
    PYTHON_BIN=""
  fi
}

python_version_string() {
  local python_bin="$1"
  "${python_bin}" --version 2>&1 | awk '{print $2}'
}

check_python_version() {
  local python_bin="$1"
  local label="$2"
  local version major minor
  version="$(python_version_string "${python_bin}")"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"

  if [[ ! "${major}" =~ ^[0-9]+$ || ! "${minor}" =~ ^[0-9]+$ ]]; then
    die "Could not parse ${label} version from '${version}'. Install Python 3.12 and rerun."
  fi

  if (( major < MIN_PYTHON_MAJOR || (major == MIN_PYTHON_MAJOR && minor < MIN_PYTHON_MINOR) )); then
    die "${label} ${version} is too old. Python 3.10+ is required for this demo, and Python 3.12 is recommended. Install Python 3.12, then rerun with --backend-installer pip."
  fi
}

select_installer() {
  if [[ "${BACKEND_INSTALLER}" == "uv" ]]; then
    command -v uv >/dev/null 2>&1 || die "uv is not installed or not on PATH. Re-run with --backend-installer pip if uv is blocked."
    SELECTED_INSTALLER="uv"
    return
  fi

  if [[ "${BACKEND_INSTALLER}" == "pip" ]]; then
    find_python
    [[ -n "${PYTHON_BIN}" ]] || die "python3.12 or python3 is required for --backend-installer pip."
    check_python_version "${PYTHON_BIN}" "Selected Python"
    SELECTED_INSTALLER="pip"
    return
  fi

  if command -v uv >/dev/null 2>&1; then
    SELECTED_INSTALLER="uv"
    return
  fi

  echo "==> uv not found; falling back to Python venv + pip"
  find_python
  [[ -n "${PYTHON_BIN}" ]] || die "uv is unavailable and python3.12/python3 was not found."
  check_python_version "${PYTHON_BIN}" "Selected Python"
  SELECTED_INSTALLER="pip"
}

select_installer

# --- 2. Ensure the venv exists (it usually already does) -----------------------
if [[ "${SELECTED_INSTALLER}" == "uv" ]]; then
  echo "==> using uv backend installer"
elif [[ "${SELECTED_INSTALLER}" == "pip" ]]; then
  echo "==> using Python venv + pip backend installer (python -m venv)"
fi

if [[ -x "${VENV_PY}" ]]; then
  echo "==> venv already present at ${VENV_DIR} (reusing)"
else
  if [[ "${SELECTED_INSTALLER}" == "uv" ]]; then
    echo "==> creating venv at ${VENV_DIR} (python 3.12)"
    run_cmd uv venv --python 3.12 "${VENV_DIR}"
  else
    echo "==> creating venv at ${VENV_DIR} with python -m venv"
    run_cmd "${PYTHON_BIN}" -m venv "${VENV_DIR}"
  fi
fi

if [[ "${SELECTED_INSTALLER}" == "pip" && "${DRY_RUN}" -eq 0 ]]; then
  check_python_version "${VENV_PY}" "Backend venv Python"
fi

# --- 3. Install core dependencies ---------------------------------------------
echo "==> installing core deps (fastapi, uvicorn, pydantic, python-dotenv, pytest)"
if [[ "${SELECTED_INSTALLER}" == "uv" ]]; then
  run_cmd uv pip install --python "${VENV_PY}" \
    fastapi "uvicorn[standard]" pydantic python-dotenv pytest
else
  if [[ "${DRY_RUN}" -eq 0 && ! -x "${VENV_PY}" ]]; then
    die "venv python was not created at ${VENV_PY}."
  fi
  run_pip_cmd "${VENV_PY}" -m ensurepip --upgrade
  run_pip_install --upgrade pip
  run_pip_install fastapi "uvicorn[standard]" pydantic python-dotenv pytest
fi

# --- 4. Install cxas-scrapi from GitHub source (NOT on PyPI) -------------------
echo "==> installing cxas-scrapi from GitHub source"
if [[ "${SELECTED_INSTALLER}" == "uv" ]]; then
  if run_cmd uv pip install --python "${VENV_PY}" \
       "git+https://github.com/GoogleCloudPlatform/cxas-scrapi.git"; then
    echo "    cxas-scrapi installed."
  else
    echo "WARNING: cxas-scrapi install failed. The API and unit tests still work" >&2
    echo "         (the SDK is imported lazily). Live mode needs it — retry later." >&2
  fi
else
  if run_pip_install "git+https://github.com/GoogleCloudPlatform/cxas-scrapi.git"; then
    echo "    cxas-scrapi installed."
  else
    echo "WARNING: cxas-scrapi install failed. The API and unit tests still work" >&2
    echo "         (the SDK is imported lazily). Live mode needs it — retry later." >&2
  fi
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

  1. Easiest live setup on a new computer / new GCP project:
       gcloud auth login
       gcloud auth application-default login
       ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID

  2. Manual live agent provisioning — needs ADC credentials and the CES API
     enabled. First set GCP_PROJECT_ID in .env (copy .env.example), then run.
     It lints the app tree, pushes it, creates/updates the API deployment, and
     writes CXAS_APP_NAME plus CXAS_DEPLOYMENT_ID back into .env:
       backend/.venv/bin/python scripts/create_agent.py
     (Targeting your own project? See README - "Point this at your own GCP project".)

  3. Start the backend API:
       backend/.venv/bin/python -m uvicorn backend.api:app --port 8000

  4. Start the frontend (separate terminal):
       cd frontend && npm install && npm run dev

  5. Run the backend unit tests (no network / credentials needed):
       backend/.venv/bin/python -m pytest backend/tests -q

Scripted mode is the default demo path and needs no GCP access at all.
EOF
