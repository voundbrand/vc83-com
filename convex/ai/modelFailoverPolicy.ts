import { SAFE_FALLBACK_MODEL_ID } from "./modelPolicy";

export interface BuildModelFailoverCandidatesArgs {
  primaryModelId: string;
  orgEnabledModelIds?: Array<string | null | undefined>;
  orgDefaultModelId?: string | null;
  platformEnabledModelIds: Array<string | null | undefined>;
  safeFallbackModelId?: string | null;
  sessionPinnedModelId?: string | null;
}

function normalizeModelId(modelId: string | null | undefined): string | null {
  if (typeof modelId !== "string") {
    return null;
  }

  const trimmed = modelId.trim();
  return trimmed.length > 0 ? trimmed : null;
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
