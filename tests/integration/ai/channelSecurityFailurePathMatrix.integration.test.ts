import { describe, expect, it } from "vitest";
import { verifySlackRequestSignature } from "../../../convex/channels/providers/slackProvider";
import { verifyWhatsAppWebhookSignature } from "../../../convex/channels/providers/whatsappSignature";
import { telegramProvider } from "../../../convex/channels/providers/telegramProvider";
import { validateCredentialBoundary } from "../../../convex/channels/router";

async function signSlackPayload(
  signingSecret: string,
  body: string,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const base = `v0:${timestamp}:${body}`;
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(base));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `v0=${hex}`;
}

async function signWhatsAppPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

describe("channel security failure-path matrix", () => {
  it("keeps spoof/replay/rotation/routing-isolation checks green", async () => {
    const slackBody = JSON.stringify({
      type: "event_callback",
      event_id: "EvMatrix1",
    });
    const timestamp = 1_750_200_000;
    const spoofedSlackSignature = await signSlackPayload(
      "spoofed-secret",
      slackBody,
      timestamp
    );
    const rotatedSlackSignature = await signSlackPayload(
      "old-signing-secret",
      slackBody,
      timestamp
    );

    const spoofedSlackResult = await verifySlackRequestSignature({
      body: slackBody,
      signatureHeader: spoofedSlackSignature,
      timestampHeader: String(timestamp),
      signingSecrets: ["new-signing-secret"],
      nowMs: timestamp * 1000,
    });
    const replaySlackResult = await verifySlackRequestSignature({
      body: slackBody,
      signatureHeader: rotatedSlackSignature,
      timestampHeader: String(timestamp),
      signingSecrets: ["old-signing-secret"],
      nowMs: (timestamp + 601) * 1000,
    });
    const rotationSlackResult = await verifySlackRequestSignature({
      body: slackBody,
      signatureHeader: rotatedSlackSignature,
      timestampHeader: String(timestamp),
      signingSecrets: ["new-signing-secret", "old-signing-secret"],
      nowMs: timestamp * 1000,
    });

    const whatsappBody = JSON.stringify({ object: "whatsapp_business_account" });
    const spoofedWhatsAppSignature = await signWhatsAppPayload(
      "spoofed-whatsapp-secret",
      whatsappBody
    );
    const spoofedWhatsAppResult = await verifyWhatsAppWebhookSignature({
      payload: whatsappBody,
      signatureHeader: spoofedWhatsAppSignature,
      appSecret: "real-whatsapp-secret",
    });

    const telegramSpoofRejected = telegramProvider.verifyWebhook(
      "{}",
      {
        "x-telegram-bot-api-secret-token": "wrong-secret",
      },
      {
        providerId: "telegram",
        telegramWebhookSecret: "real-secret",
      }
    );

    const routingIsolationResult = validateCredentialBoundary({
      binding: {
        providerProfileType: "organization",
        providerInstallationId: "team-a",
        routeKey: "slack:team-a",
      },
      credentials: {
        providerId: "slack",
        credentialSource: "platform_fallback",
        providerProfileType: "platform",
        providerInstallationId: "team-a",
        bindingRouteKey: "slack:team-a",
      },
    });

    const matrix = {
      signatureSpoof: !spoofedSlackResult.valid && !spoofedWhatsAppResult && !telegramSpoofRejected,
      replayProtection:
        !replaySlackResult.valid &&
        replaySlackResult.reason === "stale_signature_timestamp",
      tokenRotation: rotationSlackResult.valid,
      routingIsolation:
        !routingIsolationResult.ok &&
        routingIsolationResult.reason?.includes("platform") === true,
    };

    expect(matrix.signatureSpoof).toBe(true);
    expect(matrix.replayProtection).toBe(true);
    expect(matrix.tokenRotation).toBe(true);
    expect(matrix.routingIsolation).toBe(true);
    expect(Object.values(matrix).every(Boolean)).toBe(true);
  });
});
