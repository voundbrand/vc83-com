# Ongoing GDPR Obligations

Stand: 2026-03-26
Workstream: `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only`

## Active provider baseline for operations

Quarterly operations in this document are bound to the current provider baseline:

1. Active production-path providers: `Convex`, `Stripe`, `Resend`, `OpenRouter`, `OpenAI (direct paths)`, `PostHog`.
2. Feature-dependent providers (remain fail-closed unless explicitly activated): `Twilio`, `Mux`, `Radar`, `Vercel Analytics (app-specific)`.
3. Canonical source references:
   - `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md`
   - `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`
   - `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TRANSFER_IMPACT_REGISTER.md`
   - `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TOM_CONTROL_MATRIX.md`

## Quarterly owner rota

| Operations lane | Primary owner ID | Backup owner ID | Scope | Required artifacts each quarter |
|---|---|---|---|---|
| DSR intake and SLA control | `owner_datenschutz_kanzlei` | `owner_ops_service_desk` | DSR inbox triage, response SLA, closure quality | `DSR_RUNBOOK.md`; DSR case log export; release-gate risk update |
| Vendor contract closure (AVV/DPA) | `owner_legal_ops` | `owner_product_kanzlei_mvp` | AVV/DPA package status for active providers | `AVV_62A_CHECKLIST.md`; `PROVIDER_DECISION_EVIDENCE.md`; signed-artifact inventory |
| Transfer impact control | `owner_datenschutz_kanzlei` | `owner_engineering_platform` | SCC/TIA/adequacy evidence and fail-closed posture checks | `TRANSFER_IMPACT_REGISTER.md`; provider legal evidence links; decision log |
| Security and TOM evidence | `owner_security_platform` | `owner_engineering_platform` | TOM mapping, control gaps, remediation acceptance | `TOM_CONTROL_MATRIX.md`; provider TOM pack references |
| Incident readiness and tabletop | `owner_security_platform` | `owner_berufstraeger_kanzlei` | Incident runbook test and escalation drill | `INCIDENT_RUNBOOK.md`; tabletop protocol and action items |
| Release gate consolidation | `owner_product_kanzlei_mvp` | `owner_datenschutz_kanzlei` | Quarterly go/no-go review and signoff package | `RELEASE_GATE_DECISION.md` (KAMVP + DCAF); `GO_LIVE_CHECKLIST.md` |

## Quarterly calendar (rolling, provider-bound)

| Quarter | DSR checks | Vendor checks (active providers) | Transfer checks (active providers) | Incident checks | Quarter-end gate package |
|---|---|---|---|---|---|
| 2026-Q2 (Apr-Jun) | Weekly backlog review; monthly SLA report by day 5 | Confirm signed AVV/DPA evidence state for `Convex`, `Stripe`, `Resend`, `OpenRouter`, `OpenAI`, `PostHog` | Re-validate mechanism/fallback/re-check trigger for all active providers | Run one tabletop simulation and close findings | Update `GO_LIVE_CHECKLIST.md`, `VALIDATION_EVIDENCE.md`, both release-gate decisions |
| 2026-Q3 (Jul-Sep) | Weekly backlog review; monthly SLA report by day 5 | Reconcile provider list changes against runtime code + legal pack | Verify no active path drift from fail-closed transfer posture | Run one tabletop simulation and close findings | Re-issue owner signoff round with explicit verdict and residual risks |
| 2026-Q4 (Oct-Dec) | Weekly backlog review; monthly SLA report by day 5 | Annual AVV renewal prep + delta review for all active providers | Year-end transfer register recertification per active provider | Run one tabletop simulation and close findings | Publish annual compliance closure note in release-gate docs |
| 2027-Q1 (Jan-Mar) | Weekly backlog review; monthly SLA report by day 5 | Q1 provider dossier refresh and evidence checksum audit | Re-run transfer impact review after holiday release changes | Run one tabletop simulation and close findings | Refresh baseline verdict and next-quarter remediation plan |

## Event-driven escalation triggers

| Trigger | Required action within 5 working days | Owner lane |
|---|---|---|
| New provider appears in code/runtime | Add provider row, set fail-closed default, open AVV/transfer/TOM evidence track | Vendor + Transfer + Security lanes |
| DPA/ToS or subprocessor list changes | Re-evaluate AVV and transfer rows for affected provider(s) | Vendor + Transfer lanes |
| Region/topology change in Convex or Vercel | Update region evidence snapshot and transfer register | Transfer + Engineering lanes |
| Security/privacy incident at provider | Activate incident runbook, record legal and technical impact | Incident + Security + Datenschutz lanes |
| New feature enabling Twilio/Mux/Radar/Vercel Analytics in Kanzlei scope | Move provider from feature-dependent to active path controls before activation | Product + Vendor + Transfer + Security lanes |

## Execution rule

1. If any quarter-end mandatory artifact is missing, release posture remains `NO_GO`.
2. No provider may move to `freigegeben` without signed legal package + transfer mechanism + TOM mapping evidence.
3. Owner rota changes must be reflected in both release-gate decision documents before next quarter starts.
