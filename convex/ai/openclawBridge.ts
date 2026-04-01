import type {
  AiBillingSource,
  AiCapabilityMatrix,
  AiProviderId,
} from "../channels/types";
import { normalizeModelForProvider } from "./model/modelAdapters";
import {
  isOpenClawAuthorityContractSatisfied,
  resolveOpenClawCompatibilityMode,
  type OpenClawCompatibilityModeDecision,
} from "./model/modelPolicy";

export interface OpenClawAuthProfileImportInput {
  profileId: string;
  provider: string;
  apiKey?: string;
  token?: string;
  baseUrl?: string;
  enabled?: boolean;
  priority?: number;
  billingSource?: string;
  label?: string;
  defaultVoiceId?: string;
}

export interface OpenClawPrivateModelImportInput {
  modelId: string;
  provider: string;
  label?: string;
  setAsDefault?: boolean;
}

export interface OpenClawBridgeImportInput {
  authProfiles: OpenClawAuthProfileImportInput[];
  privateModels?: OpenClawPrivateModelImportInput[];
  now?: number;
}

export interface OpenClawImportedProviderAuthProfile {
  profileId: string;
  providerId: AiProviderId;
  label?: string;
  baseUrl?: string;
  credentialSource: "organization_auth_profile";
  billingSource: AiBillingSource;
  apiKey?: string;
  encryptedFields?: string[];
  capabilities: AiCapabilityMatrix;
  enabled: boolean;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface OpenClawImportedModelDefinition {
  modelId: string;
  isDefault: boolean;
  customLabel?: string;
  enabledAt: number;
}

export interface OpenClawBridgeImportPlan {
  importedAuthProfiles: OpenClawImportedProviderAuthProfile[];
  importedPrivateModels: OpenClawImportedModelDefinition[];
  warnings: string[];
}

export const OPENCLAW_COMPATIBILITY_ADAPTER_CONTRACT_VERSION =
  "yai_openclaw_compatibility_adapter_v1" as const;

export interface ResolveOpenClawCompatibilityAdapterArgs {
  organizationFeatureFlags?: Record<string, unknown> | null;
  adapterRequested?: boolean;
  adapterFailed?: boolean;
  adapterFailureDetail?: string | null;
}

export interface OpenClawCompatibilityAdapterDecision {
  contractVersion: typeof OPENCLAW_COMPATIBILITY_ADAPTER_CONTRACT_VERSION;
  enabled: boolean;
  mode: OpenClawCompatibilityModeDecision["mode"];
  featureFlagKey: OpenClawCompatibilityModeDecision["featureFlagKey"];
  featureFlagEnabled: boolean;
  fallbackToNative: boolean;
  fallbackReason: OpenClawCompatibilityModeDecision["fallbackReason"];
  warning: string | null;
  nativePolicyPrecedence: OpenClawCompatibilityModeDecision["nativePolicyPrecedence"];
  directMutationBypassAllowed: OpenClawCompatibilityModeDecision["directMutationBypassAllowed"];
  trustApprovalRequiredForActionableIntent: OpenClawCompatibilityModeDecision["trustApprovalRequiredForActionableIntent"];
}

export type OpenClawCompatibilityAdapterViolation =
  | "feature_flag_required_for_compatibility_mode"
  | "fallback_contract_mismatch"
  | "native_policy_precedence_mismatch"
  | "direct_mutation_bypass_not_allowed"
  | "trust_approval_required_for_actionable_intent";

export interface OpenClawCompatibilityAdapterValidation {
  valid: boolean;
  violations: OpenClawCompatibilityAdapterViolation[];
}

const OPENCLAW_PROVIDER_ALIASES: Record<string, AiProviderId> = {
  openrouter: "openrouter",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  google: "gemini",
  grok: "grok",
  xai: "grok",
  mistral: "mistral",
  kimi: "kimi",
  elevenlabs: "elevenlabs",
  openai_compatible: "openai_compatible",
  "openai-compatible": "openai_compatible",
};

const OPENCLAW_IMPORT_PROVIDER_ALLOWLIST = new Set<AiProviderId>([
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "grok",
  "mistral",
  "kimi",
  "elevenlabs",
  "openai_compatible",
]);

function buildCompatibilityWarning(args: {
  decision: OpenClawCompatibilityModeDecision;
  adapterFailureDetail?: string | null;
}): string | null {
  if (!args.decision.fallbackToNative) {
    return null;
  }

  switch (args.decision.fallbackReason) {
    case "adapter_not_requested":
      return "OpenClaw compatibility adapter was not requested; using native vc83 runtime path.";
    case "org_feature_flag_disabled":
      return [
        "OpenClaw compatibility adapter is disabled because org feature flag",
        `${args.decision.featureFlagKey}=true`,
        "was not provided; using native vc83 runtime path.",
      ].join(" ");
    case "adapter_failure":
      return [
        "OpenClaw compatibility adapter failed; using native vc83 runtime path.",
        args.adapterFailureDetail ? `Failure: ${args.adapterFailureDetail}` : null,
      ]
        .filter((segment): segment is string => Boolean(segment))
        .join(" ");
    default:
      return "OpenClaw compatibility adapter is unavailable; using native vc83 runtime path.";
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePriority(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeProviderId(value: unknown): AiProviderId {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    throw new Error("OpenClaw import provider is required.");
  }

  const providerId = OPENCLAW_PROVIDER_ALIASES[normalized];
  if (!providerId || !OPENCLAW_IMPORT_PROVIDER_ALLOWLIST.has(providerId)) {
    throw new Error(
      `OpenClaw import blocked: provider "${normalized}" is not in the allowlist.`
    );
  }

  return providerId;
}

function sanitizeProfileId(providerId: AiProviderId, profileId: string): string {
  const normalized = profileId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    return `${providerId}_default`;
  }
  return normalized.replace(":", "_");
}

function normalizeBillingSource(
  value: unknown,
  providerId: AiProviderId
): AiBillingSource {
  if (value === "platform" || value === "byok" || value === "private") {
    return value;
  }
  return providerId === "openai_compatible" ? "private" : "byok";
}

function resolveDefaultCapabilities(providerId: AiProviderId): AiCapabilityMatrix {
  if (providerId === "elevenlabs") {
    return {
      text: false,
      vision: false,
      audio_in: true,
      audio_out: true,
      tools: false,
      json: false,
    };
  }

  return {
    text: true,
    vision: providerId !== "mistral" && providerId !== "kimi",
    audio_in: false,
    audio_out: false,
    tools: true,
    json: true,
  };
}

function normalizeModelIdForProvider(args: {
  providerId: AiProviderId;
  modelId: string;
}): string {
  const normalizedRawModelId = normalizeString(args.modelId);
  if (!normalizedRawModelId) {
    throw new Error("OpenClaw private model id is required.");
  }

  if (args.providerId === "openrouter") {
    return normalizedRawModelId;
  }

  const normalizedProviderModel = normalizeModelForProvider(
    args.providerId,
    normalizedRawModelId
  );
  return `${args.providerId}/${normalizedProviderModel}`;
}

function dedupeImportedModels(
  imported: OpenClawImportedModelDefinition[]
): OpenClawImportedModelDefinition[] {
  const byModelId = new Map<string, OpenClawImportedModelDefinition>();
  for (const model of imported) {
    const existing = byModelId.get(model.modelId);
    if (!existing) {
      byModelId.set(model.modelId, model);
      continue;
    }
    byModelId.set(model.modelId, {
      ...existing,
      customLabel: existing.customLabel ?? model.customLabel,
      isDefault: existing.isDefault || model.isDefault,
      enabledAt: Math.min(existing.enabledAt, model.enabledAt),
    });
  }
  return Array.from(byModelId.values());
}

export function resolveOpenClawCompatibilityAdapter(
  args: ResolveOpenClawCompatibilityAdapterArgs
): OpenClawCompatibilityAdapterDecision {
  const decision = resolveOpenClawCompatibilityMode({
    organizationFeatureFlags: args.organizationFeatureFlags,
    adapterRequested: args.adapterRequested,
    adapterFailed: args.adapterFailed,
  });

  return {
    contractVersion: OPENCLAW_COMPATIBILITY_ADAPTER_CONTRACT_VERSION,
    enabled: decision.enabled,
    mode: decision.mode,
    featureFlagKey: decision.featureFlagKey,
    featureFlagEnabled: decision.featureFlagEnabled,
    fallbackToNative: decision.fallbackToNative,
    fallbackReason: decision.fallbackReason,
    warning: buildCompatibilityWarning({
      decision,
      adapterFailureDetail: args.adapterFailureDetail,
    }),
    nativePolicyPrecedence: decision.nativePolicyPrecedence,
    directMutationBypassAllowed: decision.directMutationBypassAllowed,
    trustApprovalRequiredForActionableIntent:
      decision.trustApprovalRequiredForActionableIntent,
  };
}

export function validateOpenClawCompatibilityAdapterDecision(
  decision: OpenClawCompatibilityAdapterDecision
): OpenClawCompatibilityAdapterValidation {
  const violations: OpenClawCompatibilityAdapterViolation[] = [];

  if (decision.enabled && !decision.featureFlagEnabled) {
    violations.push("feature_flag_required_for_compatibility_mode");
  }

  const fallbackContractSatisfied = decision.enabled
    ? decision.mode === "openclaw_adapter" &&
      decision.fallbackToNative === false &&
      decision.fallbackReason === null
    : decision.mode === "native" && decision.fallbackToNative === true;
  if (!fallbackContractSatisfied) {
    violations.push("fallback_contract_mismatch");
  }

  if (!isOpenClawAuthorityContractSatisfied(decision)) {
    if (decision.nativePolicyPrecedence !== "vc83_runtime_policy") {
      violations.push("native_policy_precedence_mismatch");
    }
    if (decision.directMutationBypassAllowed) {
      violations.push("direct_mutation_bypass_not_allowed");
    }
    if (!decision.trustApprovalRequiredForActionableIntent) {
      violations.push("trust_approval_required_for_actionable_intent");
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function buildOpenClawNativeFallbackPlan(args: {
  adapterDecision: OpenClawCompatibilityAdapterDecision;
}): OpenClawBridgeImportPlan {
  const warnings = args.adapterDecision.warning
    ? [args.adapterDecision.warning]
    : [];
  return {
    importedAuthProfiles: [],
    importedPrivateModels: [],
    warnings,
  };
}

export function buildOpenClawBridgeImportPlan(
  input: OpenClawBridgeImportInput
): OpenClawBridgeImportPlan {
  const now = input.now ?? Date.now();
  const warnings: string[] = [];

  const importedAuthProfiles = input.authProfiles.map((profile, index) => {
    const providerId = normalizeProviderId(profile.provider);
    const profileId = sanitizeProfileId(providerId, profile.profileId);
    const apiKey = normalizeString(profile.apiKey) ?? normalizeString(profile.token);
    const enabled =
      typeof profile.enabled === "boolean" ? profile.enabled : Boolean(apiKey);

    if (enabled && !apiKey) {
      warnings.push(
        `Auth profile ${profile.profileId} was imported disabled because no key/token was provided.`
      );
    }

    return {
      profileId,
      providerId,
      label:
        normalizeString(profile.label) ??
        `OpenClaw ${providerId} (${profileId})`,
      baseUrl: normalizeString(profile.baseUrl) ?? undefined,
      credentialSource: "organization_auth_profile" as const,
      billingSource: normalizeBillingSource(profile.billingSource, providerId),
      apiKey: apiKey ?? undefined,
      encryptedFields: apiKey ? ["apiKey"] : undefined,
      capabilities: resolveDefaultCapabilities(providerId),
      enabled: enabled && Boolean(apiKey),
      priority: normalizePriority(profile.priority, index),
      metadata: {
        source: "openclaw_bridge_import",
        compatibilityAdapterContract:
          OPENCLAW_COMPATIBILITY_ADAPTER_CONTRACT_VERSION,
        nativePolicyPrecedence: "vc83_runtime_policy",
        directMutationBypassAllowed: false,
        trustApprovalRequiredForActionableIntent: true,
        importedAt: now,
        ...(profile.defaultVoiceId
          ? { defaultVoiceId: profile.defaultVoiceId }
          : {}),
      },
    };
  });

  const importedPrivateModels = dedupeImportedModels(
    (input.privateModels ?? []).map((model, index) => {
      const providerId = normalizeProviderId(model.provider);
      const normalizedModelId = normalizeModelIdForProvider({
        providerId,
        modelId: model.modelId,
      });
      return {
        modelId: normalizedModelId,
        isDefault: model.setAsDefault === true,
        customLabel: normalizeString(model.label) ?? undefined,
        enabledAt: now + index,
      };
    })
  );

  return {
    importedAuthProfiles,
    importedPrivateModels,
    warnings,
  };
}
