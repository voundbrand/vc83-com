/**
 * AI BILLING MANAGEMENT v3.1
 *
 * Handles Stripe subscription management for AI features.
 * Supports three privacy tiers (all prices include 19% German VAT):
 * - Standard (€49/month) - All models, global routing
 * - Privacy-Enhanced (€49/month) - GDPR-optimized, EU providers, ZDR
 * - Private LLM (€2,999-€14,999/month) - Self-hosted infrastructure
 *
 * Related Files:
 * - convex/schemas/aiBillingSchemas.ts - Database schemas
 * - .kiro/ai_integration_platform/STRIPE_SETUP_CHEAT_SHEET_v3.md - Stripe configuration
 */

import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { AiBillingSource } from "../channels/types";
import { CREDITS_PER_USD } from "./model/modelPricing";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import {
  resolveAiCreditBillingPolicy,
  resolveAiLegacyTokenLedgerPolicy,
  type AiBillingLedgerMode,
  type AiCreditBillingPolicyDecision,
  type AiCreditRequestSource,
  type AiLegacyTokenLedgerPolicyDecision,
} from "../credits/index";

const aiBillingSourceArgValidator = v.union(
  v.literal("platform"),
  v.literal("byok"),
  v.literal("private")
);

const aiCreditRequestSourceArgValidator = v.union(
  v.literal("llm"),
  v.literal("platform_action")
);

const aiBillingLedgerModeArgValidator = v.union(
  v.literal("credits_ledger"),
  v.literal("legacy_tokens")
);

const aiUsageRequestTypeArgValidator = v.union(
  v.literal("chat"),
  v.literal("embedding"),
  v.literal("completion"),
  v.literal("tool_call"),
  v.literal("voice_stt"),
  v.literal("voice_tts"),
  v.literal("voice_session")
);

const aiUsageCreditChargeStatusArgValidator = v.union(
  v.literal("charged"),
  v.literal("skipped_unmetered"),
  v.literal("skipped_insufficient_credits"),
  v.literal("skipped_not_required"),
  v.literal("failed")
);

const aiUsageNativeCostSourceArgValidator = v.union(
  v.literal("provider_reported"),
  v.literal("estimated_model_pricing"),
  v.literal("estimated_unit_pricing"),
  v.literal("not_available")
);

