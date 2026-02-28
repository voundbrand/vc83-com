# L4YERCAK3 Website Copy Rewrite Plan — Dream Team + Trust Architecture

## Execution Prompt

> Copy this prompt to execute the plan:
>
> **"Execute the copy rewrite plan from `/Users/foundbrand_001/Development/l4yercak3-landing/docs/icp-dream-team/WEBSITE_COPY_REWRITE_PLAN.md`. Follow the implementation sequence exactly. Update `src/translations/landing.ts` (EN + DE), `src/app/page.tsx` (add trust section + dream team feature cards), `src/app/partners/page.tsx` (full rewrite with i18n), `src/translations/en.ts`, `src/translations/de.ts`, `src/components/footer.tsx`, and `src/components/content-page-layout.tsx`. Use the exact copy from the plan document. Run `npm run build` after each major file to catch errors early."**

---

## Context

The l4yercak3 business strategy has shifted from "single AI employee" to "AI Dream Teams" — teams of specialized AI agents sold wholesale to agency partners. The 7-layer Trust Architecture is the core differentiator.

**Audience rules**: Landing page speaks to business owners (Level 3). Agencies see the implicit resale play. The `/partners` page is the only place with explicit agency/wholesale language.

**Scope**: Landing page copy rewrite + Partner page rewrite. Affiliate page archived.

---

## Files to Modify (7 files)

| # | File | Change |
|---|------|--------|
| 1 | `src/translations/landing.ts` | Rewrite EN + DE landing copy, add trust + partner namespaces, archive affiliate |
| 2 | `src/translations/en.ts` | Update footer tagline, add navigation.partners |
| 3 | `src/translations/de.ts` | Mirror en.ts changes |
| 4 | `src/app/page.tsx` | Add Trust Architecture section between Problem and Guide, add dream team feature cards |
| 5 | `src/app/partners/page.tsx` | Full rewrite with i18n migration |
| 6 | `src/components/footer.tsx` | Replace hardcoded "Partners" with `t('navigation.partners')` |
| 7 | `src/components/content-page-layout.tsx` | Same footer fix |

---

# PART 1: LANDING PAGE COPY (English)

## Hero

```
headline: "Your AI Dream Team. Live in Days, Not Months."

subheadline: "A team of specialized AI agents — trained on your voice, your rules, your business. They handle sales, strategy, operations, and customer conversations. 24/7. On WhatsApp, Telegram, or your website."

cta: "Deploy Your Dream Team"
ctaSecondary: "See It In Action"
```

## Problem

```
header: "You Need AI. You're Terrified of It."

graveyard:
  title: "AI breaks on edge cases and costs you customers."
  description: "You tried a chatbot. It hallucinated. It promised something you don't offer. A customer saw it and now questions your professionalism. You don't need more AI experiments. You need AI you can trust."

loop:
  title: "Every AI vendor says 'write better prompts' — then disappears."
  description: "You've been through 3 tools this year. Each one required hours of setup. Each one broke when a customer asked something unexpected. The support team sent you a knowledge base article. You're still the one fixing it at 10pm."

catch22:
  title: "Hiring more people isn't the answer. Neither is broken AI."
  description: "You can't afford another employee for every channel. But you also can't afford AI that goes rogue at 2am and tells a customer the wrong price. The gap between 'we need AI' and 'we can trust AI' is where most businesses get stuck."

stakes:
  title: "A year from now, what changes?"
  description: "Your competitors aren't hiring more people. They're deploying AI dream teams that handle the frontline — closing leads, answering questions, following up — and only involve a human when it actually matters.

The gap between businesses running a coordinated AI team and businesses running a single chatbot is only getting wider.

It's not about working harder. It's about having a team that works for you when you can't — and never goes rogue."
```

## Trust Architecture (NEW SECTION — insert between Problem and Guide)

