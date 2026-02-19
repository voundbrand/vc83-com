import { describe, expect, it } from "vitest";
import { buildOpenClawBridgeImportPlan } from "../../../convex/ai/openclawBridge";

describe("openclaw bridge import plan", () => {
  it("maps allowed auth profiles and private model definitions", () => {
    const now = 1_739_000_000_000;
    const plan = buildOpenClawBridgeImportPlan({
      now,
      authProfiles: [
        {
          profileId: "OpenAI Main",
          provider: "openai",
          apiKey: "openai-secret",
          enabled: true,
        },
        {
          profileId: "voice-default",
          provider: "elevenlabs",
          token: "elevenlabs-secret",
          defaultVoiceId: "voice_123",
        },
      ],
      privateModels: [
        {
          modelId: "my-private-model",
          provider: "openai_compatible",
          setAsDefault: true,
        },
      ],
    });

    expect(plan.importedAuthProfiles).toHaveLength(2);
    expect(plan.importedAuthProfiles[0]?.providerId).toBe("openai");
    expect(plan.importedAuthProfiles[1]?.providerId).toBe("elevenlabs");
    expect(plan.importedAuthProfiles[1]?.metadata).toMatchObject({
      source: "openclaw_bridge_import",
      importedAt: now,
      defaultVoiceId: "voice_123",
    });

    expect(plan.importedPrivateModels).toEqual([
      {
        modelId: "openai_compatible/my-private-model",
        isDefault: true,
        enabledAt: now,
      },
    ]);
  });

  it("throws when provider is outside the allowlist", () => {
    expect(() =>
      buildOpenClawBridgeImportPlan({
        authProfiles: [
          {
            profileId: "blocked",
            provider: "bedrock",
            apiKey: "secret",
          },
        ],
      })
    ).toThrow(/allowlist/i);
  });

  it("deduplicates imported private models deterministically", () => {
    const plan = buildOpenClawBridgeImportPlan({
      authProfiles: [],
      privateModels: [
        {
          modelId: "openai_compatible/my-private-model",
          provider: "openai_compatible",
          label: "Primary",
          setAsDefault: false,
        },
        {
          modelId: "my-private-model",
          provider: "openai_compatible",
          setAsDefault: true,
        },
      ],
    });

    expect(plan.importedPrivateModels).toHaveLength(1);
    expect(plan.importedPrivateModels[0]?.modelId).toBe(
      "openai_compatible/my-private-model"
    );
    expect(plan.importedPrivateModels[0]?.isDefault).toBe(true);
    expect(plan.importedPrivateModels[0]?.customLabel).toBe("Primary");
  });
});
