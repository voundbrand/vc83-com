# Document 03: Financial Model

**Seven Layers (formerly L4YERCAK3) | Founder's Operating Strategy**
**Date:** 2026-02-23
**Classification:** Internal — Founder's Eyes Only
**Purpose:** Revenue projections, unit economics, and the math behind the strategy.

---

## How to Use This Document

This is the numbers doc. Every projection has stated assumptions. When reality diverges from assumptions, update the model. Review monthly for the first 12 months, quarterly after that.

---

## A. Revenue Streams

| Stream | Description | % of Revenue (Steady State) |
|--------|------------|---------------------------|
| **Subscriptions** | Monthly/annual tier fees | 65-70% |
| **Message overages** | €19/1,000 messages above plan limit | 10-15% |
| **Add-ons** | Channels, voice, white-label, API | 10-15% |
| **Agency referral fees** | Commission from agency-referred clients | 5-10% |
| **Custom frameworks** | One-time ingestion of proprietary content | 2-5% |

---

## B. Pricing Architecture

### B.1 Tier Structure

| | **Free** | **Starter** | **Pro** | **Scale** | **Enterprise** |
|---|---|---|---|---|---|
| **Monthly** | €0 | €49 | €149 | €399 | Custom |
| **Annual** | — | €39/mo (€468/yr) | €119/mo (€1,428/yr) | €319/mo (€3,828/yr) | Custom |
| **Messages** | 50/mo | 500/mo | 2,000/mo | 10,000/mo | Unlimited |
| **Channels** | Webchat | +1 (WhatsApp/Telegram) | All | All + custom | All + API |
| **Dream Team** | Invisible only | Invisible + 1 direct | All core + template library + team meetings | All + custom souls + full library | All + proprietary + unlimited |
| **Users** | 1 | 2 | 5 | 15 | Unlimited |
| **Privacy mode** | — | — | ✅ | ✅ | ✅ + on-prem |

### B.2 Add-Ons

| Add-On | Price | Expected Attach Rate |
|--------|-------|---------------------|
| Extra messages (1,000) | €19 | 20% of Starter/Pro users |
| Additional channel | €29/mo | 15% of Starter users |
| Voice minutes | €0.10/min | 10% of Pro+ users |
| Priority model routing | €29/mo | 5% of all paid |
| Custom expert framework | €199 one-time | 3% of Pro+ users |
| White-label | €99/mo | Agency partners only |
| API access | €49/mo | 5% of Scale+ users |

---

## C. Blended ARPU Model

### C.1 Tier Mix Evolution

| Period | Free | Starter | Pro | Scale | Blended ARPU (paid only) |
|--------|------|---------|-----|-------|-------------------------|
| Month 1-3 | 70% | 20% | 8% | 2% | €62/mo |
| Month 4-6 | 65% | 22% | 10% | 3% | €68/mo |
| Month 7-12 | 60% | 25% | 10% | 5% | €75/mo |
| Year 2 | 50% | 28% | 14% | 8% | €88/mo |
| Year 3+ | 40% | 30% | 18% | 12% | €108/mo |

**ARPU growth drivers:**
1. Soul depth creates upgrade pressure (users want more messages, more channels)
2. Dream Team discovery drives Starter → Pro upgrades (users want team meetings + access to the full template library)
3. Business growth drives Pro → Scale upgrades (more users, voice, autonomy)
4. Add-on attach rate increases with usage depth

### C.2 ARPU Calculation (Month 7-12 Example)

| Component | Calculation | Monthly Revenue per Paid User |
|-----------|------------|------------------------------|
| Base subscription | 25% × €49 + 10% × €149 + 5% × €399 = | €47.20 weighted avg |
| Message overages | 20% attach × €19 avg | €3.80 |
| Channel add-ons | 15% attach × €29 | €4.35 |
| Voice | 10% attach × €15 avg | €1.50 |
| Other add-ons | 5% attach × €40 avg | €2.00 |
| **Total blended ARPU** | | **~€59** (conservative) |

*Note: The €75/mo in the tier mix table includes the impact of annual discounts bringing the effective rate down. The actual collected revenue tracks between €59-75 depending on annual vs. monthly mix.*

---

## D. Revenue Projections

### D.1 Path to €1M ARR (18 Months)

**Assumptions:**
- Free → paid conversion: 15% within 30 days (industry avg 5-10%; we assume higher due to soul stickiness)
- Monthly churn (paying): 5% (reduces to 3% as soul depth increases after month 12)
- Blended ARPU grows from €62 → €75/mo over 12 months
- No agency channel revenue in months 1-6

