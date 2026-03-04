# Document 02: Lead Generation Engine

**Seven Layers | One-of-One Strategy v2**
**Date:** 2026-03-03
**Classification:** Internal — Founder's Eyes Only

**Tax convention:** Consulting Sprint (€3,500) and Foundation setup (from €7,000) are net prices (excl. VAT).

---

## The Core Insight

The lead magnet is not a PDF. It's not a video course. It's not a beta code. **The lead magnet is a live AI agent that creates a personalized deliverable for the customer on the fly.**

This is the single biggest advantage Seven Layers has over every competitor. Nobody else can do this. The prospect doesn't download something — they experience something. And the experience is so good it creates the desire to buy.

---

## Two Parallel Paths

The landing page offers two parallel entry points. Both are always visible. Neither is hidden behind the other.

### Path A: The AI Diagnostic (Samantha)

| Attribute | Detail |
|---|---|
| **What it is** | An embedded AI agent on the landing page that runs a 7-minute diagnostic audit |
| **How it works** | Samantha asks 5 questions about their business, analyzes answers in real-time, delivers a specific highest-leverage workflow recommendation |
| **What the customer gets** | A personalized, actionable recommendation — not generic advice |
| **What we get** | A qualified lead with deep context about their business, pain points, and readiness |
| **Time to value** | 7 minutes |
| **COGS** | ~€0.15–0.30 per session |

**The 5 Questions (Diagnostic Flow):**

1. What does your business do? (Industry, service, size)
2. What's your biggest operational bottleneck right now? (Pain identification)
3. How do you currently handle [the bottleneck]? (Current solution / workaround)
4. What would solving this be worth to you — in time or money? (Value quantification)
5. What have you already tried? (Sophistication level + objection pre-handling)

After 5 answers, Samantha delivers a specific workflow recommendation: "Based on what you've told me, your highest-leverage workflow is [X]. Here's how it would work..."

**Why this works better than a discovery call:**
- No scheduling friction. Available 24/7.
- The prospect controls the pace.
- The AI remembers everything — no repeating yourself later.
- It's the product demonstrating itself. The lead magnet IS the product.
- The landing page copy says it directly: "Why not a discovery call? You've sat through enough... The operator you just talked to IS the discovery."

### Path B: Book a Live Demo

| Attribute | Detail |
|---|---|
| **What it is** | A prominent CTA button linking directly to Remington's calendar |
| **Who it's for** | Serious buyers who want to skip the funnel and talk to a human |
| **What happens** | 30-minute founder-led demo. Live birthing or Meta Glasses demo depending on context. |
| **Why it exists** | Not everyone wants to chat with AI first. Some people want to see the founder, ask questions, and feel the human behind the product. |

**Placement:** Side by side with the diagnostic. Not buried. Not secondary. Both paths are equal citizens on the page.

---

## The Funnel: Diagnostic to Close

```
Landing Page Visit
    ├── Path A: AI Diagnostic (7 min)
    │   ├── Completes diagnostic → sees recommendation
    │   │   ├── Clicks CTA → enters platform / books call
    │   │   └── Leaves → retargeting (email if captured, otherwise gone)
    │   └── Abandons mid-diagnostic → partial lead (session data captured)
    │
    └── Path B: Book a Live Demo
        └── Calendar booking → 30-min founder demo
            ├── Interested → beta code / 7-day trial
            └── Not ready → nurture sequence

After Diagnostic or Demo:
    → Beta code / 7-day trial (AI continues learning their business)
    → Day 3: curiosity check-in ("Your agent learned X about your business. What do you think?")
    → Day 7: founder-led close call ("Your 7-day access ends today. Want to keep what it learned?")
    → Close: Foundation (€7K excl. VAT) or Consulting Sprint (€3.5K excl. VAT) if they need more time
```

---

## Lead Qualification (Automatic)

The diagnostic naturally qualifies leads by what they reveal:

