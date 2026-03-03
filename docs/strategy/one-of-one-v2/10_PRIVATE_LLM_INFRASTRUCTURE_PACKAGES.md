# Private LLM Inference Infrastructure — Package Comparison

> **Purpose:** Benchmark reference for evaluating vendor proposals for self-hosted, private LLM inference connected to the Seven Layers platform.
>
> **Date:** March 2026
>
> **Baseline hardware:** Apple Mac Studio with M3 Ultra chip, unified memory architecture, Thunderbolt 5 RDMA clustering via EXO Labs (open source).

---

## At a Glance

| | **Starter** | **Growth** | **Enterprise** |
|---|---|---|---|
| Users | 1–5 | 10–50 | Up to 500 |
| Concurrent sessions | 1–2 | 8–15 | 50–75 |
| Mac Studios | 1 | 4 | 10 |
| Total unified memory | 256 GB | 1 TB | 2.5 TB |
| Model class | 70B quantized | 70B full / 235B quantized | 405B+ full precision |
| Throughput | ~30 tok/s single-user | ~60–90 tok/s aggregate | ~200–300 tok/s aggregate |
| Power draw | ~120 W | ~450 W | ~1,200 W |
| **Hardware cost** | **$5,800** | **$23,200** | **$58,000** |
| **Total delivered** | **$9,500 – $12,000** | **$35,000 – $45,000** | **$95,000 – $120,000** |

---

## Package 1 — Starter

**For:** Founders, solo developers, hobby projects, proof-of-concept.

### Hardware

| Item | Spec | Unit Price | Qty | Subtotal |
|---|---|---|---|---|
| Mac Studio M3 Ultra | 28-core CPU, 60-core GPU, 256GB unified memory, 2TB SSD | $5,800 | 1 | $5,800 |
| UPS (battery backup) | 600VA / pure sine wave | $150 | 1 | $150 |
| **Hardware subtotal** | | | | **$5,950** |

### Software Stack (All Open Source — $0 License Cost)

| Layer | Tool | Notes |
|---|---|---|
| Inference runtime | Ollama or MLX-LM | Drop-in OpenAI-compatible API |
| Model | Llama 3.3 70B (Q4_K_M) | Matches 405B on most benchmarks at 5x lower cost to run |
| API gateway | LiteLLM | Unified API, rate limiting, key management |
| Monitoring | Grafana + Prometheus | Token throughput, latency, memory pressure |

### Services

| Service | Description | Cost |
|---|---|---|
| Initial setup | OS hardening, inference stack install, model download, API endpoint config | $1,500 |
| Platform integration | Connect inference API to Seven Layers backend (Convex actions), test end-to-end | $1,500 |
| Documentation | Runbook: restart procedures, model swap, monitoring alerts | Included |
| **Services subtotal** | | **$3,000** |

### Capabilities

- Run Llama 3.3 70B quantized entirely in memory — no swap, no degradation
- ~30 tokens/second for single-user interactive chat
- 128K token context window
- Handles: customer support drafting, internal Q&A, document summarization, code assistance
- Latency: first token in <500ms, full response in 2–5 seconds for typical queries
- Data never leaves your premises

### Limitations

- Single point of failure (one machine)
- Not suitable for more than 2 concurrent heavy sessions
- No redundancy — downtime during macOS updates or hardware issues

### Total Delivered: $8,950 – $12,000

(Range accounts for optional extras: additional storage, display, KVM setup)

---

## Package 2 — Growth

**For:** Teams of 10–50, startups scaling AI features, agencies running client workloads.

### Hardware

| Item | Spec | Unit Price | Qty | Subtotal |
|---|---|---|---|---|
| Mac Studio M3 Ultra | 28-core CPU, 60-core GPU, 256GB unified memory, 2TB SSD | $5,800 | 4 | $23,200 |
| OWC Thunderbolt 5 Hub | 5-port, 80 Gb/s bandwidth, RDMA-capable | $330 | 2 | $660 |
| Thunderbolt 5 cables | 0.8m active cables | $70 | 6 | $420 |
| 10GbE switch | 8-port managed, for management/monitoring traffic | $250 | 1 | $250 |
| Rack shelf / mount | 2U ventilated shelf for 4 Mac Studios | $120 | 2 | $240 |
| UPS | 1500VA rack-mount, pure sine wave | $450 | 1 | $450 |
| **Hardware subtotal** | | | | **$25,220** |

