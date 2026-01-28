/**
 * Email/Password Authentication
 *
 * Handles traditional email/password authentication for the mobile app.
 * This complements the mobile OAuth (Google Sign-In, Apple Sign-In) flow.
 *
 * Endpoints:
 * - POST /api/v1/auth/sign-up - Create new account with email/password
 * - POST /api/v1/auth/sign-in - Login with email/password
 * - POST /api/v1/auth/sign-out - Logout (invalidate session)
 */

import { httpAction } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

// Work around Convex type inference depth issues (TS2589) with large schemas
// eslint-disable-next-line @typescript-eslint/no-require-imports
const internal = require("../../_generated/api").internal;

// Password requirements
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Hash password using Web Crypto API (available in Convex runtime)
 *
 * Uses PBKDF2 with:
 * - SHA-256 hash algorithm
 * - 100,000 iterations (OWASP recommendation)
 * - 16-byte random salt
 * - 32-byte derived key
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  // Combine salt + hash for storage
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  // Return as base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();

    // Decode stored hash
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));

    // Extract salt (first 16 bytes) and hash (remaining bytes)
    const salt = combined.slice(0, 16);
    const storedDerivedKey = combined.slice(16);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const newDerivedKey = new Uint8Array(derivedBits);

    // Constant-time comparison to prevent timing attacks
    if (newDerivedKey.length !== storedDerivedKey.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < newDerivedKey.length; i++) {
      result |= newDerivedKey[i] ^ storedDerivedKey[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }

  // Check for at least one letter and one number (basic strength requirement)
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

// ============================================================================
// SIGN UP HANDLER
// ============================================================================

/**
 * Sign Up HTTP Handler
 *
 * POST /api/v1/auth/sign-up
 *
 * Creates a new user account with email/password.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepass123",
 *   "firstName": "John",
 *   "lastName": "Doe"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "...",
 *   "user": { "id": "...", "email": "...", ... }
 * }
 */
export const signUpHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    console.log("[Email Auth Sign-Up] Request received:", {
      email,
      hasPassword: !!password,
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
    });

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: emailValidation.error,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: passwordValidation.error,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Validate required fields
    if (!firstName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "First name is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    type ExistingUserResult = { _id: Id<"users">; email: string } | null;
    const existingUser: ExistingUserResult = await ctx.runQuery(
      internal.api.v1.emailAuthInternal.findUserByEmail,
      { email: normalizedEmail }
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "An account with this email already exists",
        }),
        {
          status: 409, // Conflict
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user using existing OAuth signup mutation (reuse logic)
    const createResult = await ctx.runMutation(
      internal.api.v1.oauthSignup.findOrCreateUserFromOAuth,
      {
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: (lastName || "").trim(),
      }
    );

    // Store password hash in userPasswords table and mark user as having password set
    await ctx.runMutation(internal.api.v1.emailAuthInternal.setPasswordHash, {
      userId: createResult.userId,
      passwordHash,
    });

    // Create password identity
    await ctx.runMutation(internal.auth.identity.createIdentity, {
      userId: createResult.userId,
      provider: "password" as const,
      providerUserId: normalizedEmail, // Use email as provider user ID
      providerEmail: normalizedEmail,
      isPrimary: true,
      metadata: { authMethod: "email_password" },
    });

    // Create platform session
    const sessionId: Id<"sessions"> = await ctx.runMutation(
      internal.api.v1.oauthSignup.createPlatformSession,
      {
        userId: createResult.userId,
        email: normalizedEmail,
        organizationId: createResult.organizationId,
      }
    );

    // Get user profile for response
    const userProfile = await ctx.runQuery(
      internal.api.v1.mobileOAuthInternal.getUserProfileForMobile,
      {
        userId: createResult.userId,
        organizationId: createResult.organizationId,
      }
    );

    // Trigger onboarding tasks (async, don't block response)
    const org = await ctx.runQuery(
      internal.api.v1.mobileOAuthInternal.getOrganizationById,
      { organizationId: createResult.organizationId }
    );
    const orgName = org?.name || `${firstName}'s Organization`;

    // Send welcome email (async)
    await ctx.scheduler.runAfter(0, internal.actions.welcomeEmail.sendWelcomeEmail, {
      email: normalizedEmail,
      firstName: firstName.trim(),
      organizationName: orgName,
      apiKeyPrefix: "n/a",
    });

    // Send sales notification (async)
    await ctx.scheduler.runAfter(0, internal.actions.salesNotificationEmail.sendSalesNotification, {
      eventType: "free_signup",
      user: {
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: (lastName || "").trim(),
      },
      organization: {
        name: orgName,
        planTier: "free",
      },
    });

    // Create Stripe customer (async)
    await ctx.scheduler.runAfter(0, internal.onboarding.createStripeCustomerForFreeUser, {
      organizationId: createResult.organizationId,
      organizationName: orgName,
      email: normalizedEmail,
    });

    const duration = Date.now() - startTime;
    console.log(`[Email Auth Sign-Up] Success in ${duration}ms:`, {
      userId: createResult.userId,
      email: normalizedEmail,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        userId: createResult.userId,
        email: normalizedEmail,
        organizationId: createResult.organizationId,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        isNewUser: true,
        user: userProfile || {
          id: createResult.userId,
          email: normalizedEmail,
          firstName: firstName.trim(),
          lastName: (lastName || "").trim(),
          isPasswordSet: true,
          organizations: org
            ? [
                {
                  id: org._id,
                  name: org.name,
                  slug: org.slug,
                  role: "org_owner",
                },
              ]
            : [],
          currentOrganization: org
            ? {
                id: org._id,
                name: org.name,
                slug: org.slug,
              }
            : null,
        },
      }),
      {
        status: 201, // Created
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Email Auth Sign-Up] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  }
});

