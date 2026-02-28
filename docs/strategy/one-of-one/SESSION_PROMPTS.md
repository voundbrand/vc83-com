# One of One — Session Prompts

Use one prompt per session. One chapter per session. Fresh context window each time.

---

## Pre-session contract (applies to ALL sessions)

```text
Before writing anything, read these three documents in this order:

1. docs/strategy/one-of-one/VOICE_BIBLE.md
2. docs/strategy/one-of-one/ICP_ANCHOR.md
3. The relevant chapter brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

These are your writing contracts. Do not deviate.

The North Star headline is: "Private AI. You can Trust."
Every chapter, every page, every email serves this line. If a sentence doesn't support it — cut it.

Rules that apply to every chapter:
- No exclamation marks. Not one.
- No "imagine" or "picture this."
- Every number has a source or qualifier.
- No jargon: no "capability packs," "soul-binding," "memory layers" (except Appendix A).
- The reader is a multi-millionaire business owner. They are your peer, not your student.
- Under 3,000 words. If it's longer, it's two chapters.
- First line is the sharpest idea in the chapter. No preamble.
- One Fisher question per chapter, placed in the middle third.

After writing, run the five-point validation:
1. Voice check — no anti-patterns from Voice Bible?
2. ICP check — would the reader in ICP Anchor lean in or stop reading?
3. Word count — within the brief's target?
4. Connection check — closing connects to the next chapter?
5. Number check — every claim has a specific figure with attribution?

Output the chapter as a markdown file to: docs/strategy/one-of-one/chapters/
Update TASK_QUEUE.md status after delivery.
```

---

## Implementation lanes (Q-R-S-T-U-V)

### Lane gating and concurrency rules

1. Lanes `Q` (audit backend) and `R` (landing app/design) may run in parallel.
2. Lane `S` is blocked until `OOO-052` and `OOO-058` are both `DONE`.
3. Lanes `T` (model gates) and `U` (runtime guardrails) are blocked until `OOO-060` is `DONE`, then may run in parallel.
4. Lane `V` is blocked until `OOO-063` and `OOO-066` are both `DONE`.
5. Keep one `IN_PROGRESS` task per lane at any time.
6. After each lane delivery, update `TASK_QUEUE.md`, `INDEX.md`, and `MASTER_PLAN.md` before marking `DONE`.
7. Validation contract:
   - Backend/runtime lanes: `npm run typecheck`, then relevant unit/integration tests.
   - Design lane: `npm run ui:design:guard`, then `npm run ui:principles:ci` at final gate.
   - Agent hardening lanes: `npm run model:gate:audit`, `npm run model:gate:enforce`, `npm run ai:usage:guard`, `npm run ai:economics:guard`, and `npm run tool-foundry:guard` as applicable.
   - Docs changes: `npm run docs:guard`.

## Session Q (Lane Q: Audit Mode Backend + PDF Deliverable)

Starts with `OOO-046` and progresses through `OOO-052`.

```text
You are implementing the backend for One of One audit mode.

Read first:
- docs/strategy/one-of-one/FUNNEL.md
- docs/strategy/one-of-one/TASK_QUEUE.md (OOO-046..OOO-052)
- convex/api/v1/webchatApi.ts
- convex/schemas/webchatSchemas.ts
- convex/onboarding/funnelEvents.ts
- convex/pdf/invoicePdf.ts
- convex/pdf/ticketPdf.ts
- convex/lib/generatePdf.ts
- convex/pdfTemplateRegistry.ts

Execution contract:
1) Build deterministic audit mode state (5-question flow) with explicit stage transitions and idempotency.
2) Do NOT fork a new PDF stack. Reuse the same API Template.io + Convex storage pipeline used by invoice/ticket generation.
3) Add an audit deliverable PDF template and generation action suitable for the "one workflow" output.
4) Preserve existing guest claim token + funnel telemetry behavior; extend it with audit lifecycle events.
5) Keep the flow value-first: workflow recommendation first, email capture second.
6) Add tests for state transitions, replay/idempotency, and PDF generation failure paths.

Output targets:
- Backend code and tests for OOO-046..OOO-052
- Updated queue statuses and notes in TASK_QUEUE.md
- Any architecture deltas reflected in MASTER_PLAN.md
```

---

## Session R (Lane R: Landing App + Design Implementation)