### Software Stack

| Layer | Tool | Notes |
|---|---|---|
| Cluster orchestration | EXO Labs (open source) | RDMA over Thunderbolt 5 — 100x latency reduction vs TCP |
| Inference runtime | MLX backend (via EXO) | Optimized for Apple Silicon unified memory |
| Models (hot) | Llama 3.3 70B (full precision) | Primary workhorse — no quantization needed with 1TB pooled memory |
| Models (available) | Qwen 2.5 235B (Q4_K_M), Mistral Large 2, DeepSeek R1 70B | Swap on demand for specialized tasks |
| API gateway | LiteLLM + Redis queue | Load balancing, request queuing, burst handling |
| Monitoring | Grafana + Prometheus + Alertmanager | Per-node health, cluster throughput, SLA tracking |
| Auth layer | API key management via LiteLLM | Per-team keys, usage tracking, rate limits |

### Services

| Service | Description | Cost |
|---|---|---|
| Cluster build & config | RDMA networking, EXO cluster init, failover testing | $3,500 |
| Platform integration | Seven Layers backend integration, model routing logic, fallback chains | $3,000 |
| Load testing | Simulate 15 concurrent users, measure latency P50/P95/P99 | $1,500 |
| Documentation & training | Operations runbook, 2-hour team training session | $1,000 |
| **Services subtotal** | | **$9,000** |

### Capabilities

- 1 TB pooled unified memory via RDMA — run 70B models at full precision or 235B quantized
- ~60–90 aggregate tokens/second across concurrent sessions
- 8–15 simultaneous users with interactive response times (<3s P95)
- Node failure tolerance: cluster degrades gracefully, 3 of 4 nodes can serve 70B
- Hot-swap models in <30 seconds without cluster restart
- Supports multiple model endpoints (e.g., coding model + general model + multilingual model)
- Power draw: ~450W total — runs on a single standard outlet

### Limitations

- Manual failover (no automatic node replacement)
- Throughput drops with 235B+ models under heavy concurrent load
- No geographic redundancy

### Total Delivered: $34,000 – $45,000

(Range accounts for storage upgrades, spare cables, optional 4TB SSD configs)

---

## Package 3 — Enterprise

**For:** Organizations up to 500 employees, production SLA, department-wide AI deployment.

### Hardware

| Item | Spec | Unit Price | Qty | Subtotal |
|---|---|---|---|---|
| Mac Studio M3 Ultra | 28-core CPU, 60-core GPU, 256GB unified memory, 2TB SSD | $5,800 | 10 | $58,000 |
| OWC Thunderbolt 5 Hub | 5-port, 80 Gb/s, RDMA | $330 | 6 | $1,980 |
| Thunderbolt 5 cables | 0.8m active | $70 | 20 | $1,400 |
| 10GbE managed switch | 16-port, VLAN support, for management plane | $500 | 1 | $500 |
| Network rack | 12U floor-standing, ventilated, locking | $600 | 1 | $600 |
| Rack shelves | 2U ventilated | $120 | 5 | $600 |
| UPS system | 3000VA rack-mount, network management card | $1,200 | 2 | $2,400 |
| KVM + management | IP-based KVM for remote management | $400 | 1 | $400 |
| Spare Mac Studio | Hot spare, pre-configured | $5,800 | 1 | $5,800 |
| **Hardware subtotal** | | | | **$71,680** |

### Software Stack

| Layer | Tool | Notes |
|---|---|---|
| Cluster orchestration | EXO Labs + custom health daemon | Auto-detection of node failure, automatic re-routing |
| Inference runtime | MLX backend (via EXO), vLLM fallback for batch jobs | PagedAttention for 2–4x throughput on batch workloads |
| Models (production) | Llama 3.3 70B (full), Qwen 2.5 235B (full), Mistral Large 2 | Multiple models served simultaneously |
| Models (specialized) | DeepSeek R1 for reasoning, CodeLlama for dev teams, Qwen multilingual | Department-specific routing |
| API gateway | LiteLLM + Redis + Nginx | Load balancing, request prioritization, department quotas |
| Monitoring | Grafana + Prometheus + Alertmanager + PagerDuty webhook | SLA dashboards, capacity forecasting, cost attribution |
| Auth & governance | LiteLLM teams + SAML/SSO integration | Per-department keys, usage budgets, audit logging |
| Logging & compliance | Request/response logging to encrypted local storage | Configurable retention, PII redaction pipeline |