| Signal | Qualification Level | Next Action |
|---|---|---|
| Revenue €1.8M+ mentioned | High | Priority follow-up, demo offer |
| Multiple pain points, high value quantification | High | Foundation pitch |
| Single pain point, moderate value | Medium | Consulting sprint offer |
| "Just curious" / no clear pain | Low | Nurture email, no active pursuit |
| Asks about pricing during diagnostic | Hot | Immediate human handoff |

Samantha captures all of this in the session. By the time Remington gets on a call, he knows everything the prospect said.

---

## Lead Capture Mechanics

The diagnostic captures leads through progressive disclosure:

1. **Session start:** Anonymous. No email required. Just start chatting.
2. **After question 3:** Samantha naturally asks for a name (conversational, not a form).
3. **After recommendation:** CTA to "continue with your operator" — requires email/Google sign-in.
4. **Handoff links:** Three options presented after diagnostic:
   - "Continue the conversation" (resume chat in the platform, free path)
   - "Consulting sprint — scope only" (€3,500 excl. VAT, checkout-first)
   - "Full implementation" (from €7,000 excl. VAT Foundation, checkout-first)

The handoff system is already built. See [handoff.ts](../../apps/one-of-one-landing/lib/handoff.ts) for the commercial intent routing. The €3,500 excl. VAT CTA maps to `consult_done_with_you`; the €7,000 excl. VAT CTA maps to `layer1_foundation`; both route to Store checkout first and then Stripe. Paid-product CTAs in the landing commercial flow do not deep-link to chat.

In the detailed pricing accordion:
- Stripe-checkout-capable rows route to checkout-first URLs.
- Non-Stripe / not-configured rows open a localized prefilled email to `remington@sevenlayers.io` (with offer details and source metadata).

---

## Attribution Tracking

Every lead carries full campaign attribution through the funnel:

- UTM parameters (source, medium, campaign, content, term)
- Referrer URL
- Landing path
- Session token (ties diagnostic conversation to platform account)
- Claim token (ties anonymous session to authenticated user)

This means we can trace: "This €7K Foundation client came from a BNI member's LinkedIn share → landed on the diagnostic → completed 5 questions → signed up → closed on Day 7 call."

---

## Metrics to Track

| Metric | Target | Measured By |
|---|---|---|
| Landing page → diagnostic start | 40%+ | Session created |
| Diagnostic start → completion (5 questions) | 60%+ | All 5 questions answered |
| Diagnostic completion → CTA click | 30%+ | Handoff link clicked |
| CTA click → account created | 50%+ | Google sign-in completed |
| Account created → 7-day trial | 80%+ | Beta code activated |
| 7-day trial → close call | 60%+ | Call booked |
| Close call → paid client | 40%+ | Payment received |
| **Landing page → paid client** | **~3–5%** | End-to-end conversion |
| Book Demo → call completed | 70%+ | Calendar event attended |
| Demo call → paid client | 50%+ | Payment received |

---

## The Key Insight: Why This Beats Everything Else

Every other company in this space does one of these:

1. **Content marketing:** Blog posts, webinars, whitepapers → lead form → sales call. 3–6 month cycle.
2. **Product-led growth:** Free tier → usage → upgrade prompt. Works for $49/mo SaaS, not for €7K.
3. **Outbound sales:** Cold email/call → discovery → demo → proposal. 2–4% conversion.

Seven Layers does something nobody else can:

**The prospect experiences the product, gets genuine value, and the AI captures the lead — all in 7 minutes, with zero human involvement.** By the time a human enters the picture, the prospect already believes. The sales call isn't about convincing. It's about choosing which tier.

This is "give away the secrets, sell the implementation" made literal. The diagnostic gives away the strategic insight. The implementation is what costs money.

---

*See [03_SALES_MOTION.md](./03_SALES_MOTION.md) for what happens after the lead is captured. See [01_PRICING_LADDER.md](./01_PRICING_LADDER.md) for tier details.*
