#!/usr/bin/env bash
set -euo pipefail

npx tsx scripts/i18n/check-translation-key-coverage.ts \
  --src-dirs src/components,src/app \
  --seed-dir convex/translations \
  --fail-on-missing
