# SevenLayers macOS First Release Checklist

This is the first-time operator checklist to publish a real downloadable `SevenLayers.app` release outside the Mac App Store.

## 0. Lock naming and authority invariants

- [ ] Confirm app name stays `SevenLayers` / `SevenLayers.app` everywhere.
- [ ] Confirm desktop runtime remains fail-closed and approval-gated for mutating actions.
- [ ] Confirm `vc83` backend remains mutation authority.

## 1. Decide release values

- [ ] Choose `VERSION` (example: `0.1.0`).
- [ ] Choose `RELEASE_CHANNEL` (`internal`, `canary`, or `stable`).
- [ ] Confirm download host base URL (`DOWNLOAD_URL_PREFIX`) and release notes URL base (`RELEASE_NOTES_URL_BASE`).
- [ ] Confirm repo target for GitHub release upload (`owner/repo`).
- [ ] Confirm deterministic tag: `RELEASE_TAG=v${VERSION}`.

## 2. Apple prerequisites

- [ ] You are enrolled in Apple Developer Program.
- [ ] You have an Apple Developer Team ID.
- [ ] You can access:
  - Certificates, Identifiers & Profiles (for Developer ID cert)
  - App Store Connect -> Users and Access -> Keys (for notarization API key)

## 3. Create signing certificate (Developer ID Application)

1. Create or reuse a `Developer ID Application` certificate in Apple Developer portal.
2. Export certificate + private key from Keychain Access as `.p12`.
3. Keep the export password.
4. Convert to base64 for GitHub secret:

```bash
base64 -i /path/to/developer-id.p12 | pbcopy
```

Save as:
- `MACOS_DEVELOPER_ID_P12_BASE64`
- `MACOS_DEVELOPER_ID_P12_PASSWORD`

## 4. Create notarization API key

1. In App Store Connect, create an API key (issuer + key ID + `.p8` download).
2. Convert `.p8` file to base64:

```bash
base64 -i /path/to/AuthKey_ABC1234567.p8 | pbcopy
```

Save as:
- `NOTARY_KEY_P8_BASE64`
- `NOTARY_KEY_ID`
- `NOTARY_ISSUER_ID`
- `APPLE_TEAM_ID`

## 5. Generate Sparkle keys (for auto-update signatures)

Sparkle signs update metadata/artifacts so your app only accepts trusted updates.

- [ ] Generate Sparkle Ed25519 keypair using Sparkle tooling (`generate_keys` from Sparkle distribution).
- [ ] Store:
  - `SPARKLE_PRIVATE_KEY_BASE64`
  - `SPARKLE_PUBLIC_KEY`

Tip: keep private key offline/backed up. If lost, future updates cannot be signed with the same identity.

## 6. Configure public download hosting

- [ ] Host release artifacts so URLs match script outputs:
  - ZIP: `${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/SevenLayers-${VERSION}.zip`
  - Appcast: `${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/appcast.xml`
- [ ] Host release notes:
  - `${RELEASE_NOTES_URL_BASE}/${VERSION}.html`
- [ ] Use production `https://` URLs (no placeholder domains like `example.invalid`).

## 7. Configure GitHub repository settings and secrets

Repository settings:

- [ ] Actions -> General -> Workflow permissions -> `Read and write permissions`.
- [ ] Release creation is allowed for workflow token.
- [ ] If tags are protected (`v*`), allow release workflow actor to create/update those tags.

In `Settings -> Secrets and variables -> Actions -> New repository secret`, add:

- `MACOS_DEVELOPER_ID_P12_BASE64`
- `MACOS_DEVELOPER_ID_P12_PASSWORD`
- `APPLE_TEAM_ID`
- `NOTARY_KEY_ID`
- `NOTARY_ISSUER_ID`
- `NOTARY_KEY_P8_BASE64`
- `SPARKLE_PRIVATE_KEY_BASE64`
- `SPARKLE_PUBLIC_KEY`
- `DOWNLOAD_URL_PREFIX`
- `RELEASE_NOTES_URL_BASE`

`GITHUB_TOKEN` is provided by GitHub Actions automatically.

## 8. Run local report-mode rehearsal (safe)

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/macos
MODE=report APP_NAME=SevenLayers VERSION=0.1.0 RELEASE_CHANNEL=stable scripts/release-pipeline.sh
```

Expected:
- `dist/SevenLayers.app`
- `dist/release/SevenLayers-0.1.0.zip`
- Contract reports under `dist/release/*.json`
- Blockers for missing live credentials are expected in report mode

## 9. Run strict local rehearsal (optional but recommended)

If you have local credentials configured:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/macos
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
PUBLISH_GITHUB_RELEASE=0 \
scripts/release-pipeline.sh
```

## 10. Publish with GitHub Actions workflow

Workflow file: `.github/workflows/macos-release.yml`

Two options:

1. Tag-based release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

2. Manual dispatch:
   - Open GitHub Actions -> `macos-release` -> `Run workflow`
   - Set `version` and `release_channel`
   - Optional `release_tag` must equal `v${version}` when provided

## 11. Verify released artifact as an end user

On a clean Mac or clean user account:

1. Download release ZIP/DMG from hosted URL.
2. Install `SevenLayers.app` into `/Applications`.
3. Launch app and validate:
   - app opens without quarantine/notarization errors
   - auth callback flow works
   - menu bar item appears
   - permissions prompts (mic/camera/screen recording/notifications) behave as expected
4. Confirm GitHub Release contains expected assets:
   - `SevenLayers-${VERSION}.zip`
   - `SevenLayers-${VERSION}.dmg` (if generated)
   - appcast/update contract artifacts

## 12. Verify release evidence and public URLs

- [ ] Confirm `dist/release/release-pipeline-evidence.json` exists.
- [ ] Confirm `dist/release/notarization-report.json` has accepted status for strict run.
- [ ] Confirm `dist/release/appcast-signature-evidence.json` has non-placeholder signature.
- [ ] Confirm `dist/release/github-release-report.json` has uploaded assets list.
- [ ] Confirm `dist/release/update-contract.json` contains:
  - valid `zipArtifactUrl`
  - valid `appcastUrl`
  - valid `releaseNotesUrl`
- [ ] Confirm workflow artifact upload includes:
  - `apps/macos/dist/release`
  - `apps/macos/dist/SevenLayers.app`

## 13. Rollback plan (if release is bad)

1. Re-run `MODE=report` for failed version.
2. If notarization failed, inspect:
   - `dist/release/notarization-report.json`
   - `dist/release/notarytool-submit.json`
3. If appcast signing failed, inspect:
   - `dist/release/appcast-signature-evidence.json`
   - `dist/release/updates/<channel>/appcast.xml`
4. If GitHub publish failed, inspect:
   - `dist/release/github-release-report.json`
5. Promote last known-good release artifacts/appcast and repoint hosted URLs to the last known-good version.
6. Document incident + recovery evidence before next promotion.
