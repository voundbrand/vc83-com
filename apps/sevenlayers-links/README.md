# sevenlayers-links

Static Vercel project for Universal Links infrastructure.

## Domain

- `links.sevenlayers.io`

## Required file

- `/.well-known/apple-app-site-association`

## Before production

1. Replace `TEAMID` in `.well-known/apple-app-site-association` with your real Apple Developer Team ID.
2. In iOS app entitlements, include: `applinks:links.sevenlayers.io`.
3. In Meta DAT iOS config, set Universal Link to:
   - `https://links.sevenlayers.io/dat-callback`

## Validate

```bash
curl -i https://links.sevenlayers.io/.well-known/apple-app-site-association
```

Expect:
- HTTP 200
- `Content-Type: application/json`
- JSON body with `TEAMID.com.l4yercak3.app`
