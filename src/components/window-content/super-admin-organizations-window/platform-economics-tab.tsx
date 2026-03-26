"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { AlertTriangle, DollarSign, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type EconomicsRange = {
  startTs: number;
  endTs: number;
  durationHours: number;
};

type EconomicsAssumptions = {
  creditsPerUsd: number;
  creditValueBasisCents: number;
  marginFormula: string;
};

type EconomicsRow = {
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

type OrganizationEconomicsRow = EconomicsRow & {
  organizationId: string;
  name: string | null;
  isPlatformOrganization: boolean;
};

type ProviderEconomicsRow = EconomicsRow & {
  provider: string;
};

type ModelEconomicsRow = EconomicsRow & {
  provider: string;
  model: string;
};

type ActionEconomicsRow = EconomicsRow & {
  action: string;
};

type PlatformEconomicsSummaryResponse = {
  range: EconomicsRange;
  assumptions: EconomicsAssumptions;
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
  organizations: OrganizationEconomicsRow[];
  providerBreakdown: ProviderEconomicsRow[];
  modelBreakdown: ModelEconomicsRow[];
  actionBreakdown: ActionEconomicsRow[];
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
      transport: "direct_runtime" | "chat_runtime" | "unknown";
      requests: number;
      platformRequests: number;
      nativeCostInCents: number;
      platformNativeCostInCents: number;
      creditsCharged: number;
      platformCreditsCharged: number;
    }>;
    byCreditChargeStatus: Array<{
      status:
        | "charged"
        | "skipped_unmetered"
        | "skipped_insufficient_credits"
        | "skipped_not_required"
        | "failed"
        | "unknown";
      requests: number;
      platformRequests: number;
      nativeCostInCents: number;
      platformNativeCostInCents: number;
      creditsCharged: number;
      platformCreditsCharged: number;
    }>;
  };
  platformOrganization: OrganizationEconomicsRow | null;
  generatedAt: number;
  recordCount: number;
};

const RANGE_OPTIONS = [
  { label: "24h", value: 24 },
  { label: "7d", value: 24 * 7 },
  { label: "30d", value: 24 * 30 },
  { label: "90d", value: 24 * 90 },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number.isFinite(cents) ? cents : 0) / 100);
}

