# Product Rename to sevenlayers Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers`  
**Source request:** Build a clean, codebase-backed implementation plan from `docs/PRODUCT_RENAME_PLAN.md` notes, including queue/session docs and a manual `.docx` runbook for external changes.

---

## Purpose

This workstream is the queue-first execution layer for renaming the product identity from `l4yercak3` / `vc83` to `sevenlayers` safely across:

1. Next.js app metadata and user-facing UI,
2. Convex backend defaults and generated links,
3. OAuth/auth/payment callback contracts,
4. seed/template/translation content,
5. external service dashboards and DNS.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MASTER_PLAN.md`
- Index:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/INDEX.md`
- Manual runbook:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MANUAL_CHANGES_CHECKLIST.docx`

Source plan anchor:
- `/Users/foundbrand_001/Development/vc83-com/docs/PRODUCT_RENAME_PLAN.md`

---

## Current status

1. Reality scan completed and recorded (`PRN-001` done).
2. Rows `PRN-002`..`PRN-051` are now `BLOCKED` by one-of-one cutover row `LOC-003`.
3. Unfreeze requires explicit override from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/TASK_QUEUE.md` after `LOC-009` is `DONE`.

---

## Lane board

- [ ] Lane A: contract freeze
- [ ] Lane B: metadata/routing foundations
- [ ] Lane C: web UI rename sweep
- [ ] Lane D: backend defaults sweep
- [ ] Lane E: auth/callback/payment contracts
- [ ] Lane F: translation/seed sweep
- [ ] Lane G: verification and cutover
- [ ] Lane H: optional mobile identity migration

---

## Operating commands

- Docs policy check:
  `npm run docs:guard`
- Technical checks:
  `npm run typecheck && npm run build`
- Residual reference scan:
  `rg -n -i '(l4yercak3|vc83)' src convex public package.json .env*`
