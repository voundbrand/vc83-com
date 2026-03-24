# Template Certification And Org Preflight Master Plan

**Date:** 2026-03-24  
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

1. Per-template-family risk policy overlays now exist, but policy governance and change-review workflow for overlay updates is still manual.
2. CI/admin evidence ingestion now records runtime/tool/policy defaults plus explicit missing/failed requirement payloads, but family-by-family rollout ownership and alert routing still need to be formalized.
3. Org preflight adapters now cover domain, billing/credits, and vertical contract requirements, but template-level requirement authoring standards need hardening before broad rollout.

## Next execution slice

1. `TCP-013` (next): operationalize per-family CI adoption, owner mapping, and alerting around the new certification evidence-ingestion contract.
