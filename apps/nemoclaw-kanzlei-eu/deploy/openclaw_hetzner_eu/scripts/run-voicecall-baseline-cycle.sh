#!/usr/bin/env bash
set -eo pipefail

usage() {
  cat <<'EOF'
Usage:
  run-voicecall-baseline-cycle.sh --to <e164-number> [options]

Purpose:
1) Generate repeatable voice-call traffic on a remote target via CLI.
2) Collect pilot baseline metrics immediately after traffic generation.
3) Optionally collect current-path metrics and generate comparison output.

Safety:
- Real outbound calls require --confirm-live.
- Use --dry-run to validate command flow without placing calls.
- Remote sandbox must expose `voicecall` command inside `openclaw --help`.

Options:
  --to <e164-number>           Required destination number (for example: +491234567890)
  --target <staging|prod>      Remote target profile from pipeline env (default: staging)
  --env-file <path>            Pipeline env file (default: ../pipeline.env)
  --calls <n>                  Number of calls to place (default: 3)
  --turns <n>                  Number of continue turns per call (default: 1)
  --mode <conversation|notify> Voice call mode (default: conversation)
  --initial-message <text>     Initial call message
  --followup-message <text>    Follow-up message for continue turns
  --between-calls-sec <n>      Sleep between calls (default: 3)
  --between-turns-sec <n>      Sleep between turns (default: 2)
  --calls-file <path>          Remote calls.jsonl path (default: ~/.openclaw/voice-calls/calls.jsonl)
  --pilot-last <n>             Last N records for pilot collection (default: 400)
  --current-calls-file <path>  Local calls.jsonl for current-path collection (optional)
  --current-last <n>           Last N records for current-path collection (default: 400)
  --label-prefix <name>        Label prefix for artifacts (default: auto-cycle)
  --confirm-live               Required flag to place real outbound calls
  --dry-run                    Print planned operations only (no remote calls)

Examples:
  run-voicecall-baseline-cycle.sh --to +491234567890 --confirm-live
  run-voicecall-baseline-cycle.sh --to +491234567890 --dry-run --calls 2 --turns 2
  run-voicecall-baseline-cycle.sh --to +491234567890 --confirm-live --current-calls-file /path/current/calls.jsonl
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE_DEFAULT="${SCRIPT_DIR%/scripts}/pipeline.env"
ENV_FILE="$ENV_FILE_DEFAULT"

TO_NUMBER=""
TARGET="staging"
CALLS=3
TURNS=1
MODE="conversation"
INITIAL_MESSAGE="Hallo, dies ist ein automatisierter Testanruf fuer die Baseline-Messung."
FOLLOWUP_MESSAGE="Bitte bestaetigen Sie kurz, dass Sie mich hoeren."
BETWEEN_CALLS_SEC=3
BETWEEN_TURNS_SEC=2
REMOTE_CALLS_FILE="~/.openclaw/voice-calls/calls.jsonl"
PILOT_LAST=400
CURRENT_CALLS_FILE=""
CURRENT_LAST=400
LABEL_PREFIX="auto-cycle"
CONFIRM_LIVE=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to)
      TO_NUMBER="${2:-}"
      shift 2
      ;;
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --calls)
      CALLS="${2:-}"
      shift 2
      ;;
    --turns)
      TURNS="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --initial-message)
      INITIAL_MESSAGE="${2:-}"
      shift 2
      ;;
    --followup-message)
      FOLLOWUP_MESSAGE="${2:-}"
      shift 2
      ;;
    --between-calls-sec)
      BETWEEN_CALLS_SEC="${2:-}"
      shift 2
      ;;
    --between-turns-sec)
      BETWEEN_TURNS_SEC="${2:-}"
      shift 2
      ;;
    --calls-file)
      REMOTE_CALLS_FILE="${2:-}"
      shift 2
      ;;
    --pilot-last)
      PILOT_LAST="${2:-}"
      shift 2
      ;;
    --current-calls-file)
      CURRENT_CALLS_FILE="${2:-}"
      shift 2
      ;;
    --current-last)
      CURRENT_LAST="${2:-}"
      shift 2
      ;;
    --label-prefix)
      LABEL_PREFIX="${2:-}"
      shift 2
      ;;
    --confirm-live)
      CONFIRM_LIVE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$TO_NUMBER" ]] || die "--to is required"
