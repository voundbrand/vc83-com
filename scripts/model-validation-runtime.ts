import {
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  type ModelSelectionSource,
  type OrgModelPolicySettings,
  selectFirstPlatformEnabledModel,
} from "../convex/ai/modelPolicy";

export interface ModelResolutionSnapshot {
  requestedModel?: string;
  selectedModel: string;
  selectionSource: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface EffectiveValidationModel {
  modelId: string;
  selectionSource: ModelSelectionSource;
}

interface ConversationMessageLike {
  role?: unknown;
  timestamp?: unknown;
  modelResolution?: unknown;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function normalizeModelResolution(
  value: unknown
): ModelResolutionSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!isString(record.selectedModel)) {
    return null;
  }
  if (!isString(record.selectionSource)) {
    return null;
  }
  if (!isBoolean(record.fallbackUsed)) {
    return null;
  }

  return {
    requestedModel: isString(record.requestedModel)
      ? record.requestedModel
      : undefined,
    selectedModel: record.selectedModel,
    selectionSource: record.selectionSource,
    fallbackUsed: record.fallbackUsed,
    fallbackReason: isString(record.fallbackReason)
      ? record.fallbackReason
      : undefined,
  };
}

export function getLatestAssistantModelResolution(
  messages: ConversationMessageLike[]
): ModelResolutionSnapshot | null {
  const sorted = [...messages].sort((a, b) => {
    const aTs = typeof a.timestamp === "number" ? a.timestamp : 0;
    const bTs = typeof b.timestamp === "number" ? b.timestamp : 0;
    return bTs - aTs;
  });

  for (const message of sorted) {
    if (message.role !== "assistant") {
      continue;
    }
    const normalized = normalizeModelResolution(message.modelResolution);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveEffectiveValidationModel(args: {
  requestedModelId?: string | null;
  settings: OrgModelPolicySettings | null | undefined;
  platformEnabledModelIds: string[];
}): EffectiveValidationModel | null {
  const preferredModel = resolveRequestedModel(
    args.settings,
    args.requestedModelId ?? undefined
  );
  const orgDefaultModel = resolveOrgDefaultModel(args.settings);
  const firstPlatformEnabledModel = args.platformEnabledModelIds[0] ?? null;
  const selectedModel = selectFirstPlatformEnabledModel(
    [
      preferredModel,
      orgDefaultModel,
      SAFE_FALLBACK_MODEL_ID,
      firstPlatformEnabledModel,
    ],
    args.platformEnabledModelIds
  );

  if (!selectedModel) {
    return null;
  }

  return {
    modelId: selectedModel,
    selectionSource: determineModelSelectionSource({
      selectedModel,
      preferredModel,
      orgDefaultModel,
      safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
      platformFirstEnabledModelId: firstPlatformEnabledModel,
    }),
  };
}

export function formatModelMismatchMessage(args: {
  expectedModel: string;
  resolution: ModelResolutionSnapshot;
}): string {
  const fallbackReasonSuffix = args.resolution.fallbackReason
    ? `, fallbackReason=${args.resolution.fallbackReason}`
    : "";

  return [
    "Effective model mismatch.",
    `expected=${args.expectedModel}`,
    `selected=${args.resolution.selectedModel}`,
    `selectionSource=${args.resolution.selectionSource}`,
    `fallbackUsed=${args.resolution.fallbackUsed}${fallbackReasonSuffix}`,
  ].join(" ");
}
