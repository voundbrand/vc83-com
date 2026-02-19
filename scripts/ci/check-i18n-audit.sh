#!/usr/bin/env bash
set -euo pipefail

npx tsx scripts/i18n/find-untranslated-ui-strings.ts \
  --scopes builder,layers,window-content \
  --report docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/current.json \
  --baseline docs/reference_docs/topic_collections/implementation/i18n-untranslated-coverage/reports/baseline.json \
  --fail-on-new
