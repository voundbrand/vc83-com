# Documentation Home

This is the entrypoint for product and architecture documentation.

Use this structure to avoid drift:
- active source-of-truth docs live in canonical folders
- archived notes stay in `docs/archive/`
- do not create new markdown files directly under `docs/` root

---

## Canonical Sources

- `docs/agentic_system/README.md`
- `docs/agentic_system/CANONICAL_DOCS_INDEX.md`
- `docs/agentic_system/DOC_STATUS_MATRIX.md`
- `docs/ai-endurance/INDEX.md`
- `docs/archive/README.md`

---

## Active Doc Zones

- `docs/agentic_system/` - architecture contracts and implementation plans
- `docs/ai-endurance/` - AI endurance strategy and execution plans
- `docs/ghl_integration_plus_memory/` - integration-specific supporting docs
- `docs/reference_docs/` - migrated supporting reference docs (from old root markdown files)

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
4. Run drift checks listed in `docs/agentic_system/CANONICAL_DOCS_INDEX.md`.
5. Root markdown paths are strict-allowlisted in `docs/.root-md-allowlist.txt`.
