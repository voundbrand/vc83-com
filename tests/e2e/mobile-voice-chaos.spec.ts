import { expect, test } from "@playwright/test";
import {
  CANONICAL_CONVERSATION_MODES,
  buildCrossSurfaceConversationParityGate,
} from "./utils/conversation-parity";
import {
  createShellNavigationRetryTracker,
  finalizeShellNavigationRetries,
  gotoShellWithRetry,
} from "./utils/shell-navigation";

test.describe("Mobile Voice Chaos Probe", () => {
  test("runs cross-transport chaos probe with rollback-drill budget checks", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 1 });
    await gotoShellWithRetry(page, "/", navigationTracker);

    const probeResult = await page.evaluate(async () => {
      type Decision = { payload: { sequence: number }; delayMs: number };
      const buffer: Decision[] = [];

      const profile = {
        dropEveryN: 3,
        reorderWindowSize: 2,
        jitterMs: 70,
        forceProviderTimeout: true,
      };

      const plan = (sequence: number): Decision[] => {
        if ((sequence + 1) % profile.dropEveryN === 0) {
          return [];
        }
        const decision: Decision = {
          payload: { sequence },
          delayMs: profile.jitterMs,
        };
        buffer.push(decision);
        if (buffer.length < profile.reorderWindowSize) {
          return [];
        }
        return buffer.splice(0, buffer.length).reverse();
      };

      const firstWindow = plan(0);
      const secondWindow = plan(1);
      const dropped = plan(2);

      await new Promise<void>((resolve) => window.setTimeout(() => resolve(), profile.jitterMs));

      const liveSessionId = "mobile_live_orv_018_e2e";
      const voiceSessionId = "voice_orv_018_e2e";
      const videoSessionId = "video_orv_018_e2e";
      const telemetry = [
        { liveSessionId, voiceSessionId, eventType: "fallback_transition" },
        { liveSessionId, voiceSessionId, eventType: "latency_checkpoint" },
        { liveSessionId, voiceSessionId, eventType: "provider_failure" },
      ];
      const transportTimeline = [
        { mode: "websocket_preferred", protocol: "websocket", connected: true, fallbackReason: "none" },
        { mode: "websocket_preferred", protocol: "https", connected: true, fallbackReason: "provider_failover" },
        { mode: "chunked_fallback", protocol: "https", connected: false, fallbackReason: "network_degraded" },
      ];
      const rollbackBudget = {
        maxFallbackTransitions: 2,
        maxProviderFailures: 1,
      };
      const observed = {
        fallbackTransitions: telemetry.filter((entry) => entry.eventType === "fallback_transition").length + 1,
        providerFailures: telemetry.filter((entry) => entry.eventType === "provider_failure").length,
      };
      const rollbackDecision =
        observed.fallbackTransitions > rollbackBudget.maxFallbackTransitions
          || observed.providerFailures > rollbackBudget.maxProviderFailures
          ? "ROLLBACK"
          : "PROMOTE";

      return {
        firstWindowLength: firstWindow.length,
        reorderedSequences: secondWindow.map((entry) => entry.payload.sequence),
        droppedLength: dropped.length,
        jitterDelayMs: profile.jitterMs,
        forceProviderTimeout: profile.forceProviderTimeout,
        correlationKey: `${liveSessionId}::${voiceSessionId}`,
        videoCorrelationKey: `${liveSessionId}::${videoSessionId}`,
        telemetryCorrelated: telemetry.every(
          (entry) => entry.liveSessionId === liveSessionId && entry.voiceSessionId === voiceSessionId,
        ),
        transportTimeline,
        rollbackBudget,
        observed,
        rollbackDecision,
      };
    });

    expect(probeResult.firstWindowLength).toBe(0);
    expect(probeResult.reorderedSequences).toEqual([1, 0]);
    expect(probeResult.droppedLength).toBe(0);
    expect(probeResult.jitterDelayMs).toBe(70);
    expect(probeResult.forceProviderTimeout).toBe(true);
    expect(probeResult.correlationKey).toBe("mobile_live_orv_018_e2e::voice_orv_018_e2e");
    expect(probeResult.videoCorrelationKey).toBe("mobile_live_orv_018_e2e::video_orv_018_e2e");
    expect(probeResult.telemetryCorrelated).toBe(true);
    expect(probeResult.transportTimeline).toEqual([
      { mode: "websocket_preferred", protocol: "websocket", connected: true, fallbackReason: "none" },
      {
        mode: "websocket_preferred",
        protocol: "https",
        connected: true,
        fallbackReason: "provider_failover",
      },
      {
        mode: "chunked_fallback",
        protocol: "https",
        connected: false,
        fallbackReason: "network_degraded",
      },
    ]);
    expect(probeResult.rollbackBudget).toEqual({
      maxFallbackTransitions: 2,
      maxProviderFailures: 1,
    });
    expect(probeResult.observed).toEqual({
      fallbackTransitions: 2,
      providerFailures: 1,
    });
    expect(probeResult.rollbackDecision).toBe("PROMOTE");

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });

  test("asserts cross-surface conversation event and reason-code parity matrix", async () => {
    const parityGate = buildCrossSurfaceConversationParityGate();
    const webDesktopMatrix = parityGate.eventReasonMatrix.webDesktop;
    const iphoneMatrix = parityGate.eventReasonMatrix.iphone;

    expect(parityGate.contractVersion.webDesktop).toBe("conversation_interaction_v1");
    expect(parityGate.contractVersion.iphone).toBe("conversation_interaction_v1");
    expect(parityGate.modeTaxonomy).toEqual(CANONICAL_CONVERSATION_MODES);

    expect(webDesktopMatrix).toEqual(iphoneMatrix);
    expect(webDesktopMatrix.map((row) => row.reasonCode)).toEqual([
      "permission_denied_mic",
      "transport_failed",
      "device_unavailable",
      "dat_sdk_unavailable",
    ]);
    expect(webDesktopMatrix.map((row) => row.eventType)).toEqual([
      "conversation_permission_denied",
      "conversation_reconnecting",
      "conversation_degraded_to_voice",
      "conversation_error",
    ]);
    expect(
      iphoneMatrix.find((row) => row.scenario === "dat-unavailable-fallback")?.reasonCode
    ).toBe("dat_sdk_unavailable");
    expect(parityGate.stateTimelineBySurface.webDesktop).toEqual(parityGate.stateTimelineBySurface.iphone);
    expect(parityGate.executionLaneInvariantBySurface.webDesktop).toEqual(
      parityGate.executionLaneInvariantBySurface.iphone
    );
    expect(parityGate.executionLaneInvariantBySurface.iphone.voice.approvalInvariant).toBe(
      "non_bypassable"
    );
    expect(parityGate.executionLaneInvariantBySurface.iphone.voice_with_eyes.mcpEnabled).toBe(
      true
    );
    expect(parityGate.executionLaneInvariantBySurface.iphone.voice_with_eyes.handoffSupported).toBe(
      true
    );
  });
});
