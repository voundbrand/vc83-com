# PressMaster Onboarding — Gap Analysis & Priority Plan

## Scope

This plan covers the **PressMaster onboarding product** — a guided interview system that extracts Content DNA from clients and generates content. This is separate from the "Bring It All Together" platform infrastructure work.

### Dependency: Credit System Wiring

PressMaster interviews run through the agent execution pipeline. The credit system must be wired to ANY agentic workflows (documented in `docs/bring_it_all_together/08-CREDITS-WIRING.md`). This is a **platform-level prerequisite** — once credits are wired, PressMaster interviews will automatically consume credits like any other agent interaction.

**Not blocking Phase 1** — frontend work can proceed while credit wiring happens in parallel as part of the "Bring It All Together" workstream.

---

## Current Implementation Status

### Interview Engine Backend — 95% COMPLETE

| File | Status | Lines | Notes |
|------|--------|-------|-------|
| `convex/schemas/interviewSchemas.ts` | ✅ Complete | 359 | Types, validators, Content DNA schema |
| `convex/schemas/agentSessionSchemas.ts` | ✅ Complete | 120 | Session mode + interview state fields |
| `convex/interviewTemplateOntology.ts` | ✅ Complete | 887 | Full CRUD, seeding, stats, audit trail |
| `convex/ai/interviewRunner.ts` | ✅ Complete | 864 | State machine, prompt context builder |
| `convex/ai/tools/interviewTools.ts` | ✅ 95% | 279 | 5 tools (1 minor TODO at line 256) |
| `convex/seeds/interviewTemplates.ts` | ✅ Complete | 614 | 3 production-ready templates |

### Interview Engine Frontend — 95% COMPLETE

| Component | Status | Size | Notes |
|-----------|--------|------|-------|
| `template-designer.tsx` | ✅ Complete | 20.8 KB | Full CRUD, phase/question editing |
| `interview-progress.tsx` | ✅ Complete | 9 KB | 3 variants (minimal/compact/detailed) |
| `interview-runner.tsx` | ✅ Complete | ~380 lines | Displays questions, accepts input, shows progress, wired to agent |
| `interview-results.tsx` | ✅ Complete | ~160 lines | Content DNA viewer with copy/export |
| `interview-selector.tsx` | ✅ Complete | ~210 lines | Template picker, starts new interviews |
| Interview Analytics | ❌ Missing | — | Completion metrics dashboard |

### Brain Window — NEW (UI Entry Point)

The **Brain** window consolidates all knowledge capture into a single desktop window with three modes. This is the primary user-facing entry point for the interview system and knowledge base.

| Component | Status | Size | Notes |
|-----------|--------|------|-------|
| `brain-window/index.tsx` | ✅ Complete | ~190 lines | Mode switcher (Learn/Teach/Review tabs) |
| `brain-window/learn-mode.tsx` | ✅ Complete | ~85 lines | Wraps InterviewSelector + InterviewRunner |
| `brain-window/teach-mode.tsx` | ✅ UI Only | ~280 lines | Multi-modal input (PDF, audio, links, text) |
| `brain-window/review-mode.tsx` | ✅ UI Only | ~220 lines | Knowledge browser with categories |
| Window Registry | ✅ Complete | — | Registered as "brain" in `window-registry.tsx` |
| Programs Menu | ✅ Complete | — | Added to Start → Programs |

**Backend integration needed:**
- Teach mode: Convex mutations for file upload, link scraping, RAG processing
- Review mode: Convex query to list knowledge items by organization

See: [BRAIN_WINDOW.md](docs/pressmaster_onboarding/BRAIN_WINDOW.md) for detailed architecture.

### Content Pipeline — NOT STARTED

| Component | Status | Notes |
|-----------|--------|-------|
| Content DNA storage | ⚠️ Partial | Schema exists, saved on interview completion |
| Content Calendar generation | ❌ Missing | 14-day automated planning |
| Draft generation | ❌ Missing | Platform-specific content from DNA |
| Client review queue | ❌ Missing | Approve/edit/reject with swipe gestures |
| Twin learning | ❌ Missing | Pattern extraction from client edits |

### Voice Input — NOT STARTED

| Component | Status | Notes |
|-----------|--------|-------|
| Voice transcription service | ❌ Missing | Parakeet V3 by Argmax |
| Voice input React hook | ❌ Missing | `useVoiceInput` for any surface |
| Mobile voice recording UI | ❌ Missing | Record button + waveform |

---

## Gap Summary

