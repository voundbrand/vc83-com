# Vertical Market Analysis Prompt

Copy everything below the line, fill in the `[VARIABLES]` section, and paste into a fresh Claude session.

---

## VARIABLES — FILL THESE IN

```
VERTICAL_NAME: [e.g., "Kita-Träger (daycare operators)", "Independent pharmacies", "Pflegeheime (nursing homes)"]
COUNTRY_MARKET: [e.g., "Germany", "DACH region", "EU"]
MY_PRODUCT_THESIS: [1-2 sentences on what you'd sell them. e.g., "AI-powered scheduling compliance engine that enforces mandatory staff-patient ratios automatically"]
MY_WEDGE_HYPOTHESIS: [The specific entry point you believe would work. e.g., "Voice-first sick call intake at 6am that triggers automated compliance checks"]
MY_PRICING_MODEL: [Your target pricing. e.g., "25-50 EUR/facility/month, sold at operator level"]
WHAT_I_ALREADY_KNOW: [Paste any prior research, market data, or assumptions you want validated/invalidated]
```

---

## PROMPT — COPY FROM HERE

You are a brutally honest market research analyst. I'm the founder of a B2B SaaS / AI operations platform exploring **[VERTICAL_NAME]** in **[COUNTRY_MARKET]** as a target vertical.

**My product thesis:** [MY_PRODUCT_THESIS]

**My proposed wedge:** [MY_WEDGE_HYPOTHESIS]

**My pricing model:** [MY_PRICING_MODEL]

**What I already know (validate or invalidate this):**
[WHAT_I_ALREADY_KNOW]

---

### Run 7 parallel deep research tracks. For each, search the web thoroughly using both English and local-language queries. Cite every source with URLs.

---

### TRACK 1: OPERATOR LANDSCAPE
Map the top 20-30 operators in this vertical by size (number of facilities/locations).

For each operator find:
- Name, legal form, number of facilities, number of employees
- Geographic coverage
- Type (public, private, non-profit, chain, franchise, independent)
- Decision-making structure for software/IT procurement (centralized vs. decentralized)
- Current IT maturity level

Also research:
- How fragmented vs. consolidated is this market? What % of facilities are operated by the top 10 vs. long tail of independents?
- Are there purchasing cooperatives, framework agreements, or group procurement vehicles?
- Is the market consolidating or fragmenting? Any recent M&A activity?
- What trade associations or umbrella organizations exist that influence procurement?

---

### TRACK 2: REGULATORY COMPLIANCE ENGINE OPPORTUNITY
Deep-dive into the mandatory staffing/operational regulations that govern this vertical.

