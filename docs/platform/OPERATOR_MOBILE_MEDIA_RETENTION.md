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

- `OPERATOR_MEDIA_RETENTION_ENABLED` (`true`/`false`)
- `OPERATOR_MEDIA_RETENTION_MODE` (`off` | `metadata_only` | `full`)
- `OPERATOR_MEDIA_RETENTION_FAIL_CLOSED` (`true`/`false`)
- `OPERATOR_MEDIA_RETENTION_AUDIO_TTL_HOURS`
- `OPERATOR_MEDIA_RETENTION_VIDEO_TTL_HOURS`
- `OPERATOR_MEDIA_RETENTION_VIDEO_SAMPLE_EVERY_N_FRAMES`
- `OPERATOR_MEDIA_RETENTION_VIDEO_KEYFRAMES_ONLY`
- `OPERATOR_MEDIA_RETENTION_REDACTION_STATUS` (`none` | `pending` | `applied`)
- `OPERATOR_MEDIA_RETENTION_REDACTION_PROFILE_ID` (optional)
- `OPERATOR_MEDIA_RETENTION_ENCRYPTION_MODE` (`convex_managed` | `customer_managed`)
- `OPERATOR_MEDIA_RETENTION_ENCRYPTION_KEY_REF` (optional)

Fail-closed semantics:

- If policy requires retention and persistence fails, ingest fails with `operator_media_retention_fail_closed:*`.
- If retention is disabled, realtime behavior is unchanged.

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
   - `OPERATOR_MEDIA_RETENTION_ENABLED=true`
   - `OPERATOR_MEDIA_RETENTION_MODE=metadata_only` (or `full` for payload storage tests)
2. Exercise:
   - `/api/v1/ai/voice/audio/frame`
   - `/api/v1/ai/voice/video/frame`
3. Verify via:
   - `npx convex run ai/mediaRetention:listRetainedMedia '{"sessionId":"<sessionId>"}'`

### Preview

1. Enable `metadata_only` first.
2. Validate ingest latency and record volume.
3. Enable `full` in targeted orgs with explicit sampling (`VIDEO_SAMPLE_EVERY_N_FRAMES`).

### Prod

1. Roll out by environment variable promotion.
2. Keep `OPERATOR_MEDIA_RETENTION_FAIL_CLOSED=true` once retention is required for compliance.
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
