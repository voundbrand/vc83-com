#!/usr/bin/env bash
set -euo pipefail

# DEV-only deterministic gate runner for stages 1-4 from RFC §10.1.
# Release-phase automation is intentionally out of scope here.

SCRIPT_NAME="check-agent-runtime-dev-gates"
DRY_RUN="${AGENT_RUNTIME_DEV_GATES_DRY_RUN:-0}"

STAGE_IDS=(
  "stage-1-spec-lint"
  "stage-2-compile-determinism"
  "stage-3-contract-tests"
  "stage-4-synthetic-warmup"
)

STAGE_SCRIPT_KEYS=(
  "agent-runtime:dev:stage1:spec-lint"
  "agent-runtime:dev:stage2:compile-determinism"
  "agent-runtime:dev:stage3:contract-tests"
  "agent-runtime:dev:stage4:synthetic-warmup"
)

run_stage() {
  local stage_id="$1"
  local npm_script_key="$2"
  local command="npm run ${npm_script_key}"

  echo "[${SCRIPT_NAME}] ${stage_id}: ${command}"

  if [[ "$DRY_RUN" == "1" ]]; then
    return 0
  fi

  npm run "$npm_script_key"
}

echo "[${SCRIPT_NAME}] scope=dev pipeline=define-to-warmup mode=$([[ "$DRY_RUN" == "1" ]] && echo dry-run || echo execute)"
echo "[${SCRIPT_NAME}] excluded=stage-5-canary,stage-6-promotion,migration,cutover,rollback"

for index in "${!STAGE_IDS[@]}"; do
  run_stage "${STAGE_IDS[$index]}" "${STAGE_SCRIPT_KEYS[$index]}"
done

echo "[${SCRIPT_NAME}] completed stages=4"