| Month | New Signups | New Paying | Total Paying | Churned | Net Paying | ARPU | MRR | ARR |
|-------|-----------|-----------|-------------|---------|-----------|------|-----|-----|
| 1 | 100 | 15 | 15 | 0 | 15 | €62 | €930 | €11K |
| 2 | 150 | 22 | 37 | 1 | 36 | €62 | €2,232 | €27K |
| 3 | 200 | 30 | 66 | 2 | 64 | €62 | €3,968 | €48K |
| 4 | 250 | 38 | 102 | 3 | 99 | €65 | €6,435 | €77K |
| 5 | 300 | 45 | 144 | 5 | 139 | €65 | €9,035 | €108K |
| 6 | 400 | 60 | 199 | 7 | 192 | €68 | €13,056 | €157K |
| 7 | 500 | 75 | 267 | 10 | 257 | €70 | €17,990 | €216K |
| 8 | 600 | 90 | 347 | 13 | 334 | €72 | €24,048 | €289K |
| 9 | 700 | 105 | 439 | 17 | 422 | €73 | €30,806 | €370K |
| 10 | 800 | 120 | 542 | 21 | 521 | €74 | €38,554 | €463K |
| 11 | 900 | 135 | 656 | 26 | 630 | €75 | €47,250 | €567K |
| 12 | 1,000 | 150 | 780 | 32 | 748 | €75 | €56,100 | €673K |
| 13 | 1,100 | 165 | 913 | 27* | 886 | €78 | €69,108 | €829K |
| 14 | 1,200 | 180 | 1,066 | 27 | 1,039 | €80 | €83,120 | €997K |
| **15** | **1,300** | **195** | **1,234** | **31** | **1,203** | **€82** | **€98,646** | **€1.18M** |

*\*Churn drops from 5% to 3% at month 13 as soul depth increases.*

**€1M ARR hit at approximately month 14-15.**

### D.2 Path to €5M ARR (30-36 Months)

| Month | Total Paying | ARPU | MRR | ARR |
|-------|-------------|------|-----|-----|
| 15 | 1,203 | €82 | €99K | €1.18M |
| 18 | 1,800 | €88 | €158K | €1.9M |
| 21 | 2,500 | €92 | €230K | €2.8M |
| 24 | 3,400 | €98 | €333K | €4.0M |
| 27 | 4,200 | €102 | €428K | €5.1M |
| 30 | 5,200 | €108 | €562K | €6.7M |
| 36 | 7,500 | €115 | €863K | €10.4M |

**Growth assumptions (month 18+):**
- Agency channel contributes 20% of new customers
- Word-of-mouth / referrals contribute 30% of new customers
- Monthly organic growth: 15-20% month-over-month in new signups
- Churn: 3% (soul lock-in)
- ARPU growth: driven by tier upgrades + add-on adoption

### D.3 Revenue Composition at €5M ARR

```
Subscriptions:     €3.5M  (70%)  ████████████████████
Message overages:  €500K  (10%)  ███
Add-ons:           €500K  (10%)  ███
Agency referrals:  €375K  (7.5%) ██
Custom frameworks: €125K  (2.5%) █
────────────────────────────────────
Total:             €5.0M  (100%)
```

---

## E. Unit Economics

### E.1 Customer Acquisition Cost (CAC)

| Channel | Estimated CAC | Volume % | Notes |
|---------|-------------|----------|-------|
| Personal outreach | €15 | 30% (early) → 5% | Founder's time only |
| Content/SEO | €25 | 40% → 35% | Content creation + tools |
| Referral | €10 | 10% → 25% | Referral credits |
| Agency referrals | €0 direct (20% commission) | 5% → 20% | Commission is ongoing, not upfront |
| Paid ads | €80-120 | 0% → 15% | Added at month 6+ when CAC is proven |
| **Blended CAC** | **€30-50** (early) → **€40-60** (scale) | | |

### E.2 Lifetime Value (LTV)

| Scenario | Monthly Churn | Avg Lifetime | ARPU | LTV |
|----------|-------------|-------------|------|-----|
| Conservative | 5% | 20 months | €75 | €1,500 |
| Expected | 3% | 33 months | €88 | €2,904 |
| Optimistic | 2% | 50 months | €102 | €5,100 |

**LTV is driven by soul lock-in.** As the agent accumulates memories, conversation history, and soul evolution cycles, the switching cost increases exponentially. A user at month 12 has a fundamentally different (higher) LTV than a user at month 1.

