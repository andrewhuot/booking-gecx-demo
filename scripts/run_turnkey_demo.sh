#!/usr/bin/env bash
#
# One-command launcher for the July 4 Booking.com GECX demo.
#
# It installs missing dependencies, configures local env vars, starts the
# FastAPI backend and Vite frontend, opens the correct Google warm-start route,
# and keeps both processes alive until Ctrl-C.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="mock"
HOST="127.0.0.1"
FRONTEND_PORT=""
BACKEND_PORT=""
OPEN_BROWSER=1
SKIP_INSTALL=0
SETUP_ONLY=0
PROVISION_AGENT=0
DRY_RUN_PROVISION=0

PROJECT_ID=""
PROJECT_NUMBER=""
LOCATION=""
DISPLAY_NAME=""
APP_ID=""
MODEL=""

BACKEND_PID=""
FRONTEND_PID=""

usage() {
  cat <<'EOF'
Usage:
  ./scripts/run_turnkey_demo.sh [--mode mock|live] [options]

Runs the complete desktop demo from one terminal.

Default mock mode:
  ./scripts/run_turnkey_demo.sh
  Opens http://127.0.0.1:3000/google

Live GECX/CXAS mode:
  ./scripts/run_turnkey_demo.sh --mode live --provision-agent --project-id YOUR_PROJECT_ID
  Opens http://127.0.0.1:3000/google/live

Options:
  --mode mock|live          mock runs offline scripted flow; live uses GECX/CXAS.
  --provision-agent         Before launching live mode, run scripts/create_agent.py.
  --dry-run-provision       Print the CXAS provisioning commands without pushing.
  --project-id VALUE        Write GCP_PROJECT_ID to .env and pass it to provisioning.
  --project-number VALUE    Write GCP_PROJECT_NUMBER to .env for your GCP project.
  --location VALUE          Write GCP_LOCATION to .env (default remains us).
  --display-name VALUE      Override CXAS_APP_DISPLAY_NAME for provisioning.
  --app-id VALUE            Override CXAS_APP_ID for provisioning metadata.
  --model VALUE             Override CXAS_MODEL for provisioning metadata.
  --host VALUE              Bind both servers to this host (default 127.0.0.1).
  --frontend-port VALUE     Frontend port. Defaults to first free: 3000, 3001, 5173.
  --backend-port VALUE      Backend port. Defaults to first free: 8000, 8001, 8002.
  --skip-install            Do not run setup.sh or npm install before launch.
  --setup-only              Install/configure/provision, then exit without servers.
  --no-open                 Print the URL instead of opening the browser.
  -h, --help                Show this help.

The script exports VITE_API_URL=http://HOST:BACKEND_PORT for Vite and sets
VITE_DEMO_MODE plus DEMO_MODE to match the selected path-based demo mode.

Routes:
  /google       Fake Google page with Booking.com ad for the offline mock flow.
  /google/live  Fake Google page with Booking.com ad for the live CXAS flow.
  /demo/mock    Direct warm-start Booking.com desktop chat in mock mode.
  /demo/live    Direct warm-start Booking.com desktop chat in live mode.

Press Ctrl-C to stop both local servers. Logs are written to .demo/.
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
    --mode)
      need_value "$1" "${2:-}"
      MODE="$2"
      shift 2
      ;;
    --mode=*)
      MODE="${1#*=}"
      shift
      ;;
    --provision-agent)
      PROVISION_AGENT=1
      shift
      ;;
    --dry-run-provision)
      DRY_RUN_PROVISION=1
      PROVISION_AGENT=1
      shift
      ;;
    --project-id)
      need_value "$1" "${2:-}"
      PROJECT_ID="$2"
      shift 2
      ;;
    --project-number)
      need_value "$1" "${2:-}"
      PROJECT_NUMBER="$2"
      shift 2
      ;;
    --location)
      need_value "$1" "${2:-}"
      LOCATION="$2"
      shift 2
      ;;
    --display-name)
      need_value "$1" "${2:-}"
      DISPLAY_NAME="$2"
      shift 2
      ;;
    --app-id)
      need_value "$1" "${2:-}"
      APP_ID="$2"
      shift 2
      ;;
    --model)
      need_value "$1" "${2:-}"
      MODEL="$2"
      shift 2
      ;;
    --host)
      need_value "$1" "${2:-}"
      HOST="$2"
      shift 2
      ;;
    --frontend-port)
      need_value "$1" "${2:-}"
      FRONTEND_PORT="$2"
      shift 2
      ;;
    --backend-port)
      need_value "$1" "${2:-}"
      BACKEND_PORT="$2"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --setup-only)
      SETUP_ONLY=1
      shift
      ;;
    --no-open)
      OPEN_BROWSER=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1. Run ./scripts/run_turnkey_demo.sh --help."
      ;;
  esac
done

