#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
RESOURCES_DIR="${RESOURCES_DIR:-${MACOS_ROOT}/Resources/update}"
APP_NAME="${APP_NAME:-SevenLayers}"
VERSION="${VERSION:-0.0.0-dev}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-stable}" # internal|canary|stable
DOWNLOAD_URL_PREFIX="${DOWNLOAD_URL_PREFIX:-https://example.invalid/sevenlayers/macos}"
RELEASE_NOTES_URL_BASE="${RELEASE_NOTES_URL_BASE:-https://example.invalid/sevenlayers/releases}"
MIN_OS_VERSION="${MIN_OS_VERSION:-14.0}"
ROLLOUT_INTERVAL_SECONDS="${ROLLOUT_INTERVAL_SECONDS:-43200}"
APPCAST_TEMPLATE_PATH="${APPCAST_TEMPLATE_PATH:-${RESOURCES_DIR}/appcast.template.xml}"
CHANNEL_STRATEGY_PATH="${CHANNEL_STRATEGY_PATH:-${RESOURCES_DIR}/channel-strategy.json}"
ROLLBACK_POLICY_PATH="${ROLLBACK_POLICY_PATH:-${RESOURCES_DIR}/rollback-policy.json}"

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

case "${RELEASE_CHANNEL}" in
  internal)
    ROLLOUT_PERCENT="${ROLLOUT_PERCENT:-100}"
    ROLLBACK_CHANNEL="${ROLLBACK_CHANNEL:-internal}"
    ;;
  canary)
    ROLLOUT_PERCENT="${ROLLOUT_PERCENT:-20}"
    ROLLBACK_CHANNEL="${ROLLBACK_CHANNEL:-internal}"
    ;;
  stable)
    ROLLOUT_PERCENT="${ROLLOUT_PERCENT:-5}"
    ROLLBACK_CHANNEL="${ROLLBACK_CHANNEL:-canary}"
    ;;
  *)
    echo "RELEASE_CHANNEL must be one of internal|canary|stable (received: ${RELEASE_CHANNEL})." >&2
    exit 1
    ;;
esac

APPCAST_DIR="${OUT_DIR}/updates/${RELEASE_CHANNEL}"
APPCAST_PATH="${APPCAST_DIR}/appcast.xml"
UPDATE_CONTRACT_PATH="${OUT_DIR}/update-contract.json"
ZIP_PATH="${OUT_DIR}/${APP_NAME}-${VERSION}.zip"
ZIP_URL="${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/${APP_NAME}-${VERSION}.zip"
RELEASE_NOTES_URL="${RELEASE_NOTES_URL_BASE}/${VERSION}.html"
APPCAST_URL="${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/appcast.xml"
mkdir -p "${APPCAST_DIR}"

missing=()

