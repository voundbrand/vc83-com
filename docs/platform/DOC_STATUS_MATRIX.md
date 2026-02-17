# Documentation Status Matrix

Last architecture docs audit: 2026-02-17

Purpose:
- define which docs are source-of-truth
- define review cadence to prevent drift
- separate active docs from legacy/archived docs

---

## Active Canonical Docs

| Path | Role | Status | Review cadence | Drift risk |
|---|---|---|---|---|
| `docs/platform/CANONICAL_DOCS_INDEX.md` | Canonical entrypoint | Active canonical | On every architecture change | High |
| `docs/platform/FOUR_LAYER_PLATFORM_MODEL.md` | Layer taxonomy contract | Active canonical | On every layer/policy change | High |
| `docs/platform/CODEBASE_ATLAS.md` | Full-codebase visualization contract + diagram governance | Active canonical | On every mapped runtime behavior change | High |
| `docs/platform/DOC_CLEANUP_MATRIX.md` | Folder governance matrix | Active canonical | On every folder-level docs change | High |
| `docs/platform/ARCHITECTURE.md` | System architecture | Active canonical | Monthly | High |
| `docs/platform/HARNESS_MODEL.md` | Harness model contract | Active canonical | Monthly | Medium |
| `docs/platform/TOOL_SCOPING.md` | Policy-layer tool scoping contract | Active canonical | Monthly | High |
| `docs/platform/AI_COMPOSITION_PLATFORM.md` | Knowledge/recipe/skill strategy | Active canonical | Monthly | Medium |
| `docs/platform/LAYERS_PRD.md` | Layers PRD | Active canonical | Monthly | Medium |
| `docs/platform/MEMORY_ENGINE_DESIGN.md` | Memory architecture | Active canonical | Monthly | High |
| `docs/platform/OPENCLAW_IDEA_INTEGRATION.md` | OpenClaw idea pattern integration map | Active canonical | On idea-doc intake | Medium |

---

## Active Supporting Specs

| Path | Role | Status | Review cadence |
|---|---|---|---|
| `docs/platform/CREDIT_SYSTEM.md` | Subsystem spec | Active | Monthly |
| `docs/platform/codebase_atlas/*` | Runtime flow maps + Mermaid sequence docs | Active | On every mapped runtime behavior change |
| `docs/platform/ERROR_HANDLING.md` | Subsystem spec | Active | Monthly |
| `docs/platform/SESSION_LIFECYCLE.md` | Subsystem spec | Active | Monthly |
| `docs/platform/SOUL_EVOLUTION.md` | Subsystem spec | Active | Monthly |
| `docs/platform/TEAM_COORDINATION.md` | Subsystem spec | Active | Monthly |
| `docs/platform/README.md` | Navigation + summary | Active | On structure change |

---

## Active Implementation Plans

All files in `docs/platform/implementation_plans/` are active planning documents.

Rule:
- If implementation deviates, update plan doc in same PR.
- If plan is superseded, move it to `docs/archive/` and add replacement pointer.

---

## Legacy Paths (Do Not Use for New References)

| Legacy path | Current behavior | Canonical replacement |
|---|---|---|
| `docs/layers/AI_COMPOSITION_PLATFORM.md` | Deprecated stub | `docs/platform/AI_COMPOSITION_PLATFORM.md` |
| `docs/layers/LAYERS_PRD.md` | Deprecated stub | `docs/platform/LAYERS_PRD.md` |
| `docs/ghl_integration_plus_memory/02_MEMORY_ENGINE_DESIGN.md` | Deprecated stub | `docs/platform/MEMORY_ENGINE_DESIGN.md` |
| `docs/openclaw_idea/*.md` | Archived notes | `docs/platform/OPENCLAW_IDEA_INTEGRATION.md` |
| `docs/reference_projects/*` | Local-only reference code/prototypes | Not canonical docs; do not reference from architecture specs |
| `docs/(affiliate_software|callcenter_ai|compliance_gdpr|concepts|donald_miller|extend_crm|external-apps-auth|integrations|patterns|v0_to_production_app|windows_refactor)/*` | Consolidated singleton topic folders | `docs/reference_docs/single_topic_folders/*` |
| `docs/(REFACTORY|byok_infra|filesystem_metaphor|god_table_refactor|implementation|open-source-exploration|roadmap)/*` | Consolidated small topic-collection folders | `docs/reference_docs/topic_collections/*` |
| `docs/*.md` (root markdown set) | Curated strict-allowlisted set after backlog reduction | `docs/.root-md-allowlist.txt` + `docs/reference_docs/` + `docs/README.md` |

---

## Archived Snapshots

Immutable snapshots for historical traceability:
- `docs/archive/legacy-layer-docs-2026-02-16/AI_COMPOSITION_PLATFORM.md`
- `docs/archive/legacy-layer-docs-2026-02-16/LAYERS_PRD.md`
- `docs/archive/legacy-layer-docs-2026-02-16/02_MEMORY_ENGINE_DESIGN.md`
- `docs/archive/openclaw-idea-md-2026-02-16/` (legacy idea notes)
- `docs/archive/root-md-unreferenced-2026-02-16/` (root markdown notes with zero inbound references)
- `docs/archive/root-md-referenced-migrated-2026-02-16/` (root markdown notes moved to `docs/reference_docs/`)
- `docs/archive/non-md-legacy-assets-2026-02-16/` (asset-only top-level folders archived out of active docs tree)
- `docs/archive/root-md-zero-inbound-2026-02-16/` (additional root markdown archive reduction set)
- `docs/archive/root-non-md-legacy-assets-2026-02-16/` (non-markdown files moved out of docs root)

---

## Review Checklist

For each monthly review:
1. Confirm links from `docs/platform/README.md` resolve to active canonical docs.
2. Run drift checks from `docs/platform/CANONICAL_DOCS_INDEX.md`.
3. Validate layer terms are typed (`BusinessLayer`, `PolicyLayer`, `MemoryLayer`).
4. Move superseded docs to `docs/archive/` and leave a deprecation stub if external links exist.
5. Update this file's audit date.
6. Update `docs/platform/DOC_CLEANUP_MATRIX.md` if folder-level decisions changed.
7. Confirm PR contract and CI references still match current paths:
   - `.github/pull_request_template.md`
   - `.github/workflows/diagram-impact.yml`
   - `scripts/ci/check-diagram-impact.sh`