function normalizeCreditLedgerAction(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface AiUsageBillingGuardrailDecision {
  billingPolicy: AiCreditBillingPolicyDecision;
  ledgerPolicy: AiLegacyTokenLedgerPolicyDecision;
  requiresCreditLedgerAction: boolean;
}

export function resolveAiUsageBillingGuardrail(args: {
  billingSource?: AiBillingSource | unknown;
  requestSource?: AiCreditRequestSource | unknown;
  ledgerMode?: AiBillingLedgerMode | unknown;
}): AiUsageBillingGuardrailDecision {
  const billingPolicy = resolveAiCreditBillingPolicy({
    billingSource: args.billingSource,
    requestSource: args.requestSource ?? "llm",
  });
  const ledgerPolicy = resolveAiLegacyTokenLedgerPolicy({
    ledgerMode: args.ledgerMode,
  });
  return {
    billingPolicy,
    ledgerPolicy,
    requiresCreditLedgerAction: billingPolicy.enforceCredits,
  };
}

export type AiUsageRequestType =
  | "chat"
  | "embedding"
  | "completion"
  | "tool_call"
  | "voice_stt"
  | "voice_tts"
  | "voice_session";

export type AiUsageCreditChargeStatus =
  | "charged"
  | "skipped_unmetered"
  | "skipped_insufficient_credits"
  | "skipped_not_required"
  | "failed";

export type AiUsageNativeCostSource =
  | "provider_reported"
  | "estimated_model_pricing"
  | "estimated_unit_pricing"
  | "not_available";

export type AiUsageBillingSource = "platform" | "byok" | "private";

type AiUsageTelemetryRecord = {
  organizationId: string;
  provider: string;
  model: string;
  requestType: AiUsageRequestType | string;
  action?: string | null;
  requestCount?: number | null;
  billingSource?: AiUsageBillingSource | null;
  creditsCharged?: number | null;
  creditChargeStatus?: AiUsageCreditChargeStatus | string | null;
  costInCents?: number | null;
  nativeCostInCents?: number | null;
  nativeCostSource?: AiUsageNativeCostSource | string | null;
  usageMetadata?: unknown;
};

type EconomicsAggregateRow = {
  requests: number;
  platformRequests: number;
  byokRequests: number;
  privateRequests: number;
  nativeCostInCents: number;
  platformNativeCostInCents: number;
  creditsCharged: number;
  platformCreditsCharged: number;
};

type CostQualitySource =
  | "provider_reported"
  | "estimated_model_pricing"
  | "estimated_unit_pricing"
  | "not_available"
  | "unspecified";

type ValidationTransport = "direct_runtime" | "chat_runtime" | "unknown";

type ValidationCreditChargeStatus = AiUsageCreditChargeStatus | "unknown";

type CostQualityAggregateRow = {
  requests: number;
  platformRequests: number;
  nativeCostInCents: number;
  platformNativeCostInCents: number;
};

type EconomicsOutputMetrics = {
  requests: number;
  platformRequests: number;
  byokRequests: number;
  privateRequests: number;
  nativeCostInCents: number;
  platformNativeCostInCents: number;
  creditsCharged: number;
  platformCreditsCharged: number;
  platformCreditRevenueInCents: number;
  platformGrossMarginInCents: number;
  platformGrossMarginPct: number;
};

type PlatformEconomicsOverview = {
  range: {
    startTs: number;
    endTs: number;
    durationHours: number;
  };
  assumptions: {
    creditsPerUsd: number;
    creditValueBasisCents: number;
    marginFormula:
      "gross_margin = credits_charged * (100 / credits_per_usd) - native_cost_cents";
  };
  totals: {
    allUsageRequests: number;
    allUsageNativeCostInCents: number;
    allUsageCreditsCharged: number;
    platformRequests: number;
    byokRequests: number;
    privateRequests: number;
    platformNativeCostInCents: number;
    platformCreditsCharged: number;
    platformCreditRevenueInCents: number;
    platformGrossMarginInCents: number;
    platformGrossMarginPct: number;
  };
  costQuality: {
    providerReportedRequestPct: number;
    estimatedModelPricingRequestPct: number;
    providerReportedPlatformCostPct: number;
    estimatedModelPricingPlatformCostPct: number;
    sourceBreakdown: Array<{
      source:
        | "provider_reported"
        | "estimated_model_pricing"
        | "estimated_unit_pricing"
        | "not_available"
        | "unspecified";
      requests: number;
      platformRequests: number;
      nativeCostInCents: number;
      platformNativeCostInCents: number;
      requestPct: number;
      platformRequestPct: number;
      platformCostPct: number;
    }>;
  };
  organizations: Array<{
    organizationId: string;
    name: string | null;
    isPlatformOrganization: boolean;
    requests: number;
    platformRequests: number;
    byokRequests: number;
    privateRequests: number;
    nativeCostInCents: number;
    platformNativeCostInCents: number;
    creditsCharged: number;
    platformCreditsCharged: number;
    platformCreditRevenueInCents: number;
    platformGrossMarginInCents: number;
    platformGrossMarginPct: number;
  }>;
  providerBreakdown: Array<{
    provider: string;
    requests: number;
    platformRequests: number;
    byokRequests: number;
    privateRequests: number;
    nativeCostInCents: number;
    platformNativeCostInCents: number;
    creditsCharged: number;
    platformCreditsCharged: number;
    platformCreditRevenueInCents: number;
    platformGrossMarginInCents: number;
    platformGrossMarginPct: number;
  }>;
  modelBreakdown: Array<{
    provider: string;
    model: string;
    requests: number;
    platformRequests: number;
    byokRequests: number;
    privateRequests: number;
    nativeCostInCents: number;
    platformNativeCostInCents: number;
    creditsCharged: number;
    platformCreditsCharged: number;
    platformCreditRevenueInCents: number;
    platformGrossMarginInCents: number;
    platformGrossMarginPct: number;
  }>;
  actionBreakdown: Array<{
    action: string;
    requests: number;
    platformRequests: number;
    byokRequests: number;
    privateRequests: number;
    nativeCostInCents: number;
    platformNativeCostInCents: number;
    creditsCharged: number;
    platformCreditsCharged: number;
    platformCreditRevenueInCents: number;
    platformGrossMarginInCents: number;
    platformGrossMarginPct: number;
  }>;
  validationTelemetry: {
    totals: {
      requests: number;
      platformRequests: number;
      nativeCostInCents: number;
      platformNativeCostInCents: number;
      creditsCharged: number;
      platformCreditsCharged: number;
    };
    byTransport: Array<{
      transport: ValidationTransport;
      requests: number;
      platformRequests: number;
      nativeCostInCents: number;
      platformNativeCostInCents: number;
      creditsCharged: number;
      platformCreditsCharged: number;
    }>;
    byCreditChargeStatus: Array<{
      status: ValidationCreditChargeStatus;
      requests: number;
      platformRequests: number;
      nativeCostInCents: number;
      platformNativeCostInCents: number;
      creditsCharged: number;
      platformCreditsCharged: number;
    }>;
  };
  platformOrganization: {
    organizationId: string;
    name: string | null;
    requests: number;
    platformRequests: number;
    byokRequests: number;
    privateRequests: number;
    nativeCostInCents: number;
    platformNativeCostInCents: number;
    creditsCharged: number;
    platformCreditsCharged: number;
    platformCreditRevenueInCents: number;
    platformGrossMarginInCents: number;
    platformGrossMarginPct: number;
  } | null;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function normalizeAiUsageBillingSource(value: unknown): AiUsageBillingSource {
  if (value === "platform" || value === "byok" || value === "private") {
    return value;
  }
  return "platform";
}

function normalizeAiUsageNativeCostSource(value: unknown): CostQualitySource {
  if (
    value === "provider_reported"
    || value === "estimated_model_pricing"
    || value === "estimated_unit_pricing"
    || value === "not_available"
  ) {
    return value;
  }
  return "unspecified";
}

function normalizeAiUsageCreditChargeStatus(
  value: unknown
): ValidationCreditChargeStatus {
  if (
    value === "charged"
    || value === "skipped_unmetered"
    || value === "skipped_insufficient_credits"
    || value === "skipped_not_required"
    || value === "failed"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeValidationTransport(value: unknown): ValidationTransport {
  if (value === "direct_runtime" || value === "chat_runtime") {
    return value;
  }
  return "unknown";
}

function readUsageMetadataField(
  usageMetadata: unknown,
  field: string
): unknown {
  if (!usageMetadata || typeof usageMetadata !== "object") {
    return undefined;
  }
  return (usageMetadata as Record<string, unknown>)[field];
}

function isValidationTelemetryRecord(args: {
  action: string;
  usageMetadata: unknown;
}): boolean {
  if (args.action === "model_validation_probe") {
    return true;
  }
  const source = normalizeOptionalString(
    readUsageMetadataField(args.usageMetadata, "source")
  );
  return source === "platform_model_validation";
}

function resolvePct(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function resolveDefaultBillingPeriod(now: number): {
  periodStart: number;
  periodEnd: number;
} {
  const date = new Date(now);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) - 1;
  return {
    periodStart: start,
    periodEnd: end,
  };
}

function creditsToRevenueInCents(credits: number): number {
  if (!Number.isFinite(credits) || credits <= 0) {
    return 0;
  }
  return Math.round((credits * 100) / CREDITS_PER_USD);
}

function resolveMarginPct(revenueInCents: number, costInCents: number): number {
  if (revenueInCents <= 0) {
    return 0;
  }
  return Number((((revenueInCents - costInCents) / revenueInCents) * 100).toFixed(2));
}

function createEconomicsAggregateRow(): EconomicsAggregateRow {
  return {
    requests: 0,
    platformRequests: 0,
    byokRequests: 0,
    privateRequests: 0,
    nativeCostInCents: 0,
    platformNativeCostInCents: 0,
    creditsCharged: 0,
    platformCreditsCharged: 0,
  };
}

function createCostQualityAggregateRow(): CostQualityAggregateRow {
  return {
    requests: 0,
    platformRequests: 0,
    nativeCostInCents: 0,
    platformNativeCostInCents: 0,
  };
}

function accumulateEconomicsRow(args: {
  row: EconomicsAggregateRow;
  billingSource: AiUsageBillingSource;
  requests: number;
  nativeCostInCents: number;
  creditsCharged: number;
}) {
  args.row.requests += args.requests;
  args.row.nativeCostInCents += args.nativeCostInCents;
  args.row.creditsCharged += args.creditsCharged;

  if (args.billingSource === "platform") {
    args.row.platformRequests += args.requests;
    args.row.platformNativeCostInCents += args.nativeCostInCents;
    args.row.platformCreditsCharged += args.creditsCharged;
    return;
  }

  if (args.billingSource === "byok") {
    args.row.byokRequests += args.requests;
    return;
  }

  args.row.privateRequests += args.requests;
}

function accumulateCostQualityRow(args: {
  row: CostQualityAggregateRow;
  billingSource: AiUsageBillingSource;
  requests: number;
  nativeCostInCents: number;
}) {
  args.row.requests += args.requests;
  args.row.nativeCostInCents += args.nativeCostInCents;
  if (args.billingSource === "platform") {
    args.row.platformRequests += args.requests;
    args.row.platformNativeCostInCents += args.nativeCostInCents;
  }
}

function toEconomicsOutput<TExtra extends Record<string, unknown>>(args: {
  row: EconomicsAggregateRow;
  extra: TExtra;
}): TExtra & EconomicsOutputMetrics {
  const platformCreditRevenueInCents = creditsToRevenueInCents(
    args.row.platformCreditsCharged
  );
  const platformGrossMarginInCents =
    platformCreditRevenueInCents - args.row.platformNativeCostInCents;

  return {
    ...args.extra,
    requests: args.row.requests,
    platformRequests: args.row.platformRequests,
    byokRequests: args.row.byokRequests,
    privateRequests: args.row.privateRequests,
    nativeCostInCents: args.row.nativeCostInCents,
    platformNativeCostInCents: args.row.platformNativeCostInCents,
    creditsCharged: args.row.creditsCharged,
    platformCreditsCharged: args.row.platformCreditsCharged,
    platformCreditRevenueInCents,
    platformGrossMarginInCents,
    platformGrossMarginPct: resolveMarginPct(
      platformCreditRevenueInCents,
      args.row.platformNativeCostInCents
    ),
  };
}

export function aggregatePlatformEconomics(args: {
  records: AiUsageTelemetryRecord[];
  startTs: number;
  endTs: number;
  organizationNamesById?: Record<string, string | null>;
  platformOrganizationId?: string | null;
}): PlatformEconomicsOverview {
  const totals = createEconomicsAggregateRow();
  const orgRows = new Map<string, EconomicsAggregateRow>();
  const providerRows = new Map<string, EconomicsAggregateRow>();
  const modelRows = new Map<string, EconomicsAggregateRow>();
  const actionRows = new Map<string, EconomicsAggregateRow>();
  const costQualityRows = new Map<CostQualitySource, CostQualityAggregateRow>();
  const validationTotals = createEconomicsAggregateRow();
  const validationTransportRows = new Map<ValidationTransport, EconomicsAggregateRow>();
  const validationCreditChargeStatusRows = new Map<
    ValidationCreditChargeStatus,
    EconomicsAggregateRow
  >();

  for (const record of args.records) {
    const organizationId = normalizeOptionalString(record.organizationId);
    if (!organizationId) {
      continue;
    }
    const provider = normalizeOptionalString(record.provider) ?? "unknown_provider";
    const model = normalizeOptionalString(record.model) ?? "unknown_model";
    const action =
      normalizeOptionalString(record.action) ??
      normalizeOptionalString(record.requestType) ??
      "unknown_action";

    const billingSource = normalizeAiUsageBillingSource(record.billingSource);
    const nativeCostSource = normalizeAiUsageNativeCostSource(record.nativeCostSource);
    const creditChargeStatus = normalizeAiUsageCreditChargeStatus(
      record.creditChargeStatus
    );
    const requests = Math.max(1, normalizeNonNegativeInt(record.requestCount));
    const nativeCostInCents = normalizeNonNegativeInt(
      record.nativeCostInCents ?? record.costInCents
    );
    const creditsCharged = normalizeNonNegativeInt(record.creditsCharged);

    accumulateEconomicsRow({
      row: totals,
      billingSource,
      requests,
      nativeCostInCents,
      creditsCharged,
    });

    const orgRow = orgRows.get(organizationId) ?? createEconomicsAggregateRow();
    accumulateEconomicsRow({
      row: orgRow,
      billingSource,
      requests,
      nativeCostInCents,
      creditsCharged,
    });
    orgRows.set(organizationId, orgRow);

    const providerRow = providerRows.get(provider) ?? createEconomicsAggregateRow();
    accumulateEconomicsRow({
      row: providerRow,
      billingSource,
      requests,
      nativeCostInCents,
      creditsCharged,
    });
    providerRows.set(provider, providerRow);

    const modelKey = `${provider}::${model}`;
    const modelRow = modelRows.get(modelKey) ?? createEconomicsAggregateRow();
    accumulateEconomicsRow({
      row: modelRow,
      billingSource,
      requests,
      nativeCostInCents,
      creditsCharged,
    });
    modelRows.set(modelKey, modelRow);

    const actionRow = actionRows.get(action) ?? createEconomicsAggregateRow();
    accumulateEconomicsRow({
      row: actionRow,
      billingSource,
      requests,
      nativeCostInCents,
      creditsCharged,
    });
    actionRows.set(action, actionRow);

    const costQualityRow =
      costQualityRows.get(nativeCostSource) ?? createCostQualityAggregateRow();
    accumulateCostQualityRow({
      row: costQualityRow,
      billingSource,
      requests,
      nativeCostInCents,
    });
    costQualityRows.set(nativeCostSource, costQualityRow);

    if (isValidationTelemetryRecord({ action, usageMetadata: record.usageMetadata })) {
      accumulateEconomicsRow({
        row: validationTotals,
        billingSource,
        requests,
        nativeCostInCents,
        creditsCharged,
      });

      const validationTransport = normalizeValidationTransport(
        readUsageMetadataField(record.usageMetadata, "transport")
      );
      const validationTransportRow =
        validationTransportRows.get(validationTransport) ??
        createEconomicsAggregateRow();
      accumulateEconomicsRow({
        row: validationTransportRow,
        billingSource,
        requests,
        nativeCostInCents,
        creditsCharged,
      });
      validationTransportRows.set(validationTransport, validationTransportRow);

      const validationCreditChargeStatusRow =
        validationCreditChargeStatusRows.get(creditChargeStatus) ??
        createEconomicsAggregateRow();
      accumulateEconomicsRow({
        row: validationCreditChargeStatusRow,
        billingSource,
        requests,
        nativeCostInCents,
        creditsCharged,
      });
      validationCreditChargeStatusRows.set(
        creditChargeStatus,
        validationCreditChargeStatusRow
      );
    }
  }

  const organizations = Array.from(orgRows.entries())
    .map(([organizationId, row]) =>
      toEconomicsOutput({
        row,
        extra: {
          organizationId,
          name: args.organizationNamesById?.[organizationId] ?? null,
          isPlatformOrganization:
            Boolean(args.platformOrganizationId) &&
            organizationId === args.platformOrganizationId,
        },
      })
    )
    .sort(
      (left, right) =>
        right.platformNativeCostInCents - left.platformNativeCostInCents
        || right.platformCreditsCharged - left.platformCreditsCharged
        || right.requests - left.requests
    );

  const providerBreakdown = Array.from(providerRows.entries())
    .map(([provider, row]) =>
      toEconomicsOutput({
        row,
        extra: { provider },
      })
    )
    .sort(
      (left, right) =>
        right.platformNativeCostInCents - left.platformNativeCostInCents
        || right.platformCreditsCharged - left.platformCreditsCharged
        || right.requests - left.requests
    );

  const modelBreakdown = Array.from(modelRows.entries())
    .map(([key, row]) => {
      const [provider, model] = key.split("::", 2);
      return toEconomicsOutput({
        row,
        extra: {
          provider,
          model,
        },
      });
    })
    .sort(
      (left, right) =>
        right.platformNativeCostInCents - left.platformNativeCostInCents
        || right.platformCreditsCharged - left.platformCreditsCharged
        || right.requests - left.requests
    );

  const actionBreakdown = Array.from(actionRows.entries())
    .map(([action, row]) =>
      toEconomicsOutput({
        row,
        extra: { action },
      })
    )
    .sort(
      (left, right) =>
        right.platformNativeCostInCents - left.platformNativeCostInCents
        || right.platformCreditsCharged - left.platformCreditsCharged
        || right.requests - left.requests
    );

  const validationTransportOrder: ValidationTransport[] = [
    "direct_runtime",
    "chat_runtime",
    "unknown",
  ];
  const validationTelemetryByTransport = validationTransportOrder.map(
    (transport) => {
      const row =
        validationTransportRows.get(transport) ?? createEconomicsAggregateRow();
      return {
        transport,
        requests: row.requests,
        platformRequests: row.platformRequests,
        nativeCostInCents: row.nativeCostInCents,
        platformNativeCostInCents: row.platformNativeCostInCents,
        creditsCharged: row.creditsCharged,
        platformCreditsCharged: row.platformCreditsCharged,
      };
    }
  );

  const validationCreditChargeStatusOrder: ValidationCreditChargeStatus[] = [
    "charged",
    "skipped_not_required",
    "skipped_unmetered",
    "skipped_insufficient_credits",
    "failed",
    "unknown",
  ];
  const validationTelemetryByCreditChargeStatus =
    validationCreditChargeStatusOrder.map((status) => {
      const row =
        validationCreditChargeStatusRows.get(status) ??
        createEconomicsAggregateRow();
      return {
        status,
        requests: row.requests,
        platformRequests: row.platformRequests,
        nativeCostInCents: row.nativeCostInCents,
        platformNativeCostInCents: row.platformNativeCostInCents,
        creditsCharged: row.creditsCharged,
        platformCreditsCharged: row.platformCreditsCharged,
      };
    });

  const platformCreditRevenueInCents = creditsToRevenueInCents(
    totals.platformCreditsCharged
  );
  const platformGrossMarginInCents =
    platformCreditRevenueInCents - totals.platformNativeCostInCents;

  const sourceOrder: CostQualitySource[] = [
    "provider_reported",
    "estimated_model_pricing",
    "estimated_unit_pricing",
    "not_available",
    "unspecified",
  ];
  const costQualityBySource = sourceOrder.map((source) => {
    const row = costQualityRows.get(source) ?? createCostQualityAggregateRow();
    return {
      source,
      requests: row.requests,
      platformRequests: row.platformRequests,
      nativeCostInCents: row.nativeCostInCents,
      platformNativeCostInCents: row.platformNativeCostInCents,
      requestPct: resolvePct(row.requests, totals.requests),
      platformRequestPct: resolvePct(row.platformRequests, totals.platformRequests),
      platformCostPct: resolvePct(
        row.platformNativeCostInCents,
        totals.platformNativeCostInCents
      ),
    };
  });
  const providerReportedCostQuality = costQualityBySource.find(
    (row) => row.source === "provider_reported"
  );
  const estimatedModelPricingCostQuality = costQualityBySource.find(
    (row) => row.source === "estimated_model_pricing"
  );

  const platformOrganization =
    args.platformOrganizationId
      ? organizations.find(
          (organization) => organization.organizationId === args.platformOrganizationId
        ) ??
        toEconomicsOutput({
          row: createEconomicsAggregateRow(),
          extra: {
            organizationId: args.platformOrganizationId,
            name: args.organizationNamesById?.[args.platformOrganizationId] ?? null,
            isPlatformOrganization: true,
          },
        })
      : null;

  return {
    range: {
      startTs: args.startTs,
      endTs: args.endTs,
      durationHours: Number(
        (((args.endTs - args.startTs) / (1000 * 60 * 60)).toFixed(2))
      ),
    },
    assumptions: {
      creditsPerUsd: CREDITS_PER_USD,
      creditValueBasisCents: Math.round(100 / CREDITS_PER_USD),
      marginFormula:
        "gross_margin = credits_charged * (100 / credits_per_usd) - native_cost_cents",
    },
    totals: {
      allUsageRequests: totals.requests,
      allUsageNativeCostInCents: totals.nativeCostInCents,
      allUsageCreditsCharged: totals.creditsCharged,
      platformRequests: totals.platformRequests,
      byokRequests: totals.byokRequests,
      privateRequests: totals.privateRequests,
      platformNativeCostInCents: totals.platformNativeCostInCents,
      platformCreditsCharged: totals.platformCreditsCharged,
      platformCreditRevenueInCents,
      platformGrossMarginInCents,
      platformGrossMarginPct: resolveMarginPct(
        platformCreditRevenueInCents,
        totals.platformNativeCostInCents
      ),
    },
    costQuality: {
      providerReportedRequestPct: providerReportedCostQuality?.requestPct ?? 0,
      estimatedModelPricingRequestPct:
        estimatedModelPricingCostQuality?.requestPct ?? 0,
      providerReportedPlatformCostPct:
        providerReportedCostQuality?.platformCostPct ?? 0,
      estimatedModelPricingPlatformCostPct:
        estimatedModelPricingCostQuality?.platformCostPct ?? 0,
      sourceBreakdown: costQualityBySource,
    },
    organizations,
    providerBreakdown,
    modelBreakdown,
    actionBreakdown,
    validationTelemetry: {
      totals: {
        requests: validationTotals.requests,
        platformRequests: validationTotals.platformRequests,
        nativeCostInCents: validationTotals.nativeCostInCents,
        platformNativeCostInCents: validationTotals.platformNativeCostInCents,
        creditsCharged: validationTotals.creditsCharged,
        platformCreditsCharged: validationTotals.platformCreditsCharged,
      },
      byTransport: validationTelemetryByTransport,
      byCreditChargeStatus: validationTelemetryByCreditChargeStatus,
    },
    platformOrganization,
  };
}

async function requireSuperAdminSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: string
): Promise<{ userId: Id<"users"> }> {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(ctx, userId);
  if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can access platform economics analytics.",
    });
  }
  return { userId };
}

