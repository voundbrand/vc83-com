import { describe, expect, it } from "vitest";
import {
  executeTwoStageFailover,
  TwoStageFailoverError,
} from "../../../convex/ai/twoStageFailoverExecutor";

interface AuthProfileFixture {
  providerId: string;
  profileId: string;
}

function profileKey(profile: AuthProfileFixture): string {
  return `${profile.providerId}:${profile.profileId}`;
}

describe("two-stage failover executor", () => {
  it("rotates auth profiles before falling back to another model", async () => {
    const attempts: string[] = [];
    const profiles: AuthProfileFixture[] = [
      { providerId: "openrouter", profileId: "alpha" },
      { providerId: "openrouter", profileId: "beta" },
    ];

    const result = await executeTwoStageFailover<string, AuthProfileFixture>({
      modelIds: ["m1", "m2"],
      resolveModelPlan: () => ({ authProfiles: profiles }),
      getAuthProfileKey: profileKey,
      failedAttemptCount: 3,
      executeAttempt: async ({ modelId, authProfile }) => {
        attempts.push(`${modelId}:${authProfile.profileId}`);
        if (modelId === "m1" && authProfile.profileId === "alpha") {
          throw new Error("rate limit");
        }
        return {
          result: `${modelId}:${authProfile.profileId}`,
          attempts: 1,
        };
      },
      shouldRotateAuthProfile: ({ error }) =>
        (error instanceof Error ? error.message : String(error)).includes("rate limit"),
    });

    expect(attempts).toEqual(["m1:alpha", "m1:beta"]);
    expect(result.usedModelId).toBe("m1");
    expect(result.usedAuthProfile.profileId).toBe("beta");
    expect(result.delayReason).toBe("auth_profile_rotation");
  });

  it("falls back to the next model only after exhausting auth profiles", async () => {
    const attempts: string[] = [];
    const profiles: AuthProfileFixture[] = [
      { providerId: "openrouter", profileId: "alpha" },
      { providerId: "openrouter", profileId: "beta" },
    ];

    const result = await executeTwoStageFailover<string, AuthProfileFixture>({
      modelIds: ["m1", "m2"],
      resolveModelPlan: () => ({ authProfiles: profiles }),
      getAuthProfileKey: profileKey,
      failedAttemptCount: 3,
      executeAttempt: async ({ modelId, authProfile }) => {
        attempts.push(`${modelId}:${authProfile.profileId}`);
        if (modelId === "m2" && authProfile.profileId === "alpha") {
          return { result: "ok", attempts: 1 };
        }
        throw new Error("provider error");
      },
    });

    expect(attempts).toEqual(["m1:alpha", "m1:beta", "m2:alpha"]);
    expect(result.usedModelId).toBe("m2");
    expect(result.usedAuthProfile.profileId).toBe("alpha");
  });

  it("carries rotated profiles across model fallback passes by default", async () => {
    const attempts: string[] = [];
    const profiles: AuthProfileFixture[] = [
      { providerId: "openrouter", profileId: "alpha" },
      { providerId: "openrouter", profileId: "beta" },
    ];

    const result = await executeTwoStageFailover<string, AuthProfileFixture>({
      modelIds: ["m1", "m2"],
      resolveModelPlan: ({ cooledProfileKeys }) => ({
        authProfiles: profiles.filter(
          (profile) => !cooledProfileKeys.has(profileKey(profile))
        ),
      }),
      getAuthProfileKey: profileKey,
      failedAttemptCount: 3,
      executeAttempt: async ({ modelId, authProfile }) => {
        attempts.push(`${modelId}:${authProfile.profileId}`);
        if (modelId === "m1" && authProfile.profileId === "alpha") {
          throw new Error("rate limit");
        }
        if (modelId === "m1" && authProfile.profileId === "beta") {
          throw new Error("provider error");
        }
        return { result: "ok", attempts: 1 };
      },
      shouldRotateAuthProfile: ({ error }) =>
        (error instanceof Error ? error.message : String(error)).includes("rate limit"),
    });

    expect(attempts).toEqual(["m1:alpha", "m1:beta", "m2:beta"]);
    expect(result.usedModelId).toBe("m2");
    expect(result.usedAuthProfile.profileId).toBe("beta");
  });

  it("can preserve per-model auth rotation without carrying cooled profiles", async () => {
    const attempts: string[] = [];
    const profiles: AuthProfileFixture[] = [
      { providerId: "openrouter", profileId: "alpha" },
      { providerId: "openrouter", profileId: "beta" },
    ];

    const result = await executeTwoStageFailover<string, AuthProfileFixture>({
      modelIds: ["m1", "m2"],
      carryRotatedProfilesAcrossModels: false,
      resolveModelPlan: ({ cooledProfileKeys }) => ({
        authProfiles: profiles.filter(
          (profile) => !cooledProfileKeys.has(profileKey(profile))
        ),
      }),
      getAuthProfileKey: profileKey,
      failedAttemptCount: 3,
      executeAttempt: async ({ modelId, authProfile }) => {
        attempts.push(`${modelId}:${authProfile.profileId}`);
        if (modelId === "m1") {
          if (authProfile.profileId === "alpha") {
            throw new Error("rate limit");
          }
          throw new Error("provider error");
        }
        if (authProfile.profileId === "alpha") {
          return { result: "ok", attempts: 1 };
        }
        throw new Error("provider error");
      },
      shouldRotateAuthProfile: ({ error }) =>
        (error instanceof Error ? error.message : String(error)).includes("rate limit"),
    });

    expect(attempts).toEqual(["m1:alpha", "m1:beta", "m2:alpha"]);
    expect(result.usedModelId).toBe("m2");
    expect(result.usedAuthProfile.profileId).toBe("alpha");
  });

  it("keeps retry_backoff precedence when final success needed retries", async () => {
    const result = await executeTwoStageFailover<string, AuthProfileFixture>({
      modelIds: ["m1"],
      resolveModelPlan: () => ({
        authProfiles: [
          { providerId: "openrouter", profileId: "alpha" },
          { providerId: "openrouter", profileId: "beta" },
        ],
      }),
      getAuthProfileKey: profileKey,
      failedAttemptCount: 3,
      executeAttempt: async ({ authProfile }) => {
        if (authProfile.profileId === "alpha") {
          throw new Error("rate limit");
        }
        return { result: "ok", attempts: 2 };
      },
      shouldRotateAuthProfile: ({ error }) =>
        (error instanceof Error ? error.message : String(error)).includes("rate limit"),
    });

    expect(result.attempts).toBe(5);
    expect(result.delayReason).toBe("retry_backoff");
  });

  it("throws a typed error with attempt and delay metadata when all attempts fail", async () => {
    try {
      await executeTwoStageFailover<string, AuthProfileFixture>({
        modelIds: ["m1"],
        resolveModelPlan: () => ({
          authProfiles: [{ providerId: "openrouter", profileId: "alpha" }],
        }),
        getAuthProfileKey: profileKey,
        failedAttemptCount: 3,
        executeAttempt: async () => {
          throw new Error("fatal");
        },
      });
      throw new Error("expected failover to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TwoStageFailoverError);
      const failoverError = error as TwoStageFailoverError;
      expect(failoverError.lastErrorMessage).toBe("fatal");
      expect(failoverError.attempts).toBe(3);
      expect(failoverError.delayReason).toBe("provider_failover");
    }
  });
});
