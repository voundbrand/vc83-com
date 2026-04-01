#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  local-openclaw-dev.sh <up|down|ps|logs> [--env-file <path>]

Defaults:
  Repo:    apps/nemoclaw-kanzlei-eu/repos/openclaw
  Env file: apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/local-openclaw.env

Notes:
- "up" seeds the env file from template if missing.
- This is local development only, not production deployment.
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../.." && pwd)"
OPENCLAW_REPO="${REPO_ROOT}/apps/nemoclaw-kanzlei-eu/repos/openclaw"
ENV_TEMPLATE="${SCRIPT_DIR%/scripts}/local-openclaw.env.example"
ENV_FILE_DEFAULT="${SCRIPT_DIR%/scripts}/local-openclaw.env"
ENV_FILE="$ENV_FILE_DEFAULT"
ACTION="${1:-}"

[[ -n "$ACTION" ]] || { usage; exit 1; }
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

need_cmd docker
docker compose version >/dev/null 2>&1 || die "docker compose plugin is required"
[[ -d "$OPENCLAW_REPO/.git" ]] || die "OpenClaw repo missing: $OPENCLAW_REPO"
[[ -f "$ENV_TEMPLATE" ]] || die "Missing env template: $ENV_TEMPLATE"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_TEMPLATE" "$ENV_FILE"
  echo "[INFO] Created env file from template: $ENV_FILE"
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-$HOME/.openclaw}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$HOME/.openclaw/workspace}"
mkdir -p "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE_DIR"

COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$OPENCLAW_REPO/docker-compose.yml")

case "$ACTION" in
  up)
    "${COMPOSE[@]}" up -d
    "${COMPOSE[@]}" ps
    ;;
  down)
    "${COMPOSE[@]}" down
    ;;
  ps)
    "${COMPOSE[@]}" ps
    ;;
  logs)
    "${COMPOSE[@]}" logs --tail 200 openclaw-gateway
    ;;
  *)
    usage
    exit 1
    ;;
esac