function resolvePlatformOrganizationIdFromEnv(): Id<"organizations"> | null {
  const platformOrgId = normalizeOptionalString(process.env.PLATFORM_ORG_ID);
  const fallbackOrgId = normalizeOptionalString(process.env.TEST_ORG_ID);
  const candidate = platformOrgId ?? fallbackOrgId;
  return candidate ? (candidate as Id<"organizations">) : null;
}

async function resolvePlatformOrganization(
  ctx: QueryCtx | MutationCtx
): Promise<{ _id: Id<"organizations">; name: string } | null> {
  const envOrgId = resolvePlatformOrganizationIdFromEnv();
  if (envOrgId) {
    const envOrg = await ctx.db.get(envOrgId);
    if (envOrg) {
      return {
        _id: envOrg._id,
        name: envOrg.name,
      };
    }
  }

  const systemOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", "system"))
    .first();

  if (!systemOrg) {
    return null;
  }

  return {
    _id: systemOrg._id,
    name: systemOrg.name,
  };
}

const DEFAULT_ECONOMICS_RANGE_HOURS = 24 * 7;
const MAX_ECONOMICS_RANGE_HOURS = 24 * 180;

function resolveEconomicsTimeRange(args: {
  now: number;
  startTs?: number;
  endTs?: number;
  rangeHours?: number;
}): { startTs: number; endTs: number } {
  const normalizedEndTs =
    typeof args.endTs === "number" && Number.isFinite(args.endTs)
      ? Math.floor(args.endTs)
      : args.now;
  const normalizedRangeHours =
    typeof args.rangeHours === "number" && Number.isFinite(args.rangeHours)
      ? Math.min(
          MAX_ECONOMICS_RANGE_HOURS,
          Math.max(1, Math.floor(args.rangeHours))
        )
      : DEFAULT_ECONOMICS_RANGE_HOURS;
  const fallbackStartTs = normalizedEndTs - normalizedRangeHours * 60 * 60 * 1000;
  const normalizedStartTs =
    typeof args.startTs === "number" && Number.isFinite(args.startTs)
      ? Math.floor(args.startTs)
      : fallbackStartTs;

  if (normalizedStartTs >= normalizedEndTs) {
    return {
      startTs: normalizedEndTs - normalizedRangeHours * 60 * 60 * 1000,
      endTs: normalizedEndTs,
    };
  }

  return {
    startTs: normalizedStartTs,
    endTs: normalizedEndTs,
  };
}

