import { describe, expect, it } from "vitest";
import {
  buildSlackEventIdempotencyKey,
  buildSlackSlashCommandIdempotencyKey,
} from "../../../convex/channels/webhooks";

describe("Slack replay idempotency key generation", () => {
  it("generates stable event idempotency keys when provider event ID is present", () => {
    const first = buildSlackEventIdempotencyKey({
      organizationId: "org_123",
      providerEventId: "EvABC",
      nowMs: 1_700_000_000_000,
    });
    const second = buildSlackEventIdempotencyKey({
      organizationId: "org_123",
      providerEventId: "EvABC",
      nowMs: 1_700_000_999_999,
    });

    expect(first).toBe("slack:org_123:EvABC");
    expect(second).toBe(first);
  });

  it("falls back to timestamp-based keys when provider event ID is absent", () => {
    const first = buildSlackEventIdempotencyKey({
      organizationId: "org_123",
      nowMs: 1_700_000_000_000,
    });
    const second = buildSlackEventIdempotencyKey({
      organizationId: "org_123",
      nowMs: 1_700_000_000_001,
    });

    expect(first).toBe("slack:org_123:1700000000000");
    expect(second).toBe("slack:org_123:1700000000001");
    expect(second).not.toBe(first);
  });

  it("generates deterministic slash-command idempotency keys", () => {
    const key = buildSlackSlashCommandIdempotencyKey({
      organizationId: "org_456",
      providerEventId: "trigger_789",
    });

    expect(key).toBe("slack:org_456:slash:trigger_789");
  });
});
