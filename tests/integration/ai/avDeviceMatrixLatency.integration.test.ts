import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildMeetingConciergeDecisionTelemetry,
  VC83_NATIVE_TOOL_REGISTRY_ROUTE,
  resolveInboundMeetingConciergeIntent,
  resolveInboundIngressEnvelope,
} from "../../../convex/ai/agentExecution";
import { MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION } from "../../../convex/ai/mobileRuntimeHardening";
import {
  createDesktopCaptureAdapter,
  type DesktopCaptureProvider,
} from "../../../src/lib/av/capture/desktopCapture";
import {
  createDeviceIngestAdapter,
  type DeviceIngestProvider,
} from "../../../src/lib/av/ingress/deviceIngestAdapter";
import { createMobileGlassesIngressBridge } from "../../../src/lib/av/ingress/mobileGlassesBridge";
import { createRealtimeMediaSession } from "../../../src/lib/av/runtime/realtimeMediaSession";
import { createInMemoryTransportAdapter } from "../../../src/lib/av/runtime/transportAdapters";
import type { MediaSessionCaptureFrame } from "../../../src/lib/av/session/mediaSessionContract";

const AVR_012_REPORT_DIR = path.join(process.cwd(), "tmp/reports/av-core");
const AVR_012_REPORT_JSON = path.join(
  AVR_012_REPORT_DIR,
  "avr-012-device-matrix-latency-report.json"
);
const AVR_012_REPORT_MD = path.join(
  AVR_012_REPORT_DIR,
  "avr-012-device-matrix-latency-report.md"
);

const LATENCY_THRESHOLDS = {
  captureToIngress: { targetMs: 120, hardFailMs: 250 },
  ingressToEnvelope: { targetMs: 80, hardFailMs: 150 },
  frameToAgentTurn: { targetMs: 450, hardFailMs: 900 },
  mouthToEar: { targetMs: 600, hardFailMs: 1200 },
  fallbackPropagation: { targetMs: 200, hardFailMs: 400 },
} as const;

type LatencyMetricKey = keyof typeof LATENCY_THRESHOLDS;

interface MetricEvaluation {
  valueMs: number;
  targetMs: number;
  hardFailMs: number;
  targetPass: boolean;
  hardFailPass: boolean;
}

type MetricEvaluationMap = Record<LatencyMetricKey, MetricEvaluation>;

const ORG_ID = "org_avr_012" as Id<"organizations">;
const PREVIEW_COMMAND_POLICY = {
  contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
};

interface AvMatrixCaseInput {
  caseId: string;
  scenario: string;
  frame: MediaSessionCaptureFrame;
  captureToIngressMs: number;
  ingressToEnvelopeMs: number;
  transportLatencyMs: number;
  audioInLatencyMs: number;
  audioOutLatencyMs: number;
  fallbackPropagationMs: number;
}

interface AvMatrixCaseResult {
  caseId: string;
  scenario: string;
  sourceClass: string;
  fallbackReason: string;
  metrics: MetricEvaluationMap;
  invariants: {
    runtimeAuthorityPrecedence: boolean;
    runtimeApprovalInvariant: boolean;
    envelopeAuthorityPrecedence: boolean;
    envelopeRegistryRoute: boolean;
    directDeviceMutationBlocked: boolean;
    mutatingToolExecutionAllowed: boolean;
  };
}

interface AvMatrixSummary {
  rowId: "AVR-012";
  coverage: {
    desktop: boolean;
    webcam: boolean;
    mobileStream: boolean;
    glassesStream: boolean;
    dviInput: boolean;
  };
  allTargetPass: boolean;
  allHardFailPass: boolean;
  invariantsPass: boolean;
  cases: AvMatrixCaseResult[];
}

