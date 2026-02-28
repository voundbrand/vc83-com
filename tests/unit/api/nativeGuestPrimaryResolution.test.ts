import { describe, expect, it } from "vitest";
import { resolvePrimaryAwareNativeGuestAgentId } from "../../../src/app/api/native-guest/config/route";

describe("resolvePrimaryAwareNativeGuestAgentId", () => {
  it("prefers the primary agent that has native_guest channel binding enabled", () => {
    const resolvedId = resolvePrimaryAwareNativeGuestAgentId([
      {
        _id: "agent-primary-a",
        customProperties: {
          isPrimary: true,
        },
      },
      {
        _id: "agent-primary-b",
        customProperties: {
          isPrimary: true,
          channelBindings: [{ channel: "native_guest", enabled: true }],
        },
      },
    ]);

    expect(resolvedId).toBe("agent-primary-b");
  });

  it("falls back to deterministic primary ordering when no native_guest binding is configured", () => {
    const resolvedId = resolvePrimaryAwareNativeGuestAgentId([
      {
        _id: "agent-primary-z",
        customProperties: { isPrimary: true },
      },
      {
        _id: "agent-primary-a",
        customProperties: { isPrimary: true },
      },
    ]);

    expect(resolvedId).toBe("agent-primary-a");
  });

  it("returns null when there is no primary candidate", () => {
    const resolvedId = resolvePrimaryAwareNativeGuestAgentId([
      {
        _id: "agent-general",
        customProperties: { isPrimary: false },
      },
    ]);

    expect(resolvedId).toBeNull();
  });
});
