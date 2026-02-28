# *l4yercak3* UI Token Convergence Implementation

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication`  
**Contract source:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/l4yercak3-design-token-contract.md`

---

## Objective

Provide a deploy-ready execution path for full UI cleanup so remaining legacy style debt is removed and active UI surfaces converge to the *l4yercak3* design token contract.

---

## Execution workflow (queue-first)

1. Run CI enforcement first (`LSE-015`) so newly introduced drift is blocked.
2. Land token alias foundation (`LSE-016`) in `globals.css` with compatibility mapping.
3. Migrate shell chrome and shared primitives (`LSE-017`, `LSE-018`) before broad window sweeps.
4. Migrate high-density + remaining route surfaces in bounded waves (`LSE-019`, `LSE-020`).
5. Lock visual/contrast checks and finalize docs handoff (`LSE-021`, `LSE-022`).

Queue source of truth: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legacy-style-eradication/TASK_QUEUE.md`

Temporary deferred scope:

- `/Users/foundbrand_001/Development/vc83-com/src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx`
- `/Users/foundbrand_001/Development/vc83-com/src/components/template-renderer.tsx`
- Deferred row: `LSE-023` (post-closeout)

---

## Tool mapping

| Work type | Primary tool/script | Output |
|---|---|---|
| New design drift detection | `npm run ui:design:guard` | PR-time fail on contract violations in newly introduced lines |
| Legacy debt baseline tracking | `npm run ui:legacy:guard -- "$EMPTY_TREE" HEAD` | Snapshot of remaining legacy-pattern debt |
| Runtime safety | `npm run typecheck`; `npm run lint`; `npm run test:unit` | Regression protection on behavior and contracts |
| Visual lock | `npm run test:e2e:visual` | Snapshot enforcement for Midnight/Daylight parity |
| Docs integrity | `npm run docs:guard` | Queue artifact structure and docs policy compliance |

---

## Contract convergence checklist by surface

### 1) Token layer (`LSE-016`)

- Add canonical contract tokens for colors/spacing/radius/shadows/motion.
- Keep compatibility aliases so existing `dark` and `sepia` runtime switches continue working.
- Avoid deleting compatibility aliases until dependent lanes complete.

### 2) Shell chrome (`LSE-017`)

- Taskbar, topbar links, menu containers/items/dividers, window shell, titlebar, and tab rows.
- Remove hardcoded utilities in touched files (`bg-*`, `text-*`, `border-gray-*`, `shadow-*` classes covered by guard).
- Preserve hit targets, hover states, and focus indicators.

### 3) Shared primitives (`LSE-018`)

- Buttons, inputs, selects, checkboxes, cards, badges, tables, modals.
- Ensure component variants map to contract token matrix.
- Keep behavior equivalent (disabled/focus/error states unchanged functionally).

### 4) Remaining UI surfaces (`LSE-019`, `LSE-020`)

- High-density windows first (AI system, sequences, finder, tickets, translations, compliance, agent configuration).
- Route-level and builder sweeps after primitives settle.
- Remove newly introduced raw value styling in touched lines.

### 5) Validation lock (`LSE-021`, `LSE-022`)

- Expand visual matrix across Midnight/Daylight core screens.
- Make contrast/visual checks deterministic with explicit pass/fail labels.
- Publish debt deltas and synchronize queue artifacts at closeout.

---

## Deploy-ready recommendations

1. Keep rollout incremental by lane and merge each row only after row-level Verify commands pass.
2. Prioritize `globals.css` and shared primitive merges early in the day to reduce branch conflicts.
3. Track one migration cluster per PR for faster visual debugging and easier rollback.
4. Gate production release on `LSE-021` completion so visual/contrast checks are active before final closeout.
