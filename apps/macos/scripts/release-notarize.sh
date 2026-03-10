#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
APP_NAME="${APP_NAME:-SevenLayers}"
VERSION="${VERSION:-0.0.0-dev}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-${MACOS_ROOT}/dist/${APP_NAME}.app}"
DMG_PATH="${DMG_PATH:-${OUT_DIR}/${APP_NAME}-${VERSION}.dmg}"
ZIP_PATH="${ZIP_PATH:-${OUT_DIR}/${APP_NAME}-${VERSION}.zip}"
NOTARIZE_TARGET="${NOTARIZE_TARGET:-}"
NOTARIZATION_REPORT_PATH="${NOTARIZATION_REPORT_PATH:-${OUT_DIR}/notarization-report.json}"
NOTARY_OUTPUT_PATH="${NOTARY_OUTPUT_PATH:-${OUT_DIR}/notarytool-submit.json}"
APP_STAPLE_LOG_PATH="${APP_STAPLE_LOG_PATH:-${OUT_DIR}/staple-app.log}"
DMG_STAPLE_LOG_PATH="${DMG_STAPLE_LOG_PATH:-${OUT_DIR}/staple-dmg.log}"

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

if [[ -z "${NOTARIZE_TARGET}" ]]; then
  if [[ -f "${DMG_PATH}" ]]; then
    NOTARIZE_TARGET="${DMG_PATH}"
  elif [[ -f "${ZIP_PATH}" ]]; then
    NOTARIZE_TARGET="${ZIP_PATH}"
  else
    NOTARIZE_TARGET="${DMG_PATH}"
  fi
fi

missing=()
warnings=()
status="ok"
notary_auth_mode="none"
notary_submission_id=""
notary_submission_status=""
notarization_attempted=false
notarization_accepted=false
app_stapled=false
dmg_stapled=false

if [[ "${APP_NAME}" != "SevenLayers" ]]; then
  missing+=("app_name:must_be_SevenLayers")
fi

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    missing+=("missing_command:${command_name}")
  fi
}

require_xcrun_tool() {
  local tool_name="$1"
  if ! xcrun --find "${tool_name}" >/dev/null 2>&1; then
    missing+=("missing_command:${tool_name}")
  fi
}

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

if [[ ! -e "${NOTARIZE_TARGET}" ]]; then
  missing+=("notarize_target:missing")
fi
if [[ ! -d "${APP_BUNDLE_PATH}" ]]; then
  missing+=("app_bundle:missing")
fi
if [[ ! -f "${DMG_PATH}" ]]; then
  missing+=("dmg_artifact:missing")
fi

require_command xcrun
if command -v xcrun >/dev/null 2>&1; then
  require_xcrun_tool notarytool
  require_xcrun_tool stapler
fi

if [[ -n "${NOTARYTOOL_PROFILE:-}" ]]; then
  notary_auth_mode="keychain-profile"
elif [[ -n "${NOTARYTOOL_KEY:-}" && -n "${NOTARYTOOL_KEY_ID:-}" && -n "${NOTARYTOOL_ISSUER:-}" ]]; then
  if [[ ! -f "${NOTARYTOOL_KEY}" ]]; then
    missing+=("notary_key_file:missing")
  fi
  notary_auth_mode="api-key"
else
  missing+=("notary_credentials:missing")
fi

