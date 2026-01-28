/**
 * Customer Authentication Endpoints
 *
 * These endpoints create frontend_users (customer accounts) instead of platform users.
 * The organization is determined by the API key used for authentication.
 *
 * Endpoints:
 * - POST /api/v1/auth/customer/sign-up   - Email registration (API key required)
 * - POST /api/v1/auth/customer/sign-in   - Email login (API key required)
 * - POST /api/v1/auth/customer/sign-out  - Logout (API key required)
 * - POST /api/v1/auth/customer/oauth     - OAuth Google/Apple (API key required)
 *
 * Key differences from platform auth (/api/v1/auth/sign-*):
 * - Requires API key authentication
 * - Creates frontend_user (objects table) not platform user (users table)
 * - Creates/links CRM contact
 * - Uses frontendSessions not sessions
 */

import { httpAction } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import { authenticateRequest } from "../../middleware/auth";

// Work around Convex type inference depth issues (TS2589)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const internal = require("../../_generated/api").internal;

// Password requirements
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Hash password using Web Crypto API (PBKDF2)
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
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
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

    // Constant-time comparison
    if (newDerivedKey.length !== storedDerivedKey.length) return false;
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
  if (!password) return { valid: false, error: "Password is required" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
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
  if (!email) return { valid: false, error: "Email is required" };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: "Invalid email format" };
  return { valid: true };
}

// ============================================================================
// CUSTOMER SIGN UP
// ============================================================================

/**
 * Customer Sign Up Handler
 *
 * POST /api/v1/auth/customer/sign-up
 *
 * Creates a frontend_user + CRM contact for the organization.
 * Requires API key authentication.
 */
export const customerSignUpHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    // 1. Authenticate via API key (REQUIRED)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        {
          status: authResult.status,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
        }
      );
    }

    const organizationId = authResult.context.organizationId;

    // 2. Parse request body
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    console.log("[Customer Sign-Up] Request for org:", organizationId, { email, hasPassword: !!password });

    // 3. Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: emailValidation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: passwordValidation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    if (!firstName) {
      return new Response(
        JSON.stringify({ success: false, error: "First name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Check if frontend_user already exists
    const existingUser = await ctx.runQuery(
      internal.api.v1.customerAuthInternal.findFrontendUserByEmail,
      { email: normalizedEmail, organizationId }
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: "An account with this email already exists" }),
        { status: 409, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    // 5. Hash password
    const passwordHash = await hashPassword(password);

    // 6. Create frontend_user
    const frontendUserId: Id<"objects"> = await ctx.runMutation(
      internal.api.v1.customerAuthInternal.createFrontendUserWithPassword,
      {
        organizationId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: (lastName || "").trim(),
        passwordHash,
      }
    );

    // 7. Create/upsert CRM contact
    type ContactResult = { contactId: Id<"objects">; isNew: boolean };
    const contactResult: ContactResult = await ctx.runMutation(
      internal.api.v1.crmInternal.createContactInternal,
      {
        organizationId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: (lastName || "").trim(),
        subtype: "lead",
        source: "atheon_app",
        tags: ["atheon", "mobile-signup"],
      }
    );

    // 8. Link frontend_user → crm_contact
    await ctx.runMutation(internal.auth.linkFrontendUserToCRM, {
      userId: frontendUserId,
      email: normalizedEmail,
      organizationId,
    });

    // 9. Create frontend session
    const sessionId: string = await ctx.runMutation(
      internal.api.v1.customerAuthInternal.createFrontendSession,
      {
        frontendUserId,
        email: normalizedEmail,
        organizationId,
        userAgent: request.headers.get("user-agent") || undefined,
      }
    );

    // 10. Get user profile for response
    const userProfile = await ctx.runQuery(
      internal.api.v1.customerAuthInternal.getFrontendUserProfile,
      { userId: frontendUserId, organizationId }
    );

    const duration = Date.now() - startTime;
    console.log(`[Customer Sign-Up] Success in ${duration}ms:`, { frontendUserId, email: normalizedEmail });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        frontendUserId,
        contactId: contactResult.contactId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: (lastName || "").trim(),
        organizationId,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        isNewUser: true,
        user: userProfile,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Customer Sign-Up] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
    );
  }
});

