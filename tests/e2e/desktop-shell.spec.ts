import { expect, test } from "@playwright/test";
import {
  CANONICAL_CONVERSATION_MODES,
  buildCrossSurfaceConversationParityGate,
  buildMobileTurnStateCloseoutEvidence,
} from "./utils/conversation-parity";
import {
  createShellNavigationRetryTracker,
  finalizeShellNavigationRetries,
  gotoShellWithRetry,
} from "./utils/shell-navigation";
import {
  DEFAULT_REALTIME_CONVERSATION_VAD_POLICY,
  DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS,
  DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW,
  DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS,
} from "../../src/lib/av/runtime/realtimeMediaSession";

const DESKTOP_CONTEXT = "desktop_shell_e2e";

test.describe("Desktop Shell", () => {
  test("renders top shell, supports app deep-links, and cleans URL state", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });

    await test.step("desktop top shell renders", async () => {
      await gotoShellWithRetry(page, "/", navigationTracker);
      await expect(page.getByRole("button", { name: /product os/i })).toBeVisible();
    });

    await test.step("login deep-link opens expected window", async () => {
      await gotoShellWithRetry(page, `/?app=login&context=${DESKTOP_CONTEXT}`, navigationTracker);
      await expect(page.getByTestId("desktop-window-tab-login")).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
    });

    await test.step("store deep-link opens expected window", async () => {
      await gotoShellWithRetry(page, `/?app=store&context=${DESKTOP_CONTEXT}`, navigationTracker);
      await expect(page.getByTestId("desktop-window-tab-store")).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
    });

    await test.step("public /store full-screen keeps section deep-link parity", async () => {
      await gotoShellWithRetry(page, "/store?section=calculator", navigationTracker);
      await expect(page.getByRole("heading", { name: /^credits$/i })).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("panel")).toBe("calculator");
      await expect.poll(() => new URL(page.url()).searchParams.get("section")).toBe("calculator");
    });

    await test.step("unknown deep-link is cleaned from URL", async () => {
      await gotoShellWithRetry(
        page,
        `/?app=does-not-exist&context=${DESKTOP_CONTEXT}`,
        navigationTracker
      );
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
      await expect(page).not.toHaveURL(/[\?&]app=/);
    });

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });

  test("keeps deterministic conversation mode parity for voice and voice_with_eyes fallback paths", async () => {
    const parityGate = buildCrossSurfaceConversationParityGate();

    expect(parityGate.contractVersion.webDesktop).toBe("conversation_interaction_v1");
    expect(parityGate.contractVersion.iphone).toBe("conversation_interaction_v1");
    expect(parityGate.contractVersion.webDesktop).toBe(parityGate.contractVersion.iphone);

    expect(parityGate.modeTaxonomy).toEqual(CANONICAL_CONVERSATION_MODES);
    expect(parityGate.stateTaxonomy.webDesktop).toEqual(parityGate.stateTaxonomy.iphone);
    expect(parityGate.eventTaxonomy.webDesktop).toEqual(parityGate.eventTaxonomy.iphone);
    expect(parityGate.reasonTaxonomy.webDesktop).toEqual(parityGate.reasonTaxonomy.iphone);

    expect(parityGate.stateTimelineBySurface.webDesktop.voice).toEqual(
      parityGate.stateTimelineBySurface.iphone.voice
    );
    expect(parityGate.stateTimelineBySurface.webDesktop.voice_with_eyes).toEqual(
      parityGate.stateTimelineBySurface.iphone.voice_with_eyes
    );
    expect(parityGate.stateTimelineBySurface.webDesktop.voice_with_eyes).toEqual([
      { eventType: "conversation_start_requested", state: "idle" },
      { eventType: "conversation_connecting", state: "connecting" },
      { eventType: "conversation_live", state: "live" },
      { eventType: "conversation_eyes_source_changed", state: "live" },
      { eventType: "conversation_degraded_to_voice", state: "live", reasonCode: "device_unavailable" },
      { eventType: "conversation_reconnecting", state: "reconnecting", reasonCode: "transport_failed" },
      { eventType: "conversation_live", state: "live" },
      { eventType: "conversation_ending", state: "ending" },
      { eventType: "conversation_ended", state: "ended" },
    ]);

    expect(parityGate.eventReasonMatrix.webDesktop).toEqual(parityGate.eventReasonMatrix.iphone);
    expect(parityGate.eventReasonMatrix.webDesktop.map((row) => row.reasonCode)).toEqual([
      "permission_denied_mic",
      "transport_failed",
      "device_unavailable",
      "dat_sdk_unavailable",
    ]);

    expect(parityGate.executionLaneInvariantBySurface.webDesktop).toEqual(
      parityGate.executionLaneInvariantBySurface.iphone
    );
    expect(parityGate.executionLaneInvariantBySurface.webDesktop.voice).toEqual({
      mode: "voice",
      approvalInvariant: "non_bypassable",
      mcpRoute: "session_scoped_mcp",
      mcpEnabled: true,
      handoffSupported: true,
    });
    expect(parityGate.executionLaneInvariantBySurface.webDesktop.voice_with_eyes).toEqual({
      mode: "voice_with_eyes",
      approvalInvariant: "non_bypassable",
      mcpRoute: "session_scoped_mcp",
      mcpEnabled: true,
      handoffSupported: true,
    });
  });

  test("locks ORV-042 duplex VAD and JPEG forwarding policy defaults", async () => {
    expect(DEFAULT_REALTIME_CONVERSATION_VAD_POLICY).toEqual({
      mode: "client_energy_gate",
      frameDurationMs: 20,
      energyThresholdRms: 0.015,
      minSpeechFrames: 2,
      endpointSilenceMs: 320,
    });
    expect(DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS).toBe(1250);
    expect(DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW).toBe(8);
    expect(DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS).toBe(10000);
  });

  test("confirms lane-M closeout reports no web/desktop parity impact", async () => {
    const closeoutEvidence = buildMobileTurnStateCloseoutEvidence();

    expect(closeoutEvidence.contractVersion).toBe("conversation_interaction_v1");
    expect(closeoutEvidence.vadPolicy.webDesktop).toEqual({
      speechThresholdRms: DEFAULT_REALTIME_CONVERSATION_VAD_POLICY.energyThresholdRms,
      endpointSilenceMs: DEFAULT_REALTIME_CONVERSATION_VAD_POLICY.endpointSilenceMs,
    });
    expect(closeoutEvidence.vadPolicy.parity).toEqual({
      speechThresholdMatches: true,
      endpointSilenceMatches: true,
    });
    expect(closeoutEvidence.finalizeGuard.allowAfterBargeInCancel).toEqual({
      allowFinalize: true,
      reason: "ready",
    });
    expect(closeoutEvidence.parityImpact).toBe("none");
  });
});
