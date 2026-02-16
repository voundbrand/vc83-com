# Documentation Status Matrix

Last architecture docs audit: 2026-02-16

Purpose:
- define which docs are source-of-truth
- define review cadence to prevent drift
- separate active docs from legacy/archived docs

---

## Active Canonical Docs

| Path | Role | Status | Review cadence | Drift risk |
|---|---|---|---|---|
| `docs/agentic_system/CANONICAL_DOCS_INDEX.md` | Canonical entrypoint | Active canonical | On every architecture change | High |
| `docs/agentic_system/FOUR_LAYER_PLATFORM_MODEL.md` | Layer taxonomy contract | Active canonical | On every layer/policy change | High |
| `docs/agentic_system/ARCHITECTURE.md` | System architecture | Active canonical | Monthly | High |
| `docs/agentic_system/HARNESS_MODEL.md` | Harness model contract | Active canonical | Monthly | Medium |
| `docs/agentic_system/TOOL_SCOPING.md` | Policy-layer tool scoping contract | Active canonical | Monthly | High |
| `docs/agentic_system/AI_COMPOSITION_PLATFORM.md` | Knowledge/recipe/skill strategy | Active canonical | Monthly | Medium |
| `docs/agentic_system/LAYERS_PRD.md` | Layers PRD | Active canonical | Monthly | Medium |
| `docs/agentic_system/MEMORY_ENGINE_DESIGN.md` | Memory architecture | Active canonical | Monthly | High |
| `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md` | OpenClaw idea pattern integration map | Active canonical | On idea-doc intake | Medium |

---

## Active Supporting Specs

| Path | Role | Status | Review cadence |
|---|---|---|---|
| `docs/agentic_system/CREDIT_SYSTEM.md` | Subsystem spec | Active | Monthly |
| `docs/agentic_system/ERROR_HANDLING.md` | Subsystem spec | Active | Monthly |
| `docs/agentic_system/SESSION_LIFECYCLE.md` | Subsystem spec | Active | Monthly |
| `docs/agentic_system/SOUL_EVOLUTION.md` | Subsystem spec | Active | Monthly |
| `docs/agentic_system/TEAM_COORDINATION.md` | Subsystem spec | Active | Monthly |
| `docs/agentic_system/README.md` | Navigation + summary | Active | On structure change |

---

## Active Implementation Plans

All files in `docs/agentic_system/implementation_plans/` are active planning documents.

Rule:
- If implementation deviates, update plan doc in same PR.
- If plan is superseded, move it to `docs/archive/` and add replacement pointer.

---

## Legacy Paths (Do Not Use for New References)

| Legacy path | Current behavior | Canonical replacement |
|---|---|---|
| `docs/layers/AI_COMPOSITION_PLATFORM.md` | Deprecated stub | `docs/agentic_system/AI_COMPOSITION_PLATFORM.md` |
| `docs/layers/LAYERS_PRD.md` | Deprecated stub | `docs/agentic_system/LAYERS_PRD.md` |
| `docs/ghl_integration_plus_memory/02_MEMORY_ENGINE_DESIGN.md` | Deprecated stub | `docs/agentic_system/MEMORY_ENGINE_DESIGN.md` |
| `docs/openclaw_idea/*.md` | Archived notes | `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md` |
| `docs/*.md` (loose root implementation notes) | Strict-allowlisted legacy set; migration in progress | `docs/reference_docs/` + `docs/README.md` |

---

## Archived Snapshots

Immutable snapshots for historical traceability:
- `docs/archive/legacy-layer-docs-2026-02-16/AI_COMPOSITION_PLATFORM.md`
- `docs/archive/legacy-layer-docs-2026-02-16/LAYERS_PRD.md`
- `docs/archive/legacy-layer-docs-2026-02-16/02_MEMORY_ENGINE_DESIGN.md`
- `docs/archive/openclaw-idea-md-2026-02-16/` (legacy idea notes)
- `docs/archive/root-md-unreferenced-2026-02-16/` (root markdown notes with zero inbound references)
- `docs/archive/root-md-referenced-migrated-2026-02-16/` (root markdown notes moved to `docs/reference_docs/`)

---

## Review Checklist

For each monthly review:
1. Confirm links from `docs/agentic_system/README.md` resolve to active canonical docs.
2. Run drift checks from `docs/agentic_system/CANONICAL_DOCS_INDEX.md`.
3. Validate layer terms are typed (`BusinessLayer`, `PolicyLayer`, `MemoryLayer`).
4. Move superseded docs to `docs/archive/` and leave a deprecation stub if external links exist.
5. Update this file's audit date.
