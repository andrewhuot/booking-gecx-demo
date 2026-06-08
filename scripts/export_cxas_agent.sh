#!/usr/bin/env bash
#
# Create a portable zip of the version-controlled CXAS app source.
#
# The generated zip can be copied to another computer and passed to:
#   ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID --agent-zip PATH_TO_ZIP

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_DIR="${REPO_ROOT}/agent/cxas_app/booking-concierge"
OUTPUT="${REPO_ROOT}/agent/.exported/booking-concierge-cxas-agent.zip"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/export_cxas_agent.sh [--output PATH] [--app-dir PATH]

Creates a clean CXAS agent zip that can be moved to a new computer or used as
the source for live provisioning in a new GCP/CXAS project.

Default output:
  agent/.exported/booking-concierge-cxas-agent.zip

Options:
  --output PATH    Where to write the zip.
  --app-dir PATH   CXAS app directory to package (defaults to repo app source).
  -h, --help       Show this help.

Example:
  ./scripts/export_cxas_agent.sh
  ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID --agent-zip agent/.exported/booking-concierge-cxas-agent.zip
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
    --output)
      need_value "$1" "${2:-}"
      OUTPUT="$2"
      shift 2
      ;;
    --app-dir)
      need_value "$1" "${2:-}"
      APP_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1. Run ./scripts/export_cxas_agent.sh --help."
      ;;
  esac
done

python_bin="python3"
if command -v python3.12 >/dev/null 2>&1; then
  python_bin="python3.12"
fi

"${python_bin}" - "${APP_DIR}" "${OUTPUT}" <<'PY'
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

app_dir = Path(sys.argv[1]).expanduser().resolve()
output = Path(sys.argv[2]).expanduser().resolve()

if not app_dir.is_dir():
    raise SystemExit(f"ERROR: app directory does not exist: {app_dir}")
if not (app_dir / "app.json").is_file():
    raise SystemExit(f"ERROR: expected app.json at the app root: {app_dir}")

output.parent.mkdir(parents=True, exist_ok=True)
tmp_output = output.with_suffix(output.suffix + ".tmp")
if tmp_output.exists():
    tmp_output.unlink()

excluded_names = {".DS_Store"}
excluded_suffixes = {".pyc", ".pyo"}

with zipfile.ZipFile(tmp_output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(app_dir.rglob("*")):
        if path.is_dir():
            continue
        relative = path.relative_to(app_dir)
        if any(part == "__pycache__" for part in relative.parts):
            continue
        if path.name in excluded_names or path.suffix in excluded_suffixes:
            continue
        archive.write(path, relative.as_posix())

tmp_output.replace(output)
print(f"==> wrote {output}")
print("==> use with: ./scripts/bootstrap_new_project.sh --project-id YOUR_PROJECT_ID --agent-zip", output)
PY
