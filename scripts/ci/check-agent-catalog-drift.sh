#!/usr/bin/env bash

set -euo pipefail

DATASET_VERSION="${AGENT_CATALOG_DATASET_VERSION:-agp_v1}"
REPORT_PATH="${AGENT_CATALOG_AUDIT_REPORT_PATH:-tmp/reports/agent-catalog-drift/audit-report.json}"
FUNCTION_NAME="${AGENT_CATALOG_AUDIT_FUNCTION:-internal.ai.agentCatalogSync.runDriftAudit}"
BLOCKING_MODE="${AGENT_CATALOG_AUDIT_BLOCKING:-0}"
INCLUDE_DOCS_SNAPSHOT_EXPORT="${AGENT_CATALOG_INCLUDE_DOCS_SNAPSHOT_EXPORT:-0}"

is_truthy() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == "1" || "$value" == "true" || "$value" == "yes" || "$value" == "on" ]]
}

write_report() {
  local payload="$1"
  printf '%s\n' "$payload" | jq '.' > "$REPORT_PATH"
}

fail_or_warn() {
  local message="$1"
  if is_truthy "$BLOCKING_MODE"; then
    echo "$message"
    exit 1
  fi
  echo "$message (non-blocking rollout mode; continuing)"
  exit 0
}

mkdir -p "$(dirname "$REPORT_PATH")"

if ! command -v jq >/dev/null 2>&1; then
  cat > "$REPORT_PATH" <<EOF
{"status":"error","reason":"missing_jq","datasetVersion":"$DATASET_VERSION"}
EOF
  fail_or_warn "Agent catalog drift audit could not run because jq is not available."
fi

if [[ -z "${NEXT_PUBLIC_CONVEX_URL:-}" && -z "${CONVEX_DEPLOYMENT:-}" && -z "${CONVEX_SELF_HOSTED_URL:-}" ]]; then
  jq -n \
    --arg datasetVersion "$DATASET_VERSION" \
    --arg reason "missing_convex_deployment_env" \
    '{status: "skipped", reason: $reason, datasetVersion: $datasetVersion}' > "$REPORT_PATH"
  echo "Agent catalog drift audit skipped: no Convex deployment environment was configured."
  exit 0
fi

if is_truthy "$INCLUDE_DOCS_SNAPSHOT_EXPORT"; then
  ARGS_JSON="$(jq -cn --arg datasetVersion "$DATASET_VERSION" '{datasetVersion: $datasetVersion, includeDocsSnapshotExport: true}')"
else
  ARGS_JSON="$(jq -cn --arg datasetVersion "$DATASET_VERSION" '{datasetVersion: $datasetVersion}')"
fi

set +e
RAW_OUTPUT="$(npx convex run --typecheck disable --codegen disable "$FUNCTION_NAME" "$ARGS_JSON" 2>&1)"
RUN_EXIT_CODE=$?
set -e

if [[ $RUN_EXIT_CODE -ne 0 ]]; then
  jq -n \
    --arg datasetVersion "$DATASET_VERSION" \
    --arg functionName "$FUNCTION_NAME" \
    --arg errorOutput "$RAW_OUTPUT" \
    '{status: "error", reason: "convex_run_failed", datasetVersion: $datasetVersion, functionName: $functionName, output: $errorOutput}' > "$REPORT_PATH"
  fail_or_warn "Agent catalog drift audit command failed."
fi

JSON_OUTPUT="$RAW_OUTPUT"
if ! printf '%s\n' "$JSON_OUTPUT" | jq -e '.' >/dev/null 2>&1; then
  JSON_OUTPUT="$(printf '%s\n' "$RAW_OUTPUT" | sed -n '/^[[:space:]]*{/,$p')"
fi

if ! printf '%s\n' "$JSON_OUTPUT" | jq -e '.' >/dev/null 2>&1; then
  jq -n \
    --arg datasetVersion "$DATASET_VERSION" \
    --arg output "$RAW_OUTPUT" \
    '{status: "error", reason: "non_json_output", datasetVersion: $datasetVersion, output: $output}' > "$REPORT_PATH"
  fail_or_warn "Agent catalog drift audit returned non-JSON output."
fi

write_report "$JSON_OUTPUT"

AUDIT_STATUS="$(jq -r '.status // "unknown"' "$REPORT_PATH")"
RUN_STATUS="$(jq -r '.runStatus // "success"' "$REPORT_PATH")"
SYNC_RUN_ID="$(jq -r '.syncRunId // ""' "$REPORT_PATH")"
DOCS_SNAPSHOT_STATUS="$(jq -r '.docsSnapshot.status // "not_available"' "$REPORT_PATH")"

echo "Agent catalog audit summary:"
echo "  datasetVersion=$DATASET_VERSION"
echo "  function=$FUNCTION_NAME"
echo "  status=$AUDIT_STATUS"
echo "  runStatus=$RUN_STATUS"
echo "  syncRunId=${SYNC_RUN_ID:-none}"
echo "  docsSnapshot=$DOCS_SNAPSHOT_STATUS"
echo "  report=$REPORT_PATH"

if [[ "$RUN_STATUS" == "failed" ]]; then
  fail_or_warn "Agent catalog automation run reported failure."
fi

if [[ "$AUDIT_STATUS" == "drift_detected" ]]; then
  fail_or_warn "Agent catalog drift was detected."
fi

echo "Agent catalog drift audit passed (in sync)."
