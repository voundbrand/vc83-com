#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
APP_NAME="${APP_NAME:-SevenLayers}"
VERSION="${VERSION:-0.0.0-dev}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-stable}"
RELEASE_TAG="${RELEASE_TAG:-v${VERSION}}"
RELEASE_NAME="${RELEASE_NAME:-${APP_NAME} ${VERSION}}"
RELEASE_NOTES_FILE="${RELEASE_NOTES_FILE:-${OUT_DIR}/release-notes.md}"
GH_RELEASE_REPORT_PATH="${GH_RELEASE_REPORT_PATH:-${OUT_DIR}/github-release-report.json}"
GH_REPO="${GH_REPO:-${GITHUB_REPOSITORY:-}}"

ZIP_PATH="${ZIP_PATH:-${OUT_DIR}/${APP_NAME}-${VERSION}.zip}"
DMG_PATH="${DMG_PATH:-${OUT_DIR}/${APP_NAME}-${VERSION}.dmg}"
APPCAST_PATH="${APPCAST_PATH:-${OUT_DIR}/updates/${RELEASE_CHANNEL}/appcast.xml}"
SIGNED_APPCAST_PATH="${SIGNED_APPCAST_PATH:-${OUT_DIR}/updates/${RELEASE_CHANNEL}/appcast.signed.xml}"
UPDATE_CONTRACT_PATH="${UPDATE_CONTRACT_PATH:-${OUT_DIR}/update-contract.json}"
CHANNEL_STRATEGY_PATH="${CHANNEL_STRATEGY_PATH:-${MACOS_ROOT}/Resources/update/channel-strategy.json}"
ROLLBACK_POLICY_PATH="${ROLLBACK_POLICY_PATH:-${MACOS_ROOT}/Resources/update/rollback-policy.json}"
BUILD_METADATA_PATH="${BUILD_METADATA_PATH:-${OUT_DIR}/build-metadata.json}"
PACKAGE_PLAN_PATH="${PACKAGE_PLAN_PATH:-${OUT_DIR}/package-plan.json}"
DMG_PLAN_PATH="${DMG_PLAN_PATH:-${OUT_DIR}/dmg-plan.json}"
NOTARIZATION_REPORT_PATH="${NOTARIZATION_REPORT_PATH:-${OUT_DIR}/notarization-report.json}"
APPCAST_SIGNATURE_REPORT_PATH="${APPCAST_SIGNATURE_REPORT_PATH:-${OUT_DIR}/appcast-signature-evidence.json}"
ALLOW_RELEASE_TAG_MISMATCH="${ALLOW_RELEASE_TAG_MISMATCH:-0}" # 1|0

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

missing=()
warnings=()
status="ok"
release_exists=false
release_created=false
release_updated=false
uploaded_assets=()

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

json_array() {
  local first=1
  printf '['
  for item in "$@"; do
    if [[ ${first} -eq 0 ]]; then
      printf ', '
    fi
    first=0
    printf '"%s"' "$(json_escape "${item}")"
  done
  printf ']'
}

parse_json_string_field() {
  local field_name="$1"
  local file_path="$2"
  sed -n "s/.*\"${field_name}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" "${file_path}" | head -n 1
}

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

expected_release_tag="v${VERSION}"
if [[ ! "${RELEASE_TAG}" =~ ^v ]]; then
  missing+=("release_tag:must_start_with_v")
elif [[ "${ALLOW_RELEASE_TAG_MISMATCH}" != "1" && "${RELEASE_TAG}" != "${expected_release_tag}" ]]; then
  missing+=("release_tag:mismatch_expected:${expected_release_tag}")
fi

if [[ ! -f "${RELEASE_NOTES_FILE}" ]]; then
  cat > "${RELEASE_NOTES_FILE}" <<EOF
# ${APP_NAME} ${VERSION}

