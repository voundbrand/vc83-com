# Shared CMS Package Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/prompts`

Use one prompt per lane/worktree.

Always read first:

- `/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/prompts/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/prompts/INDEX.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_SHARED_CMS_PACKAGE.md`
- `apps/guitarfingerstyle/components/editor/EditableContent.tsx`
- `apps/guitarfingerstyle/components/editor/EditableImage.tsx`
- `apps/guitarfingerstyle/components/editor/EditableTextWithLinks.tsx`
- `convex/channels/router.ts`
- `convex/schemas/ontologySchemas.ts`
- `apps/segelschule-altwarp/lib/server-convex.ts`
- `apps/segelschule-altwarp/lib/language-context.tsx`
- `apps/segelschule-altwarp/app/page.tsx`

---

## Session A (Lane A: mother-repo CMS contract)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane A tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md

Scope:
- CMSPKG-002..CMSPKG-003

Rules:
1) Build the mother-repo CMS data surface first.
2) Keep `cms_content` semantics explicit instead of hiding them inside generic channel-router helpers.
3) Support locale-aware text reads/writes and locale-agnostic image reads/writes.
4) Do not assume existing object insert/patch helpers are sufficient; extend or replace them deliberately.
5) Run Verify commands exactly as listed.
6) Update Notes in TASK_QUEUE.md with any contract decisions.

Stop when Lane A has no promotable tasks.
```

---

## Session B (Lane B: shared package extraction)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane B tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md

Scope:
- CMSPKG-004..CMSPKG-007

Rules:
1) Follow the packaging/build pattern used by `packages/sdk`.
2) Keep the package transport-agnostic; do not import app-specific generated Convex APIs.
3) Preserve the editing UX from `apps/guitarfingerstyle` where possible.
4) Keep locale state in package context, not as repeated component props.
5) Run Verify commands exactly.

Stop when Lane B has no promotable tasks.
```

---

## Session C (Lane C: segelschule-altwarp bridge and first consumer)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane C tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md

Scope:
- CMSPKG-008..CMSPKG-009

Rules:
1) Keep all mother-repo access in app-owned bridge code inside `apps/segelschule-altwarp`.
2) Do not let browser-side package code call internal Convex functions directly.
3) Start with one real vertical slice instead of broad app-wide replacement.
4) Use platform auth for editors: add site-owned editor login/session routes and enforce RBAC on every CMS route. Never expose admin or org keys to the browser.
5) Align the first slice with the app's existing `LanguageProvider` and homepage composition before introducing separate CMS-only locale controls.
6) Run Verify commands exactly.

Stop when Lane C has no promotable tasks.
```

---

## Session D (Lane D: validation and rollout)

```text
You are Codex in /Users/foundbrand_001/Development/vc83-com.
Execute only Lane D tasks from:
/Users/foundbrand_001/Development/vc83-com/docs/prompts/TASK_QUEUE.md

Scope:
- CMSPKG-010

Rules:
1) Add tests before calling the package path reusable.
2) Keep rollout guidance specific to actual consumers in this repo.
3) Document what remains app-specific after phase 1.
4) Run Verify commands exactly and sync the workstream docs.

Stop when Lane D has no promotable tasks.
```

## Lane completion snapshot

- `CMSPKG-010` completed on 2026-03-23 with focused tests in `tests/unit/cms/*` plus rollout guidance updates in `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, and `PROMPT_SHARED_CMS_PACKAGE.md`.
