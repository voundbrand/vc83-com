import type { Id } from "../_generated/dataModel";
import type { PublicInboundChannel } from "../webchatCustomizationContract";

export type UniversalOnboardingChannel = "telegram" | PublicInboundChannel;
export type ExistingWorkspaceAction = "preserve" | "rename" | "recreate";
export type LegacyAliasStatus = "active" | "deferred";

export interface UniversalWorkspaceProfile {
  workspaceName: string;
  workspaceContext?: string;
  primaryAudience?: string;
}

export interface LegacyTelegramAliasSurface {
  alias: "telegramChatId";
  scope: "onboarding";
  file: string;
  symbol: string;
  status: LegacyAliasStatus;
  owner: string;
  checkpoint: string;
  notes: string;
}

export const UNIVERSAL_ONBOARDING_POLICY_VERSION = "universal_onboarding_policy.v1";
export const UNIVERSAL_ONBOARDING_TEMPLATE_NAME = "Platform Onboarding";
export const UNIVERSAL_ONBOARDING_CHANNELS = [
  "telegram",
  "webchat",
  "native_guest",
] as const satisfies readonly UniversalOnboardingChannel[];

export const UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES = {
  workspaceName: ["workspaceName", "businessName", "business_name"] as const,
  workspaceContext: ["workspaceContext", "industry"] as const,
  primaryAudience: ["targetAudience", "target_audience"] as const,
} as const;

export const UNIVERSAL_WORKSPACE_CONTEXT_QUESTION_FIELDS = [
  ...UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.workspaceName,
  ...UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.workspaceContext,
  "targetAudience",
  "primaryUseCase",
] as const;

// TODO(onboarding-phase6-telegram-alias): Remove deferred aliases after migration checkpoints below are complete.
export const ONBOARDING_TELEGRAM_ALIAS_DEPRECATION_PLAN = [
  {
    alias: "telegramChatId",
    scope: "onboarding",
    file: "convex/onboarding/completeOnboarding.ts",
    symbol: "run.args.telegramChatId",
    status: "deferred",
    owner: "onboarding-runtime",
    checkpoint: "Phase 6 - remove once all runtime callers send channelContactIdentifier only",
    notes: "Kept for backward compatibility with non-migrated internal callers.",
  },
  {
    alias: "telegramChatId",
    scope: "onboarding",
    file: "convex/onboarding/orgBootstrap.ts",
    symbol: "createMinimalOrg.args.telegramChatId",
    status: "deferred",
    owner: "onboarding-runtime",
    checkpoint: "Phase 6 - remove after metadata/index consumers migrate to channelContactIdentifier",
    notes: "Still used in audit metadata and legacy onboarding tracing.",
  },
] as const satisfies readonly LegacyTelegramAliasSurface[];

const CHANNEL_CONTACT_ID_ALIASES = ["channelContactIdentifier", "telegramChatId"] as const;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function pickFirstOptionalString(
  source: Record<string, unknown>,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const normalized = normalizeOptionalString(source[alias]);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function readExtractedBoolean(
  extractedData: Record<string, unknown>,
  fieldNames: readonly string[]
): boolean {
  for (const fieldName of fieldNames) {
    const value = extractedData[fieldName];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "yes" || normalized === "confirmed") {
        return true;
      }
      if (normalized === "false" || normalized === "no" || normalized === "declined") {
        return false;
      }
    }
  }
  return false;
}

function readExtractedAction(
  extractedData: Record<string, unknown>,
  fieldNames: readonly string[]
): ExistingWorkspaceAction | null {
  for (const fieldName of fieldNames) {
    const rawValue = extractedData[fieldName];
    if (typeof rawValue !== "string") {
      continue;
    }
    const normalized = rawValue.trim().toLowerCase();
    if (
      normalized === "preserve"
      || normalized === "keep"
      || normalized === "keep_existing"
      || normalized === "reuse"
      || normalized === "reuse_existing"
      || normalized === "no_change"
    ) {
      return "preserve";
    }
    if (
      normalized === "rename"
      || normalized === "rename_existing"
      || normalized === "update_name"
    ) {
      return "rename";
    }
    if (
      normalized === "recreate"
      || normalized === "recreate_confirmed"
      || normalized === "new_workspace"
      || normalized === "create_new"
    ) {
      return "recreate";
    }
  }
  return null;
}

export function normalizeUniversalOnboardingChannel(
  channel?: string
): UniversalOnboardingChannel {
  if (channel === "telegram") return "telegram";
  if (channel === "native_guest") return "native_guest";
  return "webchat";
}

export function normalizePublicEntryChannel(
  channel?: PublicInboundChannel
): PublicInboundChannel {
  return channel === "native_guest" ? "native_guest" : "webchat";
}