Starts with `OOO-053` and progresses through `OOO-058`.

```text
You are implementing the One of One landing application.

Read first:
- docs/strategy/one-of-one/FUNNEL.md
- docs/strategy/one-of-one/TASK_QUEUE.md (OOO-053..OOO-058)
- docs/strategy/one-of-one/VOICE_BIBLE.md
- src/hooks/use-ai-chat.ts
- scripts/ci/check-ui-design-drift.sh

Execution contract:
1) Scaffold a dedicated app at /apps/one-of-one-landing (clean boundary from main shell app).
2) Build the six-section funnel page where embedded audit chat is the primary CTA.
3) Integrate new heading font "Codec Pro" in the landing typography system.
4) Keep the page as context layer + chat surface (not chat-only).
5) Reuse existing chat backend/session/claim pipeline; do not duplicate backend business logic.
6) Add conversion and attribution instrumentation aligned with onboarding funnel events.
7) Respect anti-funnel constraints: no urgency gimmicks, no scarcity mechanics, no bait-and-switch.

Validation:
- Run npm run ui:design:guard on visual changes.
- Run npm run typecheck for integration code.
- At lane completion, run npm run ui:principles:ci.

Output targets:
- Landing app implementation for OOO-053..OOO-058
- Updated queue statuses and notes in TASK_QUEUE.md
- Integration assumptions documented in MASTER_PLAN.md
```

---

## Session S (Lane S: Integration Rehearsal + Launch Packet)

Starts with `OOO-059` and progresses through `OOO-060`.

```text
You are validating launch readiness for One of One audit mode and landing app integration.

Read first:
- docs/strategy/one-of-one/TASK_QUEUE.md (OOO-059..OOO-060)
- docs/strategy/one-of-one/MASTER_PLAN.md
- tests/e2e/onboarding-audit-handoff.spec.ts
- apps/one-of-one-landing/app/page.tsx
- convex/api/v1/webchatApi.ts

Execution contract:
1) Rehearse the full user path: cold landing visit -> audit chat progression -> deliverable path -> signup handoff -> context-preserved chat.
2) Confirm continuity invariants (`sessionToken`, `claimToken`, `identityClaimToken`) across handoff surfaces.
3) Validate observability coverage for each handoff stage and identify missing rollback triggers.
4) Build the launch packet with owner matrix, rollback steps, kill-switch trigger, and success thresholds.

Validation:
- Run npm run test:e2e:desktop for rehearsal.
- Run npm run docs:guard for launch packet docs updates.

Output targets:
- Rehearsal evidence and launch packet updates for OOO-059..OOO-060
- Updated queue statuses and notes in TASK_QUEUE.md
- Final launch assumptions documented in MASTER_PLAN.md and INDEX.md
```

---

## Session T (Lane T: Model Release Gates + Eval Baselines)

Starts with `OOO-061` and progresses through `OOO-063`.

```text
You are hardening model release gates before production agent expansion.

Read first:
- docs/strategy/one-of-one/TASK_QUEUE.md (OOO-061..OOO-063)
- convex/ai/modelReleaseGateAudit.ts
- convex/ai/modelEnablementGates.ts
- scripts/ci/model-release-gate-audit.ts
- .github/workflows/model-release-gate.yml
- docs/reference_docs/api/ai-model-release-gate-operations.md

Execution contract:
1) Establish an audit-mode baseline report with deterministic blocking reasons for currently enabled models.
2) Confirm operational-review requirements and conformance thresholds are explicitly documented.
3) Wire enforce-mode behavior into CI only after baseline review criteria and escalation path are codified.
4) Ensure runtime model selection paths honor the same hard-gate rules as CI.

Validation:
- Run npm run model:gate:audit while baseline tuning.
- Run npm run model:gate:enforce when hardening is complete.
- Run npm run docs:guard after workflow/runbook edits.

Output targets:
- Gate policy + CI/runtime alignment for OOO-061..OOO-063
- Updated queue statuses and notes in TASK_QUEUE.md
- Operational runbook deltas captured in MASTER_PLAN.md
```

---

## Session U (Lane U: Runtime Governors + Side-effect Safety)

Starts with `OOO-064` and progresses through `OOO-066`.

