# Webchat Deployment UI Task Queue

**Last updated:** 2026-02-19  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui`  
**Source request:** Queue-first implementation plan for a native Webchat Deployment UI.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless concurrency rules explicitly allow one per lane.
3. Promote a task from `PENDING` to `READY` only when all dependencies are `DONE`.
4. Selection order is deterministic: highest priority (`P0` -> `P1` -> `P2`) then lowest task ID.
5. If a task is `BLOCKED`, capture blocker details in row `Notes` and continue with the next `READY` row.
6. Every task must include explicit verification commands before moving to `DONE`.
7. Keep lane ownership strict to reduce merge conflicts.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, and this queue after each completed task.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT` | `npm run test:unit` |
| `V-DOCS` | `npm run docs:guard` |
| `V-WEBCHAT-LINT` | `npx eslint convex/http.ts convex/api/v1/webchatApi.ts src/components/chat-widget/ChatWidget.tsx src/app/api/native-guest/config/route.ts src/components/window-content/web-publishing-window` |
| `V-WEBCHAT-UNIT` | `npx vitest run tests/unit/ai/activeAgentRouting.test.ts tests/unit/ai/trustEventTaxonomy.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/shell/url-state.test.ts` |
| `V-WEBCHAT-SMOKE` | `bash -lc 'npm run typecheck && npm run lint && npm run test:unit'` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Backend contract and payload hardening | `convex/http.ts`; `convex/api/v1/webchatApi.ts`; `src/app/api/native-guest/config/route.ts` | No desktop UI edits before `WDU-003` is `DONE` |
| `B` | Widget runtime and snippet generation | `src/components/chat-widget/*`; snippet/config runtime helpers; webchat config contract usage | Avoid window shell and registry edits in lane `B` |
| `C` | Native desktop Webchat Deployment UI | `src/components/window-content/web-publishing-window/*`; `src/components/window-content/agent-configuration-window.tsx`; `src/hooks/window-registry.tsx`; `src/app/page.tsx` | No Convex schema/endpoint contract edits in lane `C` |
| `D` | Docs, tests, smoke checks, closeout | `tests/*`; workstream docs; smoke playbook/checklists | Starts after all `P0` rows in lanes `A`..`C` are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` (`WDU-001`..`WDU-003`) to lock the payload and bootstrap contract.
2. Lane `B` starts after `WDU-002` is `DONE`.
3. Lane `C` starts after `WDU-004` and `WDU-005` are `DONE`.
4. Lane `D` starts after all `P0` tasks across lanes `A`, `B`, and `C` are `DONE` or `BLOCKED`.
5. Run final `V-DOCS` in `WDU-012` before closeout.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `WDU-001` | `A` | 1 | `P0` | `DONE` | - | Baseline audit of current webchat/native guest contract, deploy entrypoints, and mismatch between client payloads and backend expectations | `convex/http.ts`; `convex/api/v1/webchatApi.ts`; `src/components/chat-widget/ChatWidget.tsx`; `src/app/api/native-guest/config/route.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/bring_it_all_together/05-WEBCHAT-WIDGET.md` | `V-DOCS` | Audit captured 2026-02-18 in `MASTER_PLAN.md` (`WDU-001` findings): public handlers trust client `organizationId` while `ChatWidget` omits it, org/agent/session consistency checks are incomplete, deploy snippet contract is missing, and config customization fields are read-only without typed update contract. |
| `WDU-002` | `A` | 1 | `P0` | `DONE` | `WDU-001` | Fix public payload contract so `organizationId` is resolved server-side from trusted agent/bootstrap context (with safe fallback for legacy clients) | `convex/http.ts`; `convex/api/v1/webchatApi.ts`; `src/app/api/native-guest/config/route.ts`; `src/components/chat-widget/ChatWidget.tsx` | `V-TYPE`; `V-LINT`; `V-WEBCHAT-LINT`; `V-WEBCHAT-UNIT` | Completed 2026-02-18: added `resolvePublicMessageContext`; both public message endpoints now resolve canonical org/agent from session/agent context and only treat client `organizationId` as legacy hint; native guest bootstrap now returns resolved org/agent pair. Verify passed (`npm run typecheck`, `npm run lint`, targeted webchat lint + vitest). |
| `WDU-003` | `A` | 1 | `P1` | `DONE` | `WDU-002` | Add backend bootstrap contract for deployment UI (resolved org/agent/channel metadata and safe defaults) | `src/app/api/native-guest/config/route.ts`; `convex/api/v1/webchatApi.ts`; `convex/http.ts` | `V-TYPE`; `V-LINT`; `V-WEBCHAT-UNIT` | Completed 2026-02-18: added `getPublicWebchatBootstrap` contract and public `GET /api/v1/webchat/bootstrap/:agentId`; native guest config now returns contract metadata (`channel`, `contractVersion`, `deploymentDefaults`, `widgetConfig`) while preserving legacy fields. Verify passed (`npm run typecheck`, `npm run lint`, `V-WEBCHAT-UNIT`). |
| `WDU-004` | `B` | 2 | `P0` | `DONE` | `WDU-002` | Implement deterministic deploy snippet generator (script tag, React embed, iframe) from resolved backend contract | `src/components/chat-widget/index.ts`; `src/components/chat-widget/deploymentSnippets.ts`; `tests/unit/shell/webchat-deployment-snippets.test.ts` | `V-TYPE`; `V-LINT`; `V-WEBCHAT-LINT`; `V-UNIT` | Completed 2026-02-18: added deterministic `generateWebchatDeploymentSnippets` plus dataset/query seed parsers and index exports for script/React/iframe snippet modes from bootstrap contract inputs. Verify passed (`npm run typecheck`, `npm run lint`, `npx eslint convex/http.ts convex/api/v1/webchatApi.ts src/components/chat-widget/ChatWidget.tsx src/app/api/native-guest/config/route.ts src/components/window-content/web-publishing-window`, `npm run test:unit`). |
| `WDU-005` | `B` | 2 | `P0` | `DONE` | `WDU-003` | Define and enforce webchat config customization contract (welcome copy, brand color, bubble text, position, language, collect-contact toggle, offline message) | `convex/webchatCustomizationContractCore.ts`; `convex/webchatCustomizationContract.ts`; `convex/api/v1/webchatApi.ts`; `convex/agentOntology.ts`; `convex/http.ts` | `V-TYPE`; `V-LINT`; `V-WEBCHAT-LINT`; `V-WEBCHAT-UNIT` | Completed 2026-02-18: introduced shared customization contract defaults/normalizers, enforced channel binding validation/normalization in agent mutations, sanitized config resolution in webchat API, and exposed contract metadata on config responses. Verify passed (`npm run typecheck`, `npm run lint`, `npx eslint convex/http.ts convex/api/v1/webchatApi.ts src/components/chat-widget/ChatWidget.tsx src/app/api/native-guest/config/route.ts src/components/window-content/web-publishing-window`, `npx vitest run tests/unit/ai/activeAgentRouting.test.ts tests/unit/ai/trustEventTaxonomy.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/shell/url-state.test.ts`). |
| `WDU-006` | `B` | 2 | `P1` | `DONE` | `WDU-004`, `WDU-005` | Update widget runtime to consume customization contract consistently and support snippet-driven initialization paths | `src/components/chat-widget/ChatWidget.tsx`; `src/components/chat-widget/index.ts`; `src/components/chat-widget/deploymentSnippets.ts` | `V-TYPE`; `V-LINT`; `V-WEBCHAT-LINT`; `V-WEBCHAT-UNIT` | Completed 2026-02-18: widget now resolves bootstrap/config by channel, merges snippet/prop customization through shared contract normalization, supports snippet query seed initialization, and applies contract fields consistently (bubble label, language UI copy, contact collection, offline fallback). Verify passed (`npm run typecheck`, `npm run lint`, `npx eslint convex/http.ts convex/api/v1/webchatApi.ts src/components/chat-widget/ChatWidget.tsx src/app/api/native-guest/config/route.ts src/components/window-content/web-publishing-window`, `npx vitest run tests/unit/ai/activeAgentRouting.test.ts tests/unit/ai/trustEventTaxonomy.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/shell/url-state.test.ts`). |
| `WDU-007` | `C` | 3 | `P0` | `DONE` | `WDU-004`, `WDU-005` | Add native desktop “Webchat Deployment” surface and navigation entry for setup, snippets, and config editing | `src/components/window-content/web-publishing-window/index.tsx`; `src/components/window-content/web-publishing-window/deployments-tab.tsx`; `src/hooks/window-registry.tsx`; `src/app/page.tsx` | `V-TYPE`; `V-LINT`; `V-UNIT` | Completed 2026-02-18: added dedicated `webchat-deployment` surface in `WebPublishingWindow`, tab CTA from deployments, desktop product menu entry, and registry/deeplink window support (`webchat-deployment`). Verify passed (`npm run typecheck`, `npm run lint`, `npm run test:unit`) with existing repo warning baseline. |
| `WDU-008` | `C` | 3 | `P0` | `DONE` | `WDU-007` | Build deploy snippets UX: snippet cards, one-click copy states, required env hints, and quick verification checklist in UI | `src/components/window-content/web-publishing-window/*`; deployment UI helper components | `V-TYPE`; `V-LINT`; `V-UNIT` | Completed 2026-02-18: added `webchat-deployment-tab.tsx` snippet cards for script/React/iframe, one-click copy feedback states, app/api URL validation hints, env guidance, and runtime quick-check checklist UI. Verify passed (`npm run typecheck`, `npm run lint`, `npm run test:unit`) with existing repo warning baseline. |
| `WDU-009` | `C` | 3 | `P1` | `DONE` | `WDU-007`, `WDU-005` | Build webchat config customization form with live preview wired to backend contract | `src/components/window-content/web-publishing-window/*`; `src/components/window-content/agent-configuration-window.tsx`; `src/components/chat-widget/ChatWidget.tsx` | `V-TYPE`; `V-LINT`; `V-WEBCHAT-LINT`; `V-UNIT` | Completed 2026-02-18: added channel-bound webchat config form (welcome/brand/bubble/position/language/contact/offline), live preview, bootstrap/config endpoint checks, and persisted updates through existing `agentOntology.updateAgent` channel binding contract. Verify passed (`npm run typecheck`, `npm run lint`, `npx eslint convex/http.ts convex/api/v1/webchatApi.ts src/components/chat-widget/ChatWidget.tsx src/app/api/native-guest/config/route.ts src/components/window-content/web-publishing-window`, `npm run test:unit`) with existing warning baseline. |
| `WDU-010` | `D` | 4 | `P0` | `DONE` | `WDU-002`, `WDU-006`, `WDU-009` | Add unit coverage for payload contract and customization/snippet behavior | `tests/unit/ai/*`; `tests/unit/shell/*`; new webchat deployment unit tests | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-WEBCHAT-UNIT` | Completed 2026-02-19: extracted `resolvePublicMessageContextFromDb` in `convex/api/v1/webchatApi.ts` for deterministic contract testing, added `tests/unit/ai/webchatPublicMessageContext.test.ts` (missing/mismatched `organizationId` negative coverage and channel/session resolution), expanded invalid seed coverage in `tests/unit/shell/webchat-deployment-snippets.test.ts`, and updated stale launch-contract assertions in `tests/unit/finder/text-editor-launch.test.ts` so `V-UNIT` can execute on current shell contracts. Verify passed (`npm run typecheck`, `npm run lint` warning-only baseline, `npm run test:unit`, `npx vitest run tests/unit/ai/activeAgentRouting.test.ts tests/unit/ai/trustEventTaxonomy.test.ts tests/unit/ai/trustTelemetryDashboards.test.ts tests/unit/shell/url-state.test.ts`). |
| `WDU-011` | `D` | 4 | `P0` | `DONE` | `WDU-010` | Author and execute smoke checks for webchat deployment flow (bootstrap -> snippet copy -> config fetch -> message send) | smoke checklist docs + test helpers + any integration smoke harness | `V-WEBCHAT-SMOKE`; `V-DOCS` | Completed 2026-02-19: added smoke harness `tests/helpers/webchat-deployment-smoke.ts`, added flow smoke suite `tests/unit/shell/webchat-deployment-flow.smoke.test.ts`, and documented execution playbook in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/SMOKE_CHECKLIST.md`. Verify run executed with profile command `bash -lc 'npm run typecheck && npm run lint && npm run test:unit'` (lint warning-only baseline) and `npm run docs:guard` passed. |
| `WDU-012` | `D` | 4 | `P1` | `DONE` | `WDU-011` | Final hardening and docs synchronization across queue, index, and master plan; closeout verification run | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/webchat-deployment-ui/*` | `V-TYPE`; `V-LINT`; `V-UNIT`; `V-DOCS` | Completed 2026-02-19: synchronized lane `D` status, verification evidence, and smoke artifacts across `TASK_QUEUE.md`, `MASTER_PLAN.md`, and `INDEX.md`. Closeout verify passed (`npm run typecheck`, `npm run lint` warning-only baseline, `npm run test:unit`, `npm run docs:guard`). |

---

## Current kickoff

- Active task: none.
- Next task to execute: none (lane `D` closed).
- Immediate objective: monitor post-closeout regressions; no promotable tasks remain in this workstream.
