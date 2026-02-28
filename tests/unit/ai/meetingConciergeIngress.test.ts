import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildInboundMeetingConciergeRuntimeContext,
  resolveInboundMeetingConciergeIntent,
} from "../../../convex/ai/agentExecution";
import {
  buildMobileSourceAttestationChallenge,
  computeMobileSourceAttestationSignature,
  MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
} from "../../../convex/ai/mobileRuntimeHardening";

const ORG_ID = "org_1" as Id<"organizations">;
const PREVIEW_COMMAND_POLICY = {
  contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
};

describe("mobile meeting concierge ingress intent", () => {
  it("assembles preview payload from voice/camera context with deterministic idempotency", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please line up a 45 minute meeting with Jordan at jordan@example.com next week.",
      metadata: {
        liveSessionId: "live_session_1",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript:
            "This is Jordan Lee from Northstar. Use jordan@example.com and +1 (415) 555-1234.",
        },
        cameraRuntime: {
          detectedText: "Meeting intake",
        },
      },
      now: 1_701_000_000_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.extractedPayloadReady).toBe(true);
    expect(intent.autoTriggerPreview).toBe(true);
    expect(intent.missingRequiredFields).toEqual([]);
    expect(intent.payload).toMatchObject({
      personEmail: "jordan@example.com",
      personPhone: "+1 (415) 555-1234",
      meetingDurationMinutes: 45,
      confirmationChannel: "sms",
    });
    expect(intent.payload?.conciergeIdempotencyKey.startsWith("mobile_concierge:")).toBe(
      true
    );
  });

  it("keeps preview command policy allowlisted when explicit confirm is present", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Go ahead and book it with Jordan at jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_confirm_1",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      now: 1_701_000_100_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.extractedPayloadReady).toBe(true);
    expect(intent.autoTriggerPreview).toBe(true);
    expect(intent.explicitConfirmDetected).toBe(true);
    expect(intent.commandPolicy.allowed).toBe(true);
    expect(intent.commandPolicy.evaluatedCommands).toEqual([
      "assemble_concierge_payload",
      "preview_meeting_concierge",
      "execute_meeting_concierge",
    ]);
  });

  it("fails closed to missing-field fallback when email is unavailable", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Book me with Jordan tomorrow afternoon",
      metadata: {
        liveSessionId: "live_session_2",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Name is Jordan, no email yet.",
        },
      },
      now: 1_701_100_000_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.extractedPayloadReady).toBe(false);
    expect(intent.autoTriggerPreview).toBe(false);
    expect(intent.missingRequiredFields).toContain("personEmail");
    expect(intent.fallbackReasons).toContain("missing_person_email");
    expect(intent.payload).toBeUndefined();
  });

  it("emits runtime context block with preview-first and confirm guardrails", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview first before you book anything with jordan@example.com",
      metadata: {
        liveSessionId: "live_session_3",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "jordan@example.com",
        },
      },
      now: 1_701_200_000_000,
    });

    const runtimeContext = buildInboundMeetingConciergeRuntimeContext(intent);
    expect(runtimeContext).toContain("preview first");
    expect(runtimeContext).toContain("explicit user confirmation");
    expect(runtimeContext).toContain("run_meeting_concierge_demo");
  });

  it("surfaces ingest latency telemetry when capture timestamps are present", () => {
    const now = 1_701_300_000_000;
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_4",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        timestamp: now - 2_500,
        voiceRuntime: {
          transcript: "Use jordan@example.com",
          stoppedAt: now - 2_500,
        },
      },
      now,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.extractedPayloadReady).toBe(true);
    expect(intent.ingestLatencyMs).toBe(2_500);

    const runtimeContext = buildInboundMeetingConciergeRuntimeContext(intent);
    expect(runtimeContext).toContain("Ingress latency estimate: 2500ms.");
  });

  it("fails closed when command policy contract is missing for live ingress", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview a booking for jordan@example.com",
      metadata: {
        liveSessionId: "live_session_policy_missing",
        voiceRuntime: {
          transcript: "jordan@example.com",
        },
      },
      now: 1_701_350_000_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.commandPolicy.policyRequired).toBe(true);
    expect(intent.commandPolicy.allowed).toBe(false);
    expect(intent.commandPolicy.reasonCode).toBe("missing_policy_contract");
    expect(intent.extractedPayloadReady).toBe(false);
    expect(intent.fallbackReasons).toContain(
      "command_policy_blocked:missing_policy_contract"
    );
  });

  it("quarantines unverifiable mobile source metadata before payload extraction", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview booking details from camera context.",
      metadata: {
        liveSessionId: "live_session_attestation_blocked",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        cameraRuntime: {
          sourceId: "iphone_camera:ios_avfoundation:front_camera",
          sourceClass: "iphone_camera",
          providerId: "ios_avfoundation",
          detectedText: "Contact jordan@example.com",
        },
      },
      now: 1_701_360_000_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.sourceAttestation.verificationRequired).toBe(true);
    expect(intent.sourceAttestation.verified).toBe(false);
    expect(intent.fallbackReasons).toContain("source_metadata_quarantined");
    expect(intent.fallbackReasons).toContain("source_attestation:missing_attestation");
    expect(intent.extractedPayloadReady).toBe(false);
  });

  it("keeps meta glasses payload extraction fail-closed when attestation is missing", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview booking details from glasses stream.",
      metadata: {
        sourceMode: "meta_glasses",
        liveSessionId: "live_session_meta_missing_attestation",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        cameraRuntime: {
          sourceId: "meta_glasses:meta_dat_bridge:rayban_meta",
          sourceClass: "meta_glasses",
          providerId: "meta_dat_bridge",
          detectedText: "Contact jordan@example.com",
        },
      },
      now: 1_701_360_010_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.sourceAttestation.verificationRequired).toBe(true);
    expect(intent.sourceAttestation.verified).toBe(false);
    expect(intent.fallbackReasons).toContain("source_metadata_quarantined");
    expect(intent.extractedPayloadReady).toBe(false);
  });

  it("accepts verified meta glasses attestation for payload extraction", () => {
    const liveSessionId = "live_session_meta_verified";
    const sourceId = "meta_glasses:meta_dat_bridge:rayban_meta";
    const sourceClass = "meta_glasses";
    const providerId = "meta_dat_bridge";
    const nonce = "nonce_meta_verified_1";
    const issuedAtMs = 1_701_360_020_000;
    const challenge = buildMobileSourceAttestationChallenge({
      liveSessionId,
      sourceId,
      nonce,
    });
    const signature = computeMobileSourceAttestationSignature({
      secret: "local_dev_av_attestation_secret_v1",
      challenge,
      nonce,
      issuedAtMs,
      liveSessionId,
      sourceId,
      sourceClass,
      providerId,
    });

    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com",
      metadata: {
        sourceMode: "meta_glasses",
        liveSessionId,
        commandPolicy: PREVIEW_COMMAND_POLICY,
        cameraRuntime: {
          sourceId,
          sourceClass,
          providerId,
          detectedText: "jordan@example.com",
          sourceAttestation: {
            contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
            challenge,
            nonce,
            issuedAtMs,
            sourceId,
            sourceClass,
            providerId,
            signature,
          },
        },
      },
      now: issuedAtMs + 5_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.sourceAttestation.verificationRequired).toBe(true);
    expect(intent.sourceAttestation.verified).toBe(true);
    expect(intent.fallbackReasons).not.toContain("source_metadata_quarantined");
    expect(intent.extractedPayloadReady).toBe(true);
  });
});
