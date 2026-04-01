# Evidence Vault Upload Rows

Provider: openrouter
Generated: 2026-03-27

Use these rows in Compliance Center -> Evidence Vault -> Upload evidence + capture metadata.

| Local file | Title | Subtype | Source type | Risk IDs | Provider name | Sensitivity | Lifecycle | Review cadence | Next review | Retention class | Retention delete | Publish platform-shared | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/openrouter/contract/2026-03-27_openrouter_terms_with_dpa_reference.html | Openrouter - openrouter terms with dpa reference | avv_provider | provider_response | R-002 | openrouter | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Public legal source capture; replace/augment with account acceptance proof if available. |
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/openrouter/transfer/2026-03-27_openrouter_privacy.html | Openrouter - openrouter privacy | transfer_impact | provider_response | R-002|R-003 | openrouter | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Transfer/privacy source capture; link SCC/DPF/TIA account evidence if applicable. |

## UI mapping defaults

- Source type: provider files -> `provider_response`; intake screenshots/notes -> `org_uploaded`.
- Risk links: transfer docs -> `R-002,R-003`; all other rows -> `R-002`.
- Publish as platform-shared: `true` (super-admin in platform mode).
