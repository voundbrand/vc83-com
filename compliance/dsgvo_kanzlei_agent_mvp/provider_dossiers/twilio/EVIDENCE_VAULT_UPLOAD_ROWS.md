# Evidence Vault Upload Rows

Provider: twilio
Generated: 2026-03-27

Use these rows in Compliance Center -> Evidence Vault -> Upload evidence + capture metadata.

| Local file | Title | Subtype | Source type | Risk IDs | Provider name | Sensitivity | Lifecycle | Review cadence | Next review | Retention class | Retention delete | Publish platform-shared | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/twilio/contract/2026-03-27_twilio_dpa.html | Twilio - twilio dpa | avv_provider | provider_response | R-002 | twilio | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Public legal source capture; replace/augment with account acceptance proof if available. |
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/twilio/security/2026-03-27_twilio_security_overview.html | Twilio - twilio security overview | security_control | provider_response | R-002 | twilio | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Security/trust source capture; add tenant-scoped attestation if required. |
| /Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/twilio/subprocessors/2026-03-27_twilio_subprocessors.html | Twilio - twilio subprocessors | avv_provider | provider_response | R-002 | twilio | confidential | active | annual | 2027-03-27 | 3_years | 2029-03-27 | true | Public subprocessor/service-provider source capture. |

## UI mapping defaults

- Source type: provider files -> `provider_response`; intake screenshots/notes -> `org_uploaded`.
- Risk links: transfer docs -> `R-002,R-003`; all other rows -> `R-002`.
- Publish as platform-shared: `true` (super-admin in platform mode).