function formatPct(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toFixed(2)}%`;
}

function formatAgeFromTimestamp(timestamp: number): string {
  const ageMs = Math.max(0, Date.now() - timestamp);
  const ageSeconds = Math.floor(ageMs / 1000);
  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }
  const ageMinutes = Math.floor(ageSeconds / 60);
  if (ageMinutes < 60) {
    return `${ageMinutes}m ago`;
  }
  const ageHours = Math.floor(ageMinutes / 60);
  return `${ageHours}h ago`;
}

type MarginRiskLevel = "healthy" | "low" | "negative";

function resolveMarginRisk(
  pct: number,
  platformRequests: number = 1
): MarginRiskLevel {
  if (platformRequests <= 0) {
    return "healthy";
  }
  if (pct < 0) {
    return "negative";
  }
  if (pct < 15) {
    return "low";
  }
  return "healthy";
}

function resolveMarginRiskLabel(risk: MarginRiskLevel): string {
  if (risk === "negative") {
    return "NEGATIVE";
  }
  if (risk === "low") {
    return "LOW";
  }
  return "HEALTHY";
}

function resolveMarginRiskStyle(risk: MarginRiskLevel): {
  color?: string;
  backgroundColor?: string;
} {
  if (risk === "negative") {
    return {
      color: "var(--error)",
      backgroundColor: "rgba(220, 38, 38, 0.08)",
    };
  }
  if (risk === "low") {
    return {
      color: "var(--warning, #b45309)",
      backgroundColor: "rgba(245, 158, 11, 0.1)",
    };
  }
  return {};
}

function CompactMetricCard(props: { label: string; value: string; subValue?: string }) {
  return (
    <div
      className="rounded border p-2"
      style={{ borderColor: "var(--window-document-border)" }}
    >
      <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
        {props.label}
      </div>
      <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
        {props.value}
      </div>
      {props.subValue ? (
        <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {props.subValue}
        </div>
      ) : null}
    </div>
  );
}

export function PlatformEconomicsTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const { t } = useNamespaceTranslations("ui.super_admin.platform_economics");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const fullKey = `ui.super_admin.platform_economics.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [rangeHours, setRangeHours] = useState<number>(24 * 7);
  const [refreshNonce, setRefreshNonce] = useState<number>(Date.now());
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState<number>(0);

  useEffect(() => {
    if (autoRefreshSeconds <= 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setRefreshNonce(Date.now());
    }, autoRefreshSeconds * 1000);
    return () => window.clearInterval(intervalId);
  }, [autoRefreshSeconds]);

  const summary = useQuery(
    api.ai.billing.getPlatformEconomicsSummary,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          rangeHours,
          refreshNonce,
        }
      : "skip"
  ) as PlatformEconomicsSummaryResponse | undefined;

  const platformOrgLabel = useMemo(() => {
    if (!summary?.platformOrganization) {
      return "Not resolved";
    }
    return (
      summary.platformOrganization.name ||
      summary.platformOrganization.organizationId
    );
  }, [summary]);

  const riskCounts = useMemo(() => {
    if (!summary) {
      return { negative: 0, low: 0 };
    }
    const sources = [
      ...summary.providerBreakdown,
      ...summary.modelBreakdown,
      ...summary.actionBreakdown,
    ];
    let negative = 0;
    let low = 0;
    for (const row of sources) {
      if (row.platformRequests <= 0) {
        continue;
      }
      const risk = resolveMarginRisk(
        row.platformGrossMarginPct,
        row.platformRequests
      );
      if (risk === "negative") {
        negative += 1;
      } else if (risk === "low") {
        low += 1;
      }
    }
    return { negative, low };
  }, [summary]);

  const validationTelemetry = useMemo(() => {
    if (!summary) {
      return {
        totalRequests: 0,
        platformRequests: 0,
        directRuntimeRequests: 0,
        chatRuntimeRequests: 0,
        directRuntimePct: 0,
        creditsChargedRequests: 0,
        insufficientCreditsRequests: 0,
        skippedNotRequiredRequests: 0,
      };
    }

    const directRuntimeRow = summary.validationTelemetry.byTransport.find(
      (row) => row.transport === "direct_runtime"
    );
    const chatRuntimeRow = summary.validationTelemetry.byTransport.find(
      (row) => row.transport === "chat_runtime"
    );
    const chargedRow = summary.validationTelemetry.byCreditChargeStatus.find(
      (row) => row.status === "charged"
    );
    const insufficientCreditsRow =
      summary.validationTelemetry.byCreditChargeStatus.find(
        (row) => row.status === "skipped_insufficient_credits"
      );
    const skippedNotRequiredRow =
      summary.validationTelemetry.byCreditChargeStatus.find(
        (row) => row.status === "skipped_not_required"
      );
    const totalRequests = summary.validationTelemetry.totals.requests;

    return {
      totalRequests,
      platformRequests: summary.validationTelemetry.totals.platformRequests,
      directRuntimeRequests: directRuntimeRow?.requests ?? 0,
      chatRuntimeRequests: chatRuntimeRow?.requests ?? 0,
      directRuntimePct:
        totalRequests > 0
          ? Number(
              (((directRuntimeRow?.requests ?? 0) / totalRequests) * 100).toFixed(2)
            )
          : 0,
      creditsChargedRequests: chargedRow?.requests ?? 0,
      insufficientCreditsRequests: insufficientCreditsRow?.requests ?? 0,
      skippedNotRequiredRequests: skippedNotRequiredRow?.requests ?? 0,
    };
  }, [summary]);

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-3" size={36} style={{ color: "var(--error)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("access_required", "Super admin access required")}
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "var(--window-document-text)" }}
          >
            <DollarSign size={16} />
            {tx("header.title", "Platform AI Economics")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx(
              "header.subtitle",
              "Platform-funded usage, native spend, credits charged, and gross margin by org/provider/model."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
          <label className="flex items-center gap-2">
            {tx("header.window_label", "Window")}
            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={rangeHours}
              onChange={(event) => setRangeHours(Number.parseInt(event.target.value, 10))}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            {tx("header.auto_refresh_label", "Auto")}
            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={autoRefreshSeconds}
              onChange={(event) => setAutoRefreshSeconds(Number.parseInt(event.target.value, 10))}
            >
              <option value={0}>{tx("header.auto_refresh_off", "Off")}</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </label>
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded inline-flex items-center gap-1"
            style={{ borderColor: "var(--window-document-border)" }}
            onClick={() => setRefreshNonce(Date.now())}
          >
            <RefreshCw size={12} />
            {tx("header.refresh_label", "Refresh")}
          </button>
          <span style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("header.updated_label", "Updated")} {formatAgeFromTimestamp(summary.generatedAt)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CompactMetricCard
          label={tx("metrics.platform_requests", "Platform Requests")}
          value={formatNumber(summary.totals.platformRequests)}
          subValue={`All: ${formatNumber(summary.totals.allUsageRequests)}`}
        />
        <CompactMetricCard
          label={tx("metrics.platform_native_cost", "Platform Native Cost")}
          value={formatCents(summary.totals.platformNativeCostInCents)}
          subValue={`All native: ${formatCents(summary.totals.allUsageNativeCostInCents)}`}
        />
        <CompactMetricCard
          label={tx("metrics.credits_charged", "Credits Charged")}
          value={formatNumber(summary.totals.platformCreditsCharged)}
          subValue={`BYOK requests: ${formatNumber(summary.totals.byokRequests)}`}
        />
        <CompactMetricCard
          label={tx("metrics.gross_margin", "Gross Margin")}
          value={formatCents(summary.totals.platformGrossMarginInCents)}
          subValue={`${formatPct(summary.totals.platformGrossMarginPct)} margin`}
        />
      </div>

      <div
        className="rounded border p-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("validation_telemetry.title", "Model Validation Telemetry")}
          </p>
          {validationTelemetry.insufficientCreditsRequests > 0 ? (
            <div className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--warning, #b45309)" }}>
              <AlertTriangle size={12} />
              {tx(
                "validation_telemetry.insufficient_warning",
                "Validation hit credit exhaustion in chat runtime"
              )}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          <CompactMetricCard
            label={tx("validation_telemetry.requests", "Validation Requests")}
            value={formatNumber(validationTelemetry.totalRequests)}
            subValue={`Platform: ${formatNumber(validationTelemetry.platformRequests)}`}
          />
          <CompactMetricCard
            label={tx("validation_telemetry.direct_runtime_share", "Direct Runtime Share")}
            value={formatPct(validationTelemetry.directRuntimePct)}
            subValue={`Direct: ${formatNumber(validationTelemetry.directRuntimeRequests)} | Chat: ${formatNumber(validationTelemetry.chatRuntimeRequests)}`}
          />
          <CompactMetricCard
            label={tx("validation_telemetry.charged", "Charged Requests")}
            value={formatNumber(validationTelemetry.creditsChargedRequests)}
            subValue={`Skipped not required: ${formatNumber(validationTelemetry.skippedNotRequiredRequests)}`}
          />
          <CompactMetricCard
            label={tx("validation_telemetry.credit_exhausted", "Credit Exhaustions")}
            value={formatNumber(validationTelemetry.insufficientCreditsRequests)}
            subValue={tx(
              "validation_telemetry.credit_exhausted_sub",
              "Chat runtime should surface upgrade CTA"
            )}
          />
        </div>
      </div>

      <div
        className="rounded border p-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("cost_quality.title", "Cost Quality")}
          </p>
          {summary.costQuality.estimatedModelPricingPlatformCostPct >= 20 ? (
            <div className="text-[11px] inline-flex items-center gap-1" style={{ color: "var(--warning, #b45309)" }}>
              <AlertTriangle size={12} />
              {tx(
                "cost_quality.warning",
                "High fallback-pricing share detected"
              )}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          <CompactMetricCard
            label={tx("cost_quality.provider_reported_requests", "Provider-Reported Req %")}
            value={formatPct(summary.costQuality.providerReportedRequestPct)}
          />
          <CompactMetricCard
            label={tx("cost_quality.estimated_model_requests", "Estimated Model Req %")}
            value={formatPct(summary.costQuality.estimatedModelPricingRequestPct)}
          />
          <CompactMetricCard
            label={tx("cost_quality.provider_reported_cost", "Provider-Reported Cost %")}
            value={formatPct(summary.costQuality.providerReportedPlatformCostPct)}
          />
          <CompactMetricCard
            label={tx("cost_quality.estimated_model_cost", "Estimated Model Cost %")}
            value={formatPct(summary.costQuality.estimatedModelPricingPlatformCostPct)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("platform_org.title", "Platform Organization")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {platformOrgLabel}
          </p>
          {summary.platformOrganization ? (
            <div className="mt-2 text-xs" style={{ color: "var(--window-document-text)" }}>
              {tx("platform_org.requests", "Requests:")}{" "}
              {formatNumber(summary.platformOrganization.platformRequests)}{" "}
              {tx("platform_org.cost_separator", "| Cost:")}{" "}
              {formatCents(summary.platformOrganization.platformNativeCostInCents)}{" "}
              {tx("platform_org.credits_separator", "| Credits:")}{" "}
              {formatNumber(summary.platformOrganization.platformCreditsCharged)}
            </div>
          ) : null}
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("byok.title", "BYOK and Private Visibility")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx(
              "byok.description",
              "BYOK/private usage remains visible for analytics and is excluded from platform cost and margin."
            )}
          </p>
          <div className="mt-2 text-xs" style={{ color: "var(--window-document-text)" }}>
            {tx("byok.requests_label", "BYOK requests:")} {formatNumber(summary.totals.byokRequests)}{" "}
            {tx("byok.private_separator", "| Private requests:")} {formatNumber(summary.totals.privateRequests)}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("margin_risk.summary_prefix", "Margin risk rows:")}{" "}
            {tx("margin_risk.negative_label", "negative")} {riskCounts.negative}{" "}
            {tx("margin_risk.low_separator", "| low")} {riskCounts.low}
          </div>
        </div>
      </div>

      <div className="rounded border overflow-x-auto" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="px-3 py-2 text-xs font-semibold border-b" style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
          {tx("tables.org_breakdown_title", "Per-Organization Economics")}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--window-document-bg-elevated)" }}>
              <th className="text-left px-3 py-2">{tx("tables.org", "Organization")}</th>
              <th className="text-right px-3 py-2">{tx("tables.platform_req", "Platform Req")}</th>
              <th className="text-right px-3 py-2">{tx("tables.byok_req", "BYOK Req")}</th>
              <th className="text-right px-3 py-2">{tx("tables.native_cost", "Native Cost")}</th>
              <th className="text-right px-3 py-2">{tx("tables.credits", "Credits")}</th>
              <th className="text-right px-3 py-2">{tx("tables.revenue", "Revenue")}</th>
              <th className="text-right px-3 py-2">{tx("tables.margin", "Margin")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.organizations.slice(0, 50).map((row) => (
              <tr key={row.organizationId} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
                <td className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                  {row.name || row.organizationId}
                  {row.isPlatformOrganization ? tx("tables.platform_badge", " (platform)") : ""}
                </td>
                <td className="text-right px-3 py-2">{formatNumber(row.platformRequests)}</td>
                <td className="text-right px-3 py-2">{formatNumber(row.byokRequests)}</td>
                <td className="text-right px-3 py-2">{formatCents(row.platformNativeCostInCents)}</td>
                <td className="text-right px-3 py-2">{formatNumber(row.platformCreditsCharged)}</td>
                <td className="text-right px-3 py-2">{formatCents(row.platformCreditRevenueInCents)}</td>
                <td className="text-right px-3 py-2">{formatCents(row.platformGrossMarginInCents)} ({formatPct(row.platformGrossMarginPct)})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded border overflow-x-auto" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="px-3 py-2 text-xs font-semibold border-b" style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
            {tx("tables.provider_breakdown_title", "Provider Breakdown")}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--window-document-bg-elevated)" }}>
                <th className="text-left px-3 py-2">{tx("tables.provider", "Provider")}</th>
                <th className="text-right px-3 py-2">{tx("tables.platform_req", "Platform Req")}</th>
                <th className="text-right px-3 py-2">{tx("tables.native_cost", "Native Cost")}</th>
                <th className="text-right px-3 py-2">{tx("tables.margin_pct", "Margin %")}</th>
                <th className="text-right px-3 py-2">{tx("tables.risk", "Risk")}</th>
              </tr>
            </thead>
            <tbody>
              {summary.providerBreakdown.slice(0, 20).map((row) => {
                const risk = resolveMarginRisk(
                  row.platformGrossMarginPct,
                  row.platformRequests
                );
                return (
                  <tr
                    key={row.provider}
                    className="border-t"
                    style={{
                      borderColor: "var(--window-document-border)",
                      ...resolveMarginRiskStyle(risk),
                    }}
                  >
                    <td className="px-3 py-2">{row.provider}</td>
                    <td className="text-right px-3 py-2">{formatNumber(row.platformRequests)}</td>
                    <td className="text-right px-3 py-2">{formatCents(row.platformNativeCostInCents)}</td>
                    <td className="text-right px-3 py-2">{formatPct(row.platformGrossMarginPct)}</td>
                    <td className="text-right px-3 py-2">{resolveMarginRiskLabel(risk)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded border overflow-x-auto" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="px-3 py-2 text-xs font-semibold border-b" style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
            {tx("tables.action_breakdown_title", "Action Breakdown")}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--window-document-bg-elevated)" }}>
                <th className="text-left px-3 py-2">{tx("tables.action", "Action")}</th>
                <th className="text-right px-3 py-2">{tx("tables.requests", "Requests")}</th>
                <th className="text-right px-3 py-2">{tx("tables.platform_cost", "Platform Cost")}</th>
                <th className="text-right px-3 py-2">{tx("tables.byok_req", "BYOK Req")}</th>
                <th className="text-right px-3 py-2">{tx("tables.margin_pct", "Margin %")}</th>
                <th className="text-right px-3 py-2">{tx("tables.risk", "Risk")}</th>
              </tr>
            </thead>
            <tbody>
              {summary.actionBreakdown.slice(0, 20).map((row) => {
                const risk = resolveMarginRisk(
                  row.platformGrossMarginPct,
                  row.platformRequests
                );
                return (
                  <tr
                    key={row.action}
                    className="border-t"
                    style={{
                      borderColor: "var(--window-document-border)",
                      ...resolveMarginRiskStyle(risk),
                    }}
                  >
                    <td className="px-3 py-2">{row.action}</td>
                    <td className="text-right px-3 py-2">{formatNumber(row.requests)}</td>
                    <td className="text-right px-3 py-2">{formatCents(row.platformNativeCostInCents)}</td>
                    <td className="text-right px-3 py-2">{formatNumber(row.byokRequests)}</td>
                    <td className="text-right px-3 py-2">{formatPct(row.platformGrossMarginPct)}</td>
                    <td className="text-right px-3 py-2">{resolveMarginRiskLabel(risk)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border overflow-x-auto" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="px-3 py-2 text-xs font-semibold border-b" style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}>
          {tx("tables.model_breakdown_title", "Model Breakdown (Top 20 by platform cost)")}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--window-document-bg-elevated)" }}>
              <th className="text-left px-3 py-2">{tx("tables.provider", "Provider")}</th>
              <th className="text-left px-3 py-2">{tx("tables.model", "Model")}</th>
              <th className="text-right px-3 py-2">{tx("tables.platform_req", "Platform Req")}</th>
              <th className="text-right px-3 py-2">{tx("tables.platform_cost", "Platform Cost")}</th>
              <th className="text-right px-3 py-2">{tx("tables.margin_pct", "Margin %")}</th>
              <th className="text-right px-3 py-2">{tx("tables.risk", "Risk")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.modelBreakdown.slice(0, 20).map((row) => {
              const risk = resolveMarginRisk(
                row.platformGrossMarginPct,
                row.platformRequests
              );
              return (
                <tr
                  key={`${row.provider}:${row.model}`}
                  className="border-t"
                  style={{
                    borderColor: "var(--window-document-border)",
                    ...resolveMarginRiskStyle(risk),
                  }}
                >
                  <td className="px-3 py-2">{row.provider}</td>
                  <td className="px-3 py-2">{row.model}</td>
                  <td className="text-right px-3 py-2">{formatNumber(row.platformRequests)}</td>
                  <td className="text-right px-3 py-2">{formatCents(row.platformNativeCostInCents)}</td>
                  <td className="text-right px-3 py-2">{formatPct(row.platformGrossMarginPct)}</td>
                  <td className="text-right px-3 py-2">{resolveMarginRiskLabel(risk)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tx("assumptions.title", "Margin Assumptions")}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {summary.assumptions.marginFormula}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {tx("assumptions.credits_per_usd", "Credits per USD:")} {summary.assumptions.creditsPerUsd}{" "}
          {tx("assumptions.credit_value_basis_separator", "| Credit value basis:")}{" "}
          {formatCents(summary.assumptions.creditValueBasisCents)}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {tx("assumptions.range_label", "Range:")}{" "}
          {new Date(summary.range.startTs).toLocaleString()} -{" "}
          {new Date(summary.range.endTs).toLocaleString()} ({summary.range.durationHours.toFixed(1)}
          {tx("assumptions.hours_suffix", "h")})
        </p>
      </div>
    </div>
  );
}
