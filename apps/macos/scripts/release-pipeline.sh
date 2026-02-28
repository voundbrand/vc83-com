#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
VERSION="${VERSION:-0.0.0-dev}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-stable}"
APP_NAME="${APP_NAME:-SevenLayers}"
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
PIPELINE_EVIDENCE_PATH="${PIPELINE_EVIDENCE_PATH:-${OUT_DIR}/release-pipeline-evidence.json}"
BUILD_APP_BUNDLE="${BUILD_APP_BUNDLE:-1}" # 1|0
RUN_NOTARIZATION="${RUN_NOTARIZATION:-1}" # 1|0
RUN_APPCAST_SIGN="${RUN_APPCAST_SIGN:-1}" # 1|0
PUBLISH_GITHUB_RELEASE="${PUBLISH_GITHUB_RELEASE:-0}" # 1|0

PREFLIGHT_REPORT_PATH="${OUT_DIR}/preflight-report.json"
UPDATE_CONTRACT_PATH="${OUT_DIR}/update-contract.json"
NOTARIZATION_REPORT_PATH="${OUT_DIR}/notarization-report.json"
APPCAST_SIGNATURE_REPORT_PATH="${OUT_DIR}/appcast-signature-evidence.json"
GH_RELEASE_REPORT_PATH="${OUT_DIR}/github-release-report.json"
BUILD_METADATA_PATH="${OUT_DIR}/build-metadata.json"
PACKAGE_PLAN_PATH="${OUT_DIR}/package-plan.json"
DMG_PLAN_PATH="${OUT_DIR}/dmg-plan.json"

preflight_status="pending"
build_status="skipped"
package_status="pending"
dmg_status="pending"
appcast_contract_status="pending"
notarization_status="skipped"
appcast_sign_status="skipped"
github_release_status="skipped"
current_stage="initialization"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

read_report_status() {
  local report_path="$1"
  local fallback_status="$2"
  local parsed_status=""
  if [[ -f "${report_path}" ]]; then
    parsed_status="$(sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${report_path}" | head -n 1)"
  fi
  if [[ -n "${parsed_status}" ]]; then
    printf '%s' "${parsed_status}"
  else
    printf '%s' "${fallback_status}"
  fi
}

write_pipeline_evidence() {
  local exit_code="$1"
  local pipeline_status="ok"
  if [[ "${exit_code}" != "0" ]]; then
    pipeline_status="blocked"
  elif [[ "${preflight_status}" == "blocked" || "${build_status}" == "blocked" || "${package_status}" == "blocked" || "${dmg_status}" == "blocked" || "${appcast_contract_status}" == "blocked" || "${notarization_status}" == "blocked" || "${appcast_sign_status}" == "blocked" || "${github_release_status}" == "blocked" ]]; then
    pipeline_status="blocked"
  elif [[ "${preflight_status}" == "failed" || "${build_status}" == "failed" || "${package_status}" == "failed" || "${dmg_status}" == "failed" || "${appcast_contract_status}" == "failed" || "${notarization_status}" == "failed" || "${appcast_sign_status}" == "failed" || "${github_release_status}" == "failed" ]]; then
    pipeline_status="blocked"
  fi

  mkdir -p "${OUT_DIR}"
  cat > "${PIPELINE_EVIDENCE_PATH}" <<EOF
{
  "schema": "vc83_macos_release_pipeline_evidence_v1",
  "mode": "$(json_escape "${MODE}")",
  "status": "$(json_escape "${pipeline_status}")",
  "currentStage": "$(json_escape "${current_stage}")",
  "exitCode": ${exit_code},
  "appName": "$(json_escape "${APP_NAME}")",
  "version": "$(json_escape "${VERSION}")",
  "releaseChannel": "$(json_escape "${RELEASE_CHANNEL}")",
  "stageStatus": {
    "preflight": "$(json_escape "${preflight_status}")",
    "buildAppBundle": "$(json_escape "${build_status}")",
    "package": "$(json_escape "${package_status}")",
    "dmgContract": "$(json_escape "${dmg_status}")",
    "appcastContract": "$(json_escape "${appcast_contract_status}")",
    "notarization": "$(json_escape "${notarization_status}")",
    "appcastSign": "$(json_escape "${appcast_sign_status}")",
    "githubRelease": "$(json_escape "${github_release_status}")"
  },
  "evidencePaths": {
    "preflightReport": "$(json_escape "${PREFLIGHT_REPORT_PATH}")",
    "buildMetadata": "$(json_escape "${BUILD_METADATA_PATH}")",
    "packagePlan": "$(json_escape "${PACKAGE_PLAN_PATH}")",
    "dmgPlan": "$(json_escape "${DMG_PLAN_PATH}")",
    "updateContract": "$(json_escape "${UPDATE_CONTRACT_PATH}")",
    "notarizationReport": "$(json_escape "${NOTARIZATION_REPORT_PATH}")",
    "appcastSignatureReport": "$(json_escape "${APPCAST_SIGNATURE_REPORT_PATH}")",
    "githubReleaseReport": "$(json_escape "${GH_RELEASE_REPORT_PATH}")"
  }
}
EOF
}