[[ "$TARGET" == "staging" || "$TARGET" == "prod" ]] || die "--target must be staging or prod"
[[ "$MODE" == "conversation" || "$MODE" == "notify" ]] || die "--mode must be conversation or notify"
[[ "$CALLS" =~ ^[0-9]+$ ]] || die "--calls must be an integer"
[[ "$TURNS" =~ ^[0-9]+$ ]] || die "--turns must be an integer"
[[ "$BETWEEN_CALLS_SEC" =~ ^[0-9]+$ ]] || die "--between-calls-sec must be an integer"
[[ "$BETWEEN_TURNS_SEC" =~ ^[0-9]+$ ]] || die "--between-turns-sec must be an integer"
[[ "$PILOT_LAST" =~ ^[0-9]+$ ]] || die "--pilot-last must be an integer"
[[ "$CURRENT_LAST" =~ ^[0-9]+$ ]] || die "--current-last must be an integer"

if [[ "$DRY_RUN" != "1" && "$CONFIRM_LIVE" != "1" ]]; then
  die "Real calls require --confirm-live (or use --dry-run)"
fi

[[ -f "$ENV_FILE" ]] || die "Env file not found: $ENV_FILE"

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ "$TARGET" == "staging" ]]; then
  SSH_TARGET="${STAGING_SSH_TARGET:-}"
  SSH_KEY="${STAGING_SSH_KEY:-}"
  SANDBOX_NAME="${STAGING_SANDBOX_NAME:-}"
else
  SSH_TARGET="${PROD_SSH_TARGET:-}"
  SSH_KEY="${PROD_SSH_KEY:-}"
  SANDBOX_NAME="${PROD_SANDBOX_NAME:-}"
fi