```
header: "Your Agents Can't Go Rogue."
subheader: "7 layers of trust architecture. Built into the code, not bolted on as a prompt."

layers:
  identity:
    layerName: "Identity Immutability"
    concern: "\"What if it says something crazy to my customers?\""
    answer: "Identity is locked in code. The agent can't rewrite its own personality or remove its own safety rules. Ever."

  evolution:
    layerName: "Governed Evolution"
    concern: "\"What if it changes without my permission?\""
    answer: "Every change goes through a 6-gate proposal lifecycle. You approve or reject. The agent can't bypass you."

  drift:
    layerName: "Drift Detection"
    concern: "\"How do I know it stays on track?\""
    answer: "We measure drift across 4 independent axes every cycle. If it drifts, remediation triggers automatically."

  escalation:
    layerName: "Triple-Gate Escalation"
    concern: "\"What if it gets something wrong?\""
    answer: "Every conversation goes through 3 separate safety checks. If anything's off, it escalates to you with one-tap takeover on your phone."

  toolScoping:
    layerName: "Tool Scoping"
    concern: "\"Can it access things it shouldn't?\""
    answer: "4-layer tool scoping. You control exactly what it can and can't do — down to the channel level."

  memory:
    layerName: "Consent-Tracked Memory"
    concern: "\"Is it secretly recording my customers?\""
    answer: "The agent can't silently remember things. Explicit consent flow. If consent rates drop, the system rolls back automatically."

  admin:
    layerName: "Platform Security"
    concern: "\"What about the platform itself?\""
    answer: "Enterprise-grade security. Step-up authentication, time-bound elevation, dual approval for critical actions. Full audit trail."

closing: "This isn't a disclaimer. It's architecture. The same governance infrastructure that enterprise companies require — available to every business on the platform."
```

## Guide (Remington's Story) — TWO VERSIONS

### Version A — Level 3 Rewrite (default)

```
header: "Why I Built This"

story: "I ran a marketing agency for five years. €240,000 a year in recurring revenue. Four employees. Great clients.

And I took home nothing.

Every month: €500 to €1,000 in software. GoHighLevel, HubSpot, form builders, email tools — the whole stack. Every new client: two to three weeks to onboard. My team spent more time fighting the tools than doing the work.

I watched my team sit there waiting for pages to load. I watched automations send the wrong emails to the wrong people. I called support and got a ticket number and silence. I opened Stripe in a separate tab because my "all-in-one" platform couldn't handle a simple cancellation.

I was the bottleneck. Every new client meant more tools, more setup, more hours. €240k in revenue. Nothing left at the end of the month.

So I shut it down.

Went back to what I actually know — software engineering. Twenty years of it. And I built the platform that would have saved my business.

One place where AI agents learn your business through conversation — not configuration. Agents that earn trust through 7 layers of governance. Not chatbots. Governed AI team members that handle your frontline, 24/7.

That's Layer Cake."
```

### Version B — Original (keep autobiographical agency language)

```
(Same as current landing.ts guide.story — no changes)
```

**Decision**: Include both as `guide.story` (Version A) and `guide.storyAlt` (Version B). Page uses `guide.story` by default.

## Plan (3-Step How It Works)

```
header: "Proven 3-Step Deployment"

step1:
  number: "1"
  title: "Blueprint"
  description: "We map your voice, values, customer playbook, and guardrails. You don't write prompts. You define rules. Share a few stories about how you run your business."

step2:
  number: "2"
  title: "Build"
  description: "We train your AI team on your data, your voice, and your constraints. Each agent gets a specific role — handling leads, answering questions, managing operations. Not generic models. Your models."

step3:
  number: "3"
  title: "Deploy"
  description: "Your dream team goes live on WhatsApp, Telegram, web — wherever your customers already are. Fully governed. Fully auditable. Fully yours. They get smarter every week."
```

## Success (Imagine This Instead)

```
header: "Imagine This Instead"
timeframe: "After deployment:"

vision:
  item1: "A team of AI agents is live — handling leads, answering questions, managing operations"
  item2: "Bookings, FAQs, follow-ups — handled 24/7 without you touching it"
  item3: "Every agent knows when something needs a human — and escalates cleanly"
  item4: "You focus on the work that actually needs you. Your AI team handles the rest."

contrast: "You don't need more tools. You don't need more hours. You need an AI dream team that learns your business, handles the frontline, and gets smarter every week — without forgetting who it works for."
```

