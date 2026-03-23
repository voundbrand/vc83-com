# One-of-One Strategy v4 — Unit Economics

| Field | Value |
|-------|-------|
| **Document** | 08 — Unit Economics |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |

---

## COGS Waterfall

### Per-Minute Cost Breakdown

| Component | Cost/min (USD) | Cost/min (EUR) | Source |
|-----------|---------------|---------------|--------|
| ElevenLabs voice (Business plan) | $0.08 | ~€0.074 | elevenlabs.io/pricing |
| LLM pass-through (current: absorbed) | $0.00 | €0.00 | Currently free, will change |
| LLM pass-through (future estimate) | $0.01-0.08 | ~€0.009-0.074 | 10-30% adder per ElevenLabs docs |
| Twilio Germany inbound | $0.01 | ~€0.009 | twilio.com/voice/pricing/de |
| Twilio German local number | $1.15/month | ~€1.06/month | twilio.com/phone-numbers/pricing |
| **Total per minute (today)** | **$0.09** | **~€0.083** | |
| **Total per minute (LLM pass-through)** | **$0.10-0.17** | **~€0.092-0.157** | |

### Monthly COGS by Firm Size

**Assumptions:** Average call duration 3 minutes. Business days: 20/month. LLM pass-through at $0.03/min estimate.

| Firm Size | Calls/Day | Minutes/Month | COGS/Month (today) | COGS/Month (with LLM) |
|-----------|-----------|---------------|--------------------|-----------------------|
| 5 lawyers | 20-30 | 1,200-1,800 | €100-149 | €110-283 |
| 10 lawyers | 35-50 | 2,100-3,000 | €174-249 | €193-471 |
| 15 lawyers | 50-70 | 3,000-4,200 | €249-348 | €276-659 |
| 20 lawyers | 60-80 | 3,600-4,800 | €299-398 | €331-754 |

**Note:** Not all calls go to our agent. These are overflow/after-hours estimates. Actual may be 40-60% of total call volume.

---

## Margin Analysis by Tier

### Today (LLM costs absorbed by ElevenLabs)

| | Basis (€499/mo) | Professional (€999/mo) | Premium (€1,999/mo) |
|-|-----------------|----------------------|---------------------|
| Revenue | €499 | €999 | €1,999 |
| ElevenLabs COGS | -€110 | -€260 | -€440 |
| Twilio | -€5 | -€10 | -€20 |
| **Gross margin** | **€384 (77%)** | **€729 (73%)** | **€1,539 (77%)** |
| Time cost (at €75/hr) | -€263 (3.5h) | -€413 (5.5h) | -€525 (7h) |
| **Contribution margin** | **€121 (24%)** | **€316 (32%)** | **€1,014 (51%)** |

### Future (with LLM pass-through at ~$0.03/min)

| | Basis (€499/mo) | Professional (€999/mo) | Premium (€1,999/mo) |
|-|-----------------|----------------------|---------------------|
| Revenue | €499 | €999 | €1,999 |
| ElevenLabs + LLM COGS | -€155 | -€365 | -€625 |
| Twilio | -€5 | -€10 | -€20 |
| **Gross margin** | **€339 (68%)** | **€624 (62%)** | **€1,354 (68%)** |
| Time cost (at €75/hr) | -€263 | -€413 | -€525 |
| **Contribution margin** | **€76 (15%)** | **€211 (21%)** | **€829 (41%)** |

### Target state (Month 6+, templates reduce time by 50%)

| | Basis (€499/mo) | Professional (€999/mo) | Premium (€1,999/mo) |
|-|-----------------|----------------------|---------------------|
| Revenue | €499 | €999 | €1,999 |
| COGS (with LLM) | -€160 | -€375 | -€645 |
| Time cost (reduced) | -€131 (1.75h) | -€225 (3h) | -€300 (4h) |
| **Contribution margin** | **€208 (42%)** | **€399 (40%)** | **€1,054 (53%)** |

---

## Break-Even Analysis

### Founder cost base

| Expense | Monthly |
|---------|---------|
| Personal living costs (Germany) | €3,000 |
| ElevenLabs platform subscription (Business) | €100 |
| Twilio base | €20 |
| Hosting / infrastructure | €100 |
| Software tools (CRM, email, etc.) | €100 |
| **Total fixed monthly** | **~€3,320** |

### Break-even customers needed

| Scenario | Avg contribution/customer | Break-even # |
|----------|--------------------------|---------------|
| Today (LLM absorbed, no templates) | €150 avg | 22 customers |
| Today (LLM absorbed, with templates) | €300 avg | 11 customers |
| Future (LLM passed through, with templates) | €250 avg | 13 customers |

