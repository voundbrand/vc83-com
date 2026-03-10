#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACOS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

MODE="${MODE:-strict}" # strict|report
OUT_DIR="${OUT_DIR:-${MACOS_ROOT}/dist/release}"
APP_NAME="${APP_NAME:-SevenLayers}"
VERSION="${VERSION:-0.0.0-dev}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-stable}"
APPCAST_PATH="${APPCAST_PATH:-${OUT_DIR}/updates/${RELEASE_CHANNEL}/appcast.xml}"
SIGNED_APPCAST_PATH="${SIGNED_APPCAST_PATH:-${OUT_DIR}/updates/${RELEASE_CHANNEL}/appcast.signed.xml}"
APPCAST_SIGNATURE_REPORT_PATH="${APPCAST_SIGNATURE_REPORT_PATH:-${OUT_DIR}/appcast-signature-evidence.json}"
OPENSSL_ERROR_LOG_PATH="${OPENSSL_ERROR_LOG_PATH:-${OUT_DIR}/appcast-openssl-error.log}"
ZIP_PATH="${ZIP_PATH:-${OUT_DIR}/${APP_NAME}-${VERSION}.zip}"
SIGNATURE_METHOD="${SIGNATURE_METHOD:-auto}" # auto|sign_update|openssl
SIGN_UPDATE_BIN="${SIGN_UPDATE_BIN:-sign_update}"
SPARKLE_PRIVATE_KEY_PATH="${SPARKLE_PRIVATE_KEY_PATH:-}"
SPARKLE_PRIVATE_KEY_BASE64="${SPARKLE_PRIVATE_KEY_BASE64:-}"
SPARKLE_PUBLIC_KEY="${SPARKLE_PUBLIC_KEY:-}"

if [[ "${MODE}" != "strict" && "${MODE}" != "report" ]]; then
  echo "MODE must be either 'strict' or 'report' (received: ${MODE})." >&2
  exit 1
fi

mkdir -p "$(dirname "${SIGNED_APPCAST_PATH}")"
mkdir -p "${OUT_DIR}"

missing=()
warnings=()
status="ok"
resolved_method="none"
signature=""
zip_sha256=""

if [[ "${APP_NAME}" != "SevenLayers" ]]; then
  missing+=("app_name:must_be_SevenLayers")
fi

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

decode_base64_to_file() {
  local base64_input="$1"
  local output_path="$2"
  if printf '%s' "${base64_input}" | base64 --decode > "${output_path}" 2>/dev/null; then
    return 0
  fi
  if printf '%s' "${base64_input}" | base64 -d > "${output_path}" 2>/dev/null; then
    return 0
  fi
  if printf '%s' "${base64_input}" | base64 -D > "${output_path}" 2>/dev/null; then
    return 0
  fi
  return 1
}

create_pkcs8_pem_from_seed() {
  local seed_input_path="$1"
  local pem_output_path="$2"
  local seed_path="${seed_input_path}"
  local seed_length
  seed_length="$(wc -c < "${seed_path}" | tr -d '[:space:]')"
  if [[ "${seed_length}" == "64" ]]; then
    seed_path="$(mktemp)"
    head -c 32 "${seed_input_path}" > "${seed_path}"
    seed_length="32"
  fi

  if [[ "${seed_length}" != "32" ]]; then
    return 1
  fi

  local seed_hex der_path der_b64
  seed_hex="$(xxd -p -c 256 "${seed_path}" | tr -d '\n')"
  der_path="$(mktemp)"
  printf '302e020100300506032b657004220420%s' "${seed_hex}" | xxd -r -p > "${der_path}"
  der_b64="$(openssl base64 -in "${der_path}" -A)"
  {
    echo "-----BEGIN PRIVATE KEY-----"
    printf '%s' "${der_b64}" | fold -w 64
    echo
    echo "-----END PRIVATE KEY-----"
  } > "${pem_output_path}"

  if [[ "${seed_path}" != "${seed_input_path}" ]]; then
    rm -f "${seed_path}"
  fi
  rm -f "${der_path}"
}

