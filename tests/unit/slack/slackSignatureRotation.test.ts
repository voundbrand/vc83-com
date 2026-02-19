import { describe, expect, it } from "vitest";
import { verifySlackRequestSignature } from "../../../convex/channels/providers/slackProvider";

async function signPayload(
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

describe("Slack signature rotation verification", () => {
  it("accepts signatures created with a previous signing secret candidate", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "EvRotation1" });
    const timestamp = 1_750_100_000;
    const signatureHeader = await signPayload("old-signing-secret", body, timestamp);

    const result = await verifySlackRequestSignature({
      body,
      signatureHeader,
      timestampHeader: String(timestamp),
      signingSecrets: ["new-signing-secret", "old-signing-secret"],
      nowMs: timestamp * 1000,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects requests when no signing secret candidates are configured", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "EvRotation2" });
    const timestamp = 1_750_100_100;
    const signatureHeader = await signPayload("old-signing-secret", body, timestamp);

    const result = await verifySlackRequestSignature({
      body,
      signatureHeader,
      timestampHeader: String(timestamp),
      signingSecrets: [],
      nowMs: timestamp * 1000,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("missing_signing_secret");
  });

  it("rejects mismatched signatures even when multiple candidates exist", async () => {
    const body = JSON.stringify({ type: "event_callback", event_id: "EvRotation3" });
    const timestamp = 1_750_100_200;
    const signatureHeader = await signPayload("incorrect-secret", body, timestamp);

    const result = await verifySlackRequestSignature({
      body,
      signatureHeader,
      timestampHeader: String(timestamp),
      signingSecrets: ["new-signing-secret", "old-signing-secret"],
      nowMs: timestamp * 1000,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
  });
});
