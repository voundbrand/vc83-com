# Phase 0 — ElevenLabs Enterprise Redline + Security Questionnaire

| Field | Value |
|---|---|
| **Document** | 06 — ElevenLabs Enterprise Redline + Security Questionnaire |
| **Date** | 2026-04-01 |
| **Classification** | Internal — Founder's Eyes Only |
| **Use case** | Live sales/legal/procurement call prep for Enterprise contracting |

---

## Purpose

Use this as the negotiation baseline so we do **not** become a pure reseller.

Commercial rule:
1. ElevenLabs = voice/agent runtime infrastructure.
2. We = system of record, customer contract owner, compliance operator.
3. Contract language must preserve this boundary.

---

## Redline Priorities (Must-Have / Fallback / No-Go)

### 1) Data processing purpose + training

**Must-have clause**
> "Customer Content and Customer Personal Data will not be used to train, fine-tune, or improve provider foundation models or shared platform models, except where strictly necessary to deliver contracted services to Customer and only under Customer's documented instructions."

**Fallback**
- Explicit enterprise opt-out set to `OFF` by default at workspace level.
- Written confirmation that no enterprise data is used for generalized model improvement.

**No-go**
- Any broad right to use our or end-customer content for general model improvement without explicit opt-in.

---

### 2) EU residency and processing boundary

**Must-have clause**
> "Production workspace for Customer is provisioned in EU isolated environment, with API/WebSocket endpoints in EU residency, and processing remains within EU for configured workloads except where Customer explicitly enables out-of-region integrations."

**Fallback**
- EU storage + documented, limited out-of-region processing cases.
- Compensating controls: Zero Retention Mode + blocked optional integrations that can force out-of-region processing.

**No-go**
- "EU-hosted" marketing claim without contractual processing-path disclosure.

---

### 3) Retention and deletion

**Must-have clause**
> "Default transcript and audio retention is configured to Customer policy (not platform default). On termination, Customer Content is deleted within 30 days, excluding legally required backup retention."

**Fallback**
- Policy-based retention in days (set at go-live checklist).
- Deletion certificate or written deletion confirmation on request.

**No-go**
- Unbounded retention for transcripts/audio in production legal workflows.

---

### 4) Subprocessors and transfer mechanism

**Must-have clause**
> "Provider will maintain a public subprocessor list, give at least 30 days prior notice of new subprocessors, and support objection/termination rights for unresolved privacy or security objections."

**Fallback**
- Same rights via DPA plus customer notification workflow.

**No-go**
- Silent subprocessor changes with no notice or no objection path.

---

### 5) Security incident notification and cooperation

**Must-have clause**
> "Provider shall notify Customer without undue delay after confirming a Security Incident, include actionable incident details, and cooperate with Customer's 72-hour regulatory obligations."

**Fallback**
- "Without undue delay" + named incident contact + escalation path.

**No-go**
- Vague breach language with no timeline or no support obligations.

---

### 6) Audit and assurance artifacts

**Must-have clause**
> "Provider shall provide current SOC 2 Type II report and applicable security/compliance documentation under NDA, plus reasonable support for DPIA/TIA questionnaires."

**Fallback**
- Trust center evidence package + annual refresh.

**No-go**
- Refusal to provide standard enterprise evidence required by counsel/procurement.

---

### 7) Service reliability and support

**Must-have clause**
> "Contract includes defined uptime SLA, support severity levels, response targets, and service-credit remedy."

**Fallback**
- Priority support with response-time commitments in order form.

**No-go**
- Enterprise pricing with no reliability or response commitments.

---

### 8) API/webhook security guarantees

**Must-have clause**
> "All webhooks support signature verification and fixed source IP allowlisting by region; customer can enforce both controls in production."

**Fallback**
- Signature verification mandatory, IP allowlist optional.

**No-go**
- No verifiable webhook authenticity mechanism.

---

### 9) Controller/processor alignment

**Must-have clause**
> "ElevenLabs acts as processor for Customer Personal Data under documented instructions, and customer remains controller for its end-customer relationship."

**Fallback**
- DPA language accepted if it clearly preserves our contractual controller role toward our customers.

**No-go**
- Terms that blur ownership/control and weaken our customer contractual position.

---

## Quick Security Questionnaire (Ask + Required Evidence)

1. Which exact environment will we use (`eu.residency.elevenlabs.io` or other)?
Evidence: provisioning confirmation + endpoint list.

2. Is Zero Retention Mode enabled for our production workspace by default?
Evidence: workspace policy screenshot/export.

3. What is our production retention for transcripts and audio (days)?
Evidence: policy config screenshot.

4. Is enterprise data excluded from generalized model training by contract?
Evidence: signed clause / order-form rider.

5. Which optional features can force out-of-region processing (custom LLM, post-call webhooks, etc.)?
Evidence: written architecture note from solutions/security team.

6. What subprocessors are in path for EU residency?
Evidence: subprocessor list export + effective date.

7. How are new subprocessors notified and objected to?
Evidence: DPA section reference + process URL.

8. What is security incident notification workflow and target timeline?
Evidence: incident response summary + contact channel.

9. What webhook authenticity controls are available?
Evidence: HMAC docs + IP list by region.

