# One-of-One V4 - Index

## Purpose

This workstream contains the v4 strategy documents plus the queue-first execution artifacts for turning the voice demo into a real law-firm deployment path.

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

## Current State

- The repo already has reusable booking, CRM, calendar, and phone-safe booking primitives.
- The Eleven telephony ingress route exists, but inbound law-firm calls are not yet wired into a complete booking runtime path.
- The platform already has a protected-template telephony precedent through the Anne Becker immomakler flow in [convex/onboarding/seedPlatformAgents.ts](/Users/foundbrand_001/Development/vc83-com/convex/onboarding/seedPlatformAgents.ts) and [convex/integrations/telephony.ts](/Users/foundbrand_001/Development/vc83-com/convex/integrations/telephony.ts).
- The original Sprint 1 file mapping in `TECHNICAL_PRODUCT_PLAN.md` is directionally useful but not accurate enough to execute safely.
- `IMPLEMENTATION_REALITY_AUDIT.md` is the current source of truth for what is already real versus what still needs implementation.
- The corrected short-term target is a single-firm MVP built on platform-native Clara, Jonas, and Maren telephony templates: inbound ElevenLabs call -> qualified intake -> booking -> calendar push -> internal summary email.
