#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

USE_WORKTREE=0
if [[ -z "$BASE_SHA" ]]; then
  USE_WORKTREE=1
fi

SCOPED_PATHS=(
  "convex/ai"
  "convex/integrations"
)

PROVIDER_FETCH_PATTERN='(openrouter|OPENROUTER|api\.openai\.com|api\.anthropic\.com|api\.v0\.dev|V0_API_BASE|elevenlabs|ELEVENLABS)'

is_chat_completion_wrapper_allowlist() {
  case "$1" in
    "convex/ai/chatRuntimeOrchestration.ts"|"convex/ai/openrouter.ts")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

chat_completion_metering_requirement() {
  case "$1" in
    "convex/ai/interviewRunner.ts")
      echo "meterNonChatAiUsage("
      return 0
      ;;
    "convex/ai/soulGenerator.ts")
      echo "meterSoulGenerationUsage("
      return 0
      ;;
    "convex/ai/soulEvolution.ts")
      echo "meterSoulReflectionUsage("
      return 0
      ;;
    "convex/integrations/selfHealDeploy.ts")
      echo "meterSelfHealAnalyzeUsage("
      return 0
      ;;
    "convex/ai/agentExecution.ts")
      echo "api.ai.billing.recordUsage"
      return 0
      ;;
    "convex/ai/agentSessions.ts")
      echo "api.ai.billing.recordUsage"
      return 0
      ;;
    "convex/ai/platformModelManagement.ts")
      echo "api.ai.billing.recordUsage"
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

v0_request_metering_requirement() {
  case "$1" in
    "convex/integrations/v0.ts")
      echo "recordV0PlatformUsage("
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_provider_fetch_wrapper_allowlist() {
  case "$1" in
    "convex/ai/openrouter.ts")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

provider_fetch_metering_requirement() {
  case "$1" in
    "convex/integrations/v0.ts")
      echo "recordV0PlatformUsage("
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_provider_fetch_hit() {
  local path="$1"
  local text="$2"

  if [[ "$path" == "convex/ai/openrouter.ts" ]] || [[ "$path" == "convex/integrations/v0.ts" ]]; then
    return 0
  fi

  if [[ "$text" =~ $PROVIDER_FETCH_PATTERN ]]; then
    return 0
  fi

  return 1
}

CHANGED=()
if [[ "$USE_WORKTREE" -eq 1 ]]; then
  while IFS= read -r path; do
    [[ -n "$path" ]] && CHANGED+=("$path")
  done < <(git diff --name-only --diff-filter=ACMR HEAD -- "${SCOPED_PATHS[@]}" | LC_ALL=C sort)
else
  # GitHub push events can provide all-zero before SHA on branch creation.
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
  echo "AI usage guard: no scoped runtime/provider changes in range."
  exit 0
fi

collect_added_hits_for_path() {
  local path="$1"
  local diff_out

  if [[ "$USE_WORKTREE" -eq 1 ]]; then
    diff_out="$(git diff --unified=0 HEAD -- "$path")"
  else
    diff_out="$(git diff --unified=0 "$BASE_SHA" "$HEAD_SHA" -- "$path")"
  fi

  if [[ -z "$diff_out" ]]; then
    return 0
  fi

  printf '%s\n' "$diff_out" | awk -v file="$path" '
    /^@@ / {
      split($0, arr, "+");
      split(arr[2], arr2, " ");
      split(arr2[1], arr3, ",");
      line = arr3[1] - 1;
      next;
    }

    /^\+\+\+/ { next; }

    /^\+/ {
      line++;
      text = substr($0, 2);
      if (text ~ /chatCompletion\(/) {
        printf "%s\t%d\tchatCompletion\t%s\n", file, line, text;
      }
      if (text ~ /v0Request(<|\()/) {
        printf "%s\t%d\tv0Request\t%s\n", file, line, text;
      }
      if (text ~ /fetch\(/) {
        printf "%s\t%d\tfetch\t%s\n", file, line, text;
      }
      next;
    }

    /^-/ { next; }
  '
}

VIOLATIONS=()

append_violation() {
  VIOLATIONS+=("$1")
}

validate_requirement() {
  local path="$1"
  local line="$2"
  local token="$3"
  local requirement="$4"

  if ! grep -Fq "$requirement" "$path"; then
    append_violation "$path:$line: [$token] missing required metering marker '$requirement'."
    return 1
  fi

  return 0
}

for path in "${CHANGED[@]}"; do
  while IFS=$'\t' read -r hit_path hit_line hit_kind hit_text; do
    [[ -z "$hit_path" ]] && continue

    case "$hit_kind" in
      "chatCompletion")
        if is_chat_completion_wrapper_allowlist "$hit_path"; then
          continue
        fi

        if requirement="$(chat_completion_metering_requirement "$hit_path")"; then
          validate_requirement "$hit_path" "$hit_line" "chatCompletion" "$requirement" || true
        else
          append_violation "$hit_path:$hit_line: [chatCompletion] raw provider call is only allowed in approved wrappers or metered runtime entrypoints."
        fi
        ;;
      "v0Request")
        if requirement="$(v0_request_metering_requirement "$hit_path")"; then
          validate_requirement "$hit_path" "$hit_line" "v0Request" "$requirement" || true
        else
          append_violation "$hit_path:$hit_line: [v0Request] v0 transport call must remain in convex/integrations/v0.ts with usage metering."
        fi
        ;;
      "fetch")
        if ! is_provider_fetch_hit "$hit_path" "$hit_text"; then
          continue
        fi

        if is_provider_fetch_wrapper_allowlist "$hit_path"; then
          continue
        fi

        if requirement="$(provider_fetch_metering_requirement "$hit_path")"; then
          validate_requirement "$hit_path" "$hit_line" "fetch" "$requirement" || true
        else
          append_violation "$hit_path:$hit_line: [fetch] direct provider fetch is only allowed in approved adapters or metered runtime entrypoints."
        fi
        ;;
      *)
        ;;
    esac
  done < <(collect_added_hits_for_path "$path")
done

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  echo "AI usage metering guard failed. Newly introduced unmetered provider call surfaces detected:"
  printf '%s\n' "${VIOLATIONS[@]}" | LC_ALL=C sort -u | sed 's/^/- /'
  echo
  echo "Allowlist (low-level adapters):"
  echo "- convex/ai/openrouter.ts (provider transport adapter)"
  echo "- convex/ai/chatRuntimeOrchestration.ts (chat orchestration wrapper)"
  echo
  echo "Metered runtime entrypoints must include:"
  echo "- chatCompletion paths: meterNonChatAiUsage(...), meterSoulGenerationUsage(...), meterSoulReflectionUsage(...), meterSelfHealAnalyzeUsage(...), or ai.billing.recordUsage"
  echo "- v0 paths: recordV0PlatformUsage(...)"
  exit 1
fi

echo "AI usage metering guard passed (no newly introduced unmetered provider call surfaces)."
