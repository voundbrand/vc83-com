export type TwoStageFailoverDelayReason =
  | "none"
  | "retry_backoff"
  | "provider_failover"
  | "auth_profile_rotation";

export type TwoStageFailoverModelSkipReason =
  | "no_auth_profiles"
  | "all_profiles_in_cooldown";

export interface TwoStageFailoverModelPlan<TAuthProfile> {
  authProfiles: TAuthProfile[];
  skipReason?: TwoStageFailoverModelSkipReason;
}

export interface TwoStageFailoverAttemptResult<TResult> {
  result: TResult;
  attempts: number;
}

export interface TwoStageFailoverSuccess<TResult, TAuthProfile> {
  result: TResult;
  usedModelId: string;
  usedAuthProfile: TAuthProfile;
  attempts: number;
  delayReason: TwoStageFailoverDelayReason;
}

export class TwoStageFailoverError extends Error {
  readonly attempts: number;
  readonly delayReason: TwoStageFailoverDelayReason;
  readonly lastErrorMessage: string;

  constructor(args: {
    message: string;
    attempts: number;
    delayReason: TwoStageFailoverDelayReason;
  }) {
    super(args.message);
    this.name = "TwoStageFailoverError";
    this.attempts = args.attempts;
    this.delayReason = args.delayReason;
    this.lastErrorMessage = args.message;
  }
}

export interface ExecuteTwoStageFailoverArgs<TResult, TAuthProfile> {
  modelIds: string[];
  resolveModelPlan: (args: {
    modelId: string;
    cooledProfileKeys: ReadonlySet<string>;
  }) => TwoStageFailoverModelPlan<TAuthProfile>;
  getAuthProfileKey: (authProfile: TAuthProfile) => string;
  executeAttempt: (args: {
    modelId: string;
    authProfile: TAuthProfile;
  }) => Promise<TwoStageFailoverAttemptResult<TResult>>;
  failedAttemptCount?: number;
  carryRotatedProfilesAcrossModels?: boolean;
  shouldRotateAuthProfile?: (args: {
    modelId: string;
    authProfile: TAuthProfile;
    error: unknown;
    errorMessage: string;
  }) => boolean;
  onModelSkipped?: (args: {
    modelId: string;
    reason: TwoStageFailoverModelSkipReason;
  }) => void | Promise<void>;
  onAttemptFailure?: (args: {
    modelId: string;
    authProfile: TAuthProfile;
    error: unknown;
    errorMessage: string;
  }) => void | Promise<void>;
  onAuthProfileRotated?: (args: {
    modelId: string;
    authProfile: TAuthProfile;
    error: unknown;
    errorMessage: string;
  }) => void | Promise<void>;
  onRetryBackoff?: (args: {
    modelId: string;
    authProfile: TAuthProfile;
    attempts: number;
  }) => void | Promise<void>;
}

function normalizeAttemptCount(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

export async function executeTwoStageFailover<TResult, TAuthProfile>(
  args: ExecuteTwoStageFailoverArgs<TResult, TAuthProfile>
): Promise<TwoStageFailoverSuccess<TResult, TAuthProfile>> {
  const failedAttemptCount = normalizeAttemptCount(args.failedAttemptCount, 1);
  const cooledProfileKeys = new Set<string>();
  let totalAttempts = 0;
  let delayReason: TwoStageFailoverDelayReason = "none";
  let lastErrorMessage = "Provider request failed";

  for (const modelId of args.modelIds) {
    const modelScopedCooledProfileKeys =
      args.carryRotatedProfilesAcrossModels === false
        ? new Set<string>()
        : cooledProfileKeys;
    const modelPlan = args.resolveModelPlan({
      modelId,
      cooledProfileKeys: modelScopedCooledProfileKeys,
    });
    const authProfiles = modelPlan.authProfiles;

    if (authProfiles.length === 0) {
      await args.onModelSkipped?.({
        modelId,
        reason: modelPlan.skipReason ?? "no_auth_profiles",
      });
      continue;
    }

    for (const authProfile of authProfiles) {
      try {
        const attemptResult = await args.executeAttempt({
          modelId,
          authProfile,
        });
        const attemptCount = normalizeAttemptCount(attemptResult.attempts, 1);
        totalAttempts += attemptCount;

        if (attemptCount > 1) {
          delayReason = "retry_backoff";
          await args.onRetryBackoff?.({
            modelId,
            authProfile,
            attempts: attemptCount,
          });
        }

        return {
          result: attemptResult.result,
          usedModelId: modelId,
          usedAuthProfile: authProfile,
          attempts: totalAttempts,
          delayReason,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        lastErrorMessage = errorMessage;
        totalAttempts += failedAttemptCount;
        delayReason = "provider_failover";

        await args.onAttemptFailure?.({
          modelId,
          authProfile,
          error,
          errorMessage,
        });

        const shouldRotate =
          args.shouldRotateAuthProfile?.({
            modelId,
            authProfile,
            error,
            errorMessage,
          }) ?? false;
        if (!shouldRotate) {
          continue;
        }

        delayReason = "auth_profile_rotation";
        if (args.carryRotatedProfilesAcrossModels !== false) {
          cooledProfileKeys.add(args.getAuthProfileKey(authProfile));
        }
        await args.onAuthProfileRotated?.({
          modelId,
          authProfile,
          error,
          errorMessage,
        });
      }
    }
  }

  throw new TwoStageFailoverError({
    message: lastErrorMessage,
    attempts: totalAttempts,
    delayReason,
  });
}
