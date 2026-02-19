import { SAFE_FALLBACK_MODEL_ID } from "./modelPolicy";
import type { AiProviderId } from "../channels/types";

const CANONICAL_PROVIDER_ALIAS: Record<string, AiProviderId> = {
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

export interface BuildModelFailoverCandidatesArgs {
  primaryModelId: string;
  orgEnabledModelIds?: Array<string | null | undefined>;
  orgDefaultModelId?: string | null;
  platformEnabledModelIds: Array<string | null | undefined>;
  safeFallbackModelId?: string | null;
  sessionPinnedModelId?: string | null;
}

export interface ModelFailoverCandidate {
  modelId: string;
  providerId: AiProviderId | null;
  priority: number;
}

function normalizeModelId(modelId: string | null | undefined): string | null {
  if (typeof modelId !== "string") {
    return null;
  }

  const trimmed = modelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function inferModelProviderId(
  modelId: string | null | undefined
): AiProviderId | null {
  const normalizedModelId = normalizeModelId(modelId);
  if (!normalizedModelId) {
    return null;
  }

  const providerToken = normalizedModelId.split("/", 1)[0]?.trim().toLowerCase();
  if (!providerToken) {
    return null;
  }

  return CANONICAL_PROVIDER_ALIAS[providerToken] ?? null;
}

export function buildModelFailoverCandidates(
  args: BuildModelFailoverCandidatesArgs
): string[] {
  const platformEnabled = args.platformEnabledModelIds
    .map((modelId) => normalizeModelId(modelId))
    .filter((modelId): modelId is string => Boolean(modelId));
  const platformEnabledSet = new Set(platformEnabled);
  const ordered: string[] = [];

  const addIfPlatformEnabled = (modelId: string | null | undefined) => {
    const normalized = normalizeModelId(modelId);
    if (!normalized) {
      return;
    }
    if (!platformEnabledSet.has(normalized)) {
      return;
    }
    if (ordered.includes(normalized)) {
      return;
    }
    ordered.push(normalized);
  };

  addIfPlatformEnabled(args.primaryModelId);
  addIfPlatformEnabled(args.sessionPinnedModelId);
  addIfPlatformEnabled(args.orgDefaultModelId);

  for (const modelId of args.orgEnabledModelIds ?? []) {
    addIfPlatformEnabled(modelId);
  }

  addIfPlatformEnabled(args.safeFallbackModelId ?? SAFE_FALLBACK_MODEL_ID);

  for (const modelId of platformEnabled) {
    addIfPlatformEnabled(modelId);
  }

  return ordered;
}

export function buildModelFailoverPlan(
  args: BuildModelFailoverCandidatesArgs
): ModelFailoverCandidate[] {
  return buildModelFailoverCandidates(args).map((modelId, priority) => ({
    modelId,
    providerId: inferModelProviderId(modelId),
    priority,
  }));
}
