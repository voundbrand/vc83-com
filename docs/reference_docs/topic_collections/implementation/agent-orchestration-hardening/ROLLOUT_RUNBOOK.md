# Agent Orchestration Hardening Rollout Runbook (AOH-011)

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-orchestration-hardening`  
**Scope:** one-of-one orchestrator shell + curated specialist runtime hardening (`AOH-001`..`AOH-014`).

---

## Governance guardrails

1. Keep one-of-one authority semantics anchored to primary authority agent.
2. Keep specialist/runtime scope fail-closed when required contracts are removed.
3. Keep cross-org enrichment default-off unless explicit personal-workspace opt-in is enabled.
4. Keep action-completion truthfulness contracts in observe/enforce modes by template policy.
5. No rollout step may bypass org/session/channel scope boundaries.

Authoritative code surfaces:

- `convex/ai/agentExecution.ts`
- `convex/ai/toolScoping.ts`
- `convex/ai/teamHarness.ts`
- `convex/lib/layerScope.ts`
- `convex/ai/agentSessions.ts`

---

## Rollout control matrix

| Control | Location | Expected production default | Rollback-safe state |
|---|---|---|---|
| `teamAccessMode` | agent runtime config (`customProperties`) | `invisible` | keep `invisible`; avoid `direct`/`meeting` during incident containment |
| `requiredTools` / `requiredCapabilities` | curated specialist clone metadata + authority runtime contract | populated for curated specialists | keep populated; do not remove to “unblock” incidents |
| `crossOrgPersonalWorkspaceReadOnlyOptIn` (or `crossOrgEnrichment.personalWorkspaceReadOnlyOptIn`) | authority runtime config (`customProperties`) | `false` unless explicit personal-workspace approval | set `false` immediately |
| `actionCompletionContract.mode` | template/agent runtime contract | `observe` or `enforce` by template policy | set to `observe` for degraded mode; avoid `off` except explicit emergency decision |
| `useToolBroker` | authority runtime config (`customProperties`) | template-specific | set `false` if broker behavior is implicated in incidents |

Operational note: these controls are runtime config/metadata controls, not a separate parallel policy system.

---

## Staged rollout plan

| Stage | Traffic scope | Exit criteria |
|---|---|---|
| `R0` | internal/super-admin orgs only | `docs:guard`, `typecheck`, and unit suites pass; no scope-violation incidents |
| `R1` | 10-25% eligible orgs | 24h without Sev1/Sev2 policy incidents; no cross-org leakage findings |
| `R2` | 50-75% eligible orgs | stable delegation/scope telemetry and no required-scope bypass findings |
| `R3` | 100% rollout | 7-day stable window, no unresolved rollback-trigger events |

---

## Rollback triggers

Immediate rollback to safe defaults is required if any occur:

1. Cross-org enrichment appears without explicit opt-in.
2. Cross-tenant data access is observed or suspected in specialist/query paths.
3. Required-scope contracts are bypassed and user-visible failures are hidden.
4. Authority/speaker invariants allow mutating execution outside primary authority.
5. Action-completion enforcement emits sustained false positives impacting operations.

---

## Emergency rollback actions

1. Disable cross-org enrichment:
   - set `crossOrgPersonalWorkspaceReadOnlyOptIn=false` (and nested `crossOrgEnrichment.personalWorkspaceReadOnlyOptIn=false` if present).
2. Force low-risk specialist behavior:
   - keep `teamAccessMode=invisible`.
   - keep `requiredTools`/`requiredCapabilities` intact.
3. Reduce completion enforcement pressure if needed:
   - set `actionCompletionContract.mode=observe` for affected templates.
4. Disable broker mediation if implicated:
   - set `useToolBroker=false` on affected runtime configs.
5. Confirm telemetry reflects rollback state:
   - `message_processed.actionData.crossOrgEnrichment.allowed=false` for non-opted sessions.
   - no new incidents of `required_scope_contract_blocked` bypass.

---

## Support playbook

### Incident triage checklist

1. Capture org/session/turn identifiers and impacted channel.
2. Pull latest `message_processed` action payload and review:
   - `toolScoping`
   - `crossOrgEnrichment`
   - `actionCompletion`
3. Confirm whether issue is policy decision, runtime config drift, or data-path bug.
4. Apply rollback actions above before any risky config broadening.
5. Document decision and owner in incident timeline.

### Post-incident review checklist

1. Verify deterministic reason codes exist for denied paths.
2. Verify no temporary overrides remain active.
3. Add/update regression tests for the incident class.
4. Re-run verification profiles before re-expanding rollout:
   - `npm run docs:guard`
   - `npm run typecheck`

