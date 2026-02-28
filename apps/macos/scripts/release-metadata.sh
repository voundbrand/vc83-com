#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${MACOS_ROOT}/.." && pwd)"

OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
OUT_FILE="${OUT_FILE:-${OUT_DIR}/build-metadata.json}"
PRODUCT_NAME="${PRODUCT_NAME:-sevenlayers-mac}"
BUILD_CONFIGURATION="${BUILD_CONFIGURATION:-release}"
SOURCE_EPOCH="${SOURCE_DATE_EPOCH:-}"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

if [[ -z "${SOURCE_EPOCH}" ]]; then
  SOURCE_EPOCH="$(git -C "${REPO_ROOT}" log -1 --pretty=%ct 2>/dev/null || true)"
fi

if [[ -z "${SOURCE_EPOCH}" ]]; then
  SOURCE_EPOCH="0"
fi

if ! [[ "${SOURCE_EPOCH}" =~ ^[0-9]+$ ]]; then
  echo "SOURCE_DATE_EPOCH must be an integer epoch value (received: ${SOURCE_EPOCH})." >&2
  exit 1
fi

if ! GIT_COMMIT="$(git -C "${REPO_ROOT}" rev-parse HEAD 2>/dev/null)"; then
  GIT_COMMIT="unknown"
fi

GIT_TREE_STATE="clean"
if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null || true)" ]]; then
  GIT_TREE_STATE="dirty"
fi

if ! SWIFT_VERSION_RAW="$(swift --version 2>/dev/null)"; then
  SWIFT_VERSION_RAW="unknown"
fi

SWIFT_VERSION="$(printf '%s' "${SWIFT_VERSION_RAW}" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/[[:space:]]*$//')"

if ! GENERATED_AT_UTC="$(date -u -r "${SOURCE_EPOCH}" "+%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)"; then
  GENERATED_AT_UTC="1970-01-01T00:00:00Z"
fi

mkdir -p "${OUT_DIR}"

cat > "${OUT_FILE}" <<EOF
{
  "schema": "vc83_macos_release_metadata_v1",
  "sourceDateEpoch": ${SOURCE_EPOCH},
  "generatedAtUtc": "$(json_escape "${GENERATED_AT_UTC}")",
  "product": "$(json_escape "${PRODUCT_NAME}")",
  "buildConfiguration": "$(json_escape "${BUILD_CONFIGURATION}")",
  "gitCommit": "$(json_escape "${GIT_COMMIT}")",
  "gitTreeState": "$(json_escape "${GIT_TREE_STATE}")",
  "swiftVersion": "$(json_escape "${SWIFT_VERSION}")"
}
EOF

echo "${OUT_FILE}"
