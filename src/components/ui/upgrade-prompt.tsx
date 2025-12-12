"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertCircle, ShoppingBag, Sparkles, Lock, X, Crown, Zap } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";

// =============================================================================
// INLINE UPGRADE PROMPT (Existing)
// =============================================================================

interface UpgradePromptProps {
  /**
   * The resource that hit its limit (e.g., "contacts", "projects", "workflows")
   */
  resource: string;

  /**
   * Current count (e.g., 100 contacts)
   */
  current: number;

  /**
   * Maximum allowed (e.g., 100)
   */
  limit: number;

  /**
   * Recommended tier to upgrade to (e.g., "Starter (€199/month)")
   */
  upgradeTier: string;

  /**
   * Optional custom message
   */
  message?: string;

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
}

/**
 * UPGRADE PROMPT COMPONENT (Inline)
 *
 * Reusable component for displaying consistent upgrade prompts across all apps
 * when users hit their tier limits. Use this for inline prompts within content.
 *
 * Usage:
 * ```tsx
 * <UpgradePrompt
 *   resource="contacts"
 *   current={100}
 *   limit={100}
 *   upgradeTier="Starter (€199/month)"
 * />
 * ```
 */
export function UpgradePrompt({
  resource,
  current,
  limit,
  upgradeTier,
  message,
  size = "md",
}: UpgradePromptProps) {
  const { openWindow } = useWindowManager();

  const handleUpgradeClick = () => {
    // Open the Store window
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

  // Size configurations
  const sizeClasses = {
    sm: {
      container: "max-w-sm",
      icon: 20,
      title: "text-xs",
      text: "text-xs",
      button: "px-2 py-1 text-xs",
    },
    md: {
      container: "max-w-md",
      icon: 24,
      title: "text-sm",
      text: "text-xs",
      button: "px-3 py-2 text-xs",
    },
    lg: {
      container: "max-w-lg",
      icon: 28,
      title: "text-base",
      text: "text-sm",
      button: "px-4 py-2 text-sm",
    },
  };

  const config = sizeClasses[size];

  return (
    <div className={`${config.container} mx-auto`}>
      <div
        className="border-2 p-4"
        style={{
          borderColor: "var(--warning)",
          background: "var(--warning-bg)",
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            size={config.icon}
            style={{ color: "var(--warning)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div className="flex-1">
            <h4
              className={`font-bold ${config.title} mb-2`}
              style={{ color: "var(--warning)" }}
            >
              {limit === -1 ? "Unlimited" : `${resource} Limit Reached`}
            </h4>
            <p className={`${config.text} mb-3`} style={{ color: "var(--win95-text)" }}>
              {message || (
                <>
                  You've reached your limit of <strong>{limit}</strong> {resource} (
                  {current}/{limit} used). Upgrade to <strong>{upgradeTier}</strong> for more
                  capacity.
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUpgradeClick}
                className={`retro-button ${config.button} font-bold inline-flex items-center gap-2`}
                style={{
                  background: "var(--primary)",
                  color: "var(--win95-button-text)",
                }}
              >
                <ShoppingBag size={14} />
                View Upgrade Options
              </button>

              <span
                className={`${config.text} italic`}
                style={{ color: "var(--win95-text-secondary)" }}
              >
                or contact your admin
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional info card */}
      <div
        className="mt-3 border-2 p-3"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex items-start gap-2">
          <Sparkles
            size={16}
            style={{ color: "var(--primary)" }}
            className="flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Why upgrade?
            </p>
            <ul className="text-xs space-y-1" style={{ color: "var(--win95-text-secondary)" }}>
              <li>• Higher limits for all resources</li>
              <li>• Advanced features and integrations</li>
              <li>• Priority support and assistance</li>
              <li>• Cancel anytime, no commitments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UNIVERSAL UPGRADE MODAL
// =============================================================================

/**
 * Upgrade modal types for different scenarios
 */
export type UpgradeModalType = "feature" | "limit" | "premium";

export interface UpgradeModalConfig {
  /**
   * Type of upgrade modal
   * - "feature": Feature is locked behind a tier
   * - "limit": Resource limit has been reached
   * - "premium": Generic premium feature teaser
   */
  type: UpgradeModalType;

  /**
   * Feature or resource name
   */
  feature: string;

  /**
   * Description of what's being locked/limited
   */
  description: string;

  /**
   * Required tier name (e.g., "Starter", "Professional")
   */
  requiredTier: string;

  /**
   * For "limit" type: current count
   */
  currentCount?: number;

  /**
   * For "limit" type: maximum limit
   */
  limit?: number;

  /**
   * Custom benefits to show (optional)
   */
  benefits?: string[];

  /**
   * Custom icon component (optional)
   */
  icon?: ReactNode;
}

interface UpgradeModalProps extends UpgradeModalConfig {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * UPGRADE MODAL COMPONENT (Universal)
 *
 * A universal modal for upgrade prompts that can be used anywhere in the app.
 * Supports feature gating, limit reached, and premium feature teasers.
 *
 * Usage:
 * ```tsx
 * <UpgradeModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   type="feature"
 *   feature="Zapier Integration"
 *   description="Connect to 5,000+ apps"
 *   requiredTier="Starter"
 * />
 * ```
 */
export function UpgradeModal({
  isOpen,
  onClose,
  type,
  feature,
  description,
  requiredTier,
  currentCount,
  limit,
  benefits,
  icon,
}: UpgradeModalProps) {
  const { openWindow } = useWindowManager();

  if (!isOpen) return null;

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
    onClose();
  };

  // Default benefits based on type
  const defaultBenefits = {
    feature: [
      "Access to advanced integrations",
      "Connect with popular automation tools",
      "Custom OAuth applications",
      "Priority support",
    ],
    limit: [
      "Higher limits for all resources",
      "Scale your business without restrictions",
      "Advanced features unlocked",
      "Priority support",
    ],
    premium: [
      "All premium features unlocked",
      "Priority support and assistance",
      "Early access to new features",
      "Cancel anytime",
    ],
  };

  const displayBenefits = benefits || defaultBenefits[type];

  // Header configuration based on type
  const headerConfig = {
    feature: {
      gradient: "linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
      icon: <Sparkles size={16} />,
      title: "Upgrade to Unlock",
    },
    limit: {
      gradient: "var(--warning)",
      icon: <Lock size={16} />,
      title: "Limit Reached",
    },
    premium: {
      gradient: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
      icon: <Crown size={16} />,
      title: "Premium Feature",
    },
  };

  const header = headerConfig[type];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="border-4 shadow-lg max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: header.gradient,
            color: "white",
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            {header.icon}
            {header.title}
          </span>
          <button
            onClick={onClose}
            className="hover:bg-white/20 px-2 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Feature Preview */}
          <div
            className="p-4 border-2 rounded mb-4 text-center"
            style={{
              borderColor: type === "limit" ? "var(--warning)" : "var(--win95-highlight)",
              background:
                type === "limit"
                  ? "linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)"
                  : "linear-gradient(180deg, color-mix(in srgb, var(--win95-gradient-end) 10%, transparent) 0%, transparent 100%)",
            }}
          >
            {icon || (
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{
                  background:
                    type === "limit"
                      ? "rgba(245, 158, 11, 0.1)"
                      : "color-mix(in srgb, var(--win95-gradient-end) 10%, transparent)",
                }}
              >
                {type === "limit" ? (
                  <Lock size={32} style={{ color: "var(--warning)" }} />
                ) : type === "premium" ? (
                  <Crown size={32} style={{ color: "#f59e0b" }} />
                ) : (
                  <Zap size={32} style={{ color: "var(--win95-highlight)" }} />
                )}
              </div>
            )}
            <h3
              className="font-bold text-lg mb-1"
              style={{ color: "var(--win95-text)" }}
            >
              {feature}
            </h3>
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              {description}
            </p>
            {type === "limit" && currentCount !== undefined && limit !== undefined && (
              <p
                className="text-xs mt-2 font-bold"
                style={{ color: "var(--warning)" }}
              >
                {currentCount} / {limit} used
              </p>
            )}
          </div>

          {/* Required tier */}
          <div
            className="p-3 border-2 rounded mb-4"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--win95-text)" }}>
              {type === "limit" ? (
                <>
                  Upgrade to <strong>{requiredTier}</strong> to increase your limits
                  and unlock additional features.
                </>
              ) : (
                <>
                  This feature requires <strong>{requiredTier}</strong> or higher.
                </>
              )}
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-4 space-y-2">
            {displayBenefits.map((benefit, index) => (
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
              View Plans
            </button>
            <button
              onClick={onClose}
              className="beveled-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UPGRADE MODAL CONTEXT & HOOK
// =============================================================================

interface UpgradeModalContextType {
  showUpgradeModal: (config: UpgradeModalConfig) => void;
  hideUpgradeModal: () => void;
  showFeatureLockedModal: (feature: string, description: string, requiredTier: string) => void;
  showLimitReachedModal: (
    resource: string,
    currentCount: number,
    limit: number,
    nextTier: string
  ) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | null>(null);

/**
 * UPGRADE MODAL PROVIDER
 *
 * Wrap your app with this provider to enable the useUpgradeModal hook.
 *
 * Usage:
 * ```tsx
 * // In your layout or app component:
 * <UpgradeModalProvider>
 *   <App />
 * </UpgradeModalProvider>
 * ```
 */
export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [modalConfig, setModalConfig] = useState<UpgradeModalConfig | null>(null);

  const showUpgradeModal = useCallback((config: UpgradeModalConfig) => {
    setModalConfig(config);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setModalConfig(null);
  }, []);

  const showFeatureLockedModal = useCallback(
    (feature: string, description: string, requiredTier: string) => {
      setModalConfig({
        type: "feature",
        feature,
        description,
        requiredTier,
      });
    },
    []
  );

  const showLimitReachedModal = useCallback(
    (resource: string, currentCount: number, limit: number, nextTier: string) => {
      setModalConfig({
        type: "limit",
        feature: `${resource} Limit Reached`,
        description: `You've used all available ${resource.toLowerCase()}.`,
        requiredTier: nextTier,
        currentCount,
        limit,
      });
    },
    []
  );

  return (
    <UpgradeModalContext.Provider
      value={{
        showUpgradeModal,
        hideUpgradeModal,
        showFeatureLockedModal,
        showLimitReachedModal,
      }}
    >
      {children}
      {modalConfig && (
        <UpgradeModal
          isOpen={true}
          onClose={hideUpgradeModal}
          {...modalConfig}
        />
      )}
    </UpgradeModalContext.Provider>
  );
}

/**
 * USE UPGRADE MODAL HOOK
 *
 * A hook to easily show upgrade modals from anywhere in your app.
 *
 * Usage:
 * ```tsx
 * const { showFeatureLockedModal, showLimitReachedModal } = useUpgradeModal();
 *
 * // For locked features:
 * showFeatureLockedModal("Zapier", "Connect to 5,000+ apps", "Starter (€199/month)");
 *
 * // For limit reached:
 * showLimitReachedModal("Custom Integrations", 1, 1, "Starter (€199/month)");
 * ```
 */
export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error("useUpgradeModal must be used within an UpgradeModalProvider");
  }
  return context;
}

// =============================================================================
// HELPER: Parse Limit Error
// =============================================================================

/**
 * PARSE LIMIT ERROR
 *
 * Helper function to parse limit and feature access errors from Convex mutations
 * and extract the necessary information for the UpgradePrompt component.
 *
 * Handles two types of errors:
 * 1. Resource limits: "You've reached your maxContacts limit (100). Upgrade to..."
 * 2. Feature access: "This feature requires Professional (€399/month). Current tier: free..."
 *
 * Usage:
 * ```tsx
 * try {
 *   await createContact(...);
 * } catch (error) {
 *   const limitError = parseLimitError(error);
 *   if (limitError) {
 *     return <UpgradePrompt {...limitError} />;
 *   }
 * }
 * ```
 */
export function parseLimitError(error: unknown): {
  resource: string;
  current: number;
  limit: number;
  upgradeTier: string;
  message: string;
} | null {
  if (!(error instanceof Error)) return null;

  const message = error.message;

  // Check if it's a feature access error
  // Format: "This feature requires Professional (€399/month). Current tier: free. Upgrade to unlock this feature."
  if (message.includes("This feature requires")) {
    const featureMatch = message.match(/This feature requires ([^.]+)\./);
    if (featureMatch) {
      const upgradeTier = featureMatch[1].trim();

      return {
        resource: "feature",
        current: 0,
        limit: 0,
        upgradeTier,
        message: message,
      };
    }
  }

  // Check if it's a resource limit error
  if (!message.includes("limit") || !message.includes("Upgrade to")) {
    return null;
  }

  // Parse the error message
  // Format: "You've reached your maxContacts limit (100). Upgrade to Starter (€199/month) for more capacity."
  const limitMatch = message.match(/(\w+)\s+limit\s+\((\d+)\)/);
  const upgradeMatch = message.match(/Upgrade to ([^.]+)\./);

  if (!limitMatch || !upgradeMatch) {
    return null;
  }

  const limitKey = limitMatch[1]; // e.g., "maxContacts"
  const limit = parseInt(limitMatch[2], 10); // e.g., 100
  const upgradeTier = upgradeMatch[1].trim(); // e.g., "Starter (€199/month)"

  // Convert camelCase to readable resource name
  // maxContacts -> contacts, maxProjects -> projects, etc.
  const resource = limitKey
    .replace(/^max/, "")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  return {
    resource,
    current: limit, // We're at the limit
    limit,
    upgradeTier,
    message: message,
  };
}

// =============================================================================
// TIER HELPERS
// =============================================================================

/**
 * Get the next tier name for upgrade prompts
 */
export function getNextTierName(
  currentTier: "free" | "starter" | "professional" | "agency" | "enterprise"
): string {
  const tierUpgradePath: Record<string, string> = {
    free: "Starter (€199/month)",
    starter: "Professional (€399/month)",
    professional: "Agency (€599/month)",
    agency: "Enterprise (€1,500+/month)",
    enterprise: "Enterprise (contact sales)",
  };

  return tierUpgradePath[currentTier] || "a higher tier";
}

/**
 * Format tier name for display
 */
export function formatTierName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
