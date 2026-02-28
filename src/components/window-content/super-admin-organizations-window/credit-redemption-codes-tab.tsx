"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BarChart3, Loader2, ShieldAlert, Ticket, Ban } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type OrganizationOption = {
  _id: string;
  name?: string | null;
  slug?: string | null;
};

type CreditCodeRow = {
  _id: string;
  code: string;
  status: "active" | "revoked" | "expired" | "exhausted";
  creditsAmount: number;
  maxRedemptions: number;
  redemptionCount: number;
  remainingRedemptions: number;
  expiresAt: number | null;
  allowedTierNames: string[];
  allowedOrganizationIds: string[];
  allowedUserIds: string[];
  description: string | null;
  createdAt: number;
  lastRedeemedAt: number | null;
};

type CreditCodesResponse = {
  success: boolean;
  items: CreditCodeRow[];
};

type CreditCodeRedemptionsResponse = {
  success: boolean;
  items: Array<{
    _id: string;
    code: string;
    redeemedByUserId: string;
    redeemedByOrganizationId: string;
    creditsGranted: number;
    redeemedAt: number;
  }>;
};

type CreditCodeAnalyticsResponse = {
  success: boolean;
  summary: {
    totalCodes: number;
    activeCodes: number;
    revokedCodes: number;
    expiredCodes: number;
    exhaustedCodes: number;
    totalPotentialCredits: number;
    totalRedeemedCredits: number;
    totalRedemptions: number;
  };
};

const TIER_OPTIONS = [
  "free",
  "starter",
  "professional",
  "agency",
  "enterprise",
  "pro",
] as const;

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

function formatDateTime(value: number | null): string {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function toTimestampFromLocalDateTime(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }
  return timestamp;
}

