#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Segelschule Altwarp CI Design Guard
#
# Enforces the brand CI design rules from docs/notes-from-gerrit.md:
#   - Color palette: Flaschengrün (#1E3926), Elfenbein (#FFF6C3), Feuerrot (#DB2E26)
#   - No Tailwind opacity variants on primary (use solid hex values)
#   - Subpage heroes: linear-gradient(to bottom, #FFFBEA 0%, #1E3926 30%)
#   - CTA buttons: bg-accent (Feuerrot), NOT bg-primary
#   - Section backgrounds: #FFF6C3 (Elfenbein), NOT #FFFBEA (body bg only)
#
# Usage:
#   bash scripts/ci/check-segelschule-ci-design.sh            # full-scan mode
#   bash scripts/ci/check-segelschule-ci-design.sh BASE HEAD  # diff mode (CI)
#
# Reference: apps/segelschule-altwarp/docs/CI_DESIGN_RULES.md
# ──────────────────────────────────────────────────────────────────────────────

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

USE_WORKTREE=0
FULL_SCAN=0

if [[ -z "$BASE_SHA" ]]; then
  # No args at all → full-scan mode (audit every file)
  FULL_SCAN=1
fi

if [[ "$FULL_SCAN" -eq 0 && -z "$BASE_SHA" ]]; then
  USE_WORKTREE=1
fi

SCOPED_PATHS=(
  "apps/segelschule-altwarp/app"
  "apps/segelschule-altwarp/components"
)

RULES_DOC="apps/segelschule-altwarp/docs/CI_DESIGN_RULES.md"

# Files exempt from scanning (shadcn base variants, theme definitions)
EXEMPT_PATTERNS=(
  "components/ui/button.tsx"
  "components/ui/badge.tsx"
  "components/ui/navigation-menu.tsx"
  "components/ui/field.tsx"
  "components/ui/item.tsx"
  "components/ui/progress.tsx"
  "globals.css"
  "tailwind.config"
  "node_modules"
  "prototype/"
)

is_exempt() {
  local path="$1"
  for pat in "${EXEMPT_PATTERNS[@]}"; do
    if [[ "$path" == *"$pat"* ]]; then
      return 0
    fi
  done
  return 1
}

# ── Collect files to scan ────────────────────────────────────────────────────

FILES=()

if [[ "$FULL_SCAN" -eq 1 ]]; then
  # Full-scan: find all tsx/ts/css files in scoped paths
  for scope in "${SCOPED_PATHS[@]}"; do
    if [[ -d "$scope" ]]; then
      while IFS= read -r path; do
        [[ -n "$path" ]] && FILES+=("$path")
      done < <(find "$scope" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | LC_ALL=C sort)
    fi
  done
else
  # Diff mode
  if [[ "$BASE_SHA" =~ ^0+$ ]]; then
    if git rev-parse "${HEAD_SHA}^" >/dev/null 2>&1; then
      BASE_SHA="$(git rev-parse "${HEAD_SHA}^")"
    else
      BASE_SHA="$(git hash-object -t tree /dev/null)"
    fi
  fi

  while IFS= read -r path; do
    [[ -n "$path" ]] && FILES+=("$path")
  done < <(git diff --name-only --diff-filter=ACMR "$BASE_SHA" "$HEAD_SHA" -- "${SCOPED_PATHS[@]}" | LC_ALL=C sort)
fi

if [[ "${#FILES[@]}" -eq 0 ]]; then
  echo "SEGELSCHULE_CI_DESIGN_RESULT|status=PASS|violations=0|reason=no_files_in_scope|scope=${SCOPED_PATHS[*]}"
  echo "Segelschule CI design guard: no files in scope."
  exit 0
fi

# ── Rule checking ────────────────────────────────────────────────────────────