[[ -n "$SSH_TARGET" ]] || die "Missing SSH target for --target ${TARGET}"
[[ -n "$SANDBOX_NAME" ]] || die "Missing sandbox name for --target ${TARGET}"
if [[ "$SSH_KEY" == ~/* ]]; then
  SSH_KEY="${HOME}/${SSH_KEY#~/}"
fi

need_cmd ssh
need_cmd node

SSH_ARGS=()
if [[ -n "$SSH_KEY" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY")
fi

echo "[INFO] Target: ${TARGET} (${SSH_TARGET})"
echo "[INFO] Sandbox: ${SANDBOX_NAME}"
echo "[INFO] Calls: ${CALLS}, Turns/call: ${TURNS}, Mode: ${MODE}"
echo "[INFO] Dry-run: ${DRY_RUN}"

base64_noline() {
  printf '%s' "$1" | base64 | tr -d '\n'
}

preflight_remote_sandbox() {
  ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
    "SANDBOX_NAME='$SANDBOX_NAME' bash -s" <<'REMOTE'
set -eo pipefail

strip_ansi() {
  sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g; s/\x1B\][^\a]*\a//g'
}

run_in_sandbox() {
  local shell_cmd="$1"
  if command -v nemoclaw >/dev/null 2>&1; then
    printf '%s\nexit\n' "$shell_cmd" | nemoclaw "$SANDBOX_NAME" connect
    return 0
  fi
  if command -v openshell >/dev/null 2>&1; then
    printf '%s\nexit\n' "$shell_cmd" | openshell sandbox connect "$SANDBOX_NAME"
    return 0
  fi
  echo "Neither nemoclaw nor openshell is available on remote host." >&2
  return 127
}

if command -v nemoclaw >/dev/null 2>&1; then
  nemoclaw "$SANDBOX_NAME" status >/dev/null
elif command -v openshell >/dev/null 2>&1; then
  openshell sandbox get "$SANDBOX_NAME" >/dev/null
else
  echo "No NemoClaw/OpenShell control plane available on remote host." >&2
  exit 127
fi

voicecall_help="$(run_in_sandbox "openclaw voicecall --help" 2>&1 || true)"
voicecall_help_plain="$(printf '%s\n' "$voicecall_help" | strip_ansi)"
printf '%s\n' "$voicecall_help" >&2
printf '%s\n' "$voicecall_help_plain" | grep -Eiq 'Usage:[[:space:]]+openclaw[[:space:]]+voicecall' || {
  help_out="$(run_in_sandbox "openclaw --help" 2>&1 || true)"
  help_out_plain="$(printf '%s\n' "$help_out" | strip_ansi)"
  printf '%s\n' "$help_out" >&2
  printf '%s\n' "$help_out_plain" | grep -Eq '(^|[[:space:]])(voicecall|voice-call)([[:space:]]|$)' || {
    echo "voicecall command unavailable in sandbox '${SANDBOX_NAME}'." >&2
    echo "Enable @openclaw/voice-call in immutable sandbox config before baseline run." >&2
    exit 1
  }
}
REMOTE
}

run_remote_voicecall_op() {
  local op="$1"
  local message="$2"
  local call_id="${3:-}"
  local output=""
  local to_b64 msg_b64 call_b64
  to_b64="$(base64_noline "$TO_NUMBER")"
  msg_b64="$(base64_noline "$message")"
  call_b64="$(base64_noline "$call_id")"

  if ! output="$(
    ssh "${SSH_ARGS[@]}" "$SSH_TARGET" \
      "OP='$op' TO_B64='$to_b64' MSG_B64='$msg_b64' CALL_B64='$call_b64' MODE='$MODE' SANDBOX_NAME='$SANDBOX_NAME' bash -s" <<'REMOTE'
set -eo pipefail

decode_b64() {
  printf '%s' "$1" | base64 -d
}

TO="$(decode_b64 "${TO_B64}")"
MSG="$(decode_b64 "${MSG_B64}")"
CALL_ID="$(decode_b64 "${CALL_B64}")"

resolve_node() {
  local node_bin
  node_bin="$(command -v node || true)"
  if [[ -n "$node_bin" ]]; then
    echo "$node_bin"
    return 0
  fi
  for c in /usr/bin/node /usr/local/bin/node /root/.nvm/versions/node/*/bin/node; do
    if [[ -x "$c" ]]; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

# Ensure wrappers installed under user-local paths are callable even in non-login shells.
if ! command -v node >/dev/null 2>&1; then
  node_bin="$(resolve_node || true)"
  if [[ -n "$node_bin" ]]; then
    export PATH="$(dirname "$node_bin"):$PATH"
  fi
fi
if ! command -v nemoclaw >/dev/null 2>&1 && [[ -x /root/.local/bin/nemoclaw ]]; then
  export PATH="/root/.local/bin:$PATH"
fi

run_in_sandbox() {
  local shell_cmd="$1"
  if command -v nemoclaw >/dev/null 2>&1; then
    printf '%s\nexit\n' "$shell_cmd" | nemoclaw "$SANDBOX_NAME" connect
    return 0
  fi
  if command -v openshell >/dev/null 2>&1; then
    printf '%s\nexit\n' "$shell_cmd" | openshell sandbox connect "$SANDBOX_NAME"
    return 0
  fi
  echo "Neither nemoclaw nor openshell is available on remote host." >&2
  return 127
}

run_cli() {
  local arg q shell_cmd
  shell_cmd="openclaw"
  for arg in "$@"; do
    printf -v q '%q' "$arg"
    shell_cmd+=" ${q}"
  done
  run_in_sandbox "$shell_cmd"
}

extract_call_id() {
  local raw="$1"
  printf '%s\n' "$raw" | sed -n 's/.*"callId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

case "${OP}" in
  call)
    raw=""
    parsed_call_id=""
    raw="$(run_cli voicecall call --to "$TO" --message "$MSG" --mode "${MODE}" 2>&1)" || {
      printf '%s\n' "$raw" >&2
      exit 1
    }
    printf '%s\n' "$raw" >&2
    parsed_call_id="$(extract_call_id "$raw")"
    [[ -n "${parsed_call_id:-}" ]] || {
      echo "Failed to parse callId from CLI output." >&2
      exit 1
    }
    printf '%s\n' "$parsed_call_id"
    ;;
  continue)
    [[ -n "$CALL_ID" ]] || { echo "Missing call id for continue op." >&2; exit 1; }
    run_cli voicecall continue --call-id "$CALL_ID" --message "$MSG"
    ;;
  end)
    [[ -n "$CALL_ID" ]] || { echo "Missing call id for end op." >&2; exit 1; }
    run_cli voicecall end --call-id "$CALL_ID"
    ;;
  *)
    echo "Unknown op: ${OP}" >&2
    exit 1
    ;;
