import { describe, expect, it } from "vitest";
import {
  buildEnvApiKeysByProvider,
  detectProvider,
  getProviderAdapterContractConformanceIssues,
  getProviderAdapterContractSnapshot,
  normalizeModelForProvider,
  normalizeLocalConnectionContract,
  normalizePrivacyMode,
  normalizeProviderCompletionResponse,
  normalizeProviderError,
  resolvePrivacyModeProviderDecision,
  resolveProviderReasoningContract,
  resolveProviderReasoningResolution,
  resolveAuthProfileBaseUrl,
} from "../../../convex/ai/modelAdapters";

describe("model adapter normalization", () => {
  it("normalizes provider aliases and fallback provider hints", () => {
    expect(detectProvider("google/gemini-2.0-flash")).toBe("gemini");
    expect(detectProvider("openai-compatible")).toBe("openai_compatible");
    expect(detectProvider("local/phi-4-mini")).toBe("openai_compatible");
    expect(detectProvider("gpt-4o", "openai")).toBe("openai");
  });

  it("normalizes provider model names for direct providers", () => {
    expect(normalizeModelForProvider("openai", "openai/gpt-4o")).toBe("gpt-4o");
    expect(normalizeModelForProvider("openrouter", "openai/gpt-4o")).toBe(
      "openai/gpt-4o"
    );
  });

  it("normalizes openai-compatible responses into canonical usage/tool envelopes", () => {
    const normalized = normalizeProviderCompletionResponse({
      providerId: "openai",
      response: {
        choices: [
          {
            message: {
              content: "```json\n{\"ok\":true}\n```",
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "lookup",
                    arguments: "{\"id\":123}",
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 5,
          total_tokens: 17,
        },
      },
    });

    expect(normalized.usage).toEqual({
      prompt_tokens: 12,
      completion_tokens: 5,
      total_tokens: 17,
    });
    expect(normalized.choices[0]?.message.tool_calls?.[0]?.function.arguments).toBe(
      "{\"id\":123}"
    );
    expect(normalized.structuredOutput?.format).toBe("json_code_block");
    expect(normalized.structuredOutput?.value).toEqual({ ok: true });
  });

  it("normalizes anthropic responses into canonical usage/tool envelopes", () => {
    const normalized = normalizeProviderCompletionResponse({
      providerId: "anthropic",
      response: {
        content: [
          { type: "text", text: "Need to call a tool" },
          {
            type: "tool_use",
            id: "toolu_1",
            name: "lookup_order",
            input: { orderId: "A-123" },
          },
        ],
        usage: {
          input_tokens: 21,
          output_tokens: 8,
        },
      },
    });

    expect(normalized.usage).toEqual({
      prompt_tokens: 21,
      completion_tokens: 8,
      total_tokens: 29,
    });
    expect(normalized.choices[0]?.message.tool_calls?.[0]).toEqual({
      id: "toolu_1",
      type: "function",
      function: {
        name: "lookup_order",
        arguments: "{\"orderId\":\"A-123\"}",
      },
    });
  });

  it("normalizes provider errors into canonical classes", () => {
    const quotaError = normalizeProviderError({
      providerId: "openai",
      statusCode: 429,
      error: { message: "Insufficient quota" },
    });
    expect(quotaError.errorClass).toBe("quota");
    expect(quotaError.retryable).toBe(false);

    const networkError = normalizeProviderError({
      providerId: "openrouter",
      error: { message: "fetch failed" },
    });
    expect(networkError.errorClass).toBe("network");
    expect(networkError.retryable).toBe(true);
  });

  it("normalizes refusal/safety provider errors as non-retryable", () => {
    const safetyError = normalizeProviderError({
      providerId: "anthropic",
      statusCode: 400,
      error: { message: "Request blocked due to safety refusal" },
    });

    expect(safetyError.errorClass).toBe("invalid_request");

    const fallbackSafetyError = normalizeProviderError({
      providerId: "openrouter",
      error: { message: "Refusal: blocked by safety policy" },
    });

    expect(fallbackSafetyError.errorClass).toBe("safety");
    expect(fallbackSafetyError.retryable).toBe(false);
  });

  it("resolves auth profile baseUrl and openai-compatible env fallback", () => {
    const llmSettings = {
      providerAuthProfiles: [
        {
          providerId: "openai_compatible",
          profileId: "private-1",
          baseUrl: "https://llm.internal/v1/",
        },
      ],
    };

    expect(
      resolveAuthProfileBaseUrl({
        llmSettings,
        providerId: "openai_compatible",
        profileId: "private-1",
      })
    ).toBe("https://llm.internal/v1");

    expect(
      resolveAuthProfileBaseUrl({
        llmSettings: { providerAuthProfiles: [] },
        providerId: "openai_compatible",
        envOpenAiCompatibleBaseUrl: "https://fallback.internal/openai/",
      })
    ).toBe("https://fallback.internal/openai");
  });

  it("maps canonical env keys by provider", () => {
    const envMap = buildEnvApiKeysByProvider({
      OPENROUTER_API_KEY: "or-key",
      OPENAI_API_KEY: "oa-key",
      ANTHROPIC_API_KEY: "an-key",
      GOOGLE_API_KEY: "ga-key",
      OPENAI_COMPATIBLE_API_KEY: "compat-key",
    });

    expect(envMap.openrouter).toBe("or-key");
    expect(envMap.openai).toBe("oa-key");
    expect(envMap.anthropic).toBe("an-key");
    expect(envMap.gemini).toBe("ga-key");
    expect(envMap.openai_compatible).toBe("compat-key");
  });

  it("prefers GEMINI_API_KEY over Google alias env keys", () => {
    const envMap = buildEnvApiKeysByProvider({
      GEMINI_API_KEY: "gemini-primary",
      GOOGLE_API_KEY: "google-alias",
      GOOGLE_GENERATIVE_AI_API_KEY: "google-generative-alias",
    });

    expect(envMap.gemini).toBe("gemini-primary");
  });

  it("falls back Gemini env key aliases in deterministic order", () => {
    const googleApiFallback = buildEnvApiKeysByProvider({
      GOOGLE_API_KEY: "google-alias",
      GOOGLE_GENERATIVE_AI_API_KEY: "google-generative-alias",
    });
    expect(googleApiFallback.gemini).toBe("google-alias");

    const googleGenerativeFallback = buildEnvApiKeysByProvider({
      GOOGLE_GENERATIVE_AI_API_KEY: "google-generative-alias",
    });
    expect(googleGenerativeFallback.gemini).toBe("google-generative-alias");
  });

  it("resolves provider-native reasoning contract metadata", () => {
    const openRouterContract = resolveProviderReasoningContract("openrouter");
    expect(openRouterContract.supportsNativeReasoning).toBe(true);
    expect(openRouterContract.paramKind).toBe("openrouter_reasoning");

    const openAiContract = resolveProviderReasoningContract("openai");
    expect(openAiContract.supportsNativeReasoning).toBe(false);
    expect(openAiContract.paramKind).toBe("none");
  });

  it("applies native reasoning only for supported provider/model combinations", () => {
    const nativeResolution = resolveProviderReasoningResolution({
      providerId: "openrouter",
      modelSupportsNativeReasoning: true,
      reasoningEffort: "extra_high",
    });
    expect(nativeResolution.mode).toBe("native");
    expect(nativeResolution.effectiveEffort).toBe("high");
    expect(nativeResolution.requestPatch).toEqual({
      reasoning: {
        effort: "high",
      },
    });

    const modelFallback = resolveProviderReasoningResolution({
      providerId: "openrouter",
      modelSupportsNativeReasoning: false,
      reasoningEffort: "high",
    });
    expect(modelFallback.mode).toBe("heuristic");
    expect(modelFallback.reason).toBe("model_not_supported");

    const missingCapabilityFallback = resolveProviderReasoningResolution({
      providerId: "openrouter",
      modelSupportsNativeReasoning: null,
      reasoningEffort: "high",
    });
    expect(missingCapabilityFallback.mode).toBe("heuristic");
    expect(missingCapabilityFallback.reason).toBe("model_capability_missing");

    const providerFallback = resolveProviderReasoningResolution({
      providerId: "openai",
      modelSupportsNativeReasoning: true,
      reasoningEffort: "high",
    });
    expect(providerFallback.mode).toBe("heuristic");
    expect(providerFallback.reason).toBe("provider_not_supported");
  });

  it("provides deterministic provider adapter contract snapshots", () => {
    const openAiSnapshot = getProviderAdapterContractSnapshot("openai");
    expect(openAiSnapshot.providerId).toBe("openai");
    expect(openAiSnapshot.requestProtocol).toBe("openai_compatible");
    expect(openAiSnapshot.supportsToolCalling).toBe(true);
    expect(openAiSnapshot.reasoningParamKind).toBe("none");

    const openRouterSnapshot = getProviderAdapterContractSnapshot("openrouter");
    expect(openRouterSnapshot.reasoningParamKind).toBe("openrouter_reasoning");
  });

  it("reports adapter contract mismatches", () => {
    const issues = getProviderAdapterContractConformanceIssues({
      providerId: "openai",
      expected: {
        providerId: "openai",
        requestProtocol: "anthropic_messages",
      },
    });

    expect(
      issues.some((issue) => issue.includes("requestProtocol mismatch"))
    ).toBe(true);
  });

  it("normalizes local connection contracts for privacy mode routing", () => {
    const contract = normalizeLocalConnectionContract({
      connectorId: "lm-studio",
      baseUrl: "http://localhost:1234/v1/",
      status: "connected",
      modelIds: [" local/phi-4 ", "local/phi-4", "local/qwen2.5"],
      capabilityLimits: {
        tools: false,
        vision: false,
        audio_in: false,
        audio_out: false,
        json: true,
      },
    });

    expect(contract.connectorId).toBe("lm_studio");
    expect(contract.baseUrl).toBe("http://localhost:1234/v1");
    expect(contract.modelIds).toEqual(["local/phi-4", "local/qwen2.5"]);
    expect(contract.capabilityLimits.networkEgress).toBe("blocked");
  });

  it("enforces local-only privacy mode against cloud routes", () => {
    const local = normalizeLocalConnectionContract({
      connectorId: "ollama",
      status: "connected",
      modelIds: ["local/llama3.1"],
    });
    expect(normalizePrivacyMode("local-only")).toBe("local_only");

    const blocked = resolvePrivacyModeProviderDecision({
      privacyMode: "local_only",
      providerId: "openrouter",
      localConnection: local,
      isLocalRoute: false,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockReason).toBe("privacy_mode_requires_local_route");

    const allowed = resolvePrivacyModeProviderDecision({
      privacyMode: "local_only",
      providerId: "openai_compatible",
      localConnection: local,
      isLocalRoute: true,
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.capabilityLimits?.networkEgress).toBe("blocked");
  });
});