if (( ${#missing[@]} > 0 )); then
  status="blocked"
fi

if [[ "${status}" == "ok" && "${MODE}" == "strict" ]]; then
  notarization_attempted=true
  submit_cmd=(xcrun notarytool submit "${NOTARIZE_TARGET}" --wait --output-format json)
  if [[ "${notary_auth_mode}" == "keychain-profile" ]]; then
    submit_cmd+=(--keychain-profile "${NOTARYTOOL_PROFILE}")
  else
    submit_cmd+=(--key "${NOTARYTOOL_KEY}" --key-id "${NOTARYTOOL_KEY_ID}" --issuer "${NOTARYTOOL_ISSUER}")
  fi
  if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
    submit_cmd+=(--team-id "${APPLE_TEAM_ID}")
  fi

  set +e
  "${submit_cmd[@]}" > "${NOTARY_OUTPUT_PATH}" 2>&1
  submit_exit_code=$?
  set -e

  if [[ ${submit_exit_code} -ne 0 ]]; then
    status="blocked"
    missing+=("notary_submission:failed")
    warnings+=("notary_output:${NOTARY_OUTPUT_PATH}")
  else
    notary_submission_id="$(
      sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${NOTARY_OUTPUT_PATH}" | head -n 1
    )"
    notary_submission_status="$(
      sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${NOTARY_OUTPUT_PATH}" | head -n 1
    )"
    if [[ "${notary_submission_status}" != "Accepted" ]]; then
      status="blocked"
      missing+=("notary_status:${notary_submission_status:-unknown}")
      if [[ -f "${NOTARY_OUTPUT_PATH}" ]]; then
        echo "Notary tool output (${NOTARY_OUTPUT_PATH}):" >&2
        sed -n '1,240p' "${NOTARY_OUTPUT_PATH}" >&2
      fi
    else
      notarization_accepted=true

      set +e
      xcrun stapler staple "${APP_BUNDLE_PATH}" > "${APP_STAPLE_LOG_PATH}" 2>&1
      app_staple_exit_code=$?
      set -e
      if [[ ${app_staple_exit_code} -ne 0 ]]; then
        status="blocked"
        missing+=("staple_app:failed")
      else
        app_stapled=true
      fi

      set +e
      xcrun stapler staple "${DMG_PATH}" > "${DMG_STAPLE_LOG_PATH}" 2>&1
      dmg_staple_exit_code=$?
      set -e
      if [[ ${dmg_staple_exit_code} -ne 0 ]]; then
        status="blocked"
        missing+=("staple_dmg:failed")
      else
        dmg_stapled=true
      fi
    fi
  fi
elif [[ "${MODE}" == "report" ]]; then
  warnings+=("report_mode:notarization_execution_skipped")
fi

missing_json='[]'
if (( ${#missing[@]} > 0 )); then
  missing_json="$(json_array "${missing[@]}")"
fi

warnings_json='[]'
if (( ${#warnings[@]} > 0 )); then
  warnings_json="$(json_array "${warnings[@]}")"
fi

cat > "${NOTARIZATION_REPORT_PATH}" <<EOF
{
  "schema": "vc83_macos_release_notarization_v1",
  "mode": "$(json_escape "${MODE}")",
  "status": "$(json_escape "${status}")",
  "notaryAuthMode": "$(json_escape "${notary_auth_mode}")",
  "notarizeTarget": "$(json_escape "${NOTARIZE_TARGET}")",
  "appBundlePath": "$(json_escape "${APP_BUNDLE_PATH}")",
  "dmgPath": "$(json_escape "${DMG_PATH}")",
  "zipPath": "$(json_escape "${ZIP_PATH}")",
  "notarizationAttempted": ${notarization_attempted},
  "notarizationAccepted": ${notarization_accepted},
  "notarySubmissionId": "$(json_escape "${notary_submission_id}")",
  "notarySubmissionStatus": "$(json_escape "${notary_submission_status}")",
  "notaryOutputPath": "$(json_escape "${NOTARY_OUTPUT_PATH}")",
  "appStapled": ${app_stapled},
  "dmgStapled": ${dmg_stapled},
  "appStapleLogPath": "$(json_escape "${APP_STAPLE_LOG_PATH}")",
  "dmgStapleLogPath": "$(json_escape "${DMG_STAPLE_LOG_PATH}")",
  "missingRequirements": ${missing_json},
  "warnings": ${warnings_json}
}
EOF

if [[ "${status}" == "blocked" ]]; then
  echo "Notarization: BLOCKED" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "Report: ${NOTARIZATION_REPORT_PATH}" >&2
  if [[ "${MODE}" == "strict" ]]; then
    exit 1
  fi
else
  if [[ "${MODE}" == "strict" ]]; then
    echo "Notarization: OK"
  else
    echo "Notarization contract validated (report mode)."
  fi
  echo "Report: ${NOTARIZATION_REPORT_PATH}"
fi
