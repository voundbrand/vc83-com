import { describe, expect, it } from "vitest";
import { telegramProvider } from "../../../convex/channels/providers/telegramProvider";

describe("Telegram webhook secret verification", () => {
  it("accepts matching x-telegram-bot-api-secret-token", () => {
    const verified = telegramProvider.verifyWebhook(
      "{}",
      {
        "x-telegram-bot-api-secret-token": "secret-token",
      },
      {
        providerId: "telegram",
        telegramWebhookSecret: "secret-token",
      }
    );

    expect(verified).toBe(true);
  });

  it("supports webhookSecret alias for legacy credential payloads", () => {
    const verified = telegramProvider.verifyWebhook(
      "{}",
      {
        "x-telegram-bot-api-secret-token": "legacy-secret",
      },
      {
        providerId: "telegram",
        webhookSecret: "legacy-secret",
      }
    );

    expect(verified).toBe(true);
  });

  it("rejects missing header token", () => {
    const verified = telegramProvider.verifyWebhook(
      "{}",
      {},
      {
        providerId: "telegram",
        telegramWebhookSecret: "secret-token",
      }
    );

    expect(verified).toBe(false);
  });

  it("rejects token mismatch", () => {
    const verified = telegramProvider.verifyWebhook(
      "{}",
      {
        "x-telegram-bot-api-secret-token": "wrong-token",
      },
      {
        providerId: "telegram",
        telegramWebhookSecret: "secret-token",
      }
    );

    expect(verified).toBe(false);
  });
});
