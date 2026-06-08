#!/usr/bin/env bash
#
# Friendly wrapper for moving the demo to a new computer and a new GCP/CXAS project.
#
# Default live behavior:
#   - install local dependencies
#   - prepare the GCP project
#   - provision the CXAS app
#   - start backend + frontend
#   - open /google/live

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="live"
PROJECT_ID=""
PROJECT_NUMBER=""
LOCATION="us"
DISPLAY_NAME=""
APP_ID=""
MODEL=""
DEPLOYMENT_ID="live-demo"
AGENT_APP_DIR=""
AGENT_ZIP=""
HOST=""
FRONTEND_PORT=""
BACKEND_PORT=""
BACKEND_INSTALLER="auto"
PREPARE_GCP=1
PROVISION_AGENT=1
DRY_RUN_PROVISION=0
SKIP_INSTALL=0
SETUP_ONLY=0
NO_OPEN=0
SKIP_AUTH_CHECK=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID [options]

This is the easiest new computer / new GCP project path. By default it prepares
the project, provisions a fresh CXAS app from the repo agent source, starts both
local servers, and opens the live demo at /google/live.

Most common commands:
  # New computer + new GCP project, using the agent source in this repo.
  ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID

  # Same, but provision from a CXAS app zip you exported or downloaded.
  ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID --agent-zip /path/to/booking-concierge-cxas-agent.zip

  # Configure/provision only; do not start local servers.
  ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID --setup-only

  # Offline mock demo on a new computer; no GCP required.
  ./scripts/bootstrap_new_project.sh --mode mock

Before live setup, run these once on the new computer:
  gcloud auth login
  gcloud auth application-default login

Options:
  --mode live|mock          live provisions/uses CXAS; mock runs offline.
  --project-id VALUE        GCP project id for live mode.
  --project-number VALUE    Optional GCP project number override.
  --location VALUE          CES/CXAS region (default us).
  --display-name VALUE      CXAS app display name.
  --app-id VALUE            CXAS app id metadata.
  --model VALUE             CXAS model metadata.
  --deployment-id VALUE     API deployment id (default live-demo).
  --agent-app-dir VALUE     Provision from a local CXAS app directory.
  --agent-zip VALUE         Provision from an exported/downloaded CXAS app zip.
  --frontend-port VALUE     Frontend port passed to the launcher.
  --backend-port VALUE      Backend port passed to the launcher.
  --backend-installer VALUE Backend installer: auto, uv, or pip. Use pip if uv is blocked.
  --host VALUE              Host passed to the launcher.
  --no-prepare-gcp          Do not set gcloud project, quota project, or enable CES.
  --no-provision-agent      Do not push/create/update the CXAS app.
  --dry-run-provision       Print provisioning commands without pushing the app.
  --skip-install            Skip dependency installation.
  --setup-only              Configure/provision, then exit without starting servers.
  --no-open                 Print the URL instead of opening the browser.
  --skip-auth-check         Skip preflight checks for gcloud login and ADC.
  -h, --help                Show this help.
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
    --deployment-id)
      need_value "$1" "${2:-}"
      DEPLOYMENT_ID="$2"
      shift 2
      ;;
    --agent-app-dir)
      need_value "$1" "${2:-}"
      AGENT_APP_DIR="$2"
      shift 2
      ;;
    --agent-zip)
      need_value "$1" "${2:-}"
      AGENT_ZIP="$2"
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
    --backend-installer)
      need_value "$1" "${2:-}"
      BACKEND_INSTALLER="$2"
      shift 2
      ;;
    --host)
      need_value "$1" "${2:-}"
      HOST="$2"
      shift 2
      ;;
    --no-prepare-gcp)
      PREPARE_GCP=0
      shift
      ;;
    --no-provision-agent)
      PROVISION_AGENT=0
      shift
      ;;
    --dry-run-provision)
      DRY_RUN_PROVISION=1
      PROVISION_AGENT=1
      shift
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
      NO_OPEN=1
      shift
      ;;
    --skip-auth-check)
      SKIP_AUTH_CHECK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1. Run ./scripts/bootstrap_new_project.sh --help."
      ;;
  esac
