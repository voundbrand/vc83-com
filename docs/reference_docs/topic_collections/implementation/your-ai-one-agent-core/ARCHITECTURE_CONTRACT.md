# Your AI One-Agent Core Architecture Contract

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core`  
**Last updated:** 2026-02-24  
**Purpose:** Lock the runtime contract for "one trusted primary voice with delegated specialist capability" before additional runtime expansion.

---

## Contract objective

Define how one operator interacts with one main agent while the platform safely composes and delegates specialist capability under the hood.

---

## Core model

1. **One face, many hands:** the operator's default experience is one persistent primary agent voice.
2. **Primary as orchestrator:** the primary agent can delegate to specialists or specialist soul/tool profiles without breaking continuity.
3. **Specialists as capability layer:** specialists are generally runtime collaborators, not always separate user-facing personas.

---

## Normative invariants (must hold)

1. **Single primary per operator context:** exactly one `PRIMARY` agent exists for each `(operatorId, organizationId)` context.
2. **Birthing default assignment:** the first birthed agent for a new operator context is auto-assigned as `PRIMARY`.
3. **Explicit reassignment path:** primary reassignment is only allowed via an explicit transactional operation (`setPrimaryAgent` contract).
4. **Primary execution authority:** mutating actions execute through primary-agent trust/policy gates even when specialists contribute reasoning.
5. **Interview-born core identity:** core soul identity remains interview-origin and immutable; overlays do not silently replace core identity anchors.
6. **Bounded overlay composition:** archetype/mode/capability overlays are additive, policy-bounded, and provenance-stamped.
7. **Default single-voice UX:** specialist delegation is invisible by default unless the operator explicitly requests direct/meeting participation.
8. **Auditability:** every delegation and mutation records provenance (which profile/specialist/tool influenced the result).

---

## Midwife + AGP composition contract

When AGP seed/wiring is complete, Midwife runtime composition must follow this order:

1. Ingest operator interview outputs (5-block birthing contract + identity anchors).
2. Retrieve candidate soul/tool profiles from seeded catalogs (agent product catalog, tool requirement matrix, soul seed library, ACR metadata).
3. Rank candidates against interview intent and policy constraints.
4. Compose a born agent profile:
   - preserve interview-origin core identity,
   - attach selected overlays/capabilities,
   - permit bounded blends or net-new blend generation when coverage gaps exist.
5. Persist provenance links for each selected/generated blend input.

Midwife composition must be **hybrid**: not "blank from scratch" and not "template overwrite."

---

## Primary-agent lifecycle contract

### Create flow

1. Birth agent via Midwife interview contract.
2. If no existing primary in context, assign new agent as `PRIMARY`.
3. If primary already exists, new agent is non-primary until explicitly promoted.

### Reassignment flow (`setPrimaryAgent`)

1. Validate operator membership and permission in context.
2. Validate target agent status (`ACTIVE`, policy-compliant).
3. Transactionally demote old primary and promote target.
4. Emit audit event with actor, reason, and timestamp.

### Safety rules

1. Never allow two concurrent primaries in same context.
2. Never allow zero primary after successful reassignment.
3. If reassignment fails mid-flight, rollback to previous valid primary.

---

## Voice and delegation modes

1. `invisible` (default): primary speaks; specialists influence internally.
2. `direct`: specialist may speak directly when explicitly requested/allowed.
3. `meeting`: multi-voice session allowed, but primary remains orchestration anchor.

Product default remains **single primary voice continuity**.

---

## Tooling and policy contract

1. Tool permissions derive from capability profiles plus runtime policy/trust gates.
2. Delegated specialist execution never bypasses primary approval/autonomy constraints.
3. Sensitive archetypes and private-mode restrictions continue to constrain available tools and response style.

---

## Non-goals

1. No unrestricted "merge all souls" strategy.
2. No silent replacement of interview-born identity with catalog templates.
3. No specialist direct-write bypass around primary authority.

---

## Acceptance criteria for this contract

1. Runtime supports one-primary invariant enforcement.
2. Runtime supports explicit primary reassignment semantics.
3. Midwife can compose from seeded catalog profiles with provenance.
4. Default UX keeps one voice while still enabling internal specialist delegation.

