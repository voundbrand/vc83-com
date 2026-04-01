#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  compare-voicecall-baselines.sh --pilot <pilot-metrics.json> --current <current-metrics.json> [--output-root <dir>]

Options:
  --pilot <path>        Pilot metrics JSON (from collect-voicecall-baseline.sh)
  --current <path>      Current-path metrics JSON (from collect-voicecall-baseline.sh)
  --output-root <dir>   Output root (default: docs/.../compliance_docs/baseline_metrics/comparisons)
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
DEFAULT_OUTPUT_ROOT="${APP_ROOT}/docs/germany_openclaw_hardening/compliance_docs/baseline_metrics/comparisons"

PILOT=""
CURRENT=""
OUTPUT_ROOT="$DEFAULT_OUTPUT_ROOT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pilot)
      PILOT="${2:-}"
      shift 2
      ;;
    --current)
      CURRENT="${2:-}"
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

[[ -n "$PILOT" ]] || die "--pilot is required"
[[ -n "$CURRENT" ]] || die "--current is required"
[[ -f "$PILOT" ]] || die "Pilot metrics file not found: $PILOT"
[[ -f "$CURRENT" ]] || die "Current metrics file not found: $CURRENT"

need_cmd node

TOOL="${SCRIPT_DIR}/voicecall-baseline-tool.mjs"
[[ -f "$TOOL" ]] || die "Missing baseline tool: $TOOL"

TS="$(date -u '+%Y%m%dT%H%M%SZ')"
RUN_DIR="${OUTPUT_ROOT}/${TS}"
mkdir -p "$RUN_DIR"

node "$TOOL" compare \
  --pilot "$PILOT" \
  --current "$CURRENT" \
  --output "$RUN_DIR/comparison.json" \
  --markdown "$RUN_DIR/COMPARISON.md"

cat >"$RUN_DIR/COMPARISON_CONTEXT.env" <<EOF
GENERATED_AT_UTC=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
PILOT=${PILOT}
CURRENT=${CURRENT}
EOF

echo "[INFO] Comparison artifacts written to: $RUN_DIR"
echo "[INFO] Report: $RUN_DIR/COMPARISON.md"
