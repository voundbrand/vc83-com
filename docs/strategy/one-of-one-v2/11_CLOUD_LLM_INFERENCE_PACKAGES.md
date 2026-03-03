# Cloud-Hosted Private LLM Inference — Package Comparison

> **Purpose:** Twin document to `10_PRIVATE_LLM_INFRASTRUCTURE_PACKAGES.md`. Same 3 tiers, same COGS analysis — but deployed on cloud GPU infrastructure instead of on-prem Mac Studios.
>
> **Date:** March 2026
>
> **Use case:** Organizations that need private LLM inference with data sovereignty guarantees but prefer managed cloud infrastructure over on-prem hardware.

---

## At a Glance

| | **Starter** | **Growth** | **Enterprise** |
|---|---|---|---|
| Users | 1–5 | 10–50 | Up to 500 |
| Concurrent sessions | 1–2 | 8–15 | 50–75 |
| GPU config | 1x A100 80GB | 2x H100 80GB SXM | 8x H100 80GB SXM |
| Total VRAM | 80 GB | 160 GB | 640 GB |
| Model class | 70B quantized (Q4) | 70B full precision | 405B full + multiple 70B |
| Throughput | ~35–50 tok/s single-user | ~700–1,400 tok/s aggregate | ~5,000–12,500 tok/s aggregate |
| **Monthly cloud cost** | **$1,200–$1,600/mo** | **$3,000–$4,400/mo** | **$12,000–$18,000/mo** |
| **Monthly managed (sell price)** | **$2,200–$3,000/mo** | **$5,500–$7,500/mo** | **$18,000–$28,000/mo** |

---

## The Sovereignty Decision

Before choosing a provider, understand what "private" actually means in the cloud:

| Level | What It Means | Provider Examples |
|---|---|---|
| **US-hosted, US company** | Subject to US CLOUD Act — US law enforcement can compel data access regardless of where data sits | AWS (us-east), Lambda Labs, RunPod |
| **EU-hosted, US company** | Data physically in EU but CLOUD Act still applies to the provider entity | AWS (eu-central), Azure (West Europe) |
| **EU-hosted, EU company** | Data in EU, provider subject only to EU/GDPR law — true EU sovereignty | Hetzner (Germany/Finland), OVHcloud (France), Scaleway (France) |

**Rule of thumb:** If the contract is with a US-incorporated entity, the CLOUD Act applies no matter where the server physically sits. For true EU data sovereignty, the provider must be EU-incorporated.

### EU Sovereign Providers with GPU Capacity

| Provider | HQ | Data Centers | GPU Options | Sovereignty |
|---|---|---|---|---|
| **Hetzner** | Germany | Falkenstein, Nuremberg, Helsinki | RTX 4000 SFF Ada (20GB), RTX 6000 Ada (48GB) | Full EU |
| **OVHcloud** | France | Gravelines, Strasbourg, London, Singapore | L40S (48GB), A100 (80GB) | Full EU |
| **Scaleway** | France | Paris, Amsterdam | L40S (48GB), H100 (80GB) | Full EU |
| **Lambda Labs** | USA | US data centers | H100, H200 | US only |
| **RunPod** | USA | US + EU regions | L40S, A100, H100, B200 | Mixed — check region |
| **AWS** | USA | Global | A100, H100, H200 | US entity — CLOUD Act applies everywhere |

---

## Package 1 — Starter (Cloud)

**For:** Founders, solo developers, hobby projects, proof-of-concept.

### Infrastructure

| Item | Spec | Provider | Monthly Cost |
|---|---|---|---|
| GPU instance | 1x A100 80GB (or 2x L40S 48GB) | RunPod Secure / OVHcloud | $1,200–$1,600 |
| Storage | 500GB NVMe for models + logs | Included or ~$50/mo | $0–$50 |
| Networking | Static IP, firewall rules | Included | $0 |
| **Infrastructure subtotal** | | | **$1,200–$1,650/mo** |

### Software Stack (All Open Source — $0 License Cost)