prepare_private_key_for_openssl() {
  local raw_input_path="$1"
  local pem_output_path="$2"
  local work_path cleaned_key decoded_path size_bytes

  if grep -q "BEGIN PRIVATE KEY" "${raw_input_path}" 2>/dev/null; then
    cp "${raw_input_path}" "${pem_output_path}"
    return 0
  fi

  if openssl pkey -inform DER -in "${raw_input_path}" -noout >/dev/null 2>&1; then
    openssl pkey -inform DER -in "${raw_input_path}" -out "${pem_output_path}" >/dev/null 2>&1
    return 0
  fi

  size_bytes="$(wc -c < "${raw_input_path}" | tr -d '[:space:]')"
  if [[ "${size_bytes}" == "32" || "${size_bytes}" == "64" ]]; then
    create_pkcs8_pem_from_seed "${raw_input_path}" "${pem_output_path}"
    return $?
  fi

  cleaned_key="$(tr -d '[:space:]' < "${raw_input_path}")"
  if [[ -z "${cleaned_key}" ]]; then
    return 1
  fi

  decoded_path="$(mktemp)"
  if ! decode_base64_to_file "${cleaned_key}" "${decoded_path}"; then
    rm -f "${decoded_path}"
    return 1
  fi

  if grep -q "BEGIN PRIVATE KEY" "${decoded_path}" 2>/dev/null; then
    cp "${decoded_path}" "${pem_output_path}"
    rm -f "${decoded_path}"
    return 0
  fi

  if openssl pkey -inform DER -in "${decoded_path}" -noout >/dev/null 2>&1; then
    openssl pkey -inform DER -in "${decoded_path}" -out "${pem_output_path}" >/dev/null 2>&1
    rm -f "${decoded_path}"
    return 0
  fi

  work_path="${decoded_path}"
  size_bytes="$(wc -c < "${work_path}" | tr -d '[:space:]')"
  if [[ "${size_bytes}" == "32" || "${size_bytes}" == "64" ]]; then
    create_pkcs8_pem_from_seed "${work_path}" "${pem_output_path}"
    rm -f "${decoded_path}"
    return $?
  fi

  rm -f "${decoded_path}"
  return 1
}

swift_sign_ed25519() {
  local private_key_pem_path="$1"
  local payload_path="$2"
  local signature_out_path="$3"

  local seed_b64
  seed_b64="$(
    openssl pkey -in "${private_key_pem_path}" -outform DER 2>/dev/null \
      | tail -c 32 \
      | openssl base64 -A 2>/dev/null || true
  )"
  if [[ -z "${seed_b64}" ]]; then
    return 1
  fi

  local swift_script_path
  swift_script_path="$(mktemp)"
  cat > "${swift_script_path}" <<'SWIFT'
import Foundation
import CryptoKit

let env = ProcessInfo.processInfo.environment
guard let seedB64 = env["SPARKLE_SEED_B64"], let seed = Data(base64Encoded: seedB64) else {
  fputs("missing_seed\n", stderr)
  exit(2)
}
if seed.count != 32 {
  fputs("invalid_seed_length\n", stderr)
  exit(3)
}
guard CommandLine.arguments.count > 2 else {
  fputs("missing_args\n", stderr)
  exit(4)
}
let payloadPath = CommandLine.arguments[1]
let outPath = CommandLine.arguments[2]
let payload = try Data(contentsOf: URL(fileURLWithPath: payloadPath))
let privateKey = try Curve25519.Signing.PrivateKey(rawRepresentation: seed)
let signature = try privateKey.signature(for: payload)
try signature.base64EncodedString().write(toFile: outPath, atomically: true, encoding: .utf8)
SWIFT

  set +e
  SPARKLE_SEED_B64="${seed_b64}" swift "${swift_script_path}" "${payload_path}" "${signature_out_path}" >/dev/null 2>&1
  local swift_exit_code=$?
  set -e
  rm -f "${swift_script_path}"
  return "${swift_exit_code}"
}

if [[ ! -f "${APPCAST_PATH}" ]]; then
  missing+=("appcast:missing")
