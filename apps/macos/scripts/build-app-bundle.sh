#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_NAME="${APP_NAME:-SevenLayers}"
EXECUTABLE_SOURCE="${EXECUTABLE_SOURCE:-${MACOS_ROOT}/.build/release/sevenlayers-mac}"
EXECUTABLE_NAME="${EXECUTABLE_NAME:-SevenLayers}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-${MACOS_ROOT}/dist/${APP_NAME}.app}"
BUNDLE_IDENTIFIER="${BUNDLE_IDENTIFIER:-com.vc83.sevenlayers}"
ICON_SOURCE_PATH="${ICON_SOURCE_PATH:-}"
ICON_FILE_NAME="${ICON_FILE_NAME:-}"
VERSION="${VERSION:-0.0.0-dev}"
MIN_OS_VERSION="${MIN_OS_VERSION:-14.0}"
BUILD_CONFIGURATION="${BUILD_CONFIGURATION:-release}"
SIGN_IDENTITY="${SIGN_IDENTITY:--}"
AUTH_CALLBACK_SCHEME="${AUTH_CALLBACK_SCHEME:-vc83-mac}"
SKIP_BUILD="${SKIP_BUILD:-0}"

if [[ "${SKIP_BUILD}" != "1" ]]; then
  (
    cd "${MACOS_ROOT}"
    swift build -c "${BUILD_CONFIGURATION}" --product sevenlayers-mac
  )
elif [[ ! -x "${EXECUTABLE_SOURCE}" ]]; then
  echo "Executable not found at ${EXECUTABLE_SOURCE} while SKIP_BUILD=1" >&2
  exit 1
fi

if [[ -z "${ICON_SOURCE_PATH}" ]]; then
  if [[ -f "${MACOS_ROOT}/Resources/AppIcon.icns" ]]; then
    ICON_SOURCE_PATH="${MACOS_ROOT}/Resources/AppIcon.icns"
  elif [[ -f "${MACOS_ROOT}/Resources/AppIcon.png" ]]; then
    ICON_SOURCE_PATH="${MACOS_ROOT}/Resources/AppIcon.png"
  fi
fi

if [[ -n "${ICON_SOURCE_PATH}" && -z "${ICON_FILE_NAME}" ]]; then
  ICON_FILE_NAME="$(basename "${ICON_SOURCE_PATH}")"
fi

rm -rf "${APP_BUNDLE_PATH}"
mkdir -p "${APP_BUNDLE_PATH}/Contents/MacOS" "${APP_BUNDLE_PATH}/Contents/Resources"

cp "${EXECUTABLE_SOURCE}" "${APP_BUNDLE_PATH}/Contents/MacOS/${EXECUTABLE_NAME}"
chmod +x "${APP_BUNDLE_PATH}/Contents/MacOS/${EXECUTABLE_NAME}"

if [[ -n "${ICON_SOURCE_PATH}" && -f "${ICON_SOURCE_PATH}" ]]; then
  cp "${ICON_SOURCE_PATH}" "${APP_BUNDLE_PATH}/Contents/Resources/${ICON_FILE_NAME}"
fi

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
EOF

if [[ -n "${ICON_SOURCE_PATH}" && -f "${ICON_SOURCE_PATH}" ]]; then
  cat >> "${APP_BUNDLE_PATH}/Contents/Info.plist" <<EOF
  <key>CFBundleIconFile</key>
  <string>${ICON_FILE_NAME}</string>
EOF
fi

cat >> "${APP_BUNDLE_PATH}/Contents/Info.plist" <<EOF
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>${BUNDLE_IDENTIFIER}.auth</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${AUTH_CALLBACK_SCHEME}</string>
      </array>
    </dict>
  </array>
  <key>LSMinimumSystemVersion</key>
  <string>${MIN_OS_VERSION}</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
</dict>
</plist>
EOF

# Notarization requires hardened runtime for Developer ID distributions.
codesign --force --deep --options runtime --timestamp --sign "${SIGN_IDENTITY}" "${APP_BUNDLE_PATH}"

echo "${APP_BUNDLE_PATH}"
