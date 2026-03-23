# Shared CMS Package Implementation Plan

**Status:** Reality-checked on 2026-03-23  
**Workstream docs:** `/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md`, `/Users/foundbrand_001/Development/vc83-com/docs/prompts/MASTER_PLAN.md`

## Objective

Extract the inline editing system from `apps/guitarfingerstyle` into a reusable package, but do it against the code that actually exists in this repo:

- source UI comes from `apps/guitarfingerstyle`,
- persisted CMS data must live in the mother repo `objects` table,
- `apps/segelschule-altwarp` is the first real consumer,
- phase 1 is a staged implementation, not a one-shot multi-app rollout.

## Current state in this codebase

### Verified source implementation

These files exist and are the real extraction source:

- `apps/guitarfingerstyle/components/editor/EditableContent.tsx`
- `apps/guitarfingerstyle/components/editor/EditableImage.tsx`
- `apps/guitarfingerstyle/components/editor/EditableTextWithLinks.tsx`
- `apps/guitarfingerstyle/components/editor/LinkButtonEditor.tsx`
- `apps/guitarfingerstyle/components/providers/EditModeProvider.tsx`
- `apps/guitarfingerstyle/convex/content.ts`
- `apps/guitarfingerstyle/convex/images.ts`
- `apps/guitarfingerstyle/lib/types.ts`

### Verified mother-repo primitives

These files confirm the mother repo is close, but not ready yet:

- `convex/schemas/ontologySchemas.ts`
  - `objects.locale` exists
  - `by_org_type_name` exists
  - `by_org_type_locale_name` exists
- `convex/channels/router.ts`
  - `listObjectsByOrgTypeInternal` exists
  - `getObjectByIdInternal` exists
  - `insertObjectInternal` exists
  - `patchObjectInternal` exists
- `convex/http.ts`
  - platform auth HTTP endpoints already exist for sign-in/sign-out
- `convex/rbacHelpers.ts`
  - authenticated session + org membership checks already exist
- `convex/rbac.ts`
  - `edit_published_pages`, `publish_pages`, and media permissions already exist
- `apps/segelschule-altwarp/lib/server-convex.ts`
  - server-side `ConvexHttpClient` admin access already exists
- `apps/segelschule-altwarp/lib/language-context.tsx`
  - app-local locale state already exists with `de` / `en` / `nl` / `ch`
- `apps/segelschule-altwarp/app/page.tsx`
  - homepage sections are already composed in a way that fits a first CMS slice

### Verified constraints

1. The current generic object helpers do not yet support the full CMS contract.
   - no locale+name lookup helper,
   - no name-only lookup helper,
   - no page-prefix list helper,
   - no full `locale` / `value` / `description` update path for CMS content.
2. Upload helpers exist, but they are tied to other domains:
   - `convex/organizationMedia.ts`
   - `convex/projectFileSystem.ts`
3. `packages/` is not workspace-wired for source-package consumption.
   - `packages/sdk` is the only packaging precedent today.
4. A generic package-owned `ConvexDirectAdapter` is not realistic in phase 1.
   - `apps/guitarfingerstyle` and the mother repo have different generated Convex APIs.
5. “Zero setup” is not a real phase-1 goal.
   - each consumer still needs provider wiring, auth gating, org resolution, and bridge routes/actions.
6. Inline editing should use platform auth for editors, not public-site auth for visitors.
   - the site app should broker editor login,
   - the browser should never receive `CONVEX_DEPLOY_KEY` or `ORG_API_KEY`,
   - edit rights should come from platform RBAC, not from a client-side flag.

## Gaps

### Gap 1: mother-repo CMS contract is incomplete

Before extracting UI, add a CMS-focused Convex surface for:

- locale-aware text lookup by `organizationId + type + locale + name`,
- locale-agnostic lookup by `organizationId + type + name`,
- page-prefix listing for preloading,
- create/update operations that can write `locale`, `value`, `description`, `customProperties`, and status.

### Gap 2: no package scaffold exists

`packages/cms` does not exist yet.  
It needs the same kind of buildable boundary that `packages/sdk` already has:

- package manifest,
- `tsconfig.json`,
- build config,
- README,
- explicit exports.

### Gap 3: shared package needs a transport contract, not direct Convex ownership

The editable components are client components. They cannot safely call internal Convex functions from the browser.

Phase 1 package contract should therefore be:

- package owns hooks/components/provider,
- consumer app owns the actual transport implementation.

For `segelschule-altwarp`, that means app-owned CMS API routes or server actions backed by `ConvexHttpClient`.

