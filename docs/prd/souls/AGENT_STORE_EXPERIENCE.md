# One-of-One Operator Experience Contract

**Status:** Active under one-visible-operator cutover (`LOC-006`)  
**Last updated:** 2026-02-26

This document replaces legacy Agent Store marketplace UX assumptions.

The product-facing default is a single primary Life Operator with hidden specialist routing, deterministic capability boundaries, and fail-closed trust behavior.

Canonical alignment sources:

1. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/BEHAVIORAL_SYSTEM_CONTRACT.md`
2. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/AGENT_PRODUCT_CATALOG.md`
3. `/Users/foundbrand_001/Development/vc83-com/docs/prd/souls/CAPABILITY_PACK_TAXONOMY.md`
4. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/MASTER_PLAN.md`

---

## Positioning Lock

1. The operator does not browse or shop a public marketplace by default.
2. The operator interacts with one visible personal assistant surface.
3. Specialist depth is selected by policy-governed runtime routing, not explicit persona shopping.
4. Capability boundaries are communicated as deterministic `available_now` vs `blocked` outcomes with unblocking steps.

---

## UX Contract

1. Primary creation flow is one-operator-first.
2. Hidden specialist orchestration may run behind the scenes where policy allows.
3. External mutations remain approval-governed and trust-audited.
4. Unknown scope/policy prerequisites fail closed.

---

## De-scoped Legacy Patterns

The following legacy patterns are explicitly non-default and treated as deprecated under one-of-one cutover:

1. public catalog shopping as the primary entrypoint,
2. clone-first identity creation as the default onboarding behavior,
3. operator-commerce merchandising as a core UX narrative.

Compatibility behavior (if ever re-enabled) must remain policy-gated and off by default.
