#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="check-super-admin-qa-telemetry-contract"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EMITTER_FILE="$ROOT_DIR/convex/ai/kernel/agentExecution.ts"
CONTRACT_FILE="$ROOT_DIR/convex/ai/qaModeContracts.ts"
FORMATTER_FILE="$ROOT_DIR/scripts/ai/super-admin-agent-qa-log-formatter.mjs"

if [[ ! -f "$EMITTER_FILE" ]]; then
  echo "[$SCRIPT_NAME] missing emitter file: $EMITTER_FILE" >&2
  exit 1
fi

if [[ ! -f "$FORMATTER_FILE" ]]; then
  echo "[$SCRIPT_NAME] missing formatter file: $FORMATTER_FILE" >&2
  exit 1
fi

if [[ ! -f "$CONTRACT_FILE" ]]; then
  echo "[$SCRIPT_NAME] missing contract file: $CONTRACT_FILE" >&2
  exit 1
fi

REQUIRED_EMITTER_TOKENS=(
  'buildSuperAdminAgentQaTurnTelemetryEnvelope({'
  'qaRunId: superAdminQaMode.runId'
  'sessionId: String(session._id)'
  'turnId: String(runtimeTurnId)'
  'agentId: String(authorityAgent._id)'
  'qaDiagnostics,'
  'JSON.stringify(qaTurnTelemetryEnvelope)'
)

REQUIRED_CONTRACT_TOKENS=(
  'export const SUPER_ADMIN_AGENT_QA_TURN_EVENT = "super_admin_agent_qa_turn" as const;'
  'export interface SuperAdminAgentQaTurnTelemetryEnvelope'
  'event: SUPER_ADMIN_AGENT_QA_TURN_EVENT'
  'modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION'
  'preflightMissingRequiredFields: normalizeStringArray(args.qaDiagnostics.missingRequiredFields)'
  'actionCompletionEnforcementMode: args.qaDiagnostics.enforcementMode'
  'blockedReason: args.qaDiagnostics.blockedReason'
  'blockedDetail: normalizeString(args.qaDiagnostics.blockedDetail)'
)

REQUIRED_FORMATTER_TOKENS=(
  'payload.qaRunId'
  'payload.sessionId'
  'payload.turnId'
  'payload.agentId'
  'payload.preflightReasonCode'
  'payload.reasonCode'
  'requiredTools'
  'availableTools'
  'preflightMissingRequiredFields'
  'actionCompletionEnforcementMode'
  'blockedReason'
  "'super_admin_agent_qa_turn'"
)

missing=0

for token in "${REQUIRED_EMITTER_TOKENS[@]}"; do
  if ! rg -F --quiet -- "$token" "$EMITTER_FILE"; then
    echo "[$SCRIPT_NAME] missing emitter token: $token" >&2
    missing=1
  fi
done

for token in "${REQUIRED_CONTRACT_TOKENS[@]}"; do
  if ! rg -F --quiet -- "$token" "$CONTRACT_FILE"; then
    echo "[$SCRIPT_NAME] missing contract token: $token" >&2
    missing=1
  fi
done

for token in "${REQUIRED_FORMATTER_TOKENS[@]}"; do
  if ! rg -F --quiet -- "$token" "$FORMATTER_FILE"; then
    echo "[$SCRIPT_NAME] missing formatter token: $token" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  echo "[$SCRIPT_NAME] failed: telemetry contract drift detected" >&2
  exit 1
fi

echo "[$SCRIPT_NAME] ok emitter=$EMITTER_FILE formatter=$FORMATTER_FILE"
echo "[$SCRIPT_NAME] checked emitter_tokens=${#REQUIRED_EMITTER_TOKENS[@]} contract_tokens=${#REQUIRED_CONTRACT_TOKENS[@]} formatter_tokens=${#REQUIRED_FORMATTER_TOKENS[@]}"
