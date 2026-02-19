#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

USE_WORKTREE=0
if [[ -z "$BASE_SHA" ]]; then
  USE_WORKTREE=1
fi

SCOPED_PATHS=(
  "src/components/window-content"
  "src/components/taskbar"
  "src/components/windows-menu.tsx"
  "src/components/floating-window.tsx"
  "src/app/page.tsx"
  "src/app/globals.css"
)

# Legacy indicators we do not allow to be newly introduced.
LEGACY_PATTERN_DESC='retro-button, --win95-, var(--win95-, data-window-style, zinc-{50|100|200|300|400|500|600|700|800|900|950}, purple-{50|100|200|300|400|500|600|700|800|900|950}'

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
  echo "Legacy style guard: no scoped changes in range."
  exit 0
fi

extract_violations() {
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
    BEGIN {
      utility_pattern = "(^|[^[:alnum:]_-])(zinc|purple)-(50|100|200|300|400|500|600|700|800|900|950)($|[^[:alnum:]_-])"
    }

    function has_legacy_indicator(text) {
      return index(text, "retro-button") > 0 \
        || index(text, "--win95-") > 0 \
        || index(text, "var(--win95-") > 0 \
        || index(text, "data-window-style") > 0 \
        || text ~ utility_pattern
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
      if (has_legacy_indicator(text)) {
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
  echo "Legacy style guard failed. Newly introduced legacy style indicators detected:"
  for entry in "${VIOLATIONS[@]}"; do
    echo "- $entry"
  done
  echo
  echo "Blocked patterns: $LEGACY_PATTERN_DESC"
  echo "Scope: ${SCOPED_PATHS[*]}"
  exit 1
fi

echo "Legacy style guard passed (no new legacy indicators introduced)."
