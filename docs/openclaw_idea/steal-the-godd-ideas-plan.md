# Steal the Good Ideas: OpenProse Patterns for L4YERCAK3

## Context

After completing Phase 2.5 Steps 2-6 (message attribution, team tools, PM awareness, onboarding completion, session model), we're stabilizing before Phase 3. The OpenProse framework and OpenClaw reference implementation contain production-tested orchestration patterns that map directly onto gaps in our current agent runtime. This plan integrates those patterns incrementally without disrupting existing functionality.

**User choices:**
- Runtime first, then builder UI later
- Parallel specialist fan-out is HIGH PRIORITY
- Stabilizing Phase 2.5 (not starting Phase 3 yet)
- Hybrid storage: structured Convex objects + human-readable prose representation

---

## Phase A: Parallel Specialist Fan-Out (HIGH PRIORITY)

**Problem:** `tag_in_specialist` fires one specialist async. PM can't fan out to booking + support simultaneously, and there's no synthesis after specialists respond.

**Stolen from:** OpenProse `parallel:` blocks with join strategies + Captain's Chair synthesis pattern.

### A1. Refactor agentExecution.ts (prerequisite)

The file is 925 lines (over 500 limit). Split into 3 files:

| New File | Contents | Est. Lines |
|----------|----------|-----------|
| `convex/ai/agentPromptBuilder.ts` | `buildAgentSystemPrompt()`, `buildSoulPromptBlock()`, `filterToolsForAgent()`, `checkNeedsApproval()` | ~300 |
| `convex/ai/agentCostCalculator.ts` | `calculateCost()`, `parseExtractionResults()`, cost constants | ~80 |
| `convex/ai/agentExecution.ts` | `processInboundMessage()`, `generateAgentResponse()`, types/imports | ~450 |

### A2. New schema: `agentFanOutExecutions`

File: `convex/schemas/agentFanOutSchemas.ts` (~80 lines)

```
agentFanOutExecutions:
  organizationId       Id<"organizations">
  sessionId            Id<"agentSessions">
  initiatorAgentId     Id<"objects">           # PM that started fan-out
  status               "pending" | "in_progress" | "completed" | "failed" | "timed_out"
  joinStrategy         "all" | "first" | "quorum"
  quorumCount?         number
  specialists          array of:
    agentId            Id<"objects">
    agentName          string
    subtype            string
    contextNote        string
    status             "pending" | "running" | "completed" | "failed" | "timed_out"
    startedAt?         number
    completedAt?       number
    responseMessageId? Id<"agentSessionMessages">
  synthesisConfig?     { enabled: boolean, synthesisPrompt?: string }
  synthesisStatus?     "pending" | "running" | "completed" | "skipped"
  synthesisMessageId?  Id<"agentSessionMessages">
  startedAt            number
  completedAt?         number
  timeoutMs            number (default 60000)

  INDEX by_session [sessionId]
  INDEX by_org_status [organizationId, status]
  INDEX by_status_started [status, startedAt]
```

Add to `convex/schema.ts`. Add optional `activeFanOutId` field to `agentSessions`.

### A3. Fan-out orchestration module

File: `convex/ai/fanOut.ts` (~350 lines)

Functions:
- `createFanOut` (internalMutation) - Create execution record, schedule specialists
- `reportSpecialistCompletion` (internalMutation) - Update specialist status, check join condition, trigger synthesis if met
- `checkFanOutTimeout` (internalAction) - Scheduled after timeoutMs, marks timed-out specialists, proceeds with partial results
- `generateSynthesis` (internalAction) - Loads specialist responses, calls LLM as PM, saves synthesis message, sends via channel

Convex mutations are serializable, so two specialists completing simultaneously won't race.

### A4. New tool: `fan_out_specialists`

File: `convex/ai/tools/fanOutTools.ts` (~200 lines)

```
fan_out_specialists:
  specialists: [{ specialistType, contextNote }]
  joinStrategy: "all" | "first" (default "all")
  synthesize: boolean (default true)
  synthesisHint?: string
```