```text
You are implementing runtime control boundaries for agent execution.

Read first:
- docs/strategy/one-of-one/TASK_QUEUE.md (OOO-064..OOO-066)
- convex/ai/sessionPolicy.ts
- convex/ai/autonomy.ts
- convex/ai/agentTurnOrchestration.ts
- convex/ai/agentApprovals.ts
- convex/ai/tools/registry.ts
- convex/ai/tools/contracts.ts

Execution contract:
1) Define and enforce deterministic governor limits (`max_steps`, `max_time_ms`, `max_tokens`, `max_cost_usd`, `retry_budget`) at turn runtime boundaries.
2) Keep mutating actions behind explicit approval policies; read-only actions remain fast-path.
3) Add/standardize `dry_run` behavior for mutating tools so operator review sees effect preview before execution.
4) Keep the contract typed and testable; avoid loose JSON parsing or implicit fallback behavior.

Validation:
- Run npm run typecheck for contract/runtime edits.
- Run npm run test:unit for approval + tool contract coverage.

Output targets:
- Runtime governor and tool-safety controls for OOO-064..OOO-066
- Updated queue statuses and notes in TASK_QUEUE.md
- Risk/mitigation deltas reflected in MASTER_PLAN.md
```

---

## Session V (Lane V: Observability + Progressive Rollout)

Starts with `OOO-067` and progresses through `OOO-070`.

```text
You are operationalizing production rollout controls for the agent runtime.

Read first:
- docs/strategy/one-of-one/TASK_QUEUE.md (OOO-067..OOO-070)
- convex/ai/trustEvents.ts
- convex/ai/trustTelemetry.ts
- convex/terminal/terminalFeed.ts
- convex/ai/platformAlerts.ts
- convex/ai/platformModelManagement.ts

Execution contract:
1) Add correlation IDs and guardrail outcomes to telemetry so every risky turn is traceable end-to-end.
2) Define dashboard and alert thresholds tied to actionable runbook steps.
3) Implement progressive rollout controls (shadow -> 5% canary -> full) with explicit automatic rollback criteria.
4) Finalize production-readiness packet with owner/on-call matrix and rollback rehearsal evidence.

Validation:
- Run npm run ai:economics:guard after telemetry/usage-contract changes.
- Run npm run test:integration for rollout and release-gate behavior changes.
- Run npm run docs:guard for runbook/plan updates.

Output targets:
- Observability + rollout controls for OOO-067..OOO-070
- Updated queue statuses and notes in TASK_QUEUE.md
- Final readiness documentation synchronized across INDEX.md and MASTER_PLAN.md
```

---

## Session A (Lane A: Chapter 1 — Twenty-One Things)

```text
You are writing Chapter 1 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 1 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Source material:
- docs/strategy/cash-is-king/00-front-matter/03-twenty-things-that-disappear.md

Scope: OOO-001, OOO-002

Rules:
1) Rewrite all 21 scenarios. Strip every agent name and number. The resolution is always "handled" — the reader never sees what's behind the curtain.
2) Each scenario: problem in 2-3 sentences, cost in one sentence, resolution in one sentence.
3) After every fifth scenario, add a single italicized running tally of cumulative annual cost.
4) Do not mention AI, operators, or technology anywhere in this chapter. Pure problem.
5) Open with the sharpest scenario — the one that will make the reader feel caught.
6) Close with one Ogilvy sentence that reframes everything.
7) Word target: 2,500–3,000.
8) After writing, run the five-point validation. If voice drift is detected, rewrite before marking DONE.

Output: docs/strategy/one-of-one/chapters/01-twenty-one-things.md
```

---

## Session B (Lane B: Chapter 2 — Most Expensive Person)

Starts only after OOO-002 is `DONE`.

```text
You are writing Chapter 2 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 2 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Reference (for case study data, not for voice):
- docs/strategy/cash-is-king/01-the-six-core-specialists/01-the-closer.md (Marcus data)
- docs/strategy/cash-is-king/01-the-six-core-specialists/02-the-strategist.md (Rachel data)

Scope: OOO-003, OOO-004

Rules:
1) Open with the cost-per-hour calculation. €5M revenue ÷ 60-hour weeks = ~€1,600/hour. Then ask how many of those hours go to sub-judgment work.
2) This is NOT a delegation lecture. The reader delegates well. The problem is the ceiling — things that can't transfer because they live in context and judgment.
3) Name the 30% context transfer ceiling with human hires. Draw from Marcus (still reviewed every quote) and Rachel (still briefed every client personally).
4) Fisher moment: honor what they've built. The bottleneck exists because they're the only one who sees the full picture.
5) Hormozi moment: the arithmetic of recovered hours at their effective rate. Let the number sit.
6) Do NOT offer the solution. End with tension unresolved.
7) Word target: 2,000–2,500.

Output: docs/strategy/one-of-one/chapters/02-most-expensive-person.md
```

