# 10 — Priority Sequence

> What to build and in what order. The critical path to "agency charges plumber 299 EUR/mo."

---

## The Principle

Build the minimum that lets one agency owner set up one client and charge them. Then iterate.

---

## The Sequence

### Phase 1: Make It Billable

**Goal:** Agent runs, credits are consumed, agency is billed.

| # | Task | Doc | Effort | Depends On |
|---|------|-----|--------|------------|
| 1.1 | Wire credits to agent execution pipeline | [08](08-CREDITS-WIRING.md) | Small | Nothing |
| 1.2 | Verify Stripe products/prices are configured | [08](08-CREDITS-WIRING.md) | Small | Nothing |
| 1.3 | Credit wall + low-credit notifications | [08](08-CREDITS-WIRING.md) | Small | 1.1 |
| 1.4 | Per-agent credit usage display | [08](08-CREDITS-WIRING.md) | Medium | 1.1 |

**Outcome:** When an agent handles a conversation, credits are deducted. When credits run out, agent gracefully stops. Agency can buy more credits or upgrade tier.

**Why first:** Without billing, everything else is a demo.

---

### Phase 2: Make It Fast

**Goal:** Agency can set up a client agent in 30 minutes, not 2 hours.

| # | Task | Doc | Effort | Depends On |
|---|------|-----|--------|------------|
| 2.1 | Wire system knowledge into agent pipeline (SETUP_MODE + CUSTOMER_MODE loading) | [03](03-SYSTEM-KNOWLEDGE.md), [04](04-AGENT-TEMPLATES.md) | Small | Nothing |
| 2.2 | Knowledge base from media library (agent reads org docs) | [03](03-SYSTEM-KNOWLEDGE.md) | Medium | Nothing |
| 2.3 | Builder setup mode (builder chat panel as setup wizard) | [09](09-GUIDED-SETUP-WIZARD.md) | Small-Medium | 2.1 |
| 2.4 | KB document generation (builder AI generates 8 docs + agent-config.json per client) | [04](04-AGENT-TEMPLATES.md) | Medium | 2.1, 2.2, 2.3 |

**Outcome:** Agency clicks "New Agent" → builder opens in setup mode → AI interviews agency owner → generates agent-config.json + 8 KB docs (visible in file explorer) → connect step creates agent + saves KB docs. Works for ANY vertical. Optionally generates a client portal in the same session.

**Why second:** Without fast setup, agencies won't activate. Activation = retention.

---

### Phase 3: Make It Reachable

**Goal:** The agent is deployed on WhatsApp and/or a landing page.

| # | Task | Doc | Effort | Depends On |
|---|------|-----|--------|------------|
| 3.1 | WhatsApp manual credential entry (Phase 1) | [06](06-WHATSAPP-NATIVE.md) | Small | Nothing |
| 3.2 | Webchat widget (React component + public API) | [05](05-WEBCHAT-WIDGET.md) | Medium | Nothing |
| 3.3 | Scaffold integration (widget in builder apps) | [05](05-WEBCHAT-WIDGET.md) | Small | 3.2 |
| 3.4 | WhatsApp Embedded Signup (self-service) | [06](06-WHATSAPP-NATIVE.md) | Medium | 3.1 |

**Outcome:** Customer messages agent on WhatsApp OR via webchat on landing page. Both routes hit the same agent pipeline. Agency can sell "AI employee on WhatsApp" (199 EUR) or "AI employee + website" (399 EUR).

**Why third:** Without a channel, the agent has no customers to talk to.

---

### Phase 4: Make It Professional

**Goal:** The plumber has their own branded dashboard.

| # | Task | Doc | Effort | Depends On |
|---|------|-----|--------|------------|
| 4.1 | Sub-org model (parent-child orgs) | [07](07-WHITE-LABEL-PORTAL.md) | Medium | Nothing |
| 4.2 | Client role + permissions | [07](07-WHITE-LABEL-PORTAL.md) | Small | 4.1 |
| 4.3 | Agency dashboard (all-clients view) | [07](07-WHITE-LABEL-PORTAL.md) | Medium | 4.1 |
| 4.4 | Client portal (conversations + bookings) | [07](07-WHITE-LABEL-PORTAL.md) | Large | 4.1, 4.2 |
| 4.5 | White-label config (logo, colors) | [07](07-WHITE-LABEL-PORTAL.md) | Small | 4.4 |