done

case "${MODE}" in
  live)
    ;;
  mock|scripted)
    MODE="mock"
    PREPARE_GCP=0
    PROVISION_AGENT=0
    ;;
  *)
    die "--mode must be live or mock."
    ;;
esac

if [[ -n "${AGENT_APP_DIR}" && -n "${AGENT_ZIP}" ]]; then
  die "Use either --agent-app-dir or --agent-zip, not both."
fi

if [[ "${MODE}" == "live" && -z "${PROJECT_ID}" ]]; then
  die "Live migration requires --project-id YOUR_PROJECT_ID. Mock mode does not need GCP."
fi

if [[ -n "${AGENT_ZIP}" && ! -f "${AGENT_ZIP}" ]]; then
  die "Agent zip does not exist: ${AGENT_ZIP}"
fi

if [[ -n "${AGENT_APP_DIR}" && ! -d "${AGENT_APP_DIR}" ]]; then
  die "Agent app directory does not exist: ${AGENT_APP_DIR}"
fi

if [[ "${MODE}" == "live" && "${PREPARE_GCP}" -eq 1 && "${SKIP_AUTH_CHECK}" -eq 0 ]]; then
  if ! command -v gcloud >/dev/null 2>&1; then
    die "gcloud is not installed. Install Google Cloud CLI, then run gcloud auth login and gcloud auth application-default login."
  fi

  active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n 1 || true)"
  if [[ -z "${active_account}" ]]; then
    die "No active gcloud account found. Run: gcloud auth login"
  fi

  if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
    die "Application Default Credentials are not ready. Run: gcloud auth application-default login"
  fi
fi

launcher_args=(--mode "${MODE}")

if [[ "${MODE}" == "live" ]]; then
  launcher_args+=(--project-id "${PROJECT_ID}")
  [[ "${PREPARE_GCP}" -eq 1 ]] && launcher_args+=(--prepare-gcp)
  [[ "${PROVISION_AGENT}" -eq 1 ]] && launcher_args+=(--provision-agent)
  [[ "${DRY_RUN_PROVISION}" -eq 1 ]] && launcher_args+=(--dry-run-provision)
  [[ -n "${PROJECT_NUMBER}" ]] && launcher_args+=(--project-number "${PROJECT_NUMBER}")
  [[ -n "${LOCATION}" ]] && launcher_args+=(--location "${LOCATION}")
  [[ -n "${DISPLAY_NAME}" ]] && launcher_args+=(--display-name "${DISPLAY_NAME}")
  [[ -n "${APP_ID}" ]] && launcher_args+=(--app-id "${APP_ID}")
  [[ -n "${MODEL}" ]] && launcher_args+=(--model "${MODEL}")
  [[ -n "${DEPLOYMENT_ID}" ]] && launcher_args+=(--deployment-id "${DEPLOYMENT_ID}")
  [[ -n "${AGENT_APP_DIR}" ]] && launcher_args+=(--agent-app-dir "${AGENT_APP_DIR}")
  [[ -n "${AGENT_ZIP}" ]] && launcher_args+=(--agent-zip "${AGENT_ZIP}")
fi

[[ -n "${HOST}" ]] && launcher_args+=(--host "${HOST}")
[[ -n "${FRONTEND_PORT}" ]] && launcher_args+=(--frontend-port "${FRONTEND_PORT}")
[[ -n "${BACKEND_PORT}" ]] && launcher_args+=(--backend-port "${BACKEND_PORT}")
launcher_args+=(--backend-installer "${BACKEND_INSTALLER}")
[[ "${SKIP_INSTALL}" -eq 1 ]] && launcher_args+=(--skip-install)
[[ "${SETUP_ONLY}" -eq 1 ]] && launcher_args+=(--setup-only)
[[ "${NO_OPEN}" -eq 1 ]] && launcher_args+=(--no-open)

exec "${REPO_ROOT}/scripts/run_turnkey_demo.sh" "${launcher_args[@]}"
