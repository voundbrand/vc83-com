# Inference Options Research (Germany-First)

Snapshot date: 2026-03-27
Workstream row: `NCLAW-009`

## Objective

Pick an inference strategy that does not block MVP adoption for lawyer practices while keeping Germany-first DSGVO posture.

## Constraint baseline

1. Infrastructure host is locked to Hetzner (`H1`).
2. Default policy is fail-closed for new subprocessors.
3. Model inference must remain cost-manageable for pilot phase.

---

## 1) Is Hetzner GEX44 enough for 70B?

Short answer: no, not for practical 70B serving.

Evidence:

1. Hetzner `GEX44` provides one `NVIDIA RTX 4000 SFF Ada` with `20 GB` VRAM.
2. NVIDIA system card guidance for Llama 3 70B lists `fp16/bf16: 138 GB minimum` and `fp8: 69 GB minimum`.
3. Hetzner states GEX servers have one GPU each and cannot be configured with multiple GPUs.

Conclusion:

1. `GEX44` is suitable for smaller models and lightweight local inference.
2. For 70B-class serving, `GEX44` is not a realistic production target.

---

## 2) Self-hosted 70B on Hetzner: physically feasible, financially heavy

### Candidate: Hetzner GEX131

1. One GPU with `96 GB` VRAM (`NVIDIA RTX PRO 6000 Blackwell Max-Q`) can run quantized 70B inference classes.
2. Current Hetzner pricing changed on `2026-02-25` (effective `2026-04-01`):
   - `GEX44`: `EUR 212.30/month`
   - `GEX131 256 GB RAM`: `EUR 1029.30/month`
   - `GEX131 512 GB RAM`: `EUR 1167.30/month`
   - `GEX131 768 GB RAM`: `EUR 1379.30/month`

Operational implication:

1. One node is enough for pilot experiments.
2. Production-grade availability typically needs two nodes (active/passive or active/active), doubling fixed infrastructure cost.

Rough server-only envelope (excluding storage growth, backups, monitoring stack, and engineering labor):

1. Single-node: `~EUR 1029.30` to `EUR 1379.30/month`
2. Two-node HA: `~EUR 2058.60` to `EUR 2758.60/month`

This validates your concern: 70B self-hosting can quickly move into the low-thousands monthly before operational overhead.

---

## 3) Germany/EU managed inference options (token-based)

These lower fixed-cost risk during pilot and keep onboarding friction low.

### Option A: IONOS AI Model Hub

What we found:

1. Public model pricing exists for 70B-class models (example list shows `Llama 3.3 70B Instruct` with separate input/output token pricing; entity and currency vary by contract).
2. IONOS documents German regions (`Berlin`, `Frankfurt`) in service/location docs.
3. IONOS has a documented AVV path under DSGVO Art. 28.

Pros:

1. Transparent token pricing.
2. German provider with clear regional documentation.
3. Low fixed monthly commitment versus dedicated 70B hardware.

Cons:

1. External processor dependency.
2. Needs full legal evidence packet before go-live.

### Option B: STACKIT AI Model Serving

What we found:

1. STACKIT positions AI model serving as sovereign cloud with explicit DSGVO messaging.
2. Region docs identify `eu01` (Germany, Heilbronn) and additional EU region options.
3. A public AV contract template for STACKIT Cloud Services is available.

Pros:

1. Strong sovereignty positioning for German legal/professional audiences.
2. Germany/EU region story is straightforward.

Cons:

1. Price forecasting may require direct commercial clarification by workload profile.
2. Legal packet ingestion still required in our gate artifacts.

### Option C: Open Telekom Cloud (ModelArts)

What we found:

1. OTC publishes GDPR positioning and EU data center narrative.
2. ModelArts service is available in platform catalog.

Pros:

1. Strong enterprise-grade EU sovereignty narrative.
2. Good fit if Telekom ecosystem alignment is desired.

Cons:

