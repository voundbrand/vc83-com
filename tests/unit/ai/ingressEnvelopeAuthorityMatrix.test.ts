import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  assertInboundMutationAuthorityInvariant,
  resolveInboundIngressEnvelope,
  resolveInboundMutationAuthorityContract,
} from "../../../convex/ai/agentExecution";
import {
  buildMobileSourceAttestationChallenge,
  computeMobileSourceAttestationSignature,
  MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
} from "../../../convex/ai/mobileRuntimeHardening";

const ORG_ID = "org_1" as Id<"organizations">;

describe("inbound ingress envelope matrix", () => {
  it("defaults to chat ingress for non-desktop text events", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "webchat",
      externalContactIdentifier: "contact:webchat:abc",
      metadata: {},
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.ingressSurface).toBe("chat");
    expect(envelope.routeKey).toBe("legacy");
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(true);
  });

  it("classifies desktop text events and derives operator authority scope", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {},
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.ingressSurface).toBe("desktop");
    expect(envelope.authority.operatorId).toBe("user_123");
    expect(envelope.authority.scopeKey).toBe(`${ORG_ID}:user_123`);
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(true);
  });

  it("classifies desktop voice events as voice ingress", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {
        liveSessionId: "live_voice_1",
        voiceRuntime: {
          voiceSessionId: "voice_session_1",
          sessionState: "transcribed",
          fallbackReason: "voice_provider_degraded",
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.ingressSurface).toBe("voice");
    expect(envelope.nativeVisionEdge.observability.voiceSessionId).toBe("voice_session_1");
    expect(envelope.nativeVisionEdge.observability.liveSessionId).toBe("live_voice_1");
    expect(envelope.nativeVisionEdge.observability.voiceLifecycleState).toBe("transcribed");
    expect(envelope.nativeVisionEdge.observability.deterministicFallbackReasons).toContain(
      "voice_provider_degraded",
    );
  });

  it("marks desktop companion AV metadata as trust-gated native ingress", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {
        liveSessionId: "live_companion_1",
        cameraRuntime: {
          sessionState: "capturing",
          frameCaptureCount: 2,
        },
        voiceRuntime: {
          voiceSessionId: "voice_companion_1",
          sessionState: "capturing",
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.nativeVisionEdge.nativeCompanionIngressSignal).toBe(true);
    expect(envelope.nativeVisionEdge.trustGateRequired).toBe(true);
    expect(envelope.nativeVisionEdge.approvalGatePolicy).toBe(
      "required_for_mutating_intents",
    );
    expect(envelope.nativeVisionEdge.actionableIntentCount).toBe(0);
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(true);
  });

  it("classifies camera events when image attachments are present", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "webchat",
      externalContactIdentifier: "contact:webchat:abc",
      metadata: {
        attachments: [
          {
            type: "image",
            name: "camera-capture.png",
            mimeType: "image/png",
            sizeBytes: 1024,
            url: "https://example.com/capture.png",
          },
        ],
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.ingressSurface).toBe("camera");
  });

  it("normalizes live camera tool intents and blocks direct device mutation paths", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "webchat",
      externalContactIdentifier: "contact:webchat:abc",
      metadata: {
        liveSessionId: "live_session_1",
        cameraRuntime: {
          provider: "gemini_live",
          sessionState: "capturing",
          startedAt: 1000,
          lastFrameCapturedAt: 6000,
          frameCaptureCount: 6,
          toolIntents: [
            {
              intentId: "intent_live_1",
              toolName: "publish_page",
              action: "commit",
              routeTarget: "device",
            },
          ],
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.nativeVisionEdge.liveSessionSignal).toBe(true);
    expect(envelope.nativeVisionEdge.providerPattern).toBe("gemini_live_reference");
    expect(envelope.nativeVisionEdge.actionableIntentCount).toBe(1);
    expect(envelope.nativeVisionEdge.mutatingIntentCount).toBe(1);
    expect(envelope.nativeVisionEdge.registryRoute).toBe("vc83_tool_registry");
    expect(envelope.nativeVisionEdge.intents[0]?.routeTarget).toBe("vc83_tool_registry");
    expect(envelope.nativeVisionEdge.intents[0]?.directDeviceMutationRequested).toBe(true);
    expect(envelope.nativeVisionEdge.observability.liveSessionId).toBe("live_session_1");
    expect(envelope.nativeVisionEdge.observability.visionLifecycleState).toBe("capturing");
    expect(envelope.nativeVisionEdge.observability.frameCadenceFps).toBe(1);
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(false);
    expect(envelope.authority.invariantViolations).toContain(
      "direct_device_mutation_path_not_allowed",
    );
  });

  it("keeps vc83-routed live intents under primary mutation authority", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "webchat",
      externalContactIdentifier: "contact:webchat:abc",
      metadata: {
        geminiLive: {
          provider: "gemini_live",
          toolIntents: [
            {
              intentId: "intent_live_2",
              toolName: "create_invoice",
              action: "commit",
              routeTarget: "vc83_tool_registry",
            },
          ],
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.nativeVisionEdge.actionableIntentCount).toBe(1);
    expect(envelope.nativeVisionEdge.mutatingIntentCount).toBe(1);
    expect(envelope.nativeVisionEdge.directDeviceMutationRequested).toBe(false);
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(true);
    expect(envelope.authority.invariantViolations).not.toContain(
      "direct_device_mutation_path_not_allowed",
    );
  });

  it("derives deterministic fallback reasons and voice-camera correlation", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {
        liveSessionId: "live_session_42",
        cameraRuntime: {
          sessionState: "stopped",
          fallbackReason: "camera_permission_denied",
          startedAt: 1000,
          lastFrameCapturedAt: 5000,
          frameCaptureCount: 5,
        },
        voiceRuntime: {
          voiceSessionId: "voice_session_42",
          sessionState: "fallback",
          runtimeError: "voice_runtime_resolution_failed",
        },
        transportRuntime: {
          fallbackReason: "provider_failover",
          diagnostics: {
            jitterMsP95: 87.5,
            fallbackTransitionCount: 3,
          },
          observability: {
            sessionStartedAtMs: 900,
            sessionStoppedAtMs: 5200,
            sessionLifecycleState: "session_stopped",
            mouthToEarEstimateMs: 245,
            sourceHealth: {
              deviceAvailable: true,
              providerFailoverActive: true,
              policyRestricted: false,
            },
          },
        },
        avObservability: {
          fallbackTransitionReasons: ["network_degraded"],
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.nativeVisionEdge.observability.sessionCorrelationId).toBe(
      "live_session_42:voice_session_42",
    );
    expect(envelope.nativeVisionEdge.observability.visionLifecycleState).toBe("stopped");
    expect(envelope.nativeVisionEdge.observability.voiceLifecycleState).toBe("fallback");
    expect(envelope.nativeVisionEdge.observability.frameCadenceMs).toBe(1000);
    expect(envelope.nativeVisionEdge.observability.frameCadenceFps).toBe(1);
    expect(envelope.nativeVisionEdge.observability.sessionStartedAtMs).toBe(900);
    expect(envelope.nativeVisionEdge.observability.sessionStoppedAtMs).toBe(5200);
    expect(envelope.nativeVisionEdge.observability.sessionLifecycleState).toBe(
      "session_stopped"
    );
    expect(envelope.nativeVisionEdge.observability.jitterMsP95).toBe(87.5);
    expect(envelope.nativeVisionEdge.observability.mouthToEarEstimateMs).toBe(245);
    expect(envelope.nativeVisionEdge.observability.fallbackTransitionCount).toBe(3);
    expect(envelope.nativeVisionEdge.observability.sourceHealth).toEqual({
      status: "provider_failover",
      deviceAvailable: true,
      providerFailoverActive: true,
      policyRestricted: false,
    });
    expect(envelope.nativeVisionEdge.observability.deterministicFallbackReasons).toEqual([
      "camera_permission_denied",
      "network_degraded",
      "provider_failover",
      "voice_runtime_resolution_failed",
    ]);
  });

  it("fails closed when mobile source attestation is missing for AV metadata", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {
        liveSessionId: "live_session_attestation_missing",
        cameraRuntime: {
          sourceId: "iphone_camera:ios_avfoundation:front_camera",
          sourceClass: "iphone_camera",
          providerId: "ios_avfoundation",
          sessionState: "capturing",
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.nativeVisionEdge.sourceAttestation.verificationRequired).toBe(true);
    expect(envelope.nativeVisionEdge.sourceAttestation.verified).toBe(false);
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(false);
    expect(envelope.authority.invariantViolations).toContain(
      "source_attestation_verification_failed"
    );
    expect(envelope.authority.invariantViolations).toContain("source_metadata_quarantined");
  });

  it("fails closed when transport/session attestation drifts from meta relay contract", () => {
    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {
        liveSessionId: "live_meta_session_a",
        cameraRuntime: {
          liveSessionId: "live_meta_session_b",
          sourceId: "glasses_stream_meta:meta_dat_bridge:rayban_meta:primary",
          sourceClass: "glasses_stream_meta",
          providerId: "meta_dat_bridge",
          sessionState: "capturing",
        },
        transportRuntime: {
          transport: "rtmp",
          observability: {
            liveSessionId: "live_meta_session_c",
          },
        },
      },
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
    });

    expect(envelope.nativeVisionEdge.transportSessionAttestation.required).toBe(true);
    expect(envelope.nativeVisionEdge.transportSessionAttestation.verified).toBe(false);
    expect(envelope.nativeVisionEdge.transportSessionAttestation.reasonCodes).toEqual([
      "live_session_id_mismatch",
      "meta_relay_policy_marker_missing",
      "meta_transport_must_be_webrtc",
    ]);
    expect(envelope.nativeVisionEdge.observability.deterministicFallbackReasons).toContain(
      "transport_session_attestation_unverified",
    );
    expect(envelope.nativeVisionEdge.observability.deterministicFallbackReasons).toContain(
      "transport_session_attestation:live_session_id_mismatch",
    );
    expect(envelope.authority.mutatingToolExecutionAllowed).toBe(false);
    expect(envelope.authority.invariantViolations).toContain(
      "transport_session_attestation_verification_failed",
    );
  });

  it("accepts verified mobile source attestation without invariant violations", () => {
    const liveSessionId = "live_session_attestation_verified";
    const sourceId = "iphone_camera:ios_avfoundation:front_camera";
    const sourceClass = "iphone_camera";
    const providerId = "ios_avfoundation";
    const nonce = "nonce_verified_1";
    const issuedAtMs = 1_701_420_000_000;
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

    const envelope = resolveInboundIngressEnvelope({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop:user_123:conversation_1",
      metadata: {
        liveSessionId,
        cameraRuntime: {
          sourceId,
          sourceClass,
          providerId,
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
      authority: {
        primaryAgentId: "agent_primary",
        authorityAgentId: "agent_primary",
        speakerAgentId: "agent_primary",
      },
      now: issuedAtMs + 5_000,
    });

    expect(envelope.nativeVisionEdge.sourceAttestation.verificationRequired).toBe(true);
    expect(envelope.nativeVisionEdge.sourceAttestation.verified).toBe(true);
    expect(envelope.authority.invariantViolations).not.toContain(
      "source_attestation_verification_failed"
    );
    expect(envelope.authority.invariantViolations).not.toContain(
      "source_metadata_quarantined"
    );
  });
});

