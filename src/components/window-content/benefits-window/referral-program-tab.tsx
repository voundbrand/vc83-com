"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  CircleAlert,
  Copy,
  Link2,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";

type ReferralStats = {
  monthKey: string;
  monthlyEarnedCredits: number;
  monthlyRemainingCredits: number;
  lifetimeEarnedCredits: number;
  referralSignups: number;
  referralSubscriptions: number;
};

type ReferralDashboard = {
  configured: boolean;
  enabled: boolean;
  code?: string | null;
  sharePath?: string | null;
  signupRewardCredits?: number;
  subscriptionRewardCredits?: number;
  monthlyCapCredits?: number;
  stats?: ReferralStats;
};

const DEFAULT_SIGNUP_REWARD = 5;
const DEFAULT_SUBSCRIPTION_REWARD = 20;
const DEFAULT_MONTHLY_CAP = 200;

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export function ReferralProgramTab() {
  const { sessionId } = useAuth();
  const { tWithFallback } = useNamespaceTranslations("ui.benefits");
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const getReferralProgramDashboardQuery = (api as any).credits.index.getReferralProgramDashboard;
  const dashboard = useQuery(
    getReferralProgramDashboardQuery,
    sessionId ? { sessionId } : "skip"
  ) as ReferralDashboard | undefined;
  const ensureReferralProfile = useMutation(api.credits.index.ensureReferralProfile);

  const [isEnsuringProfile, setIsEnsuringProfile] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [projectedSignups, setProjectedSignups] = useState(5);
  const [projectedSubscriptions, setProjectedSubscriptions] = useState(2);

  useEffect(() => {
    if (!sessionId || !dashboard?.configured || !dashboard.enabled || dashboard.code || isEnsuringProfile) {
      return;
    }

    setIsEnsuringProfile(true);
    void ensureReferralProfile({ sessionId })
      .catch((error) => {
        console.error("Failed to ensure referral profile:", error);
      })
      .finally(() => {
        setIsEnsuringProfile(false);
      });
  }, [
    dashboard?.code,
    dashboard?.configured,
    dashboard?.enabled,
    ensureReferralProfile,
    isEnsuringProfile,
    sessionId,
  ]);

  const signupRewardCredits = dashboard?.signupRewardCredits ?? DEFAULT_SIGNUP_REWARD;
  const subscriptionRewardCredits =
    dashboard?.subscriptionRewardCredits ?? DEFAULT_SUBSCRIPTION_REWARD;
  const monthlyCapCredits = dashboard?.monthlyCapCredits ?? DEFAULT_MONTHLY_CAP;
  const stats = dashboard?.stats;
  const monthlyEarnedCredits = stats?.monthlyEarnedCredits ?? 0;
  const monthlyRemainingCredits = Math.max(0, monthlyCapCredits - monthlyEarnedCredits);
  const monthlyProgressPercent =
    monthlyCapCredits > 0
      ? Math.min(100, Math.round((monthlyEarnedCredits / monthlyCapCredits) * 100))
      : 0;

  const shareUrl = useMemo(() => {
    const sharePath = dashboard?.sharePath;
    if (!sharePath || typeof window === "undefined") {
      return sharePath ?? null;
    }
    return new URL(sharePath, window.location.origin).toString();
  }, [dashboard?.sharePath]);

  const projectedSignupCredits = clampNonNegativeInt(projectedSignups) * signupRewardCredits;
  const projectedSubscriptionCredits =
    clampNonNegativeInt(projectedSubscriptions) * subscriptionRewardCredits;
  const projectedMonthlyBeforeCap = projectedSignupCredits + projectedSubscriptionCredits;
  const projectedMonthlyAfterCap = Math.min(monthlyCapCredits, projectedMonthlyBeforeCap);
  const projectedCapped = projectedMonthlyBeforeCap > monthlyCapCredits;

  const copyShareUrl = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch (error) {
      console.error("Failed to copy referral link:", error);
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  if (!sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ color: "var(--neutral-gray)" }}>
        <Users size={48} className="mb-4 opacity-30" />
        <p className="font-pixel text-sm">
          {tWithFallback("ui.benefits.referrals.login_required_title", "Please log in")}
        </p>
        <p className="text-xs mt-2">
          {tWithFallback(
            "ui.benefits.referrals.login_required_description",
            "Login required to access referral rewards.",
          )}
        </p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ color: "var(--neutral-gray)" }}>
        <Loader2 size={36} className="mb-3 animate-spin" />
        <p className="font-pixel text-sm">
          {tWithFallback("ui.benefits.referrals.loading", "Loading referral dashboard...")}
        </p>
      </div>
    );
  }

  if (!dashboard.configured) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ color: "var(--neutral-gray)" }}>
        <CircleAlert size={40} className="mb-3" />
        <p className="font-pixel text-sm">
          {tWithFallback("ui.benefits.referrals.unavailable_title", "Referral program unavailable")}
        </p>
        <p className="text-xs mt-2">
          {tWithFallback(
            "ui.benefits.referrals.unavailable_description",
            "The platform referral program is not configured yet.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div
        className="rounded border-2 p-4 mb-4"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <h2 className="font-pixel text-sm mb-2" style={{ color: "var(--shell-text)" }}>
          {tWithFallback("ui.benefits.referrals.link_title", "Referral link")}
        </h2>
        <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
          {tWithFallback(
            "ui.benefits.referrals.link_description",
            "Share your personal /ref/<code> URL. Both users earn credits on signup and subscription.",
          )}
        </p>

        {!dashboard.enabled ? (
          <div className="text-xs" style={{ color: "var(--warning, #b45309)" }}>
            {tWithFallback(
              "ui.benefits.referrals.paused",
              "Referral rewards are currently paused by platform settings.",
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2 border rounded text-xs min-h-[36px] flex items-center"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text)",
                }}
              >
                {shareUrl || (
                  isEnsuringProfile
                    ? tWithFallback("ui.benefits.referrals.generating_link", "Generating your referral link...")
                    : tWithFallback("ui.benefits.referrals.empty_link", "No referral link yet")
                )}
              </div>
              <button
                type="button"
                className="retro-button px-3 py-2 text-xs flex items-center gap-2"
                onClick={copyShareUrl}
                disabled={!shareUrl}
              >
                <Copy size={14} />
                {tWithFallback("ui.benefits.referrals.copy", "Copy")}
              </button>
            </div>

            {copyState === "copied" && (
              <p className="text-xs mt-2" style={{ color: "var(--success, #059669)" }}>
                {tWithFallback("ui.benefits.referrals.copied", "Referral link copied.")}
              </p>
            )}
            {copyState === "failed" && (
              <p className="text-xs mt-2" style={{ color: "var(--error, #dc2626)" }}>
                {tWithFallback("ui.benefits.referrals.copy_failed", "Failed to copy link.")}
              </p>
            )}
          </>
        )}
      </div>

      <div
        className="rounded border-2 p-4 mb-4"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} />
          <h3 className="font-pixel text-sm" style={{ color: "var(--shell-text)" }}>
            {tWithFallback("ui.benefits.referrals.monthly_progress", "Monthly progress")}
          </h3>
        </div>

        <div
          className="h-3 rounded border overflow-hidden"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface)",
          }}
        >
          <div
            className="h-full"
            style={{
              width: `${monthlyProgressPercent}%`,
              background: "var(--shell-selection-bg)",
            }}
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
          <span>
            {tWithFallback("ui.benefits.referrals.earned_this_month", "Earned this month: {value}", {
              value: monthlyEarnedCredits,
            })}
          </span>
          <span>
            {tWithFallback("ui.benefits.referrals.remaining", "Remaining: {value}", {
              value: monthlyRemainingCredits,
            })}
          </span>
          <span>
            {tWithFallback("ui.benefits.referrals.cap", "Cap: {value}", {
              value: monthlyCapCredits,
            })}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div
            className="rounded border p-2"
            style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface)" }}
          >
            <p style={{ color: "var(--neutral-gray)" }}>
              {tWithFallback("ui.benefits.referrals.referral_signups", "Referral signups")}
            </p>
            <p className="font-pixel text-sm" style={{ color: "var(--shell-text)" }}>
              {stats?.referralSignups ?? 0}
            </p>
          </div>
          <div
            className="rounded border p-2"
            style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface)" }}
          >
            <p style={{ color: "var(--neutral-gray)" }}>
              {tWithFallback(
                "ui.benefits.referrals.referral_subscriptions",
                "Referral subscriptions",
              )}
            </p>
            <p className="font-pixel text-sm" style={{ color: "var(--shell-text)" }}>
              {stats?.referralSubscriptions ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded border-2 p-4 mb-4"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={16} />
          <h3 className="font-pixel text-sm" style={{ color: "var(--shell-text)" }}>
            {tWithFallback("ui.benefits.referrals.calculator_title", "Run the numbers")}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-xs flex flex-col gap-1" style={{ color: "var(--neutral-gray)" }}>
            {tWithFallback("ui.benefits.referrals.expected_signups", "Expected signups")}
            <input
              type="number"
              min={0}
              value={projectedSignups}
              onChange={(event) =>
                setProjectedSignups(clampNonNegativeInt(Number(event.target.value)))
              }
              className="px-2 py-1 border rounded"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-surface)",
                color: "var(--shell-text)",
              }}
            />
          </label>
          <label className="text-xs flex flex-col gap-1" style={{ color: "var(--neutral-gray)" }}>
            {tWithFallback(
              "ui.benefits.referrals.expected_paid_subscriptions",
              "Expected paid subscriptions",
            )}
            <input
              type="number"
              min={0}
              value={projectedSubscriptions}
              onChange={(event) =>
                setProjectedSubscriptions(clampNonNegativeInt(Number(event.target.value)))
              }
              className="px-2 py-1 border rounded"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--shell-surface)",
                color: "var(--shell-text)",
              }}
            />
          </label>
        </div>

        <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <p>
            {tWithFallback(
              "ui.benefits.referrals.projected_signup_rewards",
              "Signup rewards: {value}",
              { value: projectedSignupCredits },
            )}
          </p>
          <p>
            {tWithFallback(
              "ui.benefits.referrals.projected_subscription_rewards",
              "Subscription rewards: {value}",
              { value: projectedSubscriptionCredits },
            )}
          </p>
          <p>
            {tWithFallback(
              "ui.benefits.referrals.projected_monthly_total",
              "Projected monthly total: {value}",
              { value: projectedMonthlyAfterCap },
            )}
            {" "}
            <span className="font-semibold" style={{ color: "var(--shell-text)" }}>
              {projectedMonthlyAfterCap}
            </span>
          </p>
          {projectedCapped && (
            <p style={{ color: "var(--warning, #b45309)" }}>
              {tWithFallback(
                "ui.benefits.referrals.projection_capped",
                "Projection capped at {cap} credits/month.",
                { cap: monthlyCapCredits },
              )}
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded border-2 p-4"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <h3 className="font-pixel text-sm mb-2" style={{ color: "var(--shell-text)" }}>
          {tWithFallback("ui.benefits.referrals.rules_title", "Referral rules")}
        </h3>
        <ul className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <li>
            {tWithFallback(
              "ui.benefits.referrals.rule_signup",
              "Signup reward: {amount} credits for each side.",
              { amount: signupRewardCredits },
            )}
          </li>
          <li>
            {tWithFallback(
              "ui.benefits.referrals.rule_subscription",
              "Subscription reward: {amount} credits for each side, after payment confirmation.",
              { amount: subscriptionRewardCredits },
            )}
          </li>
          <li>
            {tWithFallback(
              "ui.benefits.referrals.rule_cap",
              "Monthly cap: {cap} credits per user.",
              { cap: monthlyCapCredits },
            )}
          </li>
          <li>{tWithFallback("ui.benefits.referrals.rule_self_referral", "Self-referrals are blocked.")}</li>
          <li>{tWithFallback("ui.benefits.referrals.rule_fraud_checks", "Rewards are skipped when fraud/safety checks fail.")}</li>
        </ul>
      </div>
    </div>
  );
}