/**
 * GET SUBSCRIPTION STATUS
 *
 * Returns the current AI subscription status for an organization.
 * Used to display subscription banners and enable/disable AI features.
 */
export const getSubscriptionStatus = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      return {
        hasSubscription: false,
        status: null,
        tier: null,
        legacyTokenAccountingMode: "deprecated_disabled",
        currentPeriodEnd: null,
        includedTokensTotal: 0,
        includedTokensUsed: 0,
        includedTokensRemaining: 0,
      };
    }

    // Calculate remaining tokens
    const includedTokensRemaining = Math.max(
      0,
      subscription.includedTokensTotal - subscription.includedTokensUsed
    );

    return {
      hasSubscription: true,
      status: subscription.status,
      tier: subscription.tier,
      privateLLMTier: subscription.privateLLMTier,
      legacyTokenAccountingMode:
        subscription.legacyTokenAccountingMode ?? "deprecated_disabled",
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      includedTokensTotal: subscription.includedTokensTotal,
      includedTokensUsed: subscription.includedTokensUsed,
      includedTokensRemaining,
      priceInCents: subscription.priceInCents,
      currency: subscription.currency,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  },
});

/**
 * GET TOKEN BALANCE
 *
 * Returns purchased token balance (separate from monthly included tokens).
 */
