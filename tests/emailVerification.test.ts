/**
 * Email Verification Tests
 *
 * Tests for email verification flow:
 * - Token generation and storage
 * - Email verification
 * - Token expiration
 * - Resending verification emails
 */

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

describe("Email Verification", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
  });

  it("should send verification email after signup", async () => {
    // Sign up a personal account
    const result = await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    expect(result.userId).toBeDefined();
    expect(result.requiresEmailVerification).toBe(true);

    // Check that verification token was created
    const verifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", result.userId))
        .collect();
    });

    expect(verifications).toHaveLength(1);
    expect(verifications[0].verified).toBe(false);
    expect(verifications[0].email).toBe("test@example.com");
    expect(verifications[0].token).toHaveLength(32);
  });

  it("should verify email with valid token", async () => {
    // Sign up
    const signupResult = await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    // Get the verification token
    const verification = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", signupResult.userId))
        .first();
    });

    expect(verification).toBeDefined();

    // Verify email
    const verifyResult = await t.mutation(api.emailVerification.verifyEmail, {
      token: verification!.token,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.message).toBe("Email verified successfully");

    // Check that user is marked as verified
    const user = await t.run(async (ctx) => {
      return await ctx.db.get(signupResult.userId);
    });

    expect(user?.emailVerified).toBe(true);

    // Check that verification is marked as used
    const updatedVerification = await t.run(async (ctx) => {
      return await ctx.db.get(verification!._id);
    });

    expect(updatedVerification?.verified).toBe(true);
    expect(updatedVerification?.verifiedAt).toBeDefined();
  });

  it("should reject invalid verification token", async () => {
    await expect(
      t.mutation(api.emailVerification.verifyEmail, {
        token: "invalid-token-123",
      })
    ).rejects.toThrow("Invalid verification token");
  });

  it("should reject expired verification token", async () => {
    // Sign up
    const signupResult = await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    // Get the verification token
    const verification = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", signupResult.userId))
        .first();
    });

    expect(verification).toBeDefined();

    // Manually expire the token
    await t.run(async (ctx) => {
      await ctx.db.patch(verification!._id, {
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });
    });

    // Try to verify with expired token
    await expect(
      t.mutation(api.emailVerification.verifyEmail, {
        token: verification!.token,
      })
    ).rejects.toThrow("Verification token expired");
  });

  it("should reject already verified token", async () => {
    // Sign up and verify
    const signupResult = await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    const verification = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", signupResult.userId))
        .first();
    });

    // First verification should succeed
    await t.mutation(api.emailVerification.verifyEmail, {
      token: verification!.token,
    });

    // Second verification should fail
    await expect(
      t.mutation(api.emailVerification.verifyEmail, {
        token: verification!.token,
      })
    ).rejects.toThrow("Email already verified");
  });

  it("should allow resending verification email", async () => {
    // Sign up
    const signupResult = await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    // Get initial verification
    const initialVerification = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", signupResult.userId))
        .first();
    });

    // Resend verification email
    const resendResult = await t.mutation(
      api.emailVerification.sendVerificationEmail,
      {
        userId: signupResult.userId,
      }
    );

    expect(resendResult.success).toBe(true);

    // Should still have only one verification token
    const verifications = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", signupResult.userId))
        .collect();
    });

    expect(verifications).toHaveLength(1);
    expect(verifications[0]._id).toEqual(initialVerification!._id);
  });

  it("should prevent login before email verification", async () => {
    // Sign up
    await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    // Try to login without verification
    await expect(
      t.mutation(api.auth.signInWithPassword, {
        email: "test@example.com",
        password: "StrongPass123!",
      })
    ).rejects.toThrow("Please verify your email before signing in");
  });

  it("should allow login after email verification", async () => {
    // Sign up
    const signupResult = await t.mutation(api.auth.signUpPersonal, {
      firstName: "Alice",
      email: "test@example.com",
      password: "StrongPass123!",
      ipAddress: "127.0.0.1",
    });

    // Get verification token
    const verification = await t.run(async (ctx) => {
      return await ctx.db
        .query("emailVerifications")
        // @ts-expect-error - convex-test doesn't fully support custom index types
        .withIndex("by_user", (q) => q.eq("userId", signupResult.userId))
        .first();
    });

    // Verify email
    await t.mutation(api.emailVerification.verifyEmail, {
      token: verification!.token,
    });

    // Login should now succeed
    const loginResult = await t.mutation(api.auth.signInWithPassword, {
      email: "test@example.com",
      password: "StrongPass123!",
    });

    expect(loginResult.user).toBeDefined();
    expect(loginResult.user.email).toBe("test@example.com");
  });

  // Note: Skipping test for getVerificationStatus query as it requires auth context
  // which is difficult to mock in tests. The query logic is simple and verified manually.
});
