"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { TicketPercent, Loader2, CheckCircle2, AlertTriangle, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import { StoreWindow } from "@/components/window-content/store-window";
import { Id } from "../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const generatedApi = (require("../../../convex/_generated/api") as { api: any }).api;
const redeemCreditsCodeMutation = generatedApi.credits.index.redeemCreditCode;
const getCreditBalanceQuery = generatedApi.credits.index.getCreditBalance;

type RedeemResult = {
  success: boolean;
  code: string;
  creditsGranted: number;
  remainingRedemptions: number;
};

type RedeemNotice = {
  type: "success" | "error";
  message: string;
};

type CreditBalanceSnapshot = {
  exists: boolean;
  giftedCredits: number;
  dailyCredits: number;
  monthlyCredits: number;
  monthlyCreditsTotal: number;
  purchasedCredits: number;
  totalCredits: number;
};

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
) => string;

function mapRedeemError(error: unknown, tWithFallback: TranslateWithFallback): string {
  const err = error as { data?: { code?: string; message?: string }; message?: string } | null;
  const code = err?.data?.code;
  const fallback = tWithFallback(
    "ui.credits.redeem.error.generic",
    "We could not redeem that code. Please try again.",
  );

  if (code === "INVALID_REDEMPTION_CODE") {
    return tWithFallback(
      "ui.credits.redeem.error.invalid_format",
      "Enter a valid redeem code format.",
    );
  }
  if (code === "REDEEM_CODE_INVALID") {
    return tWithFallback(
      "ui.credits.redeem.error.code_not_recognized",
      "This code is not recognized.",
    );
  }
  if (code === "REDEEM_CODE_EXPIRED") {
    return tWithFallback(
      "ui.credits.redeem.error.expired",
      "This code has expired.",
    );
  }
  if (code === "REDEEM_CODE_REVOKED") {
    return tWithFallback(
      "ui.credits.redeem.error.revoked",
      "This code has been revoked.",
    );
  }
  if (code === "REDEEM_CODE_EXHAUSTED") {
    return tWithFallback(
      "ui.credits.redeem.error.exhausted",
      "This code has no remaining redemptions.",
    );
  }
  if (code === "REDEEM_CODE_ALREADY_REDEEMED_BY_USER") {
    return tWithFallback(
      "ui.credits.redeem.error.already_redeemed",
      "You have already redeemed this code.",
    );
  }
  if (code === "REDEEM_CODE_NOT_ELIGIBLE") {
    return tWithFallback(
      "ui.credits.redeem.error.not_eligible",
      "Your account is not eligible for this code.",
    );
  }
  if (code === "REDEEM_CODE_INVALID_POLICY") {
    return tWithFallback(
      "ui.credits.redeem.error.invalid_policy",
      "This code policy is invalid. Contact support.",
    );
  }
  if (code === "REDEEM_CODE_GRANT_FAILED") {
    return tWithFallback(
      "ui.credits.redeem.error.grant_failed",
      "The code was validated but credits could not be applied.",
    );
  }

  if (err?.data?.message && err.data.message.trim().length > 0) return err.data.message;
  if (err?.message && err.message.trim().length > 0) return err.message;
  return fallback;
}

