# One-of-One Strategy v3 — Sales Motion

| Field | Value |
|-------|-------|
| **Document** | 02 — Sales Motion |
| **Date** | 2026-03-13 |
| **Classification** | Internal — Founder's Eyes Only |

---

## The Core Principle

> "The product sells itself. My job is to get it in front of the right people and give them the tools to sell it internally."

---

## 30-Second Demo Call Opener

Use this at the top of the call before the live demo:

> "What I'm about to show you is not a chatbot and it's not just a phone assistant. Think of it as one intelligent front door for the business. Your customer experiences one number and one consistent conversation. Under the hood, the platform can handle booking, qualification, routing, follow-up, and reporting without your team juggling it manually."

### What this opener does

1. Frames the product as operational infrastructure, not novelty AI.
2. Keeps the customer-facing surface simple: one number, one experience.
3. Creates space to explain hidden specialist capabilities later without making the product sound complicated.

---

## Phase 1: Demo Call (30–45 minutes)

Remington demos the live phone agent to the decision-maker.

| Time | Activity |
|------|----------|
| **0–5 min** | Rapport. "How many locations do you have? What happens when the phone rings and nobody picks up?" |
| **5–10 min** | Pain discovery. Quantify missed calls, estimate revenue loss. |
| **10–20 min** | Live demo. "Let's call the demo number together." Decision-maker hears the agent answer, ask questions, book an appointment. |
| **20–30 min** | Scale pitch. "You just heard it for one fictional business. Imagine this at your 10 locations." Walk through ROI math live. |
| **30–35 min** | Demo Kit introduction. "I have something for you. Let me give you a Demo Kit so you can show your team what you just saw." |
| **35–45 min** | Next steps. Schedule the team demo window. Set expectations. |

**Outcome:** Decision-maker is impressed. Needs to sell internally. Gets the Demo Kit.

> "I don't send proposals. I send you a phone number. Your team calls it. The product sells itself."

---

## Phase 2: Demo Kit (3–7 days)

The owner demos to their board/leadership team using the Demo Kit (see 03_DEMO_KIT_SPEC.md).

| Aspect | Detail |
|--------|--------|
| **Remington's role** | Available on Slack/WhatsApp. Answers questions. Celebrates wins. Light touch. |
| **Owner's role** | Shares the demo phone number internally. Lets leadership call it. Collects reactions. |
| **Duration** | 3–7 days is typical. No pressure. The product does the work. |

**Outcome:** Internal buy-in. Owner comes back: "Let's do a trial."

---

## Phase 3: 2-Week Trial

A real phone agent configured for one location/department. Tested internally by the owner, employees, friends, and family on a dedicated test number. No real customers involved. See 04_TRIAL_PLAYBOOK.md for day-by-day structure.

| Aspect | Detail |
|--------|--------|
| **Setup** | Agent configured with real business knowledge, dedicated test number, calendar integration |
| **Who tests** | Owner, employees, friends, family — internal circle only |
| **Remington's role** | Monitors daily, tunes the agent, provides weekly data snapshots |
| **Data collected** | Scenarios tested, accuracy, appointments booked correctly, escalation rate, team confidence |

**Outcome:** Team confidence — the people who matter have tested it and are convinced. Go-live becomes the obvious next step.

---

## Phase 4: Close (30-minute data review)

| Time | Activity |
|------|----------|
| **0–5 min** | "How did it feel having the agent on your team for 2 weeks?" Let them talk. |
| **5–15 min** | Present metrics dashboard: calls handled, missed calls before vs. during trial, appointments booked, response times, escalation rate. |
| **15–20 min** | Scale projection: "Here's what this looks like across all [N] locations." Multiply the data. |
| **20–25 min** | Present pricing. Anchor high (Enterprise/Sovereign €100K–€195K), recommend Dream Team (€35K+). Reference the trial data. |
| **25–30 min** | Close or schedule decision meeting with full team. |

> "You've seen the data. [X] calls answered, [Y] appointments booked, [Z] minutes average response time. Across all [N] locations, that's €[amount] per month in recovered revenue. The setup pays for itself in [M] months."

---

## Objection Handling (Mid-Market)

| Objection | Response |
|-----------|----------|
| "We need to go through procurement." | "Understood. The trial data is your business case. I can help you structure the internal proposal — I've done it before." |
| "We already have a call center." | "Great. How much does your call center know about your specific services at each location? Can they book appointments directly into your calendar? Your trial data shows our agent does both." |
| "€35K is significant." | "You saw the data. [X] missed calls per week at your average customer value = €[Y] per month in lost revenue. The setup pays for itself in [Z] months. And that's one location — we're talking about [N]." |
| "Let me think about it." | "Of course. The trial data is yours — I'll send the full report. The agent learned a lot in 2 weeks. I can extend the trial another 7 days if you want more time. But everything it learned stays only if you continue." |
| "Can we start with just one location?" | "Absolutely. That's exactly what Single Location is for — €12K setup, €999/month. When you're ready for more, we scale it." |

---

## Objection Handling (Platform / Telephony)

These objections require tighter answers because they determine whether the buyer understands the product as a platform or as a single-purpose phone bot.