### Editor auth model

Phase 1 should use the platform's existing user/session/RBAC system for editors.

Recommended flow:

1. Editor opens an app-local login surface on `segelschule-altwarp`.
2. The site posts credentials to the platform auth HTTP endpoint.
3. The platform returns a session-backed editor identity.
4. The site stores editor session state in a secure `HttpOnly` cookie.
5. Every `/api/cms/*` route validates that session and checks permissions before touching CMS content.

Required permission checks:

- `edit_published_pages` for inline text/content changes,
- `publish_pages` for publish/release actions,
- `media_library.upload` for image upload flows.

Do not use `ORG_API_KEY` or `CONVEX_DEPLOY_KEY` as the thing that decides whether a browser user may edit content.

### Gap 4: multi-app rollout is premature

The original idea listed `hub-gw`, `segelschule-altwarp`, `me-immo`, `one-of-one-landing`, and others as immediate targets.

That is not the right first move.  
The right first move is:

1. make the mother-repo contract real,
2. extract the package,
3. prove it in `segelschule-altwarp`,
4. then expand.

## Target state

### Mother repo

Add a dedicated CMS module, preferably a new file such as `convex/cmsOntology.ts` or `convex/cmsContent.ts`, instead of continuing to grow `convex/channels/router.ts`.

That module should expose:

- `getCmsObjectByLocaleName`
- `getCmsObjectByName`
- `listCmsObjectsByPageLocale`
- `upsertCmsText`
- `upsertCmsStructuredContent`
- `upsertCmsImage`
- `generateCmsUploadUrl`
- `getCmsFileUrl`
- `deleteCmsFile`

Working storage convention:

- text content:
  - `type: "cms_content"`
  - `subtype: "text"` or `subtype: "text_with_links"`
  - `locale` required
  - `name` formatted as a deterministic composite key such as `{page}_{section}_{key}`
- image content:
  - `type: "cms_content"`
  - `subtype: "image"`
  - `locale` optional
  - metadata stored in `customProperties`

### Shared package

Create `packages/cms/` with a buildable public surface:

```text
packages/cms/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── providers/
│   ├── types.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

The package should export:

- `CmsProvider`
- `useCms`
- `useCmsLocale`
- `useCmsContent`
- `useCmsImage`
- `EditableContent`
- `EditableText`
- `EditableHeading`
- `EditableParagraph`
- `EditableTextWithLinks`
- `EditableImage`
- `LocaleSwitcher`
- shared content/image/link types

### Consumer contract

Phase 1 package contract should be transport-driven:

```typescript
export interface CmsTransport {
  getContent(input: {
    page: string;
    section: string;
    key: string;
    locale: string;
    defaultLocale: string;
  }): Promise<{
    recordId: string | null;
    value: string | Record<string, unknown> | null;
    resolvedLocale: string | null;
  }>;

  saveContent(input: {
    recordId?: string;
    page: string;
    section: string;
    key: string;
    locale: string;
    subtype: "text" | "text_with_links";
    value?: string;
    customProperties?: Record<string, unknown>;
  }): Promise<{ recordId: string }>;

  getImage(input: {
    usage: string;
    locale?: string;
  }): Promise<{
    recordId: string | null;
    url: string | null;
    alt?: string;
    resolvedLocale: string | null;
  }>;

  uploadImage(input: {
    usage: string;
    file: File;
    alt?: string;
    locale?: string;
  }): Promise<{ recordId: string; url: string }>;

