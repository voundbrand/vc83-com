# Finder + Text Editor Workstream Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream`  
**Source request:** Finder VSCode-like new-file flow + standalone text editor app (2026-02-17)

---

## Purpose

Queue-first execution layer for Finder file creation and Text Editor app convergence.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/INDEX.md`

---

## Status

Current kickoff:

1. `FTE-001` (`IN_PROGRESS`): shared file-type registry for common text formats + deterministic fallback.

Queued next:

1. `FTE-002`: route tab/editor selection through registry.
2. `FTE-003`: VSCode-like Finder `New File` modal flow.
3. `FTE-005`: standalone Text Editor app surface.

---

## Lane progress board

- [ ] Lane A (`FTE-001`..`FTE-002`)
- [ ] Lane B (`FTE-003`..`FTE-004`)
- [ ] Lane C (`FTE-005`..`FTE-007`)
- [ ] Lane D (`FTE-008`..`FTE-009`)
- [ ] Lane E (`FTE-010`..`FTE-012`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Read queue: `cat /Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/finder-editor-workstream/TASK_QUEUE.md`
- Run Finder-focused tests: `npx vitest run tests/unit/finder`
