# AI Endurance Master Plan

**Date:** 2026-02-16  
**Scope:** Make `vc83-com` durable against rapid AI model, provider, and tooling changes while improving development throughput with Codex.

---

## 0. Deep-Dive Plans

Detailed per-topic implementation plans are indexed in:
- `docs/ai-endurance/INDEX.md`

Use `MASTER_PLAN.md` for high-level sequencing and `INDEX.md` + `implementation-plans/` for deep implementation detail.

---

## 1. Mission

Build an AI system that survives model churn by treating models as replaceable and our platform primitives as stable.

In practice:
- Models can change weekly.
- Tool contracts, data contracts, and execution policy must stay stable.
- Reliability, security, and cost controls must be enforced in one control plane.

---

## 2. Current Baseline (Reality Check)

What is already strong:
- Composition architecture exists (`knowledge + recipes + skills`) in `docs/layers/AI_COMPOSITION_PLATFORM.md`.
- Centralized tool registry and execution pipeline exist in `convex/ai/tools/registry.ts` and `convex/ai/agentExecution.ts`.
- Layered tool scoping exists in `convex/ai/toolScoping.ts`.
- Model discovery and platform enablement exist in `convex/ai/modelDiscovery.ts` and `convex/ai/platformModels.ts`.

Current gaps to close first:
- Chat path still uses legacy model field (`settings.llm.model`) in `convex/ai/chat.ts`.
- Cost estimation is hardcoded in `convex/ai/openrouter.ts`.
- Model fallback chain is hardcoded in `convex/ai/retryPolicy.ts`.
- Knowledge-base retrieval in agent runtime is still TODO in `convex/ai/agentExecution.ts`.

---

## 3. Endurance Principles

1. **Model-agnostic core**  
   Business logic never depends on a specific model id.

2. **Stable tool contracts**  
   Every tool has a versioned input/output contract and compatibility tests.

3. **Single policy router**  
   Model selection, fallback, pricing, quotas, and gating are resolved in one place.

4. **Memory over prompt size**  
   Use retrieval and structure, not giant prompts.

5. **Human override always available**  
   Escalation and approval are first-class, not emergency patches.

6. **Observe everything**  
   Track success, failure, cost, latency, and tool correctness before broad rollout.

---

## 4. Workstreams

## WS1: LLM Policy Control Plane

**Goal:** One runtime decision engine for model selection and failover across chat and agent pipelines.

**Primary targets:**
- `convex/ai/chat.ts`
- `convex/ai/agentExecution.ts`
- `convex/ai/settings.ts`
- `convex/ai/platformModels.ts`
- `convex/ai/retryPolicy.ts`

**Deliverables:**
- Replace legacy chat model resolution with `enabledModels/defaultModelId`.
- Validate selected model against platform-enabled models.
- Centralize fallback and retry policy in a shared resolver.
- Add per-session model pinning logic.

---

## WS2: Pricing and Cost Integrity

**Goal:** Remove static pricing assumptions and use discovered model metadata.

**Primary targets:**
- `convex/ai/openrouter.ts`
- `convex/ai/modelDiscovery.ts`
- `convex/schemas/aiSchemas.ts`

**Deliverables:**
- Replace hardcoded `COST_PER_MILLION` table with database-backed pricing.
- Add fallback behavior when pricing is missing (safe defaults + warning).
- Ensure reported spend and credit deductions use consistent pricing source.

---

## WS3: Tool Contract Reliability

**Goal:** Make tool behavior stable across model upgrades.

**Primary targets:**
- `convex/ai/tools/registry.ts`
- `convex/ai/toolBroker.ts`
- `scripts/test-model-validation.ts`
- `docs/AI_MODEL_VALIDATION_STRATEGY.md`

**Deliverables:**
- Versioned contract metadata for critical tools.
- Add compatibility tests for tool argument parsing and multi-turn tool flows.
- Gate model enablement with pass thresholds from tool reliability tests.

---

## WS4: Knowledge and RAG Completion

**Goal:** Move from placeholder knowledge flow to production retrieval.

**Primary targets:**
- `convex/ai/agentExecution.ts`
- `convex/organizationMedia.ts` (and related media retrieval actions)
- `docs/layers/AI_COMPOSITION_PLATFORM.md`

**Deliverables:**
- Implement actual KB doc retrieval where TODO exists.
- Add retrieval quality checks and token budget controls.
- Ensure org-specific knowledge is scoped and auditable.

---

## WS5: Observability and SLOs

**Goal:** Define and enforce objective quality bars.

**Primary targets:**
- `convex/ai/agentSessions.ts`
- `convex/ai/deadLetterQueue.ts`
- `convex/ai/platformAlerts.ts`
- `convex/ai/workItems.ts`

