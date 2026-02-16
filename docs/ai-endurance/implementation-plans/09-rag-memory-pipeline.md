# 09 Implementation Plan: RAG and Organization Memory Pipeline

## Objective

Turn organization memory into a durable moat by adopting a practical five-layer memory architecture and wiring it into the live agent runtime with strict tenant safety, token budgets, and measurable quality.

Primary design input:
- `docs/agentic_system/MEMORY_ENGINE_DESIGN.md`

---

## Recommendation (Adopt with Modifications)

The five-layer construct is strong and should be adopted, but not copied 1:1.

Adopt:
- Layered memory hierarchy
- Operator pinned notes (high-value differentiator)
- Reactivation context
- Structured contact memory

Adjust:
- Use dynamic token budgets by selected model context length (not fixed 12K assumptions)
- Extract facts primarily from user messages + verified tool results (not assistant text alone)
- Integrate with current session summary lifecycle and existing schema fields
- Enforce RBAC and retention/compliance from day one

---

## Current state in this codebase

- Agent runtime has a TODO where org KB docs should be loaded:
  - `convex/ai/agentExecution.ts`
- Session and message storage already exists:
  - `convex/schemas/agentSessionSchemas.ts`
  - `convex/ai/agentSessions.ts`
- Session close summaries already exist, but not rolling summaries:
  - `agentSessions.summary`
  - `ai.agentSessions.generateSessionSummary`
- Organization media includes markdown document content:
  - `convex/schemas/coreSchemas.ts` (`organizationMedia.documentContent`, `tags`)
  - `convex/organizationMedia.ts`
- `organizationMedia.getKnowledgeBaseDocsInternal` is referenced in AI runtime but not exported yet.

---

## Five-Layer Mapping to Existing Architecture

## Layer 1: Recent context (verbatim)

Current fit:
- Already available via `agentSessionMessages` and `getSessionMessages`.

Required work:
- Add adaptive message limit by token budget.
- Prevent oversized single-message blowups with truncation policy.

## Layer 2: Session summary (compression)

Current fit:
- Existing close-time summary support in `agentSessions.summary`.

Required work:
- Add rolling summary fields (for active sessions), e.g.:
  - `rollingSummaryText`
  - `rollingSummaryAt`
  - `messagesSinceRollingSummary`
- Trigger rolling summary every N messages or idle interval.

## Layer 3: Operator pinned notes (human strategy)

Current fit:
- Not implemented.

Required work:
- Add new table (recommended in `aiSchemas`): `operatorNotes`.
- Add RBAC permissions:
  - `operator_notes.view`
  - `operator_notes.create`
  - `operator_notes.edit`
  - `operator_notes.delete`
- Load both session-level and contact-level notes into memory context builder.

## Layer 4: Contact profile memory (structured facts)

Current fit:
- Can live in `crm_contact.customProperties` (ontology model already flexible).

Required work:
- Define typed memory object contract for contact profile.
- Add extraction pipeline and merge strategy with dedupe/conflict rules.
- Write extraction metadata fields for traceability (`lastExtractedAt`, `extractionVersion`).

## Layer 5: Reactivation context (cold return)

Current fit:
- No explicit reactivation memory fields currently.

Required work:
- Add session-level reactivation fields:
  - `isReactivation`
  - `reactivationContext`
  - `reactivationGeneratedAt`
  - `daysSinceLastMessage`
- Detect inactivity threshold and generate short context before first response after return.

---

## Runtime Composition Order

Introduce shared memory composer module (new):
- Suggested file: `convex/ai/memoryComposer.ts`

Composer order:
1. Layer 3 (operator notes) - highest priority
2. Layer 1 (recent verbatim context)
3. Layer 4 (contact structured memory)
4. Layer 2 (rolling summary)
5. Layer 5 (reactivation context, only if triggered)
6. KB/RAG chunks from org docs (query intent scoped)

Budget strategy:
- Compute memory budget as percentage of model context length (from `aiModels.contextLength`), with hard caps.
- Example start point:
  - 25-35% memory budget
  - 65-75% reserved for prompt/tool I/O and response.

---

## Implementation chunks

1. **KB Retrieval Wiring (immediate blocker)**
- Export `getKnowledgeBaseDocsInternal` in `convex/organizationMedia.ts` (internal query).
- Wire retrieval into `convex/ai/agentExecution.ts` replacing TODO path.

2. **Memory Composer Foundation**
- Add `convex/ai/memoryComposer.ts` with deterministic layer ordering.
- Integrate composer into `agentExecution.ts` prompt-building flow.

3. **Operator Notes**
- Add `operatorNotes` schema and CRUD mutations/queries.
- Add RBAC permission checks.
- Add context formatting and priority sorting.

4. **Rolling Session Summary**
- Add rolling summary fields to `agentSessions`.
- Trigger summary generation every N messages and on idle threshold.

5. **Structured Contact Memory**
- Add typed extraction contract and merge strategy.
- Build extraction action and attach to post-response pipeline.

6. **Reactivation Memory**
- Add inactivity detection and reactivation context generation.
- Cache and inject on resumed conversations.

7. **Token + Safety Guardrails**
- Add per-layer token caps and max total memory budget.
- Add tenant/tag scoping enforcement checks for all retrieval queries.

8. **Telemetry**
- Add metrics per run:
  - layers included
  - tokens/bytes by layer
  - retrieval hit counts
  - extraction update count
  - reactivation trigger count

---

## Validation

- Integration tests with synthetic org docs and contacts.
- Multi-tenant isolation tests for all memory layers.
- Regression tests for session resume/rolling summary behavior.
- Load tests for context build latency.

Quality checks:
- Memory precision review set (manual sample)
- Hallucination reduction checks after adding structured memory
- Response coherence checks on long-running sessions

---

## Risks and mitigations

- **Noise from over-retrieval**
  - Mitigation: ranking + strict per-layer caps.
- **Incorrect fact extraction**
  - Mitigation: extract from user + tool evidence; confidence threshold; no blind overwrite.
- **PII/compliance drift**
  - Mitigation: retention policy and deletion hooks for all memory tables/fields.
- **Prompt bloat and latency**
  - Mitigation: lazy loading and cached summaries/contexts.

---

## Cross-plan dependencies

- Depends on `05-llm-policy-router.md` for model-aware budgeting.
- Feeds metrics into `11-observability-slos-and-release-gates.md`.
- Uses governance model from `12-human-approval-and-escalation.md` for operator note controls.
- Aligns with `01-knowledge-recipes-skills.md` for intent-scoped retrieval.

---

## Exit criteria

- TODO in `agentExecution.ts` removed with production retrieval path.
- Five memory layers implemented (at minimum: L1, L2, L3, L4; L5 behind feature flag is acceptable in first release).
- Memory budget guardrails and tenant safety checks are enforced.
- Observability shows memory layer usage and quality signals.