fi
if [[ ! -f "${ZIP_PATH}" ]]; then
  missing+=("zip_artifact:missing")
fi
if [[ -z "${SPARKLE_PUBLIC_KEY}" ]]; then
  missing+=("sparkle_public_key:missing")
fi
if [[ -z "${SPARKLE_PRIVATE_KEY_PATH}" && -z "${SPARKLE_PRIVATE_KEY_BASE64}" ]]; then
  missing+=("sparkle_private_key:missing")
fi

if [[ "${SIGNATURE_METHOD}" == "auto" ]]; then
  if command -v "${SIGN_UPDATE_BIN}" >/dev/null 2>&1; then
    resolved_method="sign_update"
  elif command -v openssl >/dev/null 2>&1; then
    resolved_method="openssl"
  else
    resolved_method="none"
  fi
else
  resolved_method="${SIGNATURE_METHOD}"
fi

case "${resolved_method}" in
  sign_update)
    if ! command -v "${SIGN_UPDATE_BIN}" >/dev/null 2>&1; then
      missing+=("missing_command:${SIGN_UPDATE_BIN}")
    fi
    ;;
  openssl)
    if ! command -v openssl >/dev/null 2>&1; then
      missing+=("missing_command:openssl")
    fi
    if ! command -v xxd >/dev/null 2>&1; then
      missing+=("missing_command:xxd")
    fi
    ;;
  *)
    missing+=("signature_method:unsupported")
    ;;
esac

