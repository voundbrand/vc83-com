# SevenLayers macOS Companion

This package ships the native menu bar runtime plus release automation for signed, notarized, downloadable macOS artifacts.

First-time operator guide: `apps/macos/FIRST_RELEASE_CHECKLIST.md`.

## Naming and authority contract

- App name is fixed: `SevenLayers` / `SevenLayers.app`.
- `vc83` backend remains mutation authority; desktop runtime is ingress/control only.
- OpenClaw is reference-only architecture input, not product source.

## Release scripts

Scripts live in `apps/macos/scripts/`:

- `build-app-bundle.sh`: builds/signs `dist/SevenLayers.app` from Swift target `sevenlayers-mac`.
- `release-metadata.sh`: emits deterministic metadata at `dist/release/build-metadata.json`.
- `release-preflight.sh`: fail-closed checks for codesign + notarization prerequisites.
- `release-package-stub.sh`: creates ZIP + package contract plan.
- `release-dmg-stub.sh`: creates DMG in `MODE=strict`; validates DMG contract in `MODE=report`.
- `release-appcast-stub.sh`: emits channel-scoped appcast XML + update-contract JSON.
- `release-notarize.sh`: notarizes DMG (fallback ZIP), then staples app + DMG.
- `release-sign-appcast.sh`: signs appcast with Sparkle Ed25519 and writes signature evidence.
- `release-github.sh`: creates/updates GitHub Release and uploads release assets.
- `release-pipeline.sh`: orchestrates all stages and writes `dist/release/release-pipeline-evidence.json`.

## Required GitHub repo settings

Required for `.github/workflows/macos-release.yml`:

- Actions workflow permissions: `Read and write permissions` for `GITHUB_TOKEN`.
- Repository must allow creating/updating releases.
- If tag protection is enabled for `v*`, workflow actor must be allowed to create/update those tags.
- Default branch protection should still require review for code changes; release workflow operates on tags/dispatch only.

## Required secrets and env vars

Required for strict production publishing:

- `MACOS_DEVELOPER_ID_P12_BASE64`
- `MACOS_DEVELOPER_ID_P12_PASSWORD`
- `APPLE_TEAM_ID`
- `NOTARY_KEY_ID`
- `NOTARY_ISSUER_ID`
- `NOTARY_KEY_P8_BASE64`
- `SPARKLE_PRIVATE_KEY_BASE64`
- `SPARKLE_PUBLIC_KEY`
- `DOWNLOAD_URL_PREFIX` (must be production `https://`, not placeholder)
- `RELEASE_NOTES_URL_BASE` (must be production `https://`, not placeholder)

Supporting runtime env vars:

- `SIGN_IDENTITY`
- `NOTARYTOOL_KEY`, `NOTARYTOOL_KEY_ID`, `NOTARYTOOL_ISSUER`
- `RELEASE_TAG`, `RELEASE_NAME`, `RELEASE_CHANNEL`
- `GH_REPO`, `GITHUB_TOKEN`/`GH_TOKEN`

## Deterministic release flows

Tag flow (default stable release):

```bash
git tag v0.1.0
git push origin v0.1.0
```

Manual dispatch flow (`workflow_dispatch`):

- Set `version` (for example `0.1.0`).
- Set `release_channel` (`internal`, `canary`, `stable`).
- Optional `release_tag` must equal `v<version>` when provided.

Release tag/version contract:

- `RELEASE_TAG` must start with `v`.
- By default, `RELEASE_TAG` must equal `v${VERSION}`.
- Override mismatch only for emergency recovery by setting `ALLOW_RELEASE_TAG_MISMATCH=1` explicitly.

## CLI usage

Report mode (safe; produces blocker evidence without publishing):

```bash
cd apps/macos
MODE=report APP_NAME=SevenLayers VERSION=0.1.0 RELEASE_CHANNEL=stable scripts/release-pipeline.sh
```

Strict mode (real release path; fail-closed on signing/notary/appcast/release errors):

```bash
cd apps/macos
MODE=strict \
APP_NAME=SevenLayers \
VERSION=0.1.0 \
RELEASE_CHANNEL=stable \
SIGN_IDENTITY="Developer ID Application: Team Name (TEAMID)" \
NOTARYTOOL_KEY="/path/to/AuthKey_ABC1234567.p8" \
NOTARYTOOL_KEY_ID="ABC1234567" \
NOTARYTOOL_ISSUER="11111111-2222-3333-4444-555555555555" \
APPLE_TEAM_ID="TEAMID1234" \
SPARKLE_PRIVATE_KEY_BASE64="..." \
SPARKLE_PUBLIC_KEY="..." \
DOWNLOAD_URL_PREFIX="https://downloads.yourdomain.com/sevenlayers/macos" \
RELEASE_NOTES_URL_BASE="https://downloads.yourdomain.com/sevenlayers/releases" \
PUBLISH_GITHUB_RELEASE=1 \
RELEASE_TAG="v0.1.0" \
GH_REPO="owner/repo" \
GITHUB_TOKEN="..." \
scripts/release-pipeline.sh
```

## Public world release readiness

Before announcing publicly, verify:

- Download ZIP URL: `${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/SevenLayers-${VERSION}.zip`
- Appcast URL: `${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/appcast.xml`
- Release notes URL: `${RELEASE_NOTES_URL_BASE}/${VERSION}.html`
- GitHub release page exists for `RELEASE_TAG` with expected assets.
- Signing evidence files exist and show non-blocked status.

## Evidence capture paths

Primary evidence root: `apps/macos/dist/release`

- `release-pipeline-evidence.json`
- `preflight-report.json`
- `build-metadata.json`
- `package-plan.json`
- `dmg-plan.json`
- `update-contract.json`
- `notarization-report.json`
- `notarytool-submit.json` (when notarization runs)
- `appcast-signature-evidence.json`
- `github-release-report.json`
- `updates/<channel>/appcast.xml` and `updates/<channel>/appcast.signed.xml`

GitHub Actions also uploads:

- `apps/macos/dist/release`
- `apps/macos/dist/SevenLayers.app`

## Rollback guidance by failure class

1. Notarization failure:
   - Inspect `notarization-report.json` and `notarytool-submit.json`.
   - Do not publish/update appcast until notarization is accepted and artifacts are stapled.
2. Appcast signing failure:
   - Inspect `appcast-signature-evidence.json`.
   - Keep previous signed appcast live; do not publish unsigned/placeholder signatures.
3. GitHub release publish failure:
   - Inspect `github-release-report.json`.
   - Re-run publish step with the same `RELEASE_TAG` after fixing token/repo permission issues.
4. Public URL contract failure:
   - Inspect `update-contract.json` for invalid `zipArtifactUrl`, `appcastUrl`, or `releaseNotesUrl`.
   - Correct hosting paths before re-publish.

## Scope boundary

- Backend (`vc83`) remains mutation authority; macOS runtime stays ingress/control.
- OpenClaw files remain reference-only and are not release source-of-truth.
- Release automation is fail-closed in strict mode and evidence-first in report mode.