### Services

| Service | Description | Cost |
|---|---|---|
| Architecture & planning | Capacity modeling for 500 users, network design, rack layout | $3,000 |
| Cluster build & config | 10-node RDMA cluster, sub-cluster topology (2x5 or 3+3+4), failover | $6,000 |
| Platform integration | Seven Layers backend integration, model router, department routing rules | $4,000 |
| Load & stress testing | Simulate 75 concurrent users sustained, P99 latency validation | $2,500 |
| SSO / governance setup | SAML integration, department quotas, audit log pipeline | $2,000 |
| Documentation | Full operations manual, disaster recovery runbook, architecture diagrams | $1,500 |
| Team training | 2x half-day sessions — ops team + end-user enablement | $2,000 |
| **Services subtotal** | | **$21,000** |

### Optional Annual Support Contract

| Tier | Coverage | Annual Cost |
|---|---|---|
| Standard | Business-hours email support, quarterly health check, OS update guidance | $6,000/yr |
| Priority | 4-hour response SLA, remote diagnostics, monthly capacity review | $12,000/yr |
| Managed | 24/7 monitoring, proactive patching, model updates, performance tuning | $24,000/yr |

### Capabilities

- 2.5 TB pooled unified memory — run multiple 70B models at full precision simultaneously, or single 405B+ model
- ~200–300 aggregate tokens/second under production load
- 50–75 concurrent sessions with interactive latency (<2s P95 for 70B)
- Serve 500 employees at typical enterprise usage patterns (10–15% concurrent peak)
- N+1 redundancy with hot spare — no single point of failure
- Department-level model routing: legal gets reasoning model, engineering gets code model, support gets general model
- Full audit trail for compliance (SOC 2, HIPAA-adjacent logging)
- Power draw: ~1,200W — single 20A circuit, no special electrical work
- Noise: near-silent (Mac Studio is fanless under moderate load)

### Capacity Math

| Metric | Value |
|---|---|
| Total employees | 500 |
| Peak concurrent ratio | 10–15% (industry standard for internal tools) |
| Peak concurrent users | 50–75 |
| Avg. request (input + output) | ~1,500 tokens |
| Avg. generation time at 30 tok/s per node | ~1.5s per response |
| Effective throughput (10 nodes) | ~200–300 tok/s aggregate |
| Requests per minute at peak | ~120–150 |
| Queue depth at sustained peak | 2–5 requests (sub-second queue wait) |

### Total Delivered: $92,000 – $120,000

(Range accounts for storage upgrades, 4TB SSD options, additional networking, geographic preferences)

With Priority annual support: **$104,000 – $132,000 first year**

---

## COGS & Margin Analysis — What the Provider Actually Spends

> **Key insight:** Hardware is pass-through margin (5–9%). The real profit is in services (33–50%) and recurring support (63–75%). A serious provider prices fairly on hardware to win the deal, then builds a long-term relationship on support contracts.

### Industry Benchmarks

| Category | Typical Gross Margin | Source |
|---|---|---|
| Apple hardware resale | 5–9% | Apple Authorized Reseller program |
| Networking / peripherals | 20–30% | IT integrator standard |
| Professional services (labor) | 33–50% | MSP industry average |
| Managed support contracts | 63–75% | MSP best-in-class |
| **Blended deal target** | **25–35%** | **Industry standard for HW+services** |

---

### Package 1 — Starter: COGS Breakdown

**Labor assumption:** Senior engineer @ $120/hr loaded cost

