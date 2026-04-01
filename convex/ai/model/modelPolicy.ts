import {
  AI_BILLING_SOURCE_VALUES,
  AI_PROVIDER_ID_VALUES,
  type AiBillingSource,
  type AiCapability,
  type AiCapabilityMatrix,
  type AiProviderId,
} from "../../channels/types";
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

export const MODEL_QUALITY_TIER_VALUES = [
  "gold",
  "silver",
  "bronze",
  "unrated",
] as const;
export type ModelQualityTier = (typeof MODEL_QUALITY_TIER_VALUES)[number];

export const MODEL_PRIVACY_MODE_VALUES = [
  "off",
  "prefer_local",
  "local_only",
] as const;
export type ModelPrivacyMode = (typeof MODEL_PRIVACY_MODE_VALUES)[number];

export type ModelQualityAssessmentSource =
  | "capability_matrix"
  | "missing_capability_matrix";

export interface ModelQualityAssessment {
  tier: ModelQualityTier;
  score: number;
  source: ModelQualityAssessmentSource;
}

export interface ModelSwitchDriftScores {
  capabilityRegression: number;
  qualityTierRegression: number;
  providerShift: number;
  overall: number;
  severity: "low" | "medium" | "high";
}

export type ModelQualityFirewallBlockReason =
  | "privacy_mode_requires_local_model"
  | "quality_tier_below_floor";

export interface ModelQualityFirewallDecision {
  allowed: boolean;
  blockReason?: ModelQualityFirewallBlockReason;
  userVisibleMessage?: string;
}

export type ModelRoutingCandidateReason =
  | "session_pinned"
  | "preferred"
  | "org_default"
  | "safe_fallback"
  | "platform_first_enabled"
  | "org_enabled_pool"
  | "local_connector_pool"
  | "platform_model_pool"
  | "provider_unavailable_auth_profiles"
  | "modality_unsupported"
  | "intent_unsupported"
  | "privacy_mode_blocked"
  | "quality_tier_blocked";

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
  privacyMode?: ModelPrivacyMode;
  qualityTierFloor?: ModelQualityTier;
  localModelIds?: Array<string | null | undefined>;
  previousSelectedModelId?: string | null;
}

