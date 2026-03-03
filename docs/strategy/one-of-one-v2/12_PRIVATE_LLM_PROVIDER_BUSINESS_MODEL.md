# Document 12: Inference Sovereignty — Modules, Pricing & Delivery

**Seven Layers | One-of-One Strategy v2**
**Date:** 2026-03-03
**Classification:** Internal — Founder's Eyes Only
**Supersedes:** Initial draft (standalone infrastructure business model)

> **Purpose:** Define the inference sovereignty add-on strategy. Every Seven Layers client starts with platform-managed inference. This doc covers what happens when they want more: their own keys, their own model, their own hardware. These are modular add-ons to the existing SaaS relationship, not a separate product line.
>
> **Foundation:** All COGS, labor rates, and margin benchmarks sourced from `10_PRIVATE_LLM_INFRASTRUCTURE_PACKAGES.md` (on-prem) and `11_CLOUD_LLM_INFERENCE_PACKAGES.md` (cloud).

---

## The Core Insight

Every client's AI operator needs inference to think. The question is **where that inference happens** — and it naturally evolves over time. Seven Layers supports any inference backend. That's a platform capability, not a separate product.

The infrastructure work — procuring hardware, configuring clusters, managing cloud GPUs — is done by us, in-house. No partners, no brokers. We own the full stack from operator to silicon.

---

## The Inference Ladder

```
Level 0: Platform-Managed (Default)
  Included in €499-999/mo. We route to Claude/GPT.
  Client doesn't see or manage inference.
  Our COGS: €30-200/mo in API costs.

Level 1: BYOK — Bring Your Own Key (Free)
  Client connects their own OpenAI/Anthropic keys.
  Platform fee unchanged. We lose inference margin.
  Already built into the platform.

Level 2: Private Cloud Inference (Add-On Module)
  Dedicated GPU running open-source model.
  Client's data never touches shared API.
  Monthly managed service: €2,900-7,200/mo.

Level 3: On-Prem Hardware (Add-On Module)
  Mac Studio cluster at their office.
  Data never leaves their building.
  One-time setup + monthly support.

Level 4: Advanced AI Services (Add-On Modules)
  RAG pipelines, fine-tuning, compliance.
  Project-based pricing. Stackable.

Sovereign: Everything (Full Stack Bundle)
  Dream Team operator + On-Prem Growth cluster +
  managed support + on-site + strategy calls.
  €195,000. One price, everything handled.
```

Clients don't climb this ladder sequentially. A law firm might need Level 3 on Day 1. A marketing agency might stay at Level 0 for two years. The ladder exists so we have a module ready for wherever they are.

---

## Module Catalog

### Module: BYOK (Level 1)

| Attribute | Detail |
|---|---|
| **Price** | €0 (platform feature) |
| **What it is** | Client connects their own API keys (OpenAI, Anthropic, Mistral, etc.) |
| **When they buy it** | When they already pay for API access elsewhere |
| **Impact on our revenue** | Lose inference margin (~€30-200/mo), keep full platform fee |
| **Our COGS** | €0 |
| **Delivery** | Self-serve toggle in platform settings. Already built. |

**Strategic note:** BYOK reduces our margin but prevents churn. A client who wants their own keys will leave the platform entirely if we don't support it. Better to keep them at €499/mo with zero inference cost than lose them completely.

---

### Module: Cloud Private Inference (Level 2)

Two sizes. Pricing benchmarked against doc 11 COGS analysis.

**Cloud — Starter**

| Attribute | Detail |
|---|---|
| **Price** | €2,900/mo managed (includes cloud GPU + monitoring + support) |
| **Setup fee** | €2,500 one-time |
| **What they get** | 1x A100 80GB (or 2x L40S), dedicated to them, running Llama 70B quantized, connected to their Seven Layers operator |
| **Concurrent users** | 1-5 |
| **When they buy it** | Data sovereignty need, or API bill > €2K/mo, or regulated industry |
| **Our COGS** | Setup: €1,680 (14 hrs Sr @ €120). Monthly: ~€1,760/mo (cloud GPU + 3 hrs/mo support) |
| **Setup margin** | 33% — €820 |
| **Monthly margin** | 39% — €1,140/mo |
| **Annual GP** | ~€14,500 |

