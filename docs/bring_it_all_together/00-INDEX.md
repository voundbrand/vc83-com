# Bring It All Together

> Master plan for turning the l4yercak3 platform into the product the ICP actually needs: a white-labeled AI agent platform that agency owners configure in 30 minutes and charge their SMB clients 199-499 EUR/mo.

**Date:** February 2026
**Branch:** agent_per_org
**ICP:** Agency owners (1-10 people) in DACH managing 10-50 SMB clients

---

## Documents

| # | Document | What It Covers |
|---|----------|---------------|
| 01 | [What We Have](01-WHAT-WE-HAVE.md) | Complete inventory of every built system — agent pipeline, builder, credits, channels, UI |
| 02 | [What the ICP Needs](02-WHAT-THE-ICP-NEEDS.md) | Gap analysis: what's built vs. what the agency owner actually needs to charge the plumber |
| 03 | [System Knowledge Base](03-SYSTEM-KNOWLEDGE.md) | The new system knowledge library — 15 MD files that make agents smart about marketing, StoryBrand, funnels |
| 04 | [Knowledge-Driven Agent Setup](04-AGENT-TEMPLATES.md) | No rigid templates — the system knowledge library IS the template engine. Setup agent generates tailored configs for ANY vertical |
| 05 | [Webchat Widget](05-WEBCHAT-WIDGET.md) | The bridge between builder and agent — embed chat on any v0-generated landing page |
| 06 | [WhatsApp Native](06-WHATSAPP-NATIVE.md) | First-class WhatsApp Business API — the DACH non-negotiable |
| 07 | [White-Label Client Portal](07-WHITE-LABEL-PORTAL.md) | Sub-org client view — the plumber's dashboard |
| 08 | [Credits Wiring](08-CREDITS-WIRING.md) | Connect the credit system to the agent execution pipeline — billing for AI usage |
| 09 | [Builder Setup Mode](09-GUIDED-SETUP-WIZARD.md) | Builder-as-setup-wizard — the builder chat panel in setup mode interviews the agency owner, generates agent config + KB docs using system knowledge |
| 10 | [Priority Sequence](10-PRIORITY-SEQUENCE.md) | What to build and in what order — the critical path to "agency charges plumber 299 EUR/mo" |
| 11 | [Builder-Generated Client Portal](11-BUILDER-PORTAL-TEMPLATE.md) | Portal as a builder template — V0 generates it, connect wires it, Vercel deploys it. Conversations API, sub-org model, agency multi-tenant |

---

## The Big Picture

```
WHAT WE HAVE                          WHAT THE ICP NEEDS
─────────────                          ─────────────────
Agent execution pipeline (13 steps)    System knowledge wired to pipeline
50+ agent tools (CRM, booking, etc)    Knowledge-driven setup (any vertical)
Multichannel routing (8 channels)      WhatsApp native (not connector)
Credit system (balance, deduct, grant) Credits wired to agent pipeline
Builder (v0 chat, scaffold, deploy)    Webchat widget on landing pages
Human-in-the-loop approvals            White-label client portal
Agent config UI                        Builder setup mode (conversational)
System knowledge library (15 files)    Everything connected end-to-end
Stripe checkout + webhooks
```

## The Revenue Path

```
Agency owner signs up (Free/Pro/Agency tier)
    ↓
Clicks "New Agent" → builder opens in setup mode
    ↓
Builder AI (powered by system knowledge library) interviews agency owner
    ↓
Generates tailored config: agent-config.json + 8 KB docs — for ANY vertical
    ↓
Agency reviews files in builder, tweaks via chat ("make the tone more formal")
    ↓
(Optional) "Also build me a client portal" → portal files generated in same session
    ↓
Connect step wires agent config to backend, saves KB docs, binds channels
    ↓
Activates agent (supervised mode)
    ↓
Agent handles inquiries 24/7 on WhatsApp + web
    ↓
Agency charges plumber 299 EUR/mo
    ↓
Platform meters credits, agency pays 29-299 EUR/mo to us
```

---

## Related Docs

- [ICP Definition](../000_NORTH_STAR_ICP/ICP-DEFINITION.md)
- [Key Insights](../000_NORTH_STAR_ICP/synthesis/KEY-INSIGHTS.md)
- [Product Recommendations](../000_NORTH_STAR_ICP/synthesis/PRODUCT-RECOMMENDATIONS.md)
- [New Pricing Plan](../pricing-and-trials/NEW_PRICING_PLAN.md)
- [OpenClaw Pattern Integration](../agentic_system/OPENCLAW_IDEA_INTEGRATION.md)
- [V0 Pipeline Master Plan](../v0_to_l4yercak3_backend/MASTER_PLAN.md)
- [System Knowledge Registry](../../convex/ai/systemKnowledge/index.ts)