1. Cost modeling is less transparent than token-first public lists.
2. Onboarding complexity may be higher for MVP speed.

---

## 4) Practical cost threshold guidance

Order-of-magnitude break-even view:

1. One `GEX131` starts at `~EUR 1029.30/month` before ops overhead.
2. Token-based 70B pricing examples in market docs are typically around low single-digit currency per million billed tokens (input + output combined).
3. At those rates, self-hosting usually only becomes cost-favorable when monthly billed volume gets very high (often around `~1B+ billed tokens/month` scale), and even then only if operations are already automated.

Interpretation:

1. For pilot and early MVP, managed token pricing usually beats fixed dedicated 70B costs.
2. Self-hosted 70B makes more sense later for high-volume or strict contractual isolation tiers.

---

## 5) Decision matrix for this workstream

| Option | DSGVO/Legal closure effort | Fixed-cost risk | Operational risk | Pilot fit |
|---|---|---|---|---|
| Self-host 70B on Hetzner (`GEX131`) | Medium (single provider, but internal TOM burden high) | High | High | Medium for later tier, weak for MVP |
| Managed Germany provider (`IONOS` or `STACKIT`) | Medium (AVV/TOM/subprocessor onboarding) | Low | Medium | Strong for MVP |
| Hybrid (managed 70B + local small model on Hetzner) | High (two inference paths) | Low to medium | Medium to high | Strong if engineered carefully |

---

## 6) Recommended rollout

1. Keep app/runtime/database stack self-hosted on Hetzner.
2. Use a managed EU inference path for pilot to avoid MVP blockage.
3. Keep dedicated self-hosted 70B as a later premium path, not a pilot prerequisite.

### Closure criteria for `NCLAW-009` inference sub-decision

1. MVP decision update (2026-03-27): primary path selected as `OpenRouter Enterprise EU + BYOK`.
2. Add OpenRouter DPA/AVV, subprocessor chain, and EU routing evidence to `compliance_docs/`.
3. Add legal packet for chosen upstream BYOK provider and keep contingency provider disabled by default.
4. Keep strict Germany-only tier as separate future backlog (`strict_germany_promise_backlog.md`).

---

## Primary sources

1. Hetzner GEX44 product page: https://www.hetzner.com/dedicated-rootserver/gex44/
2. Hetzner GPU matrix and GEX FAQ: https://www.hetzner.com/dedicated-rootserver/matrix-gpu/
3. Hetzner price adjustment (last change 2026-02-25, effective 2026-04-01): https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
4. NVIDIA Llama 70B system requirements (GPU memory): https://build.nvidia.com/meta/llama3-70b/systemcard
5. IONOS price list (AI Model Hub examples): https://docs.ionos.com/cloud/support/general-information/price-list/ionos-cloud-ltd
6. IONOS service catalog and locations: https://docs.ionos.com/cloud/support/general-information/service-catalog
7. IONOS AVV information: https://www.ionos.de/hilfe/datenschutz/allgemeine-informationen-zur-datenschutz-grundverordnung-dsgvo/vereinbarung-zur-auftragsverarbeitung-avv-mit-ionos-abschliessen/
8. STACKIT AI model serving: https://stackit.com/de/produkte/data-ai/stackit-ai-model-serving
9. STACKIT regions (eu01): https://docs.stackit.cloud/products/storage/block-storage/basics/regions-and-availability-zones/
10. STACKIT GDPR/certification positioning: https://stackit.com/en/why-stackit/benefits/certificates
11. STACKIT AV contract reference: https://www.stackit.de/wp-content/uploads/2025/04/STACKIT_AV-Vertrag_STACKIT-Cloud-Services-2.1_202503.pdf
12. Open Telekom Cloud GDPR page: https://www.open-telekom-cloud.com/en/data-security-gdpr-cloud
13. Open Telekom Cloud ModelArts: https://www.open-telekom-cloud.com/en/products-services/core-services/modelarts