**Cloud — Growth**

| Attribute | Detail |
|---|---|
| **Price** | €7,200/mo managed |
| **Setup fee** | €6,000 one-time |
| **What they get** | 2x H100 80GB, 70B full precision, multiple models, tensor parallelism |
| **Concurrent users** | 10-50 |
| **When they buy it** | Team scaling, multi-department use, higher throughput needs |
| **Our COGS** | Setup: €3,920 (34 hrs). Monthly: ~€4,710/mo |
| **Setup margin** | 35% — €2,080 |
| **Monthly margin** | 35% — €2,490/mo |
| **Annual GP** | ~€31,960 |

Cloud Enterprise (8x H100, 500 users) is custom-quoted. See doc 11 for COGS reference (~€26K/mo managed, ~20% margin). Only relevant for Enterprise Sovereign clients.

---

### Module: On-Prem Hardware (Level 3)

Three sizes. Pricing benchmarked against doc 10 COGS analysis. All deployments done by us — hardware procurement, physical setup, configuration, platform integration.

**On-Prem — Starter (1 Mac Studio)**

| Attribute | Detail |
|---|---|
| **Setup price** | €11,500 delivered |
| **Support** | €600/mo Standard (business-hours email, quarterly health check, platform integration support) |
| **What they get** | 1x Mac Studio M3 Ultra 256GB, Ollama/MLX inference, LiteLLM gateway, connected to Seven Layers |
| **Concurrent users** | 1-5 |
| **Model class** | 70B quantized (Llama 3.3) |
| **Our COGS** | Setup: €7,376 (€5,456 hardware + 16 hrs labor). Support: €150/mo (~1.25 hrs/mo) |
| **Setup margin** | 36% — €4,124 |
| **Support margin** | 75% — €450/mo |
| **Delivery** | 16 hours. Ship Mac Studio to client. Remote setup or 1 site visit. |

**On-Prem — Growth (4 Mac Studios)**

| Attribute | Detail |
|---|---|
| **Setup price** | €43,000 delivered |
| **Support** | €1,200/mo Priority (4-hr SLA, monthly capacity review, platform support) |
| **What they get** | 4-node RDMA cluster (EXO Labs), 1TB unified memory, 70B full precision, multiple models |
| **Concurrent users** | 10-50 |
| **Our COGS** | Setup: €28,804 (€22,564 hardware + 54 hrs labor). Support: €350/mo (~2.9 hrs/mo) |
| **Setup margin** | 33% — €14,196 |
| **Support margin** | 71% — €850/mo |
| **Delivery** | 54 hours. 1-2 site visits. Rack, cable, RDMA config, platform integration, load testing, training. |

**On-Prem — Enterprise (10 Mac Studios)**

| Attribute | Detail |
|---|---|
| **Setup price** | €118,000 delivered |
| **Support** | €2,400/mo Managed (24/7 monitoring, proactive patching, model updates, platform support) |
| **What they get** | 10-node RDMA cluster + hot spare, 2.5TB memory, SSO, department routing, compliance logging |
| **Concurrent users** | 50-500 |
| **Our COGS** | Setup: €76,906 (€63,606 hardware + 115 hrs labor). Support: €700/mo (~6.7 hrs/mo) |
| **Setup margin** | 35% — €41,094 |
| **Support margin** | 71% — €1,700/mo |
| **Delivery** | 115 hours. Multiple site visits. Full architecture + build + load testing + SSO + training. |

---

### Module: RAG Pipeline (Level 4)

| Attribute | Detail |
|---|---|
| **Setup price** | €8,000-15,000 (scope-dependent) |
| **Monthly** | €500-1,000/mo (hosting + maintenance) |
| **What they get** | Vector database (Qdrant/Weaviate), embedding pipeline, knowledge base ingestion from their documents, connected to their operator |
| **When they buy it** | "I want the AI to answer questions about our internal docs / contracts / policies" |
| **Delivery** | 30-50 hrs (Sr engineer) |
| **Margin** | 45-55% setup, 60-70% recurring |
| **Requires** | Any inference backend (works with platform-managed, BYOK, cloud, or on-prem) |