## Features

```
header: "A Specialist for Every Part of Your Business"

ai:
  title: "AI Agents That Earn Trust"
  description: "Each agent starts with your stories — not a template. They handle sales conversations, answer customer questions, write follow-up emails, manage your calendar, track your numbers. They know when to escalate. You approve every change. They never go rogue."

closer: [NEW]
  title: "A Closer That Never Sleeps"
  description: "Responds to every lead in under 60 seconds. Qualifies prospects, handles objections, books appointments. Works 24/7. When a deal needs a human touch, it hands off with full context."

strategist: [NEW]
  title: "A Strategist That Finds Revenue Levers"
  description: "Analyzes your business and spots opportunities you'd miss. Revenue trends, customer patterns, pricing insights — delivered proactively, not when you ask."

copywriter: [NEW]
  title: "A Copywriter On Call"
  description: "Follow-up emails, proposals, social posts, customer responses — written in your voice, your tone, your brand. Ready for review, not rewriting."

operator: [NEW]
  title: "An Operator That Runs the Machine"
  description: "Scheduling, reminders, workflow triggers, status updates, weekly scorecards. The operational backbone that keeps everything moving while you focus on growth."

multiTenant:
  title: "Your Brand. Your Domain."
  description: "Run everything under your own brand. Your logo, your colors, your domain. Built-in authentication and user management. Your customers see your brand — you control the experience."

crm:
  title: "Contacts & Pipeline"
  description: "Every lead tracked and organized. Segment, tag, follow up. Visual pipeline. See everything from one dashboard — manage multiple locations or teams from a single view."

builder:
  title: "Page & Funnel Builder"
  description: "Drag-and-drop. Beautiful defaults. Mobile-ready. Build landing pages, funnels, and client-facing sites. Publish in minutes — not weeks."

email:
  title: "Email & Automation"
  description: "Sequences, broadcasts, and workflows that actually land in the inbox. Trigger emails from form fills, purchases, bookings, or any event."

payments:
  title: "Payments & Invoicing"
  description: "Fully integrated Stripe checkout. B2B and B2C invoicing built in. Payments go through your platform — no leaving to manage billing in a separate tab."

booking:
  title: "Booking & Calendar"
  description: "Self-service booking for your customers. Calendar sync. Automatic confirmations and reminders via email. No more back-and-forth scheduling."

comms:
  title: "Multi-Channel Comms"
  description: "iPhone and Android app for you and your team. All conversations in one place. WhatsApp Business API and Instagram DM integrations on the roadmap."

integrations:
  title: "Integrations That Work"
  (logos array stays the same)

pricing: "Free to start with your first agent. Pro (€29/mo): deploy a full team with higher limits. Scale plans available for businesses managing AI teams across multiple locations."

note: "No hidden charges. No per-email fees. No surprise invoices. Simple pricing that grows with you."
```

## Urgency Pill

```
text: "Free plan available — Deploy Your First Dream Team Today"
```

## Final CTA

```
header: "Your Dream Team Can Be Live This Week."

push: "Start with a blueprint. Deploy your AI dream team in days, not months.

No credit card. No onboarding calls. No learning curve.
Blueprint. Build. Deploy. Done."

cta: "Deploy Your Dream Team"
ctaSecondary: "See It In Action"

objectionHandler: "Free to start. 7 layers of trust architecture — no rogue chatbots. WhatsApp, Telegram, web — every channel. Cancel anytime."
```

## Blueprint Stages (minor update — remove agency language)

```
stages:
  aspiring: "Getting Started"
  starter: "Early-Stage Business"
  growing: "Growing Business"
  scaling: "Scaling Business"
  established: "Established Business"
```

## Linktree (minor update)

```
headline: "Your AI Dream Team. Live in days, not months."
tagline: "l4yercak3 — Deploy AI dream teams on WhatsApp, Telegram, web. Your customers get answers 24/7."

links.platform:
  title: "Deploy Your Dream Team"
  description: "AI dream teams that learn your business. Free to start."
```