function normalizeLatencyValue(valueMs: number): number {
  if (!Number.isFinite(valueMs) || valueMs < 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.floor(valueMs);
}

function evaluateMetric(
  valueMs: number,
  thresholds: { targetMs: number; hardFailMs: number }
): MetricEvaluation {
  const normalizedValueMs = normalizeLatencyValue(valueMs);
  return {
    valueMs: normalizedValueMs,
    targetMs: thresholds.targetMs,
    hardFailMs: thresholds.hardFailMs,
    targetPass: normalizedValueMs <= thresholds.targetMs,
    hardFailPass: normalizedValueMs <= thresholds.hardFailMs,
  };
}

async function evaluateDeviceCase(
  input: AvMatrixCaseInput
): Promise<AvMatrixCaseResult> {
  const transportAdapter = createInMemoryTransportAdapter();
  let nowMs = input.frame.frameTimestampMs + input.transportLatencyMs;
  const session = createRealtimeMediaSession({
    liveSessionId: input.frame.liveSessionId,
    transportAdapter,
    now: () => nowMs,
    thresholds: {
      latencyMsP95Threshold: 9999,
      jitterMsP95Threshold: 9999,
      packetLossPctThreshold: 100,
    },
  });

  await session.ingestPacket({
    direction: "video_in",
    sequence: 1,
    timestampMs: input.frame.frameTimestampMs,
    sizeBytes: input.frame.sizeBytes ?? 1200,
    captureDroppedFrameCount: input.frame.diagnostics?.droppedFrameCount,
    captureLateFrameCount: input.frame.diagnostics?.lateFrameCount,
    metadata: input.frame.metadata,
  });

  const fallbackSignalAtMs = nowMs;
  transportAdapter.setHealthState({
    providerFailoverActive: true,
  });

  nowMs += input.fallbackPropagationMs;
  const fallbackSnapshot = await session.ingestPacket({
    direction: "audio_in",
    sequence: 1,
    timestampMs: nowMs - input.audioInLatencyMs,
    sizeBytes: 160,
  });
  const fallbackPropagationMs =
    fallbackSnapshot.transportRuntime.fallbackReason === "none"
      ? Number.MAX_SAFE_INTEGER
      : nowMs - fallbackSignalAtMs;

  nowMs += 10;
  const finalSnapshot = await session.ingestPacket({
    direction: "audio_out",
    sequence: 1,
    timestampMs: nowMs - input.audioOutLatencyMs,
    sizeBytes: 192,
  });

  const ingressAtMs = nowMs;
  const envelopeNowMs = ingressAtMs + input.ingressToEnvelopeMs;
  const envelope = resolveInboundIngressEnvelope({
    organizationId: "org_avr_012",
    channel: "desktop",
    externalContactIdentifier: `desktop:user_avr_012:${input.caseId}`,
    metadata: {
      timestamp: ingressAtMs,
      liveSessionId: input.frame.liveSessionId,
      cameraRuntime: {
        provider: input.frame.sourceClass,
        sessionState: "capturing",
        startedAt: input.frame.captureTimestampMs,
        lastFrameCapturedAt: input.frame.frameTimestampMs,
        frameCaptureCount: 1,
        fallbackReason: finalSnapshot.transportRuntime.fallbackReason,
      },
      voiceRuntime: {
        voiceSessionId: `voice_${input.caseId}`,
        sessionState: "capturing",
      },
      transportRuntime: finalSnapshot.transportRuntime,
      avObservability: finalSnapshot.transportRuntime.observability,
    },
    authority: {
      primaryAgentId: "agent_avr_012_primary",
      authorityAgentId: "agent_avr_012_primary",
      speakerAgentId: "agent_avr_012_primary",
    },
    now: envelopeNowMs,
  });

  const ingressToEnvelopeMs = envelopeNowMs - envelope.occurredAt;
  const transportLatencyMsP95 =
    finalSnapshot.transportRuntime.diagnostics.latencyMsP95 ?? 0;
  const frameToAgentTurnMs =
    input.captureToIngressMs + ingressToEnvelopeMs + transportLatencyMsP95;
  const mouthToEarMs =
    finalSnapshot.transportRuntime.observability.mouthToEarEstimateMs
    ?? Number.MAX_SAFE_INTEGER;

  return {
    caseId: input.caseId,
    scenario: input.scenario,
    sourceClass: input.frame.sourceClass,
    fallbackReason: finalSnapshot.transportRuntime.fallbackReason,
    metrics: {
      captureToIngress: evaluateMetric(
        input.captureToIngressMs,
        LATENCY_THRESHOLDS.captureToIngress
      ),
      ingressToEnvelope: evaluateMetric(
        ingressToEnvelopeMs,
        LATENCY_THRESHOLDS.ingressToEnvelope
      ),
      frameToAgentTurn: evaluateMetric(
        frameToAgentTurnMs,
        LATENCY_THRESHOLDS.frameToAgentTurn
      ),
      mouthToEar: evaluateMetric(
        mouthToEarMs,
        LATENCY_THRESHOLDS.mouthToEar
      ),
      fallbackPropagation: evaluateMetric(
        fallbackPropagationMs,
        LATENCY_THRESHOLDS.fallbackPropagation
      ),
    },
    invariants: {
      runtimeAuthorityPrecedence:
        finalSnapshot.transportRuntime.nativePolicyPrecedence
        === "vc83_runtime_policy",
      runtimeApprovalInvariant:
        finalSnapshot.transportRuntime.approvalInvariant === "non_bypassable",
      envelopeAuthorityPrecedence:
        envelope.nativeVisionEdge.nativeAuthorityPrecedence
        === "vc83_runtime_policy",
      envelopeRegistryRoute:
        envelope.nativeVisionEdge.registryRoute === VC83_NATIVE_TOOL_REGISTRY_ROUTE,
      directDeviceMutationBlocked:
        envelope.nativeVisionEdge.directDeviceMutationRequested === false,
      mutatingToolExecutionAllowed:
        envelope.authority.mutatingToolExecutionAllowed === true,
    },
  };
}

function buildMarkdownReport(summary: AvMatrixSummary): string {
  const lines: string[] = [];
  lines.push("# AVR-012 Device Matrix + Latency Validation");
  lines.push("");
  lines.push(
    `- Coverage: desktop=${summary.coverage.desktop}, webcam=${summary.coverage.webcam}, mobile=${summary.coverage.mobileStream}, glasses=${summary.coverage.glassesStream}, dvi=${summary.coverage.dviInput}`
  );
  lines.push(`- Target thresholds pass: ${summary.allTargetPass}`);
  lines.push(`- Hard-fail thresholds pass: ${summary.allHardFailPass}`);
  lines.push(`- Authority/trust invariants pass: ${summary.invariantsPass}`);
  lines.push("");
  lines.push(
    "| Case | Source | capture->ingress | ingress->envelope | frame->agent | mouth->ear | fallback propagation | fallback reason |"
  );
  lines.push(
    "|---|---|---:|---:|---:|---:|---:|---|"
  );
  for (const result of summary.cases) {
    lines.push(
      `| ${result.caseId} | ${result.sourceClass} | ${result.metrics.captureToIngress.valueMs}ms | ${result.metrics.ingressToEnvelope.valueMs}ms | ${result.metrics.frameToAgentTurn.valueMs}ms | ${result.metrics.mouthToEar.valueMs}ms | ${result.metrics.fallbackPropagation.valueMs}ms | ${result.fallbackReason} |`
    );
  }
  return lines.join("\n");
}

function writeReport(summary: AvMatrixSummary) {
  mkdirSync(AVR_012_REPORT_DIR, { recursive: true });
  writeFileSync(
    AVR_012_REPORT_JSON,
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  writeFileSync(
    AVR_012_REPORT_MD,
    buildMarkdownReport(summary),
    "utf8"
  );
}

describe("AVR-012 device matrix regression and latency validation", () => {
  it("enforces matrix coverage and threshold pass/fail contracts", async () => {
    const desktopProvider: DesktopCaptureProvider = {
      async captureScreenshot() {
        return {
          frameTimestampMs: 1_701_200_100_000,
          captureTimestampMs: 1_701_200_100_006,
          mimeType: "image/png",
          payloadRef: "memory://desktop/screenshot/1",
          width: 1920,
          height: 1080,
        };
      },
      async captureRecording() {
        const startedAtMs = 1_701_200_200_000;
        return {
          startedAtMs,
          captureToIngressLatencyMs: 94,
          droppedFrameCount: 0,
          lateFrameCount: 0,
          audioTrack: {
            sampleRateHz: 48_000,
            channels: 2,
            mimeType: "audio/webm",
          },
          frames: [
            {
              frameTimestampMs: startedAtMs + 33,
              captureTimestampMs: startedAtMs + 34,
              mimeType: "video/webm",
              payloadRef: "memory://desktop/recording/frame-1",
              width: 1920,
              height: 1080,
            },
            {
              frameTimestampMs: startedAtMs + 66,
              captureTimestampMs: startedAtMs + 67,
              mimeType: "video/webm",
              payloadRef: "memory://desktop/recording/frame-2",
              width: 1920,
              height: 1080,
            },
          ],
        };
      },
    };
    const desktopAdapter = createDesktopCaptureAdapter({
      provider: desktopProvider,
      now: () => 1_701_200_050_000,
    });

    const desktopScreenshotFrame = await desktopAdapter.captureScreenshot({
      liveSessionId: "live_session_avr012_desktop_screenshot",
      sourceId: "desktop:display_main",
      deviceId: "display-main",
    });
    const desktopRecording = await desktopAdapter.captureRecording({
      liveSessionId: "live_session_avr012_desktop_record",
      durationMs: 2_500,
      frameRate: 30,
      withMicAudio: true,
      withSystemAudio: true,
    });
    const desktopRecordingFrame =
      desktopRecording.frames[1] ?? desktopRecording.frames[0];
    if (!desktopRecordingFrame) {
      throw new Error("Expected at least one desktop recording frame.");
    }

    const deviceProvider: DeviceIngestProvider = {
      async captureFrame(input) {
        const baseTimestamp =
          input.sourceClass === "hdmi_capture"
            ? 1_701_200_500_000
            : 1_701_200_400_000;
        const captureToIngressLatencyMs =
          input.sourceClass === "hdmi_capture" ? 114 : 112;
        return {
          frameTimestampMs: baseTimestamp + input.sequence * 2,
          captureTimestampMs: baseTimestamp + input.sequence * 2 + 1,
          captureToIngressLatencyMs,
          droppedFrameCount: 0,
          lateFrameCount: 0,
          mimeType: "video/webm",
          payloadRef: `memory://device/${input.sourceClass}/${input.sequence}`,
          width: 1280,
          height: 720,
        };
      },
    };
    const deviceAdapter = createDeviceIngestAdapter({
      provider: deviceProvider,
      now: () => 1_701_200_350_000,
    });

    const webcamFrame = await deviceAdapter.captureFrame({
      liveSessionId: "live_session_avr012_webcam",
      sourceClass: "webcam",
      providerId: "uvc_runtime",
      deviceId: "facetime_hd_camera",
      streamId: "main_feed",
      withMicAudio: true,
    });
    const dviFrame = await deviceAdapter.captureFrame({
      liveSessionId: "live_session_avr012_dvi",
      sourceClass: "hdmi_capture",
      providerId: "dvi_bridge",
      deviceId: "capture_port_1",
      streamId: "program",
      withSystemAudio: true,
    });

    let bridgeNowMs = 1_701_200_600_000;
    const bridge = createMobileGlassesIngressBridge({
      now: () => bridgeNowMs,
    });

    const mobileSession = bridge.startSession({
      liveSessionId: "live_session_avr012_mobile",
      sourceClass: "mobile_stream_ios",
      providerId: "ios_bridge",
      deviceProfile: "iphone_16_pro",
      streamId: "front_camera",
      transport: "webrtc",
      targetLatencyMs: 120,
      maxLatencyMs: 240,
      withMicAudio: true,
    });
    bridgeNowMs += 116;
    const mobileFrame = bridge.ingestFrame({
      sourceId: mobileSession.sourceId,
      frameTimestampMs: bridgeNowMs - 116,
      mimeType: "video/mp4",
      payloadRef: "memory://mobile/frame-1",
      width: 1170,
      height: 2532,
    });

    const glassesSession = bridge.startSession({
      liveSessionId: "live_session_avr012_glasses",
      sourceClass: "glasses_stream_meta",
      providerId: "meta_bridge",
      deviceProfile: "rayban_meta",
      streamId: "main_feed",
      transport: "webrtc",
      targetLatencyMs: 120,
      maxLatencyMs: 240,
      withMicAudio: true,
    });
    bridgeNowMs += 118;
    const glassesFrame = bridge.ingestFrame({
      sourceId: glassesSession.sourceId,
      frameTimestampMs: bridgeNowMs - 118,
      mimeType: "video/mp4",
      payloadRef: "memory://glasses/frame-1",
      width: 1280,
      height: 720,
    });

    const matrixCases: AvMatrixCaseInput[] = [
      {
        caseId: "desktop_screenshot",
        scenario: "Desktop screenshot capture",
        frame: desktopScreenshotFrame,
        captureToIngressMs: 86,
        ingressToEnvelopeMs: 58,
        transportLatencyMs: 160,
        audioInLatencyMs: 220,
        audioOutLatencyMs: 230,
        fallbackPropagationMs: 120,
      },
      {
        caseId: "desktop_record",
        scenario: "Desktop recording capture",
        frame: desktopRecordingFrame,
        captureToIngressMs:
          desktopRecording.diagnostics.captureToIngressLatencyMs ?? 94,
        ingressToEnvelopeMs: 62,
        transportLatencyMs: 170,
        audioInLatencyMs: 210,
        audioOutLatencyMs: 235,
        fallbackPropagationMs: 130,
      },
      {
        caseId: "webcam_stream",
        scenario: "Webcam live stream ingress",
        frame: webcamFrame,
        captureToIngressMs: webcamFrame.diagnostics?.captureToIngressLatencyMs ?? 112,
        ingressToEnvelopeMs: 74,
        transportLatencyMs: 175,
        audioInLatencyMs: 220,
        audioOutLatencyMs: 240,
        fallbackPropagationMs: 140,
      },
      {
        caseId: "mobile_stream_ios",
        scenario: "Mobile iOS live stream ingress",
        frame: mobileFrame,
        captureToIngressMs: mobileFrame.diagnostics?.captureToIngressLatencyMs ?? 116,
        ingressToEnvelopeMs: 78,
        transportLatencyMs: 165,
        audioInLatencyMs: 205,
        audioOutLatencyMs: 230,
        fallbackPropagationMs: 145,
      },
      {
        caseId: "glasses_stream_meta",
        scenario: "Meta glasses live stream ingress",
        frame: glassesFrame,
        captureToIngressMs: glassesFrame.diagnostics?.captureToIngressLatencyMs ?? 118,
        ingressToEnvelopeMs: 76,
        transportLatencyMs: 170,
        audioInLatencyMs: 215,
        audioOutLatencyMs: 240,
        fallbackPropagationMs: 150,
      },
      {
        caseId: "dvi_input_hdmi_capture",
        scenario: "Digital video input (DVI/HDMI capture)",
        frame: dviFrame,
        captureToIngressMs: dviFrame.diagnostics?.captureToIngressLatencyMs ?? 114,
        ingressToEnvelopeMs: 72,
        transportLatencyMs: 172,
        audioInLatencyMs: 210,
        audioOutLatencyMs: 235,
        fallbackPropagationMs: 138,
      },
    ];

    const results: AvMatrixCaseResult[] = [];
    for (const matrixCase of matrixCases) {
      results.push(await evaluateDeviceCase(matrixCase));
    }

    const allTargetPass = results.every((result) =>
      Object.values(result.metrics).every((metric) => metric.targetPass)
    );
    const allHardFailPass = results.every((result) =>
      Object.values(result.metrics).every((metric) => metric.hardFailPass)
    );
    const invariantsPass = results.every((result) =>
      Object.values(result.invariants).every((invariantPass) => invariantPass)
    );
    const coverage = {
      desktop: results.some(
        (result) =>
          result.sourceClass === "desktop_screenshot"
          || result.sourceClass === "desktop_record"
      ),
      webcam: results.some((result) => result.sourceClass === "webcam"),
      mobileStream: results.some(
        (result) =>
          result.sourceClass === "mobile_stream_ios"
          || result.sourceClass === "mobile_stream_android"
      ),
      glassesStream: results.some(
        (result) => result.sourceClass === "glasses_stream_meta"
      ),
      dviInput: results.some(
        (result) =>
          result.sourceClass === "digital_video_input"
          || result.sourceClass === "hdmi_capture"
          || result.sourceClass === "usb_capture"
          || result.sourceClass === "ndi_capture"
      ),
    };

    const summary: AvMatrixSummary = {
      rowId: "AVR-012",
      coverage,
      allTargetPass,
      allHardFailPass,
      invariantsPass,
      cases: results,
    };

    writeReport(summary);

    expect(coverage.desktop).toBe(true);
    expect(coverage.webcam).toBe(true);
    expect(coverage.mobileStream).toBe(true);
    expect(coverage.glassesStream).toBe(true);
    expect(coverage.dviInput).toBe(true);
    expect(invariantsPass).toBe(true);
    expect(allTargetPass).toBe(true);
    expect(allHardFailPass).toBe(true);
    expect(results.every((result) => result.fallbackReason === "provider_failover")).toBe(
      true
    );
  });
});

describe("ARH-L-002 meeting concierge demo latency contract", () => {
  it("reconciles telemetry <60s target with demo-outcome <20s target", () => {
    const now = 1_701_401_000_000;
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_arh_l_002_latency_reconcile",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        timestamp: now - 3_000,
        voiceRuntime: {
          transcript: "Use jordan@example.com",
          stoppedAt: now - 3_000,
        },
      },
      now,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 5_000,
      toolResults: [],
      latencyTargetMs: 60_000,
      demoOutcomeTargetMs: 20_000,
      demoOutcomeIngestBudgetMs: 4_000,
    });

    expect(telemetry.endToEndLatencyMs).toBe(8_000);
    expect(telemetry.latencyTargetMs).toBe(60_000);
    expect(telemetry.latencyTargetBreached).toBe(false);
    expect(telemetry.demoOutcomeTargetMs).toBe(20_000);
    expect(telemetry.demoOutcomeTargetBreached).toBe(false);
    expect(telemetry.demoOutcomeBreachReasons).toEqual([]);
    expect(telemetry.latencyContract).toEqual({
      contractVersion: "meeting_concierge_latency_contract_v1",
      telemetryTargetMs: 60_000,
      telemetryTargetBreached: false,
      demoOutcomeTargetMs: 20_000,
      demoOutcomeIngestBudgetMs: 4_000,
      demoOutcomeRuntimeBudgetMs: 16_000,
      demoOutcomeTargetBreached: false,
      demoOutcomeBreachReasons: [],
    });
  });

  it("emits deterministic breach reasons when demo-outcome <20s target is missed", () => {
    const now = 1_701_402_000_000;
    const intent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Please preview a booking for jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_arh_l_002_latency_breach",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        timestamp: now - 7_000,
        voiceRuntime: {
          transcript: "Use jordan@example.com",
          stoppedAt: now - 7_000,
        },
      },
      now,
    });

    const telemetry = buildMeetingConciergeDecisionTelemetry({
      intent,
      runtimeElapsedMs: 18_000,
      toolResults: [],
      latencyTargetMs: 60_000,
      demoOutcomeTargetMs: 20_000,
      demoOutcomeIngestBudgetMs: 4_000,
    });

    expect(telemetry.endToEndLatencyMs).toBe(25_000);
    expect(telemetry.latencyTargetBreached).toBe(false);
    expect(telemetry.demoOutcomeTargetBreached).toBe(true);
    expect(telemetry.demoOutcomeBreachReasons).toEqual([
      "demo_outcome_target_exceeded",
      "demo_outcome_ingest_budget_exceeded",
      "demo_outcome_runtime_budget_exceeded",
    ]);
    expect(telemetry.latencyContract.demoOutcomeBreachReasons).toEqual(
      telemetry.demoOutcomeBreachReasons
    );
  });
});