| Layer | Tool | Notes |
|---|---|---|
| Inference engine | vLLM or SGLang | PagedAttention, continuous batching — 2–4x throughput vs naive serving |
| Model | Llama 3.3 70B (Q4_K_M) | ~40GB VRAM, fits on single A100 80GB |
| API gateway | LiteLLM | OpenAI-compatible API, key management |
| Monitoring | Grafana Cloud Free Tier + Prometheus | 10K metrics series free |
| Deployment | Docker Compose | Single-node, simple restart |

### Services (One-Time Setup)

| Service | Description | Hours | Cost |
|---|---|---|---|
| Instance provisioning | GPU selection, OS setup, security hardening, SSH keys | 3 hrs Sr | $450 |
| Inference stack deploy | vLLM install, model download, quantization verification | 3 hrs Sr | $450 |
| API config + testing | LiteLLM setup, endpoint testing, latency validation | 2 hrs Sr | $300 |
| Platform integration | Connect to Seven Layers backend (Convex actions) | 4 hrs Sr | $600 |
| Documentation | Runbook: restart, model swap, scaling, cost monitoring | 2 hrs Sr | $300 |
| **Setup subtotal (14 hrs)** | | | **$2,100** |

### Capabilities

- Run Llama 3.3 70B quantized — 128K context, ~35–50 tok/s single-user
- vLLM with PagedAttention handles 2–3 concurrent requests efficiently
- First token in <300ms (GPU memory bandwidth advantage over Apple Silicon)
- Data stays in chosen region — pick EU provider for sovereignty
- Scale up or down month-to-month — no hardware commitment

### Limitations

- Single GPU = single point of failure (provider SLA covers hardware, not your stack)
- 70B quantized only — no full-precision 70B or larger models
- Monthly cost never stops — no "payoff" point like on-prem
- You don't own the hardware — provider can change pricing

### Monthly Managed Price: $2,200–$3,000/mo

(Includes infrastructure pass-through + monitoring + basic support)

### Annual Cost: $26,400–$36,000/yr

---

## Package 2 — Growth (Cloud)

**For:** Teams of 10–50, startups scaling AI features, agencies running client workloads.

### Infrastructure

| Item | Spec | Provider | Monthly Cost |
|---|---|---|---|
| GPU instance | 2x H100 80GB SXM (single node or 2 nodes) | Lambda Labs Reserved / RunPod Secure | $3,000–$4,400 |
| Storage | 2TB NVMe for models, logs, embeddings | ~$100/mo | $100 |
| Networking | VPC, static IP, load balancer | ~$50/mo | $50 |
| Backup storage | Model weights + config snapshots (S3-compatible) | ~$20/mo | $20 |
| **Infrastructure subtotal** | | | **$3,170–$4,570/mo** |

**Reserved pricing note:** Lambda Labs offers ~30–35% off on-demand with 3-month commitments. RunPod offers similar discounts for reserved active workers. Always negotiate reserved pricing for steady-state inference.

### Software Stack

| Layer | Tool | Notes |
|---|---|---|
| Inference engine | vLLM or SGLang | Tensor parallelism across 2x H100, continuous batching |
| Models (hot) | Llama 3.3 70B (full FP16) | No quantization needed — 160GB VRAM handles it |
| Models (available) | Qwen 2.5 235B (Q4), Mistral Large 2, DeepSeek R1 70B | Swap on demand |
| API gateway | LiteLLM + Redis | Load balancing, request queuing, per-team API keys |
| Monitoring | Grafana + Prometheus + Alertmanager | GPU utilization, VRAM, throughput, latency P50/P95/P99 |
| Auth layer | LiteLLM teams | Per-team keys, usage tracking, rate limits |
| Deployment | Docker Compose + Watchtower | Auto-restart on failure, image update pipeline |

### Services (One-Time Setup)

