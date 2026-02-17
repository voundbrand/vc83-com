# Documentation Cleanup Matrix

Last sweep: 2026-02-16

Purpose:
- keep documentation discoverable and drift-resistant
- separate canonical docs from local reference code/assets
- make keep/archive/remove decisions explicit

Decision legend:
- `KEEP` = active docs in repo
- `ARCHIVE` = moved to `docs/archive/`
- `REMOVE` = removed from repo tracking
- `LOCAL` = local-only reference zone, commit-blocked by CI

---

## Completed In This Sweep

1. Split `docs/bring_it_all_together/` into docs-only + reference assets:
   - kept markdown plans in `docs/bring_it_all_together/`
   - moved non-md assets to `docs/reference_projects/bring_it_all_together_assets/`
2. Archived non-md legacy top-level folders:
   - `docs/000_pdfs/`
   - `docs/screenshots/`
   - `docs/ctc-nordstern/`
   - archived at `docs/archive/non-md-legacy-assets-2026-02-16/`
3. Removed prototype corpus from repo tracking:
   - `docs/reference_projects/prototypes_from_v0/` deleted
4. Tightened docs guard:
   - `docs/bring_it_all_together/` enforced as markdown-only
   - archived asset-only top-level folders blocked from reintroduction
5. Archived zero-inbound root markdown:
   - moved 118 root `docs/*.md` files (excluding `docs/README.md`) to `docs/archive/root-md-zero-inbound-2026-02-16/`
6. Archived root non-markdown file clutter:
   - moved miscellaneous root assets to `docs/archive/root-non-md-legacy-assets-2026-02-16/`
7. Consolidated one-file top-level topic folders:
   - moved to `docs/reference_docs/single_topic_folders/`
8. Consolidated small multi-file top-level topic folders:
   - moved to `docs/reference_docs/topic_collections/`

---

## Keep / Archive / Remove Matrix

| Path | Profile | Decision | Status | Notes |
|---|---|---|---|---|
| `docs/platform/` | canonical architecture + plans | KEEP | Active | Primary source-of-truth |
| `docs/ai-endurance/` | endurance strategy/plans | KEEP | Active | Linked from canonical docs |
| `docs/ghl_integration_plus_memory/` | integration support specs | KEEP | Active | Integration-specific docs |
| `docs/layers/` | legacy stubs + pointers | KEEP | Active (legacy) | Do not use for new canonical references |
| `docs/reference_docs/` | migrated root support docs | KEEP | Active | Supporting references only |
| `docs/bring_it_all_together/` | planning docs (markdown only) | KEEP | Active | Non-md assets moved out |
| `docs/openclaw_idea/` | deprecation pointer stub | KEEP | Active stub | Canonical map lives elsewhere |
| `docs/archive/` | immutable history | KEEP | Active | Archive index is authoritative |
| `docs/reference_projects/` | local reference code/assets | LOCAL | Active | Commit-blocked by docs guard |
| `docs/reference_projects/l4yercak3-cli/` | reference code repo | LOCAL | Active | Local-only |
| `docs/reference_projects/l4yercak3_systems/` | reference systems repo | LOCAL | Active | Local-only |
| `docs/reference_projects/openclaw/` | OpenClaw reference repo | LOCAL | Active | Local-only |
| `docs/reference_projects/bring_it_all_together_assets/` | non-md assets for BIAT docs | LOCAL | Active | Local-only |
| `docs/reference_docs/single_topic_folders/` | consolidated one-file topic docs | KEEP | Active | Former singleton top-level topic folders |
| `docs/reference_docs/topic_collections/` | consolidated small topic-collection folders | KEEP | Active | Former small top-level markdown topic folders |
| `docs/000_pdfs/` | asset-only folder | ARCHIVE | Completed | `docs/archive/non-md-legacy-assets-2026-02-16/000_pdfs/` |
| `docs/screenshots/` | asset-only folder | ARCHIVE | Completed | `docs/archive/non-md-legacy-assets-2026-02-16/screenshots/` |
| `docs/ctc-nordstern/` | asset-only folder | ARCHIVE | Completed | `docs/archive/non-md-legacy-assets-2026-02-16/ctc-nordstern/` |
| `docs/prototypes_from_v0/` | prototype corpus | REMOVE | Completed | Removed from docs tree |
| `docs/*.md` (zero-inbound subset) | root markdown backlog | ARCHIVE | Completed | `docs/archive/root-md-zero-inbound-2026-02-16/` |
| `docs/*` non-md root files | root asset clutter | ARCHIVE | Completed | `docs/archive/root-non-md-legacy-assets-2026-02-16/` |
| `docs/000_NORTH_STAR_ICP/` | ICP docs (+minor local artifact) | KEEP | Active | Optional hygiene: remove `.DS_Store` locally |
| `docs/REFACTORY/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/REFACTORY/` |
| `docs/byok_infra/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/byok_infra/` |
| `docs/filesystem_metaphor/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/filesystem_metaphor/` |
| `docs/god_table_refactor/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/god_table_refactor/` |
| `docs/implementation/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/implementation/` |
| `docs/infobip/` | docs + diagram images | KEEP | Active | Mixed by design |
| `docs/layercake-agency-influencers/` | markdown-only topic docs | KEEP | Active | - |
| `docs/multichannel-automation/` | markdown-only topic docs | KEEP | Active | - |
| `docs/open-source-exploration/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/open-source-exploration/` |
| `docs/plans/` | markdown-only plan docs | KEEP | Active | - |
| `docs/pressmaster_onboarding/` | docs + screenshots | KEEP | Active | Mixed by design |
| `docs/pricing-and-trials/` | docs + minor image asset | KEEP | Active | Mixed by design |
| `docs/roadmap/` | markdown-only topic docs | KEEP | Consolidated | `docs/reference_docs/topic_collections/roadmap/` |
| `docs/security_and_speed_audit/` | markdown-only audit docs | KEEP | Active | - |
| `docs/v0_to_l4yercak3_backend/` | docs + minor local artifact | KEEP | Active | Optional hygiene: remove `.DS_Store` locally |
| `docs/zapier/` | markdown-only integration docs | KEEP | Active | - |

---

## Operational Rules

1. Do not add new non-markdown assets to canonical doc zones unless the folder is explicitly mixed by design.
2. Put code-heavy references and raw asset bundles under `docs/reference_projects/` (local-only).
3. If a folder becomes obsolete, archive it with a dated snapshot set under `docs/archive/`.
4. Keep this matrix updated when folder-level decisions change.