export interface ModelRoutingMatrixEntry {
  modelId: string;
  providerId: AiProviderId | null;
  capabilityMatrix: Partial<AiCapabilityMatrix>;
  reason: ModelRoutingCandidateReason;
  sourceReason: Exclude<
    ModelRoutingCandidateReason,
    | "provider_unavailable_auth_profiles"
    | "modality_unsupported"
    | "intent_unsupported"
    | "privacy_mode_blocked"
    | "quality_tier_blocked"
  >;
  providerAvailable: boolean;
  supportsIntent: boolean;
  supportsModality: boolean;
  qualityTier: ModelQualityTier;
  qualityScore: number;
  firewallAllowed: boolean;
  firewallBlockReason?: ModelQualityFirewallBlockReason;
  firewallUserVisibleMessage?: string;
  isLocalModel: boolean;
  modelSwitchDrift?: ModelSwitchDriftScores;
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

export const OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG =
  "aiOpenClawCompatibilityEnabled" as const;

export const OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG_ALIASES = [
  OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG,
  "aiOpenclawCompatibilityEnabled",
] as const;

export type OpenClawCompatibilityFallbackReason =
  | "adapter_not_requested"
  | "org_feature_flag_disabled"
  | "adapter_failure";

export interface ResolveOpenClawCompatibilityModeArgs {
  organizationFeatureFlags?: Record<string, unknown> | null;
  adapterRequested?: boolean;
  adapterFailed?: boolean;
}

export interface OpenClawCompatibilityModeDecision {
  enabled: boolean;
  mode: "native" | "openclaw_adapter";
  featureFlagKey: typeof OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG;
  featureFlagEnabled: boolean;
  fallbackToNative: boolean;
  fallbackReason: OpenClawCompatibilityFallbackReason | null;
  nativePolicyPrecedence: "vc83_runtime_policy";
  directMutationBypassAllowed: false;
  trustApprovalRequiredForActionableIntent: true;
}

export interface OpenClawCompatibilityAuthorityContract {
  nativePolicyPrecedence: OpenClawCompatibilityModeDecision["nativePolicyPrecedence"];
  directMutationBypassAllowed: OpenClawCompatibilityModeDecision["directMutationBypassAllowed"];
  trustApprovalRequiredForActionableIntent: OpenClawCompatibilityModeDecision["trustApprovalRequiredForActionableIntent"];
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
  local: "openai_compatible",
  ollama: "openai_compatible",
  lm_studio: "openai_compatible",
  "lm-studio": "openai_compatible",
  llama_cpp: "openai_compatible",
  "llama-cpp": "openai_compatible",
  llamacpp: "openai_compatible",
};

const CANONICAL_PROVIDER_SET = new Set<string>(
  AI_PROVIDER_ID_VALUES as readonly string[]
);

const CANONICAL_BILLING_SOURCE_SET = new Set<string>(
  AI_BILLING_SOURCE_VALUES as readonly string[]
);

const VISION_ATTACHMENT_HINTS = ["image", "photo", "vision", "video"];
const AUDIO_ATTACHMENT_HINTS = ["audio", "voice", "ogg", "mp3", "wav", "m4a"];
const MODALITY_PROVIDER_PREFERENCE: Record<
  ModelRoutingModality,
  readonly AiProviderId[]
> = {
  text: [],
  vision: ["gemini"],
  audio_in: [],
};

const MODEL_QUALITY_CAPABILITY_WEIGHTS: Record<AiCapability, number> = {
  text: 0.2,
  tools: 0.2,
  json: 0.2,
  vision: 0.15,
  audio_in: 0.15,
  audio_out: 0.1,
};

const MODEL_QUALITY_TIER_ORDINAL: Record<ModelQualityTier, number> = {
  gold: 3,
  silver: 2,
  bronze: 1,
  unrated: 0,
};

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

function resolveQualityTierFromScore(score: number): ModelQualityTier {
  if (score >= 0.85) {
    return "gold";
  }
  if (score >= 0.65) {
    return "silver";
  }
  if (score >= 0.45) {
    return "bronze";
  }
  return "unrated";
}

export function assessModelQuality(args: {
  capabilityMatrix?: Partial<AiCapabilityMatrix> | null;
}): ModelQualityAssessment {
  const source: ModelQualityAssessmentSource =
    args.capabilityMatrix && Object.keys(args.capabilityMatrix).length > 0
      ? "capability_matrix"
      : "missing_capability_matrix";
  const capabilityMatrix = args.capabilityMatrix ?? { text: true };
  let score = 0;

  for (const capability of Object.keys(
    MODEL_QUALITY_CAPABILITY_WEIGHTS
  ) as AiCapability[]) {
    if (capabilityMatrix[capability] === true) {
      score += MODEL_QUALITY_CAPABILITY_WEIGHTS[capability];
    }
  }

  const normalizedScore = clampUnitScore(score);
  return {
    tier: resolveQualityTierFromScore(normalizedScore),
    score: normalizedScore,
    source,
  };
}

export function resolveModelQualityFirewallDecision(args: {
  privacyMode?: ModelPrivacyMode;
  qualityTierFloor?: ModelQualityTier;
  qualityTier: ModelQualityTier;
  isLocalModel: boolean;
}): ModelQualityFirewallDecision {
  const privacyMode = normalizePrivacyMode(args.privacyMode);
  if (privacyMode === "local_only" && !args.isLocalModel) {
    return {
      allowed: false,
      blockReason: "privacy_mode_requires_local_model",
      userVisibleMessage:
        "Privacy mode is set to local-only, so cloud model routes are blocked for this session.",
    };
  }

  const qualityTierFloor = normalizeQualityTierFloor(args.qualityTierFloor);
  const floorOrdinal = MODEL_QUALITY_TIER_ORDINAL[qualityTierFloor];
  const modelOrdinal = MODEL_QUALITY_TIER_ORDINAL[args.qualityTier];
  if (floorOrdinal > modelOrdinal) {
    return {
      allowed: false,
      blockReason: "quality_tier_below_floor",
      userVisibleMessage:
        `Model quality tier ${args.qualityTier} is below required floor ${qualityTierFloor}.`,
    };
  }

  return { allowed: true };
}

export function calculateModelSwitchDriftScores(args: {
  previousCapabilityMatrix?: Partial<AiCapabilityMatrix> | null;
  nextCapabilityMatrix?: Partial<AiCapabilityMatrix> | null;
  previousQualityTier?: ModelQualityTier;
  nextQualityTier?: ModelQualityTier;
  previousProviderId?: string | null;
  nextProviderId?: string | null;
}): ModelSwitchDriftScores {
  const previousQuality = assessModelQuality({
    capabilityMatrix: args.previousCapabilityMatrix,
  });
  const nextQuality = assessModelQuality({
    capabilityMatrix: args.nextCapabilityMatrix,
  });
  const previousTier = args.previousQualityTier ?? previousQuality.tier;
  const nextTier = args.nextQualityTier ?? nextQuality.tier;
  const capabilityRegression = clampUnitScore(previousQuality.score - nextQuality.score);
  const qualityTierRegression = clampUnitScore(
    (MODEL_QUALITY_TIER_ORDINAL[previousTier] - MODEL_QUALITY_TIER_ORDINAL[nextTier]) / 3
  );
  const previousProvider = normalizeCanonicalProviderId(args.previousProviderId);
  const nextProvider = normalizeCanonicalProviderId(args.nextProviderId);
  const providerShift =
    previousProvider && nextProvider && previousProvider !== nextProvider ? 1 : 0;
  const overall = clampUnitScore(
    capabilityRegression * 0.6
    + qualityTierRegression * 0.3
    + providerShift * 0.1
  );
  const severity: ModelSwitchDriftScores["severity"] =
    overall >= 0.55 ? "high" : overall >= 0.25 ? "medium" : "low";

  return {
    capabilityRegression,
    qualityTierRegression,
    providerShift,
    overall,
    severity,
  };
}

function normalizeModelId(modelId?: string | null): string | null {
  if (typeof modelId !== "string") {
    return null;
  }

  const trimmed = modelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clampUnitScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeQualityTierFloor(
  value: ModelQualityTier | undefined
): ModelQualityTier {
  if (value === "gold" || value === "silver" || value === "bronze") {
    return value;
  }
  return "unrated";
}

function normalizePrivacyMode(
  value: ModelPrivacyMode | undefined
): ModelPrivacyMode {
  if (value === "local_only" || value === "prefer_local") {
    return value;
  }
  return "off";
}

function normalizeLocalModelSet(
  modelIds?: Array<string | null | undefined>
): Set<string> {
  const normalized = new Set<string>();
  for (const modelId of modelIds ?? []) {
    const value = normalizeModelId(modelId);
    if (value) {
      normalized.add(value);
    }
  }
  return normalized;
}

function resolveOpenClawCompatibilityFeatureFlag(
  flags?: Record<string, unknown> | null
): boolean {
  if (!flags) {
    return false;
  }

  for (const alias of OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG_ALIASES) {
    if (flags[alias] === true) {
      return true;
    }
  }

  return false;
}

export function resolveOpenClawCompatibilityMode(
  args: ResolveOpenClawCompatibilityModeArgs
): OpenClawCompatibilityModeDecision {
  const adapterRequested = args.adapterRequested === true;
  const adapterFailed = args.adapterFailed === true;
  const featureFlagEnabled = resolveOpenClawCompatibilityFeatureFlag(
    args.organizationFeatureFlags
  );

  let fallbackReason: OpenClawCompatibilityFallbackReason | null = null;
  if (!adapterRequested) {
    fallbackReason = "adapter_not_requested";
  } else if (!featureFlagEnabled) {
    fallbackReason = "org_feature_flag_disabled";
  } else if (adapterFailed) {
    fallbackReason = "adapter_failure";
  }

  const enabled = fallbackReason === null;
  return {
    enabled,
    mode: enabled ? "openclaw_adapter" : "native",
    featureFlagKey: OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG,
    featureFlagEnabled,
    fallbackToNative: !enabled,
    fallbackReason,
    nativePolicyPrecedence: "vc83_runtime_policy",
    directMutationBypassAllowed: false,
    trustApprovalRequiredForActionableIntent: true,
  };
}

export function isOpenClawAuthorityContractSatisfied(
  contract: OpenClawCompatibilityAuthorityContract
): boolean {
  return (
    contract.nativePolicyPrecedence === "vc83_runtime_policy" &&
    contract.directMutationBypassAllowed === false &&
    contract.trustApprovalRequiredForActionableIntent === true
  );
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

  // No org-level model policy exists and no legacy model is configured.
  // Deny explicit model use by default so runtime falls back to
  // deterministic org/system defaults.
  return false;
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
    | "provider_unavailable_auth_profiles"
    | "modality_unsupported"
    | "intent_unsupported"
    | "privacy_mode_blocked"
    | "quality_tier_blocked"
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

function resolveProviderPreferenceRank(args: {
  routingModality: ModelRoutingModality;
  providerId: AiProviderId | null;
  providerAvailable: boolean;
  supportsIntent: boolean;
  supportsModality: boolean;
}): number {
  if (
    !args.providerAvailable ||
    !args.supportsIntent ||
    !args.supportsModality ||
    !args.providerId
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const preferredProviders =
    MODALITY_PROVIDER_PREFERENCE[args.routingModality] ?? [];
  const providerRank = preferredProviders.indexOf(args.providerId);
  return providerRank >= 0 ? providerRank : Number.MAX_SAFE_INTEGER;
}

export function buildModelRoutingMatrix(
  args: BuildModelRoutingMatrixArgs
): ModelRoutingMatrixEntry[] {
  const routingIntent = args.routingIntent ?? "general";
  const routingModality = args.routingModality ?? "text";
  const privacyMode = normalizePrivacyMode(args.privacyMode);
  const qualityTierFloor = normalizeQualityTierFloor(args.qualityTierFloor);
  const localModelSet = normalizeLocalModelSet(args.localModelIds);
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
  for (const modelId of args.localModelIds ?? []) {
    appendCandidate(orderedCandidates, seen, modelId, "local_connector_pool");
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
    const isLocalModel = localModelSet.has(candidate.modelId);
    const providerId =
      (isLocalModel ? "openai_compatible" : null) ??
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
    const qualityAssessment = assessModelQuality({ capabilityMatrix });
    const firewallDecision = resolveModelQualityFirewallDecision({
      privacyMode,
      qualityTierFloor,
      qualityTier: qualityAssessment.tier,
      isLocalModel,
    });

    let reason: ModelRoutingCandidateReason = candidate.sourceReason;
    if (!providerAvailable) {
      reason = "provider_unavailable_auth_profiles";
    } else if (!supportsModality) {
      reason = "modality_unsupported";
    } else if (!supportsIntent) {
      reason = "intent_unsupported";
    } else if (firewallDecision.blockReason === "privacy_mode_requires_local_model") {
      reason = "privacy_mode_blocked";
    } else if (firewallDecision.blockReason === "quality_tier_below_floor") {
      reason = "quality_tier_blocked";
    }

    let rankBucket = 5;
    if (
      providerAvailable
      && supportsModality
      && supportsIntent
      && firewallDecision.allowed
    ) {
      rankBucket = 0;
    } else if (providerAvailable && supportsModality && supportsIntent) {
      rankBucket = 1;
    } else if (providerAvailable && supportsModality) {
      rankBucket = 2;
    } else if (providerAvailable) {
      rankBucket = 3;
    } else if (supportsModality && supportsIntent && firewallDecision.allowed) {
      rankBucket = 4;
    }

    return {
      ...candidate,
      providerId,
      capabilityMatrix,
      providerAvailable,
      supportsIntent,
      supportsModality,
      qualityTier: qualityAssessment.tier,
      qualityScore: qualityAssessment.score,
      firewallDecision,
      isLocalModel,
      reason,
      rankBucket,
      providerPreferenceRank: resolveProviderPreferenceRank({
        routingModality,
        providerId,
        providerAvailable,
        supportsIntent,
        supportsModality,
      }),
    };
  });

  scored.sort((a, b) => {
    if (a.rankBucket !== b.rankBucket) {
      return a.rankBucket - b.rankBucket;
    }
    if (a.providerPreferenceRank !== b.providerPreferenceRank) {
      return a.providerPreferenceRank - b.providerPreferenceRank;
    }
    if (a.qualityTier !== b.qualityTier) {
      return (
        MODEL_QUALITY_TIER_ORDINAL[b.qualityTier]
        - MODEL_QUALITY_TIER_ORDINAL[a.qualityTier]
      );
    }
    if (a.qualityScore !== b.qualityScore) {
      return b.qualityScore - a.qualityScore;
    }
    return a.ordinal - b.ordinal;
  });

  const previousSelectedModelId = normalizeModelId(args.previousSelectedModelId);
  const previousSelectedCandidate = previousSelectedModelId
    ? scored.find((candidate) => candidate.modelId === previousSelectedModelId)
    : null;

  const entries = scored.map((candidate, index) => {
    const modelSwitchDrift = calculateModelSwitchDriftScores({
      previousCapabilityMatrix: previousSelectedCandidate?.capabilityMatrix,
      nextCapabilityMatrix: candidate.capabilityMatrix,
      previousQualityTier: previousSelectedCandidate?.qualityTier,
      nextQualityTier: candidate.qualityTier,
      previousProviderId: previousSelectedCandidate?.providerId,
      nextProviderId: candidate.providerId,
    });
    return {
      modelId: candidate.modelId,
      providerId: candidate.providerId,
      capabilityMatrix: candidate.capabilityMatrix,
      reason: candidate.reason,
      sourceReason: candidate.sourceReason,
      providerAvailable: candidate.providerAvailable,
      supportsIntent: candidate.supportsIntent,
      supportsModality: candidate.supportsModality,
      qualityTier: candidate.qualityTier,
      qualityScore: candidate.qualityScore,
      firewallAllowed: candidate.firewallDecision.allowed,
      firewallBlockReason: candidate.firewallDecision.blockReason,
      firewallUserVisibleMessage: candidate.firewallDecision.userVisibleMessage,
      isLocalModel: candidate.isLocalModel,
      modelSwitchDrift,
      priority: index,
    };
  });

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
      qualityTier: "unrated",
      qualityScore: 0,
      firewallAllowed: true,
      firewallBlockReason: undefined,
      firewallUserVisibleMessage: undefined,
      isLocalModel: false,
      modelSwitchDrift: calculateModelSwitchDriftScores({
        previousCapabilityMatrix: null,
        nextCapabilityMatrix: { text: true },
      }),
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
