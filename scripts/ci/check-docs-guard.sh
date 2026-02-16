#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

# Local fallback: compare last commit when SHAs are not provided.
if [[ -z "$BASE_SHA" ]]; then
  if git rev-parse HEAD^ >/dev/null 2>&1; then
    BASE_SHA="$(git rev-parse HEAD^)"
  else
    BASE_SHA="$(git hash-object -t tree /dev/null)"
  fi
fi

# GitHub push events can provide all-zero before SHA on branch creation.
if [[ "$BASE_SHA" =~ ^0+$ ]]; then
  if git rev-parse "${HEAD_SHA}^" >/dev/null 2>&1; then
    BASE_SHA="$(git rev-parse "${HEAD_SHA}^")"
  else
    BASE_SHA="$(git hash-object -t tree /dev/null)"
  fi
fi

CHANGED=()
while IFS= read -r path; do
  [[ -n "$path" ]] && CHANGED+=("$path")
done < <(git diff --name-only --diff-filter=ACMR "$BASE_SHA" "$HEAD_SHA")

if [[ "${#CHANGED[@]}" -eq 0 ]]; then
  echo "Docs guard: no added/copied/moved paths in range."
  exit 0
fi

VIOLATIONS=()

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
    VIOLATIONS+=("$path (openclaw idea notes are archive-only; use docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md)")
    continue
  fi

  # Guard 3: Block commits into local-only reference repos under docs/.
  if [[ "$path" == docs/l4yercak3-cli/* ]] || [[ "$path" == docs/openclaw_idea/openclaw/* ]]; then
    VIOLATIONS+=("$path (reference repo path is local-only and must not be committed)")
    continue
  fi
done

if [[ "${#VIOLATIONS[@]}" -gt 0 ]]; then
  echo "Docs guard failed. Resolve the following:"
  for v in "${VIOLATIONS[@]}"; do
    echo "- $v"
  done
  echo
  echo "Guidance:"
  echo "- Canonical docs home: docs/agentic_system/CANONICAL_DOCS_INDEX.md"
  echo "- Docs entrypoint: docs/README.md"
  echo "- Archive policy: docs/archive/README.md"
  echo "- Root docs allowlist: docs/.root-md-allowlist.txt"
  exit 1
fi

echo "Docs guard passed."