| Service | Description | Hours | Cost |
|---|---|---|---|
| Architecture design | Multi-GPU topology, tensor parallelism config, failover strategy | 3 hrs Sr | $450 |
| Instance provisioning | Reserved instance negotiation, OS hardening, VPC setup | 3 hrs Sr | $450 |
| Inference stack deploy | vLLM with tensor parallel, model sharding across GPUs | 4 hrs Sr | $600 |
| Model optimization | Benchmark FP16 vs FP8, find optimal batch size + max concurrent | 4 hrs Sr | $600 |
| Platform integration | Seven Layers backend, model routing, fallback chains | 6 hrs Sr | $900 |
| Load testing | Simulate 15 concurrent, P50/P95/P99 latency | 4 hrs Jr | $320 |
| Gateway + auth setup | LiteLLM teams, Redis queue, rate limiting | 3 hrs Sr | $450 |
| Monitoring setup | Grafana dashboards, alerting rules, cost tracking | 3 hrs Sr | $450 |
| Documentation + training | Ops runbook, 2-hour team training | 4 hrs Sr | $600 |
| **Setup subtotal (34 hrs)** | | | **$4,820** |

### Capabilities

- 160GB pooled VRAM — run 70B at full FP16 precision, no quality loss from quantization
- ~700–1,400 tok/s aggregate throughput (vLLM with tensor parallelism on 2x H100)
- 8–15 concurrent users with <2s P95 latency
- H100 memory bandwidth: 3,350 GB/s — **4x faster than M3 Ultra** per-token generation
- Hot-swap models without downtime
- Scale to 4x H100 same-day if demand spikes (cloud elasticity)

### Limitations

- $3K–$4.5K/month never stops — cloud has no payoff point
- Reserved pricing requires 3-month commitment minimum
- Provider outages affect all users (mitigate with multi-region, adds cost)
- No data ownership — provider has physical access to hardware

### Monthly Managed Price: $5,500–$7,500/mo

(Includes infrastructure + monitoring + monthly optimization review + incident response)

### Annual Cost: $66,000–$90,000/yr

---

## Package 3 — Enterprise (Cloud)

**For:** Organizations up to 500 employees, production SLA, department-wide AI deployment.

### Infrastructure

| Item | Spec | Provider | Monthly Cost |
|---|---|---|---|
| GPU cluster | 8x H100 80GB SXM (single 8-GPU node) | Lambda Labs Reserved / AWS p5.48xlarge | $12,000–$18,000 |
| Hot standby | 2x H100 80GB (failover node) | Same provider, on-demand or reserved | $2,000–$4,400 |
| Storage | 4TB NVMe for models + 2TB for logs/embeddings | ~$250/mo | $250 |
| Networking | VPC, load balancer, VPN gateway, static IPs | ~$200/mo | $200 |
| Backup / DR | Model weights + config in S3-compatible (cross-region) | ~$80/mo | $80 |
| **Infrastructure subtotal** | | | **$14,530–$22,930/mo** |

**EU sovereignty option:** Deploy on OVHcloud or Scaleway for full EU data residency. Expect 15–25% premium over US providers for equivalent GPU capacity. Budget $17,000–$28,000/mo for infra.

### Software Stack

| Layer | Tool | Notes |
|---|---|---|
| Inference engine | vLLM or SGLang | 8-way tensor parallelism, continuous batching, speculative decoding |
| Models (production) | Llama 3.3 70B (FP16), Qwen 2.5 235B (FP8), Mistral Large 2 | Multiple models served simultaneously on 640GB VRAM |
| Models (specialized) | DeepSeek R1, CodeLlama, Qwen multilingual | Department-specific routing |
| Models (max capability) | Llama 3.1 405B (FP8) | Full 405B at FP8 fits in 640GB — no quantization compromise |
| API gateway | LiteLLM + Redis + Nginx | Load balancing, department quotas, request prioritization |
| Monitoring | Grafana + Prometheus + Alertmanager + PagerDuty | SLA dashboards, GPU health, cost attribution per department |
| Auth & governance | LiteLLM teams + SAML/SSO | Per-department keys, usage budgets, audit logging |
| Logging & compliance | Request/response logging to encrypted storage | PII redaction, configurable retention, GDPR-compatible |
| Orchestration | Kubernetes (K8s) + Helm charts | Rolling updates, auto-scaling, health probes |
| CI/CD | GitHub Actions → container registry → K8s deploy | Model updates, config changes, zero-downtime deploys |