**Outcome:** Plumber logs into `portal.agency-name.com`, sees branded dashboard with conversations, bookings, leads. Agency manages all clients from one view.

**Why fourth:** The product works without this (agency can show clients the agent config UI). But this is what makes it a *professional* product that agencies can charge premium for.

---

### Phase 5: Make It Scale

**Goal:** Advanced features that increase retention and upsell.

| # | Task | Doc | Effort | Depends On |
|---|------|-----|--------|------------|
| 5.1 | WhatsApp message templates + outbound | [06](06-WHATSAPP-NATIVE.md) | Medium | 3.4 |
| 5.2 | Follow-up sequence automation | [03](03-SYSTEM-KNOWLEDGE.md) | Medium | 2.1 |
| 5.3 | Instagram DM automation | — | Large | Phase 3 |
| 5.4 | Review request automation | — | Medium | Phase 3 |
| 5.5 | Voice agent / AI phone answering | — | Large | Phase 1-3 |
| 5.6 | Custom domains for client portals | [07](07-WHITE-LABEL-PORTAL.md) | Medium | 4.5 |
| 5.7 | Setup agent improvement (learns from successful setups) | — | Medium | Phase 2 |

---

## Visual Timeline

```
PHASE 1: MAKE IT BILLABLE
├── 1.1 Wire credits ─────────── ■■□
├── 1.2 Stripe config ─────────── ■□□
├── 1.3 Credit wall ──────────── ■■□
└── 1.4 Usage display ─────────── ■■■□

PHASE 2: MAKE IT FAST
├── 2.1 System knowledge wiring ── ■■□
├── 2.2 Media KB integration ───── ■■■□
├── 2.3 Builder setup mode ────── ■■■□
└── 2.4 KB doc generation ─────── ■■■□

PHASE 3: MAKE IT REACHABLE
├── 3.1 WhatsApp manual ────────── ■■□
├── 3.2 Webchat widget ─────────── ■■■■□
├── 3.3 Scaffold integration ───── ■□
└── 3.4 WhatsApp self-service ──── ■■■□

PHASE 4: MAKE IT PROFESSIONAL
├── 4.1 Sub-org model ─────────── ■■■□
├── 4.2 Client role ──────────── ■■□
├── 4.3 Agency dashboard ────────  ■■■□
├── 4.4 Client portal ──────────── ■■■■■■□
└── 4.5 White-label ──────────── ■■□

PHASE 5: MAKE IT SCALE
├── 5.1 WA templates ──────────── ■■■□
├── 5.2 Follow-up sequences ───── ■■■□
├── 5.3 Instagram DM ──────────── ■■■■■□
└── ...
```

---

## The Minimum Viable Product

If you had to ship tomorrow, what's the absolute minimum?

```
✅ Agent execution pipeline (EXISTS)
✅ Agent config UI (EXISTS)
✅ 50+ tools (EXISTS)
✅ Credit system (EXISTS)
✅ System knowledge library (EXISTS — 15 files + registry)
→  Wire credits to pipeline (Phase 1.1)
→  Wire system knowledge into agent pipeline (Phase 2.1)
→  WhatsApp manual connection (Phase 3.1)
```

That's **3 small tasks** to get from "demo" to "billable product."

Note what changed: the old MVP required building a plumber template (400+ lines of hardcoded config). The new MVP uses the system knowledge library — which is already built — to dynamically generate the config through conversation in the builder. Less code, more intelligence, works for any vertical. The builder already has chat, file generation, preview, and deploy — adding "agent setup" is just adding a new mode.

Everything else makes it better. But this makes it real.

---

## Cross-References

| Phase | Revenue Impact | Retention Impact | Effort |
|-------|---------------|------------------|--------|
| Phase 1 | **Critical** — enables billing | Low | Small |
| Phase 2 | High — reduces setup friction | **High** — activation drives retention | Medium |
| Phase 3 | **Critical** — enables customer reach | Medium | Medium |
| Phase 4 | Medium — justifies premium pricing | **Critical** — professional = sticky | Large |
| Phase 5 | Medium — upsell features | High — more value = less churn | Large |
