#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
APP_NAME="${APP_NAME:-SevenLayers}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-${MACOS_ROOT}/dist/${APP_NAME}.app}"
VERSION="${VERSION:-0.0.0-dev}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-stable}"

mkdir -p "${OUT_DIR}"

METADATA_PATH="$("${SCRIPT_DIR}/release-metadata.sh")"
ZIP_PATH="${OUT_DIR}/${APP_NAME}-${VERSION}.zip"
DMG_PATH="${OUT_DIR}/${APP_NAME}-${VERSION}.dmg"
PACKAGE_PLAN_PATH="${OUT_DIR}/package-plan.json"
APPCAST_PATH="${OUT_DIR}/updates/${RELEASE_CHANNEL}/appcast.xml"

bundle_present=false
if [[ -d "${APP_BUNDLE_PATH}" ]]; then
  bundle_present=true
fi

cat > "${PACKAGE_PLAN_PATH}" <<EOF
{
  "schema": "vc83_macos_release_package_plan_v1",
  "version": "${VERSION}",
  "releaseChannel": "${RELEASE_CHANNEL}",
  "appBundlePath": "${APP_BUNDLE_PATH}",
  "appBundlePresent": ${bundle_present},
  "plannedArtifacts": {
    "zip": "${ZIP_PATH}",
    "dmg": "${DMG_PATH}",
    "appcast": "${APPCAST_PATH}"
  },
  "metadataPath": "${METADATA_PATH}",
  "notes": "MCR-014 release contract: deterministic packaging plan with DMG + appcast channel outputs."
}
EOF

if [[ "${bundle_present}" == "true" ]]; then
  rm -f "${ZIP_PATH}"
  ditto -c -k --sequesterRsrc --keepParent "${APP_BUNDLE_PATH}" "${ZIP_PATH}"
  echo "Created ZIP artifact: ${ZIP_PATH}"
else
  echo "App bundle not found at ${APP_BUNDLE_PATH}; created package plan only."
fi

echo "Package plan: ${PACKAGE_PLAN_PATH}"