---

## Session C (Lane C: Chapter 3 — The Wrong Bet)

Starts only after OOO-004 is `DONE`.

```text
You are writing Chapter 3 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 3 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Scope: OOO-005, OOO-006

Rules:
1) State the industry's model fairly first. Respect the logic. Then break it with coordination cost math.
2) The 15-min-per-tool model: 5 tools = 75 min/day. 10 tools = 2.5 hrs/day. A full-time job producing nothing.
3) Do NOT attack specific companies or products. Attack the model.
4) Introduce "deeper, not wider" in two paragraphs maximum at the end. Don't oversell. Name it and move on.
5) The reader should arrive at the alternative through the math, not through persuasion.
6) Word target: 2,000–2,500.

Output: docs/strategy/one-of-one/chapters/03-the-wrong-bet.md
```

---

## Session D (Lane D: Chapter 4 — One Operator)

Starts only after OOO-006 is `DONE`.

```text
You are writing Chapter 4 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 4 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Source material:
- docs/strategy/cash-is-king/03-the-soul-binding-difference/01-soul-binding.md (Karl's story, soul-binding concept)

Scope: OOO-007, OOO-008

Rules:
1) Open with Karl. No introduction. "Karl runs a plumbing company in Munich."
2) Three layers: Identity, Connection, Compounding. Each illustrated through Karl's specific experience.
3) Karl's €28K managed autonomously — state it, don't explain it. The reader does the ROI math.
4) Sovereignty guarantee in one paragraph. Plain language. Not a feature pitch.
5) Do NOT use the word "soul-binding." Do NOT name specialist capabilities. Outcomes only.
6) The chapter must provoke "but how do I stay in control?" — if the close doesn't create that tension, rewrite.
7) Word target: 2,800–3,000.

Output: docs/strategy/one-of-one/chapters/04-one-operator.md
```

---

## Session E (Lane E: Chapter 5 — Control)

Starts only after OOO-008 is `DONE`.

```text
You are writing Chapter 5 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 5 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Source material:
- docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/MASTER_PLAN.md (permission ladder: suggest, ask, delegated_auto, full_auto)

Scope: OOO-009, OOO-010

Rules:
1) Open by naming the reader's thought: "What if it does something I wouldn't do?"
2) Four levels. Clean. Each in one paragraph with a concrete example.
3) This is Fisher's chapter. Calm, clear, no pressure. The reader is given controls and trusted.
4) The unspoken insight: this is tighter control than they have over human employees. Let the reader discover this — do not state it.
5) Do NOT push toward Level 4. The book respects staying at Level 1 forever.
6) Word target: 1,800–2,200.

Output: docs/strategy/one-of-one/chapters/05-how-you-stay-in-control.md
```

---

## Session F (Lane F: Chapter 6 — First Seven Days)

Starts after OOO-010 is `DONE`. Parallel eligible with G and H.

```text
You are writing Chapter 6 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 6 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Scope: OOO-011, OOO-012

Rules:
1) Day 1 opens the chapter. No preamble.
2) Seven days narrated. 2-4 sentences per day. Progression from conversation → connection → suggestions → shift.
3) Suggestions on days 4-5 must be specific: three unfollowed quotes, a scheduling problem, a client going quiet. Not generic.
4) Close with the composite quote: "It's not doing things I can't do. It's doing things I don't have time to do — the way I would."
5) This is the product in use. Ogilvy's Rolls-Royce principle.
6) Word target: 1,800–2,200.

Output: docs/strategy/one-of-one/chapters/06-the-first-seven-days.md
```

---

## Session G (Lane G: Chapter 7 — Four Owners)

Starts after OOO-010 is `DONE`. Parallel eligible with F and H.

