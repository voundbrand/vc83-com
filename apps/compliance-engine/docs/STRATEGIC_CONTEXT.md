# Strategic Context: Compliance Engine

> This document captures the full reasoning, insights, and product vision behind
> the compliance engine. It serves as a living knowledge base for anyone building
> on or extending this project.

---

## 1. Origin Story: Why a Standalone Compliance Engine?

### The Problem: Main Platform Is Too Large to Certify

The vc83 platform is ~520K lines of code with **37+ external services** (Convex,
Stripe, OpenAI, ElevenLabs, Twilio, Resend, PostHog, Sentry, etc.). At least
20 of these are US-based providers requiring Standard Contractual Clauses (SCCs)
and Transfer Impact Assessments (TIAs) under GDPR Art 44-49.

For regulated German professions (**§203 StGB Berufsgeheimnisträger** — lawyers,
tax advisors, pharmacists, doctors, notaries, auditors), this service surface is
too large to certify. Each external service needs a signed DPA (AVV), documented
TOMs, and transfer mechanism. The compliance audit scope becomes unmanageable.

### What We Found

The vc83 platform already has **9,979 lines of compliance code** across 5 files:

| File | Lines | Problem |
|------|-------|---------|
| `convex/complianceControlPlane.ts` | 4,166 | Imports rbacHelpers, objects table, 12+ Convex APIs |
| `convex/complianceEvidenceVault.ts` | 1,961 | Depends on media upload, RBAC, Convex storage |
| `convex/complianceOutreachAgent.ts` | 2,044 | Coupled to AI runtime, email provider, templates |
| `convex/complianceTransferWorkflow.ts` | 771 | Reads provider data from Convex objects table |
| `convex/complianceSecurityWorkflow.ts` | 769 | Tied to organization settings ontology |
| `convex/consent.ts` | 268 | Cleanest module, but still Convex-native |

**Conclusion:** This code cannot be extracted without pulling in the entire
platform's dependency graph. The compliance code assumes Convex runtime, RBAC
helpers, polymorphic objects table, and AI model adapters.

### The Solution: Build Fresh, Build Small

Instead of extracting, we build a **purpose-built standalone engine**:

- **Zero external dependencies** (no SaaS, no cloud APIs)
- **SQLite + local encrypted vault** (auditable, portable)
- **Single Docker container** (auditor-friendly surface area)
- **Pluggable framework rules** (YAML-based, not code-coupled)

Audit surface drops from 37+ services to **1-2** (Hetzner hosting + optional LLM).

---

## 2. Three Converging Ideas

### 2.1 Hormozi's Workflow-Based Thinking

From Alex Hormozi's "How to Win With AI in 2026":

> "Everyone focuses on AI agents doing conversations. But the real money is in
> agents that do workflows. A conversation is one interaction — a workflow is
> the entire business process."

Key insight: AI agents for regulated professions don't just need to chat — they
need to manage **compliance workflows**: consent collection, audit logging, data
subject request handling, evidence gathering, provider DPA tracking.

The compliance engine IS the workflow layer. It doesn't replace the agent
runtime — it gives agents the compliance infrastructure to operate legally.

### 2.2 Steinberger's "Install and Build from Day One"

From the Peter Steinberger (OpenClaw) interview:

> "I have this vision where you install the software and it's already building
> things for you from day one. It understands your business, configures itself,
> and starts creating value immediately."

For regulated professions, "install and it works" means:
- Drop in the compliance sidecar alongside OpenClaw/NemoClaw
- Framework rules (GDPR, §203 StGB) are pre-loaded
- Agent gets consent-checking tools automatically via the plugin
- Audit trail starts recording from the first interaction

No manual compliance configuration. **Fail-closed by default** — unknown state
means blocked, not allowed.

### 2.3 Three-Layer Architecture

We arrived at a clean separation of concerns:

```
┌──────────────────────────────────────────────┐
│           OpenClaw Agent Runtime              │
│  (AI agents, skills, tools, conversations)   │
├──────────────────────────────────────────────┤
│           NemoClaw Security Sandbox           │
│  (Landlock FS, deny-by-default network,      │
│   credential isolation, OpenShell transport)  │
├──────────────────────────────────────────────┤
│     Compliance Engine (this project)          │
│  (GDPR, §203 StGB, audit trail, consent,     │
│   encrypted evidence vault, DSR handling)     │
└──────────────────────────────────────────────┘
```

- **OpenClaw** = the brains (agent runtime, 53 skills, 30+ tools, SOUL.md)
- **NemoClaw** = the locks (sandbox security, process isolation)
- **Compliance Engine** = the rules (data protection, regulatory compliance)

