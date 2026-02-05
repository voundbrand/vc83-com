# 02 — What the ICP Needs

> Gap analysis between what's built and what the agency owner needs to charge their plumber client 299 EUR/mo.

---

## The ICP Scenario

**Agency owner** (marketing agency, 3 people, DACH region, manages 25 SMB clients) opens the platform. They want to set up an AI agent for **Schmidt Sanitär** (a plumber in Munich). The plumber will pay 299 EUR/mo for "an AI employee that answers WhatsApp, books appointments, and follows up on leads."

### What the agency owner does today (manual)
1. Answers Schmidt's WhatsApp at 11pm
2. Books appointments in Google Calendar
3. Follows up with leads who didn't book
4. Posts on Schmidt's social media
5. Manages Schmidt's Google reviews

### What they want the agent to do
1. Answer WhatsApp inquiries 24/7 in German
2. Book appointments based on availability
3. Follow up with leads who went cold
4. Provide estimates based on service list
5. Capture new leads into CRM

---

## Gap Analysis

### What works RIGHT NOW

| Task | Can the platform do it? | How? |
|------|------------------------|------|
| Create an agent for Schmidt | Yes | `agentOntology.createAgent` |
| Set German language + personality | Yes | Config fields: language, personality, brandVoiceInstructions |
| Add FAQ entries | Yes | Config field: faqEntries array |
| Agent answers customer questions | Yes | LLM + system prompt + FAQ |
| Agent books appointments | Yes | booking tools in registry |
| Agent creates CRM contacts | Yes | CRM tools in registry |
| Agent sends follow-up emails | Yes | email tools in registry |
| Human approves agent actions | Yes | Approval system with 24h expiry |
| Track agent usage/costs | Yes | Session stats + credit transactions |
| Bill the agency owner | Yes | Stripe subscriptions + credit packs |

### What DOESN'T work yet

| Gap | Impact | Why It Matters |
|-----|--------|----------------|
| **System knowledge not wired to pipeline** | Setup agent can't use the frameworks | The 15-file system knowledge library exists but isn't loaded into the agent pipeline yet. Without it, agents can't dynamically generate tailored configs. |
| **No builder setup mode** | Agency must know all config fields | Intimidating for non-technical agency owners. High abandonment. |
| **No WhatsApp self-service onboarding** | Can't "just connect a number" | Agency needs to manually configure Chatwoot or WhatsApp provider. DACH dealbreaker. |
| **Credits not wired** | Agent runs for free / breaks | No billing = no revenue. Or: credit check fails and agent stops. |
| **No webchat widget** | Builder pages can't talk to agents | The "AI employee + website" package doesn't work. No chat on landing pages. |
| **No client portal** | Plumber can't see their own data | Agency must screenshot conversations. Unprofessional. Churn risk. |
| **No knowledge base from media library** | Agent can't read org documents | Client's price list, FAQ, service descriptions are in media library but agent can't access them as context. |

---

## The 7 Gaps, Ranked by Revenue Impact

### Tier 1: Can't charge without these
1. **Credits wiring** — No billing = no revenue
2. **WhatsApp native onboarding** — "Connect your number" must be self-service
3. **System knowledge wiring** — The 15-file library exists but isn't connected to the agent pipeline yet. This IS the template engine — once wired, the setup agent can generate tailored configs for any vertical

### Tier 2: Can't retain without these
4. **Builder setup mode** — Conversational setup in the builder, powered by the knowledge library
5. **Webchat widget** — Complete the "agent + website" package
6. **Knowledge base from media library** — Agent reads org documents for deeper context

### Tier 3: Can't scale without these
7. **White-label client portal** — Plumber sees branded dashboard

---

## The "25-Minute Setup" Flow (Target State)

> **UPDATE 2026-02-03:** This flow now happens entirely within the builder chat panel in "setup mode." No standalone wizard component — the builder IS the setup wizard. See [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md) for full architecture.

```
Agency clicks "New Agent" → builder opens in SETUP MODE
  → Builder AI greets: "Let's set up your AI agent. What kind of business is this for?"

INTERVIEW PHASE (conversational, ~10 min in the builder chat)
  → Builder AI loads all 15 system knowledge files (SETUP_MODE)
  → Interviews agency owner using StoryBrand, hero/guide frameworks
  → Generates files as it goes (visible in builder file explorer):
    - agent-config.json (system prompt, FAQ, tools, channels)
    - 8 KB documents (hero-profile, guide-profile, plan-and-cta, etc.)
  → Works for ANY vertical — plumber, salon, driving school, yoga studio

REVIEW PHASE (still in builder chat)
  → Agency reviews generated files, edits via chat or direct file editing
  → "Make the language more formal" → AI updates files

OPTIONAL: PORTAL GENERATION (same builder session!)
  → "Also build me a client portal" → portal pages generated in same session

CONNECT PHASE (existing builder connect step)
  → Agent created via agentOntology, KB docs saved to media library
  → Channels wired: WhatsApp, webchat, email

DEPLOY + ACTIVATE
  → Agent activated (supervised mode by default)
  → If portal: published to Vercel
```

---

## What Each Gap Doc Covers

Each gap has its own detailed document:

- [03-SYSTEM-KNOWLEDGE.md](03-SYSTEM-KNOWLEDGE.md) — The knowledge base system
- [04-AGENT-TEMPLATES.md](04-AGENT-TEMPLATES.md) — Knowledge-driven agent setup (replaces rigid templates)
- [05-WEBCHAT-WIDGET.md](05-WEBCHAT-WIDGET.md) — Chat widget architecture
- [06-WHATSAPP-NATIVE.md](06-WHATSAPP-NATIVE.md) — WhatsApp Business API plan
- [07-WHITE-LABEL-PORTAL.md](07-WHITE-LABEL-PORTAL.md) — Client portal architecture
- [08-CREDITS-WIRING.md](08-CREDITS-WIRING.md) — Connecting credits to agent pipeline
- [09-GUIDED-SETUP-WIZARD.md](09-GUIDED-SETUP-WIZARD.md) — Builder setup mode (replaces standalone wizard)
- [10-PRIORITY-SEQUENCE.md](10-PRIORITY-SEQUENCE.md) — Build order
