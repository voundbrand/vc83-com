#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  collect-voicecall-baseline.sh --label <name> [options]

Options:
  --label <name>         Required run label (for example: pilot-staging, current-platform)
  --mode <remote|local>  Collection mode (default: auto; remote when SSH target is resolved)
  --target <staging|prod>
                         Resolve SSH target/key/sandbox from pipeline env
  --env-file <path>      Pipeline env file (default: ../pipeline.env when present)
  --ssh-target <target>  SSH target for remote mode (user@host)
  --ssh-key <path>       SSH key path for remote mode
  --sandbox <name>       Sandbox name for remote status capture (optional)
  --calls-file <path>    calls.jsonl path (default: ~/.openclaw/voice-calls/calls.jsonl)
  --last <n>             Last N records for analysis (default: 200)
  --output-root <dir>    Output root (default: docs/.../compliance_docs/baseline_metrics)

Examples:
  collect-voicecall-baseline.sh --label pilot-staging --target staging --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env
  collect-voicecall-baseline.sh --label current-path --mode local --calls-file ~/.openclaw/voice-calls/calls.jsonl
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
APP_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
WORKSTREAM_ROOT="${APP_ROOT}/docs/germany_openclaw_hardening"
DEFAULT_OUTPUT_ROOT="${WORKSTREAM_ROOT}/compliance_docs/baseline_metrics"
DEFAULT_ENV_FILE="${SCRIPT_DIR%/scripts}/pipeline.env"

LABEL=""
MODE="auto"
TARGET=""
ENV_FILE="$DEFAULT_ENV_FILE"
SSH_TARGET=""
SSH_KEY=""
SANDBOX=""
CALLS_FILE="~/.openclaw/voice-calls/calls.jsonl"
LAST="200"
OUTPUT_ROOT="$DEFAULT_OUTPUT_ROOT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      LABEL="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --ssh-target)
      SSH_TARGET="${2:-}"
      shift 2
      ;;
    --ssh-key)
      SSH_KEY="${2:-}"
      shift 2
      ;;
    --sandbox)
      SANDBOX="${2:-}"
      shift 2
      ;;
    --calls-file)
      CALLS_FILE="${2:-}"
      shift 2
      ;;
    --last)
      LAST="${2:-}"
      shift 2
      ;;
    --output-root)
      OUTPUT_ROOT="${2:-}"
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

[[ -n "$LABEL" ]] || die "--label is required"
[[ "$MODE" == "auto" || "$MODE" == "remote" || "$MODE" == "local" ]] || die "--mode must be auto, remote, or local"
[[ "$TARGET" == "" || "$TARGET" == "staging" || "$TARGET" == "prod" ]] || die "--target must be staging or prod"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ "$TARGET" == "staging" ]]; then
  SSH_TARGET="${SSH_TARGET:-${STAGING_SSH_TARGET:-}}"
  SSH_KEY="${SSH_KEY:-${STAGING_SSH_KEY:-}}"
  SANDBOX="${SANDBOX:-${STAGING_SANDBOX_NAME:-}}"
fi

if [[ "$TARGET" == "prod" ]]; then
  SSH_TARGET="${SSH_TARGET:-${PROD_SSH_TARGET:-}}"
  SSH_KEY="${SSH_KEY:-${PROD_SSH_KEY:-}}"
  SANDBOX="${SANDBOX:-${PROD_SANDBOX_NAME:-}}"
fi

if [[ "$MODE" == "auto" ]]; then
  if [[ -n "$SSH_TARGET" ]]; then
    MODE="remote"
  else
    MODE="local"
  fi
fi

[[ "$LAST" =~ ^[0-9]+$ ]] || die "--last must be a positive integer"
need_cmd node

TOOL="${SCRIPT_DIR}/voicecall-baseline-tool.mjs"
[[ -f "$TOOL" ]] || die "Missing baseline tool: $TOOL"

TS="$(date -u '+%Y%m%dT%H%M%SZ')"
RUN_DIR="${OUTPUT_ROOT}/${TS}_${LABEL}"
mkdir -p "$RUN_DIR"

if [[ "$MODE" == "remote" ]]; then
  need_cmd ssh
  [[ -n "$SSH_TARGET" ]] || die "remote mode requires --ssh-target (or --target with env-file)"

  SSH_ARGS=()
  if [[ -n "$SSH_KEY" ]]; then
    if [[ "$SSH_KEY" == ~/* ]]; then
      SSH_KEY="${HOME}/${SSH_KEY#~/}"
    fi
    SSH_ARGS+=(-i "$SSH_KEY")
  fi

  REMOTE_FILE="$CALLS_FILE"
  if [[ "$REMOTE_FILE" == "~/"* ]]; then
    REMOTE_FILE="\$HOME/${REMOTE_FILE#~/}"
  fi

  echo "[INFO] Collecting remote calls.jsonl from ${SSH_TARGET}:${CALLS_FILE}"
  ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "set -euo pipefail; test -f ${REMOTE_FILE}; cat ${REMOTE_FILE}" >"$RUN_DIR/calls.jsonl"

  if [[ -n "$SANDBOX" ]]; then
    ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "set -euo pipefail; if command -v nemoclaw >/dev/null 2>&1; then nemoclaw ${SANDBOX} status; else echo nemoclaw_not_found; fi" >"$RUN_DIR/sandbox_status.txt" 2>&1 || true
  fi
else
  LOCAL_FILE="$CALLS_FILE"
  if [[ "$LOCAL_FILE" == "~/"* ]]; then
    LOCAL_FILE="${HOME}/${LOCAL_FILE#~/}"
  fi
  [[ -f "$LOCAL_FILE" ]] || die "calls file not found: $LOCAL_FILE"
  echo "[INFO] Collecting local calls.jsonl from ${LOCAL_FILE}"
  cp "$LOCAL_FILE" "$RUN_DIR/calls.jsonl"
fi

node "$TOOL" summarize \
  --input "$RUN_DIR/calls.jsonl" \
  --last "$LAST" \
  --label "$LABEL" \
  --output "$RUN_DIR/metrics.json" \
  --markdown "$RUN_DIR/SUMMARY.md"

cat >"$RUN_DIR/RUN_CONTEXT.env" <<EOF
GENERATED_AT_UTC=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
LABEL=${LABEL}
MODE=${MODE}
TARGET=${TARGET}
ENV_FILE=${ENV_FILE}
SSH_TARGET=${SSH_TARGET}
SANDBOX=${SANDBOX}
CALLS_FILE=${CALLS_FILE}
LAST=${LAST}
EOF

echo "[INFO] Baseline artifacts written to: $RUN_DIR"
echo "[INFO] Summary: $RUN_DIR/SUMMARY.md"
