# Local to Production Promotion Runbook

Snapshot date: 2026-03-27

## Goal

Define one deterministic path:

1. Build and test locally.
2. Deploy exact commit to staging (`sevenlayers-legal-eu`).
3. Promote tagged release to production (separate server).

This keeps staging and production reproducible and avoids ad-hoc shell drift.

## Protected track separation contract (`NCLAW-015`)

This runbook is valid only for the DSGVO-separated deployment root:
`apps/nemoclaw-kanzlei-eu`.

Boundary rules:

1. Docker/runtime templates come only from `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu`.
2. Promotion commands come only from `apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts`.
3. Track env/secrets (`pipeline.env`, staging/prod SSH keys, provider keys) are isolated from root/main-platform `.env*` files.
4. Staging and production identities are separated (`*_SSH_TARGET`, `*_SSH_KEY`, sandbox names).
5. Production promotions remain tag-only and require release gate closure.

Forbidden actions:

1. Do not run production promotion from untagged refs.
2. Do not source root-level env files for this track.
3. Do not re-use main-platform mutable credentials in this runbook.
4. Do not point staging and production to the same mutable host identity.

## Source and branch contract

1. Develop in your fork of NemoClaw (`NEMOCLAW_FORK_URL`), not directly on NVIDIA upstream.
2. Use `feature/*` branches for implementation.
3. Deploy to staging by commit.
4. Deploy to production only by tag (`vX.Y.Z`).
5. Never deploy production from untagged `main`.

## One-time setup

1. Copy:
   `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env.example`
   to:
   `/Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env`
2. Fill real values:
   - fork URL
   - staging SSH target/key
   - production SSH target/key
3. Keep `pipeline.env` uncommitted.
4. Confirm `pipeline.env` defines separate staging/prod SSH target + key values.
5. Confirm local repo path points to `apps/nemoclaw-kanzlei-eu/repos/NemoClaw`.

## Preflight boundary checks (before every rollout)

```bash
test -f apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env
test -x apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh
test -x apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/promote-prod.sh
```

Operator checks:

1. Staging/prod targets are not the same server identity.
2. Staging uses staging credentials only.
3. Production uses production credentials only.
4. Release decision remains `NO_GO` for external client data unless `NCLAW-011` is signed.

## Local development loop

Use local OpenClaw Docker for fast iteration:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/local-openclaw-dev.sh up
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/local-openclaw-dev.sh ps
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/local-openclaw-dev.sh logs
```

Stop when done:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/local-openclaw-dev.sh down
```

## Staging deployment

Deploy exact ref/commit to the existing Hetzner staging server:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh --ref feature/your-change
```

Optional explicit env-file form:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh \
  --ref feature/your-change \
  --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env
```

What this does:

1. Resolves immutable commit from local repo.
2. Syncs `/opt/NemoClaw` on staging from your fork.
3. Checks out exact commit.
4. Refreshes global `nemoclaw` CLI from that source.
5. Stores deployment stamp on server at `/opt/nemoclaw-deploy-history/staging-last.txt`.

Then run on staging host:

```bash
cd /opt/NemoClaw
nemoclaw sevenlayers-legal-eu status
nemoclaw sevenlayers-legal-eu logs
```

Re-run `nemoclaw onboard` only when policy/config/runtime rebuild is needed.

## Production promotion

Create and push release tag from local fork:

```bash
git -C /Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw tag v0.1.0
git -C /Users/foundbrand_001/Development/vc83-com/apps/nemoclaw-kanzlei-eu/repos/NemoClaw push origin v0.1.0
```

Promote that tag to production:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/promote-prod.sh --tag v0.1.0
```

Optional explicit env-file form:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/promote-prod.sh \
  --tag v0.1.0 \
  --env-file apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/pipeline.env
```

What this does:

1. Verifies `refs/tags/v0.1.0` exists locally.
2. Resolves commit behind the tag.
3. Syncs exact commit to prod target directory.
4. Refreshes global `nemoclaw` CLI from that source.
5. Stores deployment stamp on server at `/opt/nemoclaw-deploy-history/prod-last.txt`.

## Rollback

Staging rollback:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/deploy-staging.sh --ref <previous-commit-or-tag>
```

Production rollback:

```bash
apps/nemoclaw-kanzlei-eu/deploy/openclaw_hetzner_eu/scripts/promote-prod.sh --tag <previous-release-tag>
```

## Evidence checklist per deployment

1. Git ref and resolved commit.
2. `nemoclaw <sandbox> status` output snapshot.
3. `nemoclaw <sandbox> logs` snapshot.
4. Deployment stamp file (`staging-last.txt` or `prod-last.txt`).
5. Release decision note (`GO` or `NO_GO`) in workstream docs.
