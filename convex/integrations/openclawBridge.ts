import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireAuthenticatedUser } from "../rbacHelpers";
import type { AiProviderId } from "../channels/types";
import {
  buildOpenClawBridgeImportPlan,
  type OpenClawImportedModelDefinition,
  type OpenClawImportedProviderAuthProfile,
} from "../ai/openclawBridge";

type LlmEnabledModel = {
  modelId: string;
  isDefault: boolean;
  customLabel?: string;
  enabledAt: number;
};

type LlmProviderAuthProfile = {
  profileId: string;
  providerId: AiProviderId;
  label?: string;
  baseUrl?: string;
  credentialSource?:
    | "platform_env"
    | "platform_vault"
    | "organization_setting"
    | "organization_auth_profile"
    | "integration_connection";
  billingSource?: "platform" | "byok" | "private";
  apiKey?: string;
  encryptedFields?: string[];
  capabilities?: {
    text: boolean;
    vision: boolean;
    audio_in: boolean;
    audio_out: boolean;
    tools: boolean;
    json: boolean;
  };
  enabled: boolean;
  priority?: number;
  cooldownUntil?: number;
  failureCount?: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
  metadata?: unknown;
};

function normalizeEnabledModels(value: unknown): LlmEnabledModel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: LlmEnabledModel[] = [];
  for (const model of value) {
    if (typeof model !== "object" || model === null) {
      continue;
    }
    const typedModel = model as Record<string, unknown>;
    if (typeof typedModel.modelId !== "string") {
      continue;
    }
    const modelId = typedModel.modelId.trim();
    if (!modelId) {
      continue;
    }
    normalized.push({
      modelId,
      isDefault: typedModel.isDefault === true,
      customLabel:
        typeof typedModel.customLabel === "string" &&
        typedModel.customLabel.trim().length > 0
          ? typedModel.customLabel.trim()
          : undefined,
      enabledAt:
        typeof typedModel.enabledAt === "number" &&
        Number.isFinite(typedModel.enabledAt)
          ? typedModel.enabledAt
          : Date.now(),
    });
  }
  return normalized;
}

function mergeProviderAuthProfiles(args: {
  existing: LlmProviderAuthProfile[];
  imported: OpenClawImportedProviderAuthProfile[];
}): LlmProviderAuthProfile[] {
  const merged = [...args.existing];

  for (const importedProfile of args.imported) {
    const existingIndex = merged.findIndex(
      (profile) =>
        profile.providerId === importedProfile.providerId &&
        profile.profileId === importedProfile.profileId
    );

    if (existingIndex === -1) {
      merged.push(importedProfile);
      continue;
    }

    const existing = merged[existingIndex];
    const existingMetadata =
      typeof existing.metadata === "object" && existing.metadata !== null
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const importedMetadata =
      typeof importedProfile.metadata === "object" &&
      importedProfile.metadata !== null
        ? (importedProfile.metadata as Record<string, unknown>)
        : {};

    merged[existingIndex] = {
      ...existing,
      ...importedProfile,
      metadata: {
        ...existingMetadata,
        ...importedMetadata,
      },
      cooldownUntil: existing.cooldownUntil,
      failureCount: existing.failureCount,
      lastFailureAt: existing.lastFailureAt,
      lastFailureReason: existing.lastFailureReason,
    };
  }

  return merged.sort(
    (left, right) => (left.priority ?? 10_000) - (right.priority ?? 10_000)
  );
}

function mergeEnabledModels(args: {
  existing: LlmEnabledModel[];
  imported: OpenClawImportedModelDefinition[];
}): LlmEnabledModel[] {
  const byModelId = new Map<string, LlmEnabledModel>();

  for (const model of args.existing) {
    byModelId.set(model.modelId, model);
  }

  for (const imported of args.imported) {
    const existing = byModelId.get(imported.modelId);
    byModelId.set(imported.modelId, {
      modelId: imported.modelId,
      isDefault: imported.isDefault || existing?.isDefault === true,
      customLabel: imported.customLabel ?? existing?.customLabel,
      enabledAt: existing?.enabledAt ?? imported.enabledAt,
    });
  }

  const merged = Array.from(byModelId.values()).sort(
    (left, right) => left.enabledAt - right.enabledAt
  );

  const defaultCandidates = merged.filter((model) => model.isDefault);
  if (defaultCandidates.length === 0 && merged.length > 0) {
    merged[0] = {
      ...merged[0],
      isDefault: true,
    };
    return merged;
  }

  if (defaultCandidates.length <= 1) {
    return merged;
  }

  let firstDefaultSeen = false;
  return merged.map((model) => {
    if (!model.isDefault) {
      return model;
    }
    if (!firstDefaultSeen) {
      firstDefaultSeen = true;
      return model;
    }
    return {
      ...model,
      isDefault: false,
    };
  });
}