---

### Module: Fine-Tuning (Level 4)

| Attribute | Detail |
|---|---|
| **Project price** | €10,000-25,000 |
| **Maintenance** | €3,000-6,000/yr |
| **What they get** | LoRA/QLoRA fine-tune on their domain data, evaluation pipeline, model versioning |
| **When they buy it** | Need domain-specific accuracy (legal, medical, financial terminology) |
| **Delivery** | 40-80 hrs (Sr engineer + data preparation) |
| **Margin** | 50-60% |
| **Requires** | Private inference (cloud or on-prem) — can't fine-tune a cloud API model |

---

### Module: Compliance Package (Level 4)

| Attribute | Detail |
|---|---|
| **Project price** | €15,000-30,000 |
| **What they get** | Audit logging, PII redaction pipeline, data classification, retention policies, SOC 2 preparation documentation |
| **When they buy it** | Regulated industry, preparing for audit, enterprise procurement requirement |
| **Delivery** | 50-100 hrs (Sr engineer + compliance documentation) |
| **Margin** | 50-60% |

---

## Sovereign — The Full Stack (Redefined)

Sovereign is not an anchor with one Mac Studio. It's the **everything-included premium bundle**: Dream Team operator + private infrastructure + managed support + on-site installation.

### What's In the Box at €195,000

| Component | Value as Module | Our COGS |
|---|---|---|
| Dream Team operator (custom specialists, multi-channel, monthly strategy calls) | €35K+ setup + €999/mo | ~€1,000 setup |
| On-Prem Growth cluster: 4x Mac Studio M3 Ultra, RDMA networking, 1TB memory | €43,000 setup (module price) | €28,804 |
| Platform integration: inference ↔ Seven Layers backend, model routing | Included in module pricing | Founder time |
| On-site installation + 2-day team training | €3,000-5,000 | ~€2,000 (travel) |
| Year 1 Priority managed support (included) | €14,400/yr | €4,200/yr |
| Monthly strategy calls (12 months) | €6,000/yr | Founder time |
| Documentation: operations runbook + architecture diagrams | Included | Included in setup hours |
| **Total** | **€77K-106K as separate modules** | **~€36,000** |

| Metric | Value |
|---|---|
| **Sell price** | €195,000 |
| **Total COGS** | ~€36,000 |
| **Gross profit** | ~€159,000 |
| **Margin** | 81.5% |
| **Payment terms** | 50% upfront (€97,500). Hardware ordered from deposit. 50% on delivery. |

**Why €195K when the modules total €77-106K:** The premium is the white-glove experience. One contract. One vendor. Everything handled — hardware procurement, operator configuration, on-site installation, ongoing management. No vendor coordination, no integration risk, no project management overhead. The client writes one check and gets a fully operational private AI platform.

**Cash flow:** Client deposit (€97,500) funds all hardware (~€28,804) with €68,696 left over before the build even starts. You never spend your own money.

### Enterprise Sovereign (Custom Quote: €250,000-350,000)

For organizations with 100-500 employees who need full Enterprise infrastructure:

| Component | Our COGS |
|---|---|
| Dream Team operator | ~€1,000 |
| On-Prem Enterprise: 10-node cluster + hot spare + SSO + compliance logging | €76,906 |
| Platform integration + department routing | Founder time |
| Compliance package (SOC 2 prep, PII redaction, audit logging) | ~€15,000 |
| On-site installation (2-3 trips) | ~€3,000 |
| Year 1 Managed support (included) | €8,400 |
| Monthly strategy calls | Founder time |
| **Total COGS** | **~€104,000** |

| At €300K sell price | Margin: 65% — €196,000 profit |
|---|---|

Enterprise Sovereign is not displayed as a fixed price on the pricing page. It's **"Contact us"** — every Enterprise deployment has unique scope.

---

## How Modules Attach to Each Tier

