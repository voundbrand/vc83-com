import {
  resolveModeScopedAutonomyLevel as resolveModeScopedAutonomyLevelContract,
  type AutonomyLevel,
  type AutonomyLevelInput,
} from "./autonomy";

export const SOUL_MODE_VALUES = ["work", "private"] as const;
export type SoulMode = (typeof SOUL_MODE_VALUES)[number];

export const SOUL_MODE_TOOL_SCOPE_VALUES = ["full", "read_only", "none"] as const;
export type SoulModeToolScope = (typeof SOUL_MODE_TOOL_SCOPE_VALUES)[number];

export const SOUL_MODE_PRIVACY_LEVEL_VALUES = [
  "cloud",
  "local_preferred",
  "local_required",
] as const;
export type SoulModePrivacyLevel = (typeof SOUL_MODE_PRIVACY_LEVEL_VALUES)[number];

export interface SoulModeConfig {
  mode: SoulMode;
  label: string;
  description: string;
  toneOverride: string;
  toolScope: SoulModeToolScope;
  privacyLevel: SoulModePrivacyLevel;
  channelBindings: string[];
  archetypeDefault?: string;
}

export interface ModeChannelBinding {
  channel: string;
  mode: SoulMode;
}

export interface SoulModeRuntimeContract {
  mode: SoulMode;
  config: SoulModeConfig;
  source: "explicit" | "channel_binding" | "default";
}

export const DEFAULT_SOUL_MODES: readonly SoulModeConfig[] = [
  {
    mode: "work",
    label: "Work Mode",
    description:
      "Professional, action-oriented register for business channels and execution-heavy workflows.",
    toneOverride: "professional",
    toolScope: "full",
    privacyLevel: "cloud",
    channelBindings: ["slack", "email", "webchat", "whatsapp"],
    archetypeDefault: "ceo",
  },
  {
    mode: "private",
    label: "Private Mode",
    description:
      "Personal and reflective register with conservative execution defaults and privacy-first behavior.",
    toneOverride: "warm_reflective",
    toolScope: "read_only",
    privacyLevel: "local_preferred",
    channelBindings: ["telegram_private", "desktop_privacy"],
    archetypeDefault: "coach",
  },
] as const;

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeSoulMode(value: unknown): SoulMode | null {
  const normalized = toNonEmptyString(value)?.toLowerCase();
  if (normalized === "work" || normalized === "private") {
    return normalized;
  }
  return null;
}

function normalizeChannel(value: unknown): string | null {
  const normalized = toNonEmptyString(value)?.toLowerCase();
  return normalized ?? null;
}

export function normalizeModeChannelBindings(
  value: unknown,
): ModeChannelBinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const bindings: ModeChannelBinding[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const channel = normalizeChannel(record.channel);
    const mode = normalizeSoulMode(record.mode);
    if (!channel || !mode) {
      continue;
    }
    const key = `${channel}:${mode}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    bindings.push({ channel, mode });
  }

  return bindings;
}

function buildDefaultModeChannelBindings(): ModeChannelBinding[] {
  return DEFAULT_SOUL_MODES.flatMap((modeConfig) =>
    modeConfig.channelBindings.map((channel) => ({
      channel: channel.toLowerCase(),
      mode: modeConfig.mode,
    })),
  );
}

function findSoulModeConfig(mode: SoulMode): SoulModeConfig {
  return (
    DEFAULT_SOUL_MODES.find((config) => config.mode === mode)
    ?? DEFAULT_SOUL_MODES[0]
  );
}

export function resolveSoulModeRuntimeContract(args: {
  activeSoulMode?: unknown;
  modeChannelBindings?: unknown;
  channel?: string;
}): SoulModeRuntimeContract {
  const explicitMode = normalizeSoulMode(args.activeSoulMode);
  if (explicitMode) {
    return {
      mode: explicitMode,
      config: findSoulModeConfig(explicitMode),
      source: "explicit",
    };
  }

  const channel = normalizeChannel(args.channel);
  if (channel) {
    const mergedBindings = [
      ...normalizeModeChannelBindings(args.modeChannelBindings),
      ...buildDefaultModeChannelBindings(),
    ];
    const modeFromChannel = mergedBindings.find(
      (binding) => binding.channel === channel,
    )?.mode;
    if (modeFromChannel) {
      return {
        mode: modeFromChannel,
        config: findSoulModeConfig(modeFromChannel),
        source: "channel_binding",
      };
    }
  }

  return {
    mode: "work",
    config: findSoulModeConfig("work"),
    source: "default",
  };
}

export function resolveModeScopedAutonomyLevel(args: {
  autonomyLevel: AutonomyLevelInput;
  modeToolScope: SoulModeToolScope;
}): AutonomyLevel {
  return resolveModeScopedAutonomyLevelContract({
    autonomyLevel: args.autonomyLevel,
    modeToolScope: args.modeToolScope,
  });
}
