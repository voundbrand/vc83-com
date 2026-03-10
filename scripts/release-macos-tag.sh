#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/release-macos-tag.sh <version> [release_channel]

Examples:
  scripts/release-macos-tag.sh 0.1.1
  scripts/release-macos-tag.sh 0.1.1 stable

What it does:
  1) Verifies clean git status
  2) Checks tracked risky files under apps/macos
  3) Runs local report-mode rehearsal
  4) Pushes main
  5) Creates and pushes tag v<version> (triggers macos-release workflow)
  6) Watches latest macos-release workflow run (if gh is installed/authenticated)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

VERSION="${1:-}"
RELEASE_CHANNEL="${2:-stable}"

if [[ -z "${VERSION}" ]]; then
  usage
  exit 1
fi

if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Version must look like 0.1.0 (received: ${VERSION})." >&2
  exit 1
fi

case "${RELEASE_CHANNEL}" in
  internal|canary|stable) ;;
  *)
    echo "release_channel must be one of: internal, canary, stable." >&2
    exit 1
    ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "Not inside a git repository." >&2
  exit 1
fi
cd "${REPO_ROOT}"

TAG="v${VERSION}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before releasing." >&2
  git status --short >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "Tag ${TAG} already exists locally." >&2
  exit 1
fi

risky_matches="$(
  git ls-files apps/macos | rg '(^|/)node_modules/|(^|/)dist/|(^|/)\.env($|\.|/)|\.p12$|\.p8$|\.mobileprovision$|\.cer$|\.key$' || true
)"
if [[ -n "${risky_matches}" ]]; then
  echo "Tracked risky files detected under apps/macos. Resolve before release:" >&2
  printf '%s\n' "${risky_matches}" >&2
  exit 1
fi

echo "Running local report-mode rehearsal..."
(
  cd apps/macos
  MODE=report \
  APP_NAME=SevenLayers \
  VERSION="${VERSION}" \
  RELEASE_CHANNEL="${RELEASE_CHANNEL}" \
  RUN_NOTARIZATION=0 \
  RUN_APPCAST_SIGN=0 \
  PUBLISH_GITHUB_RELEASE=0 \
  scripts/release-pipeline.sh
)

echo "Pushing main..."
git checkout main
git pull origin main
git push origin main

echo "Creating and pushing tag ${TAG}..."
git tag "${TAG}"
git push origin "${TAG}"

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    echo "Waiting for macos-release workflow run..."
    run_id=""
    for _ in {1..12}; do
      run_id="$(gh run list --workflow macos-release.yml --limit 1 --json databaseId --jq '.[0].databaseId' || true)"
      if [[ -n "${run_id}" && "${run_id}" != "null" ]]; then
        break
      fi
      sleep 5
    done

    if [[ -n "${run_id}" && "${run_id}" != "null" ]]; then
      gh run watch "${run_id}"
      echo "Release view:"
      gh release view "${TAG}" || true
    else
      echo "Could not auto-detect workflow run. Check GitHub Actions manually." >&2
    fi
  else
    echo "gh is installed but not authenticated. Skipping auto-watch." >&2
  fi
else
  echo "gh CLI not found. Skipping auto-watch." >&2
fi

echo "Done. Release trigger complete for ${TAG}."
