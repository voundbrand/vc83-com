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
  "src/templates"
  "apps/operator-mobile/app"
  "apps/operator-mobile/src/components"
  "apps/operator-mobile/tamagui.config.ts"
  "apps/operator-mobile/global.css"
)

TOKEN_CONTRACT_DOC="docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md"
DRIFT_PATTERN_DESC="legacy hard-edge utilities, raw color literals outside token files, raw px/radius/shadow values, disallowed utility classes, transition-all usage, window-internal overlay modals, and uppercase brand variants"

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
  echo "UI_DESIGN_GUARD_RESULT|status=PASS|violations=0|reason=no_scoped_changes|scope=${SCOPED_PATHS[*]}"
  echo "UI design guard: no scoped changes in range."
  exit 0
fi

extract_violations() {
  local path="$1"
  local diff_out

  if [[ ! "$path" =~ \.(ts|tsx|js|jsx|css)$ ]]; then
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
    function is_raw_value_exempt_path(path) {
      return path ~ /(^|\/)tokens\// \
        || path ~ /(^|\/)tailwind\.config(\.[^\/]+)?$/ \
        || path ~ /(^|\/)globals\.css$/
    }

    function has_legacy_guard_indicator(text, lower) {
      return lower ~ /(^|[^[:alnum:]_-])border-2([^[:alnum:]_-]|$)/ \
        || lower ~ /(^|[^[:alnum:]_-])rounded-none([^[:alnum:]_-]|$)/ \
        || lower ~ /border-?radius[[:space:]]*:[[:space:]]*0(px)?([;},[:space:]]|$)/ \
        || lower ~ /background(color)?[[:space:]]*:[[:space:]]*["\047]?(white|#fff|#ffffff)["\047]?([;},[:space:]]|$)/
    }

    function has_contract_color_literal(text, lower) {
      return text ~ /#[0-9a-fA-F]{3,8}([^0-9a-fA-F]|$)/ \
        || lower ~ /rgba?\(/ \
        || lower ~ /hsla?\(/ \
        || lower ~ /oklch\(/
    }

    function has_contract_raw_px(text, lower) {
      if (lower ~ /--[a-z0-9-]+[[:space:]]*:[[:space:]]*[0-9.]+px([;},[:space:]]|$)/) {
        return 0
      }
      return text ~ /(^|[^[:alnum:]_-])[0-9]+(\.[0-9]+)?px([^[:alnum:]_-]|$)/
    }

    function has_contract_raw_radius(lower) {
      return lower ~ /border-?radius[[:space:]]*:[[:space:]]*[0-9]/
    }

    function has_contract_raw_shadow(lower) {
      return lower ~ /box-?shadow[[:space:]]*:[[:space:]]*["\047]?[0-9]/
    }

    function has_disallowed_utility(lower) {
      return lower ~ /(^|[^[:alnum:]_-])(bg-black|bg-white|text-black|text-white|border-gray-[0-9]{2,3})([^[:alnum:]_-]|$)/ \
        || lower ~ /(^|[^[:alnum:]_-])shadow-[[:alnum:]-]+([^[:alnum:]_-]|$)/
    }

    function has_disallowed_transition_all(lower) {
      return lower ~ /(^|[^[:alnum:]_-])transition-all([^[:alnum:]_-]|$)/ \
        || lower ~ /transition[[:space:]]*:[^;]*[[:space:]]all([[:space:],;}]|$)/
    }

    function is_window_surface_path(path) {
      return path ~ /(^|\/)window-content\//
    }

    function has_window_overlay_modal(text, lower) {
      if (!is_window_surface_path(file)) {
        return 0
      }

      return lower ~ /(^|[^[:alnum:]_-])fixed[[:space:]]+inset-0([^[:alnum:]_-]|$)/ \
        || lower ~ /(^|[^[:alnum:]_-])inset-0[[:space:]]+fixed([^[:alnum:]_-]|$)/ \
        || lower ~ /aria-modal[[:space:]]*=/ \
        || lower ~ /modal-overlay-bg/
    }

    function has_brand_case_violation(text) {
      return text ~ /(L4YERCAK3|L4yercak3|L4YerCak3)/
    }

    function report(rule, text) {
      printf "%s:%d: [%s] %s\n", file, line, rule, text
    }

    BEGIN {
      raw_exempt = is_raw_value_exempt_path(file)
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
      lower = tolower(text);

      if (has_legacy_guard_indicator(text, lower)) {
        report("legacy_drift", text);
      }

      if (!raw_exempt) {
        if (has_contract_color_literal(text, lower)) {
          report("token_color_literal", text);
        }
        if (has_contract_raw_px(text, lower)) {
          report("token_raw_px", text);
        }
        if (has_contract_raw_radius(lower)) {
          report("token_raw_radius", text);
        }
        if (has_contract_raw_shadow(lower)) {
          report("token_raw_shadow", text);
        }
      }

      if (has_disallowed_utility(lower)) {
        report("token_disallowed_utility", text);
      }
      if (has_disallowed_transition_all(lower)) {
        report("motion_transition_all", text);
      }
      if (has_window_overlay_modal(text, lower)) {
        report("window_modal_overlay", text);
      }
      if (has_brand_case_violation(text)) {
        report("brand_case", text);
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
  SORTED_VIOLATIONS=()
  while IFS= read -r entry; do
    [[ -n "$entry" ]] && SORTED_VIOLATIONS+=("$entry")
  done < <(printf '%s\n' "${VIOLATIONS[@]}" | LC_ALL=C sort -u)
  echo "UI_DESIGN_GUARD_RESULT|status=FAIL|violations=${#SORTED_VIOLATIONS[@]}|scope=${SCOPED_PATHS[*]}"
  echo "UI design guard failed. Newly introduced design drift indicators detected (${#SORTED_VIOLATIONS[@]}):"
  for entry in "${SORTED_VIOLATIONS[@]}"; do
    echo "- $entry"
    if [[ "$entry" =~ ^([^:]+):([0-9]+):\ \[([^]]+)\]\ (.*)$ ]]; then
      file="${BASH_REMATCH[1]}"
      line="${BASH_REMATCH[2]}"
      rule="${BASH_REMATCH[3]}"
      snippet="${BASH_REMATCH[4]}"
      snippet="${snippet//$'\t'/ }"
      echo "UI_DESIGN_GUARD_VIOLATION|status=FAIL|file=${file}|line=${line}|rule=${rule}|snippet=${snippet}"
    else
      echo "UI_DESIGN_GUARD_VIOLATION|status=FAIL|entry=${entry}"
    fi
  done
  echo
  echo "Blocked patterns: $DRIFT_PATTERN_DESC"
  echo "Token contract source: $TOKEN_CONTRACT_DOC"
  echo "Raw value exceptions: **/tokens/**, **/globals.css, **/tailwind.config.*"
  echo "Scope: ${SCOPED_PATHS[*]}"
  exit 1
fi

echo "UI_DESIGN_GUARD_RESULT|status=PASS|violations=0|scope=${SCOPED_PATHS[*]}"
echo "UI design guard passed (no new design drift indicators introduced)."
