"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, Plus, ShoppingBag, Sparkles, Lock, X, LogIn, Building, ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { IntegrationCard } from "./integration-card";
import { MicrosoftSettings } from "./microsoft-settings";
import { GitHubSettings } from "./github-settings";
import { VercelSettings } from "./vercel-settings";
import { ApiKeysPanel } from "./api-keys-panel";
import { ActiveCampaignSettings } from "./activecampaign-settings";
import { TelegramSettings } from "./telegram-settings";
import { GoogleSettings } from "./google-settings";
import { CreateIntegrationDialog } from "./create-integration-dialog";
import { CustomIntegrationModal } from "./custom-integration-modal";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useAppearance } from "@/contexts/appearance-context";
import type { Id } from "../../../../convex/_generated/dataModel";

// Built-in integration definitions
// Access is checked dynamically using license features and limits
// Single source of truth: convex/licensing/tierConfigs.ts
//
// LICENSING MODEL:
// - Deployment Integrations (GitHub, Vercel) use deploymentIntegrationsEnabled feature
//   - All tiers: Enabled (including Free)
// - Platform Integrations (Microsoft, Google, Slack, Zapier, Make, n8n) use maxThirdPartyIntegrations limit
//   - Free: 0 (no platform integrations)
//   - Starter: 5 (pick any 5 from the list)
//   - Professional+: Unlimited
// - Custom OAuth Apps (user-created for external websites) are SEPARATE via maxCustomOAuthApps
//   - Free: 0, Starter: 2, Professional: 3
type IntegrationAccessCheck = {
  type: "feature" | "limit";
  key: string;
};

type IntegrationLogoVariants = {
  light: string;
  dark: string;
};

interface BuiltInIntegrationDefinition {
  id: string;
  name: string;
  description: string;
  logo: IntegrationLogoVariants;
  status: "available" | "coming_soon";
  type: "builtin" | "verified" | "special";
  accessCheck: IntegrationAccessCheck;
}

const BUILT_IN_INTEGRATIONS: BuiltInIntegrationDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Code hosting and deployment source",
    logo: {
      light: "/integrations-logos/github-light.svg",
      dark: "/integrations-logos/github-dark.svg",
    },
    status: "available",
    type: "builtin",
    // Deployment integrations use deploymentIntegrationsEnabled feature (available on Free tier)
    accessCheck: { type: "feature", key: "deploymentIntegrationsEnabled" },
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deploy and host web applications",
    logo: {
      light: "/integrations-logos/vercel-light.svg",
      dark: "/integrations-logos/vercel-dark.svg",
    },
    status: "available",
    type: "builtin",
    // Deployment integrations use deploymentIntegrationsEnabled feature (available on Free tier)
    accessCheck: { type: "feature", key: "deploymentIntegrationsEnabled" },
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Email, Calendar, OneDrive integration",
    logo: {
      light: "/integrations-logos/microsoft-light.svg",
      dark: "/integrations-logos/microsoft-dark.svg",
    },
    status: "available",
    type: "builtin",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "google",
    name: "Google Workspace",
    description: "Gmail, Calendar, Drive integration",
    logo: {
      light: "/integrations-logos/google-light.svg",
      dark: "/integrations-logos/google-dark.svg",
    },
    status: "available",
    type: "builtin",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team notifications and commands",
    logo: {
      light: "/integrations-logos/slack-light.svg",
      dark: "/integrations-logos/slack-dark.svg",
    },
    status: "coming_soon",
    type: "builtin",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 5,000+ apps",
    logo: {
      light: "/integrations-logos/zapier-light.svg",
      dark: "/integrations-logos/zapier-dark.svg",
    },
    status: "coming_soon",
    type: "verified",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Advanced workflow automation",
    logo: {
      light: "/integrations-logos/make-light.svg",
      dark: "/integrations-logos/make-dark.svg",
    },
    status: "coming_soon",
    type: "verified",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Open-source workflow automation",
    logo: {
      light: "/integrations-logos/n8n-light.svg",
      dark: "/integrations-logos/n8n-dark.svg",
    },
    status: "coming_soon",
    type: "verified",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    description: "Email marketing & CRM automation",
    logo: {
      light: "/integrations-logos/activecampaign-light.svg",
      dark: "/integrations-logos/activecampaign-dark.svg",
    },
    status: "available",
    type: "builtin",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Bot messaging & team group chat",
    logo: {
      light: "/integrations-logos/telegram-light.svg",
      dark: "/integrations-logos/telegram-dark.svg",
    },
    status: "available",
    type: "builtin",
    // Deployment integrations use deploymentIntegrationsEnabled feature (available on Free tier)
    accessCheck: { type: "feature", key: "deploymentIntegrationsEnabled" },
  },
  {
    id: "api-keys",
    name: "API Keys",
    description: "Direct API access credentials",
    logo: {
      light: "/integrations-logos/apiKeys-light.svg",
      dark: "/integrations-logos/apiKeys-dark.svg",
    },
    status: "available",
    type: "special",
    // API Keys always available (apiKeysEnabled: true for all tiers)
    accessCheck: { type: "feature", key: "apiKeysEnabled" },
  },
];

