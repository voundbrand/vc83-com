# One of One — Task Queue

**Last updated:** 2026-02-27
**Execution model:** One chapter per session. Fresh context per session. Governing docs loaded first.

---

## Queue rules

1. Execute one chapter per session. Never two.
2. Every session begins by reading: `VOICE_BIBLE.md`, `ICP_ANCHOR.md`, and the relevant chapter brief in `CHAPTER_BRIEFS.md`.
3. Keep exactly one task `IN_PROGRESS` at a time.
4. After delivery, run the five-point validation in `INDEX.md` before marking `DONE`.
5. If voice drift is detected during validation, rewrite before marking `DONE`. Do not move to the next lane.
6. Update this file after each task completion.
7. Source material references point to `docs/strategy/cash-is-king/` for original data and `docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/` for positioning.

---

## Queue-first implementation contract (Audit mode + landing app + production hardening)

### Verification profiles

| Profile | Command | Use |
|----|----|----|
| `DOCS_CI` | `npm run docs:guard` | Any doc/queue/prompt/plan update |
| `BACKEND_FAST` | `npm run typecheck` | Convex schema/action/query changes |
| `BACKEND_TESTS` | `npm run test:unit` | Audit mode + PDF generation behavior changes |
| `DESIGN_GUARD` | `npm run ui:design:guard` | Landing/app visual implementation changes |
| `UI_PRINCIPLES` | `npm run ui:principles:ci` | Final landing visual regression gate |
| `MODEL_GATE_AUDIT` | `npm run model:gate:audit` | Non-blocking model release-gate health report |
| `MODEL_GATE_ENFORCE` | `npm run model:gate:enforce` | Blocking release gate for production model enablement |
| `AI_USAGE_GUARD` | `npm run ai:usage:guard` | Enforce metering wrappers for provider traffic |
| `AI_ECONOMICS_GUARD` | `npm run ai:economics:guard` | Verify platform usage accounting contract |
| `TOOL_FOUNDRY_GUARD` | `npm run tool-foundry:guard` | Ensure tool contract + queue docs stay synchronized |

### Execution lanes

| Lane | Focus | Concurrency rules | Entry gate | Exit gate |
|----|----|----|----|----|
| `Q` | Audit mode backend + deliverable generation | Can run in parallel with lane `R` if primary files do not overlap | `OOO-010` | `OOO-052` `DONE` |
| `R` | `/apps/one-of-one-landing` app + design implementation | Can run in parallel with lane `Q`; avoid shared-hook conflicts without explicit handoff | `OOO-010` | `OOO-058` `DONE` |
| `S` | Integration, rehearsal, launch readiness | Starts only after lanes `Q` and `R` complete | `OOO-052`, `OOO-058` | `OOO-060` `DONE` |
| `T` | Model eval + release-gate hardening | Starts after lane `S`; can run in parallel with lane `U` | `OOO-060` | `OOO-063` `DONE` |
| `U` | Runtime governors + side-effect safety controls | Starts after lane `S`; can run in parallel with lane `T` | `OOO-060` | `OOO-066` `DONE` |
| `V` | Observability + rollout/rollback operations | Starts only after lanes `T` and `U` complete | `OOO-063`, `OOO-066` | `OOO-070` `DONE` |

### Dependency-based status flow

1. Use only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. `PENDING`: task has unmet dependencies.
3. `READY`: dependencies are satisfied and task can start.
4. `IN_PROGRESS`: exactly one task per lane may be active.
5. `BLOCKED`: dependency met but external blocker prevents execution (credential, infra, approval).
6. `DONE`: task finished and listed `Verify` command passed.

