/**
 * Passkey (WebAuthn) Authentication
 *
 * Provides multi-factor authentication using passkeys (Face ID, Touch ID, security keys).
 * This is optional MFA that works alongside existing password authentication.
 *
 * Flow:
 * 1. Registration: User adds passkey to their account (after password login)
 * 2. Login: User can authenticate with passkey instead of password
 * 3. Management: Users can view/delete their registered passkeys
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";

// Relying Party configuration
const RP_NAME = "l4yercak3";

/**
 * Convert Uint8Array to base64url string (without Buffer)
 * This works in Convex's runtime environment
 */
function uint8ArrayToBase64url(bytes: Uint8Array): string {
  // Convert bytes to base64
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Convert base64 to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64url string to Uint8Array (without Buffer)
 */
function base64urlToUint8Array(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }

  // Decode base64 to binary string
  const binary = atob(base64);

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * REGISTRATION FLOW
 */

/**
 * Step 1: Generate registration challenge
 * Called when user wants to add a passkey to their account
 */
export const generateRegistrationChallenge = action({
  args: {
    sessionId: v.string(),
    deviceName: v.string(), // User-friendly name for this device
    origin: v.string(), // Origin URL (e.g., "http://localhost:3000" or "https://app.l4yercak3.com")
  },
  handler: async (ctx, args): Promise<PublicKeyCredentialCreationOptionsJSON> => {
    // Verify session
    const session = await ctx.runQuery(internal.passkeys.getSession, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Invalid session");
    }

    // Get user's existing passkeys to prevent duplicate registrations
    const existingPasskeys = await ctx.runQuery(internal.passkeys.getUserPasskeys, {
      userId: session.userId,
    });

    const user = await ctx.runQuery(internal.passkeys.getUser, {
      userId: session.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Determine RP_ID from origin (remove protocol and port)
    const rpId = new URL(args.origin).hostname;

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userID: new TextEncoder().encode(session.userId), // Convert user ID string to Uint8Array
      userName: user.email,
      userDisplayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,

      // Don't prompt for attestation (simpler UX)
      attestationType: "none",

      // Exclude existing credentials (prevent duplicate registrations)
      excludeCredentials: existingPasskeys.map((passkey: any) => ({
        id: passkey.credentialId,
        type: "public-key" as const,
        transports: passkey.transports as ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[] | undefined,
      })),

      // Prefer platform authenticators (Face ID/Touch ID) over security keys
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform", // Prefer built-in (Face ID/Touch ID)
      },
    });

    // Store challenge for verification
    await ctx.runMutation(internal.passkeys.storeRegistrationChallenge, {
      userId: session.userId,
      challenge: options.challenge,
      deviceName: args.deviceName,
    });

    return options;
  },
});

/**
 * Step 2: Verify registration response
 * Called after user completes Face ID/Touch ID on their device
 */