### Services (One-Time Setup)

| Service | Description | Hours | Cost |
|---|---|---|---|
| Architecture & planning | Capacity model for 500 users, GPU topology, multi-model strategy | 6 hrs Arch | $900 |
| Provider negotiation | Reserved pricing, SLA negotiation, contract review | 4 hrs Arch | $600 |
| K8s cluster setup | Kubernetes on bare-metal or managed K8s, GPU operator, networking | 8 hrs Sr | $1,200 |
| Inference deployment | vLLM with 8-way tensor parallel, multi-model serving config | 6 hrs Sr | $900 |
| Model optimization | Benchmark FP16 vs FP8, batch tuning, speculative decoding config | 6 hrs Sr | $900 |
| Failover & DR | Hot standby automation, health probes, automatic failover | 6 hrs Sr | $900 |
| Platform integration | Seven Layers backend, model router, department routing rules | 8 hrs Sr | $1,200 |
| SSO / governance | SAML integration, department quotas, audit pipeline | 6 hrs Sr | $900 |
| PII redaction pipeline | Log processing, data classification, retention policies | 4 hrs Sr | $600 |
| Load & stress testing | 75 concurrent users sustained, P99 validation, chaos testing | 8 hrs Jr | $640 |
| Monitoring & alerting | Grafana dashboards, PagerDuty, cost attribution, capacity forecasting | 4 hrs Sr | $600 |
| CI/CD pipeline | Container build, registry, Helm chart, deploy automation | 4 hrs Sr | $600 |
| Documentation | Full ops manual, DR runbook, architecture diagrams, compliance docs | 6 hrs Sr | $900 |
| Team training | Ops team (half day) + end-user enablement (half day) + prep | 8 hrs Sr | $1,200 |
| Project management | Stakeholder comms, milestone tracking, handoff | 8 hrs Arch | $1,200 |
| **Setup subtotal (92 hrs)** | | | **$13,240** |

### Capabilities

- 640GB VRAM — run Llama 3.1 405B at FP8, or multiple 70B models simultaneously
- ~5,000–12,500 tok/s aggregate throughput (8x H100 with vLLM tensor parallelism)
- 50–75 concurrent sessions with <1.5s P95 latency for 70B
- H100 memory bandwidth: 3,350 GB/s per GPU — **26.8 TB/s aggregate** across 8 GPUs
- Department-level model routing with quota enforcement
- Zero-downtime deploys via K8s rolling updates
- Auto-failover to hot standby node
- Scale to 16x H100 within hours if demand grows (cloud elasticity)
- Full audit trail for compliance (SOC 2, GDPR, HIPAA-adjacent)

### Capacity Math

| Metric | Value |
|---|---|
| Total employees | 500 |
| Peak concurrent ratio | 10–15% |
| Peak concurrent users | 50–75 |
| Avg. request (input + output) | ~1,500 tokens |
| vLLM throughput on 8x H100 (70B FP16) | ~5,000–8,000 tok/s |
| Avg. generation time per request | ~0.2–0.3s |
| Requests per minute at peak | ~120–150 |
| Queue depth at sustained peak | 0–1 (near-instant) |

### Monthly Managed Price: $18,000–$28,000/mo

(Includes infrastructure + 24/7 monitoring + incident response + monthly optimization)

### Annual Cost: $216,000–$336,000/yr

With EU sovereignty premium: **$250,000–$400,000/yr**

---

## COGS & Margin Analysis — What the Provider Actually Spends

> **Key difference from on-prem:** There is no hardware sale margin. The entire deal is recurring monthly revenue — cloud pass-through + services markup + managed support. Providers win on operational efficiency: one team managing 10+ clients on similar infrastructure.

### Industry Benchmarks (Cloud Managed Services)