### Deterministic execution queue (active implementation lanes)

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|----|----|----|----|----|----|----|----|----|----|
| OOO-046 | Q | Audit Mode Backend | High | `DONE` | OOO-010 | Define audit mode domain contract: five-question state machine, session metadata, and lifecycle events. | `convex/schemas/webchatSchemas.ts`, `convex/onboarding/funnelEvents.ts`, `convex/schema.ts` | `npm run typecheck` | Added `onboardingAuditSessions` schema, audit lifecycle event names, and deterministic audit event-key composition. |
| OOO-047 | Q | Audit Mode Backend | High | `DONE` | OOO-046 | Implement audit mode orchestration APIs (`start`, `answer`, `resume`, `complete`) for `webchat` and `native_guest`. | `convex/onboarding/auditMode.ts`, `convex/api/v1/webchatApi.ts`, `convex/onboarding/identityClaims.ts` | `npm run typecheck` | Added deterministic audit orchestration module, webchat/native_guest wrapper APIs, and claim-token linkage to audit sessions. |
| OOO-048 | Q | Audit Mode Backend | High | `DONE` | OOO-047 | Add audit deliverable PDF template (one-page workflow brief) to existing template registry. | `convex/lib/pdf_templates/audit_workflow_report.ts`, `convex/pdfTemplateRegistry.ts`, `convex/seedPdfTemplates.ts` | `npm run typecheck` | Added `leadmagnet_audit_workflow_report_v1` using API Template.io HTML/CSS conventions and lead-magnet registry seeding path. |
| OOO-049 | Q | Audit Mode Backend | High | `DONE` | OOO-048 | Build audit deliverable generator action with storage persistence and deterministic file naming. | `convex/onboarding/auditDeliverable.ts`, `convex/lib/generatePdf.ts`, `convex/pdfTemplateQueries.ts` | `npm run typecheck` | Added internal audit deliverable generation with deterministic fingerprint-based file naming, session-level idempotency, Convex storage persistence, and explicit template/API-key/generation error handling. |
| OOO-050 | Q | Audit Mode Backend | Medium | `DONE` | OOO-049 | Wire onboarding/audit tooling so the audit agent can request email and trigger deliverable generation. | `convex/ai/tools/interviewTools.ts`, `convex/onboarding/seedPlatformAgents.ts`, `convex/onboarding/claimTokenResponse.ts` | `npm run typecheck` | Added `request_audit_deliverable_email` + `generate_audit_workflow_deliverable` tools, wired Quinn prompt/toolset, and normalized email/name response helpers for value-first audit handoff. |
| OOO-051 | Q | Audit Mode Backend | Medium | `DONE` | OOO-050 | Emit telemetry for audit lifecycle (`started`, `completed`, `deliverable_generated`, `handoff_opened`). | `convex/onboarding/funnelEvents.ts`, `convex/api/v1/webchatApi.ts`, `convex/onboarding/soulReportScheduler.ts` | `npm run typecheck` | Preserve existing onboarding funnel metrics; extend rather than fork. |
| OOO-052 | Q | Audit Mode Backend | Medium | `DONE` | OOO-051 | Add backend tests and failure-mode coverage (missing API key, template mismatch, idempotency replay). | `tests/unit/onboarding/audit-mode.test.ts`, `tests/unit/onboarding/audit-deliverable.test.ts`, `tests/integration/onboarding/audit-flow.integration.test.ts` | `npm run test:unit` | Gate completion on deterministic assertions, not snapshot-only checks. |
| OOO-053 | R | Landing App Build | High | `DONE` | OOO-010 | Scaffold `apps/one-of-one-landing` with isolated routing, build scripts, and shared API contract boundary. | `apps/one-of-one-landing/package.json`, `apps/one-of-one-landing/tsconfig.json`, `apps/one-of-one-landing/app/layout.tsx` | `npm --prefix apps/one-of-one-landing run typecheck` | Isolated app boundary scaffolded with dedicated scripts and shared webchat API contract module (`lib/webchat-api-contract.ts`). |
| OOO-054 | R | Landing App Build | High | `DONE` | OOO-053 | Implement design foundation and typography system, including `Codec Pro` for headline hierarchy. | `apps/one-of-one-landing/app/globals.css`, `apps/one-of-one-landing/app/layout.tsx`, `apps/one-of-one-landing/public/fonts/` | `npm run ui:design:guard` | Design foundation + `Codec Pro` token wiring implemented for landing app. Global `ui:design:guard` remains red from pre-existing unrelated paths (`src/components`, `apps/operator-mobile`), accepted as out-of-scope for this lane. |
| OOO-055 | R | Landing App Build | High | `DONE` | OOO-054 | Build six-section one-page narrative from `FUNNEL.md` (argument + proof + paths). | `apps/one-of-one-landing/app/page.tsx`, `apps/one-of-one-landing/components/sections/*`, `docs/strategy/one-of-one/FUNNEL.md` | `npm run ui:design:guard` | Implemented six responsive sections with embedded audit-chat shell as primary CTA and anti-funnel copy constraints; `ui:design:guard` still fails from unrelated pre-existing files in `src/components` and `apps/operator-mobile`. |
| OOO-056 | R | Landing App Build | High | `DONE` | OOO-055 | Implement embedded audit chat surface as primary CTA with existing guest-chat backend. | `apps/one-of-one-landing/components/audit-chat-surface.tsx`, `apps/one-of-one-landing/lib/audit-chat-client.ts`, `src/hooks/use-ai-chat.ts` | `npm run typecheck` | Embedded chat now sends live messages through `/api/v1/native-guest/message`, persists `sessionToken` + `claimToken` via shared native-guest storage keys for continuity, and replaces the section-4 placeholder shell. |
| OOO-057 | R | Landing App Build | Medium | `DONE` | OOO-056 | Build handoff UX from audit completion to main app (`/chat`, app downloads, offer paths). | `apps/one-of-one-landing/components/handoff-cta.tsx`, `apps/one-of-one-landing/lib/handoff.ts`, `src/hooks/use-ai-chat.ts` | `npm run typecheck` | Added post-audit handoff CTA with readiness gating, `/chat` offer-path links, signup handoff carrying `identityClaimToken`, and platform download/web links; transitions remain optional and non-urgent. |
| OOO-058 | R | Landing App Build | Medium | `DONE` | OOO-057 | Add analytics and experiment hooks (entrypoint, step latency, CTA conversion). | `apps/one-of-one-landing/lib/analytics.ts`, `apps/one-of-one-landing/app/page.tsx`, `convex/onboarding/funnelEvents.ts` | `npm run ui:design:guard` | Added app-local telemetry hooks for landing entry, audit progression/latency, handoff readiness, and CTA conversion with campaign attribution + continuity booleans; `ui:design:guard` remains red from pre-existing unrelated files under `src/components` and `apps/operator-mobile`. |
| OOO-059 | S | Integration & Launch | High | `DONE` | OOO-052, OOO-058 | Run end-to-end rehearsal: cold visit -> audit chat -> PDF deliverable -> signup -> context-preserved chat. | `tests/e2e/onboarding-audit-handoff.spec.ts`, `convex/api/v1/webchatApi.ts`, `apps/one-of-one-landing/app/page.tsx` | `npm run test:e2e:desktop` | Added Playwright rehearsal covering landing cold entry, mocked audit progression with workflow/PDF brief response, signup handoff, and context-preserved chat link assertions (`guestSession` + `identityClaimToken` continuity). |
| OOO-060 | S | Integration & Launch | Medium | `READY` | OOO-059 | Final rollout pack: launch checklist, rollback steps, and observability handoff docs. | `docs/strategy/one-of-one/MASTER_PLAN.md`, `docs/strategy/one-of-one/INDEX.md`, `docs/strategy/one-of-one/TASK_QUEUE.md` | `npm run docs:guard` | Must include owner, trigger, rollback, and success-threshold definitions. |

