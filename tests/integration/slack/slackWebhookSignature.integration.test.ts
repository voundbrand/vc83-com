import { describe, expect, it } from "vitest";
import {
  slackProvider,
  verifySlackRequestSignature,
} from "../../../convex/channels/providers/slackProvider";

const SIGNING_SECRET = "test-signing-secret";

async function signPayload(body: string, timestamp: number): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const base = `v0:${timestamp}:${body}`;
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(base));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `v0=${hex}`;
}

describe("Slack signature boundary integration", () => {
  it("accepts a valid signed request in replay window", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "Ev123" });
    const timestamp = 1_750_000_000;
    const signatureHeader = await signPayload(body, timestamp);

    const result = await verifySlackRequestSignature({
      body,
      signatureHeader,
      timestampHeader: String(timestamp),
      signingSecret: SIGNING_SECRET,
      nowMs: timestamp * 1000,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects stale request timestamps", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "Ev123" });
    const timestamp = 1_750_000_000;
    const signatureHeader = await signPayload(body, timestamp);

    const result = await verifySlackRequestSignature({
      body,
      signatureHeader,
      timestampHeader: String(timestamp),
      signingSecret: SIGNING_SECRET,
      nowMs: (timestamp + 601) * 1000,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("stale_signature_timestamp");
  });

  it("rejects requests with missing signature headers", async () => {
    const result = await verifySlackRequestSignature({
      body: JSON.stringify({ type: "event_callback", event_id: "EvMissingHeaders" }),
      signatureHeader: "",
      timestampHeader: "",
      signingSecret: SIGNING_SECRET,
      nowMs: 1_750_000_000_000,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("missing_signature_headers");
  });

  it("rejects requests with invalid timestamp headers", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "EvBadTs" });
    const signatureHeader = await signPayload(body, 1_750_000_000);

    const result = await verifySlackRequestSignature({
      body,
      signatureHeader,
      timestampHeader: "not-a-number",
      signingSecret: SIGNING_SECRET,
      nowMs: 1_750_000_000_000,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_signature_timestamp");
  });

  it("normalizes app mention events and ignores bot events", () => {
    const appMentionPayload = {
      type: "event_callback",
      event_id: "Ev456",
      event: {
        type: "app_mention",
        user: "U123",
        text: "hello bot",
        channel: "C999",
        ts: "1700000000.123",
      },
    };

    const normalized = slackProvider.normalizeInbound(appMentionPayload, {
      providerId: "slack",
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.channel).toBe("slack");
    expect(normalized?.externalContactIdentifier).toBe(
      "slack:C999:user:U123"
    );
    expect(normalized?.metadata.providerEventId).toBe("Ev456");
    expect(normalized?.metadata.providerConversationId).toBeUndefined();

    const botPayload = {
      type: "event_callback",
      event_id: "Ev789",
      event: {
        type: "message",
        bot_id: "B111",
        text: "I am the bot",
        channel: "C999",
        ts: "1700000001.000",
      },
    };
    const botNormalized = slackProvider.normalizeInbound(botPayload, {
      providerId: "slack",
    });
    expect(botNormalized).toBeNull();

    const threadedPayload = {
      type: "event_callback",
      event_id: "EvThread1",
      event: {
        type: "app_mention",
        user: "U777",
        text: "<@U-BOT> thread update",
        channel: "C999",
        ts: "1700000010.001",
        thread_ts: "1700000000.123",
      },
    };

    const threadedNormalized = slackProvider.normalizeInbound(threadedPayload, {
      providerId: "slack",
    });
    expect(threadedNormalized?.externalContactIdentifier).toBe(
      "slack:C999:1700000000.123"
    );
    expect(threadedNormalized?.metadata.providerConversationId).toBe(
      "1700000000.123"
    );
  });

  it("applies relative vacation parsing for events-ingress payload shape", () => {
    const eventsIngressPayload = {
      type: "event_callback",
      event_id: "EvVacationEventsIngress1",
      event: {
        type: "app_mention",
        user: "U123",
        text: "<@U-BOT> vacation next month timezone:UTC",
        channel: "C999",
        ts: "1710115200.000",
      },
    };

    const normalized = slackProvider.normalizeInbound(eventsIngressPayload, {
      providerId: "slack",
      slackBotUserId: "U-BOT",
    });
    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackInvocationType).toBe("mention");
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-04-01");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-04-30");
  });

  it("uses org timezone fallback for events-ingress relative payloads without explicit timezone text", () => {
    const eventsIngressPayload = {
      type: "event_callback",
      event_id: "EvVacationEventsIngressFallback1",
      event: {
        type: "app_mention",
        user: "U123",
        text: "<@U-BOT> vacation next month",
        channel: "C999",
        ts: "1710115200.000",
      },
    };

    const normalized = slackProvider.normalizeInbound(eventsIngressPayload, {
      providerId: "slack",
      slackBotUserId: "U-BOT",
      slackFallbackTimezone: "UTC",
      slackFallbackDateFormat: "MM/DD/YYYY",
    });
    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-04-01");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-04-30");
    expect(metadata.slackVacationRequestRelativeTimezoneSource).toBe(
      "organization_settings"
    );
  });

  it("keeps commands-ingress relative parsing fail-closed without received_at_ms anchor", () => {
    const commandsIngressPayload = {
      type: "slash_command",
      team_id: "T123",
      channel_id: "C123ABC",
      user_id: "U123",
      user_name: "alice",
      command: "/vacation",
      text: "this week tz:UTC",
      trigger_id: "TrigEventsIngress1",
    };

    const normalized = slackProvider.normalizeInbound(commandsIngressPayload, {
      providerId: "slack",
    });
    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackInvocationType).toBe("slash_command");
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("blocked");
    expect(metadata.slackVacationRequestBlockedReasons).toContain(
      "missing_relative_anchor_time"
    );
    expect(metadata.slackVacationRequestBlockedReasons).toContain("missing_iso_date");
  });
});
