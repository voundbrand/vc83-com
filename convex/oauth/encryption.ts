"use node";

/**
 * Token Encryption Utilities
 *
 * Provides AES-256-GCM encryption for OAuth tokens before storing in database.
 * Uses OAUTH_ENCRYPTION_KEY from environment variables.
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";

/**
 * Encrypt a token using AES-256-GCM
 * This is an action because it runs in Node.js runtime with access to crypto
 */
export const encryptToken = internalAction({
  args: {
    plaintext: v.string(),
  },
  handler: async (_ctx, args): Promise<string> => {
    const crypto = await import("crypto");

    const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("OAUTH_ENCRYPTION_KEY environment variable is not set");
    }

    // Convert base64 key to buffer (32 bytes for AES-256)
    const keyBuffer = Buffer.from(encryptionKey, "base64");
    if (keyBuffer.length !== 32) {
      throw new Error("OAUTH_ENCRYPTION_KEY must be 32 bytes (256 bits)");
    }

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv);

    // Encrypt the token
    let encrypted = cipher.update(args.plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data, all as hex
    // Format: {iv:24chars}{authTag:32chars}{encrypted:variable}
    const combined = iv.toString("hex") + authTag.toString("hex") + encrypted;

    return combined;
  },
});

/**
 * Decrypt a token using AES-256-GCM
 * This is an action because it runs in Node.js runtime with access to crypto
 */
export const decryptToken = internalAction({
  args: {
    encrypted: v.string(),
  },
  handler: async (_ctx, args): Promise<string> => {
    const crypto = await import("crypto");

    const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("OAUTH_ENCRYPTION_KEY environment variable is not set");
    }

    // Validate that the input looks like an encrypted token (hex-encoded).
    // Encrypted format: {iv:24 hex}{authTag:32 hex}{data:variable hex}
    // Minimum length: 24 + 32 + 2 = 58 hex chars.
    // If it's shorter or contains non-hex chars, it's likely a plaintext token.
    const isHexEncrypted = args.encrypted.length >= 58 && /^[0-9a-f]+$/i.test(args.encrypted);
    if (!isHexEncrypted) {
      // Not encrypted — return as-is (legacy plaintext token)
      console.log("[Encryption] Token is not in encrypted format, returning as plaintext");
      return args.encrypted;
    }

    // Convert base64 key to buffer
    const keyBuffer = Buffer.from(encryptionKey, "base64");
    if (keyBuffer.length !== 32) {
      throw new Error("OAUTH_ENCRYPTION_KEY must be 32 bytes (256 bits)");
    }

    try {
      // Extract IV (first 24 hex chars = 12 bytes)
      const iv = Buffer.from(args.encrypted.slice(0, 24), "hex");

      // Extract auth tag (next 32 hex chars = 16 bytes)
      const authTag = Buffer.from(args.encrypted.slice(24, 56), "hex");

      // Extract encrypted data (remaining hex chars)
      const encryptedData = args.encrypted.slice(56);

      // Create decipher
      const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Test encryption/decryption (for development only)
 */
export const testEncryption = action({
  args: {
    testString: v.string(),
  },
  handler: async (ctx, args): Promise<{
    original: string;
    encrypted: string;
    decrypted: string;
    matches: boolean;
  }> => {
    const { internal } = await import("../_generated/api");

    // Encrypt
    const encrypted: string = await ctx.runAction(internal.oauth.encryption.encryptToken, {
      plaintext: args.testString,
    });

    // Decrypt
    const decrypted: string = await ctx.runAction(internal.oauth.encryption.decryptToken, {
      encrypted,
    });

    return {
      original: args.testString,
      encrypted,
      decrypted,
      matches: args.testString === decrypted,
    };
  },
});