```text
You are writing Chapter 7 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 7 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Source material:
- docs/strategy/cash-is-king/01-the-six-core-specialists/01-the-closer.md (Marcus)
- docs/strategy/cash-is-king/01-the-six-core-specialists/02-the-strategist.md (Rachel)
- docs/strategy/cash-is-king/01-the-six-core-specialists/03-the-copywriter.md (Jess)
- docs/strategy/cash-is-king/02-industry-agents/07-ecommerce-retail/agents.md (Lena)

Scope: OOO-013, OOO-014

Rules:
1) Open with Marcus. No introduction. Name. Industry. City. Revenue. Before metrics. After metrics.
2) Each case study: same five-part format per the brief. Strict.
3) The differentiator in each story is what the operator learned about THIS owner specifically — not generic capabilities.
4) Numbers first, narrative second. The reader calculates ROI before finishing the paragraph.
5) Close: "Four businesses. Four different industries. Same architecture: one operator, built on the owner."
6) Do NOT generalize. Every claim attributed to a specific owner, city, revenue number.
7) Word target: 2,200–2,800.

Output: docs/strategy/one-of-one/chapters/07-four-owners.md
```

---

## Session H (Lane H: Chapter 8 — Displacement Equation)

Starts after OOO-010 is `DONE`. Parallel eligible with F and G.

```text
You are writing Chapter 8 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 8 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Reference:
- docs/strategy/cash-is-king/01_PRICING_LADDER.md
- docs/strategy/cash-is-king/03_GRAND_SLAM_OFFER.md

Scope: OOO-015, OOO-016

Rules:
1) Open with a question: "What does your business actually spend on making sure the right hand knows what the left hand is doing?"
2) Walk through the coordination stack: agency, VA, CRM, bookkeeper, consultant. Each with cost range and limitation.
3) Total: €12K–€45K/month direct + 15-25 hrs/week of owner time.
4) The operator eliminates the coordination tax, not every tool and hire.
5) This is Hormozi's chapter. Pure P&L. The reader should be able to open their books alongside it.
6) Word target: 2,200–2,800.

Output: docs/strategy/one-of-one/chapters/08-the-displacement-equation.md
```

---

## Session I (Lane I: Chapter 9 — Month Twelve)

Starts after OOO-012, OOO-014, and OOO-016 are all `DONE`.

```text
You are writing Chapter 9 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 9 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Scope: OOO-017, OOO-018

Rules:
1) "Monday morning. You open your phone." — this is the opening line.
2) One narrated morning. Not a feature list. An experience.
3) No new concepts. No new arguments. Pure payoff from everything before.
4) This is the Rolls-Royce ad. Describe the drive, not the engine.
5) Close: "You drive to work thinking about strategy. Not logistics."
6) Fisher: no hype. Just a Monday, described calmly.
7) Word target: 1,500–2,000.

Output: docs/strategy/one-of-one/chapters/09-month-twelve.md
```

---

## Session J (Lane J: Chapter 10 — One Conversation)

Starts after OOO-018 is `DONE`.

```text
You are writing Chapter 10 of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Chapter 10 brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Scope: OOO-019, OOO-020

Rules:
1) "No quiz. No assessment." — open by removing everything the reader expects.
2) One conversation. Fifteen minutes. 48-hour first briefing. Monthly. No contracts.
3) Close: "We've never had an owner walk after the first briefing. That's not confidence. That's data."
4) Zero urgency. Zero scarcity. Zero "limited spots." This reader smells that from a mile away.
5) Shortest chapter in the book. Every word earns its place.
6) Word target: 1,000–1,500.

Output: docs/strategy/one-of-one/chapters/10-one-conversation.md
```

---

## Session K (Lane K: Appendix A — Under the Hood)

Starts after OOO-010 is `DONE`.

```text
You are writing Appendix A of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- Appendix A brief in docs/strategy/one-of-one/CHAPTER_BRIEFS.md

Source material:
- docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/MASTER_PLAN.md
- docs/strategy/cash-is-king/01-the-six-core-specialists/00-overview.md
- docs/strategy/cash-is-king/03-the-soul-binding-difference/01-soul-binding.md

Scope: OOO-021, OOO-022

Rules:
1) This is the ONLY place where technical vocabulary appears: soul-binding, capability packs, memory layers, specialist routing.
2) Written for the reader who built their business by understanding how things work.
3) Precise, not jargon-heavy. Ogilvy-clean language, higher technical density.
4) Cover: specialist capability layer, five-tier memory, permission mechanics, privacy architecture.
5) Word target: 2,000–3,000.

Output: docs/strategy/one-of-one/chapters/appendix-a-under-the-hood.md
```

