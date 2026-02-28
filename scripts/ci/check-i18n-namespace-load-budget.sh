#!/usr/bin/env bash
set -euo pipefail

npx tsx scripts/i18n/check-namespace-load-budget.ts \
  --src-dir src \
  --seed-dir convex/translations \
  --max-single 1500 \
  --max-combined 2200
