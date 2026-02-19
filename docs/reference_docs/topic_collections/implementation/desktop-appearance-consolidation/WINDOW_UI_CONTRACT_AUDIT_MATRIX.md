# Window UI Contract Audit Matrix

**Date:** 2026-02-18  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/desktop-appearance-consolidation`

---

## Purpose

Track contract compliance for every desktop window surface defined in `src/hooks/window-registry.tsx`.

This matrix is the execution tracker for contract-driven UI review across the entire existing desktop UI.

---

## Status legend

- `COMPLIANT`: manually reviewed and verified against `WINDOW_UI_DESIGN_CONTRACT.md`
- `NON_COMPLIANT`: manually reviewed and fails one or more non-negotiable contract rules
- `CANDIDATE_COMPLIANT`: baseline scan suggests compliant, manual review still required
- `MIXED`: baseline scan found both modern and legacy patterns
- `LEGACY`: baseline scan found legacy patterns and no interior primitives in primary file
- `UNREVIEWED`: baseline scan had insufficient signal

`manual_status` starts as `pending` for all rows until a manual pass is completed.

---

## Baseline summary (automated triage)

- Total tracked windows: `48`
- `CANDIDATE_COMPLIANT`: `11`
- `MIXED`: `1`
- `LEGACY`: `28`
- `UNREVIEWED`: `8`

Baseline rules are heuristic only; manual review is authoritative.

---

## Inventory and baseline

| Window ID | Primary surface path | Baseline status | Manual status |
|---|---|---|---|
| `about` | `src/components/window-content/about-window.tsx` | `LEGACY` | `pending` |
| `agents-browser` | `src/components/window-content/agents-window.tsx` | `LEGACY` | `pending` |
| `ai-assistant` | `src/components/window-content/ai-chat-window/index.tsx` | `MIXED` | `pending` |
| `ai-system` | `src/components/window-content/ai-system-window/index.tsx` | `LEGACY` | `pending` |
| `all-apps` | `src/components/window-content/all-apps-window.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `benefits` | `src/components/window-content/benefits-window.tsx` | `LEGACY` | `pending` |
| `booking` | `src/components/window-content/booking-window.tsx` | `LEGACY` | `pending` |
| `brain` | `src/components/window-content/brain-window/index.tsx` | `LEGACY` | `COMPLIANT` |
| `builder-browser` | `src/components/window-content/builder-browser-window.tsx` | `UNREVIEWED` | `pending` |
| `cart` | `src/components/window-content/platform-cart-window.tsx` | `LEGACY` | `pending` |
| `certificates` | `src/components/window-content/certificates-window/index.tsx` | `LEGACY` | `pending` |
| `checkout` | `src/components/window-content/checkout-window/index.tsx` | `LEGACY` | `pending` |
| `checkout-app` | `src/components/window-content/checkout-window/index.tsx` | `LEGACY` | `pending` |
| `checkout-failed` | `src/components/window-content/checkout-failed-window.tsx` | `LEGACY` | `pending` |
| `checkout-success` | `src/components/window-content/checkout-success-window.tsx` | `LEGACY` | `pending` |
| `compliance` | `src/components/window-content/compliance-window.tsx` | `LEGACY` | `pending` |
| `control-panel` | `src/components/window-content/control-panel-window.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `crm` | `src/components/window-content/crm-window.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `events` | `src/components/window-content/events-window/index.tsx` | `LEGACY` | `pending` |
| `feedback` | `src/components/window-content/feedback-window.tsx` | `LEGACY` | `pending` |
| `finder` | `src/components/window-content/finder-window/index.tsx` | `UNREVIEWED` | `pending` |
| `forms` | `src/components/window-content/forms-window/index.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `integrations` | `src/components/window-content/integrations-window/index.tsx` | `LEGACY` | `pending` |
| `invoicing` | `src/components/window-content/invoicing-window/index.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `layers-browser` | `src/components/window-content/layers-browser-window.tsx` | `UNREVIEWED` | `pending` |
| `login` | `src/components/window-content/login-window.tsx` | `LEGACY` | `pending` |
| `manage` | `src/components/window-content/org-owner-manage-window/index.tsx` | `LEGACY` | `pending` |
| `media-library` | `src/components/window-content/media-library-window/index.tsx` | `UNREVIEWED` | `pending` |
| `oauth-tutorial` | `src/components/window-content/oauth-tutorial-window.tsx` | `LEGACY` | `pending` |
| `organizations` | `src/components/window-content/super-admin-organizations-window/index.tsx` | `LEGACY` | `pending` |
| `payments` | `src/components/window-content/payments-window/index.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `platform-cart` | `src/components/window-content/platform-cart-window.tsx` | `LEGACY` | `pending` |
| `products` | `src/components/window-content/products-window/index.tsx` | `LEGACY` | `pending` |
| `projects` | `src/components/window-content/projects-window/index.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `purchase-result` | `src/components/window-content/purchase-result-window.tsx` | `LEGACY` | `pending` |
| `quick-start` | `src/components/quick-start/quick-start-icp-selector.tsx` | `UNREVIEWED` | `pending` |
| `settings` | `src/components/window-content/settings-window.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `store` | `src/components/window-content/store-window.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `templates` | `src/components/window-content/templates-window/index.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `terminal` | `src/components/window-content/terminal-window.tsx` | `UNREVIEWED` | `pending` |
| `text-editor` | `src/components/window-content/text-editor-window/index.tsx` | `CANDIDATE_COMPLIANT` | `pending` |
| `tickets` | `src/components/window-content/tickets-window/index.tsx` | `LEGACY` | `pending` |
| `translations` | `src/components/window-content/translations-window.tsx` | `LEGACY` | `pending` |
| `tutorial-welcome` | `src/components/window-content/tutorial-window.tsx` | `UNREVIEWED` | `pending` |
| `tutorials-docs` | `src/components/window-content/tutorials-docs-window.tsx` | `LEGACY` | `pending` |
| `web-publishing` | `src/components/window-content/web-publishing-window/index.tsx` | `LEGACY` | `pending` |
| `welcome` | `src/components/window-content/welcome-window.tsx` | `LEGACY` | `pending` |
| `workflows` | `src/components/window-content/workflows-window.tsx` | `UNREVIEWED` | `pending` |

---

## Next actions

1. Execute manual review passes per Lane `K` queue rows (`DAC-038`..`DAC-041`).
2. Convert baseline status to manual `COMPLIANT`/`NON_COMPLIANT` with notes for each window.
3. Create remediation rows for each non-compliant window group and link those IDs in this matrix.

---

## Manual review notes

### 2026-02-18 - `brain`

Manual review scope:

- `src/components/window-content/brain-window/index.tsx`
- `src/components/window-content/brain-window/learn-mode.tsx`
- `src/components/window-content/brain-window/teach-mode.tsx`
- `src/components/window-content/brain-window/review-mode.tsx`
- `src/components/window-content/brain-window/brain-modern.module.css`
- shell/entry parity references:
  - `src/app/page.tsx` (Product menu entry)
  - `src/components/window-content/all-apps-window.tsx` (All Applications tile + launch wiring)

Contract verdict: `NON_COMPLIANT` (manual)

Findings by rule:

1. Non-negotiable rule 2 (shared interior primitives): `FAIL`
   - Brain window and all submodes do not use `InteriorRoot`, `InteriorHeader`, `InteriorTabRow`, `InteriorInput`, `InteriorButton`, etc.
   - Brain uses ad hoc native controls and utility classes in:
     - `src/components/window-content/brain-window/index.tsx`
     - `src/components/window-content/brain-window/learn-mode.tsx`
     - `src/components/window-content/brain-window/teach-mode.tsx`
     - `src/components/window-content/brain-window/review-mode.tsx`

2. Non-negotiable rule 3 (canonical shell/document token classes): `FAIL`
   - Brain interior does not adopt `desktop-interior-*` classes.
   - `brain-modern.module.css` is a compatibility remap over legacy `zinc-*`/`purple-*` classes instead of direct tokenized primitives.
   - Primary evidence: `src/components/window-content/brain-window/brain-modern.module.css`.

3. Non-negotiable rule 4 (no emoji glyphs in chrome/menu/window controls): `PASS`
   - Product menu uses `ShellBrainIcon` and icon-led rows:
     - `src/app/page.tsx`
   - All Applications brain tile icon resolves through `getWindowIconById("brain")` -> `ShellBrainIcon`:
     - `src/components/window-content/all-apps-window.tsx`
     - `src/components/icons/shell-icons.tsx`

4. Non-negotiable rule 5 (focus visibility + reduced motion): `PARTIAL`
   - Reduced-motion-safe center-origin open/close behavior is provided at shell window level (`FloatingWindow`).
   - Brain interior controls still rely on ad hoc focus styling and do not uniformly use shared focus-visible interior control contract.

5. Non-negotiable rule 6 (namespace-resolved translations): `FAIL`
   - Brain surfaces contain multiple hard-coded user-visible strings in component copy and mode labels instead of namespace-driven key resolution.
   - Primary evidence:
     - `src/components/window-content/brain-window/index.tsx`
     - `src/components/window-content/brain-window/learn-mode.tsx`
     - `src/components/window-content/brain-window/teach-mode.tsx`
     - `src/components/window-content/brain-window/review-mode.tsx`

PostHog cue subset (applicable):

1. Top compact link-first shell navigation: `PASS` (Product menu path present in `src/app/page.tsx`)
2. Calm icon-led menus with chevron affordance: `PASS` (`src/components/taskbar/top-nav-menu.tsx`)
3. Near-white/sepia working document surfaces for readability: `FAIL` in Brain interior (legacy dark `zinc/purple` interior contract and remap layer)
4. Center-origin motion with reduced-motion fallback: `PASS` (window shell in `src/components/floating-window.tsx`)
5. Custom icon components/no emoji in active shell paths: `PASS` (`src/components/icons/shell-icons.tsx`, `src/app/page.tsx`, `src/components/window-content/all-apps-window.tsx`)

### 2026-02-18 (remediation pass) - `brain`

Manual remediation completed in:

- `src/components/window-content/brain-window/index.tsx`
- `src/components/window-content/brain-window/learn-mode.tsx`
- `src/components/window-content/brain-window/teach-mode.tsx`
- `src/components/window-content/brain-window/review-mode.tsx`
- `src/components/interview/interview-selector.tsx`
- `src/components/interview/interview-runner.tsx`
- `src/components/interview/interview-progress.tsx`
- removed legacy compatibility bridge: `src/components/window-content/brain-window/brain-modern.module.css`

Result:

- Brain now uses shared interior primitives/tokenized surfaces as the primary contract.
- Legacy `zinc-*`/`purple-*` ad hoc interior styling was removed from Brain + interview runtime surfaces.
- Product menu + All Applications Brain entries continue to use shell icon components.
- Window motion remains center-origin/reduced-motion safe via shell window primitive.
- Brain copy now resolves through namespace lookup with explicit fallback strings to prevent raw key leakage.
