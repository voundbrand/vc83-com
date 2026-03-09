import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildOperatorMediaRetentionWriteRequest,
  resolveOperatorMediaRetentionConfig,
  resolveOperatorMediaRetentionDecision,
} from "../../../convex/ai/mediaRetention";

const ORG_ID = "org_retention_policy_1" as Id<"organizations">;
const INTERVIEW_ID = "interview_retention_policy_1" as Id<"agentSessions">;

describe("operator media retention policy", () => {
  it("fails closed to disabled when enable flag is false", () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "false",
      OPERATOR_MEDIA_RETENTION_MODE: "full",
    });
    const decision = resolveOperatorMediaRetentionDecision({
      config,
      mediaType: "audio_chunk",
      sourceSequence: 1,
    });
    expect(decision).toMatchObject({
      enabled: false,
      mode: "off",
      shouldPersistMetadata: false,
      shouldPersistPayload: false,
      failClosed: false,
      reason: "retention_disabled",
    });
  });

  it("persists payload bytes in full mode", () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "true",
      OPERATOR_MEDIA_RETENTION_MODE: "full",
      OPERATOR_MEDIA_RETENTION_AUDIO_TTL_HOURS: "6",
    });
    const decision = resolveOperatorMediaRetentionDecision({
      config,
      mediaType: "audio_chunk",
      sourceSequence: 7,
    });
    expect(decision.enabled).toBe(true);
    expect(decision.mode).toBe("full");
    expect(decision.shouldPersistMetadata).toBe(true);
    expect(decision.shouldPersistPayload).toBe(true);
    expect(decision.failClosed).toBe(true);
    expect(decision.ttlMs).toBe(6 * 60 * 60 * 1000);
  });

  it("supports metadata-only mode", () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "true",
      OPERATOR_MEDIA_RETENTION_MODE: "metadata_only",
      OPERATOR_MEDIA_RETENTION_FAIL_CLOSED: "false",
    });
    const decision = resolveOperatorMediaRetentionDecision({
      config,
      mediaType: "audio_final",
      sourceSequence: 12,
    });
    expect(decision.enabled).toBe(true);
    expect(decision.mode).toBe("metadata_only");
    expect(decision.shouldPersistMetadata).toBe(true);
    expect(decision.shouldPersistPayload).toBe(false);
    expect(decision.failClosed).toBe(false);
  });

  it("applies video sampling policy", () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "true",
      OPERATOR_MEDIA_RETENTION_MODE: "full",
      OPERATOR_MEDIA_RETENTION_VIDEO_SAMPLE_EVERY_N_FRAMES: "4",
    });
    const skipped = resolveOperatorMediaRetentionDecision({
      config,
      mediaType: "video_frame",
      sourceSequence: 3,
    });
    expect(skipped.shouldPersistMetadata).toBe(false);
    expect(skipped.shouldPersistPayload).toBe(false);
    expect(skipped.sampled).toBe(false);
    expect(skipped.reason).toBe("video_sampling_skip_every_4");

    const kept = resolveOperatorMediaRetentionDecision({
      config,
      mediaType: "video_frame",
      sourceSequence: 8,
    });
    expect(kept.shouldPersistMetadata).toBe(true);
    expect(kept.shouldPersistPayload).toBe(true);
    expect(kept.sampled).toBe(true);
  });

  it("builds deterministic write requests with ttl and idempotency key", () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "true",
      OPERATOR_MEDIA_RETENTION_MODE: "metadata_only",
      OPERATOR_MEDIA_RETENTION_AUDIO_TTL_HOURS: "1",
    });
    const capturedAt = 1_710_000_123_456;
    const request = buildOperatorMediaRetentionWriteRequest({
      config,
      organizationId: ORG_ID,
      interviewSessionId: INTERVIEW_ID,
      liveSessionId: "live_retention_policy_1",
      mediaType: "audio_chunk",
      mimeType: "audio/webm",
      capturedAt,
      sourceSequence: 22,
      voiceSessionId: "voice_retention_policy_1",
      payloadBase64: "AQID",
    });
    expect(request).not.toBeNull();
    expect(request?.retentionMode).toBe("metadata_only");
    expect(request?.ttlExpiresAt).toBe(capturedAt + (60 * 60 * 1000));
    expect(request?.idempotencyKey).toContain("operator_media_retention_v1");
    expect(request?.policy.reason).toBe("retention_metadata_only");
  });
});
