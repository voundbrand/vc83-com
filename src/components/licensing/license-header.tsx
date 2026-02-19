"use client";

import { Clock, AlertCircle, ScrollText } from "lucide-react";

interface LicenseHeaderProps {
  license: {
    planTier: "free" | "starter" | "professional" | "agency" | "enterprise";
    status: "active" | "trial" | "expired" | "suspended";
    name: string;
    description: string;
    priceInCents: number;
    currency: string;
    supportLevel: string;
    currentPeriodStart: number | null;
    currentPeriodEnd: number | null;
    trialEnd: number | null;
    manualOverride: Record<string, unknown> | null;
  };
}

export function LicenseHeader({ license }: LicenseHeaderProps) {
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTierBadgeColor = () => {
    const colors: Record<typeof license.planTier, string> = {
      free: "var(--neutral-gray)",
      starter: "var(--primary)",
      professional: "#9F7AEA",
      agency: "#F59E0B",
      enterprise: "#EF4444",
    };
    return colors[license.planTier];
  };

  const getStatusBadgeColor = () => {
    const colors: Record<typeof license.status, string> = {
      active: "var(--success)",
      trial: "var(--warning)",
      expired: "var(--error)",
      suspended: "var(--error)",
    };
    return colors[license.status];
  };

  const getTrialDaysLeft = () => {
    if (!license.trialEnd) return null;
    const now = Date.now();
    const daysLeft = Math.ceil((license.trialEnd - now) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  const formatPrice = () => {
    const amount = license.priceInCents / 100;
    return `${license.currency === "EUR" ? "€" : "$"}${amount.toLocaleString()}`;
  };

  const trialDaysLeft = getTrialDaysLeft();

  return (
    <div className="space-y-3">
      {/* Main License Info */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <h3
            className="text-sm font-bold flex items-center gap-2"
            style={{ color: "var(--shell-text)" }}
          >
            <ScrollText className="w-4 h-4" />
            Current License Configuration
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Tier Badge */}
          <span
            className="beveled-button px-3 py-1.5 text-xs font-bold"
            style={{
              background: getTierBadgeColor(),
              color: "white",
            }}
          >
            {license.name.toUpperCase()} TIER
          </span>

          {/* Status Badge */}
          <span
            className="beveled-button px-3 py-1.5 text-xs font-bold"
            style={{
              background: getStatusBadgeColor(),
              color: "white",
            }}
          >
            {license.status.toUpperCase()}
          </span>

          {/* Price Badge */}
          {license.priceInCents > 0 && (
            <span
              className="px-3 py-1.5 text-xs font-bold"
              style={{
                background: "var(--shell-surface)",
                color: "var(--shell-text)",
                border: "2px solid var(--shell-border)",
              }}
            >
              {formatPrice()}/month
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {license.currentPeriodStart && license.currentPeriodEnd && (
            <div>
              <span style={{ color: "var(--neutral-gray)" }}>Billing Period:</span>
              <p style={{ color: "var(--shell-text)" }} className="font-mono mt-1">
                {formatDate(license.currentPeriodStart)} - {formatDate(license.currentPeriodEnd)}
              </p>
            </div>
          )}

          <div>
            <span style={{ color: "var(--neutral-gray)" }}>Support Level:</span>
            <p style={{ color: "var(--shell-text)" }} className="font-mono mt-1">
              {license.supportLevel.replace(/_/g, " ").toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Trial Notice */}
      {license.status === "trial" && trialDaysLeft !== null && (
        <div
          className="border-2 p-4"
          style={{
            borderColor: "var(--warning)",
            background: "rgba(251, 191, 36, 0.1)",
          }}
        >
          <div className="flex items-start gap-3">
            <Clock size={20} style={{ color: "var(--warning)" }} />
            <div className="flex-1">
              <h4
                className="text-xs font-bold mb-1"
                style={{ color: "var(--shell-text)" }}
              >
                Trial Period Active
              </h4>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Trial Expires: {formatDate(license.trialEnd)} ({trialDaysLeft}{" "}
                {trialDaysLeft === 1 ? "day" : "days"} remaining)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Alert */}
      {license.manualOverride && (
        <div
          className="border-2 p-4"
          style={{
            borderColor: "var(--error)",
            background: "rgba(239, 68, 68, 0.1)",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} style={{ color: "var(--error)" }} />
            <div className="flex-1">
              <h4
                className="text-xs font-bold mb-1 flex items-center gap-2"
                style={{ color: "var(--error)" }}
              >
                <AlertCircle className="w-4 h-4" />
                MANUAL OVERRIDE ACTIVE
              </h4>
              <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                This license has custom limits set by a super admin.
              </p>
              <div className="space-y-1 text-xs">
                {typeof license.manualOverride === "object" && "customLimits" in license.manualOverride && (
                  <div>
                    <span style={{ color: "var(--neutral-gray)" }}>Custom limits applied</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