**Deliverables:**
- Dashboard/query layer for: tool success rate, fallback rate, model error rate, avg cost/message, escalation rate.
- SLO alerts for regressions.
- Weekly reliability review routine.

---

## WS6: Security and Refactor Debt

**Goal:** Reduce fragility in AI-critical paths.

**Primary references:**
- `docs/REFACTORY/00-OVERVIEW.md`
- `docs/REFACTORY/03-SECURITY-ISSUES.md`

**Deliverables:**
- Keep AI-sensitive files modular and testable.
- Reduce large-file hotspots in critical AI paths.
- Close any open security issues impacting AI workflows.

---

## 5. Phase Plan (8 Weeks)

## Phase 0 (Week 1): Foundation and Policy Unification

- [ ] Introduce shared model policy resolver (chat + agent).
- [ ] Migrate chat runtime off legacy single-model field.
- [ ] Enforce platform-enabled model validation in runtime path.
- [ ] Add tests for model selection edge cases.

**Exit criteria:** Chat and agent both use the same model policy source.

## Phase 1 (Week 2): Cost and Fallback Hardening

- [ ] Replace static pricing in `openrouter.ts`.
- [ ] Move fallback chain to policy/config data.
- [ ] Add observability for fallback reasons and frequency.

**Exit criteria:** No hardcoded model cost/fallback in runtime logic.

## Phase 2 (Weeks 3-4): Tool Contract and Eval Gates

- [ ] Add contract versioning metadata for critical tools.
- [ ] Expand model validation suite to include contract-level checks.
- [ ] Add release gate: model must pass tool reliability threshold.

**Exit criteria:** Enabling a new model requires passing eval suite.

## Phase 3 (Weeks 5-6): Knowledge Pipeline Completion

- [ ] Implement real KB retrieval in `agentExecution.ts`.
- [ ] Add retrieval quality metrics and token/cost guardrails.
- [ ] Validate tenant isolation and tag-scoped retrieval.

**Exit criteria:** Agent knowledge path is production, not TODO.

## Phase 4 (Weeks 7-8): SLOs, Cleanup, and Runbooks

- [ ] Publish AI reliability SLOs and alerts.
- [ ] Document failure playbooks (model outage, tool degradation, cost spikes).
- [ ] Refactor remaining high-risk monolith sections in AI path.

**Exit criteria:** Team can operate the system with clear health signals and incident playbooks.

---

## 6. How To Work With Codex (Practical Guide)

Use this exact loop for best results.

## Step A: Give one concrete objective

Good:
- “Implement shared model policy resolver for `chat.ts` and `agentExecution.ts`, add tests.”

Bad:
- “Improve AI architecture.”

## Step B: Require implementation + verification

Template:

```text
Task: [specific change]
Constraints: [files, style, no breaking API, etc.]
Definition of done:
1) Code changed
2) Tests added/updated
3) Relevant test commands executed
4) Docs updated
```

## Step C: Ask for risk-first output

Template:

```text
Before coding, list the top 3 risks/regressions for this change.
After coding, show:
- what changed
- test results
- any residual risks
```

## Step D: Keep scope tight (1-2 hour chunks)

Best chunk size:
- 1 feature
- 1 bug
- 1 refactor seam
- 1 verification run

## Step E: Keep this file updated

After each merged chunk, ask Codex:
- “Update `docs/ai-endurance/MASTER_PLAN.md` progress checkboxes for completed items.”

---

## 7. Prompt Templates You Can Reuse

## Template 1: Build Feature

```text
Implement [feature] in [files].
Constraints: [list].
Definition of done:
1) Runtime behavior [expected behavior]
2) Tests: [specific tests]
3) Update docs: [path]
Also include a brief regression-risk section.
```

## Template 2: Refactor Safely

```text
Refactor [file/module] for [goal] without changing behavior.
Add characterization tests first, then refactor, then run tests.
Report any behavior changes you detect.
```

## Template 3: Reliability Hardening

```text
Add observability and failure handling for [component].
I need:
1) Metrics/logging additions
2) Alert conditions
3) One runbook note in docs
4) Verification steps
```

## Template 4: Code Review Mode

```text
Review these changes with a bug-risk focus.
List findings by severity with file:line references.
Then list test gaps.
```

---

## 8. First Three Tasks To Run With Codex

1. **Unify model selection runtime**
- Move chat path from `settings.llm.model` to `enabledModels/defaultModelId`.
- Validate model against platform-enabled list.

2. **De-hardcode AI cost calculation**
- Replace static pricing map with `aiModels` lookup.
- Add safe fallback and warning when model pricing is missing.

