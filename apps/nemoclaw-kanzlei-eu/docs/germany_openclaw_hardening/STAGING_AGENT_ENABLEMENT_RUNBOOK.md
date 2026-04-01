# Staging Agent Enablement Runbook

Snapshot date: 2026-03-27
Scope: bring the existing Hetzner staging server (`sevenlayers-legal-eu`) to a full MVP-ready staging state with all intended agents operational.

## Decision for this phase

1. Do not provision a new server now.
2. Use the current server as real staging.
3. Move to production only after staging passes full agent and integration validation.

## Stage boundaries

1. Staging can run real MVP code and real integrations.
2. Staging must use staging credentials and staging routing.
3. Staging must not process real client production data.
4. UI remains private over SSH tunnel only.

## Protected-track boundary controls (`NCLAW-015`)

1. Deploy and promote only from app-local scripts under `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/`.
2. Do not source or copy root/main-platform `.env*` values into staging runtime for this track.
3. Keep staging SSH identity and production SSH identity separated.
4. Keep staging provider credentials scoped for staging only.
5. Keep deployment evidence in this workstream docs; do not split mutable evidence across unrelated tracks.

Pre-wave check:

1. Confirm staging sandbox name matches `sevenlayers-legal-eu`.
2. Confirm current commit was deployed through `deploy-staging.sh` from the app-local path.
3. Confirm release mode remains synthetic/internal test data only until legal gate closure.

## Phase 1: Server and runtime sanity checks

Run on staging server:

```bash
nemoclaw sevenlayers-legal-eu status
nemoclaw sevenlayers-legal-eu logs --follow
ss -ltnp | rg 18789 || true
docker ps
free -h
```

Pass criteria:
1. Sandbox status healthy.
2. No crash loop in logs.
3. Port `18789` not publicly exposed.

## Phase 2: Code source and release discipline

Use a reproducible source path on staging:

1. Point staging to your NemoClaw fork branch/tag (not ad-hoc shell edits).
2. Record deployed commit SHA in evidence docs.
3. Keep a changelog entry for every staging rollout.
4. Verify deployment came from app-local promotion pipeline env boundaries.

Suggested commands:

```bash
cd /opt/NemoClaw
git remote -v
git fetch --all --tags
git rev-parse --short HEAD
```

## Phase 3: Inference and voice bindings

Staging baseline bindings:

1. Inference: OpenRouter OpenAI-compatible endpoint (`https://openrouter.ai/api/v1`) until EU endpoint is enabled.
2. Voice: ElevenLabs staging credential path.
3. Keep all secrets only on staging host secret/env surfaces.

Validation commands:

```bash
# in staging shell
nemoclaw sevenlayers-legal-eu status
nemoclaw sevenlayers-legal-eu logs --follow
```

## Phase 4: Agent rollout waves (staging)

### Wave A: Primary intake

1. Deploy Clara law-firm intake agent assets.
2. Verify opening disclosure, intake capture, urgency handling, human escalation path.

### Wave B: Specialist/demo branches

1. Keep specialist transfer branches disabled for Clara MVP baseline.
2. Verify no live-call specialist handoff path is reachable in MVP mode.
3. Validate callback capture and async follow-up remain the only escalation pattern.

### Wave C: Deterministic follow-up work

1. Connect intake outputs to OpenClaw/NemoClaw task agents.
2. Verify task execution is policy-bounded and auditable.
3. Verify no production credentials or external unsafe tools are reachable.

## Phase 5: Staging acceptance tests (must pass)

1. Inbound call to intake line reaches Clara.
2. Callback path works end-to-end.
3. Human transfer tool works for explicit escalation.
4. Specialist telephony transfer paths remain disabled in MVP mode.
5. At least one deterministic post-intake task executes successfully.
6. Runtime logs and evidence are captured for all the above.

## Phase 6: Evidence capture and release readiness

Add artifacts after each successful staging wave:

1. Runtime status/log excerpts.
2. Agent sync/deploy evidence.
3. Test call outcomes with timestamps.
4. Known issues and mitigations.
5. Deployed commit SHA.

Store in:
1. `compliance_docs/runtime_evidence_2026-03-27_private_live.md` (append entries).
2. `compliance_docs/evidence_register.md` (update mappings).

## Promotion rule to production

Move to production only when:

1. Staging passes all wave acceptance tests.
2. `NCLAW-010` validation artifacts are complete.
3. `NCLAW-011` release package is signed.
4. Provider legal blockers are closed for customer-data mode.
5. Protected-track boundary controls remain `PASS` for Docker/Hetzner/env/CI/secrets separation.