### E.3 Key Ratios

| Metric | Value | Benchmark | Status |
|--------|-------|-----------|--------|
| **LTV:CAC** | 30-72x | >3x is healthy | ✅ Exceptional |
| **Payback period** | <1 month | <12 months | ✅ Excellent |
| **Gross margin** | 75-80% | >70% for SaaS | ✅ Healthy |
| **Net Revenue Retention** | 110-120% | >100% = expansion | ✅ Growing |
| **CAC:Monthly ARPU** | 0.4-0.8x | <1x = healthy | ✅ Strong |

---

## F. Cost Structure

### F.1 Cost of Goods Sold (COGS)

| Cost Item | Per-User/Month | At 1,000 Users | At 5,000 Users | Notes |
|-----------|---------------|----------------|----------------|-------|
| **LLM API (OpenAI/Anthropic)** | €5-15 | €7,500 | €30,000 | Model router optimizes; privacy mode offloads |
| **Infrastructure (Convex)** | €1-3 | €2,000 | €8,000 | Scales with usage |
| **WhatsApp BSP** | €0.50-2 | €1,000 | €5,000 | Per-conversation pricing |
| **Voice (ElevenLabs)** | €0-5 | €500 | €3,000 | Only Scale+ users |
| **Email/SMS delivery** | €0.10-0.50 | €200 | €1,000 | Transactional + marketing |
| **Total COGS** | **€8-20** | **€11,200** | **€47,000** | |
| **Gross margin** | | **85%** | **78%** | Margin compresses slightly at scale |

### F.2 Operating Expenses

| Category | Month 1-6 | Month 7-12 | Month 13-24 | Notes |
|----------|-----------|-----------|-------------|-------|
| **Founder salary** | €5K | €5K | €7K | Below market; reinvesting |
| **Content hire** | €0 | €4K | €4.5K | First hire at month 4-6 |
| **Community manager** | €0 | €0 | €3K | At month 12-15 |
| **Customer success** | €0 | €0 | €3K | At month 15+ |
| **Marketing/ads** | €0 | €2K | €5K | Start testing at month 6 |
| **Tools/SaaS** | €500 | €1K | €2K | Analytics, video, design |
| **Legal/accounting** | €500 | €500 | €1K | GDPR, terms, bookkeeping |
| **Buffer** | €1K | €1K | €2K | Unexpected costs |
| **Total OpEx** | **€7K/mo** | **€13.5K/mo** | **€27.5K/mo** | |

### F.3 Burn Rate and Runway

| Period | Monthly Burn | Revenue | Net Burn | Cumulative |
|--------|-------------|---------|----------|-----------|
| Month 1-3 | €7K + €3K COGS = €10K | €2.4K avg | €7.6K | €23K |
| Month 4-6 | €10K + €5K COGS = €15K | €9.5K avg | €5.5K | €40K |
| Month 7-9 | €14K + €8K COGS = €22K | €24K avg | +€2K | €33K |
| Month 10-12 | €14K + €11K COGS = €25K | €47K avg | +€22K | Profitable |

**Break-even: ~Month 8-9** (at €12-15K MRR)
**Total funding needed: ~€40-50K** (bootstrappable)

> **So What?** This is a bootstrappable business. No venture capital required to reach profitability. The total pre-profit burn of ~€40-50K is manageable from savings or a small angel round. By month 10, the business is self-sustaining.

---

## G. Scenario Analysis

### G.1 Optimistic Scenario

**Assumptions:** 20% free→paid conversion, 3% churn from day 1, viral coefficient of 0.5

| Milestone | Timeline |
|-----------|----------|
| €1M ARR | Month 10-11 |
| €5M ARR | Month 22-24 |
| Break-even | Month 5-6 |

### G.2 Base Case (Used in This Model)

**Assumptions:** 15% free→paid conversion, 5%→3% churn, viral coefficient of 0.3

| Milestone | Timeline |
|-----------|----------|
| €1M ARR | Month 14-15 |
| €5M ARR | Month 28-30 |
| Break-even | Month 8-9 |

### G.3 Pessimistic Scenario

**Assumptions:** 8% free→paid conversion, 7% churn, viral coefficient of 0.15

| Milestone | Timeline |
|-----------|----------|
| €1M ARR | Month 22-24 |
| €5M ARR | Month 40+ |
| Break-even | Month 14-16 |

### G.4 Survival Scenario

**Assumptions:** 5% conversion, 8% churn, minimal virality