```
Foundation (€7K–€34,999 + €499/mo)
  ├── BYOK: free (self-serve toggle)
  ├── Cloud Starter: +€2,900/mo
  ├── On-Prem Starter: +€11.5K setup + €600/mo
  ├── RAG Pipeline: +€8-15K setup + €500-1K/mo
  └── Fine-Tuning: +€10-25K (requires private inference first)

Dream Team (€35K+ + €999/mo)
  ├── All Foundation modules, plus:
  ├── Cloud Growth: +€7,200/mo
  ├── On-Prem Growth: +€43K setup + €1,200/mo
  ├── Compliance Package: +€15-30K
  └── Fine-Tuning: +€10-25K

Sovereign (€195K + €2,400/mo after Year 1)
  └── Everything included:
        Dream Team operator
        On-Prem Growth (4 Mac Studios, RDMA)
        Year 1 Priority support
        On-site installation + training
        Monthly strategy calls

Enterprise Sovereign (€250-350K, custom)
  └── Everything + Enterprise infrastructure + compliance
```

**Key principle:** The platform fee (€499-999/mo) stays active regardless of which inference backend the client uses. The platform is the product — inference is just where the thinking happens.

---

## Module Delivery Frameworks

### Cloud Module Delivery (14-34 hours, remote)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | GPU provisioning, OS hardening, inference stack (vLLM/SGLang) | Instance running, model loaded |
| Week 1 | Platform integration — connect to Seven Layers backend | Inference endpoint live in client's operator |
| Week 1-2 | Load testing, latency validation, monitoring setup | Performance benchmarks documented |
| Week 2 | Client walkthrough + documentation | Runbook delivered, client understands costs |

**All remote. No site visit needed.** Cloud modules are the fastest to deliver and the easiest to scale.

### On-Prem Starter Delivery (16 hours, 1-2 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Order Mac Studio M3 Ultra (1 week lead time) | Hardware en route |
| Week 1 | Prepare inference stack config, model download plan | Ready to deploy on arrival |
| Week 2 | Mac Studio arrives → OS hardening, inference install, model download | Machine running locally |
| Week 2 | Platform integration + end-to-end testing | Client's operator using local inference |
| Week 2 | Documentation + client walkthrough (remote) | Runbook delivered |

**1 site visit** if client can't handle unboxing + network connection. Otherwise fully remote.

### On-Prem Growth Delivery (54 hours, 2-3 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Order 4x Mac Studio + networking gear | Hardware en route |
| Week 1 | Network topology design + rack layout planning | Design document |
| Week 2 | Hardware arrives → unbox, rack, cable, RDMA config | Physical cluster built |
| Week 2 | EXO cluster init, failover testing, model deployment | Cluster running |
| Week 3 | Platform integration, model routing, fallback chains | Operator connected to cluster |
| Week 3 | Load testing (15 concurrent), Grafana dashboards | Performance validated |
| Week 3 | Operations runbook + 2-hour team training | Handoff complete |

**1-2 site visits.** Physical build + training. Can often combine into one 2-day trip.

### On-Prem Enterprise Delivery (115 hours, 4-6 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Capacity modeling, network design, sub-cluster topology | Architecture document |
| Week 1 | Order 11x Mac Studio + networking + rack + UPS | Hardware en route |
| Week 2-3 | Hardware arrives → physical build (rack, cable, power) | 10-node cluster + hot spare racked |
| Week 3 | RDMA config, EXO cluster init, sub-cluster topology | Cluster running |
| Week 3-4 | Platform integration, department routing rules, model router | Operator connected with department logic |
| Week 4 | SSO/SAML integration, department quotas, audit logging | Governance layer active |
| Week 4-5 | Load testing (75 concurrent), P99 validation | Performance validated |
| Week 5 | PII redaction pipeline, compliance documentation | Compliance layer active |
| Week 5-6 | Full ops manual + DR runbook + 2x half-day training | Handoff complete |

**2-3 site visits.** Physical build, training, and final handoff. Budget €3,000 travel.

