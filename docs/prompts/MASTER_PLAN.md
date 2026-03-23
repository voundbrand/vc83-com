# Shared CMS Package Master Plan

**Date:** 2026-03-23  
**Scope:** Extract the inline editing system from `apps/guitarfingerstyle` into a reusable package, backed by the mother repo `objects` table, with `apps/segelschule-altwarp` as the first real consumer.

---

## Mission

Ship a reusable CMS package that preserves the editing UX already proven in `apps/guitarfingerstyle`, while storing content in the mother repo’s polymorphic `objects` table instead of the standalone `contentBlocks` and `images` tables.

The first success condition is not “all apps now have zero-setup CMS.”  
The first success condition is:

1. a real mother-repo CMS backend contract,
2. a buildable shared package,
3. one real consumer (`segelschule-altwarp`) wired end to end,
4. a clear checklist for follow-on apps.

---

## Verified current state in this codebase

### What already exists

1. `apps/guitarfingerstyle` contains the source implementation worth extracting.
2. The mother repo `objects` table already supports locale-aware indexing.
3. The mother repo now exposes a dedicated CMS contract in `convex/cmsContent.ts`.
4. The repo already has a packaging precedent in `packages/sdk`.
5. `segelschule-altwarp` already has server-side mother-repo access patterns through `apps/segelschule-altwarp/lib/server-convex.ts`.
6. `segelschule-altwarp` already has a local `LanguageProvider` and homepage section composition, which makes locale-aware CMS wiring more direct for a first slice.
7. The platform already has user sessions and RBAC permission checks that fit editor-only access.

### What still does not exist

1. No second consumer has been rolled out yet beyond `segelschule-altwarp`.
2. Future consumers still need app-local editor auth routes, CMS bridge endpoints, org resolution, and locale wiring.
3. The package still intentionally does not own a generic direct Convex adapter or package-owned auth layer.

---

## Reality-check decisions

### Decision 1: do not one-shot the entire package + backend + multi-app rollout

That scope crosses three different boundaries:

1. mother-repo Convex contract,
2. local package build and extraction,
3. consumer-app bridge and UI integration.

Trying to land all of that in one pass would create too much hidden coupling and too much unverified surface area.

### Decision 2: phase 1 package stays transport-agnostic

The shared package should not own a direct `ConvexHttpClient` or app-specific generated Convex API import.

Instead, the package should define a narrow transport interface:

- get content,
- save content,
- upload image,
- resolve image URL,
- delete image.

Each consumer app implements the transport with its own bridge code.

### Decision 3: `segelschule-altwarp` is the first consumer, not all site apps

`segelschule-altwarp` is the better first vertical slice because it already has:

- a mother-repo bridge in `lib/server-convex.ts`,
- app-local locale state in `lib/language-context.tsx`,
- a straightforward marketing-site homepage in `app/page.tsx`.

That is a cleaner proving ground than `hub-gw`, which adds marketplace and auth complexity.

Other site apps should be treated as follow-on consumers after the contract stabilizes.

### Decision 4: the package should follow the `packages/sdk` build model

The monorepo is not workspace-wired for source-package imports today.  
Phase 1 should therefore produce a buildable package with explicit exports and dist output, then consume that built package deliberately.

### Decision 5: use platform auth for editors, but keep it editor-only

Inline editing should be gated by platform user sessions and RBAC, not by public-site auth and not by browser-exposed org/admin keys.

That means:

- the shared package remains auth-agnostic,
- `segelschule-altwarp` owns editor login/logout/session endpoints,
- the site stores editor session state in a secure cookie,
- each site-owned CMS route validates session + org membership + permission before calling mother-repo CMS operations.

---

## Target state

### Mother repo

The mother repo exposes a dedicated CMS contract over `objects`:

- text content stored as `type: "cms_content"` with locale-aware lookup,
- structured content stored in `customProperties`,
- images stored as `type: "cms_content"`, `subtype: "image"`,
- upload URL, file URL, and delete helpers available for CMS flows.

### Shared package

`packages/cms` exposes:

- shared types,
- `CmsProvider`,
- locale/edit mode state,
- `EditableContent`,
- `EditableTextWithLinks`,
- `EditableImage`,
- `LocaleSwitcher`,
- low-level hooks built around a transport contract.

### First consumer

`apps/segelschule-altwarp` owns:

- editor auth bridge,
- app-local CMS bridge routes or server actions,
- organization resolution and transport/auth policy,
- provider wiring,
- one initial editable homepage slice behind a low-risk flag.

---