type SelectedIntegration =
  | { type: "builtin" | "verified" | "special"; id: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: "custom"; id: Id<"oauthApplications">; app: any };

interface CustomOAuthApplication {
  id: Id<"oauthApplications">;
  name: string;
  description?: string;
  isActive?: boolean;
  icon?: string;
}

interface UpgradeModalProps {
  feature: string;
  requiredTier: string;
  description: string;
  onClose: () => void;
}

/**
 * Upgrade Modal - Shows when user tries to access a locked feature
 */
function UpgradeModal({ feature, requiredTier, description, onClose }: UpgradeModalProps) {
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="border-4 shadow-lg max-w-md w-full mx-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - uses theme titlebar gradient */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'var(--win95-titlebar)',
            color: 'var(--win95-titlebar-text)',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Sparkles size={16} />
            Upgrade to Unlock
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
              borderColor: 'var(--warning)',
              background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)',
            }}
          >
            <Lock size={40} className="mx-auto mb-3" style={{ color: 'var(--warning)' }} />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--win95-text)' }}>
              {feature}
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {description}
            </p>
          </div>

          {/* Required tier */}
          <div
            className="p-3 border-2 rounded mb-4"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
              This feature requires <strong>{requiredTier}</strong> or higher.
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
              Upgrade now to connect with third-party automation platforms and unlock advanced integrations.
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-4 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                Connect up to 5 platform integrations (Microsoft, Google, Slack, Zapier, Make)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                Sync email, calendar, and automate workflows
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                Create up to 2 custom OAuth apps for external services
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleUpgradeClick}
              className="beveled-button-primary flex-1 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} />
              View Plans
            </button>
            <button
              onClick={onClose}
              className="beveled-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
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

/**
 * Limit Reached Modal - Shows when user hits their custom OAuth app limit
 */
interface LimitReachedModalProps {
  currentCount: number;
  limit: number;
  nextTier: string;
  onClose: () => void;
}

/**
 * Sign In Required Modal - Shows when unauthenticated users try to use integrations
 */
interface SignInRequiredModalProps {
  feature: string;
  description: string;
  onClose: () => void;
}

function SignInRequiredModal({ feature, description, onClose }: SignInRequiredModalProps) {
  const { openWindow } = useWindowManager();

  const handleSignInClick = () => {
    import("@/components/window-content/login-window").then(({ LoginWindow }) => {
      openWindow(
        "login",
        "Sign In",
        <LoginWindow />,
        { x: 200, y: 100 },
        { width: 400, height: 500 }
      );
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="border-4 shadow-lg max-w-md w-full mx-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <LogIn size={16} />
            Sign In to Continue
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
              borderColor: 'var(--win95-highlight)',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--win95-gradient-end) 10%, transparent) 0%, transparent 100%)',
            }}
          >
            <LogIn size={40} className="mx-auto mb-3" style={{ color: 'var(--win95-highlight)' }} />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--win95-text)' }}>
              {feature}
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {description}
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-4 space-y-2">
            <p className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
              Create a free account to:
            </p>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                Generate API keys for direct integrations
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                Create 1 custom OAuth app for external services
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <span className="text-xs" style={{ color: 'var(--win95-text)' }}>
                Upgrade to Starter for Microsoft, Google, Slack, Zapier & Make
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSignInClick}
              className="beveled-button-primary flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              Sign In / Sign Up
            </button>
            <button
              onClick={onClose}
              className="beveled-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              Just Browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Create Organization Required Modal - Shows when signed-in users without an org try to use integrations
 */
interface CreateOrgRequiredModalProps {
  feature: string;
  onClose: () => void;
}