| Category | Typical Gross Margin | Source |
|---|---|---|
| Cloud GPU pass-through | 10–20% markup on raw cloud cost | MSP standard for IaaS resale |
| Managed services overlay | 40–60% | MSP best-in-class |
| Setup / integration (one-time) | 33–50% | Professional services standard |
| **Blended monthly margin** | **30–45%** | **Industry target for managed cloud** |

---

### Package 1 — Starter: COGS Breakdown

**Labor assumption:** Senior engineer @ $120/hr loaded cost

#### One-Time Setup

| Cost Category | Item | Vendor COGS | Sell Price | Margin |
|---|---|---|---|---|
| **Services** | Instance provisioning + hardening (3 hrs) | $360 | — | — |
| **Services** | Inference stack deploy + model download (3 hrs) | $360 | — | — |
| **Services** | API config + testing (2 hrs) | $240 | — | — |
| **Services** | Platform integration (4 hrs) | $480 | — | — |
| **Services** | Documentation (2 hrs) | $240 | — | — |
| | **Setup subtotal (14 hrs)** | **$1,680** | **$2,100** | **20% — $420** |

#### Monthly Recurring

| Cost Category | Item | Vendor COGS/mo | Sell Price/mo | Margin |
|---|---|---|---|---|
| **Cloud GPU** | 1x A100 80GB (RunPod Secure / OVHcloud) | $1,200–$1,600 | $1,400–$1,850 | 15% — $200–$250 |
| **Support** | Monitoring check-in + alert triage (2 hrs/mo Sr) | $240 | $600 | 60% — $360 |
| **Support** | Incident response budget (1 hr/mo avg Sr) | $120 | $200 | 40% — $80 |
| | **Monthly subtotal** | **$1,560–$1,960** | **$2,200–$3,000** | |
| | **Monthly gross profit** | | | **$640–$1,040** |
| | **Monthly blended margin** | | | **29–35%** |

#### Annual P&L

| | Year 1 | Year 2+ |
|---|---|---|
| Setup revenue | $2,100 | $0 |
| Setup COGS | $1,680 | $0 |
| Monthly revenue (×12) | $26,400–$36,000 | $26,400–$36,000 |
| Monthly COGS (×12) | $18,720–$23,520 | $18,720–$23,520 |
| **Annual gross profit** | **$8,100–$12,900** | **$7,680–$12,480** |
| **Annual margin** | **28–34%** | **29–35%** |

**Fair annual provider profit: ~$8,000–$12,000**

---

### Package 2 — Growth: COGS Breakdown

**Labor assumption:** Senior engineer @ $120/hr, junior engineer @ $80/hr

#### One-Time Setup

| Cost Category | Item | Vendor COGS | Sell Price | Margin |
|---|---|---|---|---|
| **Services** | Architecture design (3 hrs Sr) | $360 | — | — |
| **Services** | Instance provisioning + negotiation (3 hrs Sr) | $360 | — | — |
| **Services** | Inference stack + tensor parallel (4 hrs Sr) | $480 | — | — |
| **Services** | Model optimization + benchmarks (4 hrs Sr) | $480 | — | — |
| **Services** | Platform integration + routing (6 hrs Sr) | $720 | — | — |
| **Services** | Load testing (4 hrs Jr) | $320 | — | — |
| **Services** | Gateway + auth (3 hrs Sr) | $360 | — | — |
| **Services** | Monitoring setup (3 hrs Sr) | $360 | — | — |
| **Services** | Docs + training (4 hrs Sr) | $480 | — | — |
| | **Setup subtotal (34 hrs)** | **$3,920** | **$4,820** | **19% — $900** |

#### Monthly Recurring

