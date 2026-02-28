import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { AiBillingSource } from "../channels/types";
import type {
  AiBillingLedgerMode,
  AiCreditRequestSource,
} from "../credits/index";
import {
  resolveAiUsageBillingGuardrail,
  type AiUsageBillingGuardrailDecision,
  type AiUsageCreditChargeStatus,
  type AiUsageNativeCostSource,
  type AiUsageRequestType,
} from "./billing";
import { convertUsdToCredits } from "./modelPricing";

export type NonChatAiUsageRequestType = Exclude<AiUsageRequestType, "chat">;

type NonChatAiUsageMetadata = Record<string, unknown>;

type NonChatAiDeductCreditsArgs = {
  organizationId: Id<"organizations">;
  userId?: Id<"users">;
  amount: number;
  action: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  billingSource: AiBillingSource;
  requestSource: AiCreditRequestSource;
  softFailOnExhausted: true;
};

type NonChatAiDeductCreditsResult = {
  success: boolean;
  skipped?: boolean;
  errorCode?: string;
  message?: string;
  creditsRequired?: number;
  creditsAvailable?: number;
};

type NonChatAiRecordUsageArgs = {
  organizationId: Id<"organizations">;
  userId?: Id<"users">;
  requestType: NonChatAiUsageRequestType;
  provider: string;
  model: string;
  action?: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costInCents: number;
  nativeUsageUnit?: string;
  nativeUsageQuantity?: number;
  nativeInputUnits?: number;
  nativeOutputUnits?: number;
  nativeTotalUnits?: number;
  nativeCostInCents?: number;
  nativeCostCurrency?: string;
  nativeCostSource?: AiUsageNativeCostSource;
  providerRequestId?: string;
  usageMetadata?: NonChatAiUsageMetadata;
  creditsCharged: number;
  creditChargeStatus: AiUsageCreditChargeStatus;
  success: boolean;
  errorMessage?: string;
  requestDurationMs?: number;
  billingSource: AiBillingSource;
  requestSource: AiCreditRequestSource;
  ledgerMode: AiBillingLedgerMode;
  creditLedgerAction?: string;
};

export interface NonChatAiUsageMeteringRunners {
  deductCredits: (
    args: NonChatAiDeductCreditsArgs
  ) => Promise<NonChatAiDeductCreditsResult>;
  recordUsage: (args: NonChatAiRecordUsageArgs) => Promise<unknown>;
}

export type NonChatUsageTelemetry = {
  nativeUsageUnit?: string | null;
  nativeUsageQuantity?: number | null;
  nativeInputUnits?: number | null;
  nativeOutputUnits?: number | null;
  nativeTotalUnits?: number | null;
  nativeCostInCents?: number | null;
  nativeCostCurrency?: string | null;
  nativeCostSource?: AiUsageNativeCostSource | null;
  providerRequestId?: string | null;
  metadata?: NonChatAiUsageMetadata | null;
};

export type MeterNonChatAiUsageArgs = {
  runners: NonChatAiUsageMeteringRunners;
  organizationId: Id<"organizations">;
  userId?: Id<"users">;
  requestType: NonChatAiUsageRequestType;
  provider: string;
  model: string;
  action?: string;
  requestCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costInCents?: number;
  usage?: NonChatUsageTelemetry | null;
  usageMetadata?: NonChatAiUsageMetadata;
  billingSource: AiBillingSource;
  requestSource?: AiCreditRequestSource;
  ledgerMode?: AiBillingLedgerMode;
  creditLedgerAction?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  creditsToCharge?: number;
  success: boolean;
  errorMessage?: string;
  requestDurationMs?: number;
};

export type NonChatAiUsageMeteringResult = {
  billingPolicy: AiUsageBillingGuardrailDecision["billingPolicy"];
  ledgerPolicy: AiUsageBillingGuardrailDecision["ledgerPolicy"];
  creditsToCharge: number;
  creditsCharged: number;
  creditChargeStatus: AiUsageCreditChargeStatus;
  costInCents: number;
  nativeCostInCents: number;
  recordUsageResult: unknown;
};

type GeneratedApiShape = {
  internal: {
    credits: {
      index: {
        deductCreditsInternalMutation: unknown;
      };
    };
  };
  api: {
    ai: {
      billing: {
        recordUsage: unknown;
      };
    };
  };
};

