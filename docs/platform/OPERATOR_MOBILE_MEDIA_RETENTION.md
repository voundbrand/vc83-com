# Operator Mobile Media Retention

## Purpose

This document defines the explicit retention path for operator-mobile raw media:

- Voice/audio chunk ingress (`voice_transport_v1` envelopes)
- Final audio uploads (`transcribeVoiceAudio`)
- Video frame ingress (`media_session_ingress_v1` envelopes)

Retention is organization-scoped, policy-gated, and fail-closed when enabled by policy.

## Storage + Metadata Contract

Retained media records are stored in Convex table:

- `operatorMediaRetention`

Stored payload bytes are written to Convex `_storage` when retention mode is `full`.

Each record includes:

- `organizationId`
- `conversationId`
- `interviewSessionId`
- `liveSessionId`
- `mediaType`
- `mimeType`
- `sizeBytes`
- `checksum`
- `capturedAt`
- `sourceClass`
- `sourceId`
- `storageId`
- `storagePath`
- `ttlExpiresAt`
- `redaction`
- `encryption`
- `idempotencyKey`
- `policy` (`sampled`, `reason`, `failClosed`)

Primary query indexes for compliance/debug:

- `by_org_captured_at`
- `by_org_conversation_captured_at`
- `by_org_interview_captured_at`
- `by_org_live_captured_at`
- `by_org_media_type_captured_at`
- `by_org_ttl_expires_at`
- `by_org_idempotency`

## Retention Policy Controls

Environment flags:

- `OP_MEDIA_RET_ENABLED` (`true`/`false`)
- `OP_MEDIA_RET_MODE` (`off` | `metadata_only` | `full`)
- `OP_MEDIA_RET_FAIL_CLOSED` (`true`/`false`)
- `OP_MEDIA_RET_AUDIO_TTL_HOURS`
- `OP_MEDIA_RET_VIDEO_TTL_HOURS`
- `OP_MEDIA_RET_VIDEO_SAMPLE_N_FRAMES`
- `OP_MEDIA_RET_VIDEO_KEYFRAMES_ONLY`
- `OP_MEDIA_RET_REDACTION_STATUS` (`none` | `pending` | `applied`)
- `OP_MEDIA_RET_REDACTION_PROFILE_ID` (optional)
- `OP_MEDIA_RET_ENCRYPTION_MODE` (`convex_managed` | `customer_managed`)
- `OP_MEDIA_RET_ENCRYPTION_KEY_REF` (optional)

Compatibility aliases (migration only):

- Runtime also accepts legacy `OPERATOR_MEDIA_RETENTION_*` names when available.
- Convex environments enforce short env keys; prefer `OP_MEDIA_RET_*` for all deployments.

Fail-closed semantics:

- If policy requires retention and persistence fails, ingest fails with `operator_media_retention_fail_closed:*`.
- If retention is disabled, realtime behavior is unchanged.

## Web Chat Vision Runtime Observability Mapping

`WCV-103` adds deterministic attachment observability taxonomy for voice-turn freshest-frame selection.

Runtime emits a `telemetry` snapshot on voice vision frame resolution with:

- `contractVersion`: `web_chat_vision_attachment_telemetry_v1`
- `reason`: one of:
  - `attached`
  - `vision_frame_missing`
  - `vision_frame_stale`
  - `vision_policy_blocked`
  - `vision_frame_dropped_storage_url_missing`
  - `vision_frame_dropped_auth_isolation`
- `source`: `auth_gate` | `buffer` | `retention`
- `maxFrameAgeMs`
- `frameAgeMs`
- `freshnessBucket`: `age_0_2s` | `age_2_5s` | `age_5_12s` | `age_12s_plus` | `unknown`
- `counters`

Counter taxonomy:

- `vision_frame_attempt_total`
- `vision_frame_attached_total`
- `vision_frame_miss_total`
- `vision_frame_miss_reason:<reason>`
- `vision_frame_drop_total`
- `vision_frame_drop_reason:<reason>`
- `vision_frame_freshness_bucket:<bucket>`

Reason-code mapping (runtime decision -> observability reason):

- Attachment selected and URL resolved -> `attached`
- No candidate in scope -> `vision_frame_missing`
- Freshest candidate older than freshness window -> `vision_frame_stale`
- Retention/auth policy block -> `vision_policy_blocked`
- Auth isolation guard blocked before selection -> `vision_frame_dropped_auth_isolation`

## Lifecycle + Deletion

Manual delete utility:

- `api.ai.mediaRetention.deleteRetainedMedia`

Read utilities:

- `api.ai.mediaRetention.listRetainedMedia`
- `api.ai.mediaRetention.getRetainedMedia`

Automated TTL cleanup:

- Cron: `Cleanup expired operator mobile retained media`
- Handler: `internal.ai.mediaRetention.cleanupExpiredRetainedMedia`
- Behavior: marks expired rows as deleted and removes stored payload blob if present.

## Operational Runbook

### Dev

1. Set:
   - `OP_MEDIA_RET_ENABLED=true`
   - `OP_MEDIA_RET_MODE=metadata_only` (or `full` for payload storage tests)
2. Exercise:
   - `/api/v1/ai/voice/audio/frame`
   - `/api/v1/ai/voice/video/frame`
3. Verify via:
   - `npx convex run ai/mediaRetention:listRetainedMedia '{"sessionId":"<sessionId>"}'`

### Preview

1. Enable `metadata_only` first.
2. Validate ingest latency and record volume.
3. Enable `full` in targeted orgs with explicit sampling (`OP_MEDIA_RET_VIDEO_SAMPLE_N_FRAMES`).

### Prod

1. Roll out by environment variable promotion.
2. Keep `OP_MEDIA_RET_FAIL_CLOSED=true` once retention is required for compliance.
3. Monitor:
   - retention insert failures
   - TTL cleanup counts
   - storage growth by org/session/mediaType

## Gemini Consumption Path (Before vs After)

Before:

- Gemini/voice runtime consumed realtime audio/video ingress only for live processing/transcription.
- Raw payload retention was implicit/non-explicit.

After:

- Gemini/voice runtime ingest behavior stays intact for realtime processing.
- In parallel, policy-enabled retention writes explicit metadata records and optional raw bytes to org-scoped storage for audit/compliance/debug visibility.