export function shouldOfferOnboardingWarmup(
  channel: UniversalOnboardingChannel
): boolean {
  void channel;
  return true;
}

export function requiresClaimedAccountForOnboardingCompletion(
  channel: UniversalOnboardingChannel
): boolean {
  return channel === "webchat" || channel === "native_guest";
}

export function resolveCompletionContactIdentifier(args: {
  channelContactIdentifier?: string;
  telegramChatId?: string;
}): string | null {
  for (const alias of CHANNEL_CONTACT_ID_ALIASES) {
    const value = normalizeOptionalString(args[alias]);
    if (value) {
      return value;
    }
  }
  return null;
}

export function resolveWorkspaceProfileFromExtractedData(
  extractedData: Record<string, unknown>
): UniversalWorkspaceProfile {
  const workspaceName =
    pickFirstOptionalString(
      extractedData,
      UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.workspaceName
    ) || "My Workspace";
  const workspaceContext = pickFirstOptionalString(
    extractedData,
    UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.workspaceContext
  );
  const primaryAudience = pickFirstOptionalString(
    extractedData,
    UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.primaryAudience
  );

  return {
    workspaceName,
    workspaceContext,
    primaryAudience,
  };
}

export function withLegacyWorkspaceCompatibilityFields(
  extractedData: Record<string, unknown>
): Record<string, unknown> {
  const workspaceProfile = resolveWorkspaceProfileFromExtractedData(extractedData);
  return {
    ...extractedData,
    workspaceName: workspaceProfile.workspaceName,
    businessName:
      pickFirstOptionalString(
        extractedData,
        UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.workspaceName
      ) || workspaceProfile.workspaceName,
    workspaceContext: workspaceProfile.workspaceContext,
    industry:
      pickFirstOptionalString(
        extractedData,
        UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.workspaceContext
      ) || workspaceProfile.workspaceContext,
    targetAudience:
      pickFirstOptionalString(
        extractedData,
        UNIVERSAL_WORKSPACE_EXTRACTED_FIELD_ALIASES.primaryAudience
      ) || extractedData.targetAudience,
  };
}

export function shouldReuseExistingWorkspaceByDefault(args: {
  extractedData: Record<string, unknown>;
  existingOrganizationId?: Id<"organizations"> | null;
}): boolean {
  if (!args.existingOrganizationId) {
    return false;
  }

  const explicitRecreateConfirmed = readExtractedBoolean(args.extractedData, [
    "confirmRecreateWorkspace",
    "confirmedRecreateWorkspace",
    "recreateWorkspaceConfirmed",
    "confirmedWorkspaceRecreate",
    "workspaceRecreateConfirmed",
  ]);

  return !explicitRecreateConfirmed;
}

export function canRenameExistingWorkspace(args: {
  extractedData: Record<string, unknown>;
}): boolean {
  return readExtractedBoolean(args.extractedData, [
    "confirmRenameWorkspace",
    "confirmedRenameWorkspace",
    "renameWorkspaceConfirmed",
    "confirmedWorkspaceRename",
    "workspaceRenameConfirmed",
  ]);
}

export function resolveExistingWorkspaceAction(args: {
  extractedData: Record<string, unknown>;
  existingOrganizationId?: Id<"organizations"> | null;
}): ExistingWorkspaceAction {
  if (!args.existingOrganizationId) {
    return "recreate";
  }

  const requestedAction = readExtractedAction(args.extractedData, [
    "existingWorkspaceAction",
    "workspaceMutationAction",
    "workspaceExistingOrgAction",
    "workspaceAction",
  ]);

  if (requestedAction === "recreate") {
    return shouldReuseExistingWorkspaceByDefault(args) ? "preserve" : "recreate";
  }

  if (requestedAction === "rename") {
    return canRenameExistingWorkspace({ extractedData: args.extractedData })
      ? "rename"
      : "preserve";
  }

  return "preserve";
}

export const UNIVERSAL_ONBOARDING_PROMPT_POLICY_LINES = [
  "Never force onboarding. Treat onboarding as an optional warmup offer.",
  "If a workspace/org already exists, preserve it by default and ask before renaming.",
  "Only recreate an existing workspace/org after explicit user confirmation.",
] as const;

export const UNIVERSAL_ONBOARDING_LIMITATION_DISCLOSURE_POLICY_LINES = [
  "If tool boundaries block a request, state the limitation clearly and give the closest supported path.",
  "Do not imply unsupported actions are complete when they are not.",
] as const;

export const UNIVERSAL_ONBOARDING_FEATURE_REQUEST_CAPTURE_POLICY_LINES = [
  "Offer to capture a concise feature-request summary when capability gaps are hit.",
] as const;