## Affiliate — ARCHIVE

Replace entire `affiliate` object with `{} as Record<string, never>`.

---

# PART 2: PARTNER PAGE COPY (English)

This is the explicit agency-facing page. Linked from footer only.

## Hero

```
headline: "Sell AI Dream Teams to Your Clients."
subheadline: "We build the minds. You own the relationship. 75%+ margin on every deal."
cta: "Apply for Founding Partner Program"
ctaSecondary: "See the Economics"
```

## The Opportunity

```
header: "The Opportunity"

body: "Your clients need AI. They know it. You know it. But they don't want a chatbot. They don't want another SaaS login. They want results.

L4YERCAK3 Dream Teams are custom-built teams of AI agents, each with a 'soul' trained on world-class frameworks — the best negotiators, strategists, copywriters, and operators. These agents don't wait for prompts. They proactively advise, challenge, and execute inside your client's business via WhatsApp, Webchat, Telegram and Slack."

points:
  - "Dream teams sell at €7,500–€50,000+ per client"
  - "Monthly recurring revenue underneath every deployment"
  - "Uncapped margin — we charge wholesale, you set the price"
  - "You're not reselling a subscription. You're delivering a high-ticket, done-for-you AI workforce."
```

## Dream Team License Tiers

```
header: "Dream Team License Packages"
subheader: "Fixed wholesale pricing. No revenue share. No audits. You pay once, deploy to one client."

starter:
  name: "Starter Team"
  price: "€2,500"
  priceLabel: "wholesale per client"
  retail: "Suggested retail: €7,500 – €15,000"
  features:
    - "3 expert agents with soul binding"
    - "2 channels (WhatsApp + Webchat)"
    - "Basic workflow automation"
    - "1-week co-delivery support from l4yercak3"
    - "Agent template library access"

aTeam:
  name: "A-Team"
  price: "€5,000"
  priceLabel: "wholesale per client"
  retail: "Suggested retail: €15,000 – €30,000"
  badge: "Most popular"
  features:
    - "5 expert agents with soul binding"
    - "4 channels (WhatsApp + Webchat + Telegram + Slack)"
    - "3 automated workflows + CRM integration"
    - "2-week co-delivery support from l4yercak3"
    - "Weekly optimization session (first month)"

dreamTeam:
  name: "Dream Team"
  price: "€8,500"
  priceLabel: "wholesale per client"
  retail: "Suggested retail: €25,000 – €50,000+"
  features:
    - "6–8 expert agents with soul binding"
    - "All available channels"
    - "Full CRM integration + contact management"
    - "Complete workflow automation suite"
    - "4-week co-delivery engagement"
    - "Weekly optimization sessions (first 2 months)"
    - "Priority support escalation"
```

## How It Works

```
header: "How It Works"

steps:
  1. title: "Buy a License"
     description: "Choose a dream team package (Starter, A-Team, or Dream Team). Pay the fixed wholesale price. The license is yours to deploy."

  2. title: "Sell to Your Client"
     description: "Pitch the dream team at your price. Use our case studies and sales materials. Close on your terms, with your contract."

  3. title: "We Co-Build"
     description: "You run discovery with your client. We handle technical delivery: soul binding, agent configuration, channel deployment. For your first 3 dream teams, we build alongside you."

  4. title: "Client Goes Live"
     description: "Dream team deployed under your agency's sub-org. Client accesses agents via WhatsApp, Webchat, Telegram. You manage the relationship."

  5. title: "Recurring Revenue Flows"
     description: "Monthly platform fees (€149/client) baked into your management fee. The dream team gets smarter over time through soul evolution, increasing value and reducing churn."
```

## The Economics

