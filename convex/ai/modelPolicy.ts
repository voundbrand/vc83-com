import {
  AI_BILLING_SOURCE_VALUES,
  AI_PROVIDER_ID_VALUES,
  type AiBillingSource,
  type AiCapability,
  type AiCapabilityMatrix,
  type AiProviderId,
} from "../channels/types";
import { evaluateRoutingCapabilityRequirements } from "./modelEnablementGates";

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

export type ModelRoutingIntent =
  | "general"
  | "tooling"
  | "billing"
  | "support"
  | "content";

export type ModelRoutingModality = "text" | "vision" | "audio_in";

export type ModelRoutingCandidateReason =
  | "session_pinned"
  | "preferred"
  | "org_default"
  | "safe_fallback"
  | "platform_first_enabled"
  | "org_enabled_pool"
  | "platform_model_pool"
  | "provider_unavailable_auth_profiles"
  | "modality_unsupported"
  | "intent_unsupported";

export interface PlatformRoutingModel {
  modelId: string;
  providerId?: string | null;
  capabilityMatrix?: Partial<AiCapabilityMatrix> | null;
}

export interface BuildModelRoutingMatrixArgs {
  preferredModelId: string;
  sessionPinnedModelId?: string | null;
  orgDefaultModelId?: string | null;
  orgEnabledModelIds?: Array<string | null | undefined>;
  platformModels: PlatformRoutingModel[];
  safeFallbackModelId?: string | null;
  platformFirstEnabledModelId?: string | null;
  hasExplicitModelOverride?: boolean;
  routingIntent?: ModelRoutingIntent;
  routingModality?: ModelRoutingModality;
  availableProviderIds?: Iterable<string>;
}

export interface ModelRoutingMatrixEntry {
  modelId: string;
  providerId: AiProviderId | null;
  capabilityMatrix: Partial<AiCapabilityMatrix>;
  reason: ModelRoutingCandidateReason;
  sourceReason: Exclude<
    ModelRoutingCandidateReason,
    "provider_unavailable_auth_profiles" | "modality_unsupported" | "intent_unsupported"
  >;
  providerAvailable: boolean;
  supportsIntent: boolean;
  supportsModality: boolean;
  priority: number;
}

export interface ResolveModelRoutingIntentArgs {
  detectedIntents?: string[];
  requiresTools?: boolean;
}

