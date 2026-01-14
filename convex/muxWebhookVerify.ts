"use node";

/**
 * MUX WEBHOOK SIGNATURE VERIFICATION
 *
 * Separated from mux.ts to avoid bundler issues with @mux/mux-node's crypto imports.
 * This file only uses the crypto module directly for HMAC verification.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * VERIFY MUX WEBHOOK SIGNATURE
 *
 * Verifies the authenticity of Mux webhook requests.
 * Uses the webhook signature header and secret.
 *
 * Exposed as an internalAction so it can be called from httpActions
 * without bundler issues.
 */
export const verifyMuxWebhookSignature = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
    secret: v.string(),
  },
  handler: async (_ctx, args): Promise<boolean> => {
    const crypto = await import("crypto");

    // Mux uses a simple HMAC-SHA256 signature
    // The signature header format is: "t=<timestamp>,v1=<signature>"
    try {
      const parts = args.signature.split(",");
      const timestamp = parts.find((p: string) => p.startsWith("t="))?.slice(2);
      const sig = parts.find((p: string) => p.startsWith("v1="))?.slice(3);

      if (!timestamp || !sig) {
        console.error("[Mux Webhook] Invalid signature format");
        return false;
      }

      // Reconstruct the signed payload
      const signedPayload = `${timestamp}.${args.body}`;

      // Compute expected signature
      const expectedSig = crypto
        .createHmac("sha256", args.secret)
        .update(signedPayload)
        .digest("hex");

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSig)
      );

      if (!isValid) {
        console.error("[Mux Webhook] Signature mismatch");
      }

      return isValid;
    } catch (error) {
      console.error("[Mux Webhook] Signature verification error:", error);
      return false;
    }
  },
});
