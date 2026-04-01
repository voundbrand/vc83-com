# Compliance Final Structure

Root: `/Users/foundbrand_001/Development/vc83-com/compliance`

## Canonical workstream layout

```text
compliance/
  README.md
  INDEX.md
  STRUCTURE.md

  dsgvo_kanzlei_agent_mvp/
    INDEX.md
    MASTER_PLAN.md
    TASK_QUEUE.md
    SESSION_PROMPTS.md
    evidence/
    provider_dossiers/
    runbooks/

  gdpr_only/
    INDEX.md
    MASTER_PLAN.md
    TASK_QUEUE.md
    SESSION_PROMPTS.md
    evidence/
    controls/
    procedures/

  dsgvo_compliance_agent_factory/
    INDEX.md
    MASTER_PLAN.md
    TASK_QUEUE.md
    SESSION_PROMPTS.md
    templates/
    release_gates/

  knowledge_compliance_architecture/
    INDEX.md
    MASTER_PLAN.md
    TASK_QUEUE.md
    SESSION_PROMPTS.md
    architecture/
    migration/
```

## Rules

1. Every compliance workstream must keep queue-first artifacts in its own folder.
2. Evidence files and operational runbooks stay inside the owning workstream.
3. Cross-workstream references must point to `compliance/*` canonical paths.
4. Legacy folders under `docs/platform/*` and `docs/security_and_speed_audit/GDPR_ONLY` remain pointer-only.
