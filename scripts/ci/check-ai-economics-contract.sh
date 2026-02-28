#!/usr/bin/env bash
set -euo pipefail

echo "AI economics contract: running targeted usage metering and aggregation tests..."

npx vitest run \
  tests/unit/ai/nonChatUsageMetering.test.ts \
  tests/unit/ai/platformEconomicsAggregation.test.ts \
  tests/unit/ai/providerExecutionTelemetryCoverage.test.ts

echo "AI economics contract passed."