case "${MODE}" in
  mock|scripted)
    MODE="mock"
    ;;
  live)
    ;;
  *)
    die "--mode must be mock or live."
    ;;
esac

cd "${REPO_ROOT}"

VENV_DIR="backend/.venv"
VENV_PY="${VENV_DIR}/bin/python"
LOG_DIR=".demo"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z "${HOST}" "${port}" >/dev/null 2>&1
  else
    return 1
  fi
}

choose_frontend_port() {
  if [[ -n "${FRONTEND_PORT}" ]]; then
    if port_in_use "${FRONTEND_PORT}"; then
      die "Frontend port ${FRONTEND_PORT} is already in use. Re-run with --frontend-port 3001 or stop that process."
    fi
    return
  fi

  local candidate
  for candidate in 3000 3001 5173; do
    if ! port_in_use "${candidate}"; then
      FRONTEND_PORT="${candidate}"
      return
    fi
  done

  die "Frontend ports 3000, 3001, and 5173 are all in use. Free one of them and re-run."
}

choose_backend_port() {
  if [[ -n "${BACKEND_PORT}" ]]; then
    if port_in_use "${BACKEND_PORT}"; then
      die "Backend port ${BACKEND_PORT} is already in use. Re-run with --backend-port 8001 or stop that process."
    fi
    return
  fi

  local candidate
  for candidate in 8000 8001 8002; do
    if ! port_in_use "${candidate}"; then
      BACKEND_PORT="${candidate}"
      return
    fi
  done

  die "Backend ports 8000, 8001, and 8002 are all in use. Free one of them and re-run."
}

ensure_env_file() {
  if [[ -f ".env" ]]; then
    return
  fi
  if [[ -f ".env.example" ]]; then
    cp .env.example .env
    echo "==> created .env from .env.example"
  else
    touch .env
    echo "==> created empty .env"
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp
  ensure_env_file
  tmp="$(mktemp)"
  awk -v key="${key}" -v value="${value}" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (found == 0) {
        print key "=" value
      }
    }
  ' .env > "${tmp}"
  mv "${tmp}" .env
}

read_env_value() {
  local key="$1"
  if [[ ! -f ".env" ]]; then
    return 0
  fi
  grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f 2- || true
}

install_dependencies() {
  if [[ "${SKIP_INSTALL}" -eq 1 ]]; then
    echo "==> skipping dependency install"
    return
  fi

  ./scripts/setup.sh

  if ! command -v npm >/dev/null 2>&1; then
    die "npm is not installed or not on PATH. Install Node 18+ and re-run."
  fi

  echo "==> installing frontend dependencies"
  (cd frontend && npm install)
}

configure_env() {
  local demo_mode="scripted"
  local vite_mode="scripted"
  API_URL="http://${HOST}:${BACKEND_PORT}"

  if [[ "${MODE}" == "live" ]]; then
    demo_mode="live"
    vite_mode="live"
  fi

  set_env_value "DEMO_MODE" "${demo_mode}"
  set_env_value "VITE_DEMO_MODE" "${vite_mode}"
  set_env_value "VITE_API_URL" "${API_URL}"

  [[ -n "${PROJECT_ID}" ]] && set_env_value "GCP_PROJECT_ID" "${PROJECT_ID}"
  [[ -n "${PROJECT_NUMBER}" ]] && set_env_value "GCP_PROJECT_NUMBER" "${PROJECT_NUMBER}"
  [[ -n "${LOCATION}" ]] && set_env_value "GCP_LOCATION" "${LOCATION}"
  [[ -n "${DISPLAY_NAME}" ]] && set_env_value "CXAS_APP_DISPLAY_NAME" "${DISPLAY_NAME}"
  [[ -n "${APP_ID}" ]] && set_env_value "CXAS_APP_ID" "${APP_ID}"
  [[ -n "${MODEL}" ]] && set_env_value "CXAS_MODEL" "${MODEL}"
  return 0
}

provision_live_agent() {
  if [[ "${PROVISION_AGENT}" -eq 0 ]]; then
    return
  fi
  if [[ "${MODE}" != "live" ]]; then
    die "--provision-agent is only valid with --mode live."
  fi
  if [[ ! -x "${VENV_PY}" ]]; then
    die "Python venv is missing. Re-run without --skip-install or run ./scripts/setup.sh first."
  fi

  local args=()
  [[ -n "${PROJECT_ID}" ]] && args+=(--project-id "${PROJECT_ID}")
  [[ -n "${LOCATION}" ]] && args+=(--location "${LOCATION}")
  [[ -n "${DISPLAY_NAME}" ]] && args+=(--display-name "${DISPLAY_NAME}")
  [[ -n "${APP_ID}" ]] && args+=(--app-id "${APP_ID}")
  [[ -n "${MODEL}" ]] && args+=(--model "${MODEL}")
  [[ "${DRY_RUN_PROVISION}" -eq 1 ]] && args+=(--dry-run)

  echo "==> provisioning CXAS agent"
  "${VENV_PY}" scripts/create_agent.py "${args[@]}"
}

