import { describe, expect, it, vi } from "vitest";
import { signupFreeAccount } from "../../../convex/onboarding";
import { buildTestKanzleiFixture } from "../../../convex/lib/kanzleiOnboardingFixture";

describe("Kanzlei self-serve signup provisioning", () => {
  it("forwards rich Kanzlei org metadata through signup so the shared baseline can seed downstream defaults", async () => {
    const fixture = buildTestKanzleiFixture({ suffix: "signup" });
    const schedulerCalls: Array<Record<string, unknown>> = [];
    const password = "Pw!KanzleiSignup";
    const email = "lea.falkenberg+signup@example.com";

    const runAction = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if (payload.password === password) {
        return "password_hash_signup";
      }

      if (typeof payload.password === "string" && payload.password.startsWith("sk_live_")) {
        return "api_key_hash_signup";
      }

      if (
        payload.organizationId === "organizations_kanzlei_signup"
        && payload.organizationName === fixture.businessName
        && payload.email === email
      ) {
        return "cus_kanzlei_signup";
      }

      throw new Error(`Unexpected runAction payload: ${JSON.stringify(payload)}`);
    });

    const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(payload, "passwordHash")) {
        return {
          success: true,
          sessionId: "sessions_kanzlei_signup",
          user: {
            id: "users_kanzlei_signup",
            email,
            firstName: fixture.ownerFirstName,
            lastName: fixture.ownerLastName,
          },
          organization: {
            id: "organizations_kanzlei_signup",
            name: fixture.businessName,
            slug: "kanzlei-test-partner-signup",
          },
          apiKeyPrefix: "sk_live_deadbeef",
          betaAccessStatus: "approved" as const,
        };
      }

      if (payload.startReason === "email_signup_complete") {
        return { success: true };
      }

      throw new Error(`Unexpected runMutation payload: ${JSON.stringify(payload)}`);
    });

    const ctx = {
      runAction,
      runMutation,
      scheduler: {
        runAfter: vi.fn(async (_delay: number, _ref: unknown, payload: Record<string, unknown>) => {
          schedulerCalls.push(payload);
        }),
      },
    };

    const result = await (signupFreeAccount as any)._handler(ctx, {
      email,
      password,
      firstName: fixture.ownerFirstName,
      lastName: fixture.ownerLastName,
      organizationName: fixture.businessName,
      description: fixture.description,
      industry: fixture.industry,
      contactEmail: fixture.contactEmail,
      contactPhone: fixture.contactPhone,
      timezone: fixture.timezone,
      dateFormat: fixture.dateFormat,
      language: fixture.language,
    });

    expect(result).toMatchObject({
      success: true,
      sessionId: "sessions_kanzlei_signup",
      organization: {
        id: "organizations_kanzlei_signup",
        name: fixture.businessName,
        slug: "kanzlei-test-partner-signup",
      },
      betaAccessStatus: "approved",
    });
    expect(result.apiKey.startsWith("sk_live_")).toBe(true);

    expect(runMutation).toHaveBeenCalledTimes(2);
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      email,
      organizationName: fixture.businessName,
      firstName: fixture.ownerFirstName,
      lastName: fixture.ownerLastName,
      passwordHash: "password_hash_signup",
      apiKeyHash: "api_key_hash_signup",
      description: fixture.description,
      industry: fixture.industry,
      contactEmail: fixture.contactEmail,
      contactPhone: fixture.contactPhone,
      timezone: fixture.timezone,
      dateFormat: fixture.dateFormat,
      language: fixture.language,
    });

    expect(runAction).toHaveBeenCalledTimes(3);
    expect(schedulerCalls).toHaveLength(2);
    expect(schedulerCalls[0]).toMatchObject({
      email,
      firstName: fixture.ownerFirstName,
      organizationName: fixture.businessName,
      apiKeyPrefix: "sk_live_deadbeef",
    });
    expect(schedulerCalls[1]).toMatchObject({
      eventType: "free_signup",
      organization: {
        name: fixture.businessName,
        planTier: "free",
      },
    });
  });
});
