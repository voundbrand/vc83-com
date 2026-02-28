import { describe, expect, it } from "vitest";
import {
  buildSoulReportSummary,
  buildSpecialistPreviewMessage,
  resolveSoulReportQualityGates,
  sanitizeChannelSafeText,
} from "../../../convex/onboarding/soulReportScheduler";

describe("onboarding soul report scheduler helpers", () => {
  it("sanitizes text into channel-safe ASCII", () => {
    const sanitized = sanitizeChannelSafeText(
      "  Day 5 preview — ready ✅\nfor rollout  ",
      120,
    );
    expect(sanitized).toBe("Day 5 preview ready for rollout");
  });

  it("fails data-backed quality gates when there is no evidence", () => {
    const summary = buildSoulReportSummary({
      completedNurtureSteps: 0,
      funnelEventCount: 0,
      firstWinSlaState: "pending",
      firstMessageLatencyChannelCount: 0,
    });
    const gates = resolveSoulReportQualityGates({
      completedNurtureSteps: 0,
      funnelEventCount: 0,
      firstWinSlaState: "pending",
      summary,
      highlights: ["Nurture progression: 0/4 steps sent."],
    });

    expect(gates.dataBacked).toBe(false);
    expect(gates.channelSafe).toBe(true);
  });

  it("passes quality gates when report has deterministic evidence", () => {
    const summary = buildSoulReportSummary({
      completedNurtureSteps: 3,
      funnelEventCount: 6,
      firstWinSlaState: "met",
      firstMessageLatencyChannelCount: 2,
    });
    const gates = resolveSoulReportQualityGates({
      completedNurtureSteps: 3,
      funnelEventCount: 6,
      firstWinSlaState: "met",
      summary,
      highlights: [
        "Nurture progression: 3/4 steps sent.",
        "First-win guarantee status: met.",
      ],
    });

    expect(gates).toEqual({
      dataBacked: true,
      channelSafe: true,
    });
  });

  it("builds a bounded specialist preview message", () => {
    const message = buildSpecialistPreviewMessage({
      summary:
        "Day 3 Soul Report: completed 4/4 nurture steps and captured 8 onboarding signals.",
      highlights: [
        "Nurture progression: 4/4 steps sent.",
        "First-win guarantee status: met.",
      ],
    });

    expect(message).toContain("Day 5 Specialist Preview is now unlocked.");
    expect(message.length).toBeLessThanOrEqual(560);
    expect(message).not.toContain("\n");
  });
});
