# Web AI Chat Agent Vision Runtime Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime`  
**Source brief:** 2026-03-09 web AI chat initiative for "agent can see while talking"  
**Execution mode:** Deterministic queue-first with three phase gates

## Canonical files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/web-ai-chat-agent-vision-runtime/MASTER_PLAN.md`

## Scope summary

Included:

1. Fast-path frame auto-attachment on voice turns.
2. Robust policy/auth/freshness hardening and observability.
3. VisionClaw-style persistent realtime multimodal parity migration.

Excluded:

1. Unrelated operator-mobile-only UI work.
2. Non-chat media features outside this runtime path.
3. General docs/reference project modifications.

## Phase summary

| Phase | Lane | Goal | Completion rows |
|---|---|---|---|
| `1` | `A` | Fast path: freshest-frame per-turn attachment | `WCV-001`..`WCV-004` |
| `2` | `B` | Robust path: safety/hardening/observability | `WCV-101`..`WCV-104` |
| `3` | `C` | VisionClaw parity: persistent multimodal session | `WCV-201`..`WCV-204` |

## Current queue snapshot

| Lane | IDs | Status snapshot |
|---|---|---|
| `A` | `WCV-001`..`WCV-004` | `READY`, `PENDING`, `PENDING`, `PENDING` |
| `B` | `WCV-101`..`WCV-104` | `PENDING` x4 |
| `C` | `WCV-201`..`WCV-204` | `PENDING` x4 |

## READY-first execution list

1. `WCV-001`

## Required gates

1. `npm run docs:guard`
2. `npm run typecheck`
3. Targeted unit/integration commands listed in `TASK_QUEUE.md`

## Latest update

1. `2026-03-09`: Created queue-first workstream artifacts with one master plan split into three phases and lane prompts for each phase.