Each layer is independently deployable, independently auditable.

---

## 3. Target Market: §203 StGB Regulated Professions

All target professions are **Berufsgeheimnisträger** (professional secret
carriers) under German §203 StGB. Unauthorized disclosure of client information
is a **criminal offense** punishable by up to 1 year imprisonment.

| Profession | German Name | Key Regulation | Estimated Market DE |
|------------|------------|----------------|---------------------|
| Law firms | Kanzleien | §203 StGB, BRAO §43a | ~67,000 firms |
| Tax advisors | Steuerberater | §203 StGB, StBerG §62a | ~55,000 firms |
| Pharmacies | Apotheken | §203 StGB, ApoG | ~18,000 pharmacies |
| Doctors | Ärzte | §203 StGB, MBO-Ä §9 | ~100,000 practices |
| Notaries | Notare | §203 StGB, BNotO | ~7,000 offices |
| Auditors | Wirtschaftsprüfer | §203 StGB, WPO §43 | ~3,000 firms |

**Total addressable:** ~250,000 regulated practices in Germany alone.

### Why These Professions Specifically?

1. **Legal obligation**: They MUST protect client data or face criminal liability
2. **AI adoption lag**: Most still use fax and paper — massive efficiency gap
3. **High willingness to pay**: Compliance isn't optional, it's existential
4. **Cascading trust**: One successful Kanzlei deployment becomes a reference
   for the entire legal profession

### Critical Regulatory Requirements

For ALL these professions:
- **GDPR/DSGVO**: Full data protection (consent, minimization, retention, rights)
- **§203 StGB**: Criminal secrecy obligations (stricter than GDPR)
- **AVV/DPA**: Art 28 data processing agreements with ALL subprocessors
- **TOMs**: Documented technical and organizational measures (Art 32)

For **Kanzleien** specifically:
- **BRAO §43a**: Professional obligation of secrecy
- **§203 StGB Para 3**: New provision allowing subprocessor disclosure ONLY
  with explicit DPA that references §203

For **Steuerberater** specifically:
- **StBerG §62a**: Subprocessor rules specifically for tax advisors
- Must maintain separate AVV compliance for each cloud service

### EU AI Act Deadline

**August 2, 2026**: High-risk AI system requirements take effect.
- AI agents handling legal/medical/financial client data = likely high-risk
- Requires: risk assessment, conformity assessment, human oversight documentation
- The compliance engine's framework system supports AI Act rules

---

## 4. Product Vision

### Why This Could Be a Product

No existing product handles the intersection of:
- **DSGVO/GDPR** compliance for AI agent runtimes
- **§203 StGB** professional secrecy enforcement
- **EU AI Act** risk classification and documentation
- **Zero-dependency** (no SaaS, no cloud, local-only)

Existing tools (OneTrust, Cookiebot, etc.) focus on website consent banners.
They don't understand AI agent workflows, tool calls, or multi-turn
conversations that process personal data.

### Product Tiers

| Tier | Audience | License | What's Included |
|------|----------|---------|-----------------|
| **Community** | Solo practitioners, OSS projects | Apache 2.0 | Core engine, GDPR framework, basic audit trail |
| **Professional** | Small-medium firms | Commercial | + §203 StGB rules, encrypted vault, PII detection, premium frameworks |
| **Enterprise** | Large firms, compliance departments | Commercial + Support | + Custom frameworks, multi-instance management, compliance reporting, SLA |

### Architecture Principles

1. **Fail-closed**: Unknown state = blocked. Unreachable sidecar = agent cannot start
2. **Zero external dependencies**: No SaaS, no cloud APIs, everything local
3. **Pluggable frameworks**: Drop a YAML folder to add a new compliance regime
4. **Append-only audit**: Events are never deleted, only soft-expired
5. **Encrypted at rest**: AES-256-GCM for evidence vault, optional DB encryption
6. **Docker-first**: Single container, persistent volume, localhost-only API

---

## 5. Technical Architecture

### Sidecar HTTP Service

```
localhost:3335
├── GET  /healthz                    # Liveness probe
├── GET  /readyz                     # Readiness (DB check)
├── POST /api/v1/consent             # Record consent decision
├── GET  /api/v1/consent?subject=... # Query consent status
├── POST /api/v1/audit               # Append audit event
├── GET  /api/v1/audit?subject=...   # Query audit trail
├── POST /api/v1/evidence            # Store encrypted artifact
├── GET  /api/v1/evidence/:id        # Retrieve artifact metadata
├── POST /api/v1/providers           # Register subprocessor
├── GET  /api/v1/providers           # List providers + DPA status
├── PATCH /api/v1/providers/:id      # Update provider status
├── POST /api/v1/subjects            # Register data subject
├── GET  /api/v1/subjects/:id        # Get subject info
├── DELETE /api/v1/subjects/:id      # Art 17 erasure request
├── GET  /api/v1/subjects/:id/export # Art 20 data portability
├── POST /api/v1/evaluate            # Evaluate policy rules
├── GET  /api/v1/reports/summary     # Compliance posture report
└── POST /api/v1/pii/scan            # PII detection scan
```