| Cost Category | Item | Vendor COGS/mo | Sell Price/mo | Margin |
|---|---|---|---|---|
| **Cloud GPU** | 2x H100 80GB SXM reserved | $3,000–$4,400 | $3,500–$5,100 | 15% — $500–$700 |
| **Cloud infra** | Storage, networking, backups | $170 | $250 | 32% — $80 |
| **Support** | Monitoring + alert triage + optimization (4 hrs/mo Sr) | $480 | $1,200 | 60% — $720 |
| **Support** | Incident response budget (2 hrs/mo avg Sr) | $240 | $500 | 52% — $260 |
| **Support** | Monthly optimization review (1 hr/mo Sr) | $120 | $250 | 52% — $130 |
| | **Monthly subtotal** | **$4,010–$5,410** | **$5,500–$7,500** | |
| | **Monthly gross profit** | | | **$1,490–$2,090** |
| | **Monthly blended margin** | | | **27–28%** |

#### Annual P&L

| | Year 1 | Year 2+ |
|---|---|---|
| Setup revenue | $4,820 | $0 |
| Setup COGS | $3,920 | $0 |
| Monthly revenue (×12) | $66,000–$90,000 | $66,000–$90,000 |
| Monthly COGS (×12) | $48,120–$64,920 | $48,120–$64,920 |
| **Annual gross profit** | **$18,780–$26,080** | **$17,880–$25,080** |
| **Annual margin** | **27–28%** | **27–28%** |

**Fair annual provider profit: ~$18,000–$25,000**

---

### Package 3 — Enterprise: COGS Breakdown

**Labor assumption:** Lead architect @ $150/hr, senior engineer @ $120/hr, junior engineer @ $80/hr

#### One-Time Setup

| Cost Category | Item | Vendor COGS | Sell Price | Margin |
|---|---|---|---|---|
| **Services** | Architecture + capacity planning (6 hrs Arch) | $900 | — | — |
| **Services** | Provider negotiation + contract (4 hrs Arch) | $600 | — | — |
| **Services** | K8s cluster setup + GPU operator (8 hrs Sr) | $960 | — | — |
| **Services** | Inference deployment + tensor parallel (6 hrs Sr) | $720 | — | — |
| **Services** | Model optimization + benchmarks (6 hrs Sr) | $720 | — | — |
| **Services** | Failover + DR automation (6 hrs Sr) | $720 | — | — |
| **Services** | Platform integration + routing (8 hrs Sr) | $960 | — | — |
| **Services** | SSO + governance (6 hrs Sr) | $720 | — | — |
| **Services** | PII redaction pipeline (4 hrs Sr) | $480 | — | — |
| **Services** | Load + stress + chaos testing (8 hrs Jr) | $640 | — | — |
| **Services** | Monitoring + alerting + cost attribution (4 hrs Sr) | $480 | — | — |
| **Services** | CI/CD pipeline (4 hrs Sr) | $480 | — | — |
| **Services** | Documentation + compliance docs (6 hrs Sr) | $720 | — | — |
| **Services** | Training — ops + end-user (8 hrs Sr) | $960 | — | — |
| **Services** | Project management (8 hrs Arch) | $1,200 | — | — |
| | **Setup subtotal (92 hrs)** | **$10,260** | **$13,240** | **22% — $2,980** |

#### Monthly Recurring

| Cost Category | Item | Vendor COGS/mo | Sell Price/mo | Margin |
|---|---|---|---|---|
| **Cloud GPU** | 8x H100 80GB SXM reserved (primary) | $12,000–$18,000 | $14,000–$21,000 | 15–17% — $2,000–$3,000 |
| **Cloud GPU** | 2x H100 80GB (hot standby) | $2,000–$4,400 | $2,400–$5,100 | 15–17% — $400–$700 |
| **Cloud infra** | Storage, networking, backups, LB | $530 | $750 | 29% — $220 |
| **Support** | 24/7 monitoring + triage (8 hrs/mo mix Sr+Jr) | $800 | $2,500 | 68% — $1,700 |
| **Support** | Incident response (4 hrs/mo avg Sr) | $480 | $1,200 | 60% — $720 |
| **Support** | Monthly optimization + capacity review (3 hrs/mo Sr) | $360 | $800 | 55% — $440 |
| **Support** | Model evaluation + updates (2 hrs/mo Sr) | $240 | $500 | 52% — $260 |
| **Support** | Stakeholder reporting + cost attribution (2 hrs/mo Sr) | $240 | $500 | 52% — $260 |
| | **Monthly subtotal** | **$16,650–$24,850** | **$22,650–$32,350** | |
| | **Monthly gross profit** | | | **$6,000–$7,500** |
| | **Monthly blended margin** | | | **23–27%** |