Execution: validate specialists exist -> create fanOut record -> schedule each `generateAgentResponse` with `fanOutExecutionId` -> schedule timeout checker -> return confirmation.

### A5. Modify `generateAgentResponse`

Add optional `fanOutExecutionId` arg. After saving response message, call `reportSpecialistCompletion` if part of a fan-out.

### A6. Register tool + update harness

- Add `fan_out_specialists` to `TOOL_REGISTRY` in `registry.ts`
- Update `harness.ts` team section: "Use `fan_out_specialists` when the question involves multiple areas"

### A Testing

1. Existing `tag_in_specialist` still works (regression)
2. Two-specialist fan-out: both respond, synthesis fires
3. Timeout: one specialist never completes, synthesis uses partial results
4. First-wins: first responder triggers immediate synthesis
5. Credit accounting: PM + each specialist + synthesis all deduct credits

### A Execution Order

```
A1 (refactor) ──────────────────────┐
A2 (schema) ────────────────────────┤
                                    ▼
A3 (fanOut.ts) ← A2 ───────────────┤
A4 (fanOutTools.ts) ← A2 ──────────┤
                                    ▼
A5 (modify generateAgentResponse) ← A1, A3
A6 (register + harness) ← A4
Test ← A5, A6
```

---

## Phase B: Playbook/Workflow Definitions (MEDIUM PRIORITY)

**Problem:** Agents have no structured multi-step workflows. Each message is handled ad-hoc.

**Stolen from:** OpenProse `block` definitions, OpenClaw PR workflow's structured phase-to-phase handoffs.

### B1. Playbook as ontology object

File: `convex/playbookOntology.ts` (~200 lines)

Store in `objects` table as `type: "workflow_playbook"`:

```
customProperties:
  steps: [{
    stepId, name, description,
    assignedAgentSubtype?,       # Which specialist (null = PM handles)
    instructions,                # What the agent does at this step
    requiredInputs: string[],    # Fields from prior steps
    outputs: string[],           # Fields this step produces
    completionCondition,         # Natural language condition
    nextStepId?,
    conditionalNextSteps: [{ condition, nextStepId }]
  }]
  proseDescription: string       # Human-readable version (hybrid storage)
  triggerConditions: string[]    # When to activate
  version: number
```

Link to agents via `objectLinks` (`uses_playbook` link type).

CRUD: `createPlaybook`, `updatePlaybook`, `listPlaybooks`, `assignPlaybookToAgent`.

### B2. Playbook runtime

File: `convex/ai/playbookRunner.ts` (~350 lines)

- `getActivePlaybooksForAgent(agentId)` - Query linked playbooks
- `buildPlaybookPromptContext(playbooks)` - Convert to system prompt instructions
- `evaluatePlaybookTrigger(message, playbooks)` - Match inbound message to playbook

### B3. Pipeline integration

In `agentExecution.ts`, after loading agent config, before building system prompt:
- Load active playbooks via `getActivePlaybooksForAgent`
- Pass to `buildAgentSystemPrompt` which calls `buildPlaybookPromptContext`

### B4. Seed default playbooks

3 templates created during org bootstrap (status: "draft"):
1. **Lead Qualification**: greet -> qualifying questions -> score -> route
2. **Appointment Booking**: check availability -> propose times -> confirm -> reminder
3. **Support Escalation**: triage -> attempt resolution -> escalate

### B Testing

1. Create playbook, assign to agent, verify prompt includes instructions
2. Send message matching trigger condition, verify agent follows playbook
3. Playbook with specialist step: agent follows step, tags in specialist per assignment

---

## Phase C: Structured Handoffs / Workflow Bindings (MEDIUM PRIORITY)

**Problem:** Specialists get "PM tagged you because: [reason string]". No structured data between steps.

**Stolen from:** OpenProse's `let x = session` binding system, context passing, OpenClaw's `.local/review.json` contract pattern.

### C1. Binding tools

File: `convex/ai/tools/bindingTools.ts` (~150 lines)

