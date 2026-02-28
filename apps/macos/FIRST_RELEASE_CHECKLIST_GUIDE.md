# SevenLayers macOS First Release Checklist

First-time operator checklist to publish a real downloadable `SevenLayers.app` release outside the Mac App Store.

*Beginner-friendly edition with step-by-step explanations and direct links.*

---

## Before You Begin

If you've never signed, notarized, or distributed a macOS app before, don't worry — every step is explained below.

### What You'll Need

- An [Apple Developer account](https://developer.apple.com/programs/) ($99/year) — this gives you code signing and notarization access
- A GitHub repository with Actions enabled — this is where your automated build pipeline runs
- A web server or CDN to host your downloadable `.zip` and update feed (appcast)
- About 1–2 hours for initial setup, then releases are mostly automated

### Key Concepts

> **Code Signing** — Apple requires all macOS apps to be digitally signed with a Developer ID certificate. This proves the app came from you and hasn't been tampered with. Without it, macOS will block the app from opening.

> **Notarization** — After signing, you submit your app to Apple's notary service. Apple scans it for malware and, if it passes, staples a ticket to it. This prevents the scary "unidentified developer" warning when users open your app.

> **Sparkle** — An open-source framework that handles automatic updates for macOS apps distributed outside the App Store. It uses an XML feed (appcast) to tell the app when a new version is available.

> **GitHub Actions** — A CI/CD service built into GitHub that can automatically build, sign, notarize, and publish your app when you push a version tag.

> **Base64** — A way to encode binary files (like certificates) as plain text so they can be safely stored as GitHub secrets. The commands in this doc convert your `.p12` and `.p8` files to base64.

### Helpful Links

- [Apple Developer Program](https://developer.apple.com/programs/) — Enroll or manage your membership
- [Apple Developer Portal](https://developer.apple.com/account) — Certificates, Team ID, and profiles
- [App Store Connect](https://appstoreconnect.apple.com) — API keys for notarization
- [GitHub Actions Docs](https://docs.github.com/en/actions) — Learn about workflows and secrets
- [Sparkle Framework](https://sparkle-project.org) — Auto-update framework for macOS

---

## 0. Decide Release Values

Before touching any Apple portal or writing any code, decide on these four values. They'll be referenced throughout every remaining step.

- [ ] Choose `VERSION` (example: `0.1.0`)

  > **How versioning works:** Use semantic versioning: MAJOR.MINOR.PATCH. For your very first release, `0.1.0` is standard. Bump MINOR for new features, PATCH for bug fixes.

- [ ] Choose `RELEASE_CHANNEL` (`internal`, `canary`, or `stable`)

  > **What are channels?** `internal` is for your team only. `canary` is for early testers. `stable` is for everyone. Start with `internal` for your first test release.

- [ ] Confirm download host base URL (`DOWNLOAD_URL_PREFIX`) and release notes URL base (`RELEASE_NOTES_URL_BASE`)

  > **Example:** If your domain is `downloads.sevenlayers.com`, your `DOWNLOAD_URL_PREFIX` might be `https://downloads.sevenlayers.com/macos` and `RELEASE_NOTES_URL_BASE` might be `https://downloads.sevenlayers.com/releases`

- [ ] Confirm repo target for GitHub release upload (`owner/repo`)

---

## 1. Apple Prerequisites

You need an active Apple Developer Program membership. This costs $99/year and gives you the ability to sign and notarize apps for distribution outside the Mac App Store.

- [ ] You are enrolled in the [Apple Developer Program](https://developer.apple.com/programs/enroll/)

  > **How to enroll:** Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/), sign in with your Apple ID, and follow the steps. You'll need to verify your identity. Approval can take 24–48 hours.

- [ ] You have your Apple Developer Team ID — find it at [developer.apple.com/account](https://developer.apple.com/account) under Membership Details

  > **Where to find your Team ID:** Log into [developer.apple.com/account](https://developer.apple.com/account). Scroll down to "Membership Details". Your Team ID is a 10-character alphanumeric string like `ABC1234567`.

- [ ] You can access:
  - [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list) — for creating your Developer ID signing certificate
  - [App Store Connect → Keys](https://appstoreconnect.apple.com/access/integrations/api) — for creating the notarization API key

---

## 2. Create Signing Certificate

### Developer ID Application

A signing certificate proves to macOS that your app is from a trusted developer. You'll create a "Developer ID Application" certificate, which is specifically for apps distributed outside the Mac App Store.

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list) and click the **+** button to create a new certificate.

   > **Which certificate type?** Select "Developer ID Application" (NOT "Developer ID Installer" and NOT "Mac App Distribution"). Developer ID Application is specifically for apps you distribute yourself.

2. You'll be asked to upload a Certificate Signing Request (CSR). Open **Keychain Access** on your Mac, go to **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority**. Enter your email, leave CA Email blank, select "Saved to disk".

3. Upload the CSR, download the certificate, and double-click it to install in your Keychain.

4. **Export as .p12:** Open Keychain Access, find "Developer ID Application: [Your Name]", right-click → Export. Save as `.p12`. Set an export password and remember it.

   > **What is a .p12 file?** A `.p12` (PKCS#12) file bundles your certificate and its private key together. This is what GitHub Actions will use to sign your app in the cloud.

5. Convert `.p12` to base64 so it can be stored as a GitHub secret:

```bash
base64 -i /path/to/developer-id.p12 | pbcopy
```

> **What does this command do?** `base64 -i` converts a binary file to text. `| pbcopy` copies the result to your clipboard. You'll paste this into GitHub.

Save these two values as GitHub secrets (see Step 6):

- `MACOS_DEVELOPER_ID_P12_BASE64` — the base64 text you just copied
- `MACOS_DEVELOPER_ID_P12_PASSWORD` — the password you chose when exporting the `.p12`

---

## 3. Create Notarization API Key

Notarization is Apple's automated security check. Your app gets uploaded to Apple, scanned for malware, and if it passes, macOS will trust it. You need an API key so your build pipeline can submit apps for notarization without manual intervention.

1. Go to [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api). Click the **+** button to generate a new key.

   > **Access level:** Give the key "Developer" access. That's sufficient for notarization. You don't need Admin or App Manager.

2. After creating the key, note down three things:
   - **Issuer ID** — shown at the top of the Keys page (same for all your keys)
   - **Key ID** — shown next to the key you just created
   - **Download the .p8 file** — you can only download this ONCE, so save it safely!

   > **Tip:** Download the `.p8` immediately after creation. Apple only lets you download it once. If you lose it, you'll need to create a new key.

3. Convert the `.p8` file to base64:

```bash
base64 -i /path/to/AuthKey_ABC1234567.p8 | pbcopy
```

Save these four values as GitHub secrets:

- `NOTARY_KEY_P8_BASE64` — the base64 text from the `.p8` file
- `NOTARY_KEY_ID` — the Key ID shown in App Store Connect (e.g. `ABC1234567`)
- `NOTARY_ISSUER_ID` — the Issuer ID shown at the top of the Keys page
- `APPLE_TEAM_ID` — your 10-character Team ID from Step 1

---

## 4. Generate Sparkle Keys

Sparkle is the framework that handles automatic updates for your app. It uses Ed25519 cryptographic signatures to ensure updates are authentic. Without these keys, your app won't be able to verify that updates are really from you.

### How to Generate the Keys

1. Download Sparkle from [github.com/sparkle-project/Sparkle/releases](https://github.com/sparkle-project/Sparkle/releases). Get the latest `.tar.xz` or `.dmg` release.

2. Inside the Sparkle distribution, find the `generate_keys` tool in the `bin/` folder.

3. Run it in Terminal:

```bash
./bin/generate_keys
```

> **What this creates:** Two things: (1) a private key that gets stored in your macOS Keychain, and (2) a public key string that gets embedded in your app. The private key signs updates, the public key lets the app verify them.

4. Export the private key as base64 and store both values:

- `SPARKLE_PRIVATE_KEY_BASE64` — the private signing key (keep this extremely safe)
- `SPARKLE_PUBLIC_KEY` — the public verification key (this gets built into the app)

> **Tip:** Back up your Sparkle private key to a secure location (e.g., a password manager). If you lose it, you cannot sign future updates with the same identity — all existing users would need to manually re-download.

---

## 5. Configure Download Hosting

Your app needs to live somewhere users can download it, and Sparkle needs a URL to check for updates. This can be any web server, CDN, or even an S3 bucket.

### Required URLs

The release pipeline generates files that need to be accessible at these URLs:

- ZIP: `${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/SevenLayers-${VERSION}.zip`
- Appcast: `${DOWNLOAD_URL_PREFIX}/${RELEASE_CHANNEL}/appcast.xml`
- Release notes: `${RELEASE_NOTES_URL_BASE}/${VERSION}.html`

> **What is an appcast?** An appcast is an XML file (like an RSS feed) that Sparkle checks to see if a newer version of your app is available. It contains the download URL, version number, and the Ed25519 signature for each release.

### Hosting Options

- [Amazon S3 + CloudFront](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) — scalable, pay-per-use, most common for indie apps
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — S3-compatible, no egress fees
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github) — free and simple, good for getting started
- Your own server / VPS — full control, just make sure it supports HTTPS

---

## 6. Set GitHub Repository Secrets

GitHub secrets are encrypted values that your Actions workflow can access at build time. They keep your certificates, passwords, and API keys safe — they're never exposed in logs or to anyone with repo access.

### How to Add a Secret

1. Go to your repository on GitHub
2. Click **Settings** in the top navigation bar
3. In the left sidebar, click **Secrets and variables → Actions**
4. Click **New repository secret**
5. Enter the Name exactly as shown below, paste the Value, and click **Add secret**

> **Exact names matter:** GitHub secrets are case-sensitive. Copy the names exactly as shown in the table below. A typo will cause the workflow to fail.

Learn more: [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

### Secrets Reference

| Secret Name | From | What to Paste |
|---|---|---|
| `MACOS_DEVELOPER_ID_P12_BASE64` | Step 2 | Base64 of your `.p12` certificate |
| `MACOS_DEVELOPER_ID_P12_PASSWORD` | Step 2 | Password you set when exporting `.p12` |
| `APPLE_TEAM_ID` | Step 1 | 10-char Team ID from developer.apple.com |
| `NOTARY_KEY_ID` | Step 3 | Key ID from App Store Connect |
| `NOTARY_ISSUER_ID` | Step 3 | Issuer ID from App Store Connect |
| `NOTARY_KEY_P8_BASE64` | Step 3 | Base64 of your `.p8` API key file |
| `SPARKLE_PRIVATE_KEY_BASE64` | Step 4 | Base64 of Sparkle private key |
| `SPARKLE_PUBLIC_KEY` | Step 4 | Sparkle public key string |
| `DOWNLOAD_URL_PREFIX` | Step 0 | Base URL for hosted downloads |
| `RELEASE_NOTES_URL_BASE` | Step 0 | Base URL for release notes |

`GITHUB_TOKEN` is provided by GitHub Actions automatically — you don't need to add it.

---

## 7. Run Local Report-Mode Rehearsal (Safe)

This is your safe dry run. Report mode runs the entire release pipeline without actually signing, notarizing, or uploading anything. It shows you what would happen and flags any configuration issues.

> **Why report mode?** Think of it like a flight simulator. You see the full pipeline execute with all checks and validations, but nothing gets published. It's the best way to catch mistakes before they matter.

Open Terminal and run:

```bash
cd /path/to/vc83-com/apps/macos
MODE=report VERSION=0.1.0 RELEASE_CHANNEL=stable \
  scripts/release-pipeline.sh
```

If successful, you should see:

- `dist/SevenLayers.app` — the built application
- `dist/release/SevenLayers-0.1.0.zip` — the distributable archive
- `dist/release/*.json` — contract reports showing what each step would do

> **Tip:** Seeing errors about missing credentials? That's expected in report mode. The reports will say "BLOCKED: no signing identity" or similar — that just means those steps need real credentials, which you'll use in Steps 8 and 9.

---

## 8. Run Strict Local Rehearsal (Optional)

If you want to test the real signing and notarization process on your local machine before using GitHub Actions, strict mode runs the full pipeline with your actual credentials. This is optional but gives you confidence everything works end-to-end.

> **When to skip this:** If you're comfortable with the report mode results and trust that your GitHub secrets are correct, you can jump straight to Step 9. Strict mode is most useful if something goes wrong in CI and you want to debug locally.

Open Terminal and run (replace placeholder values with your real ones):

```bash
cd /path/to/vc83-com/apps/macos
MODE=strict \
VERSION=0.1.0 \
RELEASE_CHANNEL=stable \
SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" \
NOTARYTOOL_KEY="/path/to/AuthKey_ABC1234567.p8" \
NOTARYTOOL_KEY_ID="ABC1234567" \
NOTARYTOOL_ISSUER="your-issuer-id-here" \
APPLE_TEAM_ID="TEAMID1234" \
SPARKLE_PRIVATE_KEY_BASE64="..." \
SPARKLE_PUBLIC_KEY="..." \
DOWNLOAD_URL_PREFIX="https://downloads.yourdomain.com/sevenlayers/macos" \
RELEASE_NOTES_URL_BASE="https://downloads.yourdomain.com/sevenlayers/releases" \
PUBLISH_GITHUB_RELEASE=0 \
scripts/release-pipeline.sh
```

> **What does `PUBLISH_GITHUB_RELEASE=0` do?** Setting this to `0` prevents the script from creating a GitHub Release. You want this for local testing so you don't accidentally publish artifacts.

---

## 9. Publish with GitHub Actions

Now it's time for the real thing. GitHub Actions will build, sign, notarize, and publish your app automatically. You have two ways to trigger a release.

Workflow file location: `.github/workflows/macos-release.yml`

### Option A: Tag-Based Release (Recommended)

The simplest approach. Create a git tag and push it — the workflow triggers automatically.

```bash
git tag v0.1.0
git push origin v0.1.0
```

> **What happens next:** GitHub detects the new tag, starts the `macos-release` workflow, builds the app, signs it with your certificate, submits to Apple for notarization, waits for approval, creates a GitHub Release with the signed `.zip`, and updates the appcast. All automated.

### Option B: Manual Dispatch

Useful when you want to release without creating a tag, or re-release a specific version.

1. Go to your repo on GitHub → **Actions** tab
2. Click **macos-release** in the left sidebar
3. Click **Run workflow** button (top right)
4. Fill in `version` (e.g. `0.1.0`) and `release_channel` (e.g. `stable`)
5. Click the green **Run workflow** button

> **Tip:** Your first release will take the longest (10–20 minutes) as GitHub downloads dependencies and Apple processes the notarization. Subsequent releases are usually faster.

---

## 10. Verify Released Artifact

Don't skip this. Always verify the release on a clean Mac (or a different user account) to experience exactly what your users will. This catches issues like missing entitlements, broken notarization, or quarantine flags.

1. Download the release ZIP/DMG from your hosted URL (not from your build folder)

2. Move `SevenLayers.app` into `/Applications` (drag and drop)

3. Launch the app and verify:
   - [ ] App opens without quarantine/notarization errors
   - [ ] Auth callback flow works
   - [ ] Menu bar item appears
   - [ ] Permissions prompts (mic/camera/screen recording/notifications) behave as expected

   > **If you see "cannot be opened":** This means notarization failed or the stapling step was skipped. Run `spctl --assess --verbose /Applications/SevenLayers.app` in Terminal to diagnose. You may need to re-run notarization. See [Apple's notarization troubleshooting](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).

4. Confirm GitHub Release contains expected assets:
   - [ ] `SevenLayers-${VERSION}.zip`
   - [ ] `SevenLayers-${VERSION}.dmg` (if generated)
   - [ ] Appcast/update contract artifacts

---

## 11. Rollback Plan

If something goes wrong with a release (crashes on launch, notarization issues, wrong version), here's how to recover. Don't panic — because you're hosting the download yourself, you have full control.

1. Re-run the pipeline in report mode for the broken version to understand what went wrong:

```bash
MODE=report VERSION=0.1.0 RELEASE_CHANNEL=stable \
  scripts/release-pipeline.sh
```

2. Inspect the diagnostic reports:
   - `dist/release/notarization-report.json` — was Apple's check the issue?
   - `dist/release/appcast-signature-evidence.json` — was the update signature invalid?
   - `dist/release/github-release-report.json` — was the upload incomplete?

3. Promote the last known-good release: copy the previous version's `.zip` and `appcast.xml` back to your download host.

   > **Why this works:** Since Sparkle checks the `appcast.xml` for the latest version, pointing it back to the previous version means all users will see that as "current". No one will be prompted to update to the broken version.

4. Update your download page/links to point to the last working version.

5. Document what happened before attempting the next release. Notes should cover: what broke, why, and what you'll change.

---

## Quick Reference Links

Bookmark these — you'll come back to them:

- [Apple Developer Account](https://developer.apple.com/account) — Team ID, certificates, profiles
- [Certificates & Profiles](https://developer.apple.com/account/resources/certificates/list) — Create/manage signing certificates
- [App Store Connect API Keys](https://appstoreconnect.apple.com/access/integrations/api) — Create notarization API keys
- [Apple Developer Program Enrollment](https://developer.apple.com/programs/enroll/) — New enrollment ($99/year)
- [Sparkle Framework Releases](https://github.com/sparkle-project/Sparkle/releases) — Download generate_keys tool
- [Sparkle Documentation](https://sparkle-project.org/documentation/) — Full Sparkle integration guide
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) — How secrets work
- [Apple Notarization Docs](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) — Official Apple notarization guide
- [Code Signing Guide](https://developer.apple.com/documentation/security/code-signing-services) — Apple's code signing reference
