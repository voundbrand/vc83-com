# Operator Mobile OAuth Setup

This app lives in `apps/operator-mobile`, so OAuth env vars must be configured for this app workspace.

## Where env vars belong

When running from:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
```

Expo reads env from this folder (`apps/operator-mobile`), not from the monorepo root.

Create:

`apps/operator-mobile/.env.local`

Fast path:

```bash
cp apps/operator-mobile/.env.example apps/operator-mobile/.env.local
```

With:

```bash
EXPO_PUBLIC_L4YERCAK3_API_URL=https://agreeable-lion-828.convex.site

# Google OAuth
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=19450024372-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=19450024372-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# Optional feature toggle (default false)
EXPO_PUBLIC_ENABLE_GITHUB_MICROSOFT_OAUTH=false
```

## Google iOS callback requirement

For iOS Google Sign-In to work, your reversed iOS client ID must match:

- `app.json` -> `expo.ios.infoPlist.CFBundleURLTypes[0].CFBundleURLSchemes`

Example format:

- `com.googleusercontent.apps.19450024372-xxxxxxxxxxxxxxxxxxxxxxxx`

If you change `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, update the URL scheme accordingly.

## After changing OAuth env/config

Run:

```bash
cd /Users/foundbrand_001/Development/vc83-com/apps/operator-mobile
nvm use
npm run ios -- --no-build-cache
```

If native OAuth settings were changed and iOS build still uses old config:

```bash
cd ios
pod install
cd ..
npm run ios -- --no-build-cache
```