function CreateOrgRequiredModal({ feature, onClose }: CreateOrgRequiredModalProps) {
  const { openWindow } = useWindowManager();

  const handleCreateOrgClick = () => {
    // Open the organizations window or a create org flow
    import("@/components/window-content/super-admin-organizations-window").then(({ OrganizationsWindow }) => {
      openWindow(
        "organizations",
        "Organizations",
        <OrganizationsWindow />,
        { x: 200, y: 100 },
        { width: 800, height: 600 }
      );
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="border-4 shadow-lg max-w-md w-full mx-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Building size={16} />
            Organization Required
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
          <div className="text-center mb-4">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--win95-gradient-end) 10%, transparent)' }}
            >
              <Building size={32} style={{ color: 'var(--win95-highlight)' }} />
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--win95-text)' }}>
              Create an Organization
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              To use {feature}, you need to create or join an organization first.
            </p>
          </div>

          <div
            className="p-3 border-2 rounded mb-4"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Organizations let you manage integrations, API keys, team members, and billing all in one place.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateOrgClick}
              className="beveled-button flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{
                background: 'var(--win95-highlight)',
              }}
            >
              <Building size={16} />
              Create Organization
            </button>
            <button
              onClick={onClose}
              className="beveled-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitReachedModal({ currentCount, limit, nextTier, onClose }: LimitReachedModalProps) {
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="border-4 shadow-lg max-w-md w-full mx-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'var(--warning)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Lock size={16} />
            Limit Reached
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
          <div className="text-center mb-4">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(245, 158, 11, 0.1)' }}
            >
              <Lock size={32} style={{ color: 'var(--warning)' }} />
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--win95-text)' }}>
              Custom Integration Limit Reached
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              You've used {currentCount} of {limit} custom integrations.
            </p>
          </div>

          <div
            className="p-3 border-2 rounded mb-4"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
              Upgrade to <strong>{nextTier}</strong> to create more custom OAuth integrations and unlock additional features.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleUpgradeClick}
              className="beveled-button flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{
                background: 'var(--win95-highlight)',
              }}
            >
              <ShoppingBag size={16} />
              View Plans
            </button>
            <button
              onClick={onClose}
              className="beveled-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface IntegrationsWindowProps {
  initialPanel?: "api-keys" | "microsoft" | null;
  /** When true, shows back-to-desktop navigation (for /integrations route) */
  fullScreen?: boolean;
}