mark_current_stage_failed() {
  case "${current_stage}" in
    preflight) preflight_status="failed" ;;
    build_app_bundle) build_status="failed" ;;
    package) package_status="failed" ;;
    dmg_contract) dmg_status="failed" ;;
    appcast_contract) appcast_contract_status="failed" ;;
    notarization) notarization_status="failed" ;;
    appcast_sign) appcast_sign_status="failed" ;;
    github_release) github_release_status="failed" ;;
  esac
}

on_exit() {
  local exit_code="$?"
  set +e
  if [[ "${exit_code}" != "0" ]]; then
    mark_current_stage_failed
  fi
  write_pipeline_evidence "${exit_code}"
}

trap on_exit EXIT

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

if [[ "${APP_NAME}" != "SevenLayers" ]]; then
  echo "APP_NAME must be exactly 'SevenLayers' (received: ${APP_NAME})." >&2
  exit 1
fi

case "${RELEASE_CHANNEL}" in
  internal|canary|stable) ;;
  *)
    echo "RELEASE_CHANNEL must be one of internal|canary|stable (received: ${RELEASE_CHANNEL})." >&2
    exit 1
    ;;
esac

current_stage="preflight"
MODE="${MODE}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-preflight.sh"
preflight_status="$(read_report_status "${PREFLIGHT_REPORT_PATH}" "ok")"

if [[ "${BUILD_APP_BUNDLE}" == "1" ]]; then
  current_stage="build_app_bundle"
  APP_NAME="${APP_NAME}" VERSION="${VERSION}" "${SCRIPT_DIR}/build-app-bundle.sh"
  build_status="ok"
fi

current_stage="package"
APP_NAME="${APP_NAME}" VERSION="${VERSION}" RELEASE_CHANNEL="${RELEASE_CHANNEL}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-package-stub.sh"
package_status="ok"

current_stage="dmg_contract"
MODE="${MODE}" APP_NAME="${APP_NAME}" VERSION="${VERSION}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-dmg-stub.sh"
dmg_status="$(read_report_status "${DMG_PLAN_PATH}" "ok")"

current_stage="appcast_contract"
MODE="${MODE}" APP_NAME="${APP_NAME}" VERSION="${VERSION}" RELEASE_CHANNEL="${RELEASE_CHANNEL}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-appcast-stub.sh"
appcast_contract_status="$(read_report_status "${UPDATE_CONTRACT_PATH}" "ok")"

if [[ "${RUN_NOTARIZATION}" == "1" ]]; then
  current_stage="notarization"
  MODE="${MODE}" APP_NAME="${APP_NAME}" VERSION="${VERSION}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-notarize.sh"
  notarization_status="$(read_report_status "${NOTARIZATION_REPORT_PATH}" "ok")"
fi

if [[ "${RUN_APPCAST_SIGN}" == "1" ]]; then
  current_stage="appcast_sign"
  MODE="${MODE}" APP_NAME="${APP_NAME}" VERSION="${VERSION}" RELEASE_CHANNEL="${RELEASE_CHANNEL}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-sign-appcast.sh"
  appcast_sign_status="$(read_report_status "${APPCAST_SIGNATURE_REPORT_PATH}" "ok")"
fi

if [[ "${PUBLISH_GITHUB_RELEASE}" == "1" ]]; then
  current_stage="github_release"
  MODE="${MODE}" APP_NAME="${APP_NAME}" VERSION="${VERSION}" RELEASE_CHANNEL="${RELEASE_CHANNEL}" OUT_DIR="${OUT_DIR}" "${SCRIPT_DIR}/release-github.sh"
  github_release_status="$(read_report_status "${GH_RELEASE_REPORT_PATH}" "ok")"
fi

current_stage="complete"
echo "Release pipeline contract complete."
echo "Release pipeline evidence: ${PIPELINE_EVIDENCE_PATH}"
