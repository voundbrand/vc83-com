#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

USE_WORKTREE=0
if [[ -z "$BASE_SHA" ]]; then
  USE_WORKTREE=1
fi

CHANGED=()
if [[ "$USE_WORKTREE" -eq 1 ]]; then
  # Local mode: validate current tree changes against HEAD.
  while IFS= read -r path; do
    [[ -n "$path" ]] && CHANGED+=("$path")
  done < <(git diff --name-only --diff-filter=ACMR HEAD)
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
  done < <(git diff --name-only --diff-filter=ACMR "$BASE_SHA" "$HEAD_SHA")
fi

if [[ "${#CHANGED[@]}" -eq 0 ]]; then
  echo "Docs guard: no added/copied/moved paths in range."
  exit 0
fi

VIOLATIONS=()
PLAN_TEMPLATE_DIRECTIVE="<!-- ci:ai-endurance-plan-template=v1 -->"

ROOT_ALLOWLIST_FILE="docs/.root-md-allowlist.txt"

if [[ ! -f "$ROOT_ALLOWLIST_FILE" ]]; then
  VIOLATIONS+=("$ROOT_ALLOWLIST_FILE (missing; required for strict root-doc allowlist enforcement)")
fi

for path in "${CHANGED[@]}"; do
  # Guard 1: Strict allowlist for docs root markdown files.
  if [[ "$path" =~ ^docs/[^/]+\.md$ ]]; then
    if ! grep -Fxq "$path" "$ROOT_ALLOWLIST_FILE"; then
      VIOLATIONS+=("$path (root docs markdown path is not allowlisted in $ROOT_ALLOWLIST_FILE)")
      continue
    fi
  fi

  # Guard 2: Block new openclaw idea markdown notes (only README stub allowed).
  if [[ "$path" =~ ^docs/openclaw_idea/[^/]+\.md$ ]] && [[ "$path" != "docs/openclaw_idea/README.md" ]]; then
    VIOLATIONS+=("$path (openclaw idea notes are archive-only; use docs/platform/OPENCLAW_IDEA_INTEGRATION.md)")
    continue
  fi

  # Guard 3: Block commits into local-only reference projects under docs/.
  if [[ "$path" == docs/reference_projects/* ]] && [[ "$path" != "docs/reference_projects/README.md" ]]; then
    VIOLATIONS+=("$path (reference project path is local-only and must not be committed)")
    continue
  fi
  if [[ "$path" == docs/l4yercak3-cli/* ]] || [[ "$path" == docs/l4yercak3_systems/* ]] || [[ "$path" == docs/openclaw_idea/openclaw/* ]] || [[ "$path" == docs/prototypes_from_v0/* ]]; then
    VIOLATIONS+=("$path (legacy reference project path; move under docs/reference_projects/)")
    continue
  fi

  # Guard 4: Block nested repo/dependency artifacts anywhere under docs/.
  if [[ "$path" == docs/*/.git ]] || [[ "$path" == docs/*/.git/* ]] || [[ "$path" == docs/*/node_modules/* ]]; then
    VIOLATIONS+=("$path (nested .git or node_modules under docs/ is not allowed in commits)")
    continue
  fi

  # Guard 5: Keep bring_it_all_together docs-only (no non-markdown assets).
  if [[ "$path" =~ ^docs/bring_it_all_together/.+\.[^/]+$ ]] && [[ ! "$path" =~ \.md$ ]]; then
    VIOLATIONS+=("$path (docs/bring_it_all_together is docs-only; move assets to docs/reference_projects/bring_it_all_together_assets/)")
    continue
  fi

  # Guard 6: Prevent reintroducing archived asset-only top-level folders.
  if [[ "$path" == docs/000_pdfs/* ]] || [[ "$path" == docs/screenshots/* ]] || [[ "$path" == docs/ctc-nordstern/* ]]; then
    VIOLATIONS+=("$path (asset-only folder was archived; use docs/archive/non-md-legacy-assets-2026-02-16/ or canonical docs)")
    continue
  fi

  # Guard 7: Prevent reintroducing old singleton top-level topic folders.
  if [[ "$path" == docs/affiliate_software/* ]] || [[ "$path" == docs/callcenter_ai/* ]] || [[ "$path" == docs/compliance_gdpr/* ]] || [[ "$path" == docs/concepts/* ]] || [[ "$path" == docs/donald_miller/* ]] || [[ "$path" == docs/extend_crm/* ]] || [[ "$path" == docs/external-apps-auth/* ]] || [[ "$path" == docs/integrations/* ]] || [[ "$path" == docs/patterns/* ]] || [[ "$path" == docs/v0_to_production_app/* ]] || [[ "$path" == docs/windows_refactor/* ]] || [[ "$path" == docs/REFACTORY/* ]] || [[ "$path" == docs/byok_infra/* ]] || [[ "$path" == docs/filesystem_metaphor/* ]] || [[ "$path" == docs/god_table_refactor/* ]] || [[ "$path" == docs/implementation/* ]] || [[ "$path" == docs/open-source-exploration/* ]] || [[ "$path" == docs/roadmap/* ]]; then
    VIOLATIONS+=("$path (top-level topic folders were consolidated; use docs/reference_docs/single_topic_folders/ or docs/reference_docs/topic_collections/)")
    continue
  fi

  # Guard 8: Prevent reintroducing archived root non-markdown legacy files.
  case "$path" in
    "docs/Plan Segelschule Feb 26 v1.xlsx"|"docs/READY_TO_USE_CHECKOUT_INTEGRATION.tsx"|"docs/Screenshot 2026-01-19 at 21.46.27.png"|"docs/autotrain-autotrain-text-0-examples.jsonl"|"docs/html_form_import.html"|"docs/palantir fde transcript.txt"|"docs/production migration list.txt"|"docs/software eating labor.txt")
      VIOLATIONS+=("$path (root non-markdown legacy file was archived; use docs/archive/root-non-md-legacy-assets-2026-02-16/)")
      continue
      ;;
  esac

  # Guard 9: Enforce ai-endurance implementation plan template contract.
  if [[ "$path" =~ ^docs/ai-endurance/implementation-plans/[^/]+\.md$ ]]; then
    if ! grep -Fxq "$PLAN_TEMPLATE_DIRECTIVE" "$path"; then
      VIOLATIONS+=("$path (missing required directive: $PLAN_TEMPLATE_DIRECTIVE)")
      continue
    fi

    if ! grep -Eq '^# [0-9]{2} Implementation Plan: .+$' "$path"; then
      VIOLATIONS+=("$path (title must match: '# NN Implementation Plan: <topic>')")
      continue
    fi

    REQUIRED_SECTIONS=(
      "## Objective"
      "## Current state in this codebase"
      "## Gaps"
      "## Target state"
      "## Implementation chunks"
      "## Validation"
      "## Exit criteria"
    )

    MISSING_SECTIONS=()
    for section in "${REQUIRED_SECTIONS[@]}"; do
      if ! grep -Fq "$section" "$path"; then
        MISSING_SECTIONS+=("$section")
      fi
    done

    if [[ "${#MISSING_SECTIONS[@]}" -gt 0 ]]; then
      VIOLATIONS+=("$path (missing required sections: ${MISSING_SECTIONS[*]})")
      continue
    fi

    if ! grep -Eq '^## Risks$|^## Risks and mitigations$' "$path"; then
      VIOLATIONS+=("$path (missing required risk section: '## Risks' or '## Risks and mitigations')")
      continue
    fi
  fi

  # Guard 10: Enforce canonical platform docs namespace in changed text files.
  if [[ "$path" != docs/archive/* ]] && [[ "$path" != "scripts/ci/check-docs-guard.sh" ]] && [[ "$path" =~ \.(md|ts|tsx|js|jsx|sh|yml|yaml)$ ]]; then
    if grep -Fq "docs/agentic_system" "$path" || grep -Fq "agentic_system/" "$path"; then
      VIOLATIONS+=("$path (legacy namespace detected; use docs/platform/* canonical paths)")
      continue
    fi
  fi
done

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  echo "Docs guard failed. Resolve the following:"
  for v in "${VIOLATIONS[@]}"; do
    echo "- $v"
  done
  echo
  echo "Guidance:"
  echo "- Canonical docs home: docs/platform/CANONICAL_DOCS_INDEX.md"
  echo "- Docs entrypoint: docs/README.md"
  echo "- Archive policy: docs/archive/README.md"
  echo "- Root docs allowlist: docs/.root-md-allowlist.txt"
  exit 1
fi

echo "Docs guard passed."
