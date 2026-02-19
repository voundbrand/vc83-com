#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

USE_WORKTREE=0
if [[ -z "$BASE_SHA" ]]; then
  USE_WORKTREE=1
fi

SCOPED_PATHS=(
  "src/components"
  "src/app"
)

DRIFT_PATTERN_DESC='hard-edge utilities (border-2/rounded-none), explicit zero-radius rules, inline hardcoded white surfaces (background/backgroundColor white/#fff/#ffffff)'

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
  echo "UI design guard: no scoped changes in range."
  exit 0
fi

extract_violations() {
  local path="$1"
  local diff_out

  if [[ ! "$path" =~ \.(ts|tsx|js|jsx)$ ]]; then
    return 0
  fi

  if [[ "$USE_WORKTREE" -eq 1 ]]; then
    diff_out="$(git diff --unified=0 HEAD -- "$path")"
  else
    diff_out="$(git diff --unified=0 "$BASE_SHA" "$HEAD_SHA" -- "$path")"
  fi

  if [[ -z "$diff_out" ]]; then
    return 0
  fi

  printf '%s\n' "$diff_out" | awk -v file="$path" '
    function has_design_drift_indicator(text, lower) {
      lower = tolower(text)
      return lower ~ /(^|[^[:alnum:]_-])border-2([^[:alnum:]_-]|$)/ \
        || lower ~ /(^|[^[:alnum:]_-])rounded-none([^[:alnum:]_-]|$)/ \
        || lower ~ /border-?radius[[:space:]]*:[[:space:]]*0(px)?([;},[:space:]]|$)/ \
        || lower ~ /background(color)?[[:space:]]*:[[:space:]]*["\047]?(white|#fff|#ffffff)["\047]?([;},[:space:]]|$)/
    }

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
      if (has_design_drift_indicator(text)) {
        printf "%s:%d: %s\n", file, line, text;
      }
      next;
    }

    /^-/ { next; }
  '
}

VIOLATIONS=()
for path in "${CHANGED[@]}"; do
  while IFS= read -r hit; do
    [[ -n "$hit" ]] && VIOLATIONS+=("$hit")
  done < <(extract_violations "$path")
done

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  echo "UI design guard failed. Newly introduced design drift indicators detected:"
  for entry in "${VIOLATIONS[@]}"; do
    echo "- $entry"
  done
  echo
  echo "Blocked patterns: $DRIFT_PATTERN_DESC"
  echo "Scope: ${SCOPED_PATHS[*]}"
  exit 1
fi

echo "UI design guard passed (no new design drift indicators introduced)."
