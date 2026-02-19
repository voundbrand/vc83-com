import { describe, expect, it } from "vitest";
import { verifyWhatsAppWebhookSignature } from "../../../convex/channels/providers/whatsappSignature";

async function signPayload(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

describe("WhatsApp webhook signature verification", () => {
  it("accepts valid sha256-prefixed signatures", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = await signPayload("whatsapp-app-secret", payload);

    const valid = await verifyWhatsAppWebhookSignature({
      payload,
      signatureHeader: signature,
      appSecret: "whatsapp-app-secret",
    });

    expect(valid).toBe(true);
  });

  it("accepts valid signatures without sha256 prefix", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = await signPayload("whatsapp-app-secret", payload);

    const valid = await verifyWhatsAppWebhookSignature({
      payload,
      signatureHeader: signature.replace("sha256=", ""),
      appSecret: "whatsapp-app-secret",
    });

    expect(valid).toBe(true);
  });

  it("rejects spoofed signatures", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = await signPayload("spoofed-secret", payload);

    const valid = await verifyWhatsAppWebhookSignature({
      payload,
      signatureHeader: signature,
      appSecret: "whatsapp-app-secret",
    });

    expect(valid).toBe(false);
  });

  it("rejects malformed signature headers", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account" });

    const valid = await verifyWhatsAppWebhookSignature({
      payload,
      signatureHeader: "not-a-sha256",
      appSecret: "whatsapp-app-secret",
    });

    expect(valid).toBe(false);
  });

  it("rejects when app secret is missing", async () => {
    const payload = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = await signPayload("whatsapp-app-secret", payload);

    const valid = await verifyWhatsAppWebhookSignature({
      payload,
      signatureHeader: signature,
      appSecret: undefined,
    });

    expect(valid).toBe(false);
  });
});