export const getTokenBalance = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("aiTokenBalance")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!balance) {
      return {
        purchasedTokens: 0,
        gracePeriodStart: null,
        gracePeriodEnd: null,
        usageDebitMode: "manual_only",
      };
    }

    return {
      purchasedTokens: balance.purchasedTokens,
      gracePeriodStart: balance.gracePeriodStart || null,
      gracePeriodEnd: balance.gracePeriodEnd || null,
      usageDebitMode: "manual_only",
    };
  },
});

/**
 * GET USAGE SUMMARY
 *
 * Returns token usage summary for current billing period.
 */
export const getUsageSummary = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get current subscription to determine billing period
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      return {
        periodStart: null,
        periodEnd: null,
        totalTokens: 0,
        totalRequests: 0,
        costInCents: 0,
        byModel: {},
        byRequestType: {},
      };
    }

    // Query usage records for current period
    const usageRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_period", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("periodStart", subscription.currentPeriodStart)
          .eq("periodEnd", subscription.currentPeriodEnd)
      )
      .collect();

    // Aggregate usage
    let totalTokens = 0;
    let totalRequests = 0;
    let costInCents = 0;
    const byModel: Record<string, { tokens: number; requests: number; cost: number }> = {};
    const byRequestType: Record<string, { tokens: number; requests: number; cost: number }> = {};

    for (const record of usageRecords) {
      totalTokens += record.totalTokens;
      totalRequests += record.requestCount;
      costInCents += record.costInCents;

      // Group by model
      if (!byModel[record.model]) {
        byModel[record.model] = { tokens: 0, requests: 0, cost: 0 };
      }
      byModel[record.model].tokens += record.totalTokens;
      byModel[record.model].requests += record.requestCount;
      byModel[record.model].cost += record.costInCents;

      // Group by request type
      if (!byRequestType[record.requestType]) {
        byRequestType[record.requestType] = { tokens: 0, requests: 0, cost: 0 };
      }
      byRequestType[record.requestType].tokens += record.totalTokens;
      byRequestType[record.requestType].requests += record.requestCount;
      byRequestType[record.requestType].cost += record.costInCents;
    }

    return {
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      totalTokens,
      totalRequests,
      costInCents,
      byModel,
      byRequestType,
    };
  },
});