#### Annual P&L

| | Year 1 | Year 2+ |
|---|---|---|
| Setup revenue | $13,240 | $0 |
| Setup COGS | $10,260 | $0 |
| Monthly revenue (×12) | $271,800–$388,200 | $271,800–$388,200 |
| Monthly COGS (×12) | $199,800–$298,200 | $199,800–$298,200 |
| **Annual gross profit** | **$74,980–$93,240** | **$72,000–$90,000** |
| **Annual margin** | **26–24%** | **26–23%** |

**Fair annual provider profit: ~$72,000–$90,000**

---

### Total Provider Revenue Over 3 Years

| Package | Setup Profit | Annual Recurring Profit | **Total 3yr Profit** |
|---|---|---|---|
| **Starter** | $420 | $8K–$12K/yr | **$24,000–$37,000** |
| **Growth** | $900 | $18K–$25K/yr | **$55,000–$76,000** |
| **Enterprise** | $2,980 | $72K–$90K/yr | **$219,000–$273,000** |

Cloud managed services is a **higher total revenue** business than on-prem, but the margins are thinner because GPU pass-through eats 60–70% of every invoice. A provider running 10 Enterprise cloud clients earns **$2.2M–$2.7M in gross profit over 3 years**.

---

## Cloud vs On-Prem: Side-by-Side Comparison

| Factor | On-Prem (Doc 10) | Cloud (This Doc) |
|---|---|---|
| **Starter — Year 1 cost to customer** | $9,500–$12,000 (one-time) | $26,400–$36,000 |
| **Growth — Year 1 cost to customer** | $35,000–$45,000 (one-time) | $66,000–$90,000 |
| **Enterprise — Year 1 cost to customer** | $95,000–$120,000 (one-time) | $216,000–$336,000 |
| **3-year total (Enterprise + support)** | $143,000–$192,000 | $648,000–$1,008,000 |
| | | |
| **Break-even: cloud → on-prem** | — | **On-prem pays for itself in 5–7 months at Enterprise tier** |
| | | |
| **Throughput (Enterprise)** | 200–300 tok/s | 5,000–12,500 tok/s |
| **Latency per token** | ~33ms (M3 Ultra 819 GB/s) | ~3ms (H100 3,350 GB/s) |
| **Scaling speed** | Weeks (order hardware) | Hours (spin up instances) |
| **Data sovereignty** | Absolute (your office) | Depends on provider entity |
| **Capital structure** | CapEx (one-time) | OpEx (monthly) |
| **Risk if you stop paying** | You own the hardware | Everything disappears |
| **Provider profit (3yr Enterprise)** | $66K–$77K | $219K–$273K |

### When to Choose Cloud

- You need **burst capacity** — seasonal demand, unpredictable usage spikes
- You need **EU/GDPR sovereignty** without managing hardware (use EU-incorporated provider)
- Your CFO prefers **OpEx over CapEx** — no large upfront purchase
- You need **maximum throughput** — H100s are 4–10x faster per-token than Apple Silicon
- You want to **start fast** — production in days, not weeks
- You're **not sure about demand** — test at Starter, scale to Enterprise seamlessly

### When to Choose On-Prem

- You'll use the infrastructure **steadily for 12+ months** — on-prem ROI is massive
- You need **absolute data sovereignty** — no third-party physical access
- Your usage is **predictable** — 500 employees, known query patterns
- You want to **own the asset** — hardware retains 50–60% resale value after 3 years
- Your **monthly cloud bill would exceed $5K** — that's the crossover point
- You're in a **regulated industry** (legal, healthcare, finance) where "we own the hardware" matters

### The Hybrid Play

The smartest architecture for most organizations:

