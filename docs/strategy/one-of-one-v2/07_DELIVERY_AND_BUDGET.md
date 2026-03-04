# Document 07: Delivery Framework & Budget

**Seven Layers | One-of-One Strategy v2**
**Date:** 2026-03-03
**Classification:** Internal — Founder's Eyes Only

**Tax convention:** Consulting Sprint (€3,500) and Foundation setup (from €7,000) are net prices (excl. VAT).

---

## Delivery Framework

### Foundation Delivery (7-10 hours over 1-2 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Birthing conversation + operator configuration + testing | AI operator live on webchat + WhatsApp |
| Week 1-2 | Onboarding call (2hr) | Client is trained, first real conversation with their operator |
| Week 2+ | Email check-in (day 7, 14, 30) | Ensure activation, gather feedback, identify upsell opportunities |

**Payment:** 100% upfront (€7,000–€34,999 excl. VAT depending on scope) before work begins. Monthly billing (€499/mo) starts after delivery.

**COGS per Foundation client:**

| Item | Cost |
|---|---|
| LLM inference (setup) | ~€5-10 |
| Remington's time (7-10 hrs) | Founder time — no cash cost |
| Hosting (Convex cloud) | ~€10-15/mo |
| LLM inference (ongoing) | ~€30-80/mo |
| **Total setup COGS** | **~€15** |
| **Total monthly COGS** | **~€50-100/mo** |
| **Setup margin** | **~99.8%** |
| **Monthly margin** | **~80-90%** |

---

### Consulting Sprint Delivery (5-8 hours over 1-2 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Deep diagnostic session (2hr) — business model, workflows, pain points | Detailed notes + recording |
| Week 1-2 | Analysis + roadmap creation (3-6hr) | Written scope document |
| Week 2 | Delivery call (1hr) — walk through the scope, answer questions, recommend tier | Scope document delivered + tier recommendation |

**Payment:** 100% upfront (€3,500 excl. VAT) before work begins.

**Deliverable contents:**
- Business workflow map (current state)
- Automation opportunity matrix (what to automate, priority order)
- Implementation roadmap (sequenced by ROI)
- Estimated time savings and revenue impact
- Recommended tier (Foundation or Dream Team) with specific scope
- Inference sovereignty recommendation (if relevant — regulated industry, data sensitivity)

**COGS:** ~€0 (founder time only). 100% gross margin.

**Upsell path:** 80%+ of consulting sprint clients should convert to Foundation. The scope document becomes the Foundation implementation blueprint.

---

### Dream Team Delivery (25-35 hours over 3-4 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Discovery deep dive + premium birthing | Core AI operator identity established |
| Week 2 | Custom specialist capabilities designed + configured | 5 custom + 1 bespoke specialist live |
| Week 3 | Integration setup + testing | Connected to their CRM, calendar, tools |
| Week 3-4 | On-site/remote onboarding (half-day) | Team trained, all channels live |
| Week 4+ | Monthly strategy call #1 | First optimization cycle |

**Payment:** 50% upfront, 50% on delivery. Monthly billing (€999/mo) starts after delivery.

**COGS per Dream Team client:**

| Item | Cost |
|---|---|
| LLM inference (setup) | ~€20-40 |
| Integration development (if custom) | ~€0-500 |
| Remington's time (25-35 hrs) | Founder time — no cash cost |
| Travel (if on-site in DACH) | ~€200-500 |
| Hosting (Convex cloud) | ~€20-30/mo |
| LLM inference (ongoing) | ~€80-200/mo |
| **Total setup COGS** | **~€220-1,040** |
| **Total monthly COGS** | **~€150-300/mo** |
| **Setup margin** | **~85-97%** (depending on scope) |
| **Monthly margin** | **~70-85%** |

---

### Sovereign Delivery (80-100 hours over 4-6 weeks)

Sovereign is the full stack: Dream Team operator + 4-node Mac Studio cluster + on-site installation + Year 1 support.

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Discovery + premium birthing + operator configuration | AI operator identity established, specialist capabilities designed |
| Week 1 | Order 4x Mac Studio M3 Ultra + networking gear (1 week lead time) | Hardware en route |
| Week 1-2 | Network topology design, rack layout, RDMA planning | Architecture document |
| Week 2 | Custom specialist capabilities configured (cloud staging) | 10 custom + 2 bespoke specialists ready |
| Week 2-3 | Hardware arrives → unbox, rack, cable, RDMA config (on-site) | 4-node cluster physically built |
| Week 3 | EXO cluster init, failover testing, model deployment | Cluster running, models loaded |
| Week 3-4 | Platform integration: inference ↔ Seven Layers backend | Operator connected to local cluster |
| Week 4 | Load testing (15 concurrent), Grafana dashboards, monitoring | Performance validated |
| Week 4-5 | On-site team training (2 days) + migration from cloud staging to local | Everything running on-prem |
| Week 5-6 | Operations runbook delivery + monthly strategy call #1 | Handoff complete |

**Payment:** 50% upfront (€97,500). Hardware ordered from client deposit. 50% on delivery.

