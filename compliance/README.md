# Compliance Workspace

Canonical compliance workspace for policy, legal, control, and release-gate execution.

## Canonical workstreams

- `compliance/dsgvo_kanzlei_agent_mvp/`
- `compliance/gdpr_only/`
- `compliance/dsgvo_compliance_agent_factory/`
- `compliance/knowledge_compliance_architecture/`

## Consolidation rule

1. New compliance docs must be created under `compliance/`.
2. Legacy paths under `docs/platform/*` and `docs/security_and_speed_audit/GDPR_ONLY` are no longer canonical.
3. Queue-first artifacts (`INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`) live in each workstream folder under `compliance/`.
