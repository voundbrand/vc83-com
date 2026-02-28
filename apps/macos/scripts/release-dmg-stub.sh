#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
APP_NAME="${APP_NAME:-SevenLayers}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-${MACOS_ROOT}/dist/${APP_NAME}.app}"
VERSION="${VERSION:-0.0.0-dev}"

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

DMG_PATH="${OUT_DIR}/${APP_NAME}-${VERSION}.dmg"
DMG_PLAN_PATH="${OUT_DIR}/dmg-plan.json"
mkdir -p "${OUT_DIR}"

missing=()

if [[ ! -d "${APP_BUNDLE_PATH}" ]]; then
  missing+=("app_bundle:missing")
fi
if ! command -v hdiutil >/dev/null 2>&1; then
  missing+=("missing_command:hdiutil")
fi

status="ok"
dmg_generated=false

if (( ${#missing[@]} > 0 )); then
  status="blocked"
elif [[ "${MODE}" == "strict" ]]; then
  rm -f "${DMG_PATH}"
  hdiutil create \
    -volname "${APP_NAME}" \
    -srcfolder "${APP_BUNDLE_PATH}" \
    -ov \
    -format UDZO \
    "${DMG_PATH}" >/dev/null
  dmg_generated=true
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

cat > "${DMG_PLAN_PATH}" <<EOF
{
  "schema": "vc83_macos_release_dmg_contract_v1",
  "mode": "${MODE}",
  "status": "${status}",
  "appBundlePath": "${APP_BUNDLE_PATH}",
  "dmgPath": "${DMG_PATH}",
  "dmgGenerated": ${dmg_generated},
  "missingRequirements": ${missing_json},
  "notes": "Strict mode creates DMG; report mode validates contract without writing DMG."
}
EOF

if (( ${#missing[@]} > 0 )); then
  echo "DMG contract: BLOCKED" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "Plan: ${DMG_PLAN_PATH}" >&2
  if [[ "${MODE}" == "strict" ]]; then
    exit 1
  fi
else
  if [[ "${dmg_generated}" == "true" ]]; then
    echo "Created DMG artifact: ${DMG_PATH}"
  else
    echo "DMG contract validated (report mode): ${DMG_PLAN_PATH}"
  fi
fi