| Cost Category | Item | Vendor COGS | Sell Price | Margin |
|---|---|---|---|---|
| **Hardware** | 1x Mac Studio M3 Ultra 256GB (8% reseller discount) | $5,336 | $5,800 | 8% — $464 |
| **Hardware** | UPS 600VA | $120 | $150 | 20% — $30 |
| **Services** | OS hardening + inference stack install (4 hrs) | $480 | — | — |
| **Services** | Model download + optimization + API config (3 hrs) | $360 | — |— |
| **Services** | Platform integration + end-to-end testing (5 hrs) | $600 | — | — |
| **Services** | Documentation / runbook (2 hrs) | $240 | — | — |
| **Services** | Project management + client comms (2 hrs) | $240 | — | — |
| | **Services subtotal (16 hrs)** | **$1,920** | **$3,000** | **36% — $1,080** |
| | | | | |
| | **Total COGS** | **$7,376** | | |
| | **Sell price** | | **$9,500–$12,000** | |
| | **Gross profit** | | | **$2,124–$4,624** |
| | **Blended margin** | | | **22–39%** |

**Fair provider profit: ~$2,500–$3,500**

---

### Package 2 — Growth: COGS Breakdown

**Labor assumption:** Senior engineer @ $120/hr + junior engineer @ $80/hr for load testing

| Cost Category | Item | Vendor COGS | Sell Price | Margin |
|---|---|---|---|---|
| **Hardware** | 4x Mac Studio M3 Ultra 256GB (8% reseller discount) | $21,344 | $23,200 | 8% — $1,856 |
| **Hardware** | 2x OWC TB5 Hub | $260 | $660 | 61% — $400 |
| **Hardware** | 6x TB5 cables | $300 | $420 | 29% — $120 |
| **Hardware** | 10GbE switch | $180 | $250 | 28% — $70 |
| **Hardware** | 2x rack shelves | $160 | $240 | 33% — $80 |
| **Hardware** | UPS 1500VA | $320 | $450 | 29% — $130 |
| | **Hardware subtotal** | **$22,564** | **$25,220** | **10% — $2,656** |
| | | | | |
| **Services** | Network topology design + rack layout (3 hrs Sr) | $360 | — | — |
| **Services** | Physical build: unbox, rack, cable (4 hrs Sr) | $480 | — | — |
| **Services** | RDMA config + EXO cluster init (6 hrs Sr) | $720 | — | — |
| **Services** | Failover testing + node failure simulation (4 hrs Sr) | $480 | — | — |
| **Services** | Platform integration + model routing (8 hrs Sr) | $960 | — | — |
| **Services** | Fallback chain config + error handling (3 hrs Sr) | $360 | — | — |
| **Services** | Load testing: 15 concurrent, P50/P95/P99 (6 hrs Jr) | $480 | — | — |
| **Services** | LiteLLM gateway + Redis queue + auth keys (4 hrs Sr) | $480 | — | — |
| **Services** | Grafana dashboards + Alertmanager rules (3 hrs Sr) | $360 | — | — |
| **Services** | Operations runbook + architecture docs (4 hrs Sr) | $480 | — | — |
| **Services** | Team training session — 2 hrs delivery + 2 hrs prep (4 hrs Sr) | $480 | — | — |
| **Services** | Project management + client comms (5 hrs Sr) | $600 | — | — |
| | **Services subtotal (54 hrs)** | **$6,240** | **$9,000** | **31% — $2,760** |
| | | | | |
| | **Total COGS** | **$28,804** | | |
| | **Sell price** | | **$35,000–$45,000** | |
| | **Gross profit** | | | **$6,196–$16,196** |
| | **Blended margin** | | | **18–36%** |

**Fair provider profit: ~$8,000–$12,000**

---

### Package 3 — Enterprise: COGS Breakdown

**Labor assumption:** Lead architect @ $150/hr, senior engineer @ $120/hr, junior engineer @ $80/hr

