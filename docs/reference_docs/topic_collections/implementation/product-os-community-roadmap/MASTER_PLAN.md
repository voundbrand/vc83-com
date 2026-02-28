# Product OS Community + Roadmap Master Plan

**Date:** 2026-02-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-os-community-roadmap`  
**Scope:** Turn the current roadmap mock into a real upvoted roadmap, add a community system inspired by PostHog-style information architecture, and unify docs/community contribution loops.

---

## Mission

Build one coherent product loop:

1. Users discover planned work in a real roadmap.
2. Users vote and discuss features in-context.
3. Community surfaces (news + forums + events/jobs/places) capture demand and support.
4. Docs pages route users into community questions and roadmap requests without losing context.

The result should make roadmap prioritization and community engagement first-class product behavior, not static placeholders.

---

## Pause decision (2026-02-25)

1. This stream is now non-core relative to the one-primary-operator cutover.
2. Queue rows `ACR-001`..`ACR-027` are set to `BLOCKED` by `LOC-003`.
3. Unfreeze requires explicit override from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md` after `LOC-009` is `DONE`.

---

## Non-goals

- No attempt to clone PostHog visual assets or copy.
- No migration of unrelated app domains outside roadmap/community/docs surfaces.
- No schema-breaking changes to existing trust artifacts or unrelated AI lifecycle contracts.
- No release without moderation controls and abuse protections.

---

## Current baseline in this codebase

| Surface | Current state | Gap to target |
|---|---|---|
| Product roadmap surface | `src/components/window-content/all-apps-window.tsx` renders a static mock table with placeholder vote button handlers and “planned” copy. | Must become live data with real votes, filters, detail pages, and discussion links. |
| Product menu roadmap entry | `src/app/page.tsx` already routes `Roadmap` to `openAllAppsWindow("roadmap")`. | Needs to open an interactive roadmap state that reflects user actions immediately. |
| Feedback collection | `src/components/window-content/feedback-window.tsx` + `convex/feedback.ts` capture feature requests as generic feedback records + email alert. | Feature requests need structured roadmap item creation and voting lifecycle, not isolated messages. |
| Docs window | `src/components/window-content/tutorials-docs-window.tsx` exists; `layer-docs` is still mostly mock. | Docs IA must connect to community and roadmap actions with context handoff. |
| Community surface | No dedicated community menu or production forums/news windows exist yet. | Add navigable community hub and forum workflows from top nav and shell registry. |

---

## Target experience contract

### 1) Top navigation information architecture

Desktop and mobile shell should expose deterministic navigation groups:

- `Product OS`
- `Docs`
- `Community`
- `Company`
- `More`

Contract rules:

1. Menu IDs and launch actions are deterministic and testable.
2. Desktop opens windowed surfaces where applicable.
3. Mobile uses full-screen overlays for the same destinations when windowing is not practical.
4. Each menu destination resolves to either a concrete route or a concrete window ID, never ambiguous hybrids.

### 2) Real roadmap product behavior

Roadmap entries become first-class entities with:

- status (`proposed`, `planned`, `in_progress`, `beta`, `shipped`, `declined`),
- owner/team attribution,
- vote counts and per-user vote state,
- detail panel with linked forum discussion and docs references,
- creator + created/updated timestamps.

### 3) Community hub behavior

Community menu entries launch a shared ecosystem:

- Community Home (news digest + latest questions + spotlight)
- Forums (questions, replies, filtering, activity ranking)
- Events
- Jobs
- Places

Initial implementation can ship Events/Jobs/Places as lightweight list/placeholder surfaces backed by stable contracts and deep-link wiring.

### 4) Docs-community loop

Docs experience must support bidirectional routing:

- “Ask community question” from docs context.
- “Request roadmap item” from docs context.
- Roadmap items link back to relevant docs pages and community threads.

---

## Canonical data contracts (lane A freeze target)

### Roadmap entities