---

## Session L (Lane L: Appendix B — Financial Models)

Starts after OOO-002 is `DONE`.

```text
You are writing Appendix B of "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- docs/strategy/one-of-one/chapters/01-twenty-one-things.md (the delivered Chapter 1)

Source material:
- docs/strategy/cash-is-king/00-front-matter/03-twenty-things-that-disappear.md

Scope: OOO-023, OOO-024

Rules:
1) Each of the 21 scenarios from Chapter 1, expanded with: annual cost of the problem, cost of the solution, payback period, 12-month ROI.
2) This is for the reader who makes decisions with a spreadsheet open.
3) Numbers must be consistent with Chapter 1.
4) Word target: 4,000–6,000.

Output: docs/strategy/one-of-one/chapters/appendix-b-financial-models.md
```

---

## Session M (Lane M: Front Matter — Opening Letter)

Starts after OOO-020 is `DONE`. Written last.

```text
You are writing the Opening Letter for "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md

Also read the delivered Chapters 1, 4, 9, and 10 for tone calibration:
- docs/strategy/one-of-one/chapters/01-twenty-one-things.md
- docs/strategy/one-of-one/chapters/04-one-operator.md
- docs/strategy/one-of-one/chapters/09-month-twelve.md
- docs/strategy/one-of-one/chapters/10-one-conversation.md

Scope: OOO-025, OOO-026

Rules:
1) Written last so the tone matches the finished book.
2) Short. 500-800 words. A letter to the reader, not a corporate introduction.
3) Acknowledges what they've built. Does not teach. Does not hype.
4) Sets the contract for the book: "This book is arithmetic. You'll do the math. We'll stay out of the way."
5) All three voices present but restrained. Ogilvy's elegance, Hormozi's directness, Fisher's warmth.

Output: docs/strategy/one-of-one/chapters/00-opening-letter.md
```

---

# FUNNEL SESSIONS

These run in parallel with book chapters after Phase 2 (OOO-010) is complete.

---

## Session N (Lane N: Landing Page Copy)

Starts after OOO-010 is `DONE`. Parallel eligible with book Phase 3+.

```text
You are writing the landing page copy for "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- docs/strategy/one-of-one/FUNNEL.md (the full funnel architecture)

Scope: OOO-030, OOO-031, OOO-032, OOO-033

This is a single-page website for multi-millionaire business owners. They will spend 60 seconds deciding if it's worth their time. Every scroll must earn the next scroll.

The headline is locked: "Private AI. You can Trust." — this is the first thing on the page. Everything below serves it.

Rules:
1) Load Voice Bible first. This page follows the same voice rules as the book. Ogilvy headlines, Hormozi numbers, Fisher respect.
2) Headline: "Private AI. You can Trust." Subhead: "One operator. Yours alone. Built on everything you know." Action line: "Talk to it. Right now. On this page."
3) Six sections per FUNNEL.md: Hook, Problem, Shift, Embedded Chat placeholder, Proof, Paths.
4) Below-the-fold: "Why not a discovery call?", "Why one operator?", App downloads.
5) The embedded chat is the centerpiece. Everything leads to it or supports what it delivered. Write the chat header/subtext but NOT the chat flow itself (that's Session O).
6) Three pricing cards: Free (app download), Done With You (€2,500), Full Build (€5,000+). No "most popular" badges. No urgency.
7) Remington's personal line appears ONCE, at the bottom: "I'm not an AI consultant. I'm a technologist who builds private AI. Not a deck. The thing."
8) Zero pop-ups, countdown timers, "limited spots," or manufactured scarcity.
9) Every number on the page must match book numbers exactly: Marcus 22%→41%, Rachel 1.2%→3.8%, Jess 1.12x→4.46x, Lena 4.2%→11.8%.
10) Total page copy target: 1,200–1,800 words (excluding chat and app sections).

After writing, validate:
- Voice Bible anti-pattern check (zero hype words, zero exclamation marks)
- ICP check: would this reader scroll past the first screen? If yes, rewrite the hook.
- Number consistency with book chapters.

Output: docs/strategy/one-of-one/funnel/landing-page.md
```

---

