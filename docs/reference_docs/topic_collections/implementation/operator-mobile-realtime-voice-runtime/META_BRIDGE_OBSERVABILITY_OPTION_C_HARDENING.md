# Meta Bridge Observability Option C Hardening

## Scope

Follow-up hardening for `apps/operator-mobile` Meta bridge observability focuses on three closure risks:

1. Upload payload contract mismatch.
2. Snapshot cadence gaps while bridge is idle.
3. Export reliability when file system modules are unavailable.

## Upload Contract + Versioning

### Client contract

Mobile uploader now builds and validates a strict, typed payload before network transport:

- `contractVersion`: `meta_bridge_observability_upload_v1`
- `schemaVersion`: numeric schema marker (current `1`)
- `generatedAtMs`: upload generation timestamp
- `source`:
  - `source`: `operator_mobile`
  - `platform`: `ios | android | unknown`
  - `runtime`: `expo`
- `events`: validated `MetaBridgePersistedLogEvent[]`

Backwards compatibility is retained through parser support for legacy payloads that omitted `contractVersion`/`source`; those normalize to legacy defaults during validation.

### Retry/error semantics

Upload attempt classification is now explicit:

- Transient failures (`5xx`, `408`, `429`, transport exceptions):
  - preserve queue,
  - increment retry/backoff,
  - schedule next retry.
- Non-retryable contract/auth failures (`4xx` except `408`/`429`):
  - preserve queue (fail-closed),
  - mark attempt as permanent failure,
  - skip automatic retries unless explicitly forced (`uploadNow`).

### Backend parser/validator

A strict ingest contract boundary is available at:

- `POST /api/v1/mobile/meta-bridge-observability`
- file: `src/app/api/v1/mobile/meta-bridge-observability/route.ts`

Behavior:

- optional API key validation (`META_BRIDGE_LOG_UPLOAD_API_KEY` / fallback env),
- strict payload parse + validation via shared contract parser,
- clear `400` contract errors for malformed payloads,
- `202` acceptance response for valid payloads.

## Idle Snapshot Strategy + Dedupe

Snapshot capture is no longer solely update-driven.

`MetaBridgeObservabilityService` now:

- tracks the latest observed snapshot,
- runs periodic capture timer while app state is `active` and persistent capture is enabled,
- pauses timer in background, resumes on foreground,
- enforces bounded cadence via `EXPO_PUBLIC_META_BRIDGE_SNAPSHOT_INTERVAL_MS`,
- dedupes unchanged snapshots using content fingerprinting,
- keeps writes non-blocking through existing mutation queue + debounced persistence.

This keeps network/storage bounded while ensuring bridge-idle windows still produce periodic observability evidence when state changes.

## Export Fallback Chain

Export behavior now uses deterministic fallback order:

1. file export + file share (`expo-file-system` + `expo-sharing`),
2. JSON text share (`react-native` `Share`),
3. clipboard JSON fallback (`expo-clipboard`).

Every branch returns explicit `ok/strategy/reason` semantics to avoid crashes and preserve clear user-facing outcomes.
