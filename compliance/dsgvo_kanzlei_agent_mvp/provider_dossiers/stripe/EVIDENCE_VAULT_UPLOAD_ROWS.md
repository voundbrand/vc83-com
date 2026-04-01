# Evidence Vault Upload Rows

Provider: stripe
Generated: 2026-03-27

Use these rows in Compliance Center -> Evidence Vault -> Upload evidence + capture metadata.

| Local file | Title | Subtype | Source type | Risk IDs | Provider name | Sensitivity | Lifecycle | Review cadence | Next review | Retention class | Retention delete | Publish platform-shared | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/stripe/contract/2026-03-27_stripe_dpa.html | Stripe - stripe dpa | avv_provider | provider_response | R-002 | stripe | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Public legal source capture; replace/augment with account acceptance proof if available. |
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/stripe/subprocessors/2026-03-27_stripe_service_providers.html | Stripe - stripe service providers | avv_provider | provider_response | R-002 | stripe | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Public subprocessor/service-provider source capture. |

## UI mapping defaults

- Source type: provider files -> `provider_response`; intake screenshots/notes -> `org_uploaded`.
- Risk links: transfer docs -> `R-002,R-003`; all other rows -> `R-002`.
- Publish as platform-shared: `true` (super-admin in platform mode).
