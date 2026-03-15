# Phase 0 Proof — Task Queue

## Queue Rules

- Workstream root: `docs/strategy/one-of-one-v3/phase-0-proof`
- This queue governs proof-phase demo alignment work for the Track A phone demo.
- The canonical ElevenLabs source files remain under `docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents`.
- Prefer 1-2 hour tasks with direct verification commands.
- A task can move to `DONE` only after its listed verification passes.
- Status flow is dependency-based: `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`.
- Use `BLOCKED` only when a dependency or external decision prevents execution.

## Verification Profiles

| Verify | Command / Method |
| --- | --- |
| `DOCS_GUARD` | `npm run docs:guard` |
| `SYNC_DRY_RUN` | `npm run landing:elevenlabs:sync -- --all` |
| `SYNC_WRITE` | `npm run landing:elevenlabs:sync -- --all --write` |
| `HANDOFF_SUITE` | `npm run landing:elevenlabs:simulate -- --suite all-handoffs` |
| `PROOF_FLOW_TEXT` | `npm run landing:elevenlabs:simulate -- --suite proof-phase-gating` |
| `PROOF_FLOW_STRESS` | `npm run landing:elevenlabs:simulate -- --suite proof-phase-stress` |
| `VOICE_QA` | Manual checklist from `04_PROOF_PHASE_DEMO.md` |

## Execution Lanes

| Lane | Purpose | Concurrency Rule |
| --- | --- | --- |
| `LANE-A` | Proof narrative, demo-business model, and doc alignment | Can run alone or with `LANE-C`; avoid overlapping edits in canonical prompt files |
| `LANE-B` | Agent prompt / tool / workflow implementation | Single-writer lane for canonical ElevenLabs files |
| `LANE-C` | Harness, fixtures, and validation | Can run with `LANE-A`; gate `LANE-B` changes with verification |