**COGS per Sovereign client:**

| Item | Cost |
|---|---|
| 4x Mac Studio M3 Ultra 256GB (8% reseller discount) | ~€21,344 |
| Networking: 2x OWC TB5 Hub + cables + 10GbE switch | ~€900 |
| Rack + shelves + UPS | ~€960 |
| **Hardware subtotal** | **~€23,200 (our cost: ~€22,564)** |
| Cluster build + RDMA config + failover (54 hrs infra labor) | ~€6,240 |
| Dream Team operator config (25-35 hrs) | Founder time — no cash cost |
| Platform integration: inference routing | Founder time |
| Travel (2-3 trips for on-site build + training) | ~€2,000 |
| LLM inference (staging, before on-prem cutover) | ~€50-100 |
| Year 1 Priority support (included) | €4,200/yr labor cost |
| **Total COGS** | **~€36,000** |
| **Sell price** | **€195,000** |
| **Gross profit** | **~€159,000** |
| **Margin** | **~81.5%** |

**Cash flow waterfall:**
1. Client signs Sovereign contract → invoice 50% = €97,500
2. Order hardware (~€23K) + book travel → ~€25K spent from deposit
3. Deliver over 4-6 weeks (remaining costs: ~€11K labor + support)
4. Client pays remaining 50% on delivery = €97,500
5. **Net cash from one Sovereign deal: ~€159,000 after all COGS**

**Critical insight:** The client's deposit funds ALL hardware and build costs. You start the project with €72K in the bank after hardware is ordered. One Sovereign deal funds the entire year's operating expenses 7x over.

---

### Enterprise Sovereign Delivery (115-140 hours over 6-8 weeks)

Custom-scoped. Follows On-Prem Enterprise delivery framework from doc 12. Includes:
- Dream Team operator (35 hrs)
- 10-node Enterprise cluster build (115 hrs — architecture, build, SSO, compliance, load testing, training)
- Multiple on-site visits (2-3 trips)
- Compliance package if needed (+50-100 hrs)

**COGS:** ~€104,000. **Price:** €250K-350K. **Margin:** 58-70%.

See [12_PRIVATE_LLM_PROVIDER_BUSINESS_MODEL.md](./12_PRIVATE_LLM_PROVIDER_BUSINESS_MODEL.md) for full Enterprise delivery timeline.

---

### Module Delivery (Add-Ons for Foundation/Dream Team Clients)

Modules can be added to any existing client at any time. Delivery is scoped independently.

| Module | Delivery Hours | Timeline | Site Visit? |
|---|---|---|---|
| **BYOK** | 0 hrs | Instant (self-serve) | No |
| **Cloud Private — Starter** | 14 hrs | 1-2 weeks | No (remote) |
| **Cloud Private — Growth** | 34 hrs | 2-3 weeks | No (remote) |
| **On-Prem Starter** (1 Mac Studio) | 16 hrs | 1-2 weeks | Optional (1 visit) |
| **On-Prem Growth** (4 Mac Studios) | 54 hrs | 2-3 weeks | Yes (1-2 visits) |
| **On-Prem Enterprise** (10 Mac Studios) | 115 hrs | 4-6 weeks | Yes (2-3 visits) |
| **RAG Pipeline** | 30-50 hrs | 2-3 weeks | No |
| **Fine-Tuning** | 40-80 hrs | 3-6 weeks | No |
| **Compliance Package** | 50-100 hrs | 3-6 weeks | No |

Full module pricing, COGS, and delivery breakdowns: see [12_PRIVATE_LLM_PROVIDER_BUSINESS_MODEL.md](./12_PRIVATE_LLM_PROVIDER_BUSINESS_MODEL.md).

---

## Year 1 Budget

| Category | Monthly | Annual | Notes |
|---|---|---|---|
| BNI membership | €120 | €1,420 | May be waived as director |
| BNI one-time fee | — | €390 | One-time |
| Travel (client on-sites, DACH) | €500-800 | ~€8,000 | Higher than before — Sovereign requires on-site visits |
| Hardware procurement (Sovereign) | Varies | ~€70,000 | 3 Sovereign builds × ~€23K hardware — paid from client deposits |
| Infrastructure labor (Sovereign + modules) | Varies | ~€25,000 | Contractor Sr engineer for cluster builds (~200 hrs) |
| LLM API costs (Foundation/DT clients) | €50-150 | ~€1,200 | Grows slowly with client count |
| Convex cloud hosting | €50-100 | ~€900 | Foundation + Dream Team clients |
| Tools/SaaS | €200 | ~€2,400 | CRM, analytics, video, design |
| LinkedIn Premium / Sales Navigator | €80 | ~€960 | Outreach tooling |
| Legal/accounting | €200 | ~€2,400 | Contracts, GDPR, bookkeeping |
| Content production (minimal Y1) | €0-200 | ~€1,200 | Founder-created |
| Apple Authorized Reseller program | — | ~€1,000 | Annual program fee |
| Buffer | €200 | ~€2,400 | Unexpected |
| **Total Year 1 OpEx** | | **~€37,000-42,000** | |

