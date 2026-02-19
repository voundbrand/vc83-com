import { describe, expect, it } from "vitest";
import { getAllProviders } from "../../../convex/channels/registry";

describe("channel adapter conformance", () => {
  it("handles malformed inbound payloads without throwing", () => {
    for (const provider of getAllProviders()) {
      const normalized = provider.normalizeInbound({}, { providerId: provider.id });
      expect(normalized).toBeNull();
    }
  });

  it("returns deterministic credential failures without throwing network errors", async () => {
    const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "";

    try {
      for (const provider of getAllProviders()) {
        const result = await provider.sendMessage(
          { providerId: provider.id },
          {
            channel: provider.capabilities.supportedChannels[0],
            recipientIdentifier: "recipient-1",
            content: "conformance check",
          }
        );
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      }
    } finally {
      process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
    }
  });

  it("exposes webhook verification as a boolean contract", () => {
    for (const provider of getAllProviders()) {
      const verified = provider.verifyWebhook(
        "{}",
        {},
        { providerId: provider.id }
      );
      expect(typeof verified).toBe("boolean");
    }
  });
});