export const verifyRegistration = action({
  args: {
    sessionId: v.string(),
    response: v.any(), // RegistrationResponseJSON from browser
    origin: v.string(), // Origin URL for verification
  },
  handler: async (ctx, args): Promise<{ success: boolean; passkeyId: Id<"passkeys"> }> => {
    // Verify session
    const session = await ctx.runQuery(internal.passkeys.getSession, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Invalid session");
    }

    // Get stored challenge
    const challengeData = await ctx.runQuery(internal.passkeys.getRegistrationChallenge, {
      userId: session.userId,
    });

    if (!challengeData) {
      throw new Error("No registration challenge found");
    }

    const response = args.response as RegistrationResponseJSON;

    // Determine RP_ID from origin
    const rpId = new URL(args.origin).hostname;

    // Verify the registration response
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: args.origin,
        expectedRPID: rpId,
      });
    } catch (error) {
      throw new Error(`Verification failed: ${error}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration verification failed");
    }

    const credentialPublicKey = verification.registrationInfo.credential.publicKey;
    const credentialID = verification.registrationInfo.credential.id;
    const counter = verification.registrationInfo.credential.counter;
    const credentialDeviceType = verification.registrationInfo.credentialDeviceType;
    const credentialBackedUp = verification.registrationInfo.credentialBackedUp;

    // Convert credential data to base64url strings for storage
    // credentialID might be string or Uint8Array depending on library version
    const credentialIdStr = typeof credentialID === 'string'
      ? credentialID
      : uint8ArrayToBase64url(credentialID);

    const publicKeyStr = typeof credentialPublicKey === 'string'
      ? credentialPublicKey
      : uint8ArrayToBase64url(credentialPublicKey);

    // Store the passkey
    const passkeyId = await ctx.runMutation(internal.passkeys.createPasskey, {
      userId: session.userId,
      credentialId: credentialIdStr,
      publicKey: publicKeyStr,
      counter,
      deviceName: challengeData.deviceName,
      deviceType: credentialDeviceType,
      backupEligible: credentialBackedUp,
      backupState: credentialBackedUp,
      transports: response.response.transports,
    });

    // Clean up challenge
    await ctx.runMutation(internal.passkeys.deleteRegistrationChallenge, {
      userId: session.userId,
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: session.userId,
      organizationId: undefined,
      action: "passkey_registered",
      resource: "passkeys",
      success: true,
      metadata: {
        deviceName: challengeData.deviceName,
        deviceType: credentialDeviceType,
      },
    });

    return {
      success: true,
      passkeyId,
    };
  },
});

/**
 * AUTHENTICATION FLOW
 */

/**
 * Step 1: Generate authentication challenge
 * Called when user wants to login with passkey
 */
export const generateAuthenticationChallenge = action({
  args: {
    email: v.string(),
    origin: v.string(), // Origin URL (e.g., "http://localhost:3000" or "https://app.l4yercak3.com")
  },
  handler: async (ctx, args): Promise<PublicKeyCredentialRequestOptionsJSON | { error: string; code: string }> => {
    // Get user by email
    const user = await ctx.runQuery(internal.passkeys.getUserByEmail, {
      email: args.email,
    });

    if (!user) {
      return {
        error: "No account found with this email address. Please check your email or sign in with password.",
        code: "ACCOUNT_NOT_FOUND"
      };
    }

    // Get user's active passkeys
    const passkeys = await ctx.runQuery(internal.passkeys.getUserPasskeys, {
      userId: user._id,
    });

    if (passkeys.length === 0) {
      return {
        error: "No passkey set up for this account. Please sign in with your password first, then set up Face ID / Touch ID from your account settings.",
        code: "NO_PASSKEY_CONFIGURED"
      };
    }

    // Determine RP_ID from origin (remove protocol and port)
    const rpId = new URL(args.origin).hostname;

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: passkeys.map((passkey: any) => ({
        id: passkey.credentialId,
        type: "public-key" as const,
        transports: passkey.transports as ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[] | undefined,
      })),
      userVerification: "preferred",
    });

    // Store challenge for verification
    await ctx.runMutation(internal.passkeys.storeAuthenticationChallenge, {
      userId: user._id,
      challenge: options.challenge,
    });

    return options;
  },
});

/**
 * Step 2: Verify authentication response
 * Called after user completes Face ID/Touch ID for login
 */
export const verifyAuthentication = action({
  args: {
    email: v.string(),
    response: v.any(), // AuthenticationResponseJSON from browser
    origin: v.string(), // Origin URL for verification
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    sessionId: string;
    user: { id: Id<"users">; email: string; firstName?: string; lastName?: string };
  }> => {
    // Get user
    const user = await ctx.runQuery(internal.passkeys.getUserByEmail, {
      email: args.email,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get stored challenge
    const challengeData = await ctx.runQuery(internal.passkeys.getAuthenticationChallenge, {
      userId: user._id,
    });

    if (!challengeData) {
      throw new Error("No authentication challenge found");
    }

    const response = args.response as AuthenticationResponseJSON;

    // Find the passkey being used
    const passkey = await ctx.runQuery(internal.passkeys.getPasskeyByCredentialId, {
      credentialId: response.id,
    });

    if (!passkey) {
      throw new Error("Passkey not found");
    }

    if (!passkey.isActive) {
      throw new Error("Passkey has been revoked");
    }

    // Determine RP_ID from origin
    const rpId = new URL(args.origin).hostname;

    // Verify the authentication response
    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: args.origin,
        expectedRPID: rpId,
        credential: {
          id: passkey.credentialId,
          publicKey: base64urlToUint8Array(passkey.publicKey) as unknown as Uint8Array<ArrayBuffer>,
          counter: passkey.counter,
        },
      });
    } catch (error) {
      throw new Error(`Authentication verification failed: ${error}`);
    }

    if (!verification.verified) {
      throw new Error("Authentication verification failed");
    }

    // Update passkey counter and last used
    await ctx.runMutation(internal.passkeys.updatePasskeyUsage, {
      passkeyId: passkey._id,
      newCounter: verification.authenticationInfo.newCounter,
    });

    // Clean up challenge
    await ctx.runMutation(internal.passkeys.deleteAuthenticationChallenge, {
      userId: user._id,
    });

    // Create session (org-scoped for security)
    const organizationId = user.defaultOrgId;
    if (!organizationId) {
      throw new Error("User has no default organization. Please set one first.");
    }

    const sessionId = await ctx.runMutation(internal.passkeys.createSession, {
      userId: user._id,
      email: user.email,
      organizationId, // Org-scoped session for security
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: user._id,
      organizationId: undefined,
      action: "passkey_login",
      resource: "sessions",
      success: true,
      metadata: {
        deviceName: passkey.deviceName,
      },
    });

    return {
      success: true,
      sessionId,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },
});

/**
 * PASSKEY MANAGEMENT
 */

/**
 * List user's registered passkeys
 */
export const listPasskeys = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.sessionId as Id<"users">))
      .first();

    if (!session) {
      const actualSession = await ctx.db.get(args.sessionId as Id<"sessions">);
      if (!actualSession) {
        throw new Error("Invalid session");
      }

      const passkeys = await ctx.db
        .query("passkeys")
        .withIndex("by_user_active", (q) => q.eq("userId", actualSession.userId).eq("isActive", true))
        .collect();

      return passkeys.map((p) => ({
        id: p._id,
        deviceName: p.deviceName,
        deviceType: p.deviceType,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
        backupEligible: p.backupEligible,
        backupState: p.backupState,
      }));
    }

    const passkeys = await ctx.db
      .query("passkeys")
      .withIndex("by_user_active", (q) => q.eq("userId", session.userId).eq("isActive", true))
      .collect();

    return passkeys.map((p) => ({
      id: p._id,
      deviceName: p.deviceName,
      deviceType: p.deviceType,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
      backupEligible: p.backupEligible,
      backupState: p.backupState,
    }));
  },
});

/**
 * Delete a passkey
 */
export const deletePasskey = mutation({
  args: {
    sessionId: v.string(),
    passkeyId: v.id("passkeys"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session) {
      throw new Error("Invalid session");
    }

    // Get passkey and verify ownership
    const passkey = await ctx.db.get(args.passkeyId);
    if (!passkey) {
      throw new Error("Passkey not found");
    }

    if (passkey.userId !== session.userId) {
      throw new Error("Unauthorized");
    }

    // Soft delete (mark as inactive)
    await ctx.db.patch(args.passkeyId, {
      isActive: false,
      revokedAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      userId: session.userId,
      organizationId: undefined,
      action: "passkey_deleted",
      resource: "passkeys",
      success: true,
      createdAt: Date.now(),
      metadata: {
        deviceName: passkey.deviceName,
      },
    });

    return { success: true };
  },
});

/**
 * INTERNAL HELPERS
 */

export const getSession = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId as Id<"sessions">);
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getUserPasskeys = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("passkeys")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
  },
});

export const getPasskeyByCredentialId = internalQuery({
  args: { credentialId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("passkeys")
      .withIndex("by_credential", (q) => q.eq("credentialId", args.credentialId))
      .first();
  },
});

/**
 * CHALLENGE STORAGE
 * Store WebAuthn challenges in database for persistence across function invocations
 */

export const storeRegistrationChallenge = internalMutation({
  args: {
    userId: v.id("users"),
    challenge: v.string(),
    deviceName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    // Delete any existing registration challenges for this user
    const existing = await ctx.db
      .query("passkeysChallenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "registration"))
      .collect();

    for (const challenge of existing) {
      await ctx.db.delete(challenge._id);
    }

    // Store new challenge
    await ctx.db.insert("passkeysChallenges", {
      userId: args.userId,
      challenge: args.challenge,
      type: "registration",
      deviceName: args.deviceName,
      createdAt: now,
      expiresAt,
    });
  },
});

export const getRegistrationChallenge = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const challenge = await ctx.db
      .query("passkeysChallenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "registration"))
      .first();

    if (!challenge || challenge.expiresAt < now) {
      return null;
    }

    return {
      challenge: challenge.challenge,
      deviceName: challenge.deviceName || "",
    };
  },
});

export const deleteRegistrationChallenge = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const challenges = await ctx.db
      .query("passkeysChallenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "registration"))
      .collect();

    for (const challenge of challenges) {
      await ctx.db.delete(challenge._id);
    }
  },
});

export const storeAuthenticationChallenge = internalMutation({
  args: {
    userId: v.id("users"),
    challenge: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    // Delete any existing authentication challenges for this user
    const existing = await ctx.db
      .query("passkeysChallenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "authentication"))
      .collect();

    for (const challenge of existing) {
      await ctx.db.delete(challenge._id);
    }

    // Store new challenge
    await ctx.db.insert("passkeysChallenges", {
      userId: args.userId,
      challenge: args.challenge,
      type: "authentication",
      createdAt: now,
      expiresAt,
    });
  },
});

export const getAuthenticationChallenge = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const challenge = await ctx.db
      .query("passkeysChallenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "authentication"))
      .first();

    if (!challenge || challenge.expiresAt < now) {
      return null;
    }

    return {
      challenge: challenge.challenge,
    };
  },
});

export const deleteAuthenticationChallenge = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const challenges = await ctx.db
      .query("passkeysChallenges")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "authentication"))
      .collect();

    for (const challenge of challenges) {
      await ctx.db.delete(challenge._id);
    }
  },
});

export const createPasskey = internalMutation({
  args: {
    userId: v.id("users"),
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceName: v.string(),
    deviceType: v.optional(v.string()),
    backupEligible: v.optional(v.boolean()),
    backupState: v.optional(v.boolean()),
    transports: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("passkeys", {
      userId: args.userId,
      credentialId: args.credentialId,
      publicKey: args.publicKey,
      counter: args.counter,
      deviceName: args.deviceName,
      deviceType: args.deviceType,
      aaguid: undefined,
      transports: args.transports,
      backupEligible: args.backupEligible,
      backupState: args.backupState,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updatePasskeyUsage = internalMutation({
  args: {
    passkeyId: v.id("passkeys"),
    newCounter: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.passkeyId, {
      counter: args.newCounter,
      lastUsedAt: Date.now(),
    });
  },
});

export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    organizationId: v.id("organizations"), // Required for org-scoped security
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      email: args.email,
      organizationId: args.organizationId, // Server-side org context enforcement
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
  },
});