export interface ResolveModelRoutingModalityArgs {
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CanonicalCapabilityInput {
  toolCalling?: boolean | null;
  multimodal?: boolean | null;
  vision?: boolean | null;
  audioIn?: boolean | null;
  audioOut?: boolean | null;
  jsonMode?: boolean | null;
}

interface NormalizedEnabledModel {
  modelId: string;
  isDefault: boolean;
}

const CANONICAL_PROVIDER_ALIAS: Record<string, AiProviderId> = {
  google: "gemini",
  "google-ai-studio": "gemini",
  xai: "grok",
  "openai-compatible": "openai_compatible",
  "openai_compatible": "openai_compatible",
};

const CANONICAL_PROVIDER_SET = new Set<string>(
  AI_PROVIDER_ID_VALUES as readonly string[]
);

const CANONICAL_BILLING_SOURCE_SET = new Set<string>(
  AI_BILLING_SOURCE_VALUES as readonly string[]
);

const VISION_ATTACHMENT_HINTS = ["image", "photo", "vision", "video"];
const AUDIO_ATTACHMENT_HINTS = ["audio", "voice", "ogg", "mp3", "wav", "m4a"];

function normalizeProviderAvailabilitySet(
  providers?: Iterable<string>
): Set<AiProviderId> {
  const normalized = new Set<AiProviderId>();
  if (!providers) {
    return normalized;
  }

  for (const provider of providers) {
    const providerId = normalizeCanonicalProviderId(provider);
    if (providerId) {
      normalized.add(providerId);
    }
  }

  return normalized;
}

function normalizeAttachmentType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function stringIncludesAny(value: string, hints: string[]): boolean {
  return hints.some((hint) => value.includes(hint));
}

function extractRequiredCapabilities(args: {
  routingIntent: ModelRoutingIntent;
  routingModality: ModelRoutingModality;
}): {
  modalityCapabilities: AiCapability[];
  intentCapabilities: AiCapability[];
} {
  const modalityCapabilities: AiCapability[] = [];
  const intentCapabilities: AiCapability[] = [];

  if (args.routingModality === "vision") {
    modalityCapabilities.push("vision");
  } else if (args.routingModality === "audio_in") {
    modalityCapabilities.push("audio_in");
  }

  if (args.routingIntent === "tooling") {
    intentCapabilities.push("tools", "json");
  }

  return {
    modalityCapabilities,
    intentCapabilities,
  };
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

export function resolveModelRoutingIntent(
  args: ResolveModelRoutingIntentArgs
): ModelRoutingIntent {
  const intents = (args.detectedIntents ?? [])
    .map((intent) => intent.trim().toLowerCase())
    .filter((intent) => intent.length > 0);

  if (intents.includes("billing")) {
    return "billing";
  }
  if (intents.includes("support") || intents.includes("team")) {
    return "support";
  }
  if (intents.includes("content")) {
    return "content";
  }
  if (args.requiresTools === true || intents.length > 0) {
    return "tooling";
  }
  return "general";
}

export function resolveModelRoutingModality(
  args: ResolveModelRoutingModalityArgs
): ModelRoutingModality {
  const metadata = args.metadata ?? {};
  const message = typeof args.message === "string"
    ? args.message.trim().toLowerCase()
    : "";
  const messageType = normalizeAttachmentType(metadata.messageType);

  if (messageType === "audio") {
    return "audio_in";
  }
  if (messageType === "image" || messageType === "video") {
    return "vision";
  }

  const attachments = Array.isArray(metadata.attachments)
    ? metadata.attachments
    : [];
  for (const attachment of attachments) {
    const attachmentType = normalizeAttachmentType(
      (attachment as Record<string, unknown>).type
    );
    if (attachmentType && stringIncludesAny(attachmentType, AUDIO_ATTACHMENT_HINTS)) {
      return "audio_in";
    }
    if (attachmentType && stringIncludesAny(attachmentType, VISION_ATTACHMENT_HINTS)) {
      return "vision";
    }

    const attachmentName = normalizeAttachmentType(
      (attachment as Record<string, unknown>).name
    );
    if (attachmentName && stringIncludesAny(attachmentName, AUDIO_ATTACHMENT_HINTS)) {
      return "audio_in";
    }
    if (attachmentName && stringIncludesAny(attachmentName, VISION_ATTACHMENT_HINTS)) {
      return "vision";
    }
  }

  const rawPayload = (metadata.raw ?? {}) as Record<string, unknown>;
  if (
    rawPayload.voice ||
    rawPayload.audio ||
    (rawPayload.message as Record<string, unknown> | undefined)?.voice ||
    (rawPayload.message as Record<string, unknown> | undefined)?.audio
  ) {
    return "audio_in";
  }
  if (
    rawPayload.photo ||
    rawPayload.image ||
    rawPayload.video ||
    (rawPayload.message as Record<string, unknown> | undefined)?.photo ||
    (rawPayload.message as Record<string, unknown> | undefined)?.image ||
    (rawPayload.message as Record<string, unknown> | undefined)?.video
  ) {
    return "vision";
  }

  if (
    message.includes("[audio") ||
    message.includes("voice note") ||
    message.includes("voice message")
  ) {
    return "audio_in";
  }
  if (
    message.includes("[image") ||
    message.includes("[video") ||
    message.includes("[media")
  ) {
    return "vision";
  }

  return "text";
}

interface NormalizedRoutingCandidate {
  modelId: string;
  sourceReason: Exclude<
    ModelRoutingCandidateReason,
    "provider_unavailable_auth_profiles" | "modality_unsupported" | "intent_unsupported"
  >;
  ordinal: number;
}

interface RoutingMetadata {
  providerId: AiProviderId | null;
  capabilityMatrix: Partial<AiCapabilityMatrix>;
}

function getRoutingMetadataByModelId(
  models: PlatformRoutingModel[]
): Map<string, RoutingMetadata> {
  const map = new Map<string, RoutingMetadata>();

  for (const model of models) {
    const normalizedModelId = normalizeModelId(model.modelId);
    if (!normalizedModelId) {
      continue;
    }

    map.set(normalizedModelId, {
      providerId: normalizeCanonicalProviderId(model.providerId),
      capabilityMatrix: model.capabilityMatrix ?? { text: true },
    });
  }

  return map;
}

function appendCandidate(
  ordered: NormalizedRoutingCandidate[],
  seen: Set<string>,
  modelId: string | null | undefined,
  sourceReason: NormalizedRoutingCandidate["sourceReason"]
) {
  const normalizedModelId = normalizeModelId(modelId);
  if (!normalizedModelId || seen.has(normalizedModelId)) {
    return;
  }

  ordered.push({
    modelId: normalizedModelId,
    sourceReason,
    ordinal: ordered.length,
  });
  seen.add(normalizedModelId);
}

export function buildModelRoutingMatrix(
  args: BuildModelRoutingMatrixArgs
): ModelRoutingMatrixEntry[] {
  const routingIntent = args.routingIntent ?? "general";
  const routingModality = args.routingModality ?? "text";
  const hasExplicitModelOverride = args.hasExplicitModelOverride === true;
  const safeFallbackModelId =
    normalizeModelId(args.safeFallbackModelId) ?? SAFE_FALLBACK_MODEL_ID;
  const platformFirstEnabledModelId = normalizeModelId(
    args.platformFirstEnabledModelId ?? args.platformModels[0]?.modelId
  );
  const metadataByModelId = getRoutingMetadataByModelId(args.platformModels);
  const orderedCandidates: NormalizedRoutingCandidate[] = [];
  const seen = new Set<string>();

  appendCandidate(
    orderedCandidates,
    seen,
    !hasExplicitModelOverride ? args.sessionPinnedModelId : null,
    "session_pinned"
  );
  appendCandidate(orderedCandidates, seen, args.preferredModelId, "preferred");
  appendCandidate(orderedCandidates, seen, args.orgDefaultModelId, "org_default");
  appendCandidate(orderedCandidates, seen, safeFallbackModelId, "safe_fallback");
  appendCandidate(
    orderedCandidates,
    seen,
    platformFirstEnabledModelId,
    "platform_first_enabled"
  );

  for (const modelId of args.orgEnabledModelIds ?? []) {
    appendCandidate(orderedCandidates, seen, modelId, "org_enabled_pool");
  }
  for (const platformModel of args.platformModels) {
    appendCandidate(
      orderedCandidates,
      seen,
      platformModel.modelId,
      "platform_model_pool"
    );
  }

  const providerAvailability = normalizeProviderAvailabilitySet(
    args.availableProviderIds
  );
  const hasProviderConstraints = providerAvailability.size > 0;
  const { modalityCapabilities, intentCapabilities } = extractRequiredCapabilities({
    routingIntent,
    routingModality,
  });

  const scored = orderedCandidates.map((candidate) => {
    const metadata = metadataByModelId.get(candidate.modelId);
    const providerId =
      metadata?.providerId ??
      normalizeCanonicalProviderId(candidate.modelId.split("/", 1)[0] ?? null);
    const capabilityMatrix = metadata?.capabilityMatrix ?? { text: true };
    const providerAvailable =
      !hasProviderConstraints ||
      !providerId ||
      providerAvailability.has(providerId);
    const modalityGate = evaluateRoutingCapabilityRequirements({
      capabilityMatrix,
      requiredCapabilities: modalityCapabilities,
    });
    const intentGate = evaluateRoutingCapabilityRequirements({
      capabilityMatrix,
      requiredCapabilities: intentCapabilities,
    });
    const supportsModality = modalityGate.passed;
    const supportsIntent = intentGate.passed;

    let reason: ModelRoutingCandidateReason = candidate.sourceReason;
    if (!providerAvailable) {
      reason = "provider_unavailable_auth_profiles";
    } else if (!supportsModality) {
      reason = "modality_unsupported";
    } else if (!supportsIntent) {
      reason = "intent_unsupported";
    }

    let rankBucket = 4;
    if (providerAvailable && supportsModality && supportsIntent) {
      rankBucket = 0;
    } else if (providerAvailable && supportsModality) {
      rankBucket = 1;
    } else if (providerAvailable) {
      rankBucket = 2;
    } else if (supportsModality && supportsIntent) {
      rankBucket = 3;
    }

    return {
      ...candidate,
      providerId,
      capabilityMatrix,
      providerAvailable,
      supportsIntent,
      supportsModality,
      reason,
      rankBucket,
    };
  });

  scored.sort((a, b) => {
    if (a.rankBucket !== b.rankBucket) {
      return a.rankBucket - b.rankBucket;
    }
    return a.ordinal - b.ordinal;
  });

  const entries = scored.map((candidate, index) => ({
    modelId: candidate.modelId,
    providerId: candidate.providerId,
    capabilityMatrix: candidate.capabilityMatrix,
    reason: candidate.reason,
    sourceReason: candidate.sourceReason,
    providerAvailable: candidate.providerAvailable,
    supportsIntent: candidate.supportsIntent,
    supportsModality: candidate.supportsModality,
    priority: index,
  }));

  if (entries.length > 0) {
    return entries;
  }

  return [
    {
      modelId: safeFallbackModelId,
      providerId: normalizeCanonicalProviderId(safeFallbackModelId.split("/", 1)[0]),
      capabilityMatrix: { text: true },
      reason: "safe_fallback",
      sourceReason: "safe_fallback",
      providerAvailable: true,
      supportsIntent: true,
      supportsModality: routingModality === "text",
      priority: 0,
    },
  ];
}

export function normalizeCanonicalProviderId(
  providerId?: string | null
): AiProviderId | null {
  if (typeof providerId !== "string") {
    return null;
  }

  const normalized = providerId.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const aliased = CANONICAL_PROVIDER_ALIAS[normalized] ?? normalized;
  return CANONICAL_PROVIDER_SET.has(aliased) ? (aliased as AiProviderId) : null;
}

export function normalizeCanonicalBillingSource(
  billingSource?: string | null
): AiBillingSource | null {
  if (typeof billingSource !== "string") {
    return null;
  }

  const normalized = billingSource.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return CANONICAL_BILLING_SOURCE_SET.has(normalized)
    ? (normalized as AiBillingSource)
    : null;
}

export function toCanonicalCapabilityMatrix(
  capabilities: CanonicalCapabilityInput
): AiCapabilityMatrix {
  const hasVision =
    capabilities.vision === true || capabilities.multimodal === true;
  const hasJson =
    capabilities.jsonMode === true || capabilities.toolCalling === true;

  return {
    text: true,
    vision: hasVision,
    audio_in: capabilities.audioIn === true,
    audio_out: capabilities.audioOut === true,
    tools: capabilities.toolCalling === true,
    json: hasJson,
  };
}