Research:
- What are the exact legal requirements? (Staffing ratios, licensing requirements, qualification mandates, operational minimums)
- Which laws/regulations govern? Cite specific statutes.
- How do requirements vary by region/state/jurisdiction? Are there genuinely different rule sets, or do they cluster into a few patterns?
- What qualification tiers exist among staff? (Who counts toward ratios, who doesn't, at what fraction?)
- What happens when compliance is breached? (Auditing authority, consequences, fines, license revocation)
- Is there a tolerance/grace period for temporary shortfalls?
- Are regulations tightening or loosening? What reforms are in progress?

Assess honestly: Are the compliance rules complex enough to justify a dedicated software product, or are they simple enough that a spreadsheet suffices?

---

### TRACK 3: DAILY OPERATIONAL PAIN
Understand the daily crisis workflow in granular, practitioner-level detail.

Research:
- What does the "worst morning" look like? Walk through the exact sequence of events when things go wrong (staff absence, equipment failure, demand spike, etc.)
- Who makes the critical decisions? What information do they need? How do they currently get it?
- What's the decision tree? At what point do they escalate, reduce service, or shut down?
- How are customers/patients/clients notified of disruptions?
- What are the liability implications of operating below requirements?

Quantify the pain:
- How often does this crisis occur? (Weekly? Daily? Seasonally?)
- What does it cost when it happens? (Lost revenue, penalties, reputation damage, customer churn)
- What workarounds exist today? (Temp staffing, overtime, service reduction)
- How much time does management spend on this problem?

---

### TRACK 4: SOFTWARE COMPETITIVE LANDSCAPE
Research every management software platform serving this vertical in this market.

For each platform find:
- Product name, company, target customer, number of customers/facilities
- Full feature inventory (check: scheduling, compliance, communication, billing, reporting, cross-facility management)
- Does it enforce regulatory compliance automatically, or just report/display it?
- Any AI or automation features?
- Pricing model and approximate pricing
- Technology (cloud/on-premise, mobile, API)
- Founded when, team size, funding

Answer these critical questions:
- Is ANYONE doing automated compliance enforcement? Or is it universally manual?
- Is anyone using AI/ML for scheduling or operations in this vertical?
- Is anyone doing voice/conversational AI in this vertical's operations?
- What do large multi-facility operators actually use for cross-facility coordination? Is it all Excel and phone calls?
- Are there ERP systems with modules for this vertical?
- Where is the gap between what exists and what's needed?

Map the competitive landscape on two axes: (1) scheduling/operational depth vs. (2) target customer size (single facility vs. chain/operator).

---

### TRACK 5: WILLINGNESS TO PAY & ECONOMICS
Analyze whether this market can actually pay for your product.

Research:
- What do operators currently spend on software per facility per month? By category?
- What's the total IT/software budget for a typical mid-large operator?
- Is this market notoriously price-sensitive? What's the ceiling for SaaS tools?
- Are there digitalization subsidies, government programs, or grants applicable?

Build an ROI justification:
- What does the problem cost today? (Temp staffing premium, lost revenue from closures/reduced service, compliance penalties, insurance implications)
- How is the facility/operator funded? (Break down the revenue model: government subsidies, customer fees, insurance reimbursement, operator contribution)
- What's the fully loaded cost per employee? What's the marginal cost of temp/agency staff vs. permanent?
- Can you build a clear "costs X, saves Y" pitch?

Pricing benchmarks:
- What do comparable B2B tools in adjacent verticals charge?
- Is per-employee, per-facility, or per-customer pricing more natural for this market?
- What volume discounts are expected?

Market size:
- Calculate TAM, SAM, and realistic penetration scenarios at your target price point
- Is this a venture-scale opportunity or a solid niche business?

---

### TRACK 6: GO-TO-MARKET
Research how you would actually sell to operators in this vertical.

Buyer persona:
- Who is the decision-maker for software? (Title, role, what they care about)
- Who influences the decision? Who has veto power? (Works council, compliance officer, board)
- Who has budget authority?
- What's the typical procurement cycle length by operator type?

Events, associations, and networks:
- What are the top 5-10 industry events? (Name, date, location, who attends, cost to exhibit/attend)
- What trade associations exist? Which ones influence software adoption?
- Are there online communities, forums, LinkedIn groups where practitioners gather?
- Are there purchasing cooperatives or framework agreement vehicles?

Seasonal triggers:
- When is operational pain highest? (Season, day of week, time of year)
- When do budget cycles start?
- When are procurement decisions typically made?
- Is there a natural "back to school" equivalent that creates urgency?

Sales motion:
- What has worked for other SaaS companies selling to this vertical? (Top-down vs. bottom-up)
- Would a free pilot at one facility work as a wedge into the operator?
- What role do consultants, advisors, or inspectors play in recommending tools?

Channel partners:
- Are there IT consultants specializing in this sector?
- Do payroll/accounting providers have partner ecosystems?
- Could industry publishers, insurers, or regulators be a channel?

---

### TRACK 7: WEDGE VALIDATION
Validate or invalidate my specific proposed entry point: [MY_WEDGE_HYPOTHESIS]

For each component of the hypothesis:
- Does the workflow actually happen the way I think it does? Talk to real practitioner perspectives (forums, union publications, industry blogs, survey results).
- What are the regulatory constraints on my proposed approach? (Data protection, labor law, works council rights, recording/monitoring laws)
- Would the end users actually want/accept this? What's the trust barrier?
- Is there cultural resistance specific to this sector?
- Are there legal requirements I'm not aware of that would block this approach?

If the wedge doesn't work, propose 2-3 alternative entry points ranked by viability, and explain why each would work better.

---

### SYNTHESIS: STRATEGIC ASSESSMENT

After completing all 7 tracks, deliver:

1. **Red Ocean / Blue Ocean Map**: What's commoditized vs. what's genuinely unserved?
2. **Top 5 Risks**: What could kill this opportunity? (Incumbent response, regulatory change, market can't pay, sales cycle too long, etc.)
3. **Defensibility Assessment**: What's your moat? Is it the rules engine, the data flywheel, the network effects, the distribution, or nothing?
4. **First 5 Targets**: Which specific operators should you approach first, and why?
5. **Honest Verdict**: Is this a primary vertical worth building a company around, a secondary vertical to expand into later, or a pass? Compare to other verticals if context is provided.

**Be brutally honest.** If the market can't pay, if the compliance rules are too simple to justify a product, if there's an incumbent I'm missing, or if my wedge hypothesis is wrong — say so directly. I need rigor, not encouragement.