  deleteImage(input: {
    recordId: string;
  }): Promise<void>;
}
```

Do not put `ConvexHttpClient` or generated Convex API imports inside the shared package.
Do not put platform credentials or editor-session validation logic inside the shared package either.

## Implementation chunks

### Chunk 1: mother-repo CMS backend

Add a CMS-focused Convex module over `objects`.

Deliverables:

- locale-aware lookup,
- name-only lookup,
- page-prefix list,
- CMS create/update helpers,
- CMS storage helpers for image upload and file URL resolution.

Validation:

- `npx tsc -p convex/tsconfig.json --noEmit`
- `npm run typecheck`

### Chunk 2: package scaffold

Create `packages/cms` using the `packages/sdk` packaging pattern.

Deliverables:

- `package.json`,
- `tsconfig.json`,
- `tsup.config.ts`,
- README,
- base exports.

Validation:

- `npm --prefix packages/cms run typecheck`
- `npm --prefix packages/cms run build`

### Chunk 3: provider, hooks, and shared types

Implement package-owned state and hooks:

- edit mode,
- auth/can-edit gating,
- locale state,
- transport access,
- content/image fetch + save hooks.

Reality rule:

- locale comes from package context,
- but the actual display language of the app remains app-owned.

### Chunk 4: port editable text components

Port:

- `EditableContent`
- `EditableText`
- `EditableHeading`
- `EditableParagraph`
- `EditableTextWithLinks`
- `LinkButtonEditor`

Keep:

- click-to-edit,
- `contentEditable`,
- save-on-blur,
- visual missing/fallback indicators.

### Chunk 5: port editable image component

Port `EditableImage`, but keep phase 1 simpler than the original draft:

- images are locale-agnostic by default,
- locale-specific images are an additive override,
- image metadata lives in `customProperties`.

### Chunk 6: first real consumer in `segelschule-altwarp`

Create app-owned bridge code in `apps/segelschule-altwarp`:

- editor auth routes and cookie/session handling,
- local CMS API routes or server actions,
- provider wiring in layout,
- edit toggle and locale wiring that respects the existing `LanguageProvider`,
- one real page section using the shared package.

Recommended auth shape:

- `POST /api/editor/sign-in`
- `POST /api/editor/sign-out`
- `GET /api/editor/session`
- `/api/cms/*` routes that read the editor cookie, validate the platform session, and enforce RBAC before calling mother-repo CMS operations

Security rule:

- use platform auth for editors only,
- keep visitors anonymous,
- never expose admin credentials to the browser.

Recommended first slice:

- homepage hero title/subtitle,
- then about/process copy if the first slice lands cleanly.

Do not try to replace all `segelschule-altwarp` content in the first pass.

## Validation

Run these commands before calling the first vertical slice complete:

```bash
npm run test:unit -- tests/unit/cms
npm run docs:guard
npx tsc -p convex/tsconfig.json --noEmit
npm --prefix packages/cms run typecheck
npm --prefix packages/cms run build
npm --prefix apps/segelschule-altwarp run typecheck
npm --prefix apps/segelschule-altwarp run build
```

## Phase 5 rollout notes

CMSPKG-010 closes the first phase by proving the package and app-owned bridge with focused tests instead of a large speculative matrix.

Validation added:

- `tests/unit/cms/cmsBridge.test.ts`
- `tests/unit/cms/segelschuleCmsTransport.test.ts`
- `tests/unit/cms/cmsPackageHooks.test.ts`

What remains app-specific after phase 1:

- editor session routes under `/api/editor/*`,
- CMS bridge routes or server actions under `/api/cms/*`,
- org resolution and server-side Convex credentials,
- locale wiring back to the app's existing language state,
- rollout sequencing for each consumer app.

Future-consumer order in this repo should stay pragmatic:

1. `one-of-one-landing` is the next reasonable marketing-site candidate.
2. `hub-gw` is a later follow-on because authenticated marketplace state increases rollout risk.
3. `me-immo` is blocked until it becomes a runnable app, not just an asset workspace.

## Risks and mitigations

### Risk: package couples to one Convex app

Mitigation:
- keep the package transport-agnostic,
- keep app-specific bridge code in the consumer app.

### Risk: editing access is accidentally tied to deploy/admin credentials

Mitigation:
- use platform user sessions for editor identity,
- keep `CONVEX_DEPLOY_KEY` server-only,
- enforce `edit_published_pages` / `publish_pages` / `media_library.upload` on app-local CMS routes.

### Risk: generic object helpers become a CMS dumping ground

Mitigation:
- add a dedicated CMS Convex module.

### Risk: rollout expands too fast

Mitigation:
- ship `segelschule-altwarp` first,
- treat other apps as follow-on consumers after the contract is stable.

### Risk: “zero setup” drives bad abstractions

Mitigation:
- define phase-1 success as “low setup, explicit setup,” not zero setup.

## Exit criteria

- [x] Mother repo has a real CMS backend surface over `objects`
- [x] `packages/cms` exists and builds cleanly
- [x] Shared package does not import app-specific generated Convex APIs
- [x] Editable text components are extracted and locale-aware
- [x] Editable image flow is extracted and works with mother-repo storage
- [x] `segelschule-altwarp` has one real end-to-end editable section behind the shared package
- [x] `segelschule-altwarp` editor login uses platform auth sessions and RBAC, not browser-exposed admin/org keys
- [x] All validation commands pass

## Recommended next task

Select the second consumer using the rollout notes in `/Users/foundbrand_001/Development/vc83-com/docs/prompts/MASTER_PLAN.md` instead of widening the shared package surface first.