export function IntegrationsWindow({ initialPanel = null, fullScreen = false }: IntegrationsWindowProps = {}) {
  const { isSignedIn, sessionId } = useAuth();
  const { mode } = useAppearance();
  const currentOrg = useCurrentOrganization();
  const [selectedIntegration, setSelectedIntegration] = useState<SelectedIntegration | null>(
    initialPanel === "api-keys" ? { type: "special", id: "api-keys" } :
    initialPanel === "microsoft" ? { type: "builtin", id: "microsoft" } :
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    feature: string;
    requiredTier: string;
    description: string;
  } | null>(null);
  const [limitReachedModal, setLimitReachedModal] = useState<{
    currentCount: number;
    limit: number;
    nextTier: string;
  } | null>(null);
  const [signInModal, setSignInModal] = useState<{
    feature: string;
    description: string;
  } | null>(null);
  const [createOrgModal, setCreateOrgModal] = useState<{
    feature: string;
  } | null>(null);

  // Query license/tier information - gracefully handle missing org
  const license = useQuery(
    api.licensing.helpers.getLicense,
    currentOrg?.id ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Query custom OAuth applications - gracefully returns empty array if no auth/org
  const customApps = useQuery(
    api.oauth.applications.listOAuthApplications,
    currentOrg?.id ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  ) as CustomOAuthApplication[] | undefined;

  // Query Microsoft connection status
  const microsoftConnection = useQuery(
    api.oauth.microsoft.getUserMicrosoftConnection,
    isSignedIn ? {} : "skip"
  );

  // Query Telegram integration status
  const telegramStatus = useQuery(
    api.integrations.telegram.getTelegramIntegrationStatus,
    isSignedIn && sessionId ? { sessionId } : "skip"
  );

  // Loading state only when we have an org and are waiting for data
  const isLoading = currentOrg?.id && (customApps === undefined || license === undefined);

  // Determine tier-based access
  const planTier = license?.planTier || "free";
  const isFreeTier = planTier === "free";
  const maxCustomOAuthApps = license?.limits?.maxCustomOAuthApps ?? 0; // Free: 0, Starter: 2, Pro: 3
  const currentCustomAppsCount = customApps?.length ?? 0;

  // Determine if user can take action (authenticated + has org)
  const canTakeAction = isSignedIn && currentOrg;

  const getIntegrationLogoSrc = (integration: BuiltInIntegrationDefinition) =>
    mode === "dark" ? integration.logo.dark : integration.logo.light;

  // Helper: Check if an integration is locked based on license data
  // Uses single source of truth from convex/licensing/tierConfigs.ts
  const isIntegrationLocked = (integration: BuiltInIntegrationDefinition): boolean => {
    // No license means we're loading or no org - show as locked
    if (!license) return true;

    const { accessCheck } = integration;

    if (accessCheck.type === "feature") {
      // Check feature flag from license.features
      const features = license.features as unknown as Record<string, unknown> | undefined;
      const featureEnabled = features?.[accessCheck.key] === true;
      return !featureEnabled;
    }

    if (accessCheck.type === "limit") {
      // Check limit from license.limits - locked if limit is 0 or undefined
      const limits = license.limits as unknown as Record<string, unknown> | undefined;
      const limitValue = limits?.[accessCheck.key];
      return typeof limitValue !== "number" || limitValue === 0;
    }

    return false;
  };

  // Helper: Get the required tier name for upgrade prompts
  // This maps license keys to their tier requirements from tierConfigs.ts
  // Reference: .kiro/platform_pricing_v2/LICENSING-ENFORCEMENT-MATRIX.md Section 16
  const getRequiredTierForAccess = (accessCheck: IntegrationAccessCheck): string => {
    // Map feature/limit keys to their required tiers (from tierConfigs.ts)
    // Platform integrations (maxThirdPartyIntegrations): Free: 0, Starter: 5, Pro+: Unlimited
    // Custom OAuth apps (maxCustomOAuthApps): Free: 1, Starter: 2, Pro: 3
    const tierRequirements: Record<string, string> = {
      // Limits - Platform Integrations
      maxThirdPartyIntegrations: "Starter (€199/month)", // Free tier has 0
      // Limits - Custom OAuth Apps
      maxCustomOAuthApps: "Free", // 1 available on free tier
      // Features
      apiKeysEnabled: "Free", // Always available
      apiWebhooksEnabled: "Starter (€199/month)",
      contactSyncEnabled: "Professional (€399/month)", // For syncing contacts
      cloudIntegrationEnabled: "Professional (€399/month)", // For media library cloud storage
    };
    return tierRequirements[accessCheck.key] || "a higher tier";
  };

  // Calculate next tier for upgrade prompts
  const getNextTier = (tier: string) => {
    const upgradePath: Record<string, string> = {
      free: "Starter (€199/month)",
      starter: "Professional (€399/month)",
      professional: "Agency (€599/month)",
      agency: "Enterprise (€1,500+/month)",
    };
    return upgradePath[tier] || "a higher tier";
  };

  // Handle integration click - allows read-only browsing for all authenticated users
  const handleIntegrationClick = (integration: BuiltInIntegrationDefinition) => {
    if (integration.status === "coming_soon") return;

    // Not signed in - show sign in modal
    if (!isSignedIn) {
      setSignInModal({
        feature: integration.name,
        description: integration.description,
      });
      return;
    }

    // Signed in but no org - show create org modal
    if (!currentOrg) {
      setCreateOrgModal({
        feature: integration.name,
      });
      return;
    }

    // Check if this integration is tier-gated based on license data
    if (isIntegrationLocked(integration)) {
      setUpgradeModal({
        feature: integration.name,
        requiredTier: getRequiredTierForAccess(integration.accessCheck),
        description: integration.description,
      });
      return;
    }

    // Allow access to integration settings
    setSelectedIntegration({ type: integration.type, id: integration.id });
  };

  // Handle custom app click
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCustomAppClick = (app: any) => {
    if (!canTakeAction) return; // Custom apps only shown to authenticated users with org
    setSelectedIntegration({ type: "custom", id: app.id, app });
  };

  // Handle add new integration click
  const handleAddNewClick = () => {
    // Not signed in - show sign in modal
    if (!isSignedIn) {
      setSignInModal({
        feature: "Custom Integration",
        description: "Create OAuth applications for external services",
      });
      return;
    }

    // Signed in but no org - show create org modal
    if (!currentOrg) {
      setCreateOrgModal({
        feature: "Custom Integrations",
      });
      return;
    }

    // Check if at limit
    if (currentCustomAppsCount >= maxCustomOAuthApps) {
      setLimitReachedModal({
        currentCount: currentCustomAppsCount,
        limit: maxCustomOAuthApps,
        nextTier: getNextTier(planTier),
      });
      return;
    }
    setShowCreateDialog(true);
  };

  // Handle back navigation
  const handleBack = () => {
    setSelectedIntegration(null);
  };

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: 'var(--win95-bg)' }}>
        <div className="text-center space-y-4">
          <i className="fas fa-lock text-4xl" style={{ color: 'var(--win95-text)' }} />
          <h3 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
            Sign In Required
          </h3>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            Please sign in to manage integrations and API keys.
          </p>
        </div>
      </div>
    );
  }

  // Show selected integration settings
  if (selectedIntegration) {
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "github") {
      return <GitHubSettings onBack={handleBack} />;
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "vercel") {
      return <VercelSettings onBack={handleBack} />;
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "microsoft") {
      return <MicrosoftSettings onBack={handleBack} />;
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "google") {
      return <GoogleSettings onBack={handleBack} />;
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "activecampaign") {
      return <ActiveCampaignSettings onBack={handleBack} />;
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "telegram") {
      return <TelegramSettings onBack={handleBack} />;
    }
    if (selectedIntegration.type === "special" && selectedIntegration.id === "api-keys") {
      return <ApiKeysPanel onBack={handleBack} />;
    }
    if (selectedIntegration.type === "custom") {
      return (
        <CustomIntegrationModal
          app={selectedIntegration.app}
          onBack={handleBack}
          onDeleted={handleBack}
        />
      );
    }
    // Placeholder for verified integrations (Zapier, Make)
    if (selectedIntegration.type === "verified") {
      const integration = BUILT_IN_INTEGRATIONS.find(i => i.id === selectedIntegration.id);
      return (
        <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
          <div className="px-4 py-3 border-b-2 flex items-center gap-2" style={{ borderColor: 'var(--win95-border)' }}>
            <button
              onClick={handleBack}
              className="text-sm hover:underline"
              style={{ color: 'var(--win95-highlight)' }}
            >
              &larr; Back
            </button>
            <span className="font-bold" style={{ color: 'var(--win95-text)' }}>
              {integration?.name}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="flex items-center justify-center">
                {integration ? (
                  <img
                    src={getIntegrationLogoSrc(integration)}
                    alt={`${integration.name} logo`}
                    draggable={false}
                    className="h-16 w-16 object-contain pointer-events-none select-none"
                  />
                ) : (
                  <i className="fas fa-plug text-5xl" style={{ color: "var(--win95-text)" }} aria-hidden="true" />
                )}
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
                {integration?.name} Integration
              </h3>
              <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
                To connect with {integration?.name}, create a custom OAuth application and use the provided credentials in your {integration?.name} workflow.
              </p>
              <div
                className="p-4 border-2 rounded text-left"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Steps to connect:
                </p>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--neutral-gray)' }}>
                  <li>Create a Custom Integration below</li>
                  <li>Copy the Client ID and Secret</li>
                  <li>Add them to your {integration?.name} workflow</li>
                  <li>Configure the OAuth scopes as needed</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  handleBack();
                  handleAddNewClick();
                }}
                className="beveled-button px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2 mx-auto"
                style={{
                  background: 'var(--win95-highlight)',
                }}
              >
                <Plus size={16} />
                Create Integration for {integration?.name}
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Placeholder for other built-in integrations
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
        <div className="px-4 py-3 border-b-2 flex items-center gap-2" style={{ borderColor: 'var(--win95-border)' }}>
          <button
            onClick={handleBack}
            className="text-sm hover:underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            &larr; Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            Coming soon...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <div className="flex items-center justify-between">
          {/* Back to desktop link (full-screen mode only) */}
          {fullScreen && (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors mr-3"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Back to Desktop"
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
              Integrations & API
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Connect third-party services and manage API access
            </p>
          </div>
          {/* Tier badge */}
          {license && (
            <div
              className="px-3 py-1 rounded text-xs font-bold"
              style={{
                background: isFreeTier ? 'var(--win95-bg-light)' : 'linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)',
                color: isFreeTier ? 'var(--neutral-gray)' : 'white',
                border: isFreeTier ? '1px solid var(--win95-border)' : 'none',
              }}
            >
              {license.name || planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan
            </div>
          )}

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/integrations"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors ml-3"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Open Full Screen"
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              Loading integrations...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Integrations Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Built-in Integrations Section */}
            <div className="mb-6">
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                Platform Integrations
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {BUILT_IN_INTEGRATIONS.map((integration) => {
                  // Check access using license data (single source of truth)
                  const isLocked = isIntegrationLocked(integration);

                  return (
                    <IntegrationCard
                      key={integration.id}
                      name={integration.name}
                      description={integration.description}
                      logoSrc={getIntegrationLogoSrc(integration)}
                      logoAlt={`${integration.name} logo`}
                      status={
                        isLocked
                          ? "locked"
                          : integration.id === "microsoft" && microsoftConnection?.status === "active"
                          ? "connected"
                          : integration.id === "telegram" && telegramStatus?.platformBot?.connected
                          ? "connected"
                          : integration.status
                      }
                      requiredTier={isLocked ? getRequiredTierForAccess(integration.accessCheck) : undefined}
                      onClick={() => handleIntegrationClick(integration)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Custom Integrations Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--win95-text)' }}>
                  Custom Integrations
                </h3>
                {/* Usage indicator */}
                <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {currentCustomAppsCount} / {maxCustomOAuthApps === -1 ? '∞' : maxCustomOAuthApps} used
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Custom OAuth apps */}
                {customApps?.map((app) => (
                  <IntegrationCard
                    key={app.id}
                    name={app.name}
                    description={app.description || "Custom OAuth application"}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    icon={(app as any).icon || "fas fa-globe"}
                    iconColor="var(--win95-gradient-end)"
                    status={app.isActive ? "connected" : "available"}
                    onClick={() => handleCustomAppClick(app)}
                  />
                ))}

                {/* Add New Integration Card */}
                <button
                  onClick={handleAddNewClick}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded border-2 border-dashed transition-colors group min-h-[120px]"
                  style={{
                    borderColor: currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1
                      ? 'var(--warning)'
                      : 'var(--win95-border)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1
                      ? '#d97706'
                      : 'var(--win95-highlight)';
                    e.currentTarget.style.background = 'var(--win95-bg-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1
                      ? 'var(--warning)'
                      : 'var(--win95-border)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1 ? (
                    <>
                      <Lock size={28} style={{ color: 'var(--warning)' }} className="group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                        Limit Reached
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus size={32} style={{ color: 'var(--neutral-gray)' }} className="group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold" style={{ color: 'var(--neutral-gray)' }}>
                        Add New
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Free tier upsell banner */}
            {isFreeTier && (
              <div
                className="mt-6 p-4 border-2 rounded"
                style={{
                  borderColor: 'var(--win95-highlight)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
                }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles size={24} className="flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
                  <div>
                    <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--win95-text)' }}>
                      Unlock Platform Integrations
                    </h4>
                    <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                      Upgrade to Starter to connect up to 5 platform integrations—Microsoft 365, Google Workspace, Slack, Zapier, or Make—and get 2 custom OAuth apps.
                    </p>
                    <button
                      onClick={() => setUpgradeModal({
                        feature: "Platform Integrations",
                        requiredTier: "Starter (€199/month)",
                        description: "Connect Microsoft 365, Google, Slack, Zapier, Make, and more",
                      })}
                      className="beveled-button beveled-button-sm px-3 py-1 text-xs font-bold text-white"
                      style={{
                        background: 'var(--win95-highlight)',
                      }}
                    >
                      View Plans
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2 border-t-2 text-xs"
            style={{
              borderColor: 'var(--win95-border)',
              color: 'var(--neutral-gray)'
            }}
          >
            Click an integration to configure it
          </div>
        </>
      )}

      {/* Create Integration Dialog */}
      {showCreateDialog && (
        <CreateIntegrationDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => setShowCreateDialog(false)}
        />
      )}

      {/* Upgrade Modal */}
      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal.feature}
          requiredTier={upgradeModal.requiredTier}
          description={upgradeModal.description}
          onClose={() => setUpgradeModal(null)}
        />
      )}

      {/* Limit Reached Modal */}
      {limitReachedModal && (
        <LimitReachedModal
          currentCount={limitReachedModal.currentCount}
          limit={limitReachedModal.limit}
          nextTier={limitReachedModal.nextTier}
          onClose={() => setLimitReachedModal(null)}
        />
      )}

      {/* Sign In Required Modal */}
      {signInModal && (
        <SignInRequiredModal
          feature={signInModal.feature}
          description={signInModal.description}
          onClose={() => setSignInModal(null)}
        />
      )}

      {/* Create Organization Required Modal */}
      {createOrgModal && (
        <CreateOrgRequiredModal
          feature={createOrgModal.feature}
          onClose={() => setCreateOrgModal(null)}
        />
      )}
    </div>
  );
}