```
header: "The Economics"

perDeal:
  header: "Per-Deal (A-Team License)"
  rows:
    - "You sell dream team to client → €20,000"
    - "You pay l4yercak3 wholesale → –€5,000"
    - "Your gross profit on setup → €15,000 (75% margin)"
    - "---"
    - "You charge client monthly management → €399/mo"
    - "You pay l4yercak3 platform → –€149/mo"
    - "Your monthly recurring margin → €250/mo (63% margin)"

yearOne:
  header: "Year 1 with 10 Clients"
  setupRevenue: "€200,000"
  recurringRevenue: "€47,880"
  totalCosts: "€71,468"
  netProfit: "€176,412"
  margin: "71%"
  note: "Year 2 starts with 10 clients already paying €399/month."
```

## Trust Architecture — Your Sales Advantage

```
header: "Your Sales Advantage: 7 Layers of Trust"

intro: "The #1 objection to AI deployment isn't price. It's trust. When your client asks 'But what if the AI goes wrong?' — this is your answer."

objections:
  - clientSays: "\"What if it goes rogue?\""
    youSay: "The agent's identity is locked in code. It can't change its own personality or remove its own safety rules. That's not a setting — it's architecture."

  - clientSays: "\"What if it says something crazy?\""
    youSay: "Every conversation goes through 3 separate safety checks — before the AI runs, after it responds, and during any action. If anything's off, it escalates to you on Telegram with one-tap takeover."

  - clientSays: "\"Can it access my data?\""
    youSay: "Every tool goes through 4 layers of filtering. You control exactly what it can and can't do — down to the channel level. In draft-only mode, it plans but never acts."

  - clientSays: "\"How do I know what it's doing?\""
    youSay: "Every action is logged in an append-only audit trail. 80+ event types across 13 categories. You can see exactly what every agent did, when, and why."

closing: "No other AI platform has this. The dream team narrative gets them excited. The trust architecture gets them to sign."
```

## Founding Partner Pilot

```
header: "Founding Partner Pilot"
subheader: "First 10 agencies. At-cost licensing. Co-delivery. Zero risk."

pricing:
  "License Tier | Standard Wholesale | Founding Partner (First 3) | Your Saving"
  "Starter Team | €2,500 | €500 | €2,000 per license"
  "A-Team       | €5,000 | €1,000 | €4,000 per license"
  "Dream Team   | €8,500 | €1,750 | €6,750 per license"

commitments:
  - "Purchase first license within 30 days of signing"
  - "Deploy 3 dream teams within 90 days"
  - "Participate in co-delivery for first 3 clients"
  - "Share at least 1 case study with metrics by day 90"
  - "Monthly 30-minute partner review call with l4yercak3 founder"

benefits:
  - "80% off wholesale on first 3 licenses"
  - "24-month rate lock on all future standard pricing"
  - "Co-delivery on first 5 clients (not just 3)"
  - "Co-marketing: featured in partner directory and joint case studies"
  - "Direct founder access via WhatsApp/Telegram"
  - "First access to new features and agent archetypes"
```

## FAQ

```
header: "Questions"

items:
  q: "Do I need to be technical to deliver dream teams?"
  a: "No. Agency Mode is designed for non-technical operators. We handle soul binding and agent configuration. You handle the client relationship and business context. For your first 3 clients, we co-build together."

  q: "Can I sell below the suggested retail price?"
  a: "Yes. You set the price. We suggest minimums to protect perceived value, but your pricing is your decision."

  q: "What if a client deal falls through after I bought a license?"
  a: "The license is non-refundable but transferable. Assign it to a different client within 12 months. No paperwork required."

  q: "Is this exclusive to my region?"
  a: "No. The program is non-exclusive. Multiple partners may operate in the same market. Performance determines prominence."

  q: "Can I white-label the platform under my brand?"
  a: "Not in v1. Agency Mode shows a clean interface without heavy l4yercak3 branding. Full white-label is on the roadmap for partners with 20+ active clients."

  q: "When does the partner program officially launch?"
  a: "The founding partner pilot is open now for the first 10 agencies. Full program launch happens after all 10 founding partners complete their pilot (target: Q3 2026)."
```

## Final CTA

