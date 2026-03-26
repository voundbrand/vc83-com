# Template Certification And Org Preflight Master Plan

**Date:** 2026-03-25  
**Scope:** Replace time-based WAE rollout gating with reusable exact-version certification plus deploy-time org preflight.

---

## Mission

Ship an operating model where:

1. a template version is certified once,
2. the same certified version can deploy to many orgs,
3. org-specific failures are surfaced separately as preflight blockers,
4. invalidation is deterministic and tied to dependency digests, not elapsed time.

---

## Architecture

### Quality plane

1. `TemplateCertificationDecisionArtifact` is the primary release contract.
2. Certification is keyed to `templateId`, `templateVersionId`, `templateVersionTag`, and dependency digest.
3. Risk tiering classifies version changes into `low`, `medium`, or `high`.
4. Required verification is derived from risk tier.
5. WAE remains a supported evidence source, not the whole model.

### Readiness plane

1. `TemplateOrgPreflightResult` answers whether a target org can run the certified version now.
2. Preflight currently checks telephony binding, credentials, numbers, webhook readiness, and transfer-target dependencies.
3. Preflight runs during distribution, spawn, and telephony deployment flows.

### Deterministic invalidation

1. Certification survives indefinitely while the dependency digest is unchanged.
2. Any meaningful manifest drift invalidates the certification immediately.
3. Missing certification, mismatched certification, invalid certification, and failed org preflight remain fail-closed.

---

## Compatibility boundaries

1. Existing WAE artifacts still bridge into certification when possible.
2. Legacy WAE-centric admin mutations remain available as compatibility wrappers.
3. Protected-template versioning, managed-clone linkage, and telephony deployment flows stay intact.
4. Platform Mother review flows now depend on template certification terminology without breaking artifact history.

---

## UI direction shipped

1. Platform Mother shows certification state, policy eligibility, and org-blocker pressure per candidate.
2. Agent Control Center separates certification, rollout, org preflight, and drift in version and rollout views.
3. The old WAE card is retained as a certification evidence surface, not the core mental model.
4. Agent detail and telephony panels now expose certification/preflight readiness directly.

---

## Remaining risks

1. Per-template-family policy overlays remain operator-managed; no automated approval workflow exists for risky policy deltas.
2. Strict credential governance remains opt-in for backward compatibility; channels without ready dedicated credentials still require manual remediation before enforced posture can be universal.
3. Policy-drift recommendations currently emit during status/evidence flows; there is no standalone scheduled drift notifier for idle templates.
4. Org-preflight requirement authoring outside certification risk policy still depends on template author discipline and lacks dedicated lint automation.

## Next execution slice

1. `TCP-018` (complete 2026-03-25): strict-mode credential-governance rollout automation, policy-drift recommendation routing, and guardrail telemetry are now live for Slack/PagerDuty/Email alert worker transports.
2. `TCP-019` (candidate): add scheduled drift sweeps + owner escalation workflows so drift alerts are emitted without requiring fresh evidence writes.