| Milestone | Timeline |
|-----------|----------|
| €1M ARR | Month 30+ |
| Break-even | Month 18-20 |
| Total funding needed | €80-100K |

**Even in the survival scenario, the business is viable.** The soul lock-in effect means that users who DO convert have very long lifetimes. The question is conversion rate, not retention.

---

## H. Sensitivity Analysis

### H.1 What Moves the Needle Most?

| Variable | +50% Impact on Month-18 ARR | -50% Impact on Month-18 ARR |
|---------|---------------------------|---------------------------|
| **Conversion rate** (15% → 22.5% / 7.5%) | +€680K (+58%) | -€590K (-50%) |
| **Churn rate** (5% → 2.5% / 7.5%) | +€320K (+27%) | -€280K (-24%) |
| **ARPU** (€75 → €112 / €38) | +€540K (+46%) | -€590K (-50%) |
| **Signup growth** (+50% more / -50% fewer) | +€480K (+41%) | -€440K (-37%) |

**Conversion rate and ARPU are the highest-leverage variables.** This means:
1. The birthing experience must be extraordinary (drives conversion)
2. The upgrade path must be natural (drives ARPU)
3. Soul depth must create genuine switching cost (holds churn low)

### H.2 LLM Cost Sensitivity

| LLM Cost per User/Month | Gross Margin at €75 ARPU | Impact |
|------------------------|-------------------------|--------|
| €5 (optimistic) | 93% | Very healthy |
| €10 (base case) | 87% | Healthy |
| €15 (conservative) | 80% | Acceptable |
| €25 (pessimistic) | 67% | Needs model optimization |
| €40 (worst case) | 47% | Unsustainable — requires pricing change |

**Mitigation:** Model policy router routes queries to cost-appropriate models. Privacy mode offloads to local inference ($0 LLM cost). As models get cheaper (historical trend: 10-30% cost reduction per year), margins improve automatically.

---

## I. Annual Revenue Summary

| Year | Paying Customers | Blended ARPU | ARR | Gross Margin | Net Profit |
|------|-----------------|-------------|-----|-------------|-----------|
| **Year 1** | 748 | €75 | €673K | 82% | ~€100K |
| **Year 2** | 3,400 | €98 | €4.0M | 78% | ~€1.4M |
| **Year 3** | 7,500 | €115 | €10.4M | 76% | ~€3.5M |

**Year 3 operating margin: ~34%** — excellent for a SaaS business at this stage.

---

## J. Fundraising Scenarios (If Needed)

### J.1 Bootstrap Path (Recommended)

- Total pre-profit investment: €40-50K
- Source: Founder savings or small friends & family
- Advantage: Full ownership, full control, no board, no dilution
- Risk: Slower growth if conversion is below base case

### J.2 Small Angel Round

- Amount: €100-200K
- Dilution: 5-10%
- Valuation: €1.5-3M pre-money
- Use: Hire content person earlier, test paid acquisition sooner, extend runway
- When: If month 6 conversion is below 10%

### J.3 Seed Round (Month 18+ if growth warrants)

- Amount: €500K-1.5M
- Dilution: 15-20%
- Valuation: €3-8M (at €1M+ ARR)
- Use: Engineering hire, international expansion, enterprise features
- When: Only if €1M ARR achieved and growth is accelerating

### J.4 Series A (Month 30+ if scaling)

- Amount: €3-8M
- Dilution: 20-25%
- Valuation: €15-30M (at €5M+ ARR)
- Use: Full team buildout, 5+ markets, enterprise sales team
- When: Only if €5M ARR trajectory is clear

> **So What?** The business can be bootstrapped to profitability. External funding is optional acceleration, not survival. This is a strong negotiating position — you never NEED to raise, so you only raise on good terms.

---

## K. Key Financial Metrics to Track

| Metric | Target | Review Frequency |
|--------|--------|-----------------|
| MRR | Growing monthly | Weekly |
| MRR growth rate | >15% MoM (early), >10% MoM (scale) | Monthly |
| Gross margin | >75% | Monthly |
| CAC | <€60 | Monthly |
| LTV:CAC | >15x | Quarterly |
| Payback period | <1 month | Quarterly |
| Burn rate | Below revenue by month 9 | Monthly |
| Cash in bank | >3 months of expenses | Monthly |
| NRR (Net Revenue Retention) | >110% | Quarterly |
| ARPU trend | Increasing | Monthly |

---

*End of Document 03. See Document 01 (Strategic Analysis) for the strategy behind these numbers, Document 02 (GTM Playbook) for execution, and Document 04 (Market Research Appendix) for the market data.*