if (( ${#missing[@]} > 0 )); then
  status="blocked"
fi

if [[ "${status}" == "ok" && "${MODE}" == "strict" ]]; then
  private_key_material_path="$(mktemp)"
  cleanup_paths=("${private_key_material_path}")
  if [[ -n "${SPARKLE_PRIVATE_KEY_PATH}" ]]; then
    cp "${SPARKLE_PRIVATE_KEY_PATH}" "${private_key_material_path}"
  else
    if ! decode_base64_to_file "${SPARKLE_PRIVATE_KEY_BASE64}" "${private_key_material_path}"; then
      status="blocked"
      missing+=("sparkle_private_key:invalid_base64")
    fi
  fi

  if [[ "${status}" == "ok" ]]; then
    if [[ "${resolved_method}" == "sign_update" ]]; then
      sign_output="$("${SIGN_UPDATE_BIN}" --ed-key-file "${private_key_material_path}" "${ZIP_PATH}" 2>&1 || true)"
      signature="$(
        printf '%s\n' "${sign_output}" | sed -n 's/.*sparkle:edSignature="\([^"]*\)".*/\1/p' | head -n 1
      )"
      if [[ -z "${signature}" ]]; then
        signature="$(
          printf '%s\n' "${sign_output}" | awk 'match($0,/[A-Za-z0-9+\/=]{80,}/){print substr($0, RSTART, RLENGTH); exit}'
        )"
      fi
      if [[ -z "${signature}" ]]; then
        status="blocked"
        missing+=("sparkle_signature:parse_failed")
      fi
    else
      private_key_pem_path="$(mktemp)"
      cleanup_paths+=("${private_key_pem_path}")
      if ! prepare_private_key_for_openssl "${private_key_material_path}" "${private_key_pem_path}"; then
        status="blocked"
        missing+=("sparkle_private_key:unsupported_format")
      else
        signature_bin_path="$(mktemp)"
        cleanup_paths+=("${signature_bin_path}")
        : > "${OPENSSL_ERROR_LOG_PATH}"
        set +e
        openssl pkeyutl -sign -rawin -inkey "${private_key_pem_path}" -in "${ZIP_PATH}" -out "${signature_bin_path}" >/dev/null 2>>"${OPENSSL_ERROR_LOG_PATH}"
        openssl_exit_code_rawin=$?
        openssl_exit_code_compat=0
        if [[ ${openssl_exit_code_rawin} -ne 0 ]]; then
          openssl pkeyutl -sign -inkey "${private_key_pem_path}" -in "${ZIP_PATH}" -out "${signature_bin_path}" >/dev/null 2>>"${OPENSSL_ERROR_LOG_PATH}"
          openssl_exit_code_compat=$?
        fi
        set -e
        if [[ ${openssl_exit_code_rawin} -ne 0 && ${openssl_exit_code_compat} -ne 0 ]]; then
          signature_text_path="$(mktemp)"
          cleanup_paths+=("${signature_text_path}")
          if command -v swift >/dev/null 2>&1 && swift_sign_ed25519 "${private_key_pem_path}" "${ZIP_PATH}" "${signature_text_path}"; then
            signature="$(cat "${signature_text_path}")"
            resolved_method="swift_crypto"
          else
            status="blocked"
            missing+=("sparkle_signature:openssl_failed")
            warnings+=("openssl_error_log:${OPENSSL_ERROR_LOG_PATH}")
            if [[ -f "${OPENSSL_ERROR_LOG_PATH}" ]]; then
              echo "OpenSSL signing output (${OPENSSL_ERROR_LOG_PATH}):" >&2
              sed -n '1,200p' "${OPENSSL_ERROR_LOG_PATH}" >&2
            fi
          fi
        else
          signature="$(openssl base64 -in "${signature_bin_path}" -A)"
        fi
      fi
    fi
  fi

  if [[ "${status}" == "ok" ]]; then
    sed -E "0,/sparkle:edSignature=\"[^\"]*\"/s|sparkle:edSignature=\"[^\"]*\"|sparkle:edSignature=\"${signature}\"|" "${APPCAST_PATH}" > "${SIGNED_APPCAST_PATH}"
    cp "${SIGNED_APPCAST_PATH}" "${APPCAST_PATH}"
    if command -v shasum >/dev/null 2>&1; then
      zip_sha256="$(shasum -a 256 "${ZIP_PATH}" | awk '{print $1}')"
    fi
  fi

  for cleanup_path in "${cleanup_paths[@]}"; do
    rm -f "${cleanup_path}"
  done
elif [[ "${MODE}" == "report" ]]; then
  warnings+=("report_mode:signature_generation_skipped")
  if [[ -f "${APPCAST_PATH}" ]]; then
    cp "${APPCAST_PATH}" "${SIGNED_APPCAST_PATH}"
  fi
fi

missing_json='[]'
if (( ${#missing[@]} > 0 )); then
  missing_json="$(json_array "${missing[@]}")"
fi

warnings_json='[]'
if (( ${#warnings[@]} > 0 )); then
  warnings_json="$(json_array "${warnings[@]}")"
fi

cat > "${APPCAST_SIGNATURE_REPORT_PATH}" <<EOF
{
  "schema": "vc83_macos_release_appcast_signature_v1",
  "mode": "$(json_escape "${MODE}")",
  "status": "$(json_escape "${status}")",
  "signatureMethod": "$(json_escape "${resolved_method}")",
  "appcastPath": "$(json_escape "${APPCAST_PATH}")",
  "signedAppcastPath": "$(json_escape "${SIGNED_APPCAST_PATH}")",
  "zipPath": "$(json_escape "${ZIP_PATH}")",
  "zipSHA256": "$(json_escape "${zip_sha256}")",
  "sparklePublicKey": "$(json_escape "${SPARKLE_PUBLIC_KEY}")",
  "sparkleEdSignature": "$(json_escape "${signature}")",
  "missingRequirements": ${missing_json},
  "warnings": ${warnings_json}
}
EOF

if [[ "${status}" == "blocked" ]]; then
  echo "Appcast signing: BLOCKED" >&2
  for item in "${missing[@]}"; do
    echo "  - ${item}" >&2
  done
  echo "Report: ${APPCAST_SIGNATURE_REPORT_PATH}" >&2
  if [[ "${MODE}" == "strict" ]]; then
    exit 1
  fi
else
  if [[ "${MODE}" == "strict" ]]; then
    echo "Appcast signing: OK"
  else
    echo "Appcast signing contract validated (report mode)."
  fi
  echo "Signed appcast: ${SIGNED_APPCAST_PATH}"
  echo "Report: ${APPCAST_SIGNATURE_REPORT_PATH}"
fi