function parseIdListFromInput(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function formatRestrictionSummary(row: CreditCodeRow): string {
  const parts: string[] = [];
  if (row.allowedTierNames.length > 0) {
    parts.push(`tiers: ${row.allowedTierNames.join(", ")}`);
  }
  if (row.allowedOrganizationIds.length > 0) {
    parts.push(`orgs: ${row.allowedOrganizationIds.length}`);
  }
  if (row.allowedUserIds.length > 0) {
    parts.push(`users: ${row.allowedUserIds.length}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "none";
}

export function CreditRedemptionCodesTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const { t } = useNamespaceTranslations("ui.super_admin.credit_redemption_codes");
  const tx: TranslateWithFallback = (key, fallback, params) => {
    const fullKey = `ui.super_admin.credit_redemption_codes.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [isCreating, setIsCreating] = useState(false);
  const [isRevokingCodeId, setIsRevokingCodeId] = useState<string | null>(null);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState("");
  const [creditsAmountInput, setCreditsAmountInput] = useState("100");
  const [maxRedemptionsInput, setMaxRedemptionsInput] = useState("1");
  const [expiresAtInput, setExpiresAtInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [allowedTierNames, setAllowedTierNames] = useState<string[]>([]);
  const [allowedOrganizationIds, setAllowedOrganizationIds] = useState<string[]>([]);
  const [allowedUserIdsInput, setAllowedUserIdsInput] = useState("");

  const createCode = useMutation(api.credits.index.createCreditRedemptionCode);
  const revokeCode = useMutation(api.credits.index.revokeCreditRedemptionCode);

  const organizations = useQuery(
    api.organizations.listAll,
    sessionId && isSuperAdmin ? { sessionId } : "skip"
  ) as OrganizationOption[] | undefined;

  const codesResponse = useQuery(
    api.credits.index.listCreditRedemptionCodes,
    sessionId && isSuperAdmin ? { sessionId, limit: 200 } : "skip"
  ) as CreditCodesResponse | undefined;

  const analyticsResponse = useQuery(
    api.credits.index.getCreditRedemptionCodeAnalytics,
    sessionId && isSuperAdmin ? { sessionId } : "skip"
  ) as CreditCodeAnalyticsResponse | undefined;

  const redemptionsResponse = useQuery(
    api.credits.index.listCreditCodeRedemptions,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          codeId: selectedCodeId ?? undefined,
          limit: 100,
        }
      : "skip"
  ) as CreditCodeRedemptionsResponse | undefined;

  const codeRows = useMemo(() => codesResponse?.items ?? [], [codesResponse?.items]);
  const selectedCode = useMemo(
    () => codeRows.find((row) => row._id === selectedCodeId) ?? null,
    [codeRows, selectedCodeId]
  );

  async function handleCreateCode() {
    if (!sessionId) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);
    try {
      const creditsAmount = Number.parseInt(creditsAmountInput, 10);
      const maxRedemptions = Number.parseInt(maxRedemptionsInput, 10);
      const expiresAt = toTimestampFromLocalDateTime(expiresAtInput);
      const allowedUserIds = parseIdListFromInput(allowedUserIdsInput);

      const result = await createCode({
        sessionId,
        code: codeInput.trim() || undefined,
        creditsAmount,
        maxRedemptions,
        expiresAt,
        allowedTierNames: allowedTierNames.length > 0 ? allowedTierNames : undefined,
        allowedOrganizationIds:
          allowedOrganizationIds.length > 0 ? allowedOrganizationIds : undefined,
        allowedUserIds: allowedUserIds.length > 0 ? allowedUserIds : undefined,
        description: descriptionInput.trim() || undefined,
      });

      setCodeInput("");
      setDescriptionInput("");
      setExpiresAtInput("");
      setAllowedTierNames([]);
      setAllowedOrganizationIds([]);
      setAllowedUserIdsInput("");
      setSelectedCodeId(result.codeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : tx("errors.create_failed", "Failed to create code");
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevokeCode(codeId: string) {
    if (!sessionId) {
      return;
    }
    setErrorMessage(null);
    setIsRevokingCodeId(codeId);
    try {
      await revokeCode({
        sessionId,
        codeId,
        reason: "Revoked by super admin",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : tx("errors.revoke_failed", "Failed to revoke code");
      setErrorMessage(message);
    } finally {
      setIsRevokingCodeId(null);
    }
  }

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

  const summary = analyticsResponse?.summary;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Ticket size={16} />
          {tx("header.title", "Credit Redemption Codes")}
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {tx(
            "header.subtitle",
            "Create, revoke, and inspect redemption code usage. Restrictions apply fail-closed."
          )}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--error)", color: "var(--error)" }}>
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("metrics.total_codes", "Total codes")}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>{summary?.totalCodes ?? 0}</div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("metrics.active", "Active")}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>{summary?.activeCodes ?? 0}</div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("metrics.total_redemptions", "Total redemptions")}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>{summary?.totalRedemptions ?? 0}</div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("metrics.redeemed_credits", "Redeemed credits")}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>{summary?.totalRedeemedCredits ?? 0}</div>
        </div>
      </div>

      <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--window-document-border)" }}>
        <h4 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tx("create.title", "Create Code")}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {tx("create.code_label", "Code (optional)")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder={tx("create.code_placeholder", "VC83-ABCD-EFGH")}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {tx("create.credits_granted_label", "Credits Granted")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={creditsAmountInput}
              onChange={(event) => setCreditsAmountInput(event.target.value)}
              type="number"
              min={1}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {tx("create.max_redemptions_label", "Max Redemptions")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={maxRedemptionsInput}
              onChange={(event) => setMaxRedemptionsInput(event.target.value)}
              type="number"
              min={1}
            />
          </label>
          <label className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {tx("create.expires_at_label", "Expires At (optional)")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={expiresAtInput}
              onChange={(event) => setExpiresAtInput(event.target.value)}
              type="datetime-local"
            />
          </label>
          <label className="text-xs md:col-span-2" style={{ color: "var(--window-document-text)" }}>
            {tx("create.description_label", "Description (optional)")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={descriptionInput}
              onChange={(event) => setDescriptionInput(event.target.value)}
              placeholder={tx("create.description_placeholder", "Campaign label")}
            />
          </label>
          <label className="text-xs md:col-span-2" style={{ color: "var(--window-document-text)" }}>
            {tx("create.allowed_user_ids_label", "Allowed User IDs (optional, comma-separated)")}
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={allowedUserIdsInput}
              onChange={(event) => setAllowedUserIdsInput(event.target.value)}
              placeholder={tx("create.allowed_user_ids_placeholder", "user_1, user_2")}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("create.allowed_tiers", "Allowed Tiers")}
            </p>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map((tierName) => {
                const checked = allowedTierNames.includes(tierName);
                return (
                  <label key={tierName} className="text-[11px] flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setAllowedTierNames((current) => {
                          if (event.target.checked) {
                            return [...current, tierName];
                          }
                          return current.filter((entry) => entry !== tierName);
                        });
                      }}
                    />
                    {tierName}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--window-document-text)" }}>
              {tx("create.allowed_organizations", "Allowed Organizations")}
            </p>
            <select
              className="w-full rounded border px-2 py-1 text-xs bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              multiple
              size={5}
              value={allowedOrganizationIds}
              onChange={(event) => {
                const next = Array.from(event.target.selectedOptions).map((opt) => opt.value);
                setAllowedOrganizationIds(next);
              }}
            >
              {(organizations ?? []).map((organization) => (
                <option key={organization._id} value={organization._id}>
                  {organization.name || organization.slug || organization._id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="rounded border px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-2"
          style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
          onClick={handleCreateCode}
          disabled={isCreating}
        >
          {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
          {isCreating
            ? tx("create.creating", "Creating...")
            : tx("create.submit", "Create Redemption Code")}
        </button>
      </div>

      <div className="rounded border overflow-hidden" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "var(--window-document-border)" }}>
          <h4 className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("codes.title", "Codes")}
          </h4>
          <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("codes.rows_count", `${codeRows.length} rows`, { count: codeRows.length })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "var(--window-document-bg-elevated)" }}>
                <th className="text-left px-3 py-2">{tx("codes.table.code", "Code")}</th>
                <th className="text-left px-3 py-2">{tx("codes.table.status", "Status")}</th>
                <th className="text-left px-3 py-2">{tx("codes.table.usage", "Usage")}</th>
                <th className="text-left px-3 py-2">{tx("codes.table.restrictions", "Restrictions")}</th>
                <th className="text-left px-3 py-2">{tx("codes.table.expires", "Expires")}</th>
                <th className="text-left px-3 py-2">{tx("codes.table.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {codeRows.map((row) => (
                <tr key={row._id} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
                  <td className="px-3 py-2">
                    <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>{row.code}</div>
                    <div style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx("codes.credits", `${row.creditsAmount} credits`, { amount: row.creditsAmount })}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded border px-2 py-0.5 uppercase" style={{ borderColor: "var(--window-document-border)" }}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {row.redemptionCount}/{row.maxRedemptions}
                  </td>
                  <td className="px-3 py-2">{formatRestrictionSummary(row)}</td>
                  <td className="px-3 py-2">{formatDateTime(row.expiresAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        style={{ borderColor: "var(--window-document-border)" }}
                        onClick={() => setSelectedCodeId(row._id)}
                      >
                        {tx("codes.actions.inspect", "Inspect")}
                      </button>
                      {row.status === "active" ? (
                        <button
                          type="button"
                          className="rounded border px-2 py-1 inline-flex items-center gap-1"
                          style={{ borderColor: "var(--error)", color: "var(--error)" }}
                          onClick={() => handleRevokeCode(row._id)}
                          disabled={isRevokingCodeId === row._id}
                        >
                          {isRevokingCodeId === row._id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Ban size={12} />
                          )}
                          {tx("codes.actions.revoke", "Revoke")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border p-3" style={{ borderColor: "var(--window-document-border)" }}>
        <h4 className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <BarChart3 size={14} />
          {tx("events.title", "Redemption Events")}{" "}
          {selectedCode
            ? tx("events.for_code", `for ${selectedCode.code}`, { code: selectedCode.code })
            : tx("events.recent", "(recent)")}
        </h4>
        <div className="mt-2 space-y-1 max-h-64 overflow-auto">
          {(redemptionsResponse?.items ?? []).map((entry) => (
            <div key={entry._id} className="rounded border px-2 py-1" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--window-document-text)" }}>
                <span className="font-semibold">{entry.code}</span>{" "}
                {tx("events.redeemed_for", "redeemed for")} {entry.creditsGranted}{" "}
                {tx("events.credits_label", "credits")}
              </div>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("events.user_label", "user:")} {entry.redeemedByUserId}{" "}
                {tx("events.org_separator_label", "| org:")} {entry.redeemedByOrganizationId} |{" "}
                {formatDateTime(entry.redeemedAt)}
              </div>
            </div>
          ))}
          {(!redemptionsResponse || redemptionsResponse.items.length === 0) ? (
            <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              {tx("events.empty", "No redemption events found.")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
