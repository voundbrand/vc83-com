import { describe, expect, it } from "vitest";
import {
  getAllAiProviders,
  getProviderPluginManifestConformanceIssues,
  registerProviderPluginManifest,
  resolveOrganizationProviderBindingForProvider,
  resolveOrganizationProviderBindings,
  stripApiKeyFromBinding,
} from "../../../convex/ai/providerRegistry";
import { getProviderAdapterContractSnapshot } from "../../../convex/ai/modelAdapters";

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

  it("keeps org auth profile binding ahead of platform env fallback for the same provider", () => {
    const binding = resolveOrganizationProviderBindingForProvider({
      providerId: "gemini",
      llmSettings: {
        providerId: "openrouter",
        providerAuthProfiles: [
          {
            profileId: "org-gemini",
            providerId: "gemini",
            apiKey: "org-gemini-key",
            enabled: true,
            priority: 1,
            billingSource: "byok",
          },
        ],
      },
      envApiKeysByProvider: {
        gemini: "env-gemini-key",
      },
    });

    expect(binding).not.toBeNull();
    expect(binding?.source).toBe("organization_auth_profile");
    expect(binding?.apiKey).toBe("org-gemini-key");
    expect(binding?.billingSource).toBe("byok");
  });

  it("falls back to platform env Gemini binding when org profile is missing", () => {
    const binding = resolveOrganizationProviderBindingForProvider({
      providerId: "gemini",
      llmSettings: {
        providerId: "openrouter",
        providerAuthProfiles: [],
      },
      envApiKeysByProvider: {
        gemini: "env-gemini-key",
      },
    });

    expect(binding).not.toBeNull();
    expect(binding?.source).toBe("platform_env");
    expect(binding?.profileId).toBe("env_gemini_key");
    expect(binding?.apiKey).toBe("env-gemini-key");
    expect(binding?.billingSource).toBe("platform");
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

  it("accepts valid provider plugin manifests for canonical adapters", () => {
    const { providerId, ...adapter } = getProviderAdapterContractSnapshot("openai");
    void providerId;

    const issues = getProviderPluginManifestConformanceIssues({
      contractVersion: "ai_provider_plugin_manifest_v1",
      id: "openai",
      label: "OpenAI Plugin",
      discoverySource: "provider_api",
      supportsCustomBaseUrl: false,
      defaultBaseUrl: "https://api.openai.com/v1",
      adapter,
    });

    expect(issues).toEqual([]);
  });

  it("fails closed on malformed provider plugin manifests", () => {
    const malformedManifest = {
      id: "openai",
      label: "Broken OpenAI Plugin",
      discoverySource: "provider_api",
      supportsCustomBaseUrl: false,
      // adapter is intentionally missing
      apiKey: "should-not-be-here",
    };

    const issues = getProviderPluginManifestConformanceIssues(malformedManifest);
    expect(issues.length).toBeGreaterThan(0);
    expect(
      issues.some((issue) => issue.includes("credential-like fields"))
    ).toBe(true);
    expect(() => registerProviderPluginManifest(malformedManifest)).toThrow(
      /failed conformance checks/
    );
  });

  it("fails closed when plugin manifest adapter contract mismatches runtime adapter", () => {
    const mismatchedManifest = {
      contractVersion: "ai_provider_plugin_manifest_v1",
      id: "openai_compatible",
      label: "Broken OpenAI-Compatible Plugin",
      discoverySource: "manual",
      supportsCustomBaseUrl: true,
      defaultBaseUrl: "https://private.example.ai/v1",
      adapter: {
        requestProtocol: "anthropic_messages",
        supportsToolCalling: true,
        supportsStructuredOutput: true,
        requiresToolCallId: true,
        toolResultField: "tool_call_id",
        reasoningParamKind: "none",
      },
    };

    const issues = getProviderPluginManifestConformanceIssues(mismatchedManifest);
    expect(
      issues.some((issue) => issue.includes("requestProtocol mismatch"))
    ).toBe(true);
    expect(() => registerProviderPluginManifest(mismatchedManifest)).toThrow(
      /failed conformance checks/
    );
  });
});
