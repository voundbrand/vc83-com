# Integration Endpoint Migration + Provider Extension Playbook

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`  
**Date:** 2026-02-20  
**Scope:** Lane `G` (`ACE-020`)

---

## Purpose

Provide deterministic migration, backfill, incident-response, and rollback guidance for unified integration endpoint routing, then define the provider-extension path for Google and Microsoft without drifting from Slack contracts.

---

## 1) Preconditions

1. `ACE-018` and `ACE-019` are `DONE`.
2. Unified Slack ingress endpoints are live with legacy aliases preserved:
   - `/integrations/slack/events`
   - `/integrations/slack/commands`
   - `/integrations/slack/interactivity`
   - `/integrations/slack/oauth/callback`
3. Fail-closed tenant resolution is enabled (missing or ambiguous installation mapping must not route).
4. Platform-managed manifest export remains super-admin restricted.

Pre-migration verification commands:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run docs:guard
```

Any failure maps migration state to `hold`.

---

## 2) Routing and data invariants

1. Active installation routing must resolve exactly one tenant context.
2. Candidate cardinality rules:
   - `0` matches -> `missing` (reject request),
   - `>1` matches -> `ambiguous` (reject request),
   - `1` match -> route.
3. Signature verification must run against the resolved installation secret set before scheduling downstream processing.
4. Resolved tenant context must bind downstream processing (`organizationId`, `providerConnectionId`, `providerProfileType`).
5. Canonical routing keys must remain deterministic (`provider`, `workspace/team id`, optional app id).

---

## 3) Migration + backfill procedure

### Phase 0: Freeze and snapshot

1. Open a migration window and pause non-essential Slack settings edits.
2. Snapshot current active Slack OAuth connection inventory and profile split (organization vs platform).
3. Record baseline metrics:
   - webhook signature failure rate,
   - unmatched tenant routing count,
   - ambiguous tenant routing count.

### Phase 1: Backfill installation metadata

For each active Slack installation row, ensure deterministic fields are present:

1. provider identity fields:
   - `provider = slack`,
   - `providerAccountId` (team id),
   - `providerProfileType` (`organization` or `platform`).
2. route metadata fields:
   - `providerRouteKey` (or metadata equivalent),
   - `providerProfileId`.
3. secret metadata fields:
   - current signing secret candidate,
   - previous signing secret candidate (if rotation is active).
4. app metadata fields:
   - `appId` when available from OAuth payload or app config.

Backfill acceptance checks:

1. Every active Slack installation has enough metadata to participate in single-tenant resolution.
2. Any row failing metadata requirements is marked non-routable until corrected.
3. Backfill report includes counts for updated, skipped, and invalid rows.

### Phase 2: Unified ingress cutover

1. Route Slack ingress traffic through canonical `/integrations/slack/*` endpoints.
2. Keep legacy `/slack/events` and `/slack/commands` aliases active during cutover.
3. Replay canary events:
   - valid signature / valid tenant,
   - invalid signature,
   - missing tenant mapping,
   - ambiguous tenant mapping.

### Phase 3: Post-cutover validation

Run:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run docs:guard
```

Post-cutover completion criteria:

1. No cross-org routing incidents.
2. Ambiguous and missing tenant cases fail closed.
3. Signature rejection behavior remains deterministic.

---

## 4) Incident response + rollback

### Rollback triggers

Rollback to legacy mapping path if any trigger occurs:

1. confirmed cross-org message routing,
2. sustained ambiguous tenant resolution spikes,
3. sustained signature verification mismatch after deployment,
4. operator inability to recover within defined SLO.

### Rollback sequence

1. Set release state to `hold`.
2. Switch ingress routing to legacy mapping path (keep unified handlers deployed but out of active traffic).
3. Disable migration/backfill writes.
4. Restore pre-cutover metadata snapshot for affected rows when needed.
5. Re-run verification:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run docs:guard
```

6. Publish incident summary with root cause, blast radius, and remediation owner/date.
7. Re-enable unified routing only after deterministic canary replay passes.

---

## 5) Provider extension playbook (Google and Microsoft)

Provider generalization starts only after migration + rollback playbook readiness is complete.

### Step 1: Contract extension

1. Extend `IntegrationProvider` union with target provider.
2. Add canonical endpoint bundle in `resolveIntegrationEndpoints`.
3. Keep endpoint naming convention:
   - `/integrations/{provider}/oauth/callback`
   - `/integrations/{provider}/events`
   - `/integrations/{provider}/commands`
   - `/integrations/{provider}/interactivity`

### Step 2: Verification adapter

1. Implement provider-specific signature/token verification adapter.
2. Verify before tenant resolution.
3. Reject on verification failure with deterministic reason code.

### Step 3: Tenant resolver mapping

1. Map provider payload identifiers to one installation record.
2. Enforce same fail-closed cardinality contract used by Slack.
3. Bind resolved tenant context to downstream processing.

### Step 4: Role and UX parity

1. Preserve super-admin gate on platform-managed manifest export.
2. Reuse pre-manifest wizard pattern: required inputs only (workspace context + app name).
3. Keep manifest builder typed and deterministic.

### Step 5: Validation and rollout

Run:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run docs:guard
```

Promote provider rollout only if all commands pass and canary verification shows no tenant-routing ambiguity.

---

## 6) Evidence requirements

Each migration/provider rollout record must include:

1. command outcomes and timestamps,
2. backfill report (updated/skipped/invalid counts),
3. canary replay results (valid/invalid/missing/ambiguous cases),
4. final decision (`proceed`, `hold`, `rollback`),
5. rollback readiness confirmation.