check_file() {
  local path="$1"

  # Skip exempt files
  if is_exempt "$path"; then
    return 0
  fi

  # Only check tsx/ts files
  if [[ ! "$path" =~ \.(tsx?|css)$ ]]; then
    return 0
  fi

  if [[ ! -f "$path" ]]; then
    return 0
  fi

  awk -v file="$path" '
    function report(rule, text) {
      # Trim leading/trailing whitespace from text
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", text)
      printf "%s:%d: [%s] %s\n", file, NR, rule, text
    }

    {
      line = $0
      lower = tolower(line)
    }

    # ── RULE: primary_opacity_bg ──────────────────────────────────────────
    # No Tailwind opacity variants on primary (>= /30).
    # Blocks: bg-primary/80, from-primary/70, hover:bg-primary/90, text-primary/70
    # Allows: bg-primary/5, bg-primary/10, bg-primary/20, border-primary/20
    /(^|[^[:alnum:]_-])(bg|from|via|to|text|hover:bg|hover:text)-primary\/[3-9][0-9]([^0-9]|$)/ {
      report("primary_opacity_bg", line)
    }

    # ── RULE: washed_hero_gradient ────────────────────────────────────────
    # No bg-gradient-to-b from-primary — this creates washed-out green heroes.
    # Should use inline style: linear-gradient(to bottom, #FFFBEA 0%, #1E3926 30%)
    # Exempts very low-opacity tints (from-primary/5, from-primary/10) used for subtle card backgrounds.
    /bg-gradient-to-b[[:space:]]+(from-primary([[:space:]]|$)|from-primary\/[3-9][0-9])/ {
      report("washed_hero_gradient", line)
    }

    # ── RULE: cta_uses_primary ────────────────────────────────────────────
    # CTA/shimmer buttons must use bg-accent, NOT bg-primary.
    # Catches: className="... bg-primary ... shimmer-button ..."
    /shimmer-button/ && /bg-primary/ && !/bg-accent/ {
      report("cta_uses_primary", line)
    }

    # ── RULE: prototype_cta_pattern ───────────────────────────────────────
    # Prototype-era CTA pattern: bg-primary hover:bg-primary/90 on action buttons
    # This is the old pattern before Feuerrot was adopted for CTAs.
    /bg-primary[[:space:]]+(text-primary-foreground[[:space:]]+)?hover:bg-primary\/90/ {
      # Only flag if this looks like an action button (has shimmer-button, submit, book, etc.)
      if (/shimmer-button/ || /type="submit"/ || /[Bb]ook/ || /[Bb]uchen/) {
        report("prototype_cta_pattern", line)
      }
    }

    # ── RULE: section_bg_body_color ───────────────────────────────────────
    # #FFFBEA is body background ONLY. Section backgrounds must use #FFF6C3.
    # Catches: bg-[#FFFBEA] used as section/component background.
    # Exempts: bg-[#FFFBEA]/NN (low-opacity hover tints), text-[#FFFBEA] (text color is fine).
    /bg-\[#FFFBEA\]([^\/]|$)/ {
      report("section_bg_body_color", line)
    }

    # ── RULE: orange_opacity ──────────────────────────────────────────────
    # Same as primary — no high-opacity variants on accent/orange colors.
    # Feuerrot (#DB2E26) should be solid; hover state is #AA2023.
    # Blocks: bg-orange/90, hover:bg-orange/90
    # Allows: bg-orange/10 (subtle tints for info boxes)
    /(^|[^[:alnum:]_-])(bg|hover:bg)-orange\/[5-9][0-9]([^0-9]|$)/ {
      report("orange_opacity", line)
    }

  ' "$path"
}

# ── Run checks ───────────────────────────────────────────────────────────────

VIOLATIONS=()
for path in "${FILES[@]}"; do
  while IFS= read -r hit; do
    [[ -n "$hit" ]] && VIOLATIONS+=("$hit")
  done < <(check_file "$path")
done

# ── Report results ───────────────────────────────────────────────────────────

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  SORTED=()
  while IFS= read -r entry; do
    [[ -n "$entry" ]] && SORTED+=("$entry")
  done < <(printf '%s\n' "${VIOLATIONS[@]}" | LC_ALL=C sort -u)

  echo "SEGELSCHULE_CI_DESIGN_RESULT|status=FAIL|violations=${#SORTED[@]}|scope=${SCOPED_PATHS[*]}"
  echo ""
  echo "Segelschule CI design guard FAILED — ${#SORTED[@]} violation(s) detected:"
  echo ""
  for entry in "${SORTED[@]}"; do
    echo "  - $entry"
    if [[ "$entry" =~ ^([^:]+):([0-9]+):\ \[([^]]+)\]\ (.*)$ ]]; then
      file="${BASH_REMATCH[1]}"
      lineno="${BASH_REMATCH[2]}"
      rule="${BASH_REMATCH[3]}"
      snippet="${BASH_REMATCH[4]}"
      snippet="${snippet//$'\t'/ }"
      echo "    SEGELSCHULE_CI_VIOLATION|file=${file}|line=${lineno}|rule=${rule}|snippet=${snippet}"
    fi
  done
  echo ""
  echo "Rules reference: $RULES_DOC"
  echo "Scope: ${SCOPED_PATHS[*]}"
  echo ""
  echo "Quick fixes:"
  echo "  primary_opacity_bg    → Replace bg-primary/80 with bg-[#1E3926CC] or a solid --color-* token"
  echo "  washed_hero_gradient  → Use style={{ background: 'linear-gradient(to bottom, #FFFBEA 0%, #1E3926 30%)' }}"
  echo "  cta_uses_primary      → Replace bg-primary with bg-accent hover:bg-[#AA2023] on CTA buttons"
  echo "  prototype_cta_pattern → Replace bg-primary hover:bg-primary/90 with bg-accent hover:bg-[#AA2023]"
  echo "  section_bg_body_color → Replace bg-[#FFFBEA] with bg-secondary (Elfenbein #FFF6C3)"
  echo "  orange_opacity        → Replace hover:bg-orange/90 with hover:bg-[#AA2023]"
  exit 1
fi

echo "SEGELSCHULE_CI_DESIGN_RESULT|status=PASS|violations=0|scope=${SCOPED_PATHS[*]}"
echo "Segelschule CI design guard passed — no violations detected."
