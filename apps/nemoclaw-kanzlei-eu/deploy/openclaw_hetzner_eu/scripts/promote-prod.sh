#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  promote-prod.sh --tag <release-tag> [--env-file <path>] [--skip-build]

Options:
  --tag         Release tag to deploy to production (required)
  --env-file    Pipeline env file (default: ../pipeline.env)
  --skip-build  Skip remote "npm install -g ." refresh

Safety:
- Production deploys are tag-only.
- Tag must exist in LOCAL_NEMOCLAW_REPO as refs/tags/<tag>.
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
TAG=""
SKIP_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
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

[[ -n "$TAG" ]] || die "--tag is required"
[[ -f "$ENV_FILE" ]] || die "Env file not found: $ENV_FILE"

# shellcheck disable=SC1090
source "$ENV_FILE"

need_cmd git
need_cmd ssh

[[ -n "${LOCAL_NEMOCLAW_REPO:-}" ]] || die "LOCAL_NEMOCLAW_REPO is required"
[[ -n "${NEMOCLAW_FORK_URL:-}" ]] || die "NEMOCLAW_FORK_URL is required"
[[ -n "${PROD_SSH_TARGET:-}" ]] || die "PROD_SSH_TARGET is required"
[[ -n "${PROD_TARGET_DIR:-}" ]] || die "PROD_TARGET_DIR is required"
[[ -n "${PROD_SANDBOX_NAME:-}" ]] || die "PROD_SANDBOX_NAME is required"
[[ -d "$LOCAL_NEMOCLAW_REPO/.git" ]] || die "LOCAL_NEMOCLAW_REPO is not a git repo: $LOCAL_NEMOCLAW_REPO"

if [[ "${PROD_SSH_KEY:-}" == ~/* ]]; then
  PROD_SSH_KEY="${HOME}/${PROD_SSH_KEY#~/}"
fi

if ! git -C "$LOCAL_NEMOCLAW_REPO" show-ref --tags --verify --quiet "refs/tags/${TAG}"; then
  die "Tag not found in LOCAL_NEMOCLAW_REPO: ${TAG}"
fi

DEPLOY_COMMIT="$(git -C "$LOCAL_NEMOCLAW_REPO" rev-parse "refs/tags/${TAG}^{commit}")"
DEPLOY_TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

SSH_ARGS=()
if [[ -n "${PROD_SSH_KEY:-}" ]]; then
  SSH_ARGS+=(-i "$PROD_SSH_KEY")
fi

echo "[INFO] Production deploy target: ${PROD_SSH_TARGET}"
echo "[INFO] Production repo dir:      ${PROD_TARGET_DIR}"
echo "[INFO] Deploy tag:               ${TAG}"
echo "[INFO] Deploy commit:            ${DEPLOY_COMMIT}"
echo "[INFO] Skip build:               ${SKIP_BUILD}"

ssh "${SSH_ARGS[@]}" "$PROD_SSH_TARGET" \
  "NEMOCLAW_FORK_URL='$NEMOCLAW_FORK_URL' PROD_TARGET_DIR='$PROD_TARGET_DIR' DEPLOY_TAG='$TAG' DEPLOY_COMMIT='$DEPLOY_COMMIT' DEPLOY_TS='$DEPLOY_TS' PROD_SANDBOX_NAME='$PROD_SANDBOX_NAME' SKIP_BUILD='$SKIP_BUILD' bash -s" <<'REMOTE'
set -euo pipefail

if [[ ! -d "${PROD_TARGET_DIR}/.git" ]]; then
  rm -rf "${PROD_TARGET_DIR}"
  git clone "${NEMOCLAW_FORK_URL}" "${PROD_TARGET_DIR}"
fi

cd "${PROD_TARGET_DIR}"
git remote set-url origin "${NEMOCLAW_FORK_URL}"
git fetch --all --tags --prune
git checkout --force "${DEPLOY_COMMIT}"

if [[ "${SKIP_BUILD}" != "1" ]]; then
  NPM_BIN="$(command -v npm || true)"
  if [[ -z "$NPM_BIN" ]]; then
    for candidate in /usr/bin/npm /usr/local/bin/npm /root/.nvm/versions/node/*/bin/npm; do
      if [[ -x "$candidate" ]]; then
        NPM_BIN="$candidate"
        break
      fi
    done
  fi
  if [[ -n "$NPM_BIN" ]]; then
    NPM_DIR="$(dirname "$NPM_BIN")"
    export PATH="${NPM_DIR}:${PATH}"
    "$NPM_BIN" install -g .
  else
    echo "[REMOTE] npm not found; skipping global nemoclaw refresh."
  fi
fi

mkdir -p /opt/nemoclaw-deploy-history
cat >/opt/nemoclaw-deploy-history/prod-last.txt <<EOF
timestamp=${DEPLOY_TS}
tag=${DEPLOY_TAG}
commit=${DEPLOY_COMMIT}
repo=${NEMOCLAW_FORK_URL}
target_dir=${PROD_TARGET_DIR}
sandbox=${PROD_SANDBOX_NAME}
EOF

echo "[REMOTE] Current commit: $(git rev-parse --short HEAD)"
echo "[REMOTE] Sandbox status:"
NEMOCLAW_BIN="$(command -v nemoclaw || true)"
if [[ -z "$NEMOCLAW_BIN" ]]; then
  for candidate in /usr/local/bin/nemoclaw /usr/bin/nemoclaw /root/.nvm/versions/node/*/bin/nemoclaw; do
    if [[ -x "$candidate" ]]; then
      NEMOCLAW_BIN="$candidate"
      break
    fi
  done
fi
if [[ -n "$NEMOCLAW_BIN" ]]; then
  NEMOCLAW_DIR="$(dirname "$NEMOCLAW_BIN")"
  export PATH="${NEMOCLAW_DIR}:${PATH}"
  "$NEMOCLAW_BIN" "${PROD_SANDBOX_NAME}" status || true
else
  echo "[REMOTE] nemoclaw not found in PATH or standard locations."
fi
REMOTE

echo
echo "[INFO] Production source sync complete."
echo "[INFO] Next:"
echo "  1) ssh ${PROD_SSH_TARGET}"
echo "  2) cd ${PROD_TARGET_DIR}"
echo "  3) nemoclaw onboard   # run with production env/provider settings"
echo "  4) nemoclaw ${PROD_SANDBOX_NAME} status"
echo "  5) Record release evidence (tag, commit, runtime checks)"