is_valid_public_https_url() {
  local url="$1"
  if [[ -z "${url}" ]]; then
    return 1
  fi
  if [[ ! "${url}" =~ ^https:// ]]; then
    return 1
  fi
  if [[ "${url}" == *"example.invalid"* ]]; then
    return 1
  fi
  return 0
}

if [[ "${APP_NAME}" != "SevenLayers" ]]; then
  missing+=("app_name:must_be_SevenLayers")
fi
if [[ ! -f "${APPCAST_TEMPLATE_PATH}" ]]; then
  missing+=("appcast_template:missing")
fi
if [[ ! -f "${CHANNEL_STRATEGY_PATH}" ]]; then
  missing+=("channel_strategy:missing")
fi
if [[ ! -f "${ROLLBACK_POLICY_PATH}" ]]; then
  missing+=("rollback_policy:missing")
fi
if [[ ! -f "${ZIP_PATH}" ]]; then
  missing+=("zip_artifact:missing")
fi
if ! is_valid_public_https_url "${DOWNLOAD_URL_PREFIX}"; then
  missing+=("download_url_prefix:invalid_public_https")
fi
if ! is_valid_public_https_url "${RELEASE_NOTES_URL_BASE}"; then
  missing+=("release_notes_url_base:invalid_public_https")
fi

SOURCE_EPOCH="${SOURCE_DATE_EPOCH:-}"
if [[ -z "${SOURCE_EPOCH}" ]]; then
  SOURCE_EPOCH="$(git -C "${MACOS_ROOT}/.." log -1 --pretty=%ct 2>/dev/null || true)"
fi
if [[ -z "${SOURCE_EPOCH}" || ! "${SOURCE_EPOCH}" =~ ^[0-9]+$ ]]; then
  SOURCE_EPOCH="0"
fi

PUB_DATE_RFC2822="$(date -u -r "${SOURCE_EPOCH}" "+%a, %d %b %Y %H:%M:%S +0000" 2>/dev/null || true)"
if [[ -z "${PUB_DATE_RFC2822}" ]]; then
  PUB_DATE_RFC2822="Thu, 01 Jan 1970 00:00:00 +0000"
fi

BUILD_NUMBER="${BUILD_NUMBER:-${SOURCE_EPOCH}}"
if [[ -z "${BUILD_NUMBER}" || ! "${BUILD_NUMBER}" =~ ^[0-9]+$ ]]; then
  BUILD_NUMBER="0"
fi

status="ok"
if (( ${#missing[@]} > 0 )); then
  status="blocked"
fi

if [[ "${status}" == "ok" || "${MODE}" == "report" ]]; then
  sed \
    -e "s|__VERSION__|${VERSION}|g" \
    -e "s|__BUILD_NUMBER__|${BUILD_NUMBER}|g" \
    -e "s|__CHANNEL__|${RELEASE_CHANNEL}|g" \
    -e "s|__ROLLOUT_PERCENT__|${ROLLOUT_PERCENT}|g" \
    -e "s|__ROLLOUT_INTERVAL_SECONDS__|${ROLLOUT_INTERVAL_SECONDS}|g" \
    -e "s|__ZIP_URL__|${ZIP_URL}|g" \
    -e "s|__RELEASE_NOTES_URL__|${RELEASE_NOTES_URL}|g" \
    -e "s|__MIN_OS_VERSION__|${MIN_OS_VERSION}|g" \
    -e "s|__PUB_DATE_RFC2822__|${PUB_DATE_RFC2822}|g" \
    -e "s|__SPARKLE_ED_SIGNATURE__|TODO_SPARKLE_ED25519_SIGNATURE|g" \
    "${APPCAST_TEMPLATE_PATH}" > "${APPCAST_PATH}"
fi

json_array() {
  local first=1
  printf '['
  for item in "$@"; do
    if [[ ${first} -eq 0 ]]; then
      printf ', '
    fi
    first=0
    printf '"%s"' "${item}"
  done
  printf ']'
}

missing_json='[]'
if (( ${#missing[@]} > 0 )); then
  missing_json="$(json_array "${missing[@]}")"
fi

cat > "${UPDATE_CONTRACT_PATH}" <<EOF
{
  "schema": "vc83_macos_release_update_contract_v1",
  "mode": "${MODE}",
  "status": "${status}",
  "version": "${VERSION}",
  "buildNumber": "${BUILD_NUMBER}",
  "channel": "${RELEASE_CHANNEL}",
  "rolloutPercent": ${ROLLOUT_PERCENT},
  "rolloutIntervalSeconds": ${ROLLOUT_INTERVAL_SECONDS},
  "rollbackChannel": "${ROLLBACK_CHANNEL}",
  "zipArtifactPath": "${ZIP_PATH}",
  "zipArtifactUrl": "${ZIP_URL}",
  "appcastPath": "${APPCAST_PATH}",
  "appcastUrl": "${APPCAST_URL}",
  "releaseNotesUrl": "${RELEASE_NOTES_URL}",
  "channelStrategyPath": "${CHANNEL_STRATEGY_PATH}",
  "rollbackPolicyPath": "${ROLLBACK_POLICY_PATH}",
  "missingRequirements": ${missing_json}
}
EOF

if (( ${#missing[@]} > 0 )); then
  echo "Auto-update contract: BLOCKED" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "Contract: ${UPDATE_CONTRACT_PATH}" >&2
  if [[ "${MODE}" == "strict" ]]; then
    exit 1
  fi
else
  echo "Appcast generated: ${APPCAST_PATH}"
  echo "Update contract: ${UPDATE_CONTRACT_PATH}"
fi
