# Docs Archive

Purpose:
- keep historical snapshots for traceability
- prevent legacy docs from being treated as active source-of-truth

---

## Current Archive Sets

- `docs/archive/legacy-layer-docs-2026-02-16/`
  - `AI_COMPOSITION_PLATFORM.md`
  - `LAYERS_PRD.md`
  - `02_MEMORY_ENGINE_DESIGN.md`
- `docs/archive/openclaw-idea-md-2026-02-16/`
  - legacy `docs/openclaw_idea/*.md` idea notes
- `docs/archive/root-md-unreferenced-2026-02-16/`
  - unreferenced root-level implementation-note markdown files
- `docs/archive/root-md-referenced-migrated-2026-02-16/`
  - referenced root markdown files migrated to `docs/reference_docs/`
- `docs/archive/non-md-legacy-assets-2026-02-16/`
  - asset-only top-level docs folders (`000_pdfs`, `screenshots`, `ctc-nordstern`)
- `docs/archive/root-md-zero-inbound-2026-02-16/`
  - root markdown files with zero inbound `docs/<file>.md` references at cleanup time
- `docs/archive/root-non-md-legacy-assets-2026-02-16/`
  - non-markdown files moved out of `docs/` root

---

## Archive Rules

1. Archive only when a canonical replacement exists.
2. Keep archived content immutable after move.
3. If old links are likely to exist, keep a stub at the legacy path that points to canonical + archive.
4. Never reference archived docs from new plans or implementation notes.
5. Add each new archive set to this index.

---

## Non-Archive Local References

- `docs/reference_projects/` contains local-only code/prototype references.
- These are not canonical docs and are intentionally blocked by CI docs guard from commit paths.