describe("inbound mutation authority invariants", () => {
  it("fails closed when desktop operator context is missing", () => {
    const contract = resolveInboundMutationAuthorityContract({
      organizationId: ORG_ID,
      channel: "desktop",
      externalContactIdentifier: "desktop",
      primaryAgentId: "agent_primary",
      authorityAgentId: "agent_primary",
      speakerAgentId: "agent_primary",
    });

    expect(contract.mutatingToolExecutionAllowed).toBe(false);
    expect(contract.invariantViolations).toContain("desktop_requires_operator_context");
    expect(() => assertInboundMutationAuthorityInvariant(contract)).toThrow(
      /desktop_requires_operator_context/,
    );
  });

  it("fails closed when authority path diverges from primary agent", () => {
    const contract = resolveInboundMutationAuthorityContract({
      organizationId: ORG_ID,
      channel: "webchat",
      externalContactIdentifier: "contact:webchat:abc",
      primaryAgentId: "agent_primary",
      authorityAgentId: "agent_secondary",
      speakerAgentId: "agent_secondary",
    });

    expect(contract.mutatingToolExecutionAllowed).toBe(false);
    expect(contract.invariantViolations).toContain("authority_agent_must_match_primary");
    expect(() => assertInboundMutationAuthorityInvariant(contract)).toThrow(
      /authority_agent_must_match_primary/,
    );
  });
});
