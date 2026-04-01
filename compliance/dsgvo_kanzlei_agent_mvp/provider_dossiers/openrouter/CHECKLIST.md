# Provider Contract Intake Checklist

Provider: openrouter
Status: `collecting`
Last updated: 2026-03-27

## Required closure package

- [ ] 1. Signed/accepted AVV or DPA artifact is present in `contract/`.
- [ ] 2. Subprocessor list artifact is present in `subprocessors/`.
- [ ] 3. Transfer mechanism evidence (SCC/DPF/TIA path) is present in `transfer/`.
- [ ] 4. TOM/security evidence is present in `security/`.
- [ ] 5. Intake proof (portal screenshot/email/ticket) is present in `intake/`.

## Artifact manifest

| Control area | Artifact filename | Source URL / portal path | Captured at | Notes |
|---|---|---|---|---|
| Contract (AVV/DPA) | 2026-03-27_openrouter_terms_with_dpa_reference.html | https://openrouter.ai/terms | 2026-03-27 | Public source captured; replace/augment with account-level acceptance proof. |
| Subprocessors | MISSING | MISSING | 2026-03-27 | Public source captured where available. |
| Transfer basis | 2026-03-27_openrouter_privacy.html | https://openrouter.ai/privacy | 2026-03-27 | Add SCC/DPF/TIA evidence linked to your tenant/account. |
| TOM / Security | MISSING | MISSING | 2026-03-27 | Add tenant-specific security attestation if required. |
| Intake proof | MISSING | account portal / email thread screenshot | MISSING | Obtain direct OpenRouter DPA artifact or support confirmation and capture proof in intake/. |

## Vault upload mapping

| Evidence type | Suggested metadata |
|---|---|
| AVV provider | `Type=AVV provider`, `Source=Provider response`, `Risk links=R-002` |
| Transfer evidence | `Type=AVV provider`, `Risk links=R-002,R-003` |
| Internal memo | `Source=Org uploaded` |

## Dossier transition log

| Date | State transition | Operator note |
|---|---|---|
| 2026-03-27 | todo -> collecting | Public legal baseline captured into local dossier folders. |

## Completion rule

Do not move provider decision from `abgelehnt` to review-ready until all five closure items above are complete.
