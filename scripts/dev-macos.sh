#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/dev-macos.sh [--release] [--test] [--xcode] [--build-only] [-- <app args...>]

Examples:
  scripts/dev-macos.sh
  scripts/dev-macos.sh -- --verbose
  scripts/dev-macos.sh --test
  scripts/dev-macos.sh --xcode

What it does:
  - Default: fast local run via `swift run sevenlayers-mac`
  - --test: runs `swift test` in apps/macos
  - --xcode: opens Package.swift in Xcode
  - --build-only: builds but does not run
  - --release: uses release config (default is debug for speed)
EOF
}

RUN_TESTS=0
OPEN_XCODE=0
BUILD_ONLY=0
CONFIGURATION="debug"
APP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --test)
      RUN_TESTS=1
      shift
      ;;
    --xcode)
      OPEN_XCODE=1
      shift
      ;;
    --build-only)
      BUILD_ONLY=1
      shift
      ;;
    --release)
      CONFIGURATION="release"
      shift
      ;;
    --)
      shift
      APP_ARGS=("$@")
      break
      ;;
    *)
      APP_ARGS+=("$1")
      shift
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "Not inside a git repository." >&2
  exit 1
fi
MACOS_DIR="${REPO_ROOT}/apps/macos"

if [[ ! -f "${MACOS_DIR}/Package.swift" ]]; then
  echo "Expected macOS package at ${MACOS_DIR}/Package.swift" >&2
  exit 1
fi

if [[ "${OPEN_XCODE}" -eq 1 ]]; then
  open "${MACOS_DIR}/Package.swift"
fi

cd "${MACOS_DIR}"

if [[ "${RUN_TESTS}" -eq 1 ]]; then
  echo "Running tests in apps/macos..."
  swift test
  exit 0
fi

if [[ "${BUILD_ONLY}" -eq 1 ]]; then
  echo "Building sevenlayers-mac (${CONFIGURATION})..."
  swift build -c "${CONFIGURATION}" --product sevenlayers-mac
  echo "Build complete."
  exit 0
fi

echo "Launching sevenlayers-mac (${CONFIGURATION})..."
if [[ "${CONFIGURATION}" == "release" ]]; then
  swift run -c release sevenlayers-mac "${APP_ARGS[@]}"
else
  swift run sevenlayers-mac "${APP_ARGS[@]}"
fi