- Channel: \`${RELEASE_CHANNEL}\`
- Tag: \`${RELEASE_TAG}\`
- Artifact root: \`${OUT_DIR}\`
EOF
fi

APPCAST_UPLOAD_PATH="${SIGNED_APPCAST_PATH}"
if [[ ! -f "${APPCAST_UPLOAD_PATH}" ]]; then
  APPCAST_UPLOAD_PATH="${APPCAST_PATH}"
fi

required_assets=(
  "${ZIP_PATH}"
  "${DMG_PATH}"
  "${APPCAST_UPLOAD_PATH}"
  "${UPDATE_CONTRACT_PATH}"
)

for required_asset in "${required_assets[@]}"; do
  if [[ ! -f "${required_asset}" ]]; then
    missing+=("artifact:missing:${required_asset}")
  fi
done

if [[ -f "${UPDATE_CONTRACT_PATH}" ]]; then
  zip_artifact_url="$(parse_json_string_field "zipArtifactUrl" "${UPDATE_CONTRACT_PATH}")"
  appcast_url="$(parse_json_string_field "appcastUrl" "${UPDATE_CONTRACT_PATH}")"
  release_notes_url="$(parse_json_string_field "releaseNotesUrl" "${UPDATE_CONTRACT_PATH}")"
  if ! is_valid_public_https_url "${zip_artifact_url}"; then
    missing+=("update_contract:invalid_zip_artifact_url")
  fi
  if ! is_valid_public_https_url "${appcast_url}"; then
    missing+=("update_contract:invalid_appcast_url")
  fi
  if ! is_valid_public_https_url "${release_notes_url}"; then
    missing+=("update_contract:invalid_release_notes_url")
  fi
fi

optional_assets=(
  "${CHANNEL_STRATEGY_PATH}"
  "${ROLLBACK_POLICY_PATH}"
  "${BUILD_METADATA_PATH}"
  "${PACKAGE_PLAN_PATH}"
  "${DMG_PLAN_PATH}"
  "${NOTARIZATION_REPORT_PATH}"
  "${APPCAST_SIGNATURE_REPORT_PATH}"
)

assets_to_upload=("${required_assets[@]}")
for optional_asset in "${optional_assets[@]}"; do
  if [[ -f "${optional_asset}" ]]; then
    assets_to_upload+=("${optional_asset}")
  fi
done

if ! command -v gh >/dev/null 2>&1; then
  missing+=("missing_command:gh")
fi
if [[ -z "${GH_REPO}" ]]; then
  missing+=("github_repository:missing")
fi
if [[ -z "${GITHUB_TOKEN:-}" && -z "${GH_TOKEN:-}" ]]; then
  missing+=("github_token:missing")
fi

if (( ${#missing[@]} > 0 )); then
  status="blocked"
fi

if [[ "${status}" == "ok" && "${MODE}" == "strict" ]]; then
  if gh release view "${RELEASE_TAG}" --repo "${GH_REPO}" >/dev/null 2>&1; then
    release_exists=true
    if [[ "${RELEASE_CHANNEL}" == "stable" ]]; then
      gh release edit "${RELEASE_TAG}" \
        --repo "${GH_REPO}" \
        --title "${RELEASE_NAME}" \
        --notes-file "${RELEASE_NOTES_FILE}" \
        --latest
    else
      gh release edit "${RELEASE_TAG}" \
        --repo "${GH_REPO}" \
        --title "${RELEASE_NAME}" \
        --notes-file "${RELEASE_NOTES_FILE}" \
        --prerelease
    fi
    release_updated=true
  else
    create_args=(
      gh release create "${RELEASE_TAG}"
      --repo "${GH_REPO}"
      --title "${RELEASE_NAME}"
      --notes-file "${RELEASE_NOTES_FILE}"
      --target "${GITHUB_SHA:-HEAD}"
    )
    if [[ "${RELEASE_CHANNEL}" == "stable" ]]; then
      create_args+=(--latest)
    else
      create_args+=(--prerelease)
    fi
    "${create_args[@]}"
    release_created=true
  fi

  for upload_asset in "${assets_to_upload[@]}"; do
    set +e
    gh release upload "${RELEASE_TAG}" "${upload_asset}" --repo "${GH_REPO}" --clobber >/dev/null
    upload_exit_code=$?
    set -e
    if [[ ${upload_exit_code} -ne 0 ]]; then
      status="blocked"
      missing+=("artifact_upload:failed:${upload_asset}")
      continue
    fi
    uploaded_assets+=("${upload_asset}")
  done
elif [[ "${MODE}" == "report" ]]; then
  warnings+=("report_mode:release_publish_skipped")
fi

planned_assets_json='[]'
if (( ${#assets_to_upload[@]} > 0 )); then
  planned_assets_json="$(json_array "${assets_to_upload[@]}")"
fi

uploaded_assets_json='[]'
if (( ${#uploaded_assets[@]} > 0 )); then
  uploaded_assets_json="$(json_array "${uploaded_assets[@]}")"
fi

missing_json='[]'
if (( ${#missing[@]} > 0 )); then
  missing_json="$(json_array "${missing[@]}")"
fi

warnings_json='[]'
if (( ${#warnings[@]} > 0 )); then
  warnings_json="$(json_array "${warnings[@]}")"
fi

cat > "${GH_RELEASE_REPORT_PATH}" <<EOF
{
  "schema": "vc83_macos_release_github_publish_v1",
  "mode": "$(json_escape "${MODE}")",
  "status": "$(json_escape "${status}")",
  "repo": "$(json_escape "${GH_REPO}")",
  "releaseTag": "$(json_escape "${RELEASE_TAG}")",
  "releaseName": "$(json_escape "${RELEASE_NAME}")",
  "releaseChannel": "$(json_escape "${RELEASE_CHANNEL}")",
  "releaseExists": ${release_exists},
  "releaseCreated": ${release_created},
  "releaseUpdated": ${release_updated},
  "releaseNotesFile": "$(json_escape "${RELEASE_NOTES_FILE}")",
  "appcastUploadPath": "$(json_escape "${APPCAST_UPLOAD_PATH}")",
  "plannedAssets": ${planned_assets_json},
  "uploadedAssets": ${uploaded_assets_json},
  "missingRequirements": ${missing_json},
  "warnings": ${warnings_json}
}
EOF

if [[ "${status}" == "blocked" ]]; then
  echo "GitHub release publish: BLOCKED" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "Report: ${GH_RELEASE_REPORT_PATH}" >&2
  if [[ "${MODE}" == "strict" ]]; then
    exit 1
  fi
else
  if [[ "${MODE}" == "strict" ]]; then
    echo "GitHub release publish: OK"
  else
    echo "GitHub release contract validated (report mode)."
  fi
  echo "Report: ${GH_RELEASE_REPORT_PATH}"
fi
