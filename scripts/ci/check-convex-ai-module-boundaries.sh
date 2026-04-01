#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="check-convex-ai-module-boundaries"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

DEPRECATED_MODULE_FILES=(
  "convex/ai/agentExecution.ts"
  "convex/ai/agentToolOrchestration.ts"
  "convex/ai/agentTurnOrchestration.ts"
  "convex/ai/modelPolicy.ts"
  "convex/ai/modelAdapters.ts"
  "convex/ai/modelFailoverPolicy.ts"
  "convex/ai/modelPricing.ts"
  "convex/ai/modelEnablementGates.ts"
  "convex/ai/modelDefaults.ts"
  "convex/ai/modelDiscovery.ts"
  "convex/ai/modelConformance.ts"
)

DEPRECATED_CODE_PATTERNS=(
  'api\\.ai\\.agentExecution'
  'generatedApi\\.api\\.ai\\.agentExecution'
  'generatedApi\\.internal\\.ai\\.agentExecution'
  'generatedApi\\.internal\\.ai\\.modelDiscovery'
  '/convex/ai/agentExecution(\\.ts)?'
  '/convex/ai/agentToolOrchestration(\\.ts)?'
  '/convex/ai/agentTurnOrchestration(\\.ts)?'
  '/convex/ai/modelPolicy(\\.ts)?'
  '/convex/ai/modelAdapters(\\.ts)?'
  '/convex/ai/modelFailoverPolicy(\\.ts)?'
  '/convex/ai/modelPricing(\\.ts)?'
  '/convex/ai/modelEnablementGates(\\.ts)?'
  '/convex/ai/modelDefaults(\\.ts)?'
  '/convex/ai/modelDiscovery(\\.ts)?'
  '/convex/ai/modelConformance(\\.ts)?'
)

missing=0

for file in "${DEPRECATED_MODULE_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "[$SCRIPT_NAME] deprecated compatibility module still exists: $file" >&2
    missing=1
  fi
done

for pattern in "${DEPRECATED_CODE_PATTERNS[@]}"; do
  if rg -n -g '*.ts' -g '*.tsx' -g '*.mts' -g '*.cts' --glob '!**/*.md' --glob '!**/*.json' --glob '!**/*.snap' -- "$pattern" convex tests scripts src >/tmp/${SCRIPT_NAME}.matches 2>/dev/null; then
    echo "[$SCRIPT_NAME] deprecated boundary reference matched pattern: $pattern" >&2
    sed -n '1,40p' /tmp/${SCRIPT_NAME}.matches >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  echo "[$SCRIPT_NAME] failed: deprecated module boundary references detected" >&2
  exit 1
fi

echo "[$SCRIPT_NAME] ok"