10. What SSO, RBAC, API-key scopes, and workspace role controls are available?
Evidence: security admin docs.

11. What SLA and support tiers are included in our enterprise proposal?
Evidence: MSA/order form schedule.

12. What are termination deletion mechanics and confirmation options?
Evidence: DPA clause + operational procedure.

13. Can we export conversation/transcript/analysis data via API/webhooks for our own audit store?
Evidence: API/webhook docs and payload schema.

14. Are there feature limitations when Zero Retention Mode is enabled?
Evidence: product constraints list (especially MCP and advanced integrations).

15. Who is named security/legal contact on their side for procurement escalations?
Evidence: named contacts in deal thread.

---

## Negotiation Script (Call-Ready)

1. "We are fine with ElevenLabs as runtime infrastructure, but we must keep controller position and customer contract ownership."
2. "Please confirm EU residency setup and which features can still cause out-of-region processing."
3. "We need explicit no-training language for enterprise data and production retention set by our policy."
4. "Please send DPA, subprocessor list, SOC 2 package, SLA/support schedule, and security contacts this week."
5. "If these points close, we can move quickly on a paid pilot lane."

---

## Decision Rule

`GO` only if all of the below are true:
1. Must-have redlines are accepted (or approved fallbacks documented).
2. Security questionnaire evidence is received and archived.
3. Sales language is aligned to actual tier promise (`EU-compliant` vs `Germany-only`).

Otherwise: `NO_GO`.

---

## Evidence Mapping Export for NemoClaw Workstream (`NCLAW-018`)

This table is the deterministic export from strategy redlines into operations evidence fields.

| Redline control | Evidence field ID | Workstream artifact target | Gate behavior |
|---|---|---|---|
| EU isolated endpoint + residency boundary | `EL-EU-ENDPOINT` | `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md` (`E-LGL-014`) | Fail closed (`NO_GO`) when missing |
| Zero Retention policy state | `EL-ZERO-RETENTION` | `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md` (`E-LGL-015`) | Fail closed (`NO_GO`) when missing |
| No-training contractual clause | `EL-NO-TRAINING-CLAUSE` | `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md` (`E-LGL-001`) | Fail closed (`NO_GO`) when missing |
| Webhook authenticity controls | `EL-WEBHOOK-AUTH` | `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md` (`E-LGL-016`) | Fail closed (`NO_GO`) when missing |
| Subprocessor notice and objection path | `EL-SUBPROCESSOR-NOTICE` | `apps/nemoclaw-kanzlei-eu/docs/germany_openclaw_hardening/compliance_docs/evidence_register.md` (`E-LGL-002`) | Fail closed (`NO_GO`) when missing |

---

## Implementation Impact: NemoClaw MVP + Compliance Engine (2026-04-01)

### What ElevenLabs Enterprise materially changes

1. ElevenLabs can cover most voice-agent runtime infrastructure (agent execution, audio pipeline, base integrations) as a purchased platform lane.
2. Data residency is real but nuanced: storage can be regional; processing may still go out-of-region unless constrained (for EU: isolated EU environment + Zero Retention Mode + API path + restricted integrations).
3. DPA baseline is enterprise-usable for procurement flow (processor framing, subprocessor notice/objection process, breach cooperation, deletion clauses, audit artifacts), but this does not replace our own controller/customer obligations.

### Keep / White-label / Cut (execution rule)

| Area | Decision | Why |
|---|---|---|
| Voice agent runtime | **White-label ElevenLabs** | Avoid rebuilding speech/agent transport stack; aligns with upstream-first OpenClaw/NemoClaw contract. |
| OpenClaw/NemoClaw deployment hardening (`apps/nemoclaw-kanzlei-eu`) | **Keep** | We still own hosting boundary, isolation, promotion controls, and German customer trust posture. |
| Customer contract + processor chain + evidence pack | **Keep (mandatory)** | Even with enterprise vendor controls, we remain contractual counterparty to our customers. |
| Compliance engine as governance sidecar (`apps/compliance-engine`) | **Keep, but narrow scope** | Worth doing as control-plane/evidence automation; not worth duplicating conversation/runtime layers. |
| Custom telephony/voice transport rebuild | **Cut** | Duplicative with ElevenLabs/OpenClaw voice surfaces. |
| Generic “scan everything in every repo” autonomy project (Phase-heavy scanner ambitions) | **Defer** | Valuable later, but not MVP-critical for Phase 0 legal launch. |

### Minimum engineering we still must own (non-negotiable)

1. Tenant-level compliance policy enforcement and release gating (`GO/NO_GO`) independent of sales claims.
2. Provider evidence lifecycle: DPA/AVV status, TOM evidence, subprocessor registers, readiness reporting.
3. Data-subject operations and auditability under our own system of record (export/delete/audit trail).
4. Legal docs + contract templates for our customers (controller/processor role clarity and subprocessors disclosure).
5. Runtime boundary proof for Germany/EU promises (what is guaranteed vs optional in deployment).

### Scope guardrail for `apps/compliance-engine`

Build only if it strengthens one of these outcomes:
1. Faster closure of legal evidence and onboarding packs.
2. Deterministic release gate that blocks unsafe deployments.
3. Auditable regulator/customer artifacts generated from live provider posture.

If a feature does not move one of those three, do not build it in Phase 0.