### RAG Pipeline Delivery (30-50 hours, 2-3 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1 | Document audit — what to ingest, format assessment | Ingestion plan |
| Week 1-2 | Vector DB setup, embedding pipeline, document processing | Knowledge base populated |
| Week 2-3 | Connect to operator, test retrieval accuracy, tune chunking | RAG live in operator |
| Week 3 | Client walkthrough, document update procedures | Handoff complete |

### Fine-Tuning Delivery (40-80 hours, 3-6 weeks)

| Week | Activity | Deliverable |
|---|---|---|
| Week 1-2 | Data collection, cleaning, formatting for training | Training dataset |
| Week 2-3 | LoRA/QLoRA fine-tune, evaluation pipeline | Fine-tuned model |
| Week 3-4 | A/B test: base model vs fine-tuned on real queries | Evaluation report |
| Week 4-6 | Deploy to client's inference endpoint, integrate with operator | Live in production |

---

## Revenue Impact Model

### Year 1 — Baseline + Modules

**Baseline (from doc 07):** 8 Foundation + 7 Dream Team + 3 Sovereign = ~€850K setup + ~€100K recurring

**Sovereign COGS change (3 deals):**
- Old COGS (1 Mac Studio): 3 × ~€12K = €36K
- New COGS (4 Mac Studios + RDMA): 3 × ~€36K = €108K
- Additional COGS: **+€72K**

**Module upsell revenue (conservative):**

Assume 3 of 15 Foundation/Dream Team clients add inference modules by end of Year 1:

| Module Sale | When | Setup Revenue | Annual Recurring | Setup COGS |
|---|---|---|---|---|
| 1x On-Prem Starter (Foundation client, law firm) | Month 4 | €11,500 | €7,200/yr | €7,376 |
| 1x On-Prem Starter (Dream Team client, clinic) | Month 6 | €11,500 | €7,200/yr | €7,376 |
| 1x Cloud Starter (Foundation client, agency) | Month 8 | €2,500 | €34,800/yr | €1,680 |
| **Module totals** | | **€25,500** | **€49,200/yr** | **€16,432** |

Module clients added mid-year — assume average 6 months of recurring in Year 1 = ~€24,600.

| Metric | Old Model (doc 07) | New Model (with Sovereign v2 + Modules) |
|---|---|---|
| Setup revenue | ~€850K | ~€875K |
| Recurring revenue (Year 1) | ~€100K | ~€125K |
| **Total Year 1 revenue** | **~€950K** | **~€1,000K** |
| Total COGS | ~€60K | ~€155K |
| **Gross profit** | **~€890K** | **~€845K** |
| **Gross margin** | ~94% | ~85% |

Margin drops from 94% to 85% because Sovereign now includes real hardware and modules include cloud pass-through. But the business crosses **€1M in Year 1 revenue** and 85% gross margin is still exceptional.

### Module Revenue Growth (Years 2-3)

As the client base grows and more clients discover inference sovereignty needs:

| Year | Total Clients | Module Clients | Module Setup | Module Recurring | Module GP |
|---|---|---|---|---|---|
| Year 1 | 18 | 3 | €25K | €25K (partial year) | €23K |
| Year 2 | 36 | 8 (+5 new) | €70K | €120K | ~€65K |
| Year 3 | 55+ | 15 (+7 new) | €130K | €280K | ~€115K |

By Year 3, inference sovereignty modules contribute **~€410K in annual revenue** — a meaningful second revenue line built entirely from upselling existing clients. Zero additional customer acquisition cost.

### Labor Hours for Module Delivery

| Year | Module Builds | Setup Hours | Support Hours/yr | Total Hours |
|---|---|---|---|---|
| Year 1 | 3 modules + 3 Sovereign builds | ~210 setup | ~90 support | ~300 |
| Year 2 | 5 modules + Sovereign builds | ~350 setup | ~250 support | ~600 |
| Year 3 | 7 modules + Sovereign builds | ~500 setup | ~500 support | ~1,000 |

