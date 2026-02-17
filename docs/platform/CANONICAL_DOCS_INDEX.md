# Canonical Docs Index

This is the single entrypoint for architecture and layer-model documentation.

Use these paths in all new docs, plans, code comments, and PR notes.

---

## Canonical Documents

- `docs/platform/FOUR_LAYER_PLATFORM_MODEL.md`
- `docs/platform/ARCHITECTURE.md`
- `docs/platform/CODEBASE_ATLAS.md`
- `docs/platform/DOC_STATUS_MATRIX.md`
- `docs/platform/DOC_CLEANUP_MATRIX.md`
- `docs/platform/HARNESS_MODEL.md`
- `docs/platform/TOOL_SCOPING.md`
- `docs/platform/AI_COMPOSITION_PLATFORM.md`
- `docs/platform/LAYERS_PRD.md`
- `docs/platform/MEMORY_ENGINE_DESIGN.md`
- `docs/platform/OPENCLAW_IDEA_INTEGRATION.md`

---

## Governance

- Document status matrix: `docs/platform/DOC_STATUS_MATRIX.md`
- Documentation cleanup matrix: `docs/platform/DOC_CLEANUP_MATRIX.md`
- Codebase atlas index: `docs/platform/codebase_atlas/README.md`
- Diagram impact PR template: `.github/pull_request_template.md`
- Diagram impact workflow: `.github/workflows/diagram-impact.yml`
- Archive policy/index: `docs/archive/README.md`
- Root docs allowlist: `docs/.root-md-allowlist.txt`
- Docs tree map: `docs/TREE.md`
- Consolidated singleton topic docs: `docs/reference_docs/single_topic_folders/`
- Local reference projects (non-canonical, commit-blocked): `docs/reference_projects/`

---

## Legacy Path Mapping

| Legacy path | Canonical path | Archived snapshot |
|---|---|---|
| `docs/layers/AI_COMPOSITION_PLATFORM.md` | `docs/platform/AI_COMPOSITION_PLATFORM.md` | `docs/archive/legacy-layer-docs-2026-02-16/AI_COMPOSITION_PLATFORM.md` |
| `docs/layers/LAYERS_PRD.md` | `docs/platform/LAYERS_PRD.md` | `docs/archive/legacy-layer-docs-2026-02-16/LAYERS_PRD.md` |
| `docs/ghl_integration_plus_memory/02_MEMORY_ENGINE_DESIGN.md` | `docs/platform/MEMORY_ENGINE_DESIGN.md` | `docs/archive/legacy-layer-docs-2026-02-16/02_MEMORY_ENGINE_DESIGN.md` |
| `docs/openclaw_idea/*.md` | `docs/platform/OPENCLAW_IDEA_INTEGRATION.md` | `docs/archive/openclaw-idea-md-2026-02-16/` |

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
rg -n "\\bLayer [1-5]\\b" docs/platform -g "*.md"

# Root-level docs sprawl check (root markdown should trend down over time)
find docs -maxdepth 1 -type f -name "*.md" | wc -l

# Enforce explicit root markdown allowlist
comm -23 <(find docs -maxdepth 1 -type f -name "*.md" | sort) <(sort docs/.root-md-allowlist.txt)

# Detect reintroduced old singleton top-level topic folders
find docs -mindepth 1 -maxdepth 1 -type d | rg "docs/(affiliate_software|callcenter_ai|compliance_gdpr|concepts|donald_miller|extend_crm|external-apps-auth|integrations|patterns|v0_to_production_app|windows_refactor|REFACTORY|byok_infra|filesystem_metaphor|god_table_refactor|implementation|open-source-exploration|roadmap)$"
```