| PressMaster Phase | Documented | Implemented | Gap |
|-------------------|-----------|-------------|-----|
| Phase 1: Interview Engine | 17 tasks | Backend ✅, Frontend ✅ | E2E testing |
| **Brain Window** | ✅ NEW | UI ✅, Backend ⚠️ | Teach/Review backend wiring |
| Phase 2: Client Onboarding | 9 files | ❌ | Invites, client role, `/c/*` routes |
| Phase 3: Content Pipeline | 11 files | ❌ | Calendar, drafts, review queue, twin learning |
| Phase 4: Mobile & Voice | 8 files | ❌ | Voice service, push notifications, offline |
| Phase 5: White-Label | 8 files | ❌ | Branding, AI templates, marketplace |

---

## Revised Priority Plan

### PHASE 1: Complete Interview Engine Frontend (IMMEDIATE)

**Goal:** End-users can complete guided interviews and see their Content DNA.

| # | Task | File | Effort | Status |
|---|------|------|--------|--------|
| 1.1 | Interview Runner UI — displays current question, accepts text input, shows progress | `src/components/interview/interview-runner.tsx` | Medium | ✅ DONE |
| 1.2 | Interview Results Display — shows extracted Content DNA after completion | `src/components/interview/interview-results.tsx` | Small | ✅ DONE |
| 1.3 | Interview Selector — choose template to start an interview | `src/components/interview/interview-selector.tsx` | Small | ✅ DONE |
| 1.4 | Wire runner to agent chat panel (or standalone page) | Integration | Medium | ✅ DONE |
| 1.5 | Test end-to-end: start → answer → extract → Content DNA saved | QA | — | 🔄 IN PROGRESS |

**Outcome:** Agencies can run guided interviews with clients. Content DNA is extracted and stored.

---

### PHASE 2: Voice-to-AI Input System

**Goal:** Reusable voice transcription for interviews (and other surfaces later).

**Technology:** Parakeet V3 by Argmax
- Initial languages: English (EN), German (DE)
- Architecture: Extensible for additional languages later
- Pattern: Two-layer model (voice → raw text → LLM cleanup)

| # | Task | File | Effort |
|---|------|------|--------|
| 2.1 | Design voice service API with language parameter | Spec doc | Small |
| 2.2 | Integrate Parakeet V3 API (Argmax) | `convex/ai/voiceTranscription.ts` | Medium |
| 2.3 | Language detection / selection (EN/DE toggle) | Service config | Small |
| 2.4 | LLM post-processing for cleanup (filler words, grammar) | `convex/ai/voiceTranscription.ts` | Small |
| 2.5 | React hook for voice input | `src/hooks/use-voice-input.ts` | Medium |
| 2.6 | Mobile voice recording UI component | `src/components/voice-input.tsx` | Medium |
| 2.7 | Integrate into Interview Runner | `interview-runner.tsx` | Small |
| 2.8 | Language extension pattern (add new languages via config) | Architecture | Small |

**Outcome:** Clients can speak their answers in English or German. Voice input is reusable and extensible for future languages.

---

### PHASE 3: Content Pipeline

**Goal:** Content DNA → automated content calendar → draft generation → client review.

| # | Task | File | Effort |
|---|------|------|--------|
| 3.1 | Content DNA profile viewer (detailed breakdown by category) | `src/components/interview/content-dna-viewer.tsx` | Medium |
| 3.2 | Content Calendar generation (14-day plan from DNA + trends) | `convex/ai/contentCalendar.ts` | Large |
| 3.3 | Draft generation (platform-specific: LinkedIn, X, Instagram) | `convex/ai/draftGeneration.ts` | Large |
| 3.4 | Client review queue UI (swipeable approve/edit/reject) | `src/components/content/review-queue.tsx` | Large |
| 3.5 | Twin learning — extract patterns from client edits | `convex/ai/twinLearning.ts` | Medium |
| 3.6 | Layers integration: `interview_complete → generate_calendar → generate_drafts → notify` | Workflow config | Medium |

**Outcome:** Interviews generate a content calendar automatically. Clients review drafts on mobile. System learns from edits.

---

### PHASE 4: Client Onboarding Experience

**Goal:** Agencies invite clients to a branded, mobile-first interview experience.

| # | Task | File | Effort |
|---|------|------|--------|
| 4.1 | Client invite system (email with magic link) | `convex/clientInvites.ts` | Medium |
| 4.2 | Client role + minimal permissions | RBAC extension | Small |
| 4.3 | Client routes: `/c/interview`, `/c/reviews`, `/c/profile` | `src/app/c/` | Medium |
| 4.4 | Mobile-first interview UI | Responsive styling | Medium |
| 4.5 | Push notifications (Expo Push + email fallback) | `convex/notifications/` | Medium |
| 4.6 | Offline voice recording (sync when connected) | Service worker | Large |