### Deterministic execution queue (agent production hardening lanes)

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|----|----|----|----|----|----|----|----|----|----|
| OOO-061 | T | Agent Production Hardening | High | `PENDING` | OOO-060 | Baseline model release-gate policy and report outputs for current enabled models, including explicit blocking reasons and owner routing. | `convex/ai/modelReleaseGateAudit.ts`, `convex/ai/modelEnablementGates.ts`, `scripts/ci/model-release-gate-audit.ts` | `npm run model:gate:audit` | Keep mode `audit` first; no blocking rollout until baseline false-positive rate is reviewed. |
| OOO-062 | T | Agent Production Hardening | High | `PENDING` | OOO-061 | Wire release-gate enforcement into CI + operations docs (failure triage, override path, and escalation owner). | `.github/workflows/model-release-gate.yml`, `docs/reference_docs/api/ai-model-release-gate-operations.md`, `package.json` | `npm run docs:guard` | Enforce only after triage contract exists and is referenced in workflow output. |
| OOO-063 | T | Agent Production Hardening | High | `PENDING` | OOO-062 | Enforce runtime model guardrails so non-release-ready models cannot be selected for production chat turns. | `convex/ai/chat.ts`, `convex/ai/chatRuntimeOrchestration.ts`, `convex/ai/modelPolicy.ts` | `npm run model:gate:enforce` | Runtime and CI must agree on the same hard-gate checks and threshold set. |
| OOO-064 | U | Agent Production Hardening | High | `PENDING` | OOO-060 | Define deterministic turn governor contract (`max_steps`, `max_time_ms`, `max_tokens`, `max_cost_usd`, `retry_budget`). | `convex/ai/sessionPolicy.ts`, `convex/ai/autonomy.ts`, `convex/ai/agentTurnOrchestration.ts` | `npm run typecheck` | Boundaries must be configuration-driven and logged on each terminal turn state. |
| OOO-065 | U | Agent Production Hardening | High | `PENDING` | OOO-064 | Classify mutating tool actions and require explicit HITL approval boundaries for write/delete/payment/outreach side effects. | `convex/ai/agentApprovals.ts`, `convex/ai/tools/registry.ts`, `convex/ai/toolScoping.ts` | `npm run test:unit` | Read-only actions remain auto-executable; mutating actions require policy evidence and audit trail. |
| OOO-066 | U | Agent Production Hardening | Medium | `PENDING` | OOO-065 | Add `dry_run` execution contract for mutating tools and verify parity between simulated vs live payload shapes. | `convex/ai/tools/contracts.ts`, `convex/ai/tools/internalToolMutations.ts`, `tests/unit/ai/toolApprovalPolicy.test.ts` | `npm run test:unit` | Dry-run responses must include deterministic diff/preview fields for operator review. |
| OOO-067 | V | Agent Production Hardening | High | `PENDING` | OOO-063, OOO-066 | Extend trust telemetry to include turn correlation IDs, governor exits, approval outcomes, and fallback transitions. | `convex/ai/trustEvents.ts`, `convex/ai/trustTelemetry.ts`, `convex/terminal/terminalFeed.ts` | `npm run typecheck` | Telemetry schema changes must remain append-only and backward-compatible for existing dashboards. |
| OOO-068 | V | Agent Production Hardening | Medium | `PENDING` | OOO-067 | Add operator-facing reliability dashboards and alert thresholds for gate failures, runtime governor trips, and approval backlog. | `src/components/window-content/super-admin-organizations-window/platform-ai-models-tab.tsx`, `src/components/window-content/super-admin-organizations-window/platform-economics-tab.tsx`, `convex/ai/platformAlerts.ts` | `npm run ai:economics:guard` | Alerts must map to actionable runbook steps, not informational-only noise. |
| OOO-069 | V | Agent Production Hardening | High | `PENDING` | OOO-068 | Implement progressive rollout controls (shadow -> 5% canary -> 100%) with automatic rollback triggers on SLO breach. | `convex/ai/platformModelManagement.ts`, `convex/ai/modelEnablementGates.ts`, `tests/integration/ai/modelConformanceEnablement.integration.test.ts` | `npm run test:integration` | Rollback trigger thresholds must be explicit and validated in integration coverage. |
| OOO-070 | V | Agent Production Hardening | Medium | `PENDING` | OOO-069 | Publish production readiness packet: runbook, kill-switch procedure, rollback rehearsal evidence, and handoff ownership. | `docs/strategy/one-of-one/MASTER_PLAN.md`, `docs/strategy/one-of-one/INDEX.md`, `docs/strategy/one-of-one/TASK_QUEUE.md` | `npm run docs:guard` | Exit requires named owner + on-call trigger matrix + dated rehearsal artifact links. |