- `roadmap_item`
  - `id`, `slug`, `organizationId`, `title`, `summary`, `details`
  - `status`, `team`, `priority`, `ownerUserId`
  - `voteCount`, `commentCount`
  - `linkedDocs` (`string[]`), `linkedThreads` (`string[]`)
  - `createdBy`, `createdAt`, `updatedAt`
- `roadmap_vote`
  - unique key: `roadmapItemId + userId`
  - `organizationId`, `createdAt`
- `roadmap_comment`
  - `roadmapItemId`, `userId`, `body`, `createdAt`, `updatedAt`, `status`

### Community entities

- `community_thread`
  - `id`, `organizationId`, `title`, `category`, `tags`, `status`
  - `authorUserId`, `lastActivityAt`, `replyCount`, `viewCount`
- `community_post`
  - `threadId`, `authorUserId`, `body`, `isAcceptedAnswer`, `createdAt`, `updatedAt`
- `community_digest_item`
  - `kind` (`news`, `thread`, `roadmap`, `event`, `job`, `place`)
  - `sourceId`, `score`, `publishedAt`, `metadata`

Implementation may use existing `objects` patterns, but external behavior must match these contracts.

---

## Moderation action matrix (lane A freeze target)

| Role | Roadmap actions | Forum actions | Moderation actions |
|---|---|---|---|
| `member` | create item, vote/unvote, comment own items | create thread, reply, edit own posts | report content |
| `moderator` | all member actions | all member actions | hide/unhide, lock/unlock, mark duplicates, apply tags |
| `admin` | all moderator actions | all moderator actions | delete content, restore content, suspend members, override status |

Every moderation action must create an audit event with actor ID, item ID, action type, timestamp, and reason.

---

## Delivery plan by lane

| Lane | Outcome | Queue rows |
|---|---|---|
| `A` | Contract freeze for UX/data/moderation | `ACR-001`..`ACR-004` |
| `B` | Backend APIs and ranking contracts | `ACR-005`..`ACR-008` |
| `C` | Interactive roadmap UX with real votes/submissions | `ACR-009`..`ACR-012` |
| `D` | Community navigation + hub + forums | `ACR-013`..`ACR-016` |
| `E` | Docs convergence and contextual handoffs | `ACR-017`..`ACR-019` |
| `F` | Moderation/abuse controls and ops workflows | `ACR-020`..`ACR-022` |
| `G` | Telemetry, rollout flags, KPI gates | `ACR-023`..`ACR-025` |
| `H` | Hardening, verification, and launch closeout | `ACR-026`..`ACR-027` |

---

## Success criteria

1. Roadmap view is live, sortable/filterable, and supports real vote mutations.
2. Feature requests submitted through UI become structured roadmap items.
3. Community menu launches operational Community Home and Forums surfaces.
4. Docs pages can open forum and roadmap flows with prefilled context.
5. Moderation matrix is enforceable with audit trails.
6. Rollout gates have deterministic pass/fail thresholds and a rollback path.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Vote race conditions inflate counts | Incorrect prioritization signals | Idempotent vote mutation + unique constraints + optimistic rollback |
| Nav sprawl creates inconsistent desktop/mobile behavior | Confusing IA and regressions | Lane `A` contract freeze with explicit route/window mapping table |
| Community spam or abuse at launch | Trust and quality degradation | Lane `F` rate limits + moderation queue + audit logs |
| Docs-community links drift over time | Broken workflow loops | Link contracts in lane `E` + e2e checks in lane `H` |
| Cross-lane merge conflicts in shell/menu files | Slowdown and regressions | Strict lane ownership and deterministic dependency gating |

---

## Verification strategy

For each queue row, run the row-level Verify commands from `TASK_QUEUE.md` exactly.

Minimum closeout stack (lane `H`):

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run i18n:audit`
5. `npm run test:e2e:desktop`
6. `npm run test:e2e:mobile`
7. `npm run docs:guard`

---

## Immediate next step

No execution while paused. Wait for a cutover override token before promoting any `ACR-*` row.