| Cost Category | Item | Vendor COGS | Sell Price | Margin |
|---|---|---|---|---|
| **Hardware** | 10x Mac Studio M3 Ultra 256GB (8% reseller discount) | $53,360 | $58,000 | 8% — $4,640 |
| **Hardware** | 1x Spare Mac Studio (pre-configured) | $5,336 | $5,800 | 8% — $464 |
| **Hardware** | 6x OWC TB5 Hub | $780 | $1,980 | 61% — $1,200 |
| **Hardware** | 20x TB5 cables | $1,000 | $1,400 | 29% — $400 |
| **Hardware** | 16-port 10GbE managed switch | $350 | $500 | 30% — $150 |
| **Hardware** | 12U rack | $400 | $600 | 33% — $200 |
| **Hardware** | 5x rack shelves | $400 | $600 | 33% — $200 |
| **Hardware** | 2x UPS 3000VA | $1,700 | $2,400 | 29% — $700 |
| **Hardware** | IP KVM | $280 | $400 | 30% — $120 |
| | **Hardware subtotal** | **$63,606** | **$71,680** | **11% — $8,074** |
| | | | | |
| **Services** | Capacity modeling for 500 users (4 hrs Arch) | $600 | — | — |
| **Services** | Network design + sub-cluster topology (4 hrs Arch) | $600 | — | — |
| **Services** | Rack layout + power planning (2 hrs Arch) | $300 | — | — |
| **Services** | Physical build: unbox, rack, cable 11 units (8 hrs Sr) | $960 | — | — |
| **Services** | RDMA config + 10-node EXO cluster init (8 hrs Sr) | $960 | — | — |
| **Services** | Sub-cluster topology (2x5 or 3+3+4) config (4 hrs Sr) | $480 | — | — |
| **Services** | Failover + node failure simulation (4 hrs Sr) | $480 | — | — |
| **Services** | Hot spare config + automatic re-routing daemon (6 hrs Sr) | $720 | — | — |
| **Services** | Platform integration + model router (8 hrs Sr) | $960 | — | — |
| **Services** | Department routing rules + quota enforcement (4 hrs Sr) | $480 | — | — |
| **Services** | vLLM batch pipeline setup (4 hrs Sr) | $480 | — | — |
| **Services** | Load testing: 75 concurrent sustained (8 hrs Jr) | $640 | — | — |
| **Services** | P99 latency validation + bottleneck analysis (4 hrs Sr) | $480 | — | — |
| **Services** | SAML/SSO integration (6 hrs Sr) | $720 | — | — |
| **Services** | Department quotas + audit log pipeline (4 hrs Sr) | $480 | — | — |
| **Services** | PII redaction pipeline config (3 hrs Sr) | $360 | — | — |
| **Services** | Grafana dashboards + PagerDuty + SLA tracking (4 hrs Sr) | $480 | — | — |
| **Services** | Full operations manual (6 hrs Sr) | $720 | — | — |
| **Services** | DR runbook + architecture diagrams (4 hrs Sr) | $480 | — | — |
| **Services** | Ops team training — half day + prep (6 hrs Sr) | $720 | — | — |
| **Services** | End-user enablement session — half day + prep (6 hrs Sr) | $720 | — | — |
| **Services** | Project management + stakeholder comms (10 hrs Arch) | $1,500 | — | — |
| | **Services subtotal (115 hrs)** | **$13,300** | **$21,000** | **37% — $7,700** |
| | | | | |
| | **Total COGS** | **$76,906** | | |
| | **Sell price** | | **$95,000–$120,000** | |
| | **Gross profit** | | | **$18,094–$43,094** |
| | **Blended margin** | | | **19–36%** |

**Fair provider profit: ~$20,000–$30,000**

---

### Recurring Support — Where the Real Business Model Lives

Support is high-margin because the infrastructure is stable (no moving parts, fanless, solid-state) and most issues are software config, not hardware failure.

| Support Tier | Annual Price | Effort (hrs/yr) | Labor COGS | Margin | Annual Profit |
|---|---|---|---|---|---|
| Standard | $6,000 | ~15 hrs Sr | $1,800 | 70% | **$4,200** |
| Priority | $12,000 | ~35 hrs Sr | $4,200 | 65% | **$7,800** |
| Managed | $24,000 | ~80 hrs (mix Sr+Jr) | $8,400 | 65% | **$15,600** |

#### Managed Support: Task Breakdown (80 hrs/yr)

