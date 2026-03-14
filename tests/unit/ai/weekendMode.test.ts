import { describe, expect, it } from "vitest";
import { resolveWeekendModeRuntimeContract } from "../../../convex/ai/weekendMode";

describe("weekendMode runtime contract", () => {
  it("defaults to disabled when config is missing", () => {
    const runtime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: null,
      timestamp: Date.parse("2026-03-13T20:00:00Z"),
    });

    expect(runtime.enabled).toBe(false);
    expect(runtime.active).toBe(false);
    expect(runtime.reason).toBe("disabled");
  });

  it("activates on Friday evening after configured start", () => {
    const runtime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: {
        enabled: true,
        timezone: "UTC",
        fridayStart: "18:00",
        mondayEnd: "08:00",
      },
      timestamp: Date.parse("2026-03-13T18:30:00Z"),
    });

    expect(runtime.enabled).toBe(true);
    expect(runtime.active).toBe(true);
    expect(runtime.reason).toBe("inside_weekend_window");
  });

  it("stays active through Monday before cutoff and deactivates after", () => {
    const mondayBeforeCutoff = resolveWeekendModeRuntimeContract({
      weekendModeRaw: {
        enabled: true,
        timezone: "UTC",
        fridayStart: "18:00",
        mondayEnd: "08:00",
      },
      timestamp: Date.parse("2026-03-16T07:59:00Z"),
    });
    const mondayAfterCutoff = resolveWeekendModeRuntimeContract({
      weekendModeRaw: {
        enabled: true,
        timezone: "UTC",
        fridayStart: "18:00",
        mondayEnd: "08:00",
      },
      timestamp: Date.parse("2026-03-16T08:01:00Z"),
    });

    expect(mondayBeforeCutoff.active).toBe(true);
    expect(mondayAfterCutoff.active).toBe(false);
    expect(mondayAfterCutoff.reason).toBe("outside_weekend_window");
  });

  it("falls back to UTC when timezone is invalid", () => {
    const runtime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: {
        enabled: true,
        timezone: "Mars/Olympus_Mons",
      },
      timestamp: Date.parse("2026-03-14T12:00:00Z"),
    });

    expect(runtime.timezone).toBe("UTC");
    expect(runtime.enabled).toBe(true);
  });
});
