import { describe, expect, it } from "vitest";
import {
  getAuthProfileCooldownMs,
  isAuthProfileRotatableError,
  orderAuthProfilesForSession,
  resolveOpenRouterAuthProfiles,
} from "../../../convex/ai/authProfilePolicy";

describe("auth profile policy", () => {
  it("resolves active profiles in priority order and respects cooldown", () => {
    const now = Date.now();
    const profiles = resolveOpenRouterAuthProfiles({
      now,
      llmSettings: {
        authProfiles: [
          {
            profileId: "p2",
            openrouterApiKey: "key2",
            enabled: true,
            priority: 2,
          },
          {
            profileId: "p1",
            openrouterApiKey: "key1",
            enabled: true,
            priority: 1,
          },
          {
            profileId: "cooldown",
            openrouterApiKey: "key3",
            enabled: true,
            priority: 0,
            cooldownUntil: now + 60_000,
          },
        ],
      },
    });

    expect(profiles.map((profile) => profile.profileId)).toEqual(["p1", "p2"]);
  });

  it("falls back to env/legacy keys when no active profiles exist", () => {
    const profiles = resolveOpenRouterAuthProfiles({
      llmSettings: {
        openrouterApiKey: "legacy",
      },
      envOpenRouterApiKey: "env",
    });

    expect(profiles.map((profile) => profile.profileId)).toEqual([
      "legacy_openrouter_key",
      "env_openrouter_key",
    ]);
  });

  it("keeps pinned auth profile first for session ordering", () => {
    const ordered = orderAuthProfilesForSession(
      [
        { profileId: "a", apiKey: "a", priority: 1, source: "profile" },
        { profileId: "b", apiKey: "b", priority: 2, source: "profile" },
      ],
      "b"
    );

    expect(ordered.map((profile) => profile.profileId)).toEqual(["b", "a"]);
  });

  it("classifies auth/rate-limit errors as rotatable", () => {
    expect(isAuthProfileRotatableError({ status: 429 })).toBe(true);
    expect(isAuthProfileRotatableError({ message: "Unauthorized api key" })).toBe(
      true
    );
    expect(isAuthProfileRotatableError({ status: 404 })).toBe(false);
  });

  it("uses exponential cooldown with cap", () => {
    expect(getAuthProfileCooldownMs(1)).toBe(5 * 60 * 1000);
    expect(getAuthProfileCooldownMs(2)).toBe(10 * 60 * 1000);
    expect(getAuthProfileCooldownMs(10)).toBe(60 * 60 * 1000);
  });
});