// ============================================================================
// CUSTOMER SIGN IN
// ============================================================================

/**
 * Customer Sign In Handler
 *
 * POST /api/v1/auth/customer/sign-in
 */
export const customerSignInHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    // 1. Authenticate via API key (REQUIRED)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        {
          status: authResult.status,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
        }
      );
    }

    const organizationId = authResult.context.organizationId;

    // 2. Parse request body
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Find frontend_user with password
    type UserWithPassword = {
      _id: Id<"objects">;
      email: string;
      firstName: string | null;
      lastName: string | null;
      passwordHash: string | null;
      isPasswordSet: boolean;
      status: string;
      subtype: string;
    } | null;

    const user: UserWithPassword = await ctx.runQuery(
      internal.api.v1.customerAuthInternal.findFrontendUserWithPassword,
      { email: normalizedEmail, organizationId }
    );

    // Generic error to prevent user enumeration
    const authError = new Response(
      JSON.stringify({ success: false, error: "Invalid email or password" }),
      { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
    );

    if (!user) return authError;

    // 4. Check if user has password set
    if (!user.isPasswordSet || !user.passwordHash) {
      // User may have signed up via OAuth
      return new Response(
        JSON.stringify({
          success: false,
          error: "This account uses social login. Please sign in with Google or Apple.",
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    // 5. Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) return authError;

    // 6. Update last login
    await ctx.runMutation(internal.api.v1.customerAuthInternal.updateFrontendUserLastLogin, {
      userId: user._id,
    });

    // 7. Create frontend session
    const sessionId: string = await ctx.runMutation(
      internal.api.v1.customerAuthInternal.createFrontendSession,
      {
        frontendUserId: user._id,
        email: normalizedEmail,
        organizationId,
        userAgent: request.headers.get("user-agent") || undefined,
      }
    );

    // 8. Get user profile
    const userProfile = await ctx.runQuery(
      internal.api.v1.customerAuthInternal.getFrontendUserProfile,
      { userId: user._id, organizationId }
    );

    const duration = Date.now() - startTime;
    console.log(`[Customer Sign-In] Success in ${duration}ms:`, { userId: user._id, email: normalizedEmail });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        frontendUserId: user._id,
        contactId: userProfile?.crmContactId || null,
        email: normalizedEmail,
        organizationId,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        isNewUser: false,
        user: userProfile,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Customer Sign-In] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
    );
  }
});

// ============================================================================
// CUSTOMER SIGN OUT
// ============================================================================

/**
 * Customer Sign Out Handler
 *
 * POST /api/v1/auth/customer/sign-out
 */
