import type { LayoutMode } from "@/components/window-content/ai-chat-window/layout-mode-context";

export interface OperatorCollaborationCutoverFlags {
  shellEnabled: boolean;
  rolloutPercent: number;
  forceLegacyShell: boolean;
}

export interface OperatorCollaborationShellResolution {
  flags: OperatorCollaborationCutoverFlags;
  cohortBucket: number;
  collaborationShellEnabled: boolean;
  resolvedLayoutMode: LayoutMode;
  reason:
    | "cutover_enabled"
    | "legacy_forced"
    | "cutover_disabled"
    | "cohort_holdback";
}

const CUTOVER_ENABLED_KEY = "NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ENABLED";
const CUTOVER_ROLLOUT_PERCENT_KEY =
  "NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_ROLLOUT_PERCENT";
const CUTOVER_FORCE_LEGACY_KEY =
  "NEXT_PUBLIC_OPERATOR_COLLABORATION_SHELL_FORCE_LEGACY";

const DEFAULT_FLAGS: OperatorCollaborationCutoverFlags = {
  shellEnabled: true,
  rolloutPercent: 100,
  forceLegacyShell: false,
};

function normalizeBoolean(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

function normalizePercent(
  value: string | undefined,
  fallback: number
): number {
  if (typeof value !== "string") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 100) {
    return 100;
  }
  return parsed;
}

function hashPercent(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function resolveLegacyLayout(
  requestedLayoutMode: LayoutMode | undefined
): LayoutMode {
  if (
    requestedLayoutMode === "single" ||
    requestedLayoutMode === "three-pane" ||
    requestedLayoutMode === "four-pane"
  ) {
    return requestedLayoutMode;
  }
  return "four-pane";
}

export function resolveOperatorCollaborationCutoverFlags(
  env: Record<string, string | undefined> = process.env
): OperatorCollaborationCutoverFlags {
  return {
    shellEnabled: normalizeBoolean(
      env[CUTOVER_ENABLED_KEY],
      DEFAULT_FLAGS.shellEnabled
    ),
    rolloutPercent: normalizePercent(
      env[CUTOVER_ROLLOUT_PERCENT_KEY],
      DEFAULT_FLAGS.rolloutPercent
    ),
    forceLegacyShell: normalizeBoolean(
      env[CUTOVER_FORCE_LEGACY_KEY],
      DEFAULT_FLAGS.forceLegacyShell
    ),
  };
}

export function resolveOperatorCollaborationShellResolution(args: {
  organizationId?: string | null;
  requestedLayoutMode?: LayoutMode;
  env?: Record<string, string | undefined>;
}): OperatorCollaborationShellResolution {
  const flags = resolveOperatorCollaborationCutoverFlags(args.env);
  const rolloutSeed = args.organizationId?.trim() || "anonymous_org";
  const cohortBucket = hashPercent(`operator_collab_shell:${rolloutSeed}`);
  const inRolloutCohort = cohortBucket < flags.rolloutPercent;

  if (flags.forceLegacyShell) {
    return {
      flags,
      cohortBucket,
      collaborationShellEnabled: false,
      resolvedLayoutMode: resolveLegacyLayout(args.requestedLayoutMode),
      reason: "legacy_forced",
    };
  }

  if (!flags.shellEnabled) {
    return {
      flags,
      cohortBucket,
      collaborationShellEnabled: false,
      resolvedLayoutMode: resolveLegacyLayout(args.requestedLayoutMode),
      reason: "cutover_disabled",
    };
  }

  if (!inRolloutCohort) {
    return {
      flags,
      cohortBucket,
      collaborationShellEnabled: false,
      resolvedLayoutMode: resolveLegacyLayout(args.requestedLayoutMode),
      reason: "cohort_holdback",
    };
  }

  return {
    flags,
    cohortBucket,
    collaborationShellEnabled: true,
    resolvedLayoutMode: "slick",
    reason: "cutover_enabled",
  };
}