## Tasks

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P0-PROOF-001` | `LANE-A` | Proof-spec gap audit | High | `DONE` | — | Freeze the delta between the current demo runtime and the proof spec, including demo-business mismatch, single-call requirement, and QA gaps. | `04_PROOF_PHASE_DEMO.md`, `v2/test-coverage.md`, `landing-demo-agents/v2/*.md`, `RUNTIME_GAP_AUDIT.md` | `DOCS_GUARD` | Completed on `2026-03-15`; output is the written delta list with explicit non-goals in `RUNTIME_GAP_AUDIT.md`. |
| `P0-PROOF-002` | `LANE-B` | Demo-business alignment | High | `DONE` | `P0-PROOF-001` | Replace the current demo-company framing with `Schmitt & Partner` across Clara and specialist prompts, KB-facing docs, and any obvious runtime-facing copy. | `landing-demo-agents/*/system-prompt.md`, `landing-demo-agents/*/knowledge-base.md`, shared business docs, `sync-elevenlabs-agent.ts` | `SYNC_DRY_RUN`, `SYNC_WRITE` | Completed on `2026-03-15`; prompts, knowledge-base source files, and staging KB sync now reflect `Schmitt & Partner` across the phone roster. |
| `P0-PROOF-003` | `LANE-B` | Clara proof-mode routing | High | `DONE` | `P0-PROOF-002` | Tune Clara so the proof call sounds like a receptionist for `Schmitt & Partner` and can drive the proof-spec trigger flow naturally. | `landing-demo-agents/clara/system-prompt.md`, `landing-demo-agents/clara/first-message.md`, `landing-demo-agents/clara/knowledge-base.md`, `landing-demo-agents/clara/tools.json`, `landing-demo-agents/clara/workflow.json`, `sync-elevenlabs-agent.ts` | `SYNC_DRY_RUN`, `SYNC_WRITE`, `HANDOFF_SUITE` | Completed on `2026-03-15`; Clara opener, receptionist-mode language, transfer phrasing, and workflow prompt nodes were tightened, the repo now manages Clara's staging first-message, and staging validation passed via Clara dry-run, Clara write, `clara-maren-clara-roundtrip`, `clara-kai-clara-maren-regression`, and `all-handoffs`. |
| `P0-PROOF-004` | `LANE-B` | Specialist proof-flow tuning | High | `DONE` | `P0-PROOF-002` | Retune Maren, Jonas, Lina, Kai, Tobias, and Nora to match the exact proof-phase triggers and responses in the demo spec. | `landing-demo-agents/{maren,jonas,lina,kai,tobias,nora}/system-prompt.md` | `SYNC_DRY_RUN`, `SYNC_WRITE`, `HANDOFF_SUITE` | Completed on `2026-03-15`; specialist prompts now run a tighter Schmitt & Partner proof flow, targeted `specialist-redirects` fixtures were added for wrong-lane returns to Clara, specialist staging sync passed, and `all-handoffs` still passes. |
| `P0-PROOF-005` | `LANE-C` | Proof-spec fixture suite | High | `IN_PROGRESS` | `P0-PROOF-003` | Create proof-specific fixtures, including one proof-flow suite that mirrors the demo spec and a single-call seven-agent stress fixture. | `apps/one-of-one-landing/fixtures/elevenlabs`, `simulate-elevenlabs-flow.ts` | `PROOF_FLOW_TEXT`, `PROOF_FLOW_STRESS`, `DOCS_GUARD` | Fixture artifacts, suite registration, and docs are in place as of `2026-03-15`, but the intended long-call proof gate is still failing live on specialist transfer drift during the seven-agent tour. |
| `P0-PROOF-006` | `LANE-C` | Voice QA process | High | `PENDING` | `P0-PROOF-004` | Add the manual or semi-automated voice smoke process for off-hours, audio quality, unexpected questions, and agent-level call review. | `04_PROOF_PHASE_DEMO.md`, harness docs, QA checklist docs | `VOICE_QA`, `DOCS_GUARD` | This closes the gap between text/API validation and live phone quality. |
| `P0-PROOF-007` | `LANE-C` | German quality and persona matrix | High | `PENDING` | `P0-PROOF-004` | Define and run the proof QA matrix for native German phrasing, no English leakage, and 10+ caller personas across the main demo paths. | QA checklist docs, fixture docs, agent reference docs | `VOICE_QA`, `DOCS_GUARD` | Make the language-quality gate explicit instead of implied. |
| `P0-PROOF-008` | `LANE-C` | 24/7 soak and call-volume gate | High | `PENDING` | `P0-PROOF-005, P0-PROOF-006, P0-PROOF-007` | Run the proof soak campaign: 50+ total test calls, off-hours coverage, and an explicit no-downtime observation window. | Harness docs, run logs, proof docs | `VOICE_QA`, `DOCS_GUARD` | This is the explicit reliability and volume gate from the proof spec. |
| `P0-PROOF-009` | `LANE-A` | Demo delivery assets | Medium | `PENDING` | `P0-PROOF-002` | Align the proof-phase WhatsApp + PDF delivery assets with the proof doc and keep them linked from the workstream docs. | `04_PROOF_PHASE_DEMO.md`, related delivery docs | `DOCS_GUARD` | Keep Phase 0 lean; no booth/demo-kit drift. |
| `P0-PROOF-010` | `LANE-C` | Final readiness gate | High | `PENDING` | `P0-PROOF-003, P0-PROOF-004, P0-PROOF-005, P0-PROOF-006, P0-PROOF-007, P0-PROOF-008` | Run the final proof readiness check and record whether the demo is ready to be shown as the Phase 0 proof call. | Harness docs, fixture docs, proof docs | `DOCS_GUARD`, `SYNC_DRY_RUN`, `HANDOFF_SUITE`, `PROOF_FLOW_TEXT`, `VOICE_QA` | This is the publish/no-publish gate. |
