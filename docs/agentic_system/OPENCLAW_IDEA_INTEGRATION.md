# OpenClaw Idea Integration

Canonical docs home:
- `docs/agentic_system/CANONICAL_DOCS_INDEX.md`
- `docs/agentic_system/DOC_STATUS_MATRIX.md`

Purpose:
- absorb useful patterns from legacy `docs/openclaw_idea/*.md` notes
- keep one canonical source-of-truth in `docs/agentic_system/`
- prevent future drift from idea docs living outside architecture docs

---

## Non-Drift Rules

1. `docs/openclaw_idea/*.md` is not an active source-of-truth.
2. Architecture decisions must live in canonical docs under `docs/agentic_system/`.
3. Implementation plans must link to canonical docs, not archived idea notes.
4. Legacy idea notes are archived for traceability only.

---

## Pattern Integration Map

| Legacy idea docs | Canonical destination(s) |
|---|---|
| `INDEX.md`, `MVP_PLAN.md`, `STRATEGY_AND_POSITIONING.md`, `steal-the-godd-ideas-plan.md`, `lex-podcast.md` | `docs/agentic_system/ARCHITECTURE.md`, `docs/agentic_system/README.md`, `docs/agentic_system/FOUR_LAYER_PLATFORM_MODEL.md` |
| `PHASE_1_AGENT_PER_ORG.md`, `PHASE_2.5_STEP6_SESSION_MODEL.md`, `PHASE_3_STEP2_IDENTITY_LINKING.md` | `docs/agentic_system/ARCHITECTURE.md`, `docs/agentic_system/SESSION_LIFECYCLE.md` |
| `PHASE_2.5_STEP2_MESSAGE_ATTRIBUTION.md`, `PHASE_2.5_STEP3_TEAM_TOOLS.md`, `PHASE_3_HANDOFF_CURRENT_STATE.md`, `PHASE_3_PLATFORM_AGENT_TEAM.md` | `docs/agentic_system/TEAM_COORDINATION.md`, `docs/agentic_system/HARNESS_MODEL.md` |
| `PHASE_2.6_LAYER_1_EXEC_APPROVALS.md`, `PHASE_2.6_LAYER_2_CONTENT_AUTONOMY.md`, `PHASE_2.6_LAYER_3_SOUL_EVOLUTION_HITL.md` | `docs/agentic_system/TOOL_SCOPING.md`, `docs/agentic_system/SOUL_EVOLUTION.md`, `docs/agentic_system/implementation_plans/P2_HUMAN_IN_THE_LOOP.md` |
| `PHASE_2_CHANNEL_CONNECTORS.md`, `PHASE_2.5_TELEGRAM_ONBOARDING.md`, `PHASE_2.5_STEP8_TELEGRAM_GROUP_CHAT.md`, `PHASE_2.8_STEP1_PER_ORG_TELEGRAM_BOTS.md` | `docs/agentic_system/ARCHITECTURE.md`, `docs/agentic_system/implementation_plans/P3_GROUP_CHAT.md` |
| `PHASE_2.9_PRODUCTION_SURFACE.md`, `PHASE_2.9_STEP1_PRODUCTION_BRIDGE.md`, `PHASE_2.9_STEP2_AGENT_MANAGEMENT_UI.md`, `PHASE_2.9_STEP4_WEB_AHA_EXPERIENCE.md`, `PHASE_5_STEP2_TELEGRAM_SETTINGS_PANEL.md`, `PHASE_5_STEP3_TELEGRAM_CARD_WIRING.md`, `PHASE_5_TELEGRAM_INTEGRATION_UI.md` | `docs/agentic_system/implementation_plans/P4_UI_ADDITIONS.md` |
| `PHASE_2.9_STEP3_PROVIDER_ABSTRACTION.md` | `docs/ai-endurance/implementation-plans/13-control-plane-plugin-boundaries.md`, `docs/agentic_system/ARCHITECTURE.md` |
| `PHASE_2.5_STEP7_SOUL_EVOLUTION.md`, `PHASE_2.5_STEP10_SELF_IMPROVEMENT_LOOP.md`, `SOUL-EXAMPLE.md` | `docs/agentic_system/SOUL_EVOLUTION.md` |
| `PHASE_2.5_STEP4_PM_AWARENESS.md`, `PHASE_2.5_STEP5_ONBOARDING_COMPLETION.md`, `PHASE_2.7_AGENCY_TRIAL.md` | `docs/agentic_system/README.md`, `docs/agentic_system/implementation_plans/` |
| `PHASE_3_CONTENT_GENERATION.md` | `docs/agentic_system/AI_COMPOSITION_PLATFORM.md` |
| `PHASE_4_GHL_INTEGRATION.md`, `PHASE_4_STEP1_GHL_OAUTH_FOUNDATION.md`, `PHASE_4_STEP2_GHL_CONTACT_SYNC.md`, `PHASE_4_STEP3_GHL_CONVERSATIONS.md`, `PHASE_4_STEP4_GHL_OPPORTUNITIES.md`, `PHASE_4_STEP5_GHL_CALENDAR.md`, `PHASE_4_STEP6_GHL_AGENT_TOOLS.md` | `docs/agentic_system/MEMORY_ENGINE_DESIGN.md`, `docs/ghl_integration_plus_memory/` |
| `PHASE_5_STEP1_TELEGRAM_BACKEND_API.md` | `docs/agentic_system/ARCHITECTURE.md`, `docs/agentic_system/implementation_plans/P3_GROUP_CHAT.md` |
| `PHASE_2.4_PLAN.md`, `PHASE_2.5_STEP9_RICH_MEDIA_PIPELINE.md`, `PHASE_2.8_STEP2_LAYER_ARCHITECTURE.md` | `docs/agentic_system/ARCHITECTURE.md`, `docs/agentic_system/FOUR_LAYER_PLATFORM_MODEL.md` |

---

## Archive Location

Legacy source notes were archived to:
- `docs/archive/openclaw-idea-md-2026-02-16/`

Archive content is immutable and reference-only.