// ============================================================================
// SIGN IN HANDLER
// ============================================================================

/**
 * Sign In HTTP Handler
 *
 * POST /api/v1/auth/sign-in
 *
 * Authenticates user with email/password.
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepass123"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "...",
 *   "user": { "id": "...", "email": "...", ... }
 * }
 */
export const signInHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("[Email Auth Sign-In] Request received:", {
      email,
      hasPassword: !!password,
    });

    // Validate inputs
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email and password are required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    type UserWithPassword = {
      _id: Id<"users">;
      email: string;
      firstName: string;
      lastName: string;
      passwordHash: string | null;
      isPasswordSet: boolean;
      defaultOrgId: Id<"organizations"> | null;
    } | null;
    const user: UserWithPassword = await ctx.runQuery(
      internal.api.v1.emailAuthInternal.findUserWithPassword,
      { email: normalizedEmail }
    );

    // Generic error to prevent user enumeration
    const authError = new Response(
      JSON.stringify({
        success: false,
        error: "Invalid email or password",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );

    if (!user) {
      console.log("[Email Auth Sign-In] User not found:", normalizedEmail);
      return authError;
    }

    // Check if user has password set
    if (!user.isPasswordSet || !user.passwordHash) {
      console.log("[Email Auth Sign-In] User has no password:", normalizedEmail);
      return new Response(
        JSON.stringify({
          success: false,
          error: "This account uses social login. Please sign in with Google or Apple.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      console.log("[Email Auth Sign-In] Invalid password for:", normalizedEmail);
      return authError;
    }

    if (!user.defaultOrgId) {
      console.error("[Email Auth Sign-In] User has no default organization:", normalizedEmail);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Account configuration error. Please contact support.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Update identity last used timestamp
    await ctx.runMutation(internal.api.v1.emailAuthInternal.updatePasswordIdentityLastUsed, {
      userId: user._id,
    });

    // Create platform session
    const sessionId: Id<"sessions"> = await ctx.runMutation(
      internal.api.v1.oauthSignup.createPlatformSession,
      {
        userId: user._id,
        email: normalizedEmail,
        organizationId: user.defaultOrgId,
      }
    );

    // Get user profile for response
    const userProfile = await ctx.runQuery(
      internal.api.v1.mobileOAuthInternal.getUserProfileForMobile,
      {
        userId: user._id,
        organizationId: user.defaultOrgId,
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[Email Auth Sign-In] Success in ${duration}ms:`, {
      userId: user._id,
      email: normalizedEmail,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        userId: user._id,
        email: normalizedEmail,
        organizationId: user.defaultOrgId,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        isNewUser: false,
        user: userProfile,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Email Auth Sign-In] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  }
});

// ============================================================================
// SIGN OUT HANDLER
// ============================================================================

/**
 * Sign Out HTTP Handler
 *
 * POST /api/v1/auth/sign-out
 *
 * Invalidates the user's session.
 *
 * Request body:
 * {
 *   "sessionId": "..."
 * }
 *
 * Response:
 * {
 *   "success": true
 * }
 */
export const signOutHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    const body = await request.json();
    const { sessionId } = body;

    console.log("[Email Auth Sign-Out] Request received:", {
      hasSessionId: !!sessionId,
    });

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session ID is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Delete session
    await ctx.runMutation(internal.api.v1.emailAuthInternal.deleteSession, {
      sessionId,
    });

    const duration = Date.now() - startTime;
    console.log(`[Email Auth Sign-Out] Success in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Email Auth Sign-Out] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(origin),
        },
      }
    );
  }
});

// ============================================================================
// OPTIONS HANDLER (CORS)
// ============================================================================

/**
 * Options Handler for CORS preflight
 */
export const emailAuthOptionsHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});