3. **Implement agent knowledge retrieval TODO**
- Wire KB retrieval in `agentExecution.ts`.
- Add basic tests and guardrails.

---

## 8A. Granular Chunk Backlog (Recommended)

Use these as one-by-one Codex tickets. Each chunk is designed to be small enough to complete in a single focused session.

## WS1 Chunks: Model Policy Control Plane (Week 1)

- [ ] **Chunk WS1-01 (60m):** Add `convex/ai/modelPolicy.ts` with pure helpers
  - `resolveOrgDefaultModel(settings)`
  - `resolveRequestedModel(settings, selectedModel?)`
  - `isModelAllowedForOrg(settings, modelId)`
- [ ] **Chunk WS1-02 (60m):** Add unit tests for policy helpers
  - New test file under `tests/unit/ai/`
  - Cover legacy settings fallback + new multi-model settings
- [ ] **Chunk WS1-03 (60-90m):** Integrate `chat.ts` model resolution through `modelPolicy.ts`
  - Replace direct `settings.llm.model` usage in runtime path
- [ ] **Chunk WS1-04 (60m):** Enforce platform-enabled model validation in chat path
  - Use `platformModels.isModelEnabled`
  - Add graceful fallback to org default
- [ ] **Chunk WS1-05 (45-60m):** Add logging for model resolution decisions
  - Log selected/requested/default/fallback (without secrets)
- [ ] **Chunk WS1-06 (60-90m):** Align `agentExecution.ts` model selection with same policy module
  - Remove model selection drift between chat and agent

## WS2 Chunks: Pricing and Cost Integrity (Week 2)

- [ ] **Chunk WS2-01 (60m):** Add `convex/ai/modelPricing.ts` helper
  - Resolve prompt/completion costs from `aiModels`
- [ ] **Chunk WS2-02 (60-90m):** Replace static pricing map usage path in `openrouter.ts`
  - Keep safe fallback with explicit warning
- [ ] **Chunk WS2-03 (60m):** Add tests for missing-pricing fallback behavior
- [ ] **Chunk WS2-04 (60-90m):** Ensure chat cost tracking uses same pricing source
- [ ] **Chunk WS2-05 (60-90m):** Ensure agent session cost and credits align with same pricing source

## WS3 Chunks: Tool Contract Reliability (Week 3+)

- [ ] **Chunk WS3-01 (60m):** Add contract version metadata to top 10 critical tools
- [ ] **Chunk WS3-02 (90m):** Extend `scripts/test-model-validation.ts` with contract checks
- [ ] **Chunk WS3-03 (60m):** Add pass/fail gating rule doc in `docs/AI_MODEL_VALIDATION_STRATEGY.md`

## WS4 Chunks: Knowledge Pipeline Completion (Week 3+)

- [ ] **Chunk WS4-01 (60-90m):** Implement real KB retrieval in `agentExecution.ts` where TODO exists
- [ ] **Chunk WS4-02 (60m):** Add token-budget guardrail for injected KB context
- [ ] **Chunk WS4-03 (60m):** Add basic retrieval quality telemetry (doc count + bytes + source tags)

## WS5 Chunks: Observability and SLOs (Week 4+)

- [ ] **Chunk WS5-01 (60m):** Add query for model fallback rate
- [ ] **Chunk WS5-02 (60m):** Add query for tool success/failure ratio
- [ ] **Chunk WS5-03 (60m):** Add simple SLO doc + alert thresholds

## WS6 Chunks: Refactor and Security Hygiene (Ongoing)

- [ ] **Chunk WS6-01 (60m):** Break one AI monolith function into isolated helper module
- [ ] **Chunk WS6-02 (60m):** Add regression test for refactored path
- [ ] **Chunk WS6-03 (45m):** Update docs with changed architecture seam

---

## 9. Weekly Execution Cadence

Use this exact cadence to avoid overwhelm:

1. Pick 3 chunks for the week (not more).
2. Run them sequentially with tests after each.
3. Update this file checkboxes after each merged chunk.
4. End week with a 15-minute review:
   - What shipped
   - What regressed
   - What to defer

Rule: unfinished chunks roll forward; do not start new workstreams until current week’s top chunk is done.

---

## 10. Progress Tracker

- [ ] WS1 complete
- [ ] WS2 complete
- [ ] WS3 complete
- [ ] WS4 complete
- [ ] WS5 complete
- [ ] WS6 complete

---

## 11. Ownership Model

- **You:** Set priorities, approve tradeoffs, decide rollout order.
- **Codex:** Implement tasks end-to-end, run checks, and keep docs current.

If we keep tasks scoped and ship weekly, this plan is executable and will materially improve long-term durability.