**Outcome:** Clients receive branded invite → complete interview on mobile → review content in-app.

---

### PHASE 5: White-Label & Scale

**Goal:** Full branding + AI-generated templates + marketplace.

| # | Task | File | Effort |
|---|------|------|--------|
| 5.1 | Org-level brand settings (logo, colors, fonts) | `convex/organizations.ts` extension | Medium |
| 5.2 | Apply branding to all client-facing surfaces | CSS variables / Tailwind config | Medium |
| 5.3 | AI-generated interview templates (describe client type → generate phases) | `convex/ai/templateGenerator.ts` | Large |
| 5.4 | Template marketplace (share/sell templates) | New ontology + UI | Large |
| 5.5 | Custom domains for client portals | DNS + routing | Medium |
| 5.6 | Multi-language interviews (Parakeet V3 supports multiple languages) | i18n extension | Medium |

**Outcome:** Agencies have fully branded PressMaster experiences. AI generates custom templates per client type.

---

## Critical Files Reference

### Backend (Convex) — Existing
- [interviewSchemas.ts](convex/schemas/interviewSchemas.ts) — Types and validators
- [interviewTemplateOntology.ts](convex/interviewTemplateOntology.ts) — Template CRUD
- [interviewRunner.ts](convex/ai/interviewRunner.ts) — State machine
- [interviewTools.ts](convex/ai/tools/interviewTools.ts) — Agent tools
- [interviewTemplates.ts](convex/seeds/interviewTemplates.ts) — Seed data

### Frontend (React) — Interview Components
- [template-designer.tsx](src/components/interview/template-designer.tsx) — Template editor
- [interview-progress.tsx](src/components/interview/interview-progress.tsx) — Progress indicators
- [interview-runner.tsx](src/components/interview/interview-runner.tsx) — Question display + input
- [interview-results.tsx](src/components/interview/interview-results.tsx) — Content DNA viewer
- [interview-selector.tsx](src/components/interview/interview-selector.tsx) — Template picker

### Frontend (React) — Brain Window (Knowledge Hub)
- [brain-window/index.tsx](src/components/window-content/brain-window/index.tsx) — Main container + mode tabs
- [brain-window/learn-mode.tsx](src/components/window-content/brain-window/learn-mode.tsx) — Interview wrapper
- [brain-window/teach-mode.tsx](src/components/window-content/brain-window/teach-mode.tsx) — Multi-modal input
- [brain-window/review-mode.tsx](src/components/window-content/brain-window/review-mode.tsx) — Knowledge browser

### Documentation
- [SPEC.md](docs/pressmaster_onboarding/SPEC.md) — Master spec, architecture
- [PRIORITY_PLAN.md](docs/pressmaster_onboarding/PRIORITY_PLAN.md) — This file
- [BRAIN_WINDOW.md](docs/pressmaster_onboarding/BRAIN_WINDOW.md) — Brain knowledge hub architecture
- [PHASE_1_INTERVIEW_ENGINE.md](docs/pressmaster_onboarding/PHASE_1_INTERVIEW_ENGINE.md)
- [PHASE_2_CLIENT_ONBOARDING.md](docs/pressmaster_onboarding/PHASE_2_CLIENT_ONBOARDING.md)
- [PHASE_3_CONTENT_PIPELINE.md](docs/pressmaster_onboarding/PHASE_3_CONTENT_PIPELINE.md)
- [PHASE_4_MOBILE_VOICE.md](docs/pressmaster_onboarding/PHASE_4_MOBILE_VOICE.md)
- [PHASE_5_WHITE_LABEL.md](docs/pressmaster_onboarding/PHASE_5_WHITE_LABEL.md)

---

## Verification Checklist

### Phase 1 Complete When:
- [ ] User can start interview from template selector
- [ ] Interview Runner displays questions one at a time
- [ ] Progress indicator shows current phase/question
- [ ] Extraction happens automatically from responses
- [ ] Content DNA saved as `type="content_profile"` on completion
- [ ] Results display shows extracted data by category

### Phase 2 Complete When:
- [ ] Voice button appears in Interview Runner
- [ ] Recording works on mobile Safari and Chrome
- [ ] Parakeet V3 transcription returns raw text
- [ ] LLM cleanup removes filler words, fixes grammar
- [ ] Language toggle (EN/DE) works correctly
- [ ] Adding new language requires only config change (extensible)

### Phase 3 Complete When:
- [ ] Content calendar generates 14 days of topics from DNA
- [ ] Drafts generate for selected platforms
- [ ] Client can swipe to approve/edit/reject
- [ ] Edits feed back into twin learning
