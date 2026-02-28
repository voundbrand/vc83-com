#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
OUT_FILE="${OUT_FILE:-${OUT_DIR}/preflight-report.json}"

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

missing=()
warnings=()

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    missing+=("missing_command:${cmd}")
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  missing+=("platform:macOS_required")
fi

require_command swift
require_command xcrun
require_command codesign
require_command security
require_command ditto
require_command hdiutil

SIGNING_IDENTITY="${SIGN_IDENTITY:-}"
if [[ -z "${SIGNING_IDENTITY}" ]]; then
  SIGNING_IDENTITY="$(
    security find-identity -p codesigning -v 2>/dev/null \
      | awk -F'"' '/Developer ID Application|Apple Distribution|Apple Development/ { print $2; exit }'
  )"
fi

if [[ -z "${SIGNING_IDENTITY}" ]]; then
  missing+=("codesign_identity:missing")
fi

NOTARY_MODE="none"
if [[ -n "${NOTARYTOOL_PROFILE:-}" ]]; then
  NOTARY_MODE="keychain-profile"
elif [[ -n "${NOTARYTOOL_KEY:-}" && -n "${NOTARYTOOL_KEY_ID:-}" && -n "${NOTARYTOOL_ISSUER:-}" ]]; then
  NOTARY_MODE="api-key"
else
  missing+=("notary_credentials:missing")
fi

if [[ -z "${SOURCE_DATE_EPOCH:-}" ]]; then
  warnings+=("SOURCE_DATE_EPOCH_unset:defaulting_to_git_commit_time")
fi

mkdir -p "${OUT_DIR}"

status="ok"
if (( ${#missing[@]} > 0 )); then
  status="blocked"
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

cat > "${OUT_FILE}" <<EOF
{
  "schema": "vc83_macos_release_preflight_v1",
  "mode": "${MODE}",
  "status": "${status}",
  "notaryAuthMode": "${NOTARY_MODE}",
  "signingIdentityDetected": $( [[ -n "${SIGNING_IDENTITY}" ]] && printf 'true' || printf 'false' ),
  "missingRequirements": $(json_array "${missing[@]}"),
  "warnings": $(json_array "${warnings[@]}")
}
EOF

if (( ${#missing[@]} > 0 )); then
  echo "Release preflight: BLOCKED" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "Report: ${OUT_FILE}" >&2
  if [[ "${MODE}" == "strict" ]]; then
    exit 1
  fi
else
  echo "Release preflight: OK"
  echo "Report: ${OUT_FILE}"
fi
