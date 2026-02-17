# Documentation Home

This is the entrypoint for product and architecture documentation.

Use this structure to avoid drift:
- active source-of-truth docs live in canonical folders
- archived notes stay in `docs/archive/`
- root markdown is a curated allowlisted set only (`docs/.root-md-allowlist.txt`)
- do not create new markdown files directly under `docs/` root

---

## Canonical Sources

- `docs/platform/README.md`
- `docs/platform/CANONICAL_DOCS_INDEX.md`
- `docs/platform/CODEBASE_ATLAS.md`
- `docs/platform/DOC_STATUS_MATRIX.md`
- `docs/platform/DOC_CLEANUP_MATRIX.md`
- `docs/TREE.md`
- `docs/ai-endurance/INDEX.md`
- `docs/archive/README.md`

---

## Active Doc Zones

- `docs/platform/` - architecture contracts and implementation plans
- `docs/ai-endurance/` - AI endurance strategy and execution plans
- `docs/ghl_integration_plus_memory/` - integration-specific supporting docs
- `docs/bring_it_all_together/` - product/system planning docs (markdown-only)
- `docs/reference_docs/` - migrated supporting reference docs (from old root markdown files)

---

## Local Reference Projects

- `docs/reference_projects/` - code-heavy reference repos/prototypes kept local for study, not part of canonical product docs, and blocked by CI guard from commit paths

---

## Legacy And Archive Zones

- `docs/archive/` - immutable archived snapshots and legacy notes
- `docs/openclaw_idea/README.md` - pointer to canonical integration + archive
- `docs/layers/` - includes deprecation stubs for migrated canonical docs

---

## Maintenance Rules

1. Prefer editing canonical docs over creating new concept duplicates.
2. If a doc is superseded, move it to `docs/archive/` and add a pointer.
3. Keep links pointed to canonical docs only.
4. Run drift checks listed in `docs/platform/CANONICAL_DOCS_INDEX.md`.
5. Root markdown paths are strict-allowlisted in `docs/.root-md-allowlist.txt`.
6. Keep code reference repos/prototypes under `docs/reference_projects/` only.
7. Keep `docs/bring_it_all_together/` markdown-only; move non-md assets to `docs/reference_projects/bring_it_all_together_assets/`.
8. Prefer `docs/reference_docs/` (including `single_topic_folders/`) over creating new one-file top-level folders.
