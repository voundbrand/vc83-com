# One-of-One V4 - Index

## Purpose

This workstream contains the v4 strategy docs plus the execution artifacts for turning the Kanzlei concept into a real single-agent MVP deployment path.

## Core Strategy Docs

- `00_EXECUTIVE_BRIEF.md`
- `01_ICP_AND_VERTICALS.md`
- `02_SALES_MOTION.md`
- `03_DEMO_KIT_SPEC.md`
- `04_TRIAL_PLAYBOOK.md`
- `05_PRICING_V4.md`
- `06_COMPETITIVE_POSITIONING.md`
- `07_CHANNEL_STRATEGY.md`
- `08_UNIT_ECONOMICS.md`
- `09_RISK_REGISTER.md`
- `10_EXPANSION_ROADMAP.md`
- `TECHNICAL_PRODUCT_PLAN.md`

## Execution Artifacts

- `MASTER_PLAN.md`
- `TASK_QUEUE.md`
- `SESSION_PROMPTS.md`
- `IMPLEMENTATION_REALITY_AUDIT.md`
- `LAWFIRM_SMOKE_CHECKLIST.md`
- `LAWFIRM_SMOKE_NOTES.md`

## Current State

- The repo already has reusable booking, CRM, calendar, firm-notification email, and phone-safe booking primitives.
- The direct Eleven telephony ingress path now creates or resolves a durable inbound `telephony_call_record` and can dispatch `api.ai.agentExecution.processInboundMessage` for accepted inbound calls.
- The multi-agent Kanzlei wedge is no longer the live MVP target. The new live path is a platform-native single-agent Kanzlei template defined in [template.ts](/Users/foundbrand_001/Development/vc83-com/apps/one-of-one-landing/elevenlabs/agents/kanzlei-mvp/template.ts).
- The platform already has a protected-template telephony precedent through Anne Becker in [seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts) and [telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts).
- The new single-agent Kanzlei template is seeded and deployable through the same protected-template lifecycle as Anne Becker.
- The corrected short-term target is a single-firm MVP built on one customer-facing Kanzlei agent: inbound ElevenLabs call -> structured intake -> booking or callback-safe fallback -> lawyer calendar -> internal summary email.
- The remaining gate is live setup on a real org: deploy the new template, sync the remote Eleven agent, verify org booking/calendar/email config, run an ingress preflight, then execute the manual smoke.