**Realistic break-even: 11-15 customers** (mix of tiers, after templates reduce time costs).

---

## Scaling Math

### Solo Founder Ceiling

| Constraint | Limit |
|-----------|-------|
| Hours available per month (working) | ~180 hours |
| Hours for product / sales / admin | ~80 hours |
| Hours available for customer management | ~100 hours |
| Avg hours per customer (with templates) | 2.5-4 hours |
| **Maximum customers solo** | **25-40** |
| **Realistic (leaving buffer for sales + product)** | **12-18** |

### First Hire Trigger

| Metric | Threshold |
|--------|-----------|
| Customer count | 10-12 |
| MRR | €7,500-9,000 |
| Monthly revenue after COGS | €5,000-6,000 |
| Hire cost | €3,750-4,583/mo (€45-55K/yr incl. Sozialabgaben) |

**First hire profile:** German-speaking customer success / deployment person.
- Onboards new firms using templates
- Handles monthly prompt tuning
- Takes customer calls
- NOT a developer
- Frees founder for sales + product + partnerships

### Revenue Trajectory with Hiring

| Month | Customers | MRR | Team | Net after COGS + salaries |
|-------|-----------|-----|------|---------------------------|
| 1-3 | 3-8 | €2-6K | Solo | €1-3K |
| 4-6 | 8-15 | €6-11K | Solo | €3-5K |
| 7-9 | 15-22 | €11-16K | Solo + 1 hire | €3-6K (hire absorbs margin) |
| 10-12 | 22-35 | €16-26K | Solo + 1 hire | €6-12K |
| 13-18 | 35-60 | €26-45K | Solo + 2 hires | €10-20K |

---

## Path to Revenue Milestones

| Milestone | Customers | When | Assumption |
|-----------|-----------|------|-----------|
| €5K MRR | 7 | Month 3-4 | 2-3 new/month, €750 avg |
| €10K MRR | 14 | Month 5-7 | Ramping pipeline, call audit converting |
| €25K MRR | 33 | Month 10-14 | With first hire, capacity expanded |
| €50K MRR | 67 | Month 16-22 | Multi-vertical (Steuerberater added) |
| €100K MRR | 133 | Month 24-36 | 3-4 verticals, 5-8 person team |

---

## Setup Fee Economics

| Tier | Setup Fee | Setup COGS (time) | Setup Margin |
|------|-----------|-------------------|-------------|
| Basis | €1,500 | ~10 hrs (€750) | €750 (50%) |
| Professional | €2,000 | ~15 hrs (€1,125) | €875 (44%) |
| Premium | €2,500 | ~20 hrs (€1,500) | €1,000 (40%) |

**With templates (Month 6+):**

| Tier | Setup Fee | Setup COGS (time) | Setup Margin |
|------|-----------|-------------------|-------------|
| Basis | €1,500 | ~4 hrs (€300) | €1,200 (80%) |
| Professional | €2,000 | ~8 hrs (€600) | €1,400 (70%) |
| Premium | €2,500 | ~12 hrs (€900) | €1,600 (64%) |

---

## LTV / CAC Analysis

| Metric | Estimate |
|--------|---------|
| Average monthly churn | 5% (month-to-month, conservative) |
| Average customer lifetime | 20 months |
| Average MRR | €750 |
| **LTV** | **€15,000** |
| CAC (founder time: 5 hours pre-sale + audit) | €375 |
| **LTV:CAC** | **40:1** |

This is exceptionally high LTV:CAC because CAC is essentially just founder time — no paid acquisition. As we add paid channels, LTV:CAC will decrease but should stay above 5:1.

---

## Key Risks to Unit Economics

| Risk | Impact | Mitigation |
|------|--------|-----------|
| ElevenLabs LLM pass-through activation | +30-50% COGS | Build LLM cost into pricing headroom. Consider bringing own LLM. |
| ElevenLabs price increase | Margin compression | Own platform means ElevenLabs is swappable (Vapi, Retell, open-source alternatives). |
| Higher churn than 5% | Lower LTV | Improve onboarding, build switching costs (dashboard data, templates, RA-MICRO integration). |
| Slower pipeline than 3-5/month | Delayed break-even | Increase outreach volume. Leverage legalXchange and Anwaltstag for pipeline fill. |
| Managing partner price sensitivity | Downtier pressure | Lead with ROI data from call audit. €499 vs. €3,000 in lost Mandate is compelling. |

---

*Created: March 2026*
*Status: Operative — companion to 05_PRICING_V4.md*
*Next step: Build ROI calculator tool, track actual COGS after first 3 deployments*