| Task | Frequency | Hours/yr | Rate |
|---|---|---|---|
| Proactive monitoring + alert triage | Weekly | 26 | Jr @ $80 |
| macOS + EXO + model updates | Monthly | 12 | Sr @ $120 |
| Performance tuning + capacity review | Monthly | 12 | Sr @ $120 |
| Incident response (4-hr SLA) | As needed (~6/yr) | 12 | Sr @ $120 |
| Quarterly health check + report | Quarterly | 8 | Sr @ $120 |
| Model evaluation + swap recommendations | Quarterly | 6 | Sr @ $120 |
| Client calls + reporting | Monthly | 4 | Sr @ $120 |

---

### Total Provider Revenue Over 3 Years

| Package | Deal Profit | Support Tier | 3yr Support Profit | **Total 3yr Profit** |
|---|---|---|---|---|
| **Starter** | $2,500–$3,500 | Standard | $12,600 | **$15,100–$16,100** |
| **Growth** | $8,000–$12,000 | Priority | $23,400 | **$31,400–$35,400** |
| **Enterprise** | $20,000–$30,000 | Managed | $46,800 | **$66,800–$76,800** |

A provider running 10 Enterprise clients with Managed support contracts earns **$668K–$768K over 3 years** — that's a real business on commodity Apple hardware and open-source software.

---

### Red Flag Calculator

Use this to evaluate any vendor quote:

