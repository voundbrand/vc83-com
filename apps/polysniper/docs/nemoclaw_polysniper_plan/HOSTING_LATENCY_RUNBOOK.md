# Polysniper Hosting Latency Runbook

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan`  
**Tools:**  
`/Users/foundbrand_001/Development/vc83-com/apps/polysniper/server/tools/polymarket-latency-benchmark.mjs`  
`/Users/foundbrand_001/Development/vc83-com/apps/polysniper/server/tools/hostinger-vps-discovery.mjs`

---

## Goal

Pick the deployment region with the best stable latency to Polymarket-critical endpoints using the same benchmark from each candidate host.

Primary target decision metric:

1. Lowest stable `p95` latency to `clob.polymarket.com`.
2. Low jitter (`p95 - p50`), not only low average.
3. No significant probe failure rate.

---

## Endpoints measured

1. `https://clob.polymarket.com/`
2. `https://gamma-api.polymarket.com/`
3. `https://ws-subscriptions-clob.polymarket.com/` (HTTPS edge probe)

---

## Local baseline (from this machine)

```bash
node apps/polysniper/server/tools/polymarket-latency-benchmark.mjs \
  --iterations 12 \
  --timeout-ms 6000 \
  --delay-ms 100 \
  --output apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/latency/LOCAL_BASELINE_2026-03-28.json
```

---

## Hostinger region benchmark process

### Step 1: Discover available Hostinger VPS locations via API

```bash
set -a; source apps/polysniper/env.local; set +a
HOSTINGER_API_TOKEN="$HOSTINGER_API_KEY" \
node apps/polysniper/server/tools/hostinger-vps-discovery.mjs \
  --include-catalog \
  --output apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/latency/HOSTINGER_DISCOVERY.json
```

Use the resulting data-center IDs/cities as your candidate region set.

Current discovered IDs (2026-03-28): `bos=17`, `fra=19`, `int=15`, `bnk=11`, `fast=18`, `asc=14`, `cam=22`, `mum2=23`, `dci=20`, `kul=21`.

### Step 2: Run benchmark on each Hostinger candidate VPS

Run the same benchmark command on each candidate VPS, changing only host label and output filename.

Example per-host command:

```bash
PSNP_BENCH_HOST_LABEL="hostinger-us-candidate-1" \
node apps/polysniper/server/tools/polymarket-latency-benchmark.mjs \
  --iterations 40 \
  --timeout-ms 6000 \
  --delay-ms 120 \
  --output apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/latency/HOSTINGER_US_CANDIDATE_1.json
```

Repeat for every candidate region.

---

## Selection algorithm

1. Filter out any candidate where `failureCount > 0` for `clob_api` in normal conditions.
2. Sort remaining candidates by `clob_api.p95Ms` ascending.
3. Break ties with lower jitter (`clob_api.p95Ms - clob_api.p50Ms`).
4. Use `gamma_api.p95Ms` as secondary tie-breaker.
5. Keep the winner only if all endpoint probes are consistently successful.

---

## Acceptance thresholds

Use these practical thresholds for initial selection:

1. `clob_api.p95Ms <= 220`
2. `gamma_api.p95Ms <= 260`
3. Failure rate `0%` during benchmark run

If no candidate meets thresholds, choose the lowest stable `p95` and keep live mode gated at reduced risk caps.

---

## Evidence artifacts

Store all outputs in:

`/Users/foundbrand_001/Development/vc83-com/apps/polysniper/docs/nemoclaw_polysniper_plan/evidence/latency/`

Expected files:

1. One JSON report per candidate host
2. `HOSTINGER_DISCOVERY.json` from API discovery
3. One selection summary note (added to `INDEX.md` or `TASK_QUEUE.md` notes)
