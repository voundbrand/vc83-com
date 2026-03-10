#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_NAME="${APP_NAME:-SevenLayers}"
EXECUTABLE_SOURCE="${EXECUTABLE_SOURCE:-${MACOS_ROOT}/.build/release/sevenlayers-mac}"
EXECUTABLE_NAME="${EXECUTABLE_NAME:-SevenLayers}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-${MACOS_ROOT}/dist/${APP_NAME}.app}"
BUNDLE_IDENTIFIER="${BUNDLE_IDENTIFIER:-com.vc83.sevenlayers}"
VERSION="${VERSION:-0.0.0-dev}"
MIN_OS_VERSION="${MIN_OS_VERSION:-14.0}"
BUILD_CONFIGURATION="${BUILD_CONFIGURATION:-release}"
SIGN_IDENTITY="${SIGN_IDENTITY:--}"

if [[ ! -x "${EXECUTABLE_SOURCE}" ]]; then
  (
    cd "${MACOS_ROOT}"
    swift build -c "${BUILD_CONFIGURATION}" --product sevenlayers-mac
  )
fi

rm -rf "${APP_BUNDLE_PATH}"
mkdir -p "${APP_BUNDLE_PATH}/Contents/MacOS" "${APP_BUNDLE_PATH}/Contents/Resources"

cp "${EXECUTABLE_SOURCE}" "${APP_BUNDLE_PATH}/Contents/MacOS/${EXECUTABLE_NAME}"
chmod +x "${APP_BUNDLE_PATH}/Contents/MacOS/${EXECUTABLE_NAME}"

cat > "${APP_BUNDLE_PATH}/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_IDENTIFIER}</string>
  <key>CFBundleVersion</key>
  <string>${VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundleExecutable</key>
  <string>${EXECUTABLE_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>${MIN_OS_VERSION}</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
</dict>
</plist>
EOF

# Notarization requires hardened runtime for Developer ID distributions.
codesign --force --deep --options runtime --timestamp --sign "${SIGN_IDENTITY}" "${APP_BUNDLE_PATH}"

echo "${APP_BUNDLE_PATH}"
