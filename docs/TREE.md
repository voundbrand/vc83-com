# Docs Tree Map

Last updated: 2026-02-16

Purpose:
- provide one quick structural map of the `docs/` area
- clarify what is canonical vs support vs local reference vs archive
- reduce future drift when adding/moving docs

---

## Top-Level Layout

```text
docs/
  README.md                      # docs entrypoint
  TREE.md                        # this map
  .root-md-allowlist.txt         # strict root markdown allowlist

  platform/                # canonical architecture contracts + implementation plans
  ai-endurance/                  # durability strategy and rollout plans
  bring_it_all_together/         # active planning docs (markdown-only)
  ghl_integration_plus_memory/   # integration-specific support docs
  layers/                        # legacy compatibility stubs pointing to canonical docs

  reference_docs/                # supporting docs consolidated out of root
    single_topic_folders/        # former one-file top-level topic folders
    topic_collections/           # former small multi-file top-level topic folders

  reference_projects/            # local-only reference code/assets (commit-blocked by guard)
    bring_it_all_together_assets/
    l4yercak3-cli/
    l4yercak3_systems/
    openclaw/

  archive/                       # immutable historical snapshots and legacy notes
```

---

## Zone Rules

1. Canonical architecture decisions go in `docs/platform/`.
2. Non-canonical support docs go in `docs/reference_docs/`.
3. Code-heavy references/assets go in `docs/reference_projects/` only.
4. Superseded docs/assets go to dated sets in `docs/archive/`.
5. Do not add new root markdown unless intentionally allowlisted.

---

## Maintenance Commands

```bash
# Root markdown set (must match allowlist)
find docs -maxdepth 1 -type f -name "*.md" | sort
sort docs/.root-md-allowlist.txt

# Top-level folders
find docs -mindepth 1 -maxdepth 1 -type d | sort

# Spot unintended singleton top-level folders
find docs -mindepth 1 -maxdepth 1 -type d | rg "docs/(affiliate_software|callcenter_ai|compliance_gdpr|concepts|donald_miller|extend_crm|external-apps-auth|integrations|patterns|v0_to_production_app|windows_refactor|REFACTORY|byok_infra|filesystem_metaphor|god_table_refactor|implementation|open-source-exploration|roadmap)$"

# Validate docs policy guard
npm run docs:guard
```
