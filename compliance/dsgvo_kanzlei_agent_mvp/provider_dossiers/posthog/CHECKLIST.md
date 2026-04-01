# Provider Contract Intake Checklist

Provider: posthog
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
| Contract (AVV/DPA) | 2026-03-27_posthog_dpa.html | https://posthog.com/dpa | 2026-03-27 | Public source captured; replace/augment with account-level acceptance proof. |
| Subprocessors | 2026-03-27_posthog_subprocessors.html | https://posthog.com/subprocessors | 2026-03-27 | Public source captured where available. |
| Transfer basis | MISSING | MISSING | 2026-03-27 | Add SCC/DPF/TIA evidence linked to your tenant/account. |
| TOM / Security | 2026-03-27_posthog_trust_center.html | https://trust.posthog.com/ | 2026-03-27 | Add tenant-specific security attestation if required. |
| Intake proof | MISSING | account portal / email thread screenshot | MISSING | Capture PostHog project-region and accepted DPA proof in intake/. |

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