warn_if_live_unprovisioned() {
  if [[ "${MODE}" != "live" || "${PROVISION_AGENT}" -eq 1 ]]; then
    return
  fi

  local app_name
  app_name="$(read_env_value "CXAS_APP_NAME")"
  if [[ -z "${app_name}" ]]; then
    cat <<'EOF'
WARNING: launching /google/live without CXAS_APP_NAME set.
         The desktop flow will still open, but live chat will show the backend
         fallback until you provision an agent:
           ./scripts/run_turnkey_demo.sh --mode live --provision-agent --project-id YOUR_PROJECT_ID
EOF
  fi
  return 0
}

show_log_tail() {
  local label="$1"
  local file="$2"
  echo
  echo "---- ${label} log tail (${file}) ----" >&2
  tail -n 60 "${file}" >&2 || true
}

cleanup() {
  local code=$?
  trap - EXIT INT TERM
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
  [[ -n "${FRONTEND_PID}" ]] && wait "${FRONTEND_PID}" >/dev/null 2>&1 || true
  [[ -n "${BACKEND_PID}" ]] && wait "${BACKEND_PID}" >/dev/null 2>&1 || true
  exit "${code}"
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local pid="$3"
  local log_file="$4"

  echo "==> waiting for ${name}: ${url}"
  for _ in $(seq 1 60); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      echo "==> ${name} is ready"
      return
    fi
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      show_log_tail "${name}" "${log_file}"
      die "${name} exited before it became ready."
    fi
    sleep 1
  done

  show_log_tail "${name}" "${log_file}"
  die "Timed out waiting for ${name}."
}

start_backend() {
  if [[ ! -x "${VENV_PY}" ]]; then
    die "Python venv is missing. Re-run without --skip-install or run ./scripts/setup.sh first."
  fi

  : > "${BACKEND_LOG}"
  echo "==> starting backend on http://${HOST}:${BACKEND_PORT}"
  DEMO_MODE="$(read_env_value "DEMO_MODE")" \
    "${VENV_PY}" -m uvicorn backend.api:app --host "${HOST}" --port "${BACKEND_PORT}" \
    > "${BACKEND_LOG}" 2>&1 &
  BACKEND_PID=$!
}

start_frontend() {
  : > "${FRONTEND_LOG}"
  echo "==> starting frontend on http://${HOST}:${FRONTEND_PORT}"
  (
    cd frontend
    VITE_API_URL="${API_URL}" \
      VITE_DEMO_MODE="$(read_env_value "VITE_DEMO_MODE")" \
      npm run dev -- --host "${HOST}" --port "${FRONTEND_PORT}" --strictPort
  ) > "${FRONTEND_LOG}" 2>&1 &
  FRONTEND_PID=$!
}

monitor_processes() {
  while true; do
    if ! kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
      show_log_tail "backend" "${BACKEND_LOG}"
      die "Backend stopped unexpectedly."
    fi
    if ! kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
      show_log_tail "frontend" "${FRONTEND_LOG}"
      die "Frontend stopped unexpectedly."
    fi
    sleep 2
  done
}

main() {
  mkdir -p "${LOG_DIR}"
  choose_frontend_port
  choose_backend_port
  install_dependencies
  configure_env
  provision_live_agent
  warn_if_live_unprovisioned

  if [[ "${SETUP_ONLY}" -eq 1 ]]; then
    echo "==> setup complete; --setup-only requested, so no servers were started."
    return
  fi

  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  start_backend
  start_frontend

  wait_for_http "backend" "${API_URL}/api/health" "${BACKEND_PID}" "${BACKEND_LOG}"
  wait_for_http "frontend" "http://${HOST}:${FRONTEND_PORT}/" "${FRONTEND_PID}" "${FRONTEND_LOG}"

  local entry_route="/google"
  local direct_route="/demo/mock"
  if [[ "${MODE}" == "live" ]]; then
    entry_route="/google/live"
    direct_route="/demo/live"
  fi

  local entry_url="http://${HOST}:${FRONTEND_PORT}${entry_route}"
  local direct_url="http://${HOST}:${FRONTEND_PORT}${direct_route}"

  cat <<EOF

==> Booking.com July 4 demo is running
    Entry URL:  ${entry_url}
    Direct URL: ${direct_url}
    Backend:    ${API_URL}
    Logs:       ${BACKEND_LOG} and ${FRONTEND_LOG}

EOF

  if [[ "${OPEN_BROWSER}" -eq 1 ]]; then
    if command -v open >/dev/null 2>&1; then
      open "${entry_url}"
    else
      echo "Open this URL in your browser: ${entry_url}"
    fi
  else
    echo "Open this URL in your browser: ${entry_url}"
  fi

  echo "Press Ctrl-C to stop both servers."
  monitor_processes
}

main
