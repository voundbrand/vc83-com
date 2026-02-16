# Agent Platform — Master Plan

> Turn L4YERCAK3 from "tools businesses operate" into "an agent that operates the tools for them."

## The Play

GoHighLevel gives businesses CRM + messaging + automations they run manually. We give them an **AI agent** that:

1. **Talks to their customers** across every channel (WhatsApp, email, SMS, Instagram DM, etc.)
2. **Talks to their data** (natural language queries across CRM, bookings, products, revenue)
3. **Creates content** (social media posts, email campaigns, tailored to their brand voice)
4. **Acts autonomously** within guardrails (with human-in-the-loop controls)
5. **Interacts with other agents** (the Moltbook/OpenClaw pattern — agents representing businesses communicating with each other)

---

## Phase Overview

| Doc | What |
|-----|------|
| **[Strategy & Positioning](./STRATEGY_AND_POSITIONING.md)** | Why this wins — OpenClaw proved the pattern, we build the enterprise-grade version |

| Phase | What | Depends On | Key Deliverables |
|-------|------|------------|------------------|
| **[Phase 1](./PHASE_1_AGENT_PER_ORG.md)** | Agent-Per-Org Architecture | Existing AI chat + ontology | Agent config, data query tool, execution pipeline, approval UI |
| **[Phase 2](./PHASE_2_CHANNEL_CONNECTORS.md)** | Channel Connectors | Phase 1 + existing multichannel specs | Chatwoot integration, social media connectors, inbound routing |
| **[Phase 3](./PHASE_3_CONTENT_GENERATION.md)** | Content Generation | Phase 1 + Phase 2 channels | Brand voice, content generator, calendar, publisher, analytics |

---

## What Already Exists (don't rebuild)

### Built & Working
- AI chat with 12+ tools (`convex/ai/chat.ts`, `convex/ai/tools/registry.ts`)
- Universal ontology with tenant isolation (`convex/schemas/ontologySchemas.ts`)
- CRM (contacts, orgs, pipelines) (`convex/crmOntology.ts`)
- Email delivery via Resend (`convex/emailService.ts`)
- Sequence engine skeleton (`convex/sequences/`)
- OAuth infrastructure for external services (`convex/oauth/`)
- Webhook endpoints (`convex/http.ts`)
- Media library (`convex/mediaLibrary/`)
- Builder / code generation system

### Spec'd & Ready to Implement
- Multichannel automation architecture → `docs/plans/multichannel-automation/`
  - [README.md](../plans/multichannel-automation/README.md) — Overview
  - [ARCHITECTURE.md](../plans/multichannel-automation/ARCHITECTURE.md) — System design
  - [SCHEMA.md](../plans/multichannel-automation/SCHEMA.md) — Database tables
  - [SEQUENCES.md](../plans/multichannel-automation/SEQUENCES.md) — Pre-configured sequences
  - [CONNECTIONS.md](../plans/multichannel-automation/CONNECTIONS.md) — Resend + Infobip UI
  - [INFOBIP-INTEGRATION.md](../plans/multichannel-automation/INFOBIP-INTEGRATION.md) — SMS/WhatsApp delivery
  - [IMPLEMENTATION-CHECKLIST.md](../plans/multichannel-automation/IMPLEMENTATION-CHECKLIST.md) — Build phases
- WhatsApp Business API setup → `docs/integrations/WHATSAPP_SETUP.md`
- Agent-first architecture → `docs/AGENT_FIRST_ARCHITECTURE.md`
- MCP server architecture → `docs/MCP_SERVER_ARCHITECTURE.md`
- Open-source strategy → `docs/open-source-exploration/OPEN-SOURCE-STRATEGY.md`

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Chatbot platform** | Chatwoot (open-source) | No ManyChat dependency. Self-hostable. MIT licensed. Multi-channel. |
| **SMS provider** | Infobip | Already spec'd. Good DACH coverage. |
| **WhatsApp** | Meta Cloud API direct | Per-org OAuth. Meta bills orgs directly. Already spec'd. |
| **Email** | Resend | Already integrated and working. |
| **Social posting** | Direct APIs (Meta, X, LinkedIn) | No middleman. Full control. |
| **LLM provider** | OpenRouter (multi-LLM) | Already integrated. Model flexibility. |
| **Data model** | Ontology objects | Everything in one flexible system. Already tenant-isolated. |
| **OpenClaw** | Reference/inspiration only | Not a runtime dependency. Cherry-pick patterns, not code. |