---

## Phase 1: Problem Chapters

| ID | Lane | Task | Depends on | Status | Notes |
|----|------|------|------------|--------|-------|
| OOO-001 | A | Write Chapter 1 — Twenty-One Things That Cost You Money This Week | — | `PENDING` | Source: `cash-is-king/00-front-matter/03-twenty-things-that-disappear.md`. Strip agent names. Add running cost tally. |
| OOO-002 | A | Validate Ch 1 — voice/ICP/word count/number check | OOO-001 | `PENDING` | Five-point validation per INDEX.md |
| OOO-003 | B | Write Chapter 2 — The Most Expensive Person in Your Company Is You | OOO-002 | `PENDING` | Calculate cost-per-hour model. Draw delegation ceiling from Marcus/Rachel cases. |
| OOO-004 | B | Validate Ch 2 | OOO-003 | `PENDING` | |
| OOO-005 | C | Write Chapter 3 — The Wrong Bet | OOO-004 | `PENDING` | Coordination cost arithmetic. 15-min-per-tool model. No solution yet — clear the ground. |
| OOO-006 | C | Validate Ch 3 | OOO-005 | `PENDING` | |

---

## Phase 2: Core Chapters

| ID | Lane | Task | Depends on | Status | Notes |
|----|------|------|------------|--------|-------|
| OOO-007 | D | Write Chapter 4 — One Operator. Built on You. | OOO-006 | `PENDING` | Karl's six-month story as spine. Three layers: identity, connection, compounding. Sovereignty guarantee. Source: `cash-is-king/03-the-soul-binding-difference/01-soul-binding.md` |
| OOO-008 | D | Validate Ch 4 | OOO-007 | `PENDING` | Extra check: does the chapter provoke "but how do I stay in control?" — if not, rewrite the close. |
| OOO-009 | E | Write Chapter 5 — How You Stay in Control | OOO-008 | `PENDING` | Four permission levels. Source: `life-operator-one-of-one-cutover/MASTER_PLAN.md` (permission ladder). Fisher-led chapter. |
| OOO-010 | E | Validate Ch 5 | OOO-009 | `PENDING` | Extra check: does the reader feel *more* in control than with human delegation? |