**Staffing implication:**
- Year 1: Founder handles everything (~300 hrs = ~6 hrs/week on infra work, on top of SaaS delivery)
- Year 2: Hire 1 contractor Sr engineer for module builds (~600 hrs)
- Year 3: FTE Sr engineer + contractor Jr for monitoring/testing (~1,000 hrs)

---

## The Module Sales Conversation

### Trigger Phrases — When to Introduce Modules

| What the Client Says | What They Mean | Module to Offer |
|---|---|---|
| "Can I use my own OpenAI key?" | Cost-conscious or already paying for API | BYOK (free) — plant the private inference seed for later |
| "I'm worried about data privacy" | Sovereignty need, possibly regulated | On-Prem Starter or Cloud Starter |
| "Our lawyers say we can't use cloud AI" | Hard compliance requirement | On-Prem Starter or Growth |
| "My API bill is getting expensive" | Usage grown, cost optimization | On-Prem Starter (show break-even math: doc 10) |
| "Can the AI read our internal documents?" | RAG pipeline need | RAG module |
| "It doesn't understand our industry terminology" | Domain accuracy gap | Fine-tuning module |
| "We need SOC 2 / HIPAA compliance" | Regulated industry | Compliance + On-Prem |
| "We want to run our own models" | Control + sovereignty + cost | On-Prem Growth or Cloud Growth |
| "We're growing — the whole team needs this" | Scaling, concurrent users | Upgrade tier + add infrastructure |
| "What about GDPR?" | EU data concern | On-Prem (absolute) or Cloud with EU provider |

### The Module Introduction Script

> "Your operator runs on our cloud right now — that's the fastest way to get started. But Seven Layers supports any inference backend. When you're ready, we can connect your operator to your own private model — either in the cloud or on hardware at your office. Your data stays yours, your costs become predictable, and your operator doesn't skip a beat. It's just a module we plug in."

### The Updated Sovereign Pitch

> "Our Sovereign tier is €195,000. That's your own AI operator with custom specialists, a 4-node private compute cluster with a terabyte of unified memory running at your office, on-site installation, a full year of managed support, and monthly strategy calls. Your data never leaves your building. For enterprise organizations with 500+ employees, we do custom deployments starting at €250,000."
>
> "For most businesses at your stage, Foundation is the sweet spot. Starting at €7,000 to set up, €499 a month. And when you need data sovereignty, we can add private inference to your existing operator at any point — it's modular."

### Module-Specific Objection Handling

| Objection | Response |
|---|---|
| "€11,500 for a Mac Studio setup? I can buy one for €5,800." | "You're right — the hardware is €5,800. You're paying €5,700 for the part Apple doesn't sell: the inference stack, the platform integration, the monitoring, the support, and the guarantee that it works with your operator from day one." |
| "Why not just use a cheaper GPU cloud?" | "You could — and we support BYOK if you want to manage that yourself. What we offer is a dedicated instance that's pre-integrated with your operator, monitored 24/7, and supported by the same team that built your AI. One vendor, one number to call." |
| "Can I start with cloud and move to on-prem later?" | "That's exactly what we recommend. Start with cloud private inference — it's live in a week. When your usage is steady and you're confident in the ROI, move to on-prem. Your operator won't notice the difference." |
| "€195K for Sovereign is a lot" | "It includes everything: 4 Mac Studios with a terabyte of memory, your custom Dream Team operator, on-site installation, and a full year of managed support. If you bought those as modules separately, you'd spend €80-100K anyway — and you'd be coordinating it yourself." |

---

## Sources

All COGS, labor rates, and margin benchmarks:
- `10_PRIVATE_LLM_INFRASTRUCTURE_PACKAGES.md` — On-prem Mac Studio COGS, service hours, support tiers
- `11_CLOUD_LLM_INFERENCE_PACKAGES.md` — Cloud GPU pricing, managed services COGS

---

*See [01_PRICING_LADDER.md](./01_PRICING_LADDER.md) for updated tier definitions. See [03_SALES_MOTION.md](./03_SALES_MOTION.md) for close scripts. See [07_DELIVERY_AND_BUDGET.md](./07_DELIVERY_AND_BUDGET.md) for delivery frameworks and COGS.*