1. **On-prem Mac Studio cluster** for steady-state, predictable workloads (70B model, daily use)
2. **Cloud GPU burst** for peak demand, large-model experiments (405B), and batch processing
3. **Cloud API fallback** (Claude/GPT) for overflow when both on-prem and cloud GPU are saturated

This gives you the lowest cost floor (on-prem), the highest throughput ceiling (cloud H100), and infinite overflow (API). LiteLLM can route between all three automatically based on latency, cost, and availability.

---

## Red Flag Calculator (Cloud Edition)

| Check | Formula | Fair Range | Red Flag |
|---|---|---|---|
| GPU markup | (Monthly quote ÷ raw cloud cost) − 1 | 10–20% | > 30% |
| Managed services rate (implied) | (Monthly quote − raw cloud) ÷ support hours | $150–$300/hr | > $400/hr |
| Blended monthly margin | (Monthly quote − COGS) ÷ Monthly quote | 25–35% | > 45% |
| Setup markup | (Setup fee ÷ estimated hours ÷ $150) − 1 | 20–40% | > 60% |
| Lock-in period | Contract minimum term | Month-to-month or 3mo | > 12 months without exit clause |

**A vendor quoting $50K+/month for 8x H100 managed inference is charging a 100%+ markup on raw cloud cost. The cloud is transparent — you can verify GPU pricing on RunPod, Lambda, and AWS in 5 minutes.**

---

## Sources

- [RunPod GPU Pricing](https://www.runpod.io/pricing)
- [Lambda Labs AI Cloud Pricing](https://lambda.ai/pricing)
- [AWS EC2 P5 Instances](https://aws.amazon.com/ec2/instance-types/p5/)
- [AWS EC2 Capacity Blocks Pricing](https://aws.amazon.com/ec2/capacityblocks/pricing/)
- [H100 Rental Prices Compared — IntuitionLabs](https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison)
- [H100 Price Guide 2026 — JarvisLabs](https://docs.jarvislabs.ai/blog/h100-price)
- [GPU Economics 2026: H100 vs A100 vs L40S](https://brlikhon.engineer/blog/gpu-economics-2026-h100-vs-a100-vs-l40s-complete-cost-performance-analysis-for-ai-workloads)
- [GPU Cloud Benchmarks 2026 — Spheron](https://www.spheron.network/blog/gpu-cloud-benchmarks/)
- [vLLM vs SGLang vs LMDeploy 2026 — PremAI](https://blog.premai.io/vllm-vs-sglang-vs-lmdeploy-fastest-llm-inference-engine-in-2026/)
- [Hetzner GPU Servers](https://www.hetzner.com/dedicated-rootserver/matrix-gpu/)
- [OVHcloud GPU for LLM Inference Guide](https://blog.ovhcloud.com/gpu-for-llm-inferencing-guide/)
- [Digital Sovereignty of Europe 2026 Guide — Gart](https://gartsolutions.com/digital-sovereignty-of-europe/)
- [EU Data Sovereignty — Impossible Cloud](https://www.impossiblecloud.com/magazine/cloud-data-sovereignty-for-eu-business-in-2026-new)
- [CLOUD Act vs European Data Sovereignty — CMS](https://cms-lawnow.com/en/ealerts/2026/02/white-paper-demystifying-the-debate-on-the-us-cloud-act-vs-european-uk-data-sovereignty-in-the-context-of-cloud-services)
- [LLM Self-Hosting and AI Sovereignty — Glukhov](https://www.glukhov.org/post/2026/02/llm-selfhosting-and-ai-sovereignty/)
- [MSP Profit Margins — CloudBolt](https://www.cloudbolt.io/msp-best-practices/msp-profit-margins/)
- [NSCA — Hardware Margins for Integrators](https://www.nsca.org/nsca-news/whats-the-right-hardware-margin-for-integrators/)
- [Cheapest Cloud GPU Providers 2026 — Northflank](https://northflank.com/blog/cheapest-cloud-gpu-providers)
- [4x L40S vLLM Benchmark — DatabaseMart](https://www.databasemart.com/blog/vllm-gpu-benchmark-a6000-4)