type RunMutation = <TResult>(
  mutationReference: unknown,
  args: Record<string, unknown>
) => Promise<TResult>;

// Dynamic require keeps helper usage ergonomic in action contexts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi = require("../_generated/api") as GeneratedApiShape;

export function createNonChatAiUsageMeteringRunners(args: {
  runMutation: RunMutation;
}): NonChatAiUsageMeteringRunners {
  return {
    deductCredits: (input) =>
      args.runMutation<NonChatAiDeductCreditsResult>(
        generatedApi.internal.credits.index.deductCreditsInternalMutation,
        input as Record<string, unknown>
      ),
    recordUsage: (input) =>
      args.runMutation(
        generatedApi.api.ai.billing.recordUsage,
        input as Record<string, unknown>
      ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

function requireNonEmptyString(value: unknown, field: string): string {
  const normalized = normalizeOptionalString(value);
  if (normalized) {
    return normalized;
  }
  throw new ConvexError({
    code: "INVALID_USAGE_CONTRACT",
    message: `Non-chat usage metering requires a non-empty ${field}.`,
  });
}

function resolveUsageMetadata(args: {
  usageMetadata?: NonChatAiUsageMetadata;
  providerMetadata?: NonChatAiUsageMetadata | null;
}): NonChatAiUsageMetadata | undefined {
  const merged: NonChatAiUsageMetadata = {
    ...(args.usageMetadata ?? {}),
  };
  if (args.providerMetadata && isRecord(args.providerMetadata)) {
    merged.providerUsage = args.providerMetadata;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export async function meterNonChatAiUsage(
  args: MeterNonChatAiUsageArgs
): Promise<NonChatAiUsageMeteringResult> {
  const requestSource = args.requestSource ?? "llm";
  const ledgerMode = args.ledgerMode ?? "credits_ledger";
  const usageGuardrail = resolveAiUsageBillingGuardrail({
    billingSource: args.billingSource,
    requestSource,
    ledgerMode,
  });

  if (usageGuardrail.ledgerPolicy.requestedLedgerMode === "legacy_tokens") {
    throw new ConvexError({
      code: "LEGACY_TOKEN_LEDGER_DISABLED",
      message:
        "Legacy token ledger mutations are disabled. Chargeable AI requests must use the credits ledger.",
    });
  }

  const creditLedgerAction = normalizeOptionalString(args.creditLedgerAction);
  if (usageGuardrail.requiresCreditLedgerAction && !creditLedgerAction) {
    throw new ConvexError({
      code: "CREDIT_LEDGER_ACTION_REQUIRED",
      message:
        "recordUsage requires creditLedgerAction for credit-metered requests to keep accounting deterministic.",
    });
  }

  const resolvedProvider = requireNonEmptyString(args.provider, "provider");
  const resolvedModel = requireNonEmptyString(args.model, "model");
  const resolvedAction = normalizeOptionalString(args.action);

  const requestCount = Math.max(1, normalizeNonNegativeInt(args.requestCount ?? 1));
  const inputTokens = normalizeNonNegativeInt(args.inputTokens);
  const outputTokens = normalizeNonNegativeInt(args.outputTokens);
  const totalTokens = Math.max(
    inputTokens + outputTokens,
    normalizeNonNegativeInt(args.totalTokens)
  );

  const usageNativeCost = normalizeNonNegativeInt(args.usage?.nativeCostInCents);
  const explicitCostInCents = normalizeNonNegativeInt(args.costInCents);
  const resolvedNativeCostInCents = Math.max(usageNativeCost, explicitCostInCents);
  const resolvedCostInCents = Math.max(explicitCostInCents, resolvedNativeCostInCents);

  const creditsToCharge = Math.max(
    0,
    normalizeNonNegativeInt(
      args.creditsToCharge ??
        (resolvedCostInCents > 0
          ? convertUsdToCredits(resolvedCostInCents / 100)
          : 0)
    )
  );

  let creditsCharged = 0;
  let creditChargeStatus: AiUsageCreditChargeStatus =
    usageGuardrail.billingPolicy.enforceCredits
      ? "skipped_unmetered"
      : "skipped_not_required";

  if (
    args.success &&
    usageGuardrail.billingPolicy.enforceCredits &&
    creditsToCharge > 0 &&
    creditLedgerAction
  ) {
    try {
      const deduction = await args.runners.deductCredits({
        organizationId: args.organizationId,
        userId: args.userId,
        amount: creditsToCharge,
        action: creditLedgerAction,
        relatedEntityType: normalizeOptionalString(args.relatedEntityType),
        relatedEntityId: normalizeOptionalString(args.relatedEntityId),
        billingSource: usageGuardrail.billingPolicy.effectiveBillingSource,
        requestSource: usageGuardrail.billingPolicy.requestSource,
        softFailOnExhausted: true,
      });

      if (deduction.success && !deduction.skipped) {
        creditsCharged = creditsToCharge;
        creditChargeStatus = "charged";
      } else if (deduction.success && deduction.skipped) {
        creditChargeStatus = "skipped_not_required";
      } else {
        creditChargeStatus = "skipped_insufficient_credits";
      }
    } catch {
      creditChargeStatus = "failed";
    }
  }

  const nativeUsageQuantity = normalizeNonNegativeNumber(args.usage?.nativeUsageQuantity);
  const nativeInputUnits = normalizeNonNegativeNumber(args.usage?.nativeInputUnits);
  const nativeOutputUnits = normalizeNonNegativeNumber(args.usage?.nativeOutputUnits);
  const nativeTotalUnits = Math.max(
    normalizeNonNegativeNumber(args.usage?.nativeTotalUnits),
    nativeInputUnits + nativeOutputUnits,
    nativeUsageQuantity
  );
  const requestDurationMs = normalizeNonNegativeInt(args.requestDurationMs);

  const nativeCostSource: AiUsageNativeCostSource =
    args.usage?.nativeCostSource ??
    (resolvedNativeCostInCents > 0 ? "estimated_model_pricing" : "not_available");
  const nativeCostCurrency =
    normalizeOptionalString(args.usage?.nativeCostCurrency) ??
    (resolvedNativeCostInCents > 0 ? "USD" : undefined);

  const usageMetadata = resolveUsageMetadata({
    usageMetadata: args.usageMetadata,
    providerMetadata:
      args.usage?.metadata && isRecord(args.usage.metadata)
        ? args.usage.metadata
        : null,
  });

  const recordUsageResult = await args.runners.recordUsage({
    organizationId: args.organizationId,
    userId: args.userId,
    requestType: args.requestType,
    provider: resolvedProvider,
    model: resolvedModel,
    action: resolvedAction,
    requestCount,
    inputTokens,
    outputTokens,
    totalTokens,
    costInCents: resolvedCostInCents,
    nativeUsageUnit: normalizeOptionalString(args.usage?.nativeUsageUnit),
    nativeUsageQuantity: nativeUsageQuantity > 0 ? nativeUsageQuantity : undefined,
    nativeInputUnits: nativeInputUnits > 0 ? nativeInputUnits : undefined,
    nativeOutputUnits: nativeOutputUnits > 0 ? nativeOutputUnits : undefined,
    nativeTotalUnits: nativeTotalUnits > 0 ? nativeTotalUnits : undefined,
    nativeCostInCents:
      resolvedNativeCostInCents > 0 ? resolvedNativeCostInCents : undefined,
    nativeCostCurrency,
    nativeCostSource,
    providerRequestId: normalizeOptionalString(args.usage?.providerRequestId),
    usageMetadata,
    creditsCharged,
    creditChargeStatus,
    success: args.success,
    errorMessage: normalizeOptionalString(args.errorMessage),
    requestDurationMs: requestDurationMs > 0 ? requestDurationMs : undefined,
    billingSource: usageGuardrail.billingPolicy.effectiveBillingSource,
    requestSource: usageGuardrail.billingPolicy.requestSource,
    ledgerMode: usageGuardrail.ledgerPolicy.effectiveLedgerMode,
    creditLedgerAction: creditLedgerAction ?? undefined,
  });

  return {
    billingPolicy: usageGuardrail.billingPolicy,
    ledgerPolicy: usageGuardrail.ledgerPolicy,
    creditsToCharge,
    creditsCharged,
    creditChargeStatus,
    costInCents: resolvedCostInCents,
    nativeCostInCents: resolvedNativeCostInCents,
    recordUsageResult,
  };
}