esac
REMOTE
  )"; then
    return 1
  fi

  printf '%s\n' "$output"
}

echo "[INFO] Remote sandbox preflight: verify NemoClaw/OpenShell control plane + voicecall command"
preflight_remote_sandbox || die "Remote sandbox preflight failed"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[DRY-RUN] Would execute ${CALLS} calls to ${TO_NUMBER} (${MODE}) with ${TURNS} continue turns per call."
else
  for ((i = 1; i <= CALLS; i += 1)); do
    echo "[INFO] Placing call ${i}/${CALLS}"
    call_id="$(run_remote_voicecall_op "call" "$INITIAL_MESSAGE" "")" || die "Failed to place call ${i}/${CALLS}"
    echo "[INFO] callId=${call_id}"

    if [[ "$MODE" == "conversation" && "$TURNS" -gt 0 ]]; then
      for ((t = 1; t <= TURNS; t += 1)); do
        turn_message="${FOLLOWUP_MESSAGE} (call ${i}, turn ${t})"
        echo "[INFO] Continue call ${call_id} turn ${t}/${TURNS}"
        run_remote_voicecall_op "continue" "$turn_message" "$call_id" >/dev/null || die "Failed continue turn ${t}/${TURNS} for call ${call_id}"
        sleep "$BETWEEN_TURNS_SEC"
      done
    fi

    echo "[INFO] Ending call ${call_id}"
    run_remote_voicecall_op "end" "" "$call_id" >/dev/null || die "Failed to end call ${call_id}"
    sleep "$BETWEEN_CALLS_SEC"
  done
fi

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
pilot_label="${LABEL_PREFIX}-pilot-${timestamp}"

collect_output="$(
  "${SCRIPT_DIR}/collect-voicecall-baseline.sh" \
    --label "$pilot_label" \
    --target "$TARGET" \
    --env-file "$ENV_FILE" \
    --calls-file "$REMOTE_CALLS_FILE" \
    --last "$PILOT_LAST"
)"
printf '%s\n' "$collect_output"
pilot_run_dir="$(printf '%s\n' "$collect_output" | sed -n 's/^\[INFO\] Baseline artifacts written to: //p' | tail -n 1)"
[[ -n "$pilot_run_dir" ]] || die "Failed to parse pilot run directory from collector output"

if [[ -n "$CURRENT_CALLS_FILE" ]]; then
  current_label="${LABEL_PREFIX}-current-${timestamp}"
  current_output="$(
    "${SCRIPT_DIR}/collect-voicecall-baseline.sh" \
      --label "$current_label" \
      --mode local \
      --calls-file "$CURRENT_CALLS_FILE" \
      --last "$CURRENT_LAST"
  )"
  printf '%s\n' "$current_output"
  current_run_dir="$(printf '%s\n' "$current_output" | sed -n 's/^\[INFO\] Baseline artifacts written to: //p' | tail -n 1)"
  [[ -n "$current_run_dir" ]] || die "Failed to parse current run directory from collector output"

  compare_output="$(
    "${SCRIPT_DIR}/compare-voicecall-baselines.sh" \
      --pilot "${pilot_run_dir}/metrics.json" \
      --current "${current_run_dir}/metrics.json"
  )"
  printf '%s\n' "$compare_output"
fi

echo "[INFO] Baseline cycle completed."
