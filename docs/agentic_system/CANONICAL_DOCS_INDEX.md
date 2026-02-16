# Canonical Docs Index

This is the single entrypoint for architecture and layer-model documentation.

Use these paths in all new docs, plans, code comments, and PR notes.

---

## Canonical Documents

- `docs/agentic_system/FOUR_LAYER_PLATFORM_MODEL.md`
- `docs/agentic_system/ARCHITECTURE.md`
- `docs/agentic_system/DOC_STATUS_MATRIX.md`
- `docs/agentic_system/HARNESS_MODEL.md`
- `docs/agentic_system/TOOL_SCOPING.md`
- `docs/agentic_system/AI_COMPOSITION_PLATFORM.md`
- `docs/agentic_system/LAYERS_PRD.md`
- `docs/agentic_system/MEMORY_ENGINE_DESIGN.md`
- `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md`

---

## Governance

- Document status matrix: `docs/agentic_system/DOC_STATUS_MATRIX.md`
- Archive policy/index: `docs/archive/README.md`
- Root docs allowlist: `docs/.root-md-allowlist.txt`

---

## Legacy Path Mapping

| Legacy path | Canonical path | Archived snapshot |
|---|---|---|
| `docs/layers/AI_COMPOSITION_PLATFORM.md` | `docs/agentic_system/AI_COMPOSITION_PLATFORM.md` | `docs/archive/legacy-layer-docs-2026-02-16/AI_COMPOSITION_PLATFORM.md` |
| `docs/layers/LAYERS_PRD.md` | `docs/agentic_system/LAYERS_PRD.md` | `docs/archive/legacy-layer-docs-2026-02-16/LAYERS_PRD.md` |
| `docs/ghl_integration_plus_memory/02_MEMORY_ENGINE_DESIGN.md` | `docs/agentic_system/MEMORY_ENGINE_DESIGN.md` | `docs/archive/legacy-layer-docs-2026-02-16/02_MEMORY_ENGINE_DESIGN.md` |
| `docs/openclaw_idea/*.md` | `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md` | `docs/archive/openclaw-idea-md-2026-02-16/` |

---

## Rule

Do not add new references to legacy paths. Use canonical paths only.

---

## Drift Checks

Run these periodically to detect terminology/path drift:

```bash
# Legacy path references (should only appear in deprecation stubs or mapping docs)
rg -n "docs/layers/AI_COMPOSITION_PLATFORM.md|docs/layers/LAYERS_PRD.md|docs/ghl_integration_plus_memory/02_MEMORY_ENGINE_DESIGN.md|docs/openclaw_idea/.*\\.md" docs -g "*.md"

# Ambiguous layer wording in architecture docs (review any hit manually)
rg -n "\\bLayer [1-5]\\b" docs/agentic_system -g "*.md"

# Root-level docs sprawl check (root markdown should trend down over time)
find docs -maxdepth 1 -type f -name "*.md" | wc -l

# Enforce explicit root markdown allowlist
comm -23 <(find docs -maxdepth 1 -type f -name "*.md" | sort) <(sort docs/.root-md-allowlist.txt)
```