```
header: "10 Founding Partner Spots. First 3 Licenses at Cost."

push: "An A-Team license at founding pricing costs €1,000. Sell it to your client for €15,000–€20,000. Your downside is €1,000 and your upside is €14,000+. That's not a bet. That's a rounding error."

cta: "Apply for Founding Partner Program"
ctaSecondary: "See Full Pricing Details"

below: "Applications reviewed personally within 48 hours."
```

Partner CTA links to `/blueprint` for now. (Future: dedicated `/partners/apply` form with agency qualification questions.)

---

# PART 3: GERMAN TRANSLATIONS

All copy above gets full German translations. Key translation choices:

| English | German |
|---------|--------|
| AI Dream Team | KI-Dream-Team |
| Trust Architecture | Trust-Architektur |
| Blueprint | Blueprint |
| Deploy | Deployen |
| Soul binding | Soul-Binding |
| 7 layers | 7 Schichten |
| goes rogue | gerät außer Kontrolle |
| wholesale | Großhandel |
| founding partner | Gründungspartner |

(Full DE copy will be written during implementation, following the same structure as EN.)

---

# PART 4: COMPONENT CHANGES

## page.tsx — Trust Architecture Section

Insert between Problem section (~line 268) and Guide section (~line 270):

- New `<section>` with 7-card grid (2 columns desktop, 1 column mobile)
- Each card: numbered badge (1-7), layer name, concern quote (italic), answer
- Blue/indigo accent color (distinct from problem section's red/yellow/orange)
- Framer Motion stagger animation (existing pattern)
- Closing paragraph

## page.tsx — Features Section

Expand the features grid:
- Keep full-width `ai` trust card at top
- Add 4 dream team capability cards (closer, strategist, copywriter, operator) in a 2x2 grid before platform features
- Existing platform features (crm, builder, email, etc.) stay in 3-column grid below

## partners/page.tsx — Full Rewrite

- Migrate from hardcoded English to `useTranslation()` with `t("landing.partner.*")` keys
- 9 sections: Hero, Opportunity, Tiers (3-col pricing cards), How It Works (5 steps), Economics (table), Trust Advantage (objection table), Founding Partner (pricing comparison + benefits), FAQ, Final CTA
- Keep ContentPageLayout wrapper and useContentTheme() pattern

## Footer fixes

- `footer.tsx` line 57: `"Partners"` → `{t('navigation.partners')}`
- `content-page-layout.tsx`: Same fix

## en.ts + de.ts

- `footer.tagline`: "AI dream teams for your business." / "KI-Dream-Teams für dein Business."
- `navigation.partners`: "Partners" / "Partner"
- `footer.copyright`: Update year to 2026

---

# PART 5: IMPLEMENTATION SEQUENCE

| Step | File | Action |
|------|------|--------|
| 0 | `docs/icp-dream-team/` | Save this plan as `WEBSITE_COPY_REWRITE_PLAN.md` |
| 1 | `src/translations/landing.ts` | All EN translation rewrites + new trust/partner namespaces + archive affiliate |
| 2 | `src/translations/landing.ts` | All DE translations (mirror EN structure) |
| 3 | `src/translations/en.ts` | Footer tagline + navigation.partners |
| 4 | `src/translations/de.ts` | Mirror en.ts |
| 5 | `src/app/page.tsx` | Insert trust section + dream team feature cards |
| 6 | `src/app/partners/page.tsx` | Full rewrite with i18n |
| 7 | `src/components/footer.tsx` | i18n fix |
| 8 | `src/components/content-page-layout.tsx` | i18n fix |
| 9 | `npm run build` | Verify no TypeScript errors |
| 10 | Visual QA | Check EN/DE, dark/sepia modes, mobile responsive |
| 11 | MEMORY.md | Update project memory with new direction |

---

# PART 6: WHAT'S NOT IN SCOPE

- Pricing page updates (current tiers stay: Free / Pro / Scale)
- Blueprint lead magnet form changes
- Dedicated `/partners/apply` application form (future task)
- New visual assets or illustrations
- German translation of partner page copy (included in scope, just noted as significant effort)