| Check | Formula | Fair Range | Red Flag |
|---|---|---|---|
| Hardware markup | (Quote HW price ÷ Apple retail) − 1 | 5–15% | > 20% |
| Services rate (implied) | Services line ÷ estimated hours | $150–$250/hr | > $350/hr |
| Blended deal margin | (Quote − COGS est.) ÷ Quote | 25–35% | > 45% |
| Support margin | Annual support ÷ estimated effort | 60–75% | > 85% (means they won't show up) |

**The $195K quote implies a ~60% blended margin. Industry standard is 25–35%. That's not a premium — it's a lack of competition in the buyer's evaluation process.**

---

## Why $195,000 Is Not a Serious Offer

A vendor quoting $195,000 for a single Mac Studio M3 Ultra 256GB setup is charging a **24x markup** on Apple's retail price, or a **16–20x markup** on a fully delivered Starter package.

Even the Enterprise package — 10 Mac Studios, full RDMA clustering, hot spare, SSO integration, compliance logging, load testing, training, and documentation — comes in at **$92K–$120K delivered**.

To reach $195K legitimately, a proposal would need to include:

- 12+ Mac Studios (some at 512GB) → ~$80K–$115K hardware
- Custom software development (fine-tuning pipeline, RAG infrastructure, custom UI) → $30K–$50K
- Managed services contract (12+ months) → $24K–$48K
- On-site installation in a different city → $5K–$10K

**If the $195K quote doesn't itemize at these levels of detail, walk away.**

---

## Comparison: Mac Studio Cluster vs Alternatives

| Solution | Hardware Cost | Monthly OpEx | 500-User Capable | Data Sovereignty | Setup Time |
|---|---|---|---|---|---|
| **Mac Studio 10-node (this doc)** | $58K–$72K | ~$50 electricity | Yes | Full | 2–3 weeks |
| NVIDIA H100 on-prem (26+ GPUs) | $780K+ | $2K+ electricity | Yes | Full | 8–12 weeks |
| Cloud H100 rental (RunPod/Lambda) | $0 | $8K–$15K/mo | Yes | Partial | Days |
| Cloud API (Claude/GPT) | $0 | $3K–$25K/mo | Yes | No | Hours |
| NVIDIA DGX Spark + Mac Studio | $15K–$25K | ~$80 electricity | Limited (small team) | Full | 1–2 weeks |

### Break-Even vs Cloud API

At $10K/month cloud API spend, the Enterprise package pays for itself in **10–12 months**. Every month after that is effectively free inference.

At $3K/month cloud API spend, the Growth package pays for itself in **12–15 months**.

---

## Recommended Models by Department (Enterprise)

| Department | Model | Why | Size |
|---|---|---|---|
| General / Support | Llama 3.3 70B | Best all-rounder, largest community, 128K context | 70B |
| Engineering | DeepSeek R1 70B or CodeLlama | Strong reasoning and code generation | 70B |
| Legal / Compliance | Qwen 2.5 235B | Deep reasoning, long-context analysis | 235B |
| Multilingual teams | Qwen 2.5 72B | 29+ languages with cultural fluency | 72B |
| Creative / Marketing | Mistral Large 2 | Strong writing quality, fast iteration | 123B |
| Executive / Strategy | Llama 3.1 405B (quantized) | Maximum capability for complex analysis | 405B |

All models are open-weight with permissive commercial licenses (Apache 2.0 or Meta Community License).

---

## What to Demand From Any Vendor

1. **Itemized hardware BOM** — every Mac Studio, cable, and hub with Apple retail price for comparison
2. **Open source stack disclosure** — no proprietary wrappers around Ollama/EXO/LiteLLM being sold as custom software
3. **Load test results** — P50/P95/P99 latency at your target concurrent user count
4. **Benchmark reproducibility** — you should be able to verify token throughput claims with `llm-benchmark` or similar
5. **Escape clause** — if you can replicate the setup yourself within 30 days, the hardware is commodity; you're only paying for integration labor and support
6. **No lock-in** — everything runs on standard macOS with open-source tools; you can self-manage at any time

---

## Sources

- [Apple Mac Studio Store](https://www.apple.com/shop/buy-mac/mac-studio)
- [Mac Studio M3 Ultra 256GB — Micro Center](https://www.microcenter.com/product/694414/apple-mac-studio-z1cd001hr-(early-2025)-desktop-computer)
- [Mac Studio Clusters Run Trillion-Parameter Models for $40K](https://awesomeagents.ai/news/mac-studio-clusters-local-llm-inference-rdma/)
- [1.5 TB of VRAM on Mac Studio — RDMA over Thunderbolt 5 — Jeff Geerling](https://www.jeffgeerling.com/blog/2025/15-tb-vram-on-mac-studio-rdma-over-thunderbolt-5/)
- [EXO Labs — GitHub](https://github.com/exo-explore/exo)
- [RDMA over Thunderbolt 5 — Apple Insider](https://appleinsider.com/articles/25/12/20/ai-calculations-on-mac-cluster-gets-a-big-boost-from-new-rdma-support-on-thunderbolt-5)
- [Self-Hosted LLM Guide 2026 — PremAI](https://blog.premai.io/self-hosted-llm-guide-setup-tools-cost-comparison-2026/)
- [Self-Hosted LLMs vs Cloud APIs — DasRoot](https://dasroot.net/posts/2026/01/self-hosted-llm-vs-cloud-apis-claude-gpt5/)
- [Llama vs Mistral vs Phi Enterprise Comparison — PremAI](https://blog.premai.io/llama-vs-mistral-vs-phi-complete-open-source-llm-comparison-for-enterprise-2026/)
- [Best Open Source LLMs 2026 — Contabo](https://contabo.com/blog/open-source-llms/)
- [LLM Inference Sizing Guidance — VMware](https://blogs.vmware.com/cloud-foundation/2024/09/25/llm-inference-sizing-and-performance-guidance/)
- [OWC Thunderbolt 5 Hub](https://www.owc.com/solutions/thunderbolt-5-hub)
- [H100 Price Guide 2026 — JarvisLabs](https://docs.jarvislabs.ai/blog/h100-price)
- [Apple Turned a Software Update Into a $730K Discount on AI Infrastructure](https://www.implicator.ai/apple-just-turned-a-software-update-into-a-730-000-discount-on-ai-infrastructure/)
- [NSCA — What's the Right Hardware Margin for Integrators](https://www.nsca.org/nsca-news/whats-the-right-hardware-margin-for-integrators/)
- [MSP Profit Margins — CloudBolt](https://www.cloudbolt.io/msp-best-practices/msp-profit-margins/)
- [MSP Profit Margins 101 — Thread](https://www.getthread.com/blog/msp-profit-margins)
- [How to Determine Reseller Margins — Chanimal](https://chanimal.com/resources/pricing/reseller-margins/)
- [Apple Reseller Margins — Quora](https://www.quora.com/What-is-the-average-gross-margin-of-retailers-of-Apple-products)
- [MSP Profit Margins — V2 Cloud](https://v2cloud.com/blog/msp-profit-margins)
