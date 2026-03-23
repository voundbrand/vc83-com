# Shared CMS Package Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/prompts`  
**Source request:** Make the shared CMS package plan real, not speculative, and either one-shot it or stage it into an implementation plan.

---

## Purpose

Queue-first execution layer for extracting the inline CMS from `apps/guitarfingerstyle` into a reusable package that can be consumed by `apps/segelschule-altwarp` first and then expanded to other site apps.

This workstream exists to prevent a bad implementation pattern:

- assuming the mother repo already has CMS-grade object CRUD,
- assuming a shared package can import multiple generated Convex APIs,
- assuming editable client components can call internal Convex functions directly,
- assuming `packages/cms` is already wired into the monorepo.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/prompts/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/prompts/MASTER_PLAN.md`
- Reality-checked source plan: `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_SHARED_CMS_PACKAGE.md`
- Index: `/Users/foundbrand_001/Development/vc83-com/docs/prompts/INDEX.md`

---

## Current state snapshot

- Source extraction app exists:
  - `apps/guitarfingerstyle/components/editor/EditableContent.tsx`
  - `apps/guitarfingerstyle/components/editor/EditableImage.tsx`
  - `apps/guitarfingerstyle/components/editor/EditableTextWithLinks.tsx`
  - `apps/guitarfingerstyle/components/providers/EditModeProvider.tsx`
- Mother-repo storage target exists:
  - `convex/schemas/ontologySchemas.ts` includes `objects.locale`, `by_org_type_name`, and `by_org_type_locale_name`.
- Mother-repo generic object helpers exist but are incomplete for CMS:
  - `convex/channels/router.ts` has `listObjectsByOrgTypeInternal`, `getObjectByIdInternal`, `insertObjectInternal`, and `patchObjectInternal`.
- Mother-repo CMS contract now exists for shared package work:
  - `convex/cmsContent.ts` provides internal `cms_content` lookups, upserts, upload URL generation, file URL resolution, and soft-delete semantics.
- Focused validation now exists for the shared package and the first consumer bridge:
  - `tests/unit/cms/cmsBridge.test.ts`
  - `tests/unit/cms/segelschuleCmsTransport.test.ts`
  - `tests/unit/cms/cmsPackageHooks.test.ts`
- Platform auth/RBAC already exists for editor identity and permissions:
  - `convex/http.ts` auth routes
  - `convex/rbacHelpers.ts`
  - `convex/rbac.ts`
- Upload helpers exist elsewhere, but not as a CMS-specific contract:
  - `convex/organizationMedia.ts`
  - `convex/projectFileSystem.ts`
- Package pattern exists only as precedent:
  - `packages/sdk/*`
- First target consumer already has a server-side mother-repo bridge plus app-local locale state:
  - `apps/segelschule-altwarp/lib/server-convex.ts`
  - `apps/segelschule-altwarp/lib/language-context.tsx`

---

## Status

- Workstream initialized.
- Reality audit completed (`CMSPKG-001`).
- Mother-repo CMS contract completed and verified (`CMSPKG-002`, `CMSPKG-003`).
- Lane B package extraction is materially complete through `CMSPKG-007`.
- `packages/cms` now ships a real scaffold, provider/hooks contract, text editing components, and image editing component.
- `segelschule-altwarp` now has app-owned editor/CMS bridge routes plus one real package-backed About section behind a safe flag (`CMSPKG-008`, `CMSPKG-009`).
- `CMSPKG-010` is complete with focused CMS validation coverage, rollout notes, and a repo-specific future-consumer checklist.
- No active task remains in this workstream.
- Recommended delivery strategy remains staged, not one-shot.

Reason:
- there is real source code to extract,
- but follow-on consumers still need explicit bridge/auth/org wiring even though the backend contract, package plumbing, and first app bridge now exist.

---

## Lane progress board

- [x] Lane A audit (`CMSPKG-001`)
- [x] Lane A backend contract (`CMSPKG-002`..`CMSPKG-003`)
- [x] Lane B package extraction (`CMSPKG-004`..`CMSPKG-007`)
- [x] Lane C first consumer integration (`CMSPKG-008`..`CMSPKG-009`)
- [x] Lane D validation and rollout (`CMSPKG-010`)

## Rollout outlook

- `one-of-one-landing` is the next realistic follow-on consumer because it already has a real app shell plus `lib/server-convex.ts`, but it still needs app-local editor routes and a decision on whether the first slice lives in the App Router or legacy `pages/` surface.
- `hub-gw` should stay behind the marketing sites because it combines authenticated UI, marketplace data, and broader product state; it should reuse the same site-owned editor/CMS bridge model instead of embedding package auth.
- `me-immo` is not a current rollout target because the repo only contains workspace assets and a README there, not a runnable Next app shell.

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md`
- Mother-repo Convex typecheck: `npx tsc -p convex/tsconfig.json --noEmit`
- Focused CMS tests: `npm run test:unit -- tests/unit/cms`
- `segelschule-altwarp` typecheck: `npm --prefix apps/segelschule-altwarp run typecheck`
- Future package typecheck: `npm --prefix packages/cms run typecheck`
- Future package build: `npm --prefix packages/cms run build`
