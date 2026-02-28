#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

USE_WORKTREE=0
if [[ -z "$BASE_SHA" ]]; then
  USE_WORKTREE=1
fi

WORKSTREAM_ROOT="docs/reference_docs/topic_collections/implementation/tool-foundry"
FOUNDRY_CODE_PREFIX="convex/ai/toolFoundry/"
FOUNDRY_TEST_FILE="tests/unit/ai/toolFoundryContracts.test.ts"
FOUNDRY_GUARD_SCRIPT="scripts/ci/check-tool-foundry-guard.sh"

SCOPED_PATHS=(
  "$WORKSTREAM_ROOT"
  "convex/ai/toolFoundry"
  "$FOUNDRY_TEST_FILE"
  "$FOUNDRY_GUARD_SCRIPT"
  ".github/workflows/tool-foundry-guard.yml"
  "package.json"
  "package-lock.json"
)

CHANGED=()
if [[ "$USE_WORKTREE" -eq 1 ]]; then
  while IFS= read -r path; do
    [[ -n "$path" ]] && CHANGED+=("$path")
  done < <(git diff --name-only --diff-filter=ACMR HEAD -- "${SCOPED_PATHS[@]}" | LC_ALL=C sort)
else
  if [[ "$BASE_SHA" =~ ^0+$ ]]; then
    if git rev-parse "${HEAD_SHA}^" >/dev/null 2>&1; then
      BASE_SHA="$(git rev-parse "${HEAD_SHA}^")"
    else
      BASE_SHA="$(git hash-object -t tree /dev/null)"
    fi
  fi

  while IFS= read -r path; do
    [[ -n "$path" ]] && CHANGED+=("$path")
  done < <(git diff --name-only --diff-filter=ACMR "$BASE_SHA" "$HEAD_SHA" -- "${SCOPED_PATHS[@]}" | LC_ALL=C sort)
fi

if [[ "${#CHANGED[@]}" -eq 0 ]]; then
  echo "Tool Foundry guard: no scoped changes in range."
  exit 0
fi

has_changed_file() {
  local needle="$1"
  for path in "${CHANGED[@]}"; do
    if [[ "$path" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

has_changed_prefix() {
  local prefix="$1"
  for path in "${CHANGED[@]}"; do
    if [[ "$path" == "$prefix"* ]]; then
      return 0
    fi
  done
  return 1
}

VIOLATIONS=()

require_changed_file() {
  local file="$1"
  local reason="$2"
  if ! has_changed_file "$file"; then
    VIOLATIONS+=("$file ($reason)")
  fi
}

if has_changed_prefix "$FOUNDRY_CODE_PREFIX"; then
  require_changed_file "$FOUNDRY_TEST_FILE" "foundry code changed; update deterministic unit coverage"
  if ! has_changed_prefix "$WORKSTREAM_ROOT/"; then
    VIOLATIONS+=("$WORKSTREAM_ROOT/ (foundry code changed; update queue-first workstream docs)")
  fi
fi

if has_changed_prefix "$WORKSTREAM_ROOT/"; then
  REQUIRED_DOCS=(
    "$WORKSTREAM_ROOT/TASK_QUEUE.md"
    "$WORKSTREAM_ROOT/SESSION_PROMPTS.md"
    "$WORKSTREAM_ROOT/INDEX.md"
    "$WORKSTREAM_ROOT/MASTER_PLAN.md"
  )

  for doc in "${REQUIRED_DOCS[@]}"; do
    if [[ ! -f "$doc" ]]; then
      VIOLATIONS+=("$doc (missing required queue-first workstream artifact)")
    fi
  done
fi

if [[ ! -x "$FOUNDRY_GUARD_SCRIPT" ]]; then
  VIOLATIONS+=("$FOUNDRY_GUARD_SCRIPT (script must be executable)")
fi

if ! grep -Fq '"tool-foundry:guard"' package.json; then
  VIOLATIONS+=("package.json (missing npm script: tool-foundry:guard)")
fi

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  echo "Tool Foundry guard failed. Resolve the following:"
  for violation in "${VIOLATIONS[@]}"; do
    echo "- $violation"
  done
  exit 1
fi

echo "Tool Foundry guard passed."
