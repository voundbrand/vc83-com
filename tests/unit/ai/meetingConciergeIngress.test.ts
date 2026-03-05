import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
  buildMeetingConciergeDecisionTelemetry,
  buildDerTerminmacherRuntimeContext,
  buildInboundMeetingConciergeRuntimeContext,
  buildRuntimeModuleIntentRoutingContext,
  enforceDerTerminmacherPreviewFirstToolPolicy,
  injectAutoPreviewMeetingConciergeToolCall,
  resolveDerTerminmacherRuntimeContract,
  resolveInboundMeetingConciergeIntent,
  resolveInboundRuntimeModuleIntentRoute,
} from "../../../convex/ai/agentExecution";
import {
  buildMobileSourceAttestationChallenge,
  computeMobileSourceAttestationSignature,
  MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
} from "../../../convex/ai/mobileRuntimeHardening";
import {
  MEETING_CONCIERGE_STAGE_CONTRACT_VERSION,
  MEETING_CONCIERGE_STAGE_SEQUENCE,
} from "../../../convex/ai/tools/bookingTool";

const ORG_ID = "org_1" as Id<"organizations">;
const PREVIEW_COMMAND_POLICY = {
  contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
};

function buildStageContractForTest(args: {
  mode: "preview" | "execute";
  terminalStage: (typeof MEETING_CONCIERGE_STAGE_SEQUENCE)[number];
  terminalOutcome: "success" | "blocked";
  terminalOutcomeCode: string;
}) {
  return {
    contractVersion: MEETING_CONCIERGE_STAGE_CONTRACT_VERSION,
    mode: args.mode,
    flow: [...MEETING_CONCIERGE_STAGE_SEQUENCE],
    terminalStage: args.terminalStage,
    terminalOutcome: args.terminalOutcome,
    stages: MEETING_CONCIERGE_STAGE_SEQUENCE.map((stage) => {
      if (stage === args.terminalStage) {
        return {
          stage,
          status: args.terminalOutcome === "success" ? "success" : "blocked",
          outcomeCode: args.terminalOutcomeCode,
          failClosed: args.terminalOutcome !== "success",
        };
      }
      if (args.mode === "preview" && (stage === "booking" || stage === "invite")) {
        return {
          stage,
          status: "skipped",
          outcomeCode: "preview_mode_deferred",
          failClosed: false,
        };
      }
      if (
        args.terminalOutcome === "blocked" &&
        MEETING_CONCIERGE_STAGE_SEQUENCE.indexOf(stage) >
          MEETING_CONCIERGE_STAGE_SEQUENCE.indexOf(args.terminalStage)
      ) {
        return {
          stage,
          status: "skipped",
          outcomeCode: `blocked_upstream_${args.terminalStage}`,
          failClosed: true,
        };
      }
      return {
        stage,
        status: "success",
        outcomeCode: `${stage}_success`,
        failClosed: false,
      };
    }),
  };
}

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

  it("injects preview tool call first when explicit-confirm execute call is present", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Go ahead and book it with Jordan at jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_confirm_2",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      now: 1_701_000_200_000,
    });

    const injected = injectAutoPreviewMeetingConciergeToolCall({
      toolCalls: [
        {
          id: "llm_execute_1",
          type: "function",
          function: {
            name: "manage_bookings",
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "execute",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      meetingConciergeIntent: intent,
      now: 1_701_000_200_001,
    });

    expect(injected).toHaveLength(2);
    const firstCall = injected[0] as { function?: { arguments?: string } };
    const firstArgs = JSON.parse(firstCall.function?.arguments || "{}") as Record<string, unknown>;
    expect(firstArgs.action).toBe("run_meeting_concierge_demo");
    expect(firstArgs.mode).toBe("preview");
  });

  it("does not duplicate concierge preview call when one already exists", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview booking with jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_preview_1",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "jordan@example.com.",
        },
      },
      now: 1_701_000_300_000,
    });

    const injected = injectAutoPreviewMeetingConciergeToolCall({
      toolCalls: [
        {
          id: "llm_preview_1",
          type: "function",
          function: {
            name: "manage_bookings",
            arguments: JSON.stringify({
              action: "run_meeting_concierge_demo",
              mode: "preview",
              personEmail: "jordan@example.com",
            }),
          },
        },
      ],
      meetingConciergeIntent: intent,
      now: 1_701_000_300_001,
    });

    expect(injected).toHaveLength(1);
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

  it("builds decision telemetry for successful preview with end-to-end latency budget check", () => {
    const now = 1_701_300_000_000;
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_4_telemetry",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        timestamp: now - 2_500,
        voiceRuntime: {
          transcript: "Use jordan@example.com",
          stoppedAt: now - 2_500,
        },
      },
      now,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 1_000,
      toolResults: [
        {
          tool: "manage_bookings",
          status: "success",
          result: {
            action: "run_meeting_concierge_demo",
            mode: "preview",
            data: {
              stageContract: buildStageContractForTest({
                mode: "preview",
                terminalStage: "contact_capture",
                terminalOutcome: "success",
                terminalOutcomeCode: "contact_capture_preview_reuse",
              }),
            },
          },
        },
      ],
      latencyTargetMs: 60_000,
    });

    expect(telemetry.decision).toBe("preview_success");
    expect(telemetry.toolInvocation.success).toBe(true);
    expect(telemetry.stageContract.valid).toBe(true);
    expect(telemetry.stageContract.terminalStage).toBe("contact_capture");
    expect(telemetry.ingestLatencyMs).toBe(2_500);
    expect(telemetry.endToEndLatencyMs).toBe(3_500);
    expect(telemetry.latencyTargetBreached).toBe(false);
  });

  it("builds decision telemetry for missing-field fail-closed fallback without tool invocation", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Book me with Jordan tomorrow afternoon",
      metadata: {
        liveSessionId: "live_session_telemetry_missing_fields",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Name is Jordan, no email yet.",
        },
      },
      now: 1_701_100_000_000,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 250,
      toolResults: [],
    });

    expect(telemetry.decision).toBe("blocked_missing_required_fields");
    expect(telemetry.toolInvocation.attempted).toBe(false);
    expect(telemetry.decisionReasonCodes).toContain("missing:personEmail");
  });

  it("builds decision telemetry for explicit-confirm mutation gate blocks", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Book it now with jordan@example.com",
      metadata: {
        liveSessionId: "live_session_telemetry_confirm_block",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      now: 1_701_000_400_000,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 500,
      toolResults: [
        {
          tool: "manage_bookings",
          status: "error",
          error:
            "Meeting concierge execute path requires explicit operator confirmation before mutation.",
        },
      ],
    });

    expect(telemetry.decision).toBe("blocked_explicit_confirmation");
    expect(telemetry.toolInvocation.attempted).toBe(true);
    expect(telemetry.toolInvocation.success).toBe(false);
  });

  it("keeps concierge decision fail-closed when success payload is missing stage contract", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_stage_contract_missing",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Use jordan@example.com",
        },
      },
      now: 1_701_300_010_000,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 600,
      toolResults: [
        {
          tool: "manage_bookings",
          status: "success",
          result: {
            action: "run_meeting_concierge_demo",
            mode: "preview",
            data: {},
          },
        },
      ],
    });

    expect(telemetry.decision).toBe("blocked_unknown");
    expect(telemetry.stageContract.valid).toBe(false);
    expect(telemetry.decisionReasonCodes).toContain(
      "stage_contract:missing_stage_contract"
    );
  });

  it("emits stage-blocked reason code when concierge stage contract terminates blocked", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_stage_contract_blocked",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Use jordan@example.com",
        },
      },
      now: 1_701_300_020_000,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 900,
      toolResults: [
        {
          tool: "manage_bookings",
          status: "error",
          error: "Confirmation delivery failed",
          result: {
            action: "run_meeting_concierge_demo",
            mode: "execute",
            data: {
              stageContract: buildStageContractForTest({
                mode: "execute",
                terminalStage: "invite",
                terminalOutcome: "blocked",
                terminalOutcomeCode: "invite_delivery_failed",
              }),
            },
          },
        },
      ],
    });

    expect(telemetry.stageContract.present).toBe(true);
    expect(telemetry.stageContract.terminalOutcome).toBe("blocked");
    expect(telemetry.decisionReasonCodes).toContain(
      "stage_blocked:invite:invite_delivery_failed"
    );
  });

  it("builds execute-success telemetry when booking flow reaches invite delivery stage", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Book it now with jordan@example.com",
      metadata: {
        liveSessionId: "live_session_execute_success",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      now: 1_701_300_030_000,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 1_250,
      toolResults: [
        {
          tool: "manage_bookings",
          status: "success",
          result: {
            action: "run_meeting_concierge_demo",
            mode: "execute",
            data: {
              stageContract: buildStageContractForTest({
                mode: "execute",
                terminalStage: "invite",
                terminalOutcome: "success",
                terminalOutcomeCode: "invite_sent",
              }),
            },
          },
        },
      ],
    });

    expect(telemetry.decision).toBe("execute_success");
    expect(telemetry.toolInvocation.success).toBe(true);
    expect(telemetry.stageContract.valid).toBe(true);
    expect(telemetry.stageContract.terminalStage).toBe("invite");
    expect(telemetry.stageContract.terminalOutcome).toBe("success");
  });

  it("emits stage-blocked reason code for CRM lookup/create failures", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview booking for jordan@example.com",
      metadata: {
        liveSessionId: "live_session_crm_stage_blocked",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      now: 1_701_300_040_000,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 600,
      toolResults: [
        {
          tool: "manage_bookings",
          status: "error",
          error: "CRM lookup failed",
          result: {
            action: "run_meeting_concierge_demo",
            mode: "preview",
            data: {
              stageContract: buildStageContractForTest({
                mode: "preview",
                terminalStage: "crm_lookup_create",
                terminalOutcome: "blocked",
                terminalOutcomeCode: "crm_lookup_failed",
              }),
            },
          },
        },
      ],
    });

    expect(telemetry.stageContract.present).toBe(true);
    expect(telemetry.stageContract.terminalStage).toBe("crm_lookup_create");
    expect(telemetry.stageContract.terminalOutcome).toBe("blocked");
    expect(telemetry.decisionReasonCodes).toContain(
      "stage_blocked:crm_lookup_create:crm_lookup_failed"
    );
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

  it("extracts concierge payload from OCR-only camera ingress", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview booking details from camera context.",
      metadata: {
        liveSessionId: "live_session_ocr_only_ingress",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        cameraRuntime: {
          ocrText:
            "This is Jordan Lee from Northstar. Reach me at jordan.lee@northstar.com and +1 (415) 555-1234.",
          detectedText: "Networking badge scan",
        },
      },
      now: 1_701_360_005_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.extractedPayloadReady).toBe(true);
    expect(intent.fallbackReasons).not.toContain("source_metadata_quarantined");
    expect(intent.payload).toMatchObject({
      personEmail: "jordan.lee@northstar.com",
      personPhone: "+1 (415) 555-1234",
    });
    expect(intent.payload?.personName).toContain("Jordan Lee");
  });

  it("keeps payload extraction fail-closed when transport/session attestation fails", () => {
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Preview booking details from glasses stream for jordan@example.com.",
      metadata: {
        sourceMode: "meta_glasses",
        liveSessionId: "live_session_transport_a",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        cameraRuntime: {
          liveSessionId: "live_session_transport_b",
          sourceId: "glasses_stream_meta:meta_dat_bridge:rayban_meta:primary",
          sourceClass: "glasses_stream_meta",
          providerId: "meta_dat_bridge",
          transport: "rtmp",
          detectedText: "jordan@example.com",
        },
        transportRuntime: {
          transport: "rtmp",
          observability: {
            liveSessionId: "live_session_transport_c",
          },
        },
      },
      now: 1_701_360_015_000,
    });

    expect(intent.enabled).toBe(true);
    expect(intent.transportSessionAttestation.required).toBe(true);
    expect(intent.transportSessionAttestation.verified).toBe(false);
    expect(intent.extractedPayloadReady).toBe(false);
    expect(intent.fallbackReasons).toContain("transport_session_metadata_quarantined");
    expect(intent.fallbackReasons).toContain(
      "transport_session_attestation:live_session_id_mismatch"
    );
    expect(intent.fallbackReasons).toContain(
      "transport_session_attestation:meta_transport_must_be_webrtc"
    );
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
          transport: "webrtc",
          relayPolicy: "meta_dat_webrtc_required",
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

  it("resolves der terminmacher runtime contract with german-first prompt and crm+booking tools", () => {
    const contract = resolveDerTerminmacherRuntimeContract({
      displayName: "Der Terminmacher",
      templateRole: "one_of_one_der_terminmacher_template",
    });

    expect(contract).toBeTruthy();
    expect(contract?.moduleKey).toBe(DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY);
    expect(contract?.languagePolicy).toEqual({
      primary: "de",
      fallback: "en",
      responseMode: "german_first",
    });
    expect(contract?.toolManifest.requiredTools).toEqual([
      "manage_bookings",
      "manage_crm",
    ]);
  });

  it("enables concierge ingress on native_guest only when der terminmacher runtime module is active", () => {
    const disabled = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "native_guest",
      message: "Bitte plane einen Termin mit jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_terminmacher_disabled",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email ist jordan@example.com",
        },
      },
      now: 1_701_370_000_000,
    });
    expect(disabled.enabled).toBe(false);

    const enabled = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "native_guest",
      message: "Bitte plane einen Termin mit jordan@example.com.",
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      metadata: {
        liveSessionId: "live_session_terminmacher_enabled",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email ist jordan@example.com",
        },
      },
      now: 1_701_370_000_001,
    });

    expect(enabled.enabled).toBe(true);
    expect(enabled.runtimeModuleKey).toBe(DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY);
    expect(enabled.fallbackReasons).toContain(
      "der_terminmacher_assumption_vision_missing"
    );
  });

  it("builds machine-readable der terminmacher runtime context block", () => {
    const contract = resolveDerTerminmacherRuntimeContract({
      displayName: "Der Terminmacher",
    });
    const context = buildDerTerminmacherRuntimeContext(contract);

    expect(context).toContain("DER TERMINMACHER RUNTIME CONTRACT");
    expect(context).toContain("german_first");
    expect(context).toContain("manage_crm");
    expect(context).toContain("manage_bookings");
  });

  it("routes der terminmacher module with high confidence when concierge intent is strong", () => {
    const decision = resolveInboundRuntimeModuleIntentRoute({
      authorityConfig: {},
      message:
        "Bitte buche einen Termin mit jordan@example.com fuer ein 30 Minuten Meeting morgen.",
      channel: "desktop",
      metadata: {
        liveSessionId: "live_router_high_1",
        voiceRuntime: {
          transcript: "Jordan email ist jordan@example.com",
        },
        cameraRuntime: {
          detectedText: "Terminplanung",
          sourceClass: "meta_glasses",
        },
      },
    });

    expect(decision.decision).toBe("selected");
    expect(decision.selectedModuleKey).toBe(DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY);
    expect(decision.confidence).toBeGreaterThanOrEqual(0.72);
    const context = buildRuntimeModuleIntentRoutingContext(decision);
    expect(context).toContain("RUNTIME MODULE INTENT ROUTING");
    expect(context).toContain("der_terminmacher_runtime_module_v1");
  });

  it("asks one deterministic clarifying question for ambiguous routing confidence", () => {
    const decision = resolveInboundRuntimeModuleIntentRoute({
      authorityConfig: {},
      message: "Kannst du mir einen Termin planen?",
      channel: "desktop",
      metadata: {},
    });

    expect(decision.decision).toBe("clarification_required");
    expect(decision.selectedModuleKey).toBeNull();
    expect(decision.clarificationQuestion).toBeTruthy();
    const question = decision.clarificationQuestion || "";
    expect(question.includes("?")).toBe(true);
    expect(question.split("?")).toHaveLength(2);
  });

  it("honors explicit der terminmacher runtime module config without intent ambiguity", () => {
    const decision = resolveInboundRuntimeModuleIntentRoute({
      authorityConfig: {
        runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      },
      message: "hello there",
      channel: "webchat",
      metadata: {},
    });

    expect(decision.decision).toBe("selected");
    expect(decision.selectedModuleKey).toBe(DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY);
    expect(decision.confidence).toBe(1);
    expect(decision.reasonCodes).toContain("explicit_runtime_module_config");
  });

  it("enforces preview-first mutation policy for der terminmacher tool calls", () => {
    const runtimeContract = resolveDerTerminmacherRuntimeContract({
      displayName: "Der Terminmacher",
    });
    const guardedToolCalls = enforceDerTerminmacherPreviewFirstToolPolicy({
      runtimeContract,
      explicitConfirmDetected: false,
      toolCalls: [
        {
          id: "crm_execute_1",
          type: "function",
          function: {
            name: "manage_crm",
            arguments: JSON.stringify({
              action: "create_contact",
              mode: "execute",
              email: "jordan@example.com",
            }),
          },
        },
      ],
    });
    const firstCall = guardedToolCalls[0] as { function?: { arguments?: string } };
    const firstArgs = JSON.parse(firstCall.function?.arguments || "{}") as Record<string, unknown>;
    expect(firstArgs.mode).toBe("preview");
  });
});
