import { describe, expect, it } from "vitest";
import {
  getAllAiProviders,
  resolveOrganizationProviderBindingForProvider,
  resolveOrganizationProviderBindings,
  stripApiKeyFromBinding,
} from "../../../convex/ai/providerRegistry";

describe("providerRegistry", () => {
  it("returns canonical built-in providers", () => {
    const providers = getAllAiProviders();

    expect(providers.length).toBeGreaterThanOrEqual(9);
    expect(providers.some((provider) => provider.id === "openrouter")).toBe(true);
    expect(
      providers.some((provider) => provider.id === "openai_compatible")
    ).toBe(true);
  });

  it("resolves org bindings in deterministic priority order", () => {
    const bindings = resolveOrganizationProviderBindings({
      llmSettings: {
        providerId: "openrouter",
        openrouterApiKey: "legacy-key",
        providerAuthProfiles: [
          {
            profileId: "openai-secondary",
            providerId: "openai",
            apiKey: "openai-key",
            enabled: true,
            priority: 2,
          },
          {
            profileId: "openrouter-primary",
            providerId: "openrouter",
            apiKey: "openrouter-key",
            enabled: true,
            priority: 1,
          },
        ],
      },
      defaultBillingSource: "byok",
      envApiKeysByProvider: {
        openrouter: "env-openrouter",
      },
      now: Date.now(),
    });

    expect(bindings.map((binding) => binding.profileId)).toEqual([
      "openrouter-primary",
      "openai-secondary",
      "legacy_openrouter_key",
      "env_openrouter_key",
    ]);
    expect(bindings[0]?.billingSource).toBe("byok");
    expect(bindings[3]?.billingSource).toBe("platform");
  });

  it("uses openai-compatible env baseUrl when profile baseUrl is missing", () => {
    const binding = resolveOrganizationProviderBindingForProvider({
      providerId: "openai_compatible",
      llmSettings: {
        providerAuthProfiles: [
          {
            profileId: "private-endpoint",
            providerId: "openai_compatible",
            apiKey: "private-key",
            enabled: true,
          },
        ],
      },
      envOpenAiCompatibleBaseUrl: "https://private.example.ai/v1",
    });

    expect(binding).not.toBeNull();
    expect(binding?.baseUrl).toBe("https://private.example.ai/v1");
    expect(binding?.fallbackMetadata.reasons).toContain(
      "openai_compatible_env_base_url"
    );
  });

  it("dedupes duplicate provider/profile bindings using the highest priority entry", () => {
    const binding = resolveOrganizationProviderBindingForProvider({
      providerId: "openai",
      llmSettings: {
        providerAuthProfiles: [
          {
            profileId: "shared-profile",
            providerId: "openai",
            apiKey: "older-key",
            enabled: true,
            priority: 5,
          },
          {
            profileId: "shared-profile",
            providerId: "openai",
            apiKey: "newer-key",
            enabled: true,
            priority: 1,
          },
        ],
      },
    });

    expect(binding).not.toBeNull();
    expect(binding?.priority).toBe(1);
    expect(binding?.apiKey).toBe("newer-key");
  });

  it("redacts api keys from binding responses", () => {
    const binding = resolveOrganizationProviderBindingForProvider({
      providerId: "openrouter",
      llmSettings: {
        providerAuthProfiles: [
          {
            profileId: "openrouter-primary",
            providerId: "openrouter",
            apiKey: "secret-key",
            enabled: true,
            priority: 0,
          },
        ],
      },
    });

    expect(binding).not.toBeNull();
    const redacted = stripApiKeyFromBinding(binding!);
    expect("apiKey" in redacted).toBe(false);
    expect(redacted.profileId).toBe("openrouter-primary");
  });
});