**Budget change from old model:** Year 1 OpEx increased from ~€20K to ~€40K. The delta is hardware procurement (client-funded), infrastructure labor (~€25K for contractor), and increased travel. All hardware costs are paid from Sovereign client deposits — never from company cash.

**The math:** Total Year 1 out-of-pocket operating expenses (excluding client-funded hardware) are ~€17K-19K. One Foundation client (from €7K) covers 4+ months. One Sovereign deal covers everything plus leaves ~€155K in profit.

---

## Revenue Model (Year 1)

| Quarter | Target Closes | Mix | Setup Revenue | MRR Added |
|---|---|---|---|---|
| Q1 (Month 1-3) | 3 | 2 Foundation + 1 Dream Team | ~€49,000 | ~€2,000 |
| Q2 (Month 4-6) | 5 | 3 Foundation + 1 Dream Team + 1 Sovereign | ~€237,000 | ~€3,500 |
| Q3 (Month 7-9) | 5 | 2 Foundation + 2 Dream Team + 1 Sovereign | ~€244,000 | ~€3,500 |
| Q4 (Month 10-12) | 5 | 1 Foundation + 3 Dream Team + 1 Sovereign | ~€320,000 | ~€4,000 |
| **Year 1** | **18** | **8 Foundation + 7 Dream Team + 3 Sovereign** | **~€850,000** | **~€13,000/mo by Dec** |

**Module upsell revenue (added to baseline):**

| Source | Setup Revenue | Recurring Revenue (partial year) |
|---|---|---|
| 2x On-Prem Starter modules (Month 4 + 6) | €23,000 | ~€7,200 |
| 1x Cloud Starter module (Month 8) | €2,500 | ~€11,600 |
| **Module totals** | **€25,500** | **~€18,800** |

| Metric | Old Model | New Model (Sovereign v2 + Modules) |
|---|---|---|
| **Year 1 setup revenue** | ~€850,000 | ~€875,000 |
| **Year 1 recurring revenue** | ~€100,000 | ~€119,000 |
| **Year 1 total revenue** | **~€950,000** | **~€994,000** |
| **Year 1 hard cash COGS** | ~€60,000 | ~€155,000 |
| **Year 1 gross profit** | **~€890,000** | **~€839,000** |
| **Year 1 gross margin** | ~94% | ~84% |
| **Remington's total hours** | ~450-550 | ~550-650 (adds ~100 hrs for Sovereign infra oversight + module sales) |
| **Break-even** | **Client 1** | **Client 1** |

**Margin impact:** Gross margin drops from ~94% to ~84% because Sovereign now includes real hardware (~€23K COGS per build vs ~€9K before) and modules include cloud GPU pass-through. But this is real, defensible value — not a pricing anchor. And the business still approaches **€1M in Year 1 at 84% gross margin.**

---

## Delivery Quality Standards

| Standard | Requirement |
|---|---|
| **Time to first message** | Operator sends first message to client's WhatsApp within 24 hours of payment |
| **Birthing quality** | The "Was mich überrascht hat" insight must reference something specific from the discovery conversation |
| **Channel connection** | At least 2 channels live (webchat + WhatsApp minimum) before declaring delivery complete |
| **Client training** | 2-hour onboarding call (Foundation), half-day session (Dream Team), 2-day on-site session (Sovereign) |
| **Post-delivery check-ins** | Day 7, 14, 30 email/message check-ins for every client |
| **Monthly strategy calls** | Dream Team and Sovereign clients get monthly 30-minute strategy calls included |
| **Response time** | Client support questions answered within 4 business hours |
| **Infrastructure SLA** | Sovereign and module clients: infrastructure issues responded to within 4 hours (Priority) or 24/7 monitoring (Managed) |
| **Module delivery** | On-Prem Starter deployed within 2 weeks of payment. Growth within 3 weeks. Enterprise within 6 weeks. |

---

## The Year 2 Pivot

Once high-ticket revenue is flowing and you have:
- 18+ clients as references
- Case studies across industries
- A proven product + infrastructure capability
- Cash reserves of €300K+

**Then — and only then — add the self-serve tiers:**

| Tier | Price | Channel |
|---|---|---|
| Free | €0 | PLG — 50 msgs, webchat, birthing experience |
| Starter | €49/mo | Self-serve — 500 msgs, WhatsApp |
| Pro | €149/mo | Self-serve — 2,000 msgs, all channels |
| Scale | €399/mo | Sales-assisted — 10,000 msgs |

**Funded by:** High-ticket profits. Content hire (€40-55K/year). No external funding needed.

**Year 2 module growth:** Expect 5+ new module upsells from Year 1 clients (natural progression as they scale) plus modules sold to new clients from Day 1. Module revenue target Year 2: ~€190K.

This is the Tesla Model 3 moment — the mass-market product that only works because the Roadster funded it. Year 1 is the Roadster. Year 2 is the Model 3.
