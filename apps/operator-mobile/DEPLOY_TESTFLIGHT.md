# Operator Mobile TestFlight Deployment

This runbook is deployment-only for `apps/operator-mobile`.

## Current release identifiers

- App display name: `SevenLayers`
- iOS bundle identifier: `com.l4yercak3.app`
- Apple Team ID (from iOS project): `A89SWGVT26`

If you want a new bundle ID for first public branding (for example `io.sevenlayers.operator`), do that as a separate cut because it also requires:
- new App ID in Apple Developer,
- new app record in App Store Connect,
- new iOS OAuth client config for Google Sign-In.

## One-time setup

1. Go to this app directory:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
```

2. Use the supported Node runtime for Expo commands:

```bash
nvm use
node -v
```

Required: Node `>=20` and `<24` (the app includes `.nvmrc` pinned to `22`).

3. Log into Expo/EAS:

```bash
npx eas-cli login
npx eas-cli whoami
```

4. Link the project to EAS (writes `extra.eas.projectId` in app config):

```bash
npx eas-cli init
```

5. Ensure App Store Connect app record exists with bundle ID `com.l4yercak3.app`.

6. Prepare iOS credentials:

```bash
npm run credentials:ios
```

## Build and submit to TestFlight

## Preflight checks (required before build)

```bash
npm run ci:ios:preflight
```

This verifies:

- Type safety for `apps/operator-mobile`.
- iOS icon readiness: both required 1024x1024 icons exist and have no alpha channel.

### Fast path (build + submit)

```bash
npm run deploy:testflight
```

### Split path (recommended when debugging)

1. Build:

```bash
npm run build:ios:production
```

2. Submit latest build:

```bash
npm run submit:ios:production
```

If submit profile is empty on first run, provide your App Store Connect app id:

```bash
npx eas-cli submit --platform ios --latest --asc-app-id <ASC_APP_ID> --apple-team-id A89SWGVT26
```

## App Store Connect actions

1. Open App Store Connect -> your app -> `TestFlight`.
2. Add build to an internal testing group.
3. For external testers:
   - fill beta app details,
   - complete export compliance if prompted,
   - submit for Beta App Review.

## Versioning policy in this repo

- `eas.json` uses:
  - `appVersionSource: "remote"`
  - production `autoIncrement: "buildNumber"`
- Result:
  - each production build gets a new iOS build number automatically,
  - only bump `expo.version` in `app.json` when you intentionally start a new marketing version (for example `1.0.0` -> `1.1.0`).