/**
 * GET PLATFORM ECONOMICS SUMMARY
 *
 * Super-admin rollup for platform-funded AI usage economics.
 */
export const getPlatformEconomicsSummary = query({
  args: {
    sessionId: v.string(),
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
    rangeHours: v.optional(v.number()),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    void args.refreshNonce;

    const now = Date.now();
    const { startTs, endTs } = resolveEconomicsTimeRange({
      now,
      startTs: args.startTs,
      endTs: args.endTs,
      rangeHours: args.rangeHours,
    });
    const usageRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_created_at_global", (q) =>
        q.gte("createdAt", startTs).lte("createdAt", endTs)
      )
      .collect();

    const platformOrganization = await resolvePlatformOrganization(ctx);
    const uniqueOrganizationIds = new Set<string>();
    for (const record of usageRecords) {
      uniqueOrganizationIds.add(String(record.organizationId));
    }
    if (platformOrganization?._id) {
      uniqueOrganizationIds.add(String(platformOrganization._id));
    }

    const organizationNamesById: Record<string, string | null> = {};
    await Promise.all(
      Array.from(uniqueOrganizationIds).map(async (organizationId) => {
        const organization = await ctx.db.get(
          organizationId as Id<"organizations">
        );
        organizationNamesById[organizationId] = organization?.name ?? null;
      })
    );

    const summary = aggregatePlatformEconomics({
      records: usageRecords.map((record) => ({
        organizationId: String(record.organizationId),
        provider: record.provider,
        model: record.model,
        requestType: record.requestType,
        action: record.action ?? null,
        requestCount: record.requestCount,
        billingSource: record.billingSource ?? null,
        creditsCharged: record.creditsCharged ?? null,
        creditChargeStatus: record.creditChargeStatus ?? null,
        costInCents: record.costInCents ?? null,
        nativeCostInCents: record.nativeCostInCents ?? null,
        nativeCostSource: record.nativeCostSource ?? null,
        usageMetadata: record.usageMetadata ?? null,
      })),
      startTs,
      endTs,
      organizationNamesById,
      platformOrganizationId: platformOrganization?._id ?? null,
    });

    return {
      ...summary,
      generatedAt: now,
      recordCount: usageRecords.length,
    };
  },
});

/**
 * UPSERT SUBSCRIPTION FROM STRIPE
 *
 * Creates or updates subscription record from Stripe webhook data.
 * Called by webhook handler when subscription is created/updated.
 */
