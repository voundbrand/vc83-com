# Legal-Operational Checklist (NCLAW-009)

Snapshot date: 2026-04-01
Scope: Kanzlei pilot, Germany-first, one-person company model.

## A. Confidentiality controls

| Control | Status | Evidence |
|---|---|---|
| AVV/DPA with primary infrastructure provider | Complete | `hetzner/dpa-2026-03-27.pdf` |
| Subprocessor list reference for primary provider | Complete | `hetzner/subunternehmer.pdf` |
| Confidentiality ownership assigned | Complete | `company_profile.md` |
| Written confidentiality handling rule for operator actions | In progress | finalize in operational runbook before `NCLAW-010` |

## B. Access governance

| Control | Status | Evidence |
|---|---|---|
| Single accountable owner named | Complete | `company_profile.md` |
| Incident role mapping (legal/technical/ops) | Complete | `incident_contact_matrix.md` |
| Principle of least privilege for runtime/admin | In progress | enforced during runtime deployment hardening (`NCLAW-010`) |
| 2FA for admin account | Verify required | account setting evidence screenshot pending |

## C. Incident notification readiness

| Control | Status | Evidence |
|---|---|---|
| Incident owner matrix | Complete | `incident_contact_matrix.md` |
| Contact channels documented | Complete (email + postal) | `incident_contact_matrix.md` |
| 72h legal notification process reference | In progress | include in incident runbook for validation phase |

## D. Audit trail readiness

| Control | Status | Evidence |
|---|---|---|
| AVV portal proof stored | Complete | `hetzner/Screenshot 2026-03-27 at 08.51.21.png` |
| TOM/audit reports stored | Complete | `hetzner/TOM.pdf`, `hetzner/dpa-tuev-audit-de.pdf` |
| Evidence register maintained | Complete | `evidence_register.md` |
| Runtime audit logs for tool/model actions | Complete (technical drill evidence) | `runtime_evidence_2026-03-27_private_live.md` (`NCLAW-010`) |

## E. Tool decision guardrails (Germany-first)

Locked decisions:
1. Infrastructure host: Hetzner dedicated (`H1`) in Germany.
2. Evidence vault: local compliance docs path under this workstream.
3. Default policy: no additional subprocessors unless explicitly approved and documented.

Pending decisions (required before production go-live):
1. Transactional email strategy:
   - Option A: self-hosted SMTP on Hetzner.
   - Option B: external EU/Germany provider with AVV + subprocessor + transfer basis evidence.
2. Model inference strategy:
   - MVP decision selected: external EU API path via `OpenRouter Enterprise EU + BYOK`.
   - Required evidence pending: OpenRouter DPA/AVV + subprocessors + EU routing confirmation + upstream provider legal packet.
   - Strict Germany-only promise remains a future track in `strict_germany_promise_backlog.md`.

Compliance gate note:
1. If either pending decision remains unresolved, release remains `NO_GO`.

## F. ElevenLabs enterprise control overlay (`NCLAW-018`)

| Control | Status | Evidence |
|---|---|---|
| EU isolated endpoint and residency mode recorded | In progress | `evidence_register.md` (`EL-EU-ENDPOINT`, `E-LGL-014`) |
| Zero Retention policy state recorded | In progress | `evidence_register.md` (`EL-ZERO-RETENTION`, `E-LGL-015`) |
| No-training enterprise clause evidence recorded | In progress | `evidence_register.md` (`EL-NO-TRAINING-CLAUSE`, `E-LGL-001`) |
| Webhook authenticity controls recorded (signature + IP allowlist path) | In progress | `evidence_register.md` (`EL-WEBHOOK-AUTH`, `E-LGL-016`) |
| Subprocessor notice and objection path recorded | In progress | `evidence_register.md` (`EL-SUBPROCESSOR-NOTICE`, `E-LGL-002`) |

Gate note:
1. These controls are mapped and tracked, but still evidence-pending; external launch stays `NO_GO` until all listed controls are complete.