export function CreditsRedeemWindow() {
  const { sessionId, isSignedIn, user } = useAuth();
  const { tWithFallback } = useNamespaceTranslations("ui.credits");
  const { openWindow } = useWindowManager();
  const redeemCreditsCode = useMutation(redeemCreditsCodeMutation);
  const activeOrganizationId = user?.currentOrganization?.id as Id<"organizations"> | undefined;
  const creditBalance = useQuery(
    getCreditBalanceQuery,
    activeOrganizationId ? { organizationId: activeOrganizationId } : "skip",
  ) as CreditBalanceSnapshot | undefined;

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<RedeemNotice | null>(null);
  const [lastResult, setLastResult] = useState<RedeemResult | null>(null);

  const normalizedCode = useMemo(
    () => code.trim().toUpperCase().replace(/\s+/g, ""),
    [code],
  );

  const availableCreditsText = useMemo(() => {
    if (!creditBalance || !creditBalance.exists) {
      return "0";
    }
    if (creditBalance.monthlyCredits === -1) {
      return "\u221e";
    }
    return Math.max(0, creditBalance.totalCredits).toLocaleString();
  }, [creditBalance]);

  const handleRedeem = async () => {
    if (!isSignedIn || !sessionId) {
      setNotice({
        type: "error",
        message: tWithFallback(
          "ui.credits.redeem.error.sign_in_required",
          "Sign in to redeem a code.",
        ),
      });
      return;
    }

    if (normalizedCode.length < 6) {
      setNotice({
        type: "error",
        message: tWithFallback(
          "ui.credits.redeem.error.min_length",
          "Enter at least 6 characters.",
        ),
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const result = await redeemCreditsCode({
        sessionId,
        code: normalizedCode,
        idempotencyKey: `desktop_redeem:${sessionId}:${normalizedCode}:${Date.now()}`,
      }) as RedeemResult;

      setLastResult(result);
      setNotice({
        type: "success",
        message: tWithFallback(
          "ui.credits.redeem.success.redeemed_added",
          "Code redeemed. Added {credits} gifted credits.",
          { credits: result.creditsGranted.toLocaleString() },
        ),
      });
      setCode("");
    } catch (error) {
      setNotice({
        type: "error",
        message: mapRedeemError(error, tWithFallback),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStoreCredits = () => {
    const deepLinkNonce = `redeem-store-${Date.now()}`;
    openWindow(
      "store",
      "sevenlayers Store",
      <StoreWindow initialSection="credits" />,
      { x: 150, y: 80 },
      { width: 900, height: 650 },
      "ui.start_menu.store",
      undefined,
      { initialSection: "credits", deepLinkNonce, openContext: "credits_redeem_window" },
    );
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      <div
        className="px-4 py-3 border-b"
        style={{
          background: "linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h2 className="font-pixel text-sm text-white flex items-center gap-2">
          <TicketPercent className="w-4 h-4" />
          {tWithFallback("ui.credits.redeem.title", "Redeem Credits")}
        </h2>
        <p className="text-xs mt-0.5 text-white/85">
          {tWithFallback(
            "ui.credits.redeem.subtitle",
            "Add gifted credits using a valid redeem code.",
          )}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          className="rounded p-3 border"
          style={{
            background: "var(--win95-bg-light)",
            borderColor: "var(--win95-border)",
          }}
        >
          <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--neutral-gray)" }}>
            {tWithFallback("ui.credits.redeem.current_credits", "Current credits")}
          </p>
          <p className="mt-1 font-pixel text-lg" style={{ color: "var(--win95-text)" }}>
            {availableCreditsText}
          </p>
        </div>

        <label className="block">
          <span className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            {tWithFallback("ui.credits.redeem.code_label", "Redeem code")}
          </span>
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={tWithFallback("ui.credits.redeem.code_placeholder", "EXAMPLE-ABCD-1234")}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded px-3 py-2 text-sm uppercase tracking-wide"
            style={{
              background: "var(--win95-bg-light)",
              border: "2px solid var(--win95-border)",
              color: "var(--win95-text)",
              outline: "none",
            }}
          />
        </label>

        {notice && (
          <div
            className="rounded p-3 text-xs flex items-start gap-2"
            role="status"
            aria-live="polite"
            style={{
              background: notice.type === "success" ? "var(--success-bg, #d1fae5)" : "var(--error-bg, #fee2e2)",
              color: notice.type === "success" ? "var(--success, #059669)" : "var(--error, #dc2626)",
              border: `1px solid ${notice.type === "success" ? "var(--success)" : "var(--error)"}`,
            }}
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
        )}

        {lastResult && (
          <div
            className="rounded p-3 border text-xs"
            style={{
              background: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            <p>
              {tWithFallback("ui.credits.redeem.notice.last_redeem", "Last redeem:")}{" "}
              <strong>{lastResult.code}</strong>
            </p>
            <p className="mt-1">
              {tWithFallback(
                "ui.credits.redeem.notice.remaining_redemptions",
                "Remaining redemptions for this code:",
              )}{" "}
              <strong>{Math.max(0, lastResult.remainingRedemptions).toLocaleString()}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex items-center gap-2" style={{ borderColor: "var(--win95-border)" }}>
        <button
          type="button"
          onClick={handleRedeem}
          disabled={isSubmitting || normalizedCode.length < 6}
          className="flex-1 py-2.5 rounded text-sm font-bold inline-flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
            color: "var(--win95-on-highlight)",
            border: "none",
            opacity: isSubmitting || normalizedCode.length < 6 ? 0.55 : 1,
            cursor: isSubmitting || normalizedCode.length < 6 ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {tWithFallback("ui.credits.redeem.status.redeeming", "Redeeming...")}
            </>
          ) : (
            tWithFallback("ui.credits.redeem.action.redeem", "Redeem Code")
          )}
        </button>

        <button
          type="button"
          onClick={openStoreCredits}
          className="px-3 py-2.5 rounded text-xs font-semibold inline-flex items-center gap-2"
          style={{
            background: "var(--win95-bg-light)",
            border: "2px solid var(--win95-border)",
            color: "var(--win95-text)",
          }}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {tWithFallback("ui.credits.redeem.action.buy_credits", "Buy Credits")}
        </button>
      </div>
    </div>
  );
}