---

## What to Deprecate

| Current | Replace With | When |
|---------|-------------|------|
| `convex/integrations/manychat.ts` | Chatwoot integration | Phase 2, Step 1 |
| `convex/integrations/pushover.ts` | Chatwoot notifications + native | Phase 2, Step 1 |
| ManyChat webhook in `convex/http.ts` | Chatwoot webhook | Phase 2, Step 1 |

---

## Build Order (recommended)

```
Phase 1, Step 1: Agent Config Object (org_agent in ontology)
Phase 1, Step 2: Data Query Tool (talk to your data)
Phase 1, Step 3: Agent Execution Pipeline
    │
    ├── Phase 2, Step 1: Chatwoot Core Integration (unified inbox)
    ├── Phase 2, Step 2: Implement multichannel specs (Resend, Infobip, WhatsApp)
    │
Phase 1, Step 4: Agent Session Management
Phase 1, Step 5: Human-in-the-Loop UI
    │
    ├── Phase 2, Step 3: CRM ↔ Chatwoot Sync
    ├── Phase 2, Step 4: Social Media Connectors (IG, FB, X, LI)
    │
    ├── Phase 3, Step 1: Brand Voice Profile
    ├── Phase 3, Step 2: Content Generator Tool
    ├── Phase 3, Step 3: Content Calendar UI
    ├── Phase 3, Step 4: Publisher & Scheduler
    ├── Phase 3, Step 5: Analytics & Feedback Loop
```

---

## OpenClaw Reference Material

The OpenClaw repo is cloned at `/Users/foundbrand_001/Development/openclaw/` for reference. Key patterns we can learn from:

| Pattern | OpenClaw | Our Adaptation |
|---------|----------|---------------|
| Channel abstraction | `src/channels/registry.ts` | Channel connector interface |
| Tool policies | `src/agents/tool-policy.ts` | Agent enabledTools/disabledTools |
| Session isolation | `src/gateway/session-utils.ts` | Per-org, per-channel sessions |
| Agent config | `src/config/agents.ts` | org_agent ontology object |
| Approval flow | `src/gateway/server-methods/exec-approval.ts` | Human-in-the-loop queue |
| Skill system | `skills/*/SKILL.md` | Brand voice + custom knowledge |
| Multi-account | Channel account configs | Per-org credential isolation |

**Important**: OpenClaw is single-user/self-hosted. We're building multi-tenant SaaS. We use their patterns, not their code.

---

## The Moltbook/Agent-to-Agent Future

Once each org has an agent (Phase 1) that can communicate (Phase 2) and create content (Phase 3), the next frontier is **agent-to-agent interaction**:

- Business A's agent finds Business B's agent for a partnership
- Agents negotiate bulk bookings between complementary businesses
- Cross-promotion happens agent-to-agent (sailing school agent + vacation house agent)
- This is what Moltbook (moltbook.com) is pioneering — a social network for agents

This is Phase 4+ territory, but the architecture from Phases 1-3 sets the foundation.

---

## Related Documentation

- [Multichannel Automation](../plans/multichannel-automation/README.md) — The delivery engine
- [Agent-First Architecture](../AGENT_FIRST_ARCHITECTURE.md) — The design philosophy
- [MCP Server Architecture](../MCP_SERVER_ARCHITECTURE.md) — External agent access
- [Open Source Strategy](../open-source-exploration/OPEN-SOURCE-STRATEGY.md) — Business model
- [Builder Pro Funnel](../BUILDER_PRO_FUNNEL_PLAN.md) — Monetization
- [Security Audit](../security_and_speed_audit/AUDIT_REPORT.md) — Must-fix before agent access