## Session O (Lane O: Operator Audit Chat Flow)

Starts after OOO-010 is `DONE`. Parallel eligible with Lane N.

```text
You are designing the embedded operator audit chat flow for the "One of One" landing page.

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- docs/strategy/one-of-one/FUNNEL.md (chat widget spec section)

Scope: OOO-034, OOO-035, OOO-036, OOO-037

You are writing the conversational script and branching logic for the operator chat widget that runs on the landing page. This IS the lead magnet, the demo, and the proof — all in one.

Rules:
1) Five questions, asked conversationally — not as a form. The operator sounds like a sharp chief of staff in their first meeting with a new CEO. Curious, direct, zero fluff.
2) Questions per FUNNEL.md: (a) business type + revenue, (b) team size, (c) typical Monday morning, (d) one thing nobody handles the way they would, (e) what they'd do with 10 reclaimed hours.
3) After the five questions, deliver ONE specific workflow recommendation. Specific enough to execute alone. Name the workflow, the trigger, the steps, the expected time savings. This is the give-away.
4) Email capture happens AFTER the workflow delivery: "I'll send you this in a clean format. What's the best email?" Not before. Value first, always.
5) Transition to the offer: "You just spent seven minutes with an operator that doesn't know you yet. Imagine six months." Then surface the three paths.
6) Write three branching variants for the workflow delivery based on revenue tier: <€2M, €2M–€10M, €10M+. Different workflows, different language, same structure.
7) The operator must NOT: push for a sale, say "I'm just an AI," ask for email before delivering value, or rush.
8) Write the audit deliverable template — the clean email format they receive with their workflow. One page. Specific. "It's yours whether you work with us or not."

After writing, validate:
- Read each flow path aloud. Does it sound like a conversation or a survey? If survey, rewrite.
- ICP check: would a €5M business owner engage for seven minutes? If not, sharpen the questions.

Output:
- docs/strategy/one-of-one/funnel/audit-chat-flow.md
- docs/strategy/one-of-one/funnel/audit-deliverable-template.md
```

---

## Session P (Lane P: Nurture Email Sequence)

Starts after OOO-035 is `DONE` (needs the audit deliverable template).

```text
You are writing the five-email nurture sequence for "One of One."

Read first:
- docs/strategy/one-of-one/VOICE_BIBLE.md
- docs/strategy/one-of-one/ICP_ANCHOR.md
- docs/strategy/one-of-one/FUNNEL.md (nurture section)
- docs/strategy/one-of-one/funnel/audit-deliverable-template.md (the delivered template)

Scope: OOO-038 through OOO-043

Five emails. That's it. Not a 47-email drip. Quality over frequency.

Rules:
1) Each email stands alone. No "as we discussed" or "you may remember." Every email works if the reader never saw any other.
2) Email 1 (Day 0): Their workflow from the audit, formatted clean. Closing line: "It's yours whether you work with us or not." No CTA beyond "reply if you have questions."
3) Email 2 (Day 3): One case study. Closest match to their industry from the audit. Marcus, Rachel, Jess, or Lena. Numbers first. Three paragraphs max.
4) Email 3 (Day 7): "Your operator would have handled [X] this week." Personalized template based on their audit answers. Shows the cost of another week without it. Not guilt — arithmetic.
5) Email 4 (Day 14): Chapter 1 of the book as PDF. No pitch in the email. Just: "Thought you'd find this useful. Twenty-one things that cost business owners money every week." Two sentences.
6) Email 5 (Day 30): Only for free-tier app downloaders. "Your operator has been learning your business for a month. Fifteen minutes — I'll show you what it found." Not a discovery call. A show-and-tell.
7) Subject lines: short, specific, no clickbait. Fisher tone. Examples: "Your workflow from Tuesday" / "Rachel's consulting firm — the numbers" / "What this week cost you" / "21 things" / "What your operator found"
8) Zero "just checking in" energy. Zero "hope you're well." Every email delivers something or it doesn't get sent.
9) From: Remington. Personal voice. Not "The One of One Team."

After writing, validate:
- Read each email in isolation. Does it provide value without context from any other email?
- Voice Bible check: any drift toward corporate email voice = rewrite.
- ICP check: would this reader open email 3? If not, fix the subject line.

Output: docs/strategy/one-of-one/funnel/nurture-emails.md
```
