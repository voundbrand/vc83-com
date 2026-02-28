import { describe, expect, it } from "vitest";
import {
  resolveActiveArchetypeRuntimeContract,
  resolveSensitiveArchetypeRuntimeConstraint,
} from "../../../convex/ai/archetypes";
import {
  resolveModeScopedAutonomyLevel,
  resolveSoulModeRuntimeContract,
} from "../../../convex/ai/soulModes";

describe("soul mode + archetype contracts", () => {
  it("prefers explicit soul mode over channel-derived defaults", () => {
    const runtime = resolveSoulModeRuntimeContract({
      activeSoulMode: "private",
      channel: "slack",
    });

    expect(runtime.mode).toBe("private");
    expect(runtime.source).toBe("explicit");
  });

  it("resolves mode from channel bindings when explicit mode is absent", () => {
    const runtime = resolveSoulModeRuntimeContract({
      channel: "telegram_private",
      modeChannelBindings: [
        { channel: "telegram_private", mode: "private" },
      ],
    });

    expect(runtime.mode).toBe("private");
    expect(runtime.source).toBe("channel_binding");
  });

  it("forces sandbox autonomy when mode scope is read-only", () => {
    expect(
      resolveModeScopedAutonomyLevel({
        autonomyLevel: "autonomous",
        modeToolScope: "read_only",
      }),
    ).toBe("sandbox");
  });

  it("activates an explicit archetype when enabled and mode-compatible", () => {
    const runtime = resolveActiveArchetypeRuntimeContract({
      requestedArchetype: "cfo",
      enabledArchetypes: ["coach", "cfo"],
      mode: "work",
      modeDefaultArchetype: "ceo",
    });

    expect(runtime.archetype?.id).toBe("cfo");
    expect(runtime.source).toBe("explicit");
  });

  it("blocks incompatible archetype selection and emits deterministic reason", () => {
    const runtime = resolveActiveArchetypeRuntimeContract({
      requestedArchetype: "cfo",
      enabledArchetypes: ["cfo"],
      mode: "private",
      modeDefaultArchetype: "coach",
    });

    expect(runtime.archetype).toBeNull();
    expect(runtime.source).toBe("none");
    expect(runtime.blockedReason).toContain("not available in private mode");
  });

  it("exposes enforceable sensitive-archetype runtime constraints", () => {
    const guardrail = resolveSensitiveArchetypeRuntimeConstraint("life_coach");

    expect(guardrail?.forceReadOnlyTools).toBe(true);
    expect(guardrail?.blockedTopics).toContain("mental health diagnosis");
    expect(guardrail?.disclaimer).toContain("not a licensed therapist");
  });
});
