# Vercel App Helper

Audit a monorepo app before wiring it up as its own Vercel project.

## Usage

```bash
npm run vercel:app:helper -- apps/segelschule-altwarp
```

Optional flags:

```bash
npm run vercel:app:helper -- apps/segelschule-altwarp --write-doc
npm run vercel:app:helper -- apps/segelschule-altwarp --json
```

## What it checks

- framework and Next.js detection signals
- app-local vs root-resolved package scripts
- imports or tsconfig aliases that escape the app root
- recommended Vercel install/build settings
- ignored build step command
- env vars referenced by the app

## Why it exists

Monorepo apps in this repo are not all shaped the same way. Some apps can deploy with an app-only install, while others also depend on repo-root `node_modules` because they import workspace code or generated Convex files from outside the app root. This helper makes that distinction explicit before a deploy is set up.
