# Tool Foundry Integrity Contract (Fail-Closed)

## Contract summary

Backend Tool Foundry operations now enforce a hard fail-closed contract:

1. `register`, `publish`, `promote`, and `deprecate` require `super_admin`.
2. Core tool IDs/classes are immutable at runtime.
3. Mutating tool classes require explicit approval metadata with `state="approved"`.
4. Unknown role, unknown class, missing class policy, missing/malformed approval metadata, and alias override attempts are denied.

## Enforcement points

1. `convex/ai/toolFoundry/integrity.ts`
   - Canonical class policy map (`TOOL_FOUNDRY_CLASS_POLICY_MAP`)
   - Immutable core allowlist (`CORE_TOOL_CLASS_ALLOWLIST`)
   - Alias canonicalization and alias-override block
   - Stable denial codes (`TF_*`)
2. `convex/ai/toolFoundry/admin.ts`
   - Enforced backend mutations for `register/publish/promote/deprecate`
   - Super-admin check + mutating approval gate + core immutability checks
3. `convex/ai/toolFoundry/proposalBacklog.ts`
   - Internal promotion decision mutation requires `actorUserId` and super-admin role.
   - Session-authenticated caller mutation (`submitProposalPromotionDecision`) provides direct UI/integration wiring path.
4. `tests/unit/ai/toolFoundryGovernance.test.ts`
   - Guards immutable-core governance by ensuring `CRITICAL_TOOL_NAMES` remain covered by `CORE_TOOL_CLASS_ALLOWLIST`.

## Threat model (what this blocks)

1. Privilege escalation via non-super-admin Tool Foundry writes.
2. Runtime drift by modifying/removing/overriding core tool definitions.
3. Approval bypass for mutating classes.
4. Allowlist bypass using alias spellings of core tool IDs.
5. Silent permissive behavior on malformed/missing policy inputs.
