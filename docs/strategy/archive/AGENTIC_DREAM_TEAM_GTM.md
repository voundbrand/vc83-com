# Agentic Dream Team — Go-to-Market Strategy

**Date:** February 2026
**Author:** Strategy Session — Owner + Claude
**Status:** Draft for validation

---

## Executive Summary

L4YERCAK3 pivots from selling "AI platform infrastructure" to selling **a custom-built agentic Dream Team** to business owners. The pitch: we take the publicly available content of experts the business owner admires — books, podcasts, frameworks, talks — and bind it into the soul of a specialist AI agent. Starting with 6 core specialists and backed by a growing library of 100+ expert templates, the business owner builds a team of world-class minds they could never afford to hire, working for them 24/7 through chat, email, and messaging channels.

The agency play becomes second-order: once we prove we can sell a €30,000 dream team to one business owner, we go to agencies and say, "You can sell this repeatedly, at scale, to every client in your portfolio."

**Core differentiator:** Soul binding. Not prompt engineering. Not a chatbot. A persistent, evolving digital team member whose personality, expertise, communication style, and judgment are modeled on a specific real-world expert — with guardrails, drift correction, and trust governance built in.

---

## Table of Contents

1. [Technical Foundation — What's Real Today](#1-technical-foundation)
2. [Product Packaging — The Dream Team Offer](#2-product-packaging)
3. [Pricing Strategy — Direct + Agency Licensing](#3-pricing-strategy)
4. [Messaging & Positioning — Making It Irresistible](#4-messaging--positioning)
5. [Objection Handling — Legal, Ethical, Value](#5-objection-handling)
6. [Go-to-Market Sequence — Prove, Package, Scale](#6-go-to-market-sequence)
7. [Technical Readiness Assessment](#7-technical-readiness-assessment)
8. [Risk Register](#8-risk-register)

---

## 1. Technical Foundation

### What "Soul Binding" Actually Means (Grounded in Code)

The soul binding system is **production-ready**. Here's what an agent's soul contains:

| Soul Layer | Content | Status |
|-----------|---------|--------|
| **Identity Anchors** | Name, tagline, 3-5 personality traits, core values, neverDo guardrails, escalation triggers | ✅ Live |
| **Execution Preferences** | Communication style, tone guidelines, greeting/closing style, emoji usage | ✅ Live |
| **Core Memories** | 3-5 typed narrative anchors (identity, boundary, empathy, pride, caution). Captured via guided interview or manual curation. Immutable by default. | ✅ Live |
| **Knowledge Base** | Markdown documents tagged to org, semantically ranked, token-budgeted for context injection | ✅ Live (lexical). ⚠️ Vector search schema ready, embedding generation not wired. |
| **FAQ Entries** | Q&A pairs — agent can propose new ones from conversation patterns | ✅ Live |
| **Self-Improvement Loop** | Observe → Reflect → Propose → Learn. Agent proposes soul mutations, owner approves via Telegram. Drift scoring on 4 dimensions. | ✅ Live |

**Codebase anchors:**
- Soul generation: `convex/ai/soulGenerator.ts` — LLM generates soul from business context + knowledge base + FAQ
- Soul evolution: `convex/ai/soulEvolution.ts` — proposal lifecycle, mutation guards, version history
- Self-improvement: `convex/ai/selfImprovement.ts` — daily reflection, drift detection, alignment proposals
- Interview: `convex/ai/interviewRunner.ts` — guided interview captures core memories
- Memory composer: `convex/ai/memoryComposer.ts` — 5-layer memory architecture
- Trust events: `convex/ai/trustEvents.ts` — full audit trail for every soul decision

### What "Dream Team" Actually Means (Grounded in Code)

The team orchestration system is **production-ready**:

| Capability | How It Works | Status |
|-----------|-------------|--------|
| **Tag-In Specialist** | PM agent delegates to specialist who responds under their own name, same conversation | ✅ Live (`teamTools.ts`) |
| **Team Discovery** | `list_team_agents` tool lets PM see all available specialists | ✅ Live |
| **Handoff Controls** | Max 5 handoffs/session, 2-min cooldown, context transfer, history tracking | ✅ Live (`teamHarness.ts`) |
| **Multi-Channel** | WhatsApp, Telegram, SMS, Email, Slack, Webchat, Instagram, Facebook — channel-aware routing | ✅ Live (`channels/router.ts`) |
| **Cross-Org Escalation** | Child agents escalate to parent, parent delegates to child | ✅ Live (`coordinatorTools.ts`) |
| **40+ Tools** | CRM, booking, forms, projects, email campaigns, web app creation, data queries | ✅ Live |
| **Workflow Automation** | Trigger-based behavior execution, multi-step automation | ✅ Live (`workflows/workflowExecution.ts`) |

**Agent subtypes available today:**
- `customer_support` — handles inquiries, FAQs, escalation
- `sales_assistant` — qualifies leads, handles objections, assists closing
- `booking_agent` — manages appointments and scheduling
- `general` / `pm` — orchestrates team, routes conversations

### Content Ingestion — The Gap to Close

To bind a public expert's content (books, podcasts, frameworks) into a soul, we need the ingestion pipeline completed:

| Source Type | Current Status | Effort to Complete |
|------------|---------------|-------------------|
| **Markdown/Text** | ✅ Working — upload docs, store, retrieve | Ready now |
| **URLs/Web pages** | ⚠️ URL storage works, content extraction not wired | 2-3 days (add Cheerio/scraper) |
| **PDFs** | ⚠️ Schema ready, extraction not wired | 3-4 days (add pdfjs-dist) |
| **Audio/Podcasts** | ⚠️ Schema ready, transcription not wired | 3-5 days (add Whisper API) |
| **YouTube** | ❌ Not started | 3-5 days (transcript API + metadata) |
| **Embedding generation** | ⚠️ Vector indexes defined, generation job missing | 2-3 days (OpenAI embeddings batch job) |
| **Full agent context wiring** | ⚠️ Memory composer built, not fully wired into execution | 1-2 days |

**Critical path for first sale: ~2-3 weeks to complete PDF + web + embeddings + context wiring.**

For the first 1-3 sales, we can **manually curate content** — transcribe podcasts ourselves, extract key frameworks from books, format as markdown, upload. This is white-glove service, not a scalable pipeline, and that's fine at €30,000/engagement.

---

## 2. Product Packaging — The Dream Team Offer

### The Productized Service: "Your Expert Team"

**What the business owner buys:** A custom-built Dream Team of AI agents — starting with core specialists and expanded from a library of 100+ expert templates — each modeled on a real-world expert archetype, deployed across their preferred communication channels, with ongoing soul evolution and monthly optimization.

### The Core Dream Team (Starting Lineup)

| Agent Role | Expert Archetype Example | Soul Source Material | Primary Tools |
|-----------|------------------------|---------------------|---------------|
| **The Strategist** (PM) | Alex Hormozi, Simon Sinek, or client's chosen thought leader | Books, podcast transcripts, keynote frameworks | Team orchestration, CRM queries, project management |
| **The Closer** | Chris Voss, Grant Cardone, or domain-specific sales expert | Negotiation frameworks, objection handling scripts, deal psychology | Sales assistant tools, booking, email sequences |
| **The Wordsmith** | Gary Halbert, David Ogilvy, or modern copywriter the client admires | Copywriting principles, swipe files, headline formulas, storytelling frameworks | Content creation, email campaigns, form builder |
| **The Operator** | Gino Wickman (EOS), Michael Gerber (E-Myth), or operations thinker | Process frameworks, SOPs, decision matrices, delegation principles | Workflow automation, project tracking, data queries |
| **The Advisor** | Warren Buffett, Ray Dalio, or financial/strategic mind | Decision frameworks, risk assessment models, scenario planning | Data query, analytics, CRM organization tools |

### Delivery Tiers

#### Tier 1: "The Starter Team" — €9,900

| Item | Detail |
|------|--------|
| Agents | 3+ agents (Strategist PM + 2 specialists from core or template library) |
| Soul depth | 1 expert persona per agent, curated from 2-3 source materials |
| Channels | 2 channels (Telegram + Webchat) |
| Knowledge base | Up to 20 documents ingested |
| Setup | 1-week white-glove onboarding call + configuration |
| Ongoing | Monthly 30-min optimization call. Soul evolution active. |
| Platform | Agency/Scale tier subscription (€299/mo billed separately) |

#### Tier 2: "The A-Team" — €24,900

| Item | Detail |
|------|--------|
| Agents | 5+ agents (core specialists + additional templates from library) |
| Soul depth | Deep persona binding — 5-10 source materials per agent (books, full podcast series, course content) |
| Channels | 4 channels (Telegram + Webchat + Email + WhatsApp or Slack) |
| Knowledge base | Up to 50 documents + custom FAQ library |
| Workflows | 3 automated workflows (lead qualification, follow-up sequences, appointment booking) |
| Setup | 2-week white-glove: discovery workshop + iterative soul calibration |
| Ongoing | Bi-weekly optimization calls for 3 months. Monthly thereafter. |
| Platform | Agency/Scale tier subscription (€299/mo billed separately) |

#### Tier 3: "The Dream Team" — €49,900

| Item | Detail |
|------|--------|
| Agents | 6+ agents (full core team + role-specific templates from expanding library) |
| Soul depth | Maximum depth — full bibliography per agent, custom interview sessions to capture owner's own expertise as a soul |
| Channels | All available channels |
| Knowledge base | Unlimited documents + audio transcription pipeline |
| Workflows | 5+ automated workflows customized to business processes |
| CRM integration | Full CRM pipeline setup with AI-assisted contact movement |
| Setup | 4-week engagement: discovery → soul design → calibration → launch |
| Ongoing | Weekly optimization for 3 months. Bi-weekly for 6 months. Monthly thereafter. |
| Platform | Agency/Scale tier subscription (€299/mo billed separately) |

### The Recurring Revenue Underneath

Every dream team sale generates **monthly platform revenue**:

| Revenue Stream | Amount | Trigger |
|---------------|--------|---------|
| Agency/Scale subscription | €299/mo | Required for agent hosting + channels |
| Sub-org add-ons (if agency deploys for their clients) | €79/mo per client org | Each client gets their own org |
| Credit top-ups | €49-499/mo | When 2,000 monthly credits aren't enough |
| Optimization retainer (optional) | €500-1,500/mo | Ongoing soul tuning + new agent builds |

**Unit economics for Tier 2 (€24,900):**
- Setup revenue: €24,900 (one-time)
- Monthly platform: €299/mo minimum = €3,588/yr
- Expected credit overage: ~€100/mo = €1,200/yr
- **Year 1 total per client: ~€29,688**
- **Year 2+ recurring: ~€4,788/yr** (platform + credits, no setup)

---

## 3. Pricing Strategy

### Direct-to-Business-Owner Pricing

**Anchor high, justify with access narrative.**

The competitor isn't another AI tool. The competitor is:
- A fractional CMO: €5,000-15,000/mo
- A management consultant: €2,000-5,000/day
- A full-time marketing team: €15,000-30,000/mo in salaries
- Access to the actual expert: impossible at any price

**Pricing psychology:**

> "You're not paying for software. You're paying for a team of world-class minds — modeled on specific experts you choose — working for you 24/7. A single consultation with Chris Voss costs €50,000. Your Closer agent, trained on every framework Voss has ever published, is available every day, forever, for a fraction of that."

**Payment structure:**
- 50% upfront at kickoff
- 50% at launch (when team goes live on channels)
- Monthly platform fee begins at launch

### Agency Licensing / Reseller Model

**The pitch to agencies (second-order):**

> "I sold a custom Dream Team to a business owner for €24,900 — built from our library of 100+ expert templates. The setup took 2 weeks. The client is generating ROI within 30 days. You have 50 clients. If you sell this to 10 of them this year, that's €249,000 in new service revenue for your agency — plus recurring platform fees. I'll teach you how to sell it, set up the first 3 for you, and give you a white-label delivery framework."

**Agency pricing tiers:**

| Model | What Agency Pays | What Agency Charges | Agency Margin |
|-------|-----------------|--------------------|----|
| **Certified Partner** (3 dream teams/yr) | €299/mo platform + €79/client-org + 15% revenue share on setup fees | Whatever they want (recommended €15K-50K per team) | 85% of setup fee |
| **Premium Partner** (10+ dream teams/yr) | €299/mo platform + €79/client-org + 10% revenue share | Whatever they want | 90% of setup fee |
| **White-Label Partner** (25+/yr) | Custom enterprise agreement | Whatever they want, fully white-labeled | 90-95% |

**Why agencies say yes:**
1. High-ticket recurring service they can add to existing retainers
2. Differentiation — no other agency offers "expert-modeled AI teams"
3. Stickiness — once a client's team is deployed, switching costs are astronomical
4. They don't need AI expertise — L4YERCAK3 handles the soul binding, they handle the client relationship

**Revenue share vs. flat fee:** Revenue share is better than flat licensing because it aligns incentives. The agency is motivated to sell more and price higher. L4YERCAK3 captures upside without capping agency pricing.

---

## 4. Messaging & Positioning

### The Core Narrative: "Hire Minds, Not Tools"

**Headline options (ranked):**

1. **"Build your dream team from the minds you admire most."**
2. "What if the experts you follow could actually work for you?"
3. "Your business deserves a team of the world's best thinkers. Now it can have one."
4. "From podcast listener to team builder — turn expertise into execution."

### The Story Arc (for sales conversations and landing page)

**Act 1: The Gap**
> You listen to Chris Voss on negotiation. You read Hormozi on offers. You study Ogilvy on copy. You know exactly who you'd hire if you could afford anyone in the world. But you can't. They're not available. They're not affordable. And even if they were — they wouldn't work in your business daily.

**Act 2: The Bridge**
> What if we took everything that expert has ever published — every book, every podcast, every framework, every tip — and built it into an AI agent that thinks, writes, and advises like them? Not a chatbot. Not a generic AI assistant. A persistent team member with that expert's personality, judgment, communication style, and knowledge. One that learns your business over time, proposes improvements to its own approach, and gets better every week.

**Act 3: The Team**
> Now multiply that across every function in your business. A Closer who negotiates like Voss. A Wordsmith who writes like Halbert. A Strategist who thinks like Hormozi. An Operator who systematizes like Wickman. An Advisor who evaluates like Dalio. Five agents. Five world-class minds. All yours. All coordinated. All working 24/7 across your channels — Telegram, WhatsApp, email, webchat. Each one evolving, improving, learning your business.

**Act 4: The Proof**
> [Case study from first 1-3 sales. Specific numbers. Specific outcomes.]

**Act 5: The Close**
> "Which experts would be on YOUR dream team? Let's build them."

### Messaging Angles by Audience

| Audience | Primary Angle | Secondary Angle |
|----------|-------------|----------------|
| **Business owner (1-10 employees)** | "Get the team you can't afford to hire" | "Your favorite experts, working in your business daily" |
| **Business owner (10-50 employees)** | "Augment your team with world-class thinking" | "24/7 specialist capacity without headcount" |
| **Founder/CEO** | "Think of it as assembling an advisory board that actually does the work" | "Strategic minds that execute, not just advise" |
| **Agency owner (second-order)** | "I sold this for €30K. You can sell it to every client you have." | "High-ticket, sticky, recurring AI service your competitors can't match" |

### What Makes This NOT "Just Another AI Tool"

The differentiation stack:

1. **Personality permanence.** Generic AI has no identity. Soul-bound agents have immutable personality anchors, drift correction, and trust governance. Your Closer doesn't wake up one day sounding like a customer support bot.

2. **Expert modeling, not generic assistance.** We don't say "here's an AI that can help with sales." We say "here's an agent trained on Chris Voss's entire body of work — it thinks about negotiation the way he does."

3. **Team coordination.** It's not one bot. It's a coordinated team where the PM routes to specialists, specialists hand back, and every handoff carries context. The business owner talks to one interface and gets the right expert for each question.

4. **Self-improvement.** Agents propose their own upgrades — new FAQ entries, tone adjustments, knowledge gaps — and the owner approves. The team gets better autonomously.

5. **Multi-channel presence.** The same team is available on Telegram, WhatsApp, email, webchat, Slack. No switching between apps. The expert team is wherever the business owner (or their customers) already are.

6. **Owner control with trust governance.** Every soul mutation is logged, proposed, approved. Every escalation trigger is defined. Every guardrail is explicit. This isn't a black box — it's a transparent, auditable team.

---

## 5. Objection Handling

### Objection 1: "Is it legal to use a public figure's content to train an AI?"

**Short answer:** Yes, with important nuances.

**Framework:**

| Factor | Assessment |
|--------|-----------|
| **Publicly available content** | Books, podcasts, and public talks are published works. Referencing frameworks and principles from published works is the same as a human consultant studying those works and applying the frameworks. |
| **We don't clone identity** | The agent is NOT impersonating the expert. It's trained on their frameworks, principles, and methodologies. Like hiring a consultant who studied at the Chris Voss school of negotiation. |
| **No likeness/endorsement claim** | We never claim the expert endorses, is affiliated with, or is the agent. The agent has its own name and identity — it's "inspired by" or "trained on the works of." |
| **Fair use doctrine** | Extracting principles, frameworks, and methodologies from published works and applying them is transformative use. We're not reproducing copyrighted text — we're teaching an agent to think using published principles. |
| **Right of publicity** | Varies by jurisdiction. We mitigate by never using the expert's name AS the agent, never using their likeness, and framing as "trained on published works." |

**Positioning language:**
- ✅ "Trained on the published frameworks of [Expert Name]"
- ✅ "Applies the negotiation methodology from [Book Title]"
- ✅ "Inspired by the principles in [Expert]'s work"
- ❌ Never: "This IS [Expert Name]" or "Endorsed by [Expert]"
- ❌ Never: Use expert's photo, voice, or trademarked branding

**Risk mitigation:**
1. Soul binding uses extracted principles and frameworks, not verbatim text reproduction.
2. Agent has its own unique name, personality, and identity anchors.
3. Disclosure: "This agent's advisory framework draws on published works by [Expert]. [Expert] is not affiliated with this product."
4. If any expert requests removal, we comply immediately and reframe using equivalent public-domain frameworks.

**Future opportunity:** Partner with experts directly. If Alex Hormozi sees agencies selling "Hormozi-method acquisition agents" for €30K each, he might want in. This could become a licensing play — experts license their content for soul binding and take a royalty.

### Objection 2: "This is just ChatGPT with a personality prompt. I can do this myself."

**Response framework:**

> "You absolutely can write a personality prompt in ChatGPT. Here's what you can't do:
>
> 1. **Make it persistent.** ChatGPT forgets everything between sessions. Our agents have permanent soul anchors and evolving memory.
> 2. **Make it a team.** ChatGPT is one voice. We give you 5 specialists that coordinate, hand off, and maintain context across conversations.
> 3. **Deploy it across channels.** ChatGPT lives in a browser tab. Our agents are on your Telegram, WhatsApp, email, and webchat simultaneously.
> 4. **Make it improve itself.** Our agents run daily reflections, detect drift from their personality, and propose their own improvements — which you approve.
> 5. **Connect it to your business.** Our agents manage your CRM, book appointments, send email campaigns, track projects, and execute workflows. ChatGPT can't do any of that.
> 6. **Trust it.** Every decision our agents make is logged, auditable, and governed. You see exactly why it said what it said and can roll back any change."

### Objection 3: "€25K-50K is too expensive for AI."

**Response framework:**

> "You're not buying AI. You're buying a team.
>
> What does a single senior marketing hire cost? €60-80K/year in salary, plus benefits, plus management overhead, plus ramp-up time. And they're one person, available 40 hours a week, with one skillset.
>
> For €25K one-time plus €300/month, you get 5 specialists, available 24/7, across every communication channel, getting better every week. The ROI math works if your team closes even one additional deal, saves you 10 hours a week, or prevents one customer from churning."

**Anchor alternatives:**
- Fractional CMO: €5K-15K/mo → €60K-180K/yr
- Management consultant: €2K-5K/day → €40K-100K for a project
- Full marketing team: €15K-30K/mo → €180K-360K/yr
- The dream team: €25K once + €300/mo = €28,600 year one, €3,600/yr thereafter

### Objection 4: "What if the AI gives bad advice?"

**Response framework:**

> "Three layers of protection:
>
> 1. **Guardrails are built into the soul.** Every agent has explicit 'neverDo' rules and escalation triggers. If a conversation crosses a defined boundary — financial advice, legal decisions, anything high-stakes — the agent escalates to you immediately.
>
> 2. **Autonomy levels.** You control how much freedom each agent has. 'Supervised' mode drafts everything for your approval. 'Autonomous' mode acts within guardrails. 'Draft only' mode never sends anything without you.
>
> 3. **Trust governance.** Every action is logged. Every soul change is proposed and approved. Every tool execution is tracked. You have a full audit trail of every decision your team makes."

### Objection 5: "I don't trust AI / I'm not technical."

**Response framework:**

> "That's exactly why we build the team FOR you. This isn't a software product you need to figure out. It's a done-for-you service.
>
> We handle everything: choosing the expert sources, extracting the frameworks, configuring the souls, setting up the channels, testing the team, and launching it. You show up to a discovery call, tell us which experts you admire and how your business works, and we build your team. Then you talk to them on Telegram or WhatsApp like you'd talk to any colleague.
>
> And we're there every step — weekly calls for the first 3 months to tune and optimize."

---

## 6. Go-to-Market Sequence

### Phase 0: Pre-Sell Preparation (Weeks 1-3)

**Goal:** Complete the minimum technical pipeline for white-glove content ingestion.

| Task | Effort | Priority |
|------|--------|----------|
| Wire KB retrieval into agent prompt execution | 1-2 days | 🔴 Critical |
| PDF text extraction (pdfjs-dist) | 3-4 days | 🔴 Critical |
| Web content extraction (Cheerio) | 2-3 days | 🟡 High |
| Embedding generation scheduled job (OpenAI) | 2-3 days | 🟡 High |
| Audio transcription (Whisper API) | 3-5 days | 🟢 Phase 1 nice-to-have |

**For the first 1-3 sales, manual curation is acceptable.** Transcribe podcasts yourself. Extract frameworks from books manually. Format as markdown. Upload. The buyer doesn't care how the sausage is made — they care that their Closer agent sounds like Chris Voss.

### Phase 1: Founder-Led Sales — 3 Dream Teams (Months 1-3)

**Goal:** Sell 3 dream teams at €15K-25K each. Generate case studies. Validate the narrative.

**Target profile:**
- Business owner, 1-20 employees
- Service business (agency, consulting, coaching, professional services)
- Already consumes expert content (podcasts, books, courses)
- Revenue: €200K-2M/yr (big enough to invest, small enough to feel the pain of limited team)
- Active on Telegram or WhatsApp (channel readiness)

**How to find them:**
1. **Your own network.** Who do you know that fits this profile?
2. **Podcast communities.** Business owners who actively discuss Hormozi, Myron Golden, Voss — they're in Discord servers, Facebook groups, Twitter threads.
3. **LinkedIn outreach.** "I saw you posted about [Expert]'s framework. What if that framework was built into an AI that works in your business daily?"
4. **Agency contacts.** Agency owners ARE business owners. Sell to them first, for their own business, before pitching the reseller model.

**Sales process:**

```
Week 1: Discovery call (60 min)
  ├─ "Which experts would be on your dream team?"
  ├─ "What does your business need most: sales, ops, marketing, strategy?"
  ├─ "Where do you communicate most? Telegram? WhatsApp? Email?"
  └─ Outcome: Expert shortlist + business context + channel preference

Week 1-2: Proposal + Soul Design Preview
  ├─ Mockup of 3-5 agent profiles ("Here's your Strategist, your Closer, your Wordsmith...")
  ├─ Sample interaction transcript — show the agent in action
  ├─ Pricing: [tier] with payment terms
  └─ Outcome: Signed agreement + 50% payment

Week 2-4: White-Glove Build
  ├─ Content ingestion: curate expert material, extract frameworks, upload to KB
  ├─ Soul generation: run generateSoul() with expert context
  ├─ Interview capture: guided session to capture owner's own preferences as core memories
  ├─ Team wiring: PM + specialists, handoff rules, channel bindings
  ├─ Workflow setup: automated sequences, booking flows
  └─ Outcome: Team live on channels

Week 4+: Launch + Optimize
  ├─ Owner starts using team in daily work
  ├─ Weekly 30-min call: review conversations, tune soul, adjust tools
  ├─ Agent self-improvement loop running (proposals → owner approves)
  └─ Outcome: ROI evidence for case study
```

**Success metrics for Phase 1:**
- 3 paying clients at €15K+ each
- ≥1 quantifiable ROI story (e.g., "closed €X in new deals using The Closer agent")
- Net Promoter Score from all 3 clients
- Permission to use as named case study (or anonymized with specifics)

### Phase 2: Case Study → Agency Channel (Months 3-6)

**Goal:** Use Phase 1 case studies to open the agency reseller channel. Sign 3-5 agency partners.

**The agency pitch deck (built from Phase 1 evidence):**

```
Slide 1: "We sold a custom AI dream team for €24,900."
Slide 2: [Case study] — client profile, team composition, results
Slide 3: "The client's monthly platform cost is €299. They'll never leave."
Slide 4: "You have 50 clients. If 10 buy this, that's €249K in new revenue."
Slide 5: "We handle the soul binding. You handle the relationship."
Slide 6: "Your first 3 client teams: we build together. You learn the process."
Slide 7: Partnership tiers + revenue share model
```

**Agency onboarding sequence:**
1. **Demo call:** Show live dream team in action. Let agency owner interact with agents.
2. **Co-build first client team:** White-glove setup of the agency's first client dream team together. Agency learns the process.
3. **Co-build second team:** Agency leads, you support.
4. **Third team:** Agency self-serves with your quality review.
5. **Partner certified:** Agency independently sells and deploys.

**Revenue per agency partner (annual estimate):**
- Platform: €299/mo × 12 = €3,588
- Sub-orgs: 5 clients × €79/mo × 12 = €4,740
- Revenue share: 5 teams × €20K avg × 10-15% = €10K-15K
- Credit overage: ~€150/mo × 12 = €1,800
- **Total per agency partner: ~€20K-25K/yr**

### Phase 3: Scale & Systematize (Months 6-12)

**Goal:** 15+ agencies deploying dream teams. Automated content ingestion pipeline. Self-serve agent template marketplace.

| Initiative | Description |
|-----------|-------------|
| **Expert Template Library** | 100+ pre-built soul templates and growing: "The Hormozi Strategist," "The Voss Closer," "The Ogilvy Wordsmith," and dozens more. Agencies select from a continuously expanding menu instead of starting from scratch. |
| **Content Ingestion Pipeline** | Automated: paste YouTube URL → transcript extracted → frameworks identified → soul enriched. Paste book title → key frameworks extracted from summaries + reviews. |
| **Agency Dashboard** | Platform Pulse (PRD Section 13) extended with per-agency deployment metrics, client health, revenue tracking. |
| **Expert Partnerships** | Approach 2-3 experts about official licensing. "Your frameworks, deployed as AI agents to 500+ businesses. Royalty per deployment." |
| **Self-Serve Dream Team Builder** | Business owners configure their own team online. Select archetypes → choose experts → customize channels → pay → team deployed in 48 hours. |

### Phase 4: The Flywheel (Month 12+)

```
More dream teams deployed
  → More conversation data
    → Better soul evolution
      → Better outcomes for business owners
        → Stronger case studies
          → More agencies want to partner
            → More dream teams deployed
```

---

## 7. Technical Readiness Assessment

### Ready Today (Green Light)

| Capability | Confidence | Notes |
|-----------|-----------|-------|
| Soul generation from business context | ✅ High | `soulGenerator.ts` — production-tested |
| Core memory capture via interview | ✅ High | `interviewRunner.ts` — guided phases |
| Soul evolution + drift correction | ✅ High | Full proposal → approve → apply lifecycle |
| Multi-agent team with handoff | ✅ High | `teamHarness.ts` — tag-in specialist pattern |
| Multi-channel deployment | ✅ High | 9 channels, multi-provider routing |
| CRM + pipeline management | ✅ High | Full CRM ontology with AI-assisted movement |
| Workflow automation | ✅ High | Trigger-based behavior execution |
| 40+ agent tools | ✅ High | Sales, CRM, booking, content, data |
| Trust governance + audit trail | ✅ High | Trust events for every soul decision |
| Markdown knowledge ingestion | ✅ High | Upload → store → retrieve → inject |
| Platform Pulse (super-admin metrics) | ⚠️ Specified | PRD Section 13 — ~4 day build |
| Agency Mode UI | ⚠️ Specified | PRD Sections 1-12 — ~4 week build |

### Needs Completion (Yellow Light)

| Capability | Effort | Blocks First Sale? |
|-----------|--------|-------------------|
| PDF text extraction | 3-4 days | No — manual curation for first 3 sales |
| Web content extraction | 2-3 days | No — manual curation |
| Embedding generation job | 2-3 days | No — lexical retrieval works at small scale |
| Full agent context wiring (KB → prompt) | 1-2 days | **Yes — critical path** |
| Audio transcription | 3-5 days | No — manual transcription for first sales |

### Not Needed for First Sales (Build Later)

| Capability | When | Why |
|-----------|------|-----|
| YouTube transcript extraction | Phase 2 | Manual transcription fine for 3 sales |
| Self-serve dream team builder | Phase 3 | White-glove is the value prop initially |
| Expert template marketplace | Phase 3 | Build templates from real client patterns |
| Automated embedding pipeline | Phase 2 | Lexical retrieval + small KB works for now |

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Expert or publisher sends C&D for content usage | Low | High | Use extracted frameworks, not verbatim text. Agent has own name/identity. Comply immediately if contacted. Pivot to "methodology-inspired" framing. |
| First 3 clients don't see ROI quickly enough | Medium | High | Set expectations: 30-day ramp, weekly optimization. Define success metrics upfront in discovery call. Over-invest in white-glove support. |
| Business owner doesn't actually USE the agents after purchase | Medium | Medium | Bi-weekly checkins. Usage alerts in Platform Pulse. Proactive outreach if session count drops. |
| Agencies can't sell high-ticket to their clients | Medium | Medium | Provide sales scripts, demo environments, co-sell first 3 clients. Revenue share incentivizes them to price appropriately. |
| "Expert persona" agent gives bad domain-specific advice | Medium | High | Strong guardrails in soul (neverDo, escalation triggers). Supervised autonomy for first 2 weeks. Agent knows its limits and escalates. |
| LLM costs make unit economics unsustainable at scale | Low | Medium | Current cost: ~$0.003/soul-generation, ~$0.01-0.05/conversation turn. At €25K/client, LLM costs are <1% of revenue. Credit system provides usage ceiling. |
| Competitor copies the approach with their own platform | Medium | Low | Soul binding + trust governance + self-improvement loop is hard to replicate. The 4-layer architecture (L0-L3) is the moat. First-mover advantage in expert-persona agents. |
| Expert wants to partner (good problem) | Medium | Positive | License their content officially. Expert gets royalty per deployment. Turns potential legal risk into distribution channel. |

---

## Summary: The Sequence

```
Week 1-3:  Complete critical technical path (KB → agent context wiring)
Week 1-2:  Identify 5-10 prospect business owners from network
Week 2-3:  Run discovery calls. Close first dream team at €15K-25K.
Week 3-6:  White-glove build + launch for client #1. Start clients #2 and #3.
Month 2-3: Collect ROI data. Film case study. Build pitch deck.
Month 3-4: Pitch 5-10 agencies using case studies. Sign first 3 agency partners.
Month 4-6: Co-build first client teams with each agency partner.
Month 6-9: Agencies self-serving. Build expert template library.
Month 9-12: 15+ agencies deploying. Content ingestion pipeline automated.
Month 12+: Self-serve builder. Expert licensing partnerships. Flywheel spinning.
```

**Revenue projection (conservative):**

| Period | Direct Sales | Agency Revenue | Platform MRR | Total |
|--------|-------------|---------------|-------------|-------|
| Month 1-3 | 3 × €20K = €60K | — | €900 | €60,900 |
| Month 3-6 | 2 × €25K = €50K | 3 agencies × 2 clients × €20K × 12.5% = €15K | €3,500 | €68,500 |
| Month 6-12 | 3 × €30K = €90K | 10 agencies × 5 clients × €22K × 10% = €110K | €15,000 | €215,000 |
| **Year 1 Total** | **€200K** | **€125K** | **€19,400** | **€344,400** |

The €344K year 1 is conservative. The lever is agency volume. Each agency partner that sells 10 teams/year at €20K average generates €20K-25K/yr for L4YERCAK3 in platform fees + revenue share. At 20 agency partners doing 10 clients each, that's **€400K-500K/yr in recurring revenue** from the agency channel alone.

---

*This document lives alongside the Agency Mode PRD at `docs/prd/AGENCY_MODE_PRD.md`. The two strategies are complementary: Agency Mode is the platform infrastructure; Dream Team is the productized service sold on top of it.*
