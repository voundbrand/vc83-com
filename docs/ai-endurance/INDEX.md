# AI Endurance Index

**Last updated:** 2026-02-16  
**Purpose:** One overview for all deep-dive implementation plans that make this codebase durable under rapid AI evolution.

---

## How to use this folder

1. Read this index first.
2. Pick one plan from the sequence below.
3. Execute that plan in small chunks using Codex.
4. Mark progress in both this index and `docs/ai-endurance/MASTER_PLAN.md`.

---

## Plan Catalog

| # | Topic | Plan |
|---|---|---|
| 01 | Knowledge -> Recipes -> Skills foundation | `docs/ai-endurance/implementation-plans/01-knowledge-recipes-skills.md` |
| 02 | Tool/runtime separation from model behavior | `docs/ai-endurance/implementation-plans/02-tool-registry-execution-separation.md` |
| 03 | Layered tool scoping and safety | `docs/ai-endurance/implementation-plans/03-layered-tool-scoping-security.md` |
| 04 | Model discovery and platform enablement control plane | `docs/ai-endurance/implementation-plans/04-model-discovery-platform-control-plane.md` |
| 05 | Unified LLM policy router | `docs/ai-endurance/implementation-plans/05-llm-policy-router.md` |
| 06 | Dynamic pricing and cost governance | `docs/ai-endurance/implementation-plans/06-dynamic-pricing-cost-governance.md` |
| 07 | Two-stage failover (OpenClaw-inspired) | `docs/ai-endurance/implementation-plans/07-two-stage-failover-openclaw-pattern.md` |
| 08 | Session stickiness for model/auth routing | `docs/ai-endurance/implementation-plans/08-session-stickiness-model-auth.md` |
| 09 | RAG and org memory pipeline | `docs/ai-endurance/implementation-plans/09-rag-memory-pipeline.md` |
| 10 | Tool contracts and compatibility eval harness | `docs/ai-endurance/implementation-plans/10-tool-contracts-and-compat-evals.md` |
| 11 | Observability, SLOs, and release gates | `docs/ai-endurance/implementation-plans/11-observability-slos-and-release-gates.md` |
| 12 | Human approval and escalation durability | `docs/ai-endurance/implementation-plans/12-human-approval-and-escalation.md` |
| 13 | Control-plane and plugin boundary architecture | `docs/ai-endurance/implementation-plans/13-control-plane-plugin-boundaries.md` |

---

## Recommended execution sequence

### Wave A: Stabilize model/runtime policy
- 05 LLM policy router
- 06 Dynamic pricing and cost governance
- 07 Two-stage failover
- 08 Session stickiness

### Wave B: Stabilize execution surface
- 10 Tool contracts and compatibility evals
- 11 Observability and SLO gates
- 12 Human approval and escalation durability

### Wave C: Deepen product moat
- 09 RAG and org memory pipeline
- 01 Knowledge -> Recipes -> Skills alignment

### Wave D: Harden platform architecture
- 13 Control-plane and plugin boundaries
- 02 Tool/runtime separation
- 03 Layered scoping safety refinement
- 04 Model control plane lifecycle hardening

---

## Codebase anchors (current implementation)

- Chat runtime: `convex/ai/chat.ts`
- Agent runtime: `convex/ai/agentExecution.ts`
- Tool registry: `convex/ai/tools/registry.ts`
- Tool scoping: `convex/ai/toolScoping.ts`
- Retry/fallback: `convex/ai/retryPolicy.ts`
- OpenRouter client and cost logic: `convex/ai/openrouter.ts`
- Model discovery: `convex/ai/modelDiscovery.ts`
- Platform model gating: `convex/ai/platformModels.ts`
- AI settings schema/mutations: `convex/ai/settings.ts`
- Conversation/message storage: `convex/ai/conversations.ts`, `convex/ai/agentSessions.ts`

OpenClaw references are integrated into canonical docs via:
- `docs/agentic_system/OPENCLAW_IDEA_INTEGRATION.md`

---

## Progress board

- [ ] 01 Knowledge -> Recipes -> Skills
- [ ] 02 Tool/runtime separation
- [ ] 03 Layered scoping safety
- [ ] 04 Model control plane lifecycle
- [ ] 05 LLM policy router
- [ ] 06 Dynamic pricing governance
- [ ] 07 Two-stage failover
- [ ] 08 Session stickiness
- [ ] 09 RAG memory pipeline
- [ ] 10 Tool contracts + compat evals
- [ ] 11 Observability + SLO gates
- [ ] 12 Human approval + escalation
- [ ] 13 Control-plane + plugin boundaries

---

## Execution command pattern (copy/paste prompt)

```text
Implement plan [NN] from docs/ai-endurance/implementation-plans/[file].md.
Work in 1-2 hour chunks.
Definition of done:
1) code changes
2) tests added/updated
3) test commands executed
4) docs updated (mark progress in INDEX.md and MASTER_PLAN.md)
Before coding, list top 3 regression risks.
After coding, report what changed, test results, and residual risks.
```
