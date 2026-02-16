# Four-Layer Platform Model (Canonical)

> Single source of truth for layer terminology across the platform.

---

## Purpose

This document defines the official layer taxonomy for the platform and prevents terminology drift.

Use this whenever you design or review:
- org hierarchy and tenancy boundaries
- tool/runtime policy enforcement
- AI memory and context composition

---

## Rule 1: We Have Three Different Layer Systems

These are separate systems and must never be mixed:

1. `BusinessLayer` (tenant/value chain)
2. `PolicyLayer` (runtime enforcement)
3. `MemoryLayer` (context composition)

Always name layers with their type, for example:
- `Business L3`
- `Policy L2`
- `Memory L4`

Never say only "Layer 2" without the type.

---

## BusinessLayer (Canonical)

### Business L1: Platform

Platform-owned system scope.

- System org and system agents
- Platform governance, defaults, and global controls

### Business L2: Agency (Org Owner)

Top-level customer organization.

- `organizations.parentOrganizationId` is not set
- Owns client/sub-org operations

### Business L3: Sub-org (Agency Customer)

Client organization under an agency.

- `organizations.parentOrganizationId` points to the L2 agency org
- Receives delegated operations and can run its own agents

### Business L4: End-customer

The external person/entity served by L3 agents.

- This is an actor in conversations and workflows
- This is not a deeper `organizations` nesting level

### Current Data-Model Constraint

Only one parent-child org level is supported today.

- L2 -> L3 is supported
- L3 -> L4 org nesting is not supported
- Business L4 is represented as external contacts/session participants, not org records

---

## PolicyLayer (Canonical)

Policy resolution order is always:

`Policy L1 Platform -> Policy L2 Org -> Policy L3 Agent -> Policy L4 Session`

Core rule:
- most-restrictive-wins
- each lower layer can remove permissions, not grant back removed permissions

Primary usage:
- tool exposure
- approval requirements
- runtime safety constraints
- channel/session-level temporary restrictions

---

## MemoryLayer (Canonical)

Memory composition order follows the five-layer architecture:

1. `Memory L1` Recent context (verbatim)
2. `Memory L2` Session summary (compression)
3. `Memory L3` Operator pinned notes
4. `Memory L4` Contact profile memory (structured facts)
5. `Memory L5` Reactivation context

This layer system is independent from business tenancy and runtime policy layers.

---

## Non-Negotiable Invariants

1. Tenant isolation is enforced by effective org scope on every query/action.
2. Child org access never bypasses parent plan and sharing constraints.
3. Policy resolution is subtractive across platform/org/agent/session.
4. End-customer conversations must not leak platform/agency internal context.
5. Platform model availability is control-plane governed, not ad-hoc runtime strings.

---

## Anchor References

Runtime anchors for this model:

- `convex/ai/harness.ts`
- `convex/lib/layerScope.ts`
- `convex/organizations.ts`
- `convex/api/v1/subOrganizationsInternal.ts`
- `convex/ai/toolScoping.ts`
- `convex/middleware/auth.ts`
- `docs/agentic_system/MEMORY_ENGINE_DESIGN.md`

---

## Checklist for New Architecture Work

Before approving any new feature, confirm:

1. Business layer impact is explicit (`Business L1-L4`).
2. Policy enforcement points are explicit (`Policy L1-L4`).
3. Memory composition impact is explicit (`Memory L1-L5`, if applicable).
4. Tenant boundaries are explicit (effective org scope).
5. No terminology conflict with this document.

If any item is missing, the design is not architecture-complete.