| Objection | Response |
|-----------|----------|
| "Do we need a different phone number for every agent?" | "No. A different number is optional, not required. The business can keep one visible number. Our platform decides whether one generalist handles the interaction or whether a specialist takes over under the hood." |
| "What happens if one agent can't answer something?" | "That is exactly where the platform advantage shows up. We can route internally to a specialist, escalate to a human, or apply a different knowledge scope without forcing the caller to navigate a new system." |
| "We already use Twilio." | "That is fine. We are not asking you to rebuild your telephony stack from scratch. The goal is to bring provider setup and routing under our control plane so Twilio becomes an ingress layer feeding the agent system." |
| "We already use Infobip for messaging." | "Also fine. The platform can treat telephony, SMS, and WhatsApp as separate provider bindings. The customer-facing workflow stays stable while we choose the right provider per channel and deployment profile." |
| "Why not just build one giant agent?" | "Sometimes that is the right move. We use one composite agent when the policies and knowledge are shared. We split into specialists only when departments need different tools, rules, or escalation paths." |
| "Will customers notice the routing?" | "They should not. The best outcome is one coherent conversation while the platform handles routing invisibly. The caller cares about getting the right answer, not how many internal specialists were involved." |

### Internal rule for answering these objections

Always reduce to this frame:

1. one public entry point,
2. one coherent customer experience,
3. flexible internal routing,
4. provider choice by deployment, not by product fork.

---

## Additional Layer: German-First / DSGVO / Multimodal Conversation

This section is additive guidance only.

It does not replace the existing sales motion.

### When to introduce this layer

Do not lead the call with compliance architecture.

Lead with:

1. revenue leakage,
2. missed calls,
3. the live demo,
4. the operational wedge.

Introduce the German-first / DSGVO-first / sovereign layer when:

1. the buyer asks about data residency,
2. IT or procurement joins,
3. the buyer already understands the operational value and now wants risk clarity,
4. the deal is clearly moving toward enterprise review.

### Recommended talk track

Use this progression:

1. "The phone is the wedge, not the whole story."
2. "Underneath it is a multimodal runtime for voice, text, documents, image, and follow-up workflows."
3. "We can apply different deployment profiles depending on how strict you need the processing path to be."
4. "That is the difference between `Cloud`, `Dedicated-EU`, and `Sovereign Preview`."

### Short version for live calls

> "We do not answer the DSGVO question with one vague sentence. We answer it by deployment profile. `Cloud` is compliant SaaS. `Dedicated-EU` is for buyers who want the live-call path constrained to the EEA. `Sovereign Preview` is for buyers who want customer-controlled or tightly isolated infrastructure with a reduced feature envelope."

### Why this matters in sales

This framing does three useful things:

1. it sounds precise instead of performative,
2. it gives procurement a credible path without overpromising,
3. it lets us stay premium while keeping `Cloud` sellable.

### Additional objection handling (DACH trust posture)

| Objection | Response |
|-----------|----------|
| "Are you really DSGVO-compliant?" | "Yes, and we answer that by deployment tier rather than hand-waving. `Cloud` is compliant SaaS with DPA and disclosed subprocessors. `Dedicated-EU` adds an EEA-only live-call hot path. `Sovereign Preview` is for stricter infrastructure and processor controls." |
| "Do you use US vendors?" | "Potentially in `Cloud`, where contractually covered and disclosed. Not by default in the stricter profiles if the deployment policy forbids them." |
| "Can we choose how the model is used?" | "Yes. The point is not just model access. It is policy: which providers are allowed, in which region, for which workload, with what retention and support-access rules." |
| "Can you host in Germany?" | "We only make that claim where the actual processing path supports it. Otherwise we describe the offer accurately as compliant SaaS, EEA-constrained deployment, or Sovereign Preview." |
| "Why does multimodal matter if we start with the phone?" | "Because real customer operations do not stay in one channel. Calls create transcripts, follow-ups, documents, messages, and operator actions. The same governed runtime should cover the full workflow." |

### Internal rule

The landing page can hint at this.

The sales conversation should explain it.

The procurement packet should prove it.

---

## Weekly Rhythm

| Activity | Target |
|----------|--------|
| Demo calls | 3–5 per week |
| Demo Kit follow-ups | 2–3 per week |
| Trial check-ins | 1–2 per week |
| Close calls | 1 per week |
| LinkedIn content | 3 posts per week |
| BNI introductions | 1–2 warm intros per week |

---

## Pipeline Math

| Stage | Conversion | Monthly Volume |
|-------|------------|----------------|
| Demo calls | — | 15–20 |
| Demo Kit sent | 70% of demos | 10–14 |
| Trial started | 60% of Demo Kits | 6–8 |
| Close | 50% of trials | 3–4 |
| **Deals/month** | | **3–4** |
| **Revenue/month** | | **€100K–€600K** (mix-dependent) |

### Reading the pipeline

- At the low end (3 deals at €35K): €105K/month in setup revenue
- At the high end (4 deals at €150K average): €600K/month in setup revenue
- Realistic steady-state mix: 2 Dream Team + 1 Sovereign per month = ~€265K/month
- This pipeline requires ~15 demo calls per month, or ~4 per week
- One founder can do this. Barely. Which is why every demo must convert at the highest possible rate.

---

*Created: March 2026*
*Status: Operative — companion to 00_EXECUTIVE_BRIEF.md and 01_ICP_AND_VERTICALS.md*
*Next step: Build Demo Kit (03_DEMO_KIT_SPEC.md) and Trial Playbook (04_TRIAL_PLAYBOOK.md)*