## Phase plan

| Phase | Outcome | Queue rows |
|---|---|---|
| Phase 1 | Reality audit and scoped queue | `CMSPKG-001` |
| Phase 2 | Mother-repo CMS data/storage contract | `CMSPKG-002`..`CMSPKG-003` |
| Phase 3 | Shared package scaffold and core UI extraction | `CMSPKG-004`..`CMSPKG-007` |
| Phase 4 | `segelschule-altwarp` bridge and first end-to-end vertical slice | `CMSPKG-008`..`CMSPKG-009` |
| Phase 5 | Validation, tests, rollout notes | `CMSPKG-010` |

---

## Acceptance criteria

1. CMS text content can be looked up by org + type + locale + name.
2. CMS images can be looked up by org + type + name, with locale override support optional.
3. `packages/cms` builds independently and exports a stable API.
4. The shared package does not import app-specific generated Convex APIs.
5. `segelschule-altwarp` can edit and persist at least one real page section end to end.
6. Locale fallback order works as: current locale -> default locale -> component fallback.
7. Editor login and edit actions are enforced through platform sessions + RBAC.
8. Validation commands pass for docs, backend typing, package typing/build, and `segelschule-altwarp`.

## Validation evidence

1. Focused CMS regression coverage now lives in `tests/unit/cms`:
   - `cmsBridge.test.ts` covers bridge-name building, payload serialization, and bridge record normalization.
   - `segelschuleCmsTransport.test.ts` covers the app-owned transport request contract for content/image reads, writes, upload payloads, and error propagation.
   - `cmsPackageHooks.test.ts` covers `CmsProvider`, locale/edit-mode state, `useCmsContent` save-refresh behavior, and `useCmsImage` upload/delete refresh semantics.
2. `segelschule-altwarp` build warnings from the flagged direct `<img>` usage and the unused booking summary variable were cleaned up during CMSPKG-010.

## Future consumer checklist

1. Keep `packages/cms` transport-agnostic. The consumer app owns `/api/editor/*` and `/api/cms/*` routes or equivalent server actions.
2. Reuse an existing app-local locale source before adding CMS-specific locale state. The package locale should mirror the app, not replace it.
3. Resolve the target organization server-side and keep `CONVEX_DEPLOY_KEY` / `ORG_API_KEY` out of the browser.
4. Gate every edit path with platform sessions plus the relevant RBAC checks: `edit_published_pages`, `publish_pages`, and `media_library.upload`.
5. Start with one real editable slice and one image flow before broad app replacement.
6. Run the full validation set before marking the consumer ready:
   - `npm run test:unit -- tests/unit/cms`
   - `npx tsc -p convex/tsconfig.json --noEmit`
   - `npm run typecheck`
   - `npm --prefix packages/cms run typecheck`
   - `npm --prefix packages/cms run build`
   - consumer-app build and post-build typecheck
   - `npm run docs:guard`

## Repo-specific rollout notes

1. `one-of-one-landing` is the best next consumer candidate because it already has a real Next app plus `lib/server-convex.ts`, but it mixes `app/` and `pages/`; choose one low-risk App Router slice instead of trying to CMS-enable the full site at once.
2. `hub-gw` should remain a later consumer because it is an authenticated product surface with existing marketplace and user-context complexity; reuse the site-owned bridge pattern from `segelschule-altwarp` instead of trying to let the package talk to Convex directly.
3. `me-immo` is blocked as a consumer until it has a runnable app shell. Today it only contains workspace assets and docs, so there is nothing meaningful to wire into `packages/cms` yet.

---

## Risks and mitigations

1. **Risk:** The original “zero setup” goal hides consumer-specific bridge work.
   Mitigation: make app bridge ownership explicit in the plan and package contract.

2. **Risk:** Generic object helpers get overloaded with CMS-specific semantics.
   Mitigation: prefer a dedicated CMS Convex module if it keeps contracts clearer.

3. **Risk:** A shared package accidentally couples to one Convex deployment’s generated API.
   Mitigation: keep the package transport-agnostic and let consumers implement the bridge.

4. **Risk:** Rolling the package into every app immediately creates too many integration branches.
   Mitigation: prove the path in `segelschule-altwarp` first, then expand.

5. **Risk:** Public visitors gain edit capability through a weak site-side toggle.
   Mitigation: require platform session validation plus explicit RBAC permission checks on every edit route.

---

## Current recommendation

`CMSPKG-010` is complete.  
If this workstream reopens, start with second-consumer selection using the checklist above instead of expanding the package surface first.
