export const SAFE_FALLBACK_MODEL_ID = "anthropic/claude-3-5-sonnet";

export interface OrgEnabledModelSetting {
  modelId: string;
  isDefault?: boolean;
}

export interface OrgLlmPolicySettings {
  enabledModels?: OrgEnabledModelSetting[];
  defaultModelId?: string;
  model?: string;
}

export interface OrgModelPolicySettings {
  llm?: OrgLlmPolicySettings | null;
}

export interface ResolveRequestedModelOptions {
  systemDefaultModelId?: string;
  safeFallbackModelId?: string;
}

export type ModelSelectionSource =
  | "preferred"
  | "org_default"
  | "safe_fallback"
  | "platform_first_enabled"
  | "unknown";

export interface ModelSelectionSourceArgs {
  selectedModel: string;
  preferredModel?: string | null;
  orgDefaultModel?: string | null;
  safeFallbackModelId?: string;
  platformFirstEnabledModelId?: string | null;
}

interface NormalizedEnabledModel {
  modelId: string;
  isDefault: boolean;
}

function normalizeModelId(modelId?: string | null): string | null {
  if (typeof modelId !== "string") {
    return null;
  }

  const trimmed = modelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNormalizedEnabledModels(
  settings?: OrgModelPolicySettings | null
): NormalizedEnabledModel[] {
  const models = settings?.llm?.enabledModels;
  if (!models || models.length === 0) {
    return [];
  }

  return models
    .map((model) => {
      const modelId = normalizeModelId(model.modelId);
      if (!modelId) {
        return null;
      }

      return {
        modelId,
        isDefault: Boolean(model.isDefault),
      };
    })
    .filter((model): model is NormalizedEnabledModel => model !== null);
}

export function resolveOrgDefaultModel(
  settings?: OrgModelPolicySettings | null
): string | null {
  const enabledModels = getNormalizedEnabledModels(settings);
  const enabledSet = new Set(enabledModels.map((model) => model.modelId));
  const configuredDefault = normalizeModelId(settings?.llm?.defaultModelId);

  if (configuredDefault && enabledSet.has(configuredDefault)) {
    return configuredDefault;
  }

  const flaggedDefault = enabledModels.find((model) => model.isDefault);
  if (flaggedDefault) {
    return flaggedDefault.modelId;
  }

  if (enabledModels.length > 0) {
    return enabledModels[0].modelId;
  }

  return normalizeModelId(settings?.llm?.model);
}

export function isModelAllowedForOrg(
  settings: OrgModelPolicySettings | null | undefined,
  modelId: string
): boolean {
  const normalizedModel = normalizeModelId(modelId);
  if (!normalizedModel) {
    return false;
  }

  const enabledModels = getNormalizedEnabledModels(settings);
  if (enabledModels.length > 0) {
    return enabledModels.some((model) => model.modelId === normalizedModel);
  }

  const legacyModel = normalizeModelId(settings?.llm?.model);
  if (legacyModel) {
    return legacyModel === normalizedModel;
  }

  // If no org-level model policy exists yet, allow explicit request
  // and let higher-level policy checks handle platform validation.
  return true;
}

export function resolveRequestedModel(
  settings: OrgModelPolicySettings | null | undefined,
  requestedModel?: string | null,
  options: ResolveRequestedModelOptions = {}
): string {
  const normalizedRequestedModel = normalizeModelId(requestedModel);
  if (
    normalizedRequestedModel &&
    isModelAllowedForOrg(settings, normalizedRequestedModel)
  ) {
    return normalizedRequestedModel;
  }

  const orgDefaultModel = resolveOrgDefaultModel(settings);
  if (orgDefaultModel) {
    return orgDefaultModel;
  }

  const systemDefaultModelId = normalizeModelId(options.systemDefaultModelId);
  if (systemDefaultModelId) {
    return systemDefaultModelId;
  }

  return (
    normalizeModelId(options.safeFallbackModelId) ?? SAFE_FALLBACK_MODEL_ID
  );
}

export function selectFirstPlatformEnabledModel(
  candidates: Array<string | null | undefined>,
  platformEnabledModelIds: Iterable<string>
): string | null {
  const enabledSet = new Set<string>();
  for (const modelId of platformEnabledModelIds) {
    const normalized = normalizeModelId(modelId);
    if (normalized) {
      enabledSet.add(normalized);
    }
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeModelId(candidate);
    if (normalizedCandidate && enabledSet.has(normalizedCandidate)) {
      return normalizedCandidate;
    }
  }

  return null;
}

export function determineModelSelectionSource(
  args: ModelSelectionSourceArgs
): ModelSelectionSource {
  const selectedModel = normalizeModelId(args.selectedModel);
  if (!selectedModel) {
    return "unknown";
  }

  const preferredModel = normalizeModelId(args.preferredModel);
  if (selectedModel === preferredModel) {
    return "preferred";
  }

  const orgDefaultModel = normalizeModelId(args.orgDefaultModel);
  if (selectedModel === orgDefaultModel) {
    return "org_default";
  }

  const safeFallbackModelId = normalizeModelId(
    args.safeFallbackModelId ?? SAFE_FALLBACK_MODEL_ID
  );
  if (selectedModel === safeFallbackModelId) {
    return "safe_fallback";
  }

  const platformFirstEnabledModelId = normalizeModelId(
    args.platformFirstEnabledModelId
  );
  if (selectedModel === platformFirstEnabledModelId) {
    return "platform_first_enabled";
  }

  return "unknown";
}