function buildInitialAiSettings(args: {
  organizationId: Id<"organizations">;
  providerAuthProfiles: LlmProviderAuthProfile[];
  enabledModels: LlmEnabledModel[];
}): {
  organizationId: Id<"organizations">;
  enabled: boolean;
  billingMode: "platform" | "byok";
  billingSource: "platform" | "byok" | "private";
  settingsContractVersion: "provider_agnostic_v1";
  llm: {
    providerId: AiProviderId;
    temperature: number;
    maxTokens: number;
    providerAuthProfiles: LlmProviderAuthProfile[];
    enabledModels?: LlmEnabledModel[];
    defaultModelId?: string;
  };
  embedding: {
    provider: "none";
    model: string;
    dimensions: number;
  };
  currentMonthSpend: number;
  createdAt: number;
  updatedAt: number;
} {
  const now = Date.now();
  const defaultModelId = args.enabledModels.find((model) => model.isDefault)?.modelId;
  const defaultProviderId = args.providerAuthProfiles[0]?.providerId ?? "openrouter";

  return {
    organizationId: args.organizationId,
    enabled: true,
    billingMode: "platform",
    billingSource: "platform",
    settingsContractVersion: "provider_agnostic_v1",
    llm: {
      providerId: defaultProviderId,
      temperature: 0.7,
      maxTokens: 4000,
      providerAuthProfiles: args.providerAuthProfiles,
      ...(args.enabledModels.length > 0
        ? {
            enabledModels: args.enabledModels,
            ...(defaultModelId ? { defaultModelId } : {}),
          }
        : {}),
    },
    embedding: {
      provider: "none",
      model: "",
      dimensions: 0,
    },
    currentMonthSpend: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const importOpenClawBridge = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    dryRun: v.optional(v.boolean()),
    payload: v.object({
      authProfiles: v.array(
        v.object({
          profileId: v.string(),
          provider: v.string(),
          apiKey: v.optional(v.string()),
          token: v.optional(v.string()),
          baseUrl: v.optional(v.string()),
          enabled: v.optional(v.boolean()),
          priority: v.optional(v.number()),
          billingSource: v.optional(v.string()),
          label: v.optional(v.string()),
          defaultVoiceId: v.optional(v.string()),
        })
      ),
      privateModels: v.optional(
        v.array(
          v.object({
            modelId: v.string(),
            provider: v.string(),
            label: v.optional(v.string()),
            setAsDefault: v.optional(v.boolean()),
          })
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while importing OpenClaw bridge payload.");
    }

    const importPlan = buildOpenClawBridgeImportPlan({
      authProfiles: args.payload.authProfiles,
      privateModels: args.payload.privateModels,
    });

    const existingSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const existingProfiles =
      (existingSettings?.llm?.providerAuthProfiles as LlmProviderAuthProfile[] | undefined) ?? [];
    const existingEnabledModels = normalizeEnabledModels(
      existingSettings?.llm?.enabledModels
    );

    const mergedProfiles = mergeProviderAuthProfiles({
      existing: existingProfiles,
      imported: importPlan.importedAuthProfiles,
    });
    const mergedEnabledModels = mergeEnabledModels({
      existing: existingEnabledModels,
      imported: importPlan.importedPrivateModels,
    });
    const defaultModelId = mergedEnabledModels.find((model) => model.isDefault)?.modelId;

    if (args.dryRun) {
      return {
        success: true,
        dryRun: true,
        importedAuthProfileCount: importPlan.importedAuthProfiles.length,
        importedPrivateModelCount: importPlan.importedPrivateModels.length,
        warnings: importPlan.warnings,
        mergedProfileIds: mergedProfiles.map(
          (profile) => `${profile.providerId}:${profile.profileId}`
        ),
        mergedModelIds: mergedEnabledModels.map((model) => model.modelId),
      };
    }

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        llm: {
          ...existingSettings.llm,
          providerId: existingSettings.llm.providerId ?? mergedProfiles[0]?.providerId ?? "openrouter",
          providerAuthProfiles: mergedProfiles,
          ...(mergedEnabledModels.length > 0
            ? {
                enabledModels: mergedEnabledModels,
                ...(defaultModelId ? { defaultModelId } : {}),
              }
            : {}),
        },
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert(
        "organizationAiSettings",
        buildInitialAiSettings({
          organizationId: args.organizationId,
          providerAuthProfiles: mergedProfiles,
          enabledModels: mergedEnabledModels,
        })
      );
    }

    return {
      success: true,
      dryRun: false,
      importedAuthProfileCount: importPlan.importedAuthProfiles.length,
      importedPrivateModelCount: importPlan.importedPrivateModels.length,
      warnings: importPlan.warnings,
      mergedProfileIds: mergedProfiles.map(
        (profile) => `${profile.providerId}:${profile.profileId}`
      ),
      mergedModelIds: mergedEnabledModels.map((model) => model.modelId),
    };
  },
});