### Database (SQLite, WAL mode)

6 tables covering the full GDPR lifecycle:
- `schema_version` — migration tracking
- `consent_records` — Art 6/7 legal basis and consent decisions
- `audit_events` — append-only event log (every agent action)
- `evidence_artifacts` — metadata index for encrypted vault files
- `provider_registry` — Art 28 subprocessor DPA tracking
- `data_subjects` — DSR tracking (erasure, export status)

### Framework Rule System (YAML)

```yaml
# frameworks/gdpr/consent.yaml
rules:
  - id: gdpr.consent.required
    description: "GDPR Art 6/7 - Valid consent required for data processing"
    severity: block
    condition:
      type: requires_consent
      consent_type: data_processing
      legal_basis:
        - art6_1a   # Explicit consent
        - art6_1b   # Contract performance
        - art6_1f   # Legitimate interest
    action:
      type: deny
      message: "No valid legal basis for data processing"
```

Pluggable: drop a folder in `frameworks/` → engine picks it up automatically.

### OpenClaw Plugin Bridge

The plugin (~300 LOC) bridges the sidecar to the OpenClaw agent runtime:

**Tools registered:**
- `consent_check` — verify consent before processing
- `audit_log` — record agent actions
- `data_export` — Art 20 data portability
- `data_delete` — Art 17 right to erasure

**Hooks:**
- `before_agent_start` — verify sidecar reachable + consent valid (fail-closed)
- `agent_end` — flush audit buffer, record session summary

**Commands:**
- `/compliance` — slash command showing compliance status dashboard

---

## 6. Comparison: vc83 Compliance Code vs. Standalone Engine

| Aspect | vc83 Compliance Code | Standalone Engine |
|--------|---------------------|-------------------|
| Lines of code | 9,979 | Target: ~2,500 |
| External dependencies | 37+ services | 0 |
| Runtime | Convex (cloud-native) | Node.js + SQLite (local) |
| Database | Convex tables (polymorphic) | SQLite (WAL, encrypted) |
| Framework support | GDPR only (partially) | GDPR, §203, StBerG, AI Act |
| Audit surface | Entire vc83 platform | Single Docker container |
| Deployability | Coupled to vc83 | Any OpenClaw/NemoClaw instance |
| Certifiability | Impractical (too large) | Designed for audit |

---

## 7. Open Questions & Future Thinking

### Immediate (This Sprint)
- [ ] How does the plugin communicate sidecar URL to agents at boot time?
- [ ] What's the retention policy for audit events? (GDPR says "not forever")
- [ ] Should the PII detector support custom patterns per industry?

### Near-Term (Next Month)
- [ ] Multi-tenant mode: one engine serving multiple OpenClaw instances?
- [ ] Integration with NemoClaw's network policy for real-time blocking?
- [ ] Webhook/callback support for compliance events?

### Long-Term (Product)
- [ ] Cloud-managed option for firms that don't want to self-host?
- [ ] Compliance-as-a-service API for SaaS platforms?
- [ ] Automated DPA generation from provider registry data?
- [ ] Integration with German bar association (BRAK) / tax advisor chamber (BStBK)?

---

## 8. Key References

- **GDPR/DSGVO**: Regulation (EU) 2016/679
- **§203 StGB**: German Criminal Code, professional secrecy
- **§203 StGB Para 3**: 2017 amendment allowing subprocessor disclosure with DPA
- **StBerG §62a**: Tax Advisory Act, subprocessor provisions
- **EU AI Act**: Regulation (EU) 2024/1689, high-risk deadline Aug 2, 2026
- **OpenClaw**: https://github.com/anthropics/openai-assistant (open source agent runtime)
- **NemoClaw**: NVIDIA reference stack for sandboxed AI agents
- **BRAO §43a**: Federal Lawyers' Act, secrecy obligation
- **Art 28 GDPR**: Data Processing Agreement requirements
- **Art 30 GDPR**: Records of Processing Activities (ROPA)
- **Art 32 GDPR**: Security of processing (TOMs)
- **Art 44-49 GDPR**: Third-country transfer mechanisms

---

*Last updated: 2026-03-31*
*This document is part of the compliance-engine project under apps/compliance-engine/*
