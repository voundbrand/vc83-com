#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <app-path>"
  echo "Example: $0 apps/one-of-one-landing"
  exit 1
fi

APP_PATH="$1"
BASE_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"
HEAD_SHA="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
SHOULD_BUILD=0

if [[ -n "$BASE_SHA" ]] && git cat-file -e "$BASE_SHA^{commit}" >/dev/null 2>&1; then
  CHANGED_FILES="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" || true)"
else
  CHANGED_FILES="$(git show --pretty="" --name-only "$HEAD_SHA" || true)"
fi

if [[ -z "${CHANGED_FILES// }" ]]; then
  echo "No changed files detected, running build by default."
  exit 1
fi

IFS=',' read -r -a EXTRA_GLOBS <<< "${VERCEL_EXTRA_GLOBS:-}"

while IFS= read -r file; do
  [[ -z "$file" ]] && continue

  case "$file" in
    "$APP_PATH"/*|package.json|package-lock.json|tsconfig.json)
      SHOULD_BUILD=1
      break
      ;;
  esac

  for pattern in "${EXTRA_GLOBS[@]}"; do
    trimmed="${pattern#"${pattern%%[![:space:]]*}"}"
    trimmed="${trimmed%"${trimmed##*[![:space:]]}"}"
    [[ -z "$trimmed" ]] && continue
    case "$file" in
      $trimmed)
        SHOULD_BUILD=1
        break 2
        ;;
    esac
  done
done <<< "$CHANGED_FILES"

if [[ "$SHOULD_BUILD" -eq 1 ]]; then
  echo "Relevant changes detected for $APP_PATH. Build should run."
  exit 1
fi

echo "No relevant changes for $APP_PATH. Skipping build."
exit 0