export const upsertSubscriptionFromStripe = mutation({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    tier: v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm")
    ),
    privateLLMTier: v.optional(
      v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise"))
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    priceInCents: v.number(),
    currency: v.string(),
    includedTokensTotal: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existingSubscription) {
      // Update existing subscription
      await ctx.db.patch(existingSubscription._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        legacyTokenAccountingMode: "deprecated_disabled",
        updatedAt: Date.now(),
      });
      return existingSubscription._id;
    } else {
      // Create new subscription
      return await ctx.db.insert("aiSubscriptions", {
        organizationId: args.organizationId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        includedTokensUsed: 0,
        legacyTokenAccountingMode: "deprecated_disabled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * UPDATE SUBSCRIPTION STATUS
 *
 * Updates just the status of an existing subscription.
 * Used by webhook handlers for status-only updates.
 */
export const updateSubscriptionStatus = mutation({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * RESET MONTHLY TOKEN USAGE
 *
 * Resets the monthly included token usage at the start of a new billing period.
 * Called by webhook handler when invoice.paid event with subscription_cycle reason.
 */
export const resetMonthlyTokenUsage = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    void ctx;
    void args.organizationId;
    return {
      success: true,
      skipped: true,
      message:
        "Legacy token reset skipped: credits ledger is authoritative for AI runtime charging.",
    };
  },
});

/**
 * CANCEL SUBSCRIPTION
 *
 * Cancels the AI subscription at the end of the current billing period.
 */
export const cancelSubscription = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // TODO: Call Stripe API to cancel subscription at period end
    // For now, just update the database

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: true,
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Subscription will be canceled at the end of the current billing period",
    };
  },
});

/**
 * REACTIVATE SUBSCRIPTION
 *
 * Reactivates a subscription that was set to cancel at period end.
 */
export const reactivateSubscription = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new Error("Subscription is not scheduled for cancellation");
    }

    // TODO: Call Stripe API to reactivate subscription

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Subscription reactivated successfully",
    };
  },
});

/**
 * RECORD AI USAGE
 *
 * Internal function to record AI API usage for billing and monitoring.
 * Called after each AI request (chat, embedding, completion).
 */
export const recordUsage = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    requestType: aiUsageRequestTypeArgValidator,
    provider: v.string(),
    model: v.string(),
    action: v.optional(v.string()),
    requestCount: v.optional(v.number()),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.optional(v.number()),
    costInCents: v.number(),
    nativeUsageUnit: v.optional(v.string()),
    nativeUsageQuantity: v.optional(v.number()),
    nativeInputUnits: v.optional(v.number()),
    nativeOutputUnits: v.optional(v.number()),
    nativeTotalUnits: v.optional(v.number()),
    nativeCostInCents: v.optional(v.number()),
    nativeCostCurrency: v.optional(v.string()),
    nativeCostSource: v.optional(aiUsageNativeCostSourceArgValidator),
    providerRequestId: v.optional(v.string()),
    usageMetadata: v.optional(v.any()),
    creditsCharged: v.optional(v.number()),
    creditChargeStatus: v.optional(aiUsageCreditChargeStatusArgValidator),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    requestDurationMs: v.optional(v.number()),
    billingSource: v.optional(aiBillingSourceArgValidator),
    requestSource: v.optional(aiCreditRequestSourceArgValidator),
    ledgerMode: v.optional(aiBillingLedgerModeArgValidator),
    creditLedgerAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const usageGuardrail = resolveAiUsageBillingGuardrail({
      billingSource: args.billingSource,
      requestSource: args.requestSource,
      ledgerMode: args.ledgerMode,
    });

    if (usageGuardrail.ledgerPolicy.requestedLedgerMode === "legacy_tokens") {
      throw new ConvexError({
        code: "LEGACY_TOKEN_LEDGER_DISABLED",
        message:
          "Legacy token ledger mutations are disabled. Chargeable AI requests must use the credits ledger.",
      });
    }

    const now = Date.now();

    const creditLedgerAction = normalizeCreditLedgerAction(args.creditLedgerAction);
    if (usageGuardrail.requiresCreditLedgerAction && !creditLedgerAction) {
      throw new ConvexError({
        code: "CREDIT_LEDGER_ACTION_REQUIRED",
        message:
          "recordUsage requires creditLedgerAction for credit-metered requests to keep accounting deterministic.",
      });
    }

    // Get current subscription for billing period and tier
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();
    const billingPeriodFallback = resolveDefaultBillingPeriod(now);
    const periodStart =
      subscription?.currentPeriodStart ?? billingPeriodFallback.periodStart;
    const periodEnd = subscription?.currentPeriodEnd ?? billingPeriodFallback.periodEnd;
    const tier = subscription?.tier ?? "standard";

    const requestCount = Math.max(1, normalizeNonNegativeInt(args.requestCount ?? 1));
    const inputTokens = normalizeNonNegativeInt(args.inputTokens);
    const outputTokens = normalizeNonNegativeInt(args.outputTokens);
    const totalTokens = Math.max(
      inputTokens + outputTokens,
      normalizeNonNegativeInt(args.totalTokens)
    );
    const costInCents = normalizeNonNegativeInt(args.costInCents);
    const nativeCostInCents = normalizeNonNegativeInt(args.nativeCostInCents);
    const creditsCharged = normalizeNonNegativeInt(args.creditsCharged);
    const creditChargeStatus =
      args.creditChargeStatus ??
      (usageGuardrail.billingPolicy.enforceCredits
        ? creditsCharged > 0
          ? "charged"
          : "skipped_unmetered"
        : "skipped_not_required");
    const providerRequestId = normalizeOptionalString(args.providerRequestId) ?? undefined;
    const action = normalizeOptionalString(args.action) ?? undefined;
    const nativeCostCurrency =
      normalizeOptionalString(args.nativeCostCurrency) ??
      (nativeCostInCents > 0 ? "USD" : undefined);
    const nativeCostSource =
      args.nativeCostSource ??
      (nativeCostInCents > 0 ? "estimated_model_pricing" : "not_available");
    const nativeUsageQuantity = normalizeNonNegativeNumber(args.nativeUsageQuantity);
    const nativeInputUnits = normalizeNonNegativeNumber(args.nativeInputUnits);
    const nativeOutputUnits = normalizeNonNegativeNumber(args.nativeOutputUnits);
    const nativeTotalUnits = Math.max(
      normalizeNonNegativeNumber(args.nativeTotalUnits),
      nativeInputUnits + nativeOutputUnits,
      nativeUsageQuantity
    );
    const requestDurationMs = normalizeNonNegativeInt(args.requestDurationMs);

    // Create usage record
    const usageId = await ctx.db.insert("aiUsage", {
      organizationId: args.organizationId,
      userId: args.userId,
      periodStart,
      periodEnd,
      requestCount,
      inputTokens,
      outputTokens,
      totalTokens,
      costInCents,
      requestType: args.requestType,
      provider: args.provider,
      model: args.model,
      tier,
      billingSource: usageGuardrail.billingPolicy.effectiveBillingSource,
      requestSource: usageGuardrail.billingPolicy.requestSource,
      billingPolicyReason: usageGuardrail.billingPolicy.reason,
      billingLedger: usageGuardrail.ledgerPolicy.effectiveLedgerMode,
      billingLedgerReason: usageGuardrail.ledgerPolicy.reason,
      creditLedgerAction: creditLedgerAction ?? undefined,
      creditsCharged,
      creditChargeStatus,
      action,
      nativeUsageUnit: normalizeOptionalString(args.nativeUsageUnit) ?? undefined,
      nativeUsageQuantity: nativeUsageQuantity > 0 ? nativeUsageQuantity : undefined,
      nativeInputUnits: nativeInputUnits > 0 ? nativeInputUnits : undefined,
      nativeOutputUnits: nativeOutputUnits > 0 ? nativeOutputUnits : undefined,
      nativeTotalUnits: nativeTotalUnits > 0 ? nativeTotalUnits : undefined,
      nativeCostInCents: nativeCostInCents > 0 ? nativeCostInCents : undefined,
      nativeCostCurrency,
      nativeCostSource,
      providerRequestId,
      usageMetadata: args.usageMetadata,
      legacyTokenAccountingStatus: "skipped",
      success: args.success,
      errorMessage: args.errorMessage,
      requestDurationMs: requestDurationMs > 0 ? requestDurationMs : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return {
      usageId,
      tokensUsed: totalTokens * requestCount,
      remainingIncludedTokens:
        subscription
          ? Math.max(
              0,
              subscription.includedTokensTotal - subscription.includedTokensUsed
            )
          : null,
      billingPolicy: usageGuardrail.billingPolicy,
      ledgerPolicy: usageGuardrail.ledgerPolicy,
      legacyTokenAccountingSkipped: true,
    };
  },
});