export const customerSignOutHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    // 1. Authenticate via API key (REQUIRED)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        {
          status: authResult.status,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
        }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Session ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    // 3. Delete session
    await ctx.runMutation(internal.api.v1.customerAuthInternal.deleteFrontendSession, {
      sessionId,
    });

    const duration = Date.now() - startTime;
    console.log(`[Customer Sign-Out] Success in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Customer Sign-Out] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
    );
  }
});

// ============================================================================
// CUSTOMER OAUTH (Google/Apple)
// ============================================================================

/**
 * Verify Google ID Token
 */
async function verifyGoogleIdToken(
  idToken: string,
  email: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) return { valid: false, error: "Invalid Google ID token" };

    const tokenInfo = await response.json();
    if (tokenInfo.email !== email) {
      return { valid: false, error: "Token email does not match" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to verify Google ID token" };
  }
}

/**
 * Verify Apple ID Token
 */
async function verifyAppleIdToken(
  idToken: string,
  email: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return { valid: false, error: "Invalid Apple ID token format" };

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));

    if (decoded.iss !== "https://appleid.apple.com") {
      return { valid: false, error: "Invalid Apple token issuer" };
    }

    if (decoded.email && decoded.email !== email) {
      return { valid: false, error: "Token email does not match" };
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return { valid: false, error: "Apple ID token has expired" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to verify Apple ID token" };
  }
}

/**
 * Customer OAuth Handler
 *
 * POST /api/v1/auth/customer/oauth
 *
 * Handles Google and Apple OAuth for customers.
 */
export const customerOAuthHandler = httpAction(async (ctx, request) => {
  const startTime = Date.now();
  const origin = request.headers.get("origin");

  try {
    // 1. Authenticate via API key (REQUIRED)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        {
          status: authResult.status,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
        }
      );
    }

    const organizationId = authResult.context.organizationId;

    // 2. Parse request body
    const body = await request.json();
    const { provider, email, name, providerUserId, idToken } = body;

    console.log("[Customer OAuth] Request for org:", organizationId, { provider, email });

    // 3. Validate required fields
    if (!provider || !email || !providerUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: provider, email, providerUserId",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    if (provider !== "google" && provider !== "apple") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid provider. Supported: google, apple",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Verify ID token if provided
    if (idToken) {
      const verification = provider === "google"
        ? await verifyGoogleIdToken(idToken, normalizedEmail)
        : await verifyAppleIdToken(idToken, normalizedEmail);

      if (!verification.valid) {
        return new Response(
          JSON.stringify({ success: false, error: verification.error }),
          { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
        );
      }
    }

    // 5. Parse name
    let firstName = "";
    let lastName = "";
    if (name) {
      const nameParts = name.trim().split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";
    } else {
      firstName = normalizedEmail.split("@")[0] || "User";
    }

    // 6. Check for existing user by OAuth ID
    let existingUser = await ctx.runQuery(
      internal.api.v1.customerAuthInternal.findFrontendUserByOAuth,
      { organizationId, provider, providerUserId }
    );

    let frontendUserId: Id<"objects">;
    let isNewUser = false;

    if (existingUser) {
      // Existing OAuth user - log them in
      frontendUserId = existingUser._id;
      await ctx.runMutation(internal.api.v1.customerAuthInternal.updateFrontendUserLastLogin, {
        userId: frontendUserId,
      });
    } else {
      // Check by email (might have password account)
      const userByEmail = await ctx.runQuery(
        internal.api.v1.customerAuthInternal.findFrontendUserByEmail,
        { email: normalizedEmail, organizationId }
      );

      if (userByEmail) {
        // Link OAuth to existing account
        frontendUserId = userByEmail._id;
        // TODO: Could update user to add OAuth provider info
        await ctx.runMutation(internal.api.v1.customerAuthInternal.updateFrontendUserLastLogin, {
          userId: frontendUserId,
        });
      } else {
        // Create new OAuth user
        frontendUserId = await ctx.runMutation(
          internal.api.v1.customerAuthInternal.createFrontendUserFromOAuth,
          {
            organizationId,
            email: normalizedEmail,
            firstName,
            lastName,
            provider,
            providerUserId,
          }
        );
        isNewUser = true;

        // Create/upsert CRM contact
        await ctx.runMutation(internal.api.v1.crmInternal.createContactInternal, {
          organizationId,
          email: normalizedEmail,
          firstName,
          lastName,
          subtype: "lead",
          source: "atheon_app",
          tags: ["atheon", "mobile-signup", `oauth-${provider}`],
        });

        // Link frontend_user → crm_contact
        await ctx.runMutation(internal.auth.linkFrontendUserToCRM, {
          userId: frontendUserId,
          email: normalizedEmail,
          organizationId,
        });
      }
    }

    // 7. Create frontend session
    const sessionId: string = await ctx.runMutation(
      internal.api.v1.customerAuthInternal.createFrontendSession,
      {
        frontendUserId,
        email: normalizedEmail,
        organizationId,
        userAgent: request.headers.get("user-agent") || undefined,
      }
    );

    // 8. Get user profile
    const userProfile = await ctx.runQuery(
      internal.api.v1.customerAuthInternal.getFrontendUserProfile,
      { userId: frontendUserId, organizationId }
    );

    const duration = Date.now() - startTime;
    console.log(`[Customer OAuth] Success in ${duration}ms:`, { frontendUserId, email: normalizedEmail, isNewUser });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        frontendUserId,
        contactId: userProfile?.crmContactId || null,
        email: normalizedEmail,
        firstName,
        lastName,
        organizationId,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        isNewUser,
        user: userProfile,
      }),
      {
        status: isNewUser ? 201 : 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Customer OAuth] Error after ${duration}ms:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } }
    );
  }
});

// ============================================================================
// OPTIONS HANDLER (CORS)
// ============================================================================

export const customerAuthOptionsHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});
