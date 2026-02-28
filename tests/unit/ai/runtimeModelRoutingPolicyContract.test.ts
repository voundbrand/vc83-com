import { describe, expect, it } from "vitest";
import { resolveRuntimeModelRoutingPolicyContract } from "../../../convex/ai/agentExecution";
import { buildModelRoutingMatrix } from "../../../convex/ai/modelPolicy";

describe("runtime model routing policy contract", () => {
  it("blocks routes when local-only privacy is enabled and only cloud models are available", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openrouter/openai/gpt-4o-mini",
      platformModels: [
        {
          modelId: "openrouter/openai/gpt-4o-mini",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            tools: true,
            json: true,
            vision: true,
            audio_in: false,
            audio_out: false,
          },
        },
      ],
      routingIntent: "general",
      routingModality: "text",
      availableProviderIds: ["openrouter"],
    });

    const policy = resolveRuntimeModelRoutingPolicyContract({
      llmSettings: {
        privacyMode: "local_only",
        qualityTierFloor: "unrated",
        localConnection: {
          connectorId: "ollama",
          baseUrl: "http://localhost:11434/v1",
          status: "connected",
          modelIds: ["local/phi-4-mini"],
          defaultModelId: "local/phi-4-mini",
          capabilityLimits: {
            tools: false,
            vision: false,
            audio_in: false,
            audio_out: false,
            json: true,
            networkEgress: "blocked",
          },
        },
      },
      modelRoutingMatrix: matrix,
      selectedModelId: "openrouter/openai/gpt-4o-mini",
    });

    expect(policy.blocked).toBe(true);
    expect(policy.allowedModelIds).toEqual([]);
    expect(policy.blockMessage).toContain("local-only blocks cloud model routes");
  });

  it("keeps prefer-local routes allowed while surfacing a cloud fallback guardrail", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openrouter/openai/gpt-4o-mini",
      platformModels: [
        {
          modelId: "openrouter/openai/gpt-4o-mini",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            tools: true,
            json: true,
            vision: true,
            audio_in: false,
            audio_out: false,
          },
        },
      ],
      routingIntent: "general",
      routingModality: "text",
      availableProviderIds: ["openrouter"],
    });

    const policy = resolveRuntimeModelRoutingPolicyContract({
      llmSettings: {
        privacyMode: "prefer_local",
        qualityTierFloor: "unrated",
      },
      modelRoutingMatrix: matrix,
      selectedModelId: "openrouter/openai/gpt-4o-mini",
    });

    expect(policy.blocked).toBe(false);
    expect(policy.allowedModelIds).toContain("openrouter/openai/gpt-4o-mini");
    expect(policy.selectedGuardrail).toContain("No local model connector is available");
  });

  it("emits a drift safeguard warning for high-regression selected routes", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openrouter/legacy-low-fidelity",
      previousSelectedModelId: "openrouter/high-fidelity",
      platformModels: [
        {
          modelId: "openrouter/high-fidelity",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            tools: true,
            json: true,
            vision: true,
            audio_in: true,
            audio_out: true,
          },
        },
        {
          modelId: "openrouter/legacy-low-fidelity",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            tools: false,
            json: false,
            vision: false,
            audio_in: false,
            audio_out: false,
          },
        },
      ],
      routingIntent: "general",
      routingModality: "text",
      availableProviderIds: ["openrouter"],
    });

    const policy = resolveRuntimeModelRoutingPolicyContract({
      llmSettings: {
        privacyMode: "off",
        qualityTierFloor: "unrated",
      },
      modelRoutingMatrix: matrix,
      selectedModelId: "openrouter/legacy-low-fidelity",
    });

    const selectedDecision = policy.decisions.find(
      (decision) => decision.modelId === "openrouter/legacy-low-fidelity"
    );
    expect(selectedDecision?.modelSwitchDriftSeverity).toBe("high");
    expect(policy.selectedModelDriftWarning).toContain("Model switch may reduce response quality consistency");
  });
});

