import type { Id } from "../_generated/dataModel";

export const MANAGED_USE_CASE_CLONE_LIFECYCLE = "managed_use_case_clone_v1";
export const TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION =
  "ath_template_clone_linkage_v1";

export const TEMPLATE_OVERRIDE_POLICY_MODES = ["locked", "warn", "free"] as const;
export type TemplateOverridePolicyMode =
  (typeof TEMPLATE_OVERRIDE_POLICY_MODES)[number];

export const TEMPLATE_CLONE_LIFECYCLE_STATES = [
  "managed_in_sync",
  "managed_override_pending_sync",
  "managed_stale",
  "legacy_unmanaged",
] as const;
export type TemplateCloneLifecycleState =
  (typeof TEMPLATE_CLONE_LIFECYCLE_STATES)[number];

export type TemplateCloneOverridePolicy = {
  mode: TemplateOverridePolicyMode;
  fields?: Record<string, { mode: TemplateOverridePolicyMode }>;
};

export type TemplateCloneLinkageContract = {
  contractVersion: typeof TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION;
  sourceTemplateId: string;
  sourceTemplateVersion?: string;
  cloneLifecycleState: TemplateCloneLifecycleState;
  overridePolicy: TemplateCloneOverridePolicy;
  lastTemplateSyncAt?: number;
  lastTemplateSyncJobId?: string;
};

const DEFAULT_MANAGED_OVERRIDE_POLICY: TemplateCloneOverridePolicy = {
  mode: "warn",
  fields: {
    modelProvider: { mode: "locked" },
    modelId: { mode: "locked" },
    toolProfile: { mode: "warn" },
    enabledTools: { mode: "warn" },
    disabledTools: { mode: "warn" },
    systemPrompt: { mode: "warn" },
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOverridePolicyMode(value: unknown): TemplateOverridePolicyMode {
  return value === "locked" || value === "free" ? value : "warn";
}

function normalizeOverrideFields(
  value: unknown
): TemplateCloneOverridePolicy["fields"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const normalizedEntries = Object.entries(value as Record<string, unknown>)
    .map(([field, rawPolicy]) => {
      const fieldName = normalizeOptionalString(field);
      if (!fieldName) {
        return null;
      }
      const record = asRecord(rawPolicy);
      return [fieldName, { mode: normalizeOverridePolicyMode(record.mode) }] as const;
    })
    .filter((entry): entry is readonly [string, { mode: TemplateOverridePolicyMode }] => Boolean(entry));
  if (normalizedEntries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(normalizedEntries);
}

export function normalizeTemplateCloneOverridePolicy(
  value: unknown,
  fallback: TemplateCloneOverridePolicy = DEFAULT_MANAGED_OVERRIDE_POLICY
): TemplateCloneOverridePolicy {
  const record = asRecord(value);
  return {
    mode: normalizeOverridePolicyMode(record.mode ?? fallback.mode),
    fields: normalizeOverrideFields(record.fields ?? fallback.fields),
  };
}

export function resolveTemplateSourceId(
  customProperties: Record<string, unknown> | undefined
): string | undefined {
  const linkage = asRecord(customProperties?.templateCloneLinkage);
  return (
    normalizeOptionalString(linkage.sourceTemplateId) ||
    normalizeOptionalString(customProperties?.templateAgentId)
  );
}

function normalizeLifecycleState(
  value: unknown
): TemplateCloneLifecycleState | undefined {
  if (
    value === "managed_in_sync" ||
    value === "managed_override_pending_sync" ||
    value === "managed_stale" ||
    value === "legacy_unmanaged"
  ) {
    return value;
  }
  return undefined;
}

export function resolveCloneLifecycleState(
  customProperties: Record<string, unknown> | undefined
): TemplateCloneLifecycleState {
  const linkage = asRecord(customProperties?.templateCloneLinkage);
  const explicitState = normalizeLifecycleState(linkage.cloneLifecycleState);
  if (explicitState) {
    return explicitState;
  }
  return normalizeOptionalString(customProperties?.cloneLifecycle) ===
    MANAGED_USE_CASE_CLONE_LIFECYCLE
    ? "managed_in_sync"
    : "legacy_unmanaged";
}

export function isManagedUseCaseCloneProperties(
  customProperties: Record<string, unknown> | undefined
): boolean {
  const lifecycleState = resolveCloneLifecycleState(customProperties);
  return (
    lifecycleState === "managed_in_sync" ||
    lifecycleState === "managed_override_pending_sync" ||
    lifecycleState === "managed_stale"
  );
}

export function readTemplateCloneLinkageContract(
  customProperties: Record<string, unknown> | undefined
): TemplateCloneLinkageContract | null {
  const sourceTemplateId = resolveTemplateSourceId(customProperties);
  if (!sourceTemplateId) {
    return null;
  }
  const linkage = asRecord(customProperties?.templateCloneLinkage);
  const sourceTemplateVersion =
    normalizeOptionalString(linkage.sourceTemplateVersion) ||
    normalizeOptionalString(customProperties?.templateVersion);
  const rawLastSyncAt =
    linkage.lastTemplateSyncAt ?? customProperties?.lastTemplateSyncAt;
  const lastTemplateSyncAt =
    typeof rawLastSyncAt === "number" && Number.isFinite(rawLastSyncAt)
      ? rawLastSyncAt
      : undefined;
  const lastTemplateSyncJobId =
    normalizeOptionalString(linkage.lastTemplateSyncJobId) ||
    normalizeOptionalString(customProperties?.lastTemplateJobId);

  return {
    contractVersion: TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION,
    sourceTemplateId,
    sourceTemplateVersion,
    cloneLifecycleState: resolveCloneLifecycleState(customProperties),
    overridePolicy: normalizeTemplateCloneOverridePolicy(
      linkage.overridePolicy ?? customProperties?.overridePolicy
    ),
    lastTemplateSyncAt,
    lastTemplateSyncJobId,
  };
}

export function resolveTemplateSourceVersion(
  templateId: Id<"objects">,
  templateCustomProperties: Record<string, unknown> | undefined,
  templateUpdatedAt: number
): string {
  const explicitVersion =
    normalizeOptionalString(templateCustomProperties?.templateVersion) ||
    normalizeOptionalString(templateCustomProperties?.version);
  if (explicitVersion) {
    return explicitVersion;
  }
  return `${String(templateId)}@${templateUpdatedAt}`;
}

export function buildManagedTemplateCloneLinkage(args: {
  sourceTemplateId: string;
  sourceTemplateVersion: string;
  overridePolicy?: unknown;
  lastTemplateSyncAt: number;
  lastTemplateSyncJobId?: string;
  cloneLifecycleState?: TemplateCloneLifecycleState;
}): TemplateCloneLinkageContract {
  const cloneLifecycleState = args.cloneLifecycleState;
  return {
    contractVersion: TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION,
    sourceTemplateId: args.sourceTemplateId,
    sourceTemplateVersion: args.sourceTemplateVersion,
    cloneLifecycleState:
      cloneLifecycleState && cloneLifecycleState !== "legacy_unmanaged"
        ? cloneLifecycleState
        : "managed_in_sync",
    overridePolicy: normalizeTemplateCloneOverridePolicy(args.overridePolicy),
    lastTemplateSyncAt: args.lastTemplateSyncAt,
    lastTemplateSyncJobId: args.lastTemplateSyncJobId,
  };
}
