"use node";

import bcrypt from "bcryptjs";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Hash a password using bcrypt
 * This must run in Node.js runtime due to crypto operations
 */
export const hashPassword = internalAction({
  args: {
    password: v.string()
  },
  handler: async (ctx, args) => {
    // Generate salt with 10 rounds (recommended for production)
    const salt = await bcrypt.genSalt(10);

    // Hash the password with the salt
    const hash = await bcrypt.hash(args.password, salt);

    return hash;
  },
});

/**
 * Verify a password against a hash using bcrypt
 * This must run in Node.js runtime due to crypto operations
 */
export const verifyPassword = internalAction({
  args: {
    password: v.string(),
    hash: v.string()
  },
  handler: async (ctx, args) => {
    // Compare the plain password with the hash
    const isValid = await bcrypt.compare(args.password, args.hash);

    return isValid;
  },
});

/**
 * Generate a secure random token for password reset or email verification
 * This must run in Node.js runtime due to crypto operations
 */
export const generateSecureToken = internalAction({
  args: {
    length: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const length = args.length || 32;

    // Generate random bytes and convert to hex string
    const salt = await bcrypt.genSalt(10);
    // Use the salt as a source of randomness and hash it
    const token = await bcrypt.hash(Date.now().toString() + salt, salt);

    // Return a URL-safe token by replacing special characters
    return token.replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
  },
});