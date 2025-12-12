"use client";

import { Lock, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";

interface AppUnavailableProps {
  appName: string;
  appCode: string;
  organizationName?: string;
  message?: string;
}

/**
 * Universal component shown when an app is not available to an organization
 * Displays an upgrade prompt with self-service licensing through the Store
 */
export function AppUnavailable({
  appName,
  appCode,
  organizationName = "your organization",
  message,
}: AppUnavailableProps) {
  const { openWindow } = useWindowManager();

  const handleUpgradeClick = () => {
    import("@/components/window-content/store-window").then(({ StoreWindow }) => {
      openWindow(
        "store",
        "Platform Store",
        <StoreWindow />,
        { x: 100, y: 100 },
        { width: 900, height: 600 }
      );
    });
  };

  const benefits = [
    `Full access to ${appName}`,
    "Advanced features and integrations",
    "Priority support and assistance",
    "Cancel anytime, no commitments",
  ];

  return (
    <div className="flex items-center justify-center h-full p-8" style={{ background: 'var(--win95-bg)' }}>
      <div className="max-w-md w-full">
        <div
          className="border-4 shadow-lg"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
          }}
        >
          {/* Header - matching UpgradeModal style */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: "linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
              color: "white",
            }}
          >
            <span className="text-sm font-bold flex items-center gap-2">
              <Lock size={16} />
              App Not Licensed
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Feature Preview */}
            <div
              className="p-4 border-2 rounded mb-4 text-center"
              style={{
                borderColor: "var(--win95-highlight)",
                background: "linear-gradient(180deg, color-mix(in srgb, var(--win95-gradient-end) 10%, transparent) 0%, transparent 100%)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: "color-mix(in srgb, var(--win95-gradient-end) 10%, transparent)",
                }}
              >
                <Zap size={32} style={{ color: "var(--win95-highlight)" }} />
              </div>
              <h3
                className="font-bold text-lg mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {appName}
              </h3>
              <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                {message || `This app is not currently licensed for ${organizationName}.`}
              </p>
              <p
                className="text-xs mt-2"
                style={{ color: "var(--neutral-gray)" }}
              >
                App code: <code className="px-1" style={{ background: "var(--win95-bg-light)" }}>{appCode}</code>
              </p>
            </div>

            {/* Upgrade info */}
            <div
              className="p-3 border-2 rounded mb-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                Visit the <strong>Platform Store</strong> to license this app for your organization.
              </p>
            </div>

            {/* Benefits */}
            <div className="mb-4 space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Sparkles
                    size={14}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "var(--win95-highlight)" }}
                  />
                  <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleUpgradeClick}
                className="beveled-button-primary flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
              >
                <ShoppingBag size={16} />
                Open Store
              </button>
              <button
                onClick={() => window.history.back()}
                className="beveled-button px-4 py-2 text-sm font-bold"
                style={{
                  backgroundColor: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline version for use within forms or smaller spaces
 */
export function AppUnavailableInline({
  appName,
  organizationName = "your organization",
}: {
  appName: string;
  organizationName?: string;
}) {
  const { openWindow } = useWindowManager();

  const handleUpgradeClick = () => {
    import("@/components/window-content/store-window").then(({ StoreWindow }) => {
      openWindow(
        "store",
        "Platform Store",
        <StoreWindow />,
        { x: 100, y: 100 },
        { width: 900, height: 600 }
      );
    });
  };

  return (
    <div
      className="border-2 p-4 text-sm"
      style={{
        borderColor: "var(--win95-highlight)",
        background: "var(--win95-bg-light)",
      }}
    >
      <div className="flex items-start gap-3">
        <Lock
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: "var(--win95-highlight)" }}
        />
        <div className="flex-1">
          <p
            className="font-bold mb-1"
            style={{ color: "var(--win95-text)" }}
          >
            {appName} Not Licensed
          </p>
          <p style={{ color: "var(--win95-text-secondary)" }}>
            This feature requires the {appName} app, which is not currently licensed for{" "}
            {organizationName}.
          </p>
          <button
            onClick={handleUpgradeClick}
            className="mt-2 px-3 py-1 text-xs font-bold text-white inline-flex items-center gap-1"
            style={{
              background: "var(--win95-highlight)",
              border: "1px solid",
              borderColor: "var(--win95-highlight)",
            }}
          >
            <ShoppingBag size={12} />
            Open Store
          </button>
        </div>
      </div>
    </div>
  );
}