Two tools:
- `write_handoff_binding` - Agent writes structured data (JSON fields) to ontology object (`type: "workflow_binding"`)
- `read_handoff_bindings` - Agent reads bindings from prior steps

### C2. Integrate with fan-out

Specialists write bindings instead of/in addition to message text. Synthesis reads structured bindings rather than parsing message content.

### C3. Integrate with playbooks

Playbook steps declare `requiredInputs` and `outputs`. Runner verifies previous step's binding contains required fields before allowing next step.

---

## Phase D: Groundwork for Phase 3 (LOWER PRIORITY)

### D1. Agent memory persistence

**Stolen from:** OpenProse's persistent agents with memory scoping.

New table: `agentMemories`
```
agentId, organizationId
scope: "session" | "org" | "global"
category: "finding" | "decision" | "pattern" | "preference" | "correction"
content: string (compacted, not raw)
confidence: number
createdAt, expiresAt?, lastAccessedAt, accessCount
```

New tool: `update_own_memory` - Agent saves learnings across conversations.
Integration: Top 10 org-scoped memories injected into system prompt after harness.

### D2. Iterative refinement mode (schema only)

Add `"iterative"` to `sessionMode` union. Add optional `iterationConfig`:
```
maxIterations, completionPrompt, refinementPrompt,
currentIteration, iterations: [{ number, content, score, feedback }]
```

Runtime implementation deferred to Phase 3.

---

## Files Summary

### New files (10)

| File | Phase | Lines |
|------|-------|-------|
| `convex/schemas/agentFanOutSchemas.ts` | A | ~80 |
| `convex/ai/agentPromptBuilder.ts` | A | ~300 |
| `convex/ai/agentCostCalculator.ts` | A | ~80 |
| `convex/ai/fanOut.ts` | A | ~350 |
| `convex/ai/tools/fanOutTools.ts` | A | ~200 |
| `convex/playbookOntology.ts` | B | ~200 |
| `convex/ai/playbookRunner.ts` | B | ~350 |
| `convex/ai/tools/bindingTools.ts` | C | ~150 |
| `convex/schemas/agentMemorySchemas.ts` | D | ~50 |
| `convex/ai/tools/memoryTools.ts` | D | ~120 |

### Modified files (5)

| File | Phase | Changes |
|------|-------|---------|
| `convex/schema.ts` | A, D | Import + register new tables |
| `convex/ai/agentExecution.ts` | A, B | Refactor to ~450 lines, add fanOutExecutionId, add playbook loading |
| `convex/ai/tools/registry.ts` | A, C, D | Import + register new tools (1-2 lines each) |
| `convex/ai/harness.ts` | A | Add fan-out instructions to team section |
| `convex/schemas/agentSessionSchemas.ts` | A, D | Add optional activeFanOutId, extend sessionMode union |

### Untouched files

- `convex/ai/interviewRunner.ts`
- `convex/ai/soulGenerator.ts`
- `convex/onboarding/*`
- `convex/channels/*`
- `convex/credits/index.ts`
- `convex/ai/tools/teamTools.ts` (tag_in_specialist remains as-is)

---

## Verification Plan

### Phase A verification
```bash
# 1. Build passes after refactor
npx convex dev  # Schema deploys, no errors

# 2. Existing flow works (regression)
# Send test message via Telegram -> agent responds
# PM tags single specialist -> specialist responds

# 3. Fan-out flow
# Send message touching multiple areas
# PM calls fan_out_specialists with 2 specialists
# Both specialists respond (check agentSessionMessages)
# Synthesis message appears (check fanOutExecution status = "completed")
# All messages delivered via channel

# 4. Timeout
# Create fan-out, one specialist never completes
# After 60s, timeout fires, synthesis uses partial results
```

### Phase B verification
```bash
# 1. Create playbook via Convex dashboard or mutation
# 2. Assign to agent
# 3. Send matching message -> agent follows playbook steps
# 4. Verify prompt includes playbook instructions (log system prompt)
```

### Phase C/D verification
```bash
# C: Fan-out with bindings -> synthesis reads structured data
# D: Agent calls update_own_memory -> memory appears in next conversation's prompt
```