---

## Phase 3: Evidence Chapters (parallel eligible after OOO-010)

| ID | Lane | Task | Depends on | Status | Notes |
|----|------|------|------------|--------|-------|
| OOO-011 | F | Write Chapter 6 — The First Seven Days | OOO-010 | `PENDING` | Seven-day narrative. Specific suggestions drawn from real onboarding data. |
| OOO-012 | F | Validate Ch 6 | OOO-011 | `PENDING` | |
| OOO-013 | G | Write Chapter 7 — Four Owners. One Operator Each. | OOO-010 | `PENDING` | Sources: Marcus (`cash-is-king/01-the-six-core-specialists/01-the-closer.md` + `04-the-operator.md`), Rachel (`02-the-strategist.md`), Jess (`03-the-copywriter.md`), Lena (`02-industry-agents/07-ecommerce-retail/agents.md`). Reframe all from agent to operator. |
| OOO-014 | G | Validate Ch 7 | OOO-013 | `PENDING` | Extra check: every case study leads with numbers, not narrative. |
| OOO-015 | H | Write Chapter 8 — The Displacement Equation | OOO-010 | `PENDING` | P&L chapter. Build coordination cost model from ICP reality. Sources: pricing data from `cash-is-king/01_PRICING_LADDER.md` and `03_GRAND_SLAM_OFFER.md`. |
| OOO-016 | H | Validate Ch 8 | OOO-015 | `PENDING` | Extra check: can the reader open their books and do the comparison? |

---

## Phase 4: Close

| ID | Lane | Task | Depends on | Status | Notes |
|----|------|------|------------|--------|-------|
| OOO-017 | I | Write Chapter 9 — Month Twelve | OOO-012, OOO-014, OOO-016 | `PENDING` | Rolls-Royce chapter. Pure experience. No new concepts. |
| OOO-018 | I | Validate Ch 9 | OOO-017 | `PENDING` | Extra check: does the reader *feel* the Monday morning? |
| OOO-019 | J | Write Chapter 10 — One Conversation | OOO-018 | `PENDING` | Shortest chapter. Softest close. "That's not confidence. That's data." |
| OOO-020 | J | Validate Ch 10 | OOO-019 | `PENDING` | Extra check: zero urgency tactics, zero scarcity, zero manufactured pressure. |

---

## Phase 5: Back Matter (parallel eligible after OOO-010)

| ID | Lane | Task | Depends on | Status | Notes |
|----|------|------|------------|--------|-------|
| OOO-021 | K | Write Appendix A — Under the Hood | OOO-010 | `PENDING` | Technical architecture for curious readers. Only place "soul-binding," "capability packs," "memory layers" appear. |
| OOO-022 | K | Validate App A | OOO-021 | `PENDING` | |
| OOO-023 | L | Write Appendix B — Twenty-One Scenarios, Fully Modeled | OOO-002 | `PENDING` | Extended financial models for each Ch 1 scenario. Can start after Ch 1 is validated. |
| OOO-024 | L | Validate App B | OOO-023 | `PENDING` | |
| OOO-025 | M | Write Front Matter — Opening Letter | OOO-020 | `PENDING` | Written last. Tone calibrated to the finished book. |
| OOO-026 | M | Validate Front Matter | OOO-025 | `PENDING` | |

