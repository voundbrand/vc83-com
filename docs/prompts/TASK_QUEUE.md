# Shared CMS Package Task Queue

**Last updated:** 2026-03-23  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/prompts`  
**Source request:** Reality-check and stage implementation of `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_SHARED_CMS_PACKAGE.md`.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane policy explicitly allows concurrency.
3. Promote from `PENDING` to `READY` only after all dependencies are satisfied.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. If a task is `BLOCKED`, record the blocker and fallback in `Notes`.
6. Each task must run every command listed in `Verify` before moving to `DONE`.
7. Keep lane boundaries strict to minimize merge overlap.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` at each lane milestone.
9. Dependency token rules:
   - `ID`: dependency must be `DONE`.
   - `ID@READY`: dependency must be `READY` or `DONE`.
   - `ID@DONE_GATE`: task may start but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-CONVEX-TYPE` | `npx tsc -p convex/tsconfig.json --noEmit` |
| `V-ROOT-TYPE` | `npm run typecheck` |
| `V-SSA-TYPE` | `npm --prefix apps/segelschule-altwarp run typecheck` |
| `V-SSA-BUILD` | `npm --prefix apps/segelschule-altwarp run build` |
| `V-PKG-TYPE` | `npm --prefix packages/cms run typecheck` |
| `V-PKG-BUILD` | `npm --prefix packages/cms run build` |
| `V-UNIT-CMS` | `npm run test:unit -- tests/unit/cms` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Mother-repo CMS data and storage contract | `convex/*` | No package extraction before lane `A` `P0` rows are `DONE` |
| `B` | Shared package scaffold, provider, hooks, editable UI | `packages/cms/*`; source extraction from `apps/guitarfingerstyle/*` | Limit edits to package files plus direct source references |
| `C` | `segelschule-altwarp` bridge and first consumer integration | `apps/segelschule-altwarp/*` | Start after lane `A` and lane `B` `P0` rows are `DONE` |
| `D` | Validation, tests, rollout notes, next-consumer checklist | docs + tests | Start after lane `C` `P0` rows are `DONE` |

---

## Dependency-based status flow

1. Complete lane `A` first to establish a real CMS backend contract over the `objects` table.
2. Start lane `B` only after `CMSPKG-002` and `CMSPKG-003` are `DONE`.
3. Start lane `C` only after `CMSPKG-004`, `CMSPKG-005`, and `CMSPKG-006` are `DONE`.
4. `CMSPKG-009` cannot move to `DONE` until `CMSPKG-007` is `DONE`.
5. Finish with lane `D` for validation and rollout evidence.

---

## Reality alignment checkpoint

1. `apps/guitarfingerstyle` is present and usable as the source extraction app.
2. The mother repo already has the `objects` table indexes needed for CMS lookup, including `by_org_type_name` and `by_org_type_locale_name`.
3. The mother repo does not yet expose the exact CMS read/write primitives the original prompt assumed:
   - no locale+name lookup helper,
   - no locale-agnostic name lookup helper,
   - no page-prefix list helper,
   - current `insertObjectInternal` and `patchObjectInternal` do not support the full `locale` / `value` / `description` update path required for CMS content.
4. Upload URL helpers exist elsewhere, but they are tied to session/RBAC models for media libraries and project files; a focused CMS storage surface still needs to be added.
5. `packages/` exists but is not workspace-wired; only `packages/sdk` currently provides a packaging/build pattern.
6. `apps/segelschule-altwarp` already has a server-side mother-repo bridge (`lib/server-convex.ts`) plus a lightweight marketing-site structure and its own `LanguageProvider`, making it a better first vertical slice than `hub-gw`.
7. The platform already has session-based auth and RBAC checks that fit editor-only CMS access; the first consumer should reuse that instead of inventing separate browser-side auth.
8. Client-side editable components still cannot safely call internal Convex functions directly from the browser, so the first consumer needs app-owned bridge routes or server actions.
9. A generic package-owned `ConvexDirectAdapter` is not realistic for phase 1 because the generated Convex APIs are app-specific (`apps/guitarfingerstyle/convex/_generated/api` vs root `convex/_generated/api`).

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `CMSPKG-001` | `A` | 1 | `P0` | `DONE` | - | Audit the existing prompt against the real extraction source, mother-repo backend, package tooling, and first consumer constraints | `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_SHARED_CMS_PACKAGE.md`; `apps/guitarfingerstyle/components/editor/EditableContent.tsx`; `apps/guitarfingerstyle/components/editor/EditableImage.tsx`; `apps/guitarfingerstyle/components/editor/EditableTextWithLinks.tsx`; `apps/guitarfingerstyle/components/providers/EditModeProvider.tsx`; `convex/channels/router.ts`; `convex/schemas/ontologySchemas.ts`; `apps/segelschule-altwarp/lib/server-convex.ts`; `apps/segelschule-altwarp/lib/language-context.tsx`; `apps/segelschule-altwarp/app/page.tsx` | `V-DOCS` | Done 2026-03-23. Outcome: extraction source exists, but the backend CRUD surface and package plumbing are incomplete. Follow-up consumer review shows `segelschule-altwarp` is the better first slice because it already has a lightweight server bridge and locale state without `hub-gw`'s marketplace/auth complexity. |
| `CMSPKG-002` | `A` | 1 | `P0` | `DONE` | `CMSPKG-001` | Add a dedicated CMS backend surface over the `objects` table: locale+name lookup, name-only lookup, page-prefix listing, and richer create/update semantics for `cms_content` records | `convex/cmsContent.ts`; `convex/schemas/ontologySchemas.ts` | `V-CONVEX-TYPE`; `V-ROOT-TYPE` | Done 2026-03-23. Added internal CMS read/write functions in `convex/cmsContent.ts`: `getCmsObjectByLocaleName`, `getCmsObjectByName`, `listCmsObjectsByPageLocale`, `upsertCmsText`, and `upsertCmsStructuredContent`. Contract stays explicit to `cms_content` and uses `by_org_type_name` / `by_org_type_locale_name` instead of extending `channels/router.ts`. |
| `CMSPKG-003` | `A` | 1 | `P0` | `DONE` | `CMSPKG-002` | Add CMS storage helpers for image upload, file URL resolution, and delete semantics, plus a consistent metadata contract for image objects stored in `customProperties` | `convex/cmsContent.ts` | `V-CONVEX-TYPE`; `V-ROOT-TYPE` | Done 2026-03-23. Added `generateCmsUploadUrl`, `upsertCmsImage`, `getCmsFileUrl`, and `deleteCmsFile` with session-backed RBAC (`edit_published_pages`, `publish_pages`, `media_library.upload`). Image metadata now follows `cms_image_v1` in `customProperties`, with locale-agnostic images by default. |
| `CMSPKG-004` | `B` | 2 | `P0` | `DONE` | `CMSPKG-002`, `CMSPKG-003` | Scaffold `packages/cms` as a buildable local package using the `packages/sdk` pattern, with explicit exports, README, and build/typecheck scripts | `packages/cms/package.json`; `packages/cms/tsconfig.json`; `packages/cms/README.md`; `packages/cms/tsup.config.ts` | `V-PKG-TYPE`; `V-PKG-BUILD` | Done 2026-03-23. `packages/cms` now follows the `packages/sdk` build boundary and passes `npm --prefix packages/cms run typecheck` plus `npm --prefix packages/cms run build`. |
| `CMSPKG-005` | `B` | 2 | `P0` | `DONE` | `CMSPKG-004` | Define the package contract: shared types, client-side transport interface, `CmsProvider`, locale state, edit-mode state, and data hooks | `packages/cms/src/types.ts`; `packages/cms/src/providers/CmsProvider.tsx`; `packages/cms/src/hooks/*`; `packages/cms/src/index.ts` | `V-PKG-TYPE`; `V-PKG-BUILD` | Done 2026-03-23. Added transport-agnostic package types, locale/edit-mode state in `CmsProvider`, and transport-backed hooks: `useCmsLocale`, `useCmsEditMode`, `useCmsContent`, and `useCmsImage`. |
| `CMSPKG-006` | `B` | 2 | `P0` | `DONE` | `CMSPKG-005` | Port text editing UI from `guitarfingerstyle`: `EditableContent`, `EditableHeading`, `EditableParagraph`, `EditableTextWithLinks`, `LinkButtonEditor`, and locale fallback indicators | `packages/cms/src/components/*`; `apps/guitarfingerstyle/components/editor/*` | `V-PKG-TYPE`; `V-PKG-BUILD` | Done 2026-03-23. Ported the text editing surface into `packages/cms` with package-local components and locale fallback badges, keeping the UI transport-driven instead of depending on app-specific Convex hooks. |
| `CMSPKG-007` | `B` | 2 | `P1` | `DONE` | `CMSPKG-005`, `CMSPKG-003` | Port `EditableImage` with upload/delete flows and locale-agnostic image fallback behavior | `packages/cms/src/components/EditableImage.tsx`; `apps/guitarfingerstyle/components/editor/EditableImage.tsx` | `V-PKG-TYPE`; `V-PKG-BUILD` | Done 2026-03-23. Added `EditableImage` on top of `useCmsImage`, with upload/delete flows and locale-agnostic image behavior by default. |
| `CMSPKG-008` | `C` | 3 | `P0` | `DONE` | `CMSPKG-002`, `CMSPKG-003`, `CMSPKG-004` | Add the `segelschule-altwarp` bridge layer that talks to the mother repo via `ConvexHttpClient` admin auth, exposes app-local CMS endpoints/actions for the package, and brokers editor login through platform auth sessions | `apps/segelschule-altwarp/lib/server-convex.ts`; new `apps/segelschule-altwarp/app/api/editor/*`; new `apps/segelschule-altwarp/app/api/cms/*`; `apps/segelschule-altwarp/lib/*`; `convex/rbacHelpers.ts` | `V-SSA-TYPE`; `V-SSA-BUILD` | Done 2026-03-23. Added app-owned `/api/editor/sign-in`, `/api/editor/sign-out`, `/api/editor/session`, `/api/cms/content`, and `/api/cms/image` routes plus editor-cookie/session helpers in `apps/segelschule-altwarp/lib/cms-editor.ts`. The bridge now resolves site-org permissions server-side and keeps Convex admin/org credentials out of the browser. |
| `CMSPKG-009` | `C` | 3 | `P0` | `DONE` | `CMSPKG-006`, `CMSPKG-008`, `CMSPKG-007@DONE_GATE` | Integrate the package into a single `segelschule-altwarp` vertical slice: provider wiring in layout, edit toggle gated by validated editor session, locale toggle aligned to `LanguageProvider`, and one real editable homepage section behind a safe flag | `apps/segelschule-altwarp/app/layout.tsx`; `apps/segelschule-altwarp/app/page.tsx`; `apps/segelschule-altwarp/lib/language-context.tsx`; selected `apps/segelschule-altwarp/components/*`; `apps/segelschule-altwarp/lib/cms-transport.ts`; `apps/segelschule-altwarp/components/cms-site-provider.tsx` | `V-SSA-TYPE`; `V-SSA-BUILD` | Done 2026-03-23. Wired `packages/cms` into `segelschule-altwarp` with an app-local transport, language-to-CMS locale bridge, editor controls behind `NEXT_PUBLIC_CMS_EDITOR_ENABLED`, and one real homepage About section using `EditableHeading`, `EditableParagraph`, and `EditableImage`. |
| `CMSPKG-010` | `D` | 4 | `P1` | `DONE` | `CMSPKG-009` | Add validation coverage, rollout notes, and a checklist for future consumers (`hub-gw`, `one-of-one-landing`, `me-immo`) | `tests/unit/cms/*`; `/Users/foundbrand_001/Development/vc83-com/docs/prompts/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/prompts/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_SHARED_CMS_PACKAGE.md` | `V-UNIT-CMS`; `V-DOCS`; `V-SSA-BUILD`; `V-PKG-BUILD` | Done 2026-03-23. Added focused validation at `tests/unit/cms/cmsBridge.test.ts`, `tests/unit/cms/segelschuleCmsTransport.test.ts`, and `tests/unit/cms/cmsPackageHooks.test.ts`. Rollout docs now capture what stays app-owned after phase 1 plus repo-specific follow-on guidance: `one-of-one-landing` is the next realistic marketing-site candidate, `hub-gw` remains a later consumer because of authenticated marketplace complexity, and `me-immo` is blocked until it has a runnable app shell. |

---

## Current kickoff

- No promotable tasks remain in this workstream.
- Latest completed task: `CMSPKG-010`.
- If rollout continues, use the future-consumer checklist in `/Users/foundbrand_001/Development/vc83-com/docs/prompts/MASTER_PLAN.md` before opening a second-consumer lane.