/**
 * INTERNAL MUTATION WRAPPERS
 *
 * These wrappers allow webhook handlers to call billing functions
 * without authentication (webhooks come from Stripe, not users).
 */

export const upsertSubscriptionFromStripeInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    tier: v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm")
    ),
    privateLLMTier: v.optional(
      v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise"))
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    priceInCents: v.number(),
    currency: v.string(),
    includedTokensTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const existingSubscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        legacyTokenAccountingMode: "deprecated_disabled",
        updatedAt: Date.now(),
      });
      return existingSubscription._id;
    } else {
      return await ctx.db.insert("aiSubscriptions", {
        organizationId: args.organizationId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripePriceId: args.stripePriceId,
        status: args.status,
        tier: args.tier,
        privateLLMTier: args.privateLLMTier,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        priceInCents: args.priceInCents,
        currency: args.currency,
        includedTokensTotal: args.includedTokensTotal,
        includedTokensUsed: 0,
        legacyTokenAccountingMode: "deprecated_disabled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateSubscriptionStatusInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("aiSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * SYNC BILLING DETAILS FROM STRIPE
 *
 * Syncs billing information from Stripe Checkout to organization_legal object.
 * Called by AI subscription webhooks after checkout completion.
 */
export const syncBillingDetailsInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    isB2B: v.boolean(),
    billingEmail: v.optional(v.string()),
    billingName: v.optional(v.string()),
    billingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),
    taxIds: v.optional(v.array(v.object({
      type: v.string(),
      value: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    // Find or create organization_legal object
    const orgLegal = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_legal")
      )
      .first();

    const now = Date.now();

    // Prepare billing data
    const billingData = {
      isB2B: args.isB2B,
      billingEmail: args.billingEmail,
      billingName: args.billingName,
      billingAddress: args.billingAddress,
      taxIds: args.taxIds,
      lastSyncedFromStripe: now,
    };

    if (orgLegal) {
      // Update existing organization_legal object
      await ctx.db.patch(orgLegal._id, {
        customProperties: {
          ...orgLegal.customProperties,
          ...billingData,
        },
        updatedAt: now,
      });

      console.log(`[AI Billing] Updated organization_legal for ${args.organizationId}`);
    } else {
      // Create new organization_legal object
      // Get organization to set createdBy
      const org = await ctx.db.get(args.organizationId);
      if (!org) {
        throw new Error(`Organization not found: ${args.organizationId}`);
      }

      // Find a member to set as createdBy
      const member = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .first();

      // Prepare insert data
      const insertData = {
        organizationId: args.organizationId,
        type: "organization_legal" as const,
        subtype: "billing_entity" as const,
        name: `${org.name} Billing`,
        description: "Billing and legal information",
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
        customProperties: {
          legalName: args.billingName || org.businessName,
          ...billingData,
        },
        ...(member?.userId && { createdBy: member.userId }),
      };

      await ctx.db.insert("objects", insertData);

      console.log(`[AI Billing] Created organization_legal for ${args.organizationId}`);
    }

    return { success: true };
  },
});

/**
 * GET ORGANIZATION INTERNAL
 *
 * Internal query to get organization details for webhook processing.
 * Returns organization name and language preference for emails.
 */
export const getOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);

    if (!org) {
      return null;
    }

    // Default to English for now
    // TODO: Add language preference to organization or user model
    const language = "en";

    return {
      name: org.name,
      businessName: org.businessName,
      language,
    };
  },
});
