import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildOperatorMediaRetentionWriteRequest,
  materializeOperatorMediaRetentionPayload,
  resolveEffectiveOperatorMediaRetentionMode,
  resolveOperatorMediaRetentionConfig,
} from "../../../convex/ai/mediaRetention";

const ORG_ID = "org_retention_ingest_1" as Id<"organizations">;
const INTERVIEW_ID = "interview_retention_ingest_1" as Id<"agentSessions">;
const CONVERSATION_ID = "conversation_retention_ingest_1" as Id<"aiConversations">;

describe("operator media retention ingest linkage", () => {
  it("links voice frame ingest payload to deterministic retention metadata", async () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "true",
      OPERATOR_MEDIA_RETENTION_MODE: "full",
      OPERATOR_MEDIA_RETENTION_AUDIO_TTL_HOURS: "2",
    });
    const request = buildOperatorMediaRetentionWriteRequest({
      config,
      organizationId: ORG_ID,
      conversationId: CONVERSATION_ID,
      interviewSessionId: INTERVIEW_ID,
      liveSessionId: "live_retention_ingest_1",
      mediaType: "audio_chunk",
      mimeType: "audio/webm",
      capturedAt: 1_710_100_000_111,
      sourceClass: "iphone_microphone",
      sourceId: "ios_avfoundation_primary_mic",
      sourceSequence: 14,
      voiceSessionId: "voice_retention_ingest_1",
      payloadBase64: "AQIDBAUG",
      metadata: {
        eventType: "audio_chunk",
        transportMode: "websocket",
      },
    });

    expect(request).not.toBeNull();
    expect(request?.retentionMode).toBe("full");
    expect(request?.ttlExpiresAt).toBe(1_710_100_000_111 + (2 * 60 * 60 * 1000));

    const materialized = await materializeOperatorMediaRetentionPayload({
      organizationId: ORG_ID,
      liveSessionId: request!.liveSessionId,
      mediaType: request!.mediaType,
      capturedAt: request!.capturedAt,
      mimeType: request!.mimeType,
      payloadBase64: request!.payloadBase64,
    });

    expect(materialized.sizeBytes).toBe(6);
    expect(materialized.checksum.length).toBeGreaterThanOrEqual(16);
    expect(materialized.storagePath).toContain("operator_mobile_media_retention");
    expect(materialized.storagePath).toContain("audio_chunk");
    expect(materialized.storagePath).toContain("live_retention_ingest_1");
  });

  it("applies video frame sampling before building retention write request", async () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "true",
      OPERATOR_MEDIA_RETENTION_MODE: "metadata_only",
      OPERATOR_MEDIA_RETENTION_VIDEO_SAMPLE_EVERY_N_FRAMES: "3",
    });

    const skipped = buildOperatorMediaRetentionWriteRequest({
      config,
      organizationId: ORG_ID,
      interviewSessionId: INTERVIEW_ID,
      liveSessionId: "live_retention_ingest_2",
      mediaType: "video_frame",
      mimeType: "image/jpeg",
      capturedAt: 1_710_100_000_222,
      sourceSequence: 2,
      videoSessionId: "video_retention_ingest_2",
      payloadBase64: "AAEC",
    });
    expect(skipped).toBeNull();

    const kept = buildOperatorMediaRetentionWriteRequest({
      config,
      organizationId: ORG_ID,
      interviewSessionId: INTERVIEW_ID,
      liveSessionId: "live_retention_ingest_2",
      mediaType: "video_frame",
      mimeType: "image/jpeg",
      capturedAt: 1_710_100_000_333,
      sourceSequence: 3,
      videoSessionId: "video_retention_ingest_2",
      payloadBase64: "AAEC",
    });
    expect(kept).not.toBeNull();
    expect(kept?.retentionMode).toBe("metadata_only");

    const materialized = await materializeOperatorMediaRetentionPayload({
      organizationId: ORG_ID,
      liveSessionId: kept!.liveSessionId,
      mediaType: kept!.mediaType,
      capturedAt: kept!.capturedAt,
      mimeType: kept!.mimeType,
      payloadBase64: kept!.payloadBase64,
    });
    expect(materialized.storagePath).toContain("video_frame");
    expect(materialized.sizeBytes).toBe(3);
  });

  it("maps disabled retention to off mode for fail-closed vision policy decisions", () => {
    const config = resolveOperatorMediaRetentionConfig({
      OPERATOR_MEDIA_RETENTION_ENABLED: "false",
      OPERATOR_MEDIA_RETENTION_MODE: "full",
    });
    expect(resolveEffectiveOperatorMediaRetentionMode(config)).toBe("off");
  });
});