---

## Final gate

| ID | Task | Depends on | Status | Notes |
|----|------|------------|--------|-------|
| OOO-027 | Full book voice consistency pass | All lanes DONE | `PENDING` | Read all chapters sequentially. Flag any voice drift between chapters. |
| OOO-028 | Full book number audit | All lanes DONE | `PENDING` | Verify every euro/hour/percentage figure is consistent across chapters. |
| OOO-029 | ICP read-through | OOO-027, OOO-028 | `PENDING` | Read as the ICP. Flag any moment where the reader would stop reading. |

---

## Phase 6: Funnel & Website (parallel eligible after Phase 2)

| ID | Lane | Task | Depends on | Status | Notes |
|----|------|------|------------|--------|-------|
| OOO-030 | N | Write landing page copy — Hook + Problem sections | OOO-010 | `PENDING` | Sections 1-2 of FUNNEL.md. One argument, Ogilvy headline, three problem paragraphs. |
| OOO-031 | N | Write landing page copy — Shift + Proof + Paths sections | OOO-030 | `PENDING` | Sections 3, 5, 6 of FUNNEL.md. Operator intro, four case study blocks, three pricing cards. |
| OOO-032 | N | Write landing page copy — Below-the-fold sections | OOO-031 | `PENDING` | "Why not a discovery call," "Why one operator," app download section. |
| OOO-033 | N | Validate full landing page copy | OOO-032 | `PENDING` | Voice Bible + ICP check. Zero hype. Zero urgency tactics. Every number sourced. |
| OOO-034 | O | Design operator audit chat flow | OOO-010 | `PENDING` | Five-question conversational audit per FUNNEL.md chat widget spec. Natural, not survey-like. |
| OOO-035 | O | Write audit workflow deliverable template | OOO-034 | `PENDING` | The output the prospect receives: one workflow, specific, actionable, take-it-or-leave-it. |
| OOO-036 | O | Write email capture transition + offer presentation | OOO-035 | `PENDING` | Post-audit: "Imagine six months." Three paths. Natural transition, not a hard pivot. |
| OOO-037 | O | Validate full chat experience | OOO-036 | `PENDING` | Test against ICP Anchor. Does it feel like a sharp chief of staff or a survey bot? |
| OOO-038 | P | Write nurture email 1 — Audit workflow delivery | OOO-035 | `PENDING` | Day 0. Clean format of their workflow. "It's yours whether you work with us or not." |
| OOO-039 | P | Write nurture email 2 — Case study | OOO-038 | `PENDING` | Day 3. Closest industry match. Numbers only. |
| OOO-040 | P | Write nurture email 3 — "Your operator would have..." | OOO-039 | `PENDING` | Day 7. Personalized to their audit answers. Shows what they missed this week. |
| OOO-041 | P | Write nurture email 4 — Chapter 1 of the book | OOO-040 | `PENDING` | Day 14. The 21 things. PDF attached. No ask. |
| OOO-042 | P | Write nurture email 5 — Fifteen-minute conversation | OOO-041 | `PENDING` | Day 30. Only for free-tier app downloaders. "See what your operator learned." |
| OOO-043 | P | Validate full nurture sequence | OOO-042 | `PENDING` | Voice Bible check. Each email stands alone. Zero "just checking in" energy. |

---

## Final gate (updated)

| ID | Task | Depends on | Status | Notes |
|----|------|------------|--------|-------|
| OOO-027 | Full book voice consistency pass | All book lanes DONE | `PENDING` | Read all chapters sequentially. Flag any voice drift between chapters. |
| OOO-028 | Full book number audit | All book lanes DONE | `PENDING` | Verify every euro/hour/percentage figure is consistent across chapters. |
| OOO-029 | ICP read-through | OOO-027, OOO-028 | `PENDING` | Read as the ICP. Flag any moment where the reader would stop reading. |
| OOO-044 | Full funnel voice consistency pass | OOO-033, OOO-037, OOO-043 | `PENDING` | Landing page + chat + emails: consistent voice, consistent numbers, consistent offer. |
| OOO-045 | Book-to-funnel alignment check | OOO-029, OOO-044 | `PENDING` | Numbers, case studies, positioning language identical across book and funnel. No contradictions. |
