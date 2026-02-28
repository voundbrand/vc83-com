#!/usr/bin/env bash
set -euo pipefail

REQUIRED_FILES=(
  "src/tokens/showcase/design-token-showcase-v2.tsx"
  "src/app/design-token-showcase/page.tsx"
  "tests/e2e/ui-visual-regression.spec.ts"
)

REQUIRED_SNAPSHOTS=(
  "tests/e2e/ui-visual-regression.spec.ts-snapshots/design-token-showcase-dark-desktop-chrome.png"
  "tests/e2e/ui-visual-regression.spec.ts-snapshots/design-token-showcase-sepia-desktop-chrome.png"
  "tests/e2e/ui-visual-regression.spec.ts-snapshots/design-token-showcase-coverage-dark-desktop-chrome.png"
  "tests/e2e/ui-visual-regression.spec.ts-snapshots/design-token-showcase-coverage-sepia-desktop-chrome.png"
  "tests/e2e/ui-visual-regression.spec.ts-snapshots/visual-shell-dark-desktop-chrome.png"
  "tests/e2e/ui-visual-regression.spec.ts-snapshots/visual-shell-sepia-desktop-chrome.png"
)

FAILURES=()

for path in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$path" ]]; then
    FAILURES+=("missing_required_file:$path")
  fi
done

if ! rg -q 'data-testid="design-token-showcase-scene"' src/tokens/showcase/design-token-showcase-v2.tsx; then
  FAILURES+=("missing_showcase_test_id:src/tokens/showcase/design-token-showcase-v2.tsx")
fi

if ! rg -q '/design-token-showcase\?scheme=\$\{scheme\}' tests/e2e/ui-visual-regression.spec.ts; then
  FAILURES+=("missing_showcase_route_snapshot:tests/e2e/ui-visual-regression.spec.ts")
fi

if ! rg -q 'snapshotPrefix:[[:space:]]*"design-token-showcase"' tests/e2e/ui-visual-regression.spec.ts; then
  FAILURES+=("missing_showcase_snapshot_contract:tests/e2e/ui-visual-regression.spec.ts")
fi

if ! rg -q 'snapshotPrefix:[[:space:]]*"design-token-showcase-coverage"' tests/e2e/ui-visual-regression.spec.ts; then
  FAILURES+=("missing_showcase_coverage_snapshot_contract:tests/e2e/ui-visual-regression.spec.ts")
fi

if ! rg -q '\[VISUAL_CHECK\] screen=\$\{scenario\.screen\} mode=\$\{mode\}' tests/e2e/ui-visual-regression.spec.ts; then
  FAILURES+=("missing_visual_deterministic_label_contract:tests/e2e/ui-visual-regression.spec.ts")
fi

if ! rg -q '\[CONTRAST_CHECK\] screen=design-token-showcase mode=\$\{mode\} token=\$\{tokenPair\}' tests/e2e/ui-visual-regression.spec.ts; then
  FAILURES+=("missing_contrast_deterministic_label_contract:tests/e2e/ui-visual-regression.spec.ts")
fi

for snapshot in "${REQUIRED_SNAPSHOTS[@]}"; do
  if [[ ! -f "$snapshot" ]]; then
    FAILURES+=("missing_snapshot:$snapshot")
  fi
done

if [[ "${#FAILURES[@]}" -gt 0 ]]; then
  echo "UI showcase enforcement failed:"
  for failure in "${FAILURES[@]}"; do
    echo "- $failure"
  done
  echo
  echo "Run: npm run test:e2e:visual:update"
  exit 1
fi

echo "UI showcase enforcement passed."
