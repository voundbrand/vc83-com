"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
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
import { SlackSettings } from "./slack-settings";
import { WhatsAppSettings } from "./whatsapp-settings";
import { InfobipSettings } from "./infobip-settings";
import { AIConnectionsSettings } from "./ai-connections-settings";
import { ElevenLabsSettings } from "./elevenlabs-settings";
import { PersonalOperatorSetup } from "./personal-operator-setup";
import { CreateIntegrationDialog } from "./create-integration-dialog";
import { CustomIntegrationModal } from "./custom-integration-modal";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
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
  logo?: IntegrationLogoVariants;
  icon?: string;
  iconColor?: string;
  status: "available" | "coming_soon";
  type: "builtin" | "verified" | "special";
  accessCheck: IntegrationAccessCheck;
}

const BUILT_IN_INTEGRATIONS: BuiltInIntegrationDefinition[] = [
  {
    id: "personal-operator-setup",
    name: "Personal Operator Setup",
    description: "First-run setup for calendar, outreach defaults, and deployment handoff",
    icon: "fas fa-user-check",
    iconColor: "var(--tone-accent)",
    status: "available",
    type: "special",
    accessCheck: { type: "feature", key: "apiKeysEnabled" },
  },
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
    status: "available",
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
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Meta Cloud API for your own verified business number",
    icon: "fab fa-whatsapp",
    iconColor: "#25D366",
    status: "available",
    type: "builtin",
    // Platform integrations use maxThirdPartyIntegrations limit (Free: 0, Starter+: available)
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "infobip",
    name: "Infobip",
    description: "SMS + voice bridge orchestration (BYOK or platform fallback)",
    icon: "fas fa-phone-volume",
    iconColor: "#FF6B00",
    status: "available",
    type: "builtin",
    accessCheck: { type: "limit", key: "maxThirdPartyIntegrations" },
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "Voice runtime provider, key source, and default voice catalog",
    icon: "fas fa-wave-square",
    iconColor: "var(--tone-accent)",
    status: "available",
    type: "special",
    accessCheck: { type: "feature", key: "aiEnabled" },
  },
  {
    id: "ai-connections",
    name: "AI Connections",
    description:
      "OpenAI, Anthropic, Gemini, Grok, Mistral, Kimi, OpenRouter, ElevenLabs, and private OpenAI-compatible connectors",
    icon: "fas fa-brain",
    iconColor: "var(--tone-accent)",
    status: "available",
    type: "special",
    accessCheck: { type: "feature", key: "aiEnabled" },
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
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

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
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - uses theme titlebar gradient */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'var(--window-titlebar-bg)',
            color: 'var(--window-document-text)',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Sparkles size={16} />
            {tx("ui.integrations.modals.upgrade.title", "Upgrade to Unlock")}
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
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--window-document-text)' }}>
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
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.integrations.modals.upgrade.requires_prefix", "This feature requires")} <strong>{requiredTier}</strong>{" "}
              {tx("ui.integrations.modals.upgrade.requires_suffix", "or higher.")}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.integrations.modals.upgrade.body",
                "Upgrade now to connect with third-party automation platforms and unlock advanced integrations.",
              )}
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-4 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--tone-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                {tx(
                  "ui.integrations.modals.upgrade.benefit_1",
                  "Connect up to 5 platform integrations (Microsoft, Google, Slack, Zapier, Make)",
                )}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--tone-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.modals.upgrade.benefit_2", "Sync email, calendar, and automate workflows")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--tone-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.modals.upgrade.benefit_3", "Create up to 2 custom OAuth apps for external services")}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleUpgradeClick}
              className="desktop-interior-button-primary flex-1 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} />
              {tx("ui.integrations.shared.view_plans", "View Plans")}
            </button>
            <button
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              {tx("ui.integrations.modals.upgrade.maybe_later", "Maybe Later")}
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
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

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
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'linear-gradient(90deg, var(--tone-accent) 0%, var(--tone-accent-strong) 100%)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <LogIn size={16} />
            {tx("ui.integrations.modals.sign_in.title", "Sign In to Continue")}
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
              borderColor: 'var(--tone-accent)',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--tone-accent-strong) 10%, transparent) 0%, transparent 100%)',
            }}
          >
            <LogIn size={40} className="mx-auto mb-3" style={{ color: 'var(--tone-accent)' }} />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--window-document-text)' }}>
              {feature}
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {description}
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-4 space-y-2">
            <p className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.integrations.modals.sign_in.create_account_to", "Create a free account to:")}
            </p>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--tone-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.modals.sign_in.benefit_1", "Generate API keys for direct integrations")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--tone-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.modals.sign_in.benefit_2", "Create 1 custom OAuth app for external services")}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--tone-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.modals.sign_in.benefit_3", "Upgrade to Starter for Microsoft, Google, Slack, Zapier & Make")}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSignInClick}
              className="desktop-interior-button-primary flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              {tx("ui.integrations.modals.sign_in.cta", "Sign In / Sign Up")}
            </button>
            <button
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              {tx("ui.integrations.modals.sign_in.just_browsing", "Just Browsing")}
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
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

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
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            background: 'linear-gradient(90deg, var(--tone-accent) 0%, var(--tone-accent-strong) 100%)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Building size={16} />
            {tx("ui.integrations.modals.create_org.title", "Organization Required")}
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
              style={{ background: 'color-mix(in srgb, var(--tone-accent-strong) 10%, transparent)' }}
            >
              <Building size={32} style={{ color: 'var(--tone-accent)' }} />
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.integrations.modals.create_org.heading", "Create an Organization")}
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {tx("ui.integrations.modals.create_org.body", "To use {feature}, you need to create or join an organization first.", {
                feature,
              })}
            </p>
          </div>

          <div
            className="p-3 border-2 rounded mb-4"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.integrations.modals.create_org.benefit",
                "Organizations let you manage integrations, API keys, team members, and billing all in one place.",
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateOrgClick}
              className="desktop-interior-button flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{
                background: 'var(--tone-accent)',
              }}
            >
              <Building size={16} />
              {tx("ui.integrations.modals.create_org.cta", "Create Organization")}
            </button>
            <button
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              {tx("ui.integrations.shared.close", "Close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitReachedModal({ currentCount, limit, nextTier, onClose }: LimitReachedModalProps) {
  const { openWindow } = useWindowManager();
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

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
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
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
            {tx("ui.integrations.modals.limit_reached.title", "Limit Reached")}
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
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.integrations.modals.limit_reached.heading", "Custom Integration Limit Reached")}
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {tx("ui.integrations.modals.limit_reached.body", "You've used {currentCount} of {limit} custom integrations.", {
                currentCount,
                limit,
              })}
            </p>
          </div>

          <div
            className="p-3 border-2 rounded mb-4"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.integrations.modals.limit_reached.upgrade_prefix", "Upgrade to")} <strong>{nextTier}</strong>{" "}
              {tx("ui.integrations.modals.limit_reached.upgrade_suffix", "to create more custom OAuth integrations and unlock additional features.")}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleUpgradeClick}
              className="desktop-interior-button flex-1 px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{
                background: 'var(--tone-accent)',
              }}
            >
              <ShoppingBag size={16} />
              {tx("ui.integrations.shared.view_plans", "View Plans")}
            </button>
            <button
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              {tx("ui.integrations.shared.close", "Close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface IntegrationsWindowProps {
  initialPanel?:
    | "api-keys"
    | "microsoft"
    | "telegram"
    | "infobip"
    | "elevenlabs"
    | "personal-operator-setup"
    | null;
  /** When true, shows back-to-desktop navigation (for /integrations route) */
  fullScreen?: boolean;
}

type IntegrationLicenseSnapshot = {
  name?: string;
  planTier?: string;
  features?: Record<string, unknown>;
  limits?: Record<string, unknown> & {
    maxCustomOAuthApps?: number;
  };
};

type AIConnectionsCatalogSnapshot = {
  providers?: Array<{
    providerId?: string;
    isConnected?: boolean;
  }>;
};

type ElevenLabsIntegrationSnapshot = {
  enabled?: boolean;
  hasApiKey?: boolean;
  hasPlatformApiKey?: boolean;
  billingSource?: "platform" | "byok" | "private";
};

export function IntegrationsWindow({ initialPanel = null, fullScreen = false }: IntegrationsWindowProps = {}) {
  const { isSignedIn, sessionId } = useAuth();
  const { mode } = useAppearance();
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const currentOrg = useCurrentOrganization();
  const [selectedIntegration, setSelectedIntegration] = useState<SelectedIntegration | null>(
    initialPanel === "api-keys" ? { type: "special", id: "api-keys" } :
    initialPanel === "microsoft" ? { type: "builtin", id: "microsoft" } :
    initialPanel === "telegram" ? { type: "builtin", id: "telegram" } :
    initialPanel === "infobip" ? { type: "builtin", id: "infobip" } :
    initialPanel === "elevenlabs" ? { type: "special", id: "elevenlabs" } :
    initialPanel === "personal-operator-setup" ? { type: "special", id: "personal-operator-setup" } :
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

  // TS2589 workaround: keep generated Convex API query inference from expanding too deeply in this large component.
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown,
  ) => unknown;
  const apiUntyped = api as any;
  const getLicenseQuery = apiUntyped.licensing.helpers.getLicense;
  const listOAuthApplicationsQuery = apiUntyped.oauth.applications.listOAuthApplications;

  // Query license/tier information - gracefully handle missing org
  const license = unsafeUseQuery(
    getLicenseQuery,
    currentOrg?.id ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip",
  ) as IntegrationLicenseSnapshot | undefined;

  // Query custom OAuth applications - gracefully returns empty array if no auth/org
  const customApps = unsafeUseQuery(
    listOAuthApplicationsQuery,
    currentOrg?.id ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip",
  ) as CustomOAuthApplication[] | undefined;

  // Query Microsoft connection status
  const microsoftConnection = useQuery(
    api.oauth.microsoft.getUserMicrosoftConnection,
    isSignedIn ? {} : "skip"
  );
  const googleConnection = useQuery(
    api.oauth.google.getGoogleConnectionStatus,
    isSignedIn && sessionId ? { sessionId } : "skip"
  ) as {
    personal?: {
      status?: string;
    } | null;
  } | undefined;

  // Query Telegram integration status
  const telegramStatus = useQuery(
    api.integrations.telegram.getTelegramIntegrationStatus,
    isSignedIn && sessionId ? { sessionId } : "skip"
  );

  // Query Slack connection status
  const slackConnection = useQuery(
    api.oauth.slack.getSlackConnectionStatus,
    isSignedIn && sessionId ? { sessionId } : "skip"
  );
  const whatsappConnection = useQuery(
    api.oauth.whatsapp.getWhatsAppConnectionStatus,
    isSignedIn && sessionId ? { sessionId } : "skip"
  );
  const infobipSettings = useQuery(
    api.integrations.infobip.getInfobipSettings,
    isSignedIn && sessionId ? { sessionId } : "skip"
  ) as {
    configured?: boolean;
    enabled?: boolean;
  } | undefined;
  const aiConnectionsCatalog = useQuery(
    apiUntyped.integrations.aiConnections.getAIConnectionCatalog,
    isSignedIn && sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  ) as AIConnectionsCatalogSnapshot | undefined;
  const elevenLabsSettings = useQuery(
    apiUntyped.integrations.elevenlabs.getElevenLabsSettings,
    isSignedIn && sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  ) as ElevenLabsIntegrationSnapshot | undefined;

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
    integration.logo ? (mode === "dark" ? integration.logo.dark : integration.logo.light) : undefined;

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
      aiEnabled: "Starter (€199/month)",
      aiByokEnabled: "Scale (€299/month)",
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
      professional: "Scale (€599/month)",
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
        feature: tx("ui.integrations.custom_integration", "Custom Integration"),
        description: tx("ui.integrations.custom_integration_description", "Create OAuth applications for external services"),
      });
      return;
    }

    // Signed in but no org - show create org modal
    if (!currentOrg) {
      setCreateOrgModal({
        feature: tx("ui.integrations.custom_integrations", "Custom Integrations"),
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
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: 'var(--window-document-bg)' }}>
        <div className="text-center space-y-4">
          <i className="fas fa-lock text-4xl" style={{ color: 'var(--window-document-text)' }} />
          <h3 className="font-bold text-lg" style={{ color: 'var(--window-document-text)' }}>
            {tx("ui.integrations.sign_in_required", "Sign In Required")}
          </h3>
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            {tx("ui.integrations.sign_in_required_body", "Please sign in to manage integrations and API keys.")}
          </p>
        </div>
      </div>
    );
  }

  // Show selected integration settings
  if (selectedIntegration) {
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "github") {
      return (
        <div className="integration-ui-scope h-full">
          <GitHubSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "vercel") {
      return (
        <div className="integration-ui-scope h-full">
          <VercelSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "microsoft") {
      return (
        <div className="integration-ui-scope h-full">
          <MicrosoftSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "google") {
      return (
        <div className="integration-ui-scope h-full">
          <GoogleSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "slack") {
      return (
        <div className="integration-ui-scope h-full">
          <SlackSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "activecampaign") {
      return (
        <div className="integration-ui-scope h-full">
          <ActiveCampaignSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "telegram") {
      return (
        <div className="integration-ui-scope h-full">
          <TelegramSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "whatsapp") {
      return (
        <div className="integration-ui-scope h-full">
          <WhatsAppSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "builtin" && selectedIntegration.id === "infobip") {
      return (
        <div className="integration-ui-scope h-full">
          <InfobipSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "special" && selectedIntegration.id === "api-keys") {
      return (
        <div className="integration-ui-scope h-full">
          <ApiKeysPanel onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "special" && selectedIntegration.id === "personal-operator-setup") {
      return (
        <div className="integration-ui-scope h-full">
          <PersonalOperatorSetup
            onBack={handleBack}
            onOpenIntegration={(integrationId) =>
              setSelectedIntegration({ type: "builtin", id: integrationId })
            }
          />
        </div>
      );
    }
    if (selectedIntegration.type === "special" && selectedIntegration.id === "ai-connections") {
      return (
        <div className="integration-ui-scope h-full">
          <AIConnectionsSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "special" && selectedIntegration.id === "elevenlabs") {
      return (
        <div className="integration-ui-scope h-full">
          <ElevenLabsSettings onBack={handleBack} />
        </div>
      );
    }
    if (selectedIntegration.type === "custom") {
      return (
        <div className="integration-ui-scope h-full">
          <CustomIntegrationModal
            app={selectedIntegration.app}
            onBack={handleBack}
            onDeleted={handleBack}
          />
        </div>
      );
    }
    // Placeholder for verified integrations (Zapier, Make)
    if (selectedIntegration.type === "verified") {
      const integration = BUILT_IN_INTEGRATIONS.find(i => i.id === selectedIntegration.id);
      return (
        <div className="integration-ui-scope flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
          <div className="px-4 py-3 border-b-2 flex items-center gap-2" style={{ borderColor: 'var(--window-document-border)' }}>
            <button
              onClick={handleBack}
              className="text-sm hover:underline flex items-center gap-1"
              style={{ color: 'var(--tone-accent)' }}
            >
              <ArrowLeft size={12} />
              {tx("ui.integrations.shared.back", "Back")}
            </button>
            <span className="font-bold" style={{ color: 'var(--window-document-text)' }}>
              {integration?.name}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="flex items-center justify-center">
                {integration && getIntegrationLogoSrc(integration) ? (
                  <img
                    src={getIntegrationLogoSrc(integration)}
                    alt={tx("ui.integrations.integration_logo_alt", "{name} logo", { name: integration.name })}
                    draggable={false}
                    className="h-16 w-16 object-contain pointer-events-none select-none"
                  />
                ) : (
                  <i className="fas fa-plug text-5xl" style={{ color: "var(--window-document-text)" }} aria-hidden="true" />
                )}
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.integration_title", "{name} Integration", { name: integration?.name ?? "" })}
              </h3>
              <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
                {tx(
                  "ui.integrations.integration_connect_body",
                  "To connect with {name}, create a custom OAuth application and use the provided credentials in your {name} workflow.",
                  { name: integration?.name ?? "" },
                )}
              </p>
              <div
                className="p-4 border-2 rounded text-left"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)',
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                  {tx("ui.integrations.steps_to_connect", "Steps to connect:")}
                </p>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--neutral-gray)' }}>
                  <li>{tx("ui.integrations.step_create_custom", "Create a Custom Integration below")}</li>
                  <li>{tx("ui.integrations.step_copy_client", "Copy the Client ID and Secret")}</li>
                  <li>{tx("ui.integrations.step_add_workflow", "Add them to your {name} workflow", { name: integration?.name ?? "" })}</li>
                  <li>{tx("ui.integrations.step_configure_scopes", "Configure the OAuth scopes as needed")}</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  handleBack();
                  handleAddNewClick();
                }}
                className="desktop-interior-button px-4 py-2 text-sm font-bold text-white flex items-center justify-center gap-2 mx-auto"
                style={{
                  background: 'var(--tone-accent)',
                }}
              >
                <Plus size={16} />
                {tx("ui.integrations.create_integration_for", "Create Integration for {name}", { name: integration?.name ?? "" })}
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Placeholder for other built-in integrations
    return (
      <div className="integration-ui-scope flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
        <div className="px-4 py-3 border-b-2 flex items-center gap-2" style={{ borderColor: 'var(--window-document-border)' }}>
          <button
            onClick={handleBack}
            className="text-sm hover:underline flex items-center gap-1"
            style={{ color: 'var(--tone-accent)' }}
          >
            <ArrowLeft size={12} />
            {tx("ui.integrations.shared.back", "Back")}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            {tx("ui.integrations.coming_soon", "Coming soon...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-ui-scope flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--window-document-border)' }}>
        <div className="flex items-center justify-between">
          {/* Back to desktop link (full-screen mode only) */}
          {fullScreen && (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors mr-3"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              title={tx("ui.integrations.back_to_desktop", "Back to Desktop")}
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.integrations.header_title", "Integrations & API")}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {tx("ui.integrations.header_subtitle", "Connect third-party services and manage API access")}
            </p>
          </div>
          {/* Tier badge */}
          {license && (
            <div
              className="px-3 py-1 rounded text-xs font-bold"
              style={{
                background: isFreeTier ? 'var(--window-document-bg-elevated)' : 'linear-gradient(135deg, var(--tone-accent) 0%, var(--tone-accent-strong) 100%)',
                color: isFreeTier ? 'var(--neutral-gray)' : '#0f0f0f',
                border: isFreeTier ? '1px solid var(--window-document-border)' : 'none',
              }}
            >
              {license.name || planTier.charAt(0).toUpperCase() + planTier.slice(1)} {tx("ui.integrations.plan", "Plan")}
            </div>
          )}

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/integrations"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors ml-3"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
              title={tx("ui.integrations.open_full_screen", "Open Full Screen")}
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
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tone-accent)' }} />
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {tx("ui.integrations.loading_integrations", "Loading integrations...")}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Integrations Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Built-in Integrations Section */}
            <div className="mb-6">
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--window-document-text)' }}>
                {tx("ui.integrations.platform_integrations", "Platform Integrations")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {BUILT_IN_INTEGRATIONS.map((integration) => {
                  // Check access using license data (single source of truth)
                  const isLocked = isIntegrationLocked(integration);
                  const elevenLabsConnected =
                    Boolean(elevenLabsSettings?.enabled) &&
                    (
                      elevenLabsSettings?.billingSource === "platform"
                        ? Boolean(elevenLabsSettings?.hasPlatformApiKey)
                        : Boolean(elevenLabsSettings?.hasApiKey)
                    );

                  return (
                    <IntegrationCard
                      key={integration.id}
                      name={integration.name}
                      description={integration.description}
                      logoSrc={getIntegrationLogoSrc(integration)}
                      icon={integration.icon}
                      iconColor={integration.iconColor}
                      logoAlt={`${integration.name} logo`}
                      status={
                        isLocked
                          ? "locked"
                          : integration.id === "personal-operator-setup" &&
                            googleConnection?.personal?.status === "active"
                          ? "connected"
                          : integration.id === "ai-connections" &&
                            Boolean(
                              aiConnectionsCatalog?.providers?.some(
                                (provider) => provider.isConnected
                              )
                            )
                          ? "connected"
                          : integration.id === "elevenlabs" && elevenLabsConnected
                          ? "connected"
                          : integration.id === "microsoft" && microsoftConnection?.status === "active"
                          ? "connected"
                          : integration.id === "slack" && slackConnection?.connected
                          ? "connected"
                          : integration.id === "telegram" && (telegramStatus?.platformBot?.connected || telegramStatus?.customBot?.deployed)
                          ? "connected"
                          : integration.id === "whatsapp" && whatsappConnection?.connected
                          ? "connected"
                          : integration.id === "infobip" && infobipSettings?.configured && infobipSettings?.enabled
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
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--window-document-text)' }}>
                  {tx("ui.integrations.custom_integrations", "Custom Integrations")}
                </h3>
                {/* Usage indicator */}
                <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {currentCustomAppsCount} / {maxCustomOAuthApps === -1 ? '∞' : maxCustomOAuthApps} {tx("ui.integrations.used", "used")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Custom OAuth apps */}
                {customApps?.map((app) => (
                  <IntegrationCard
                    key={app.id}
                    name={app.name}
                    description={app.description || tx("ui.integrations.custom_oauth_application", "Custom OAuth application")}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    icon={(app as any).icon || "fas fa-globe"}
                    iconColor="var(--tone-accent-strong)"
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
                      : 'var(--window-document-border)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1
                      ? '#d97706'
                      : 'var(--tone-accent)';
                    e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1
                      ? 'var(--warning)'
                      : 'var(--window-document-border)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {currentCustomAppsCount >= maxCustomOAuthApps && maxCustomOAuthApps !== -1 ? (
                    <>
                      <Lock size={28} style={{ color: 'var(--warning)' }} className="group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                        {tx("ui.integrations.limit_reached", "Limit Reached")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus size={32} style={{ color: 'var(--neutral-gray)' }} className="group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold" style={{ color: 'var(--neutral-gray)' }}>
                        {tx("ui.integrations.add_new", "Add New")}
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
                  borderColor: 'var(--tone-accent)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
                }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles size={24} className="flex-shrink-0" style={{ color: 'var(--tone-accent)' }} />
                  <div>
                    <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--window-document-text)' }}>
                      {tx("ui.integrations.unlock_platform_integrations", "Unlock Platform Integrations")}
                    </h4>
                    <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                      {tx(
                        "ui.integrations.unlock_platform_integrations_body",
                        "Upgrade to Starter to connect up to 5 platform integrations—Microsoft 365, Google Workspace, Slack, WhatsApp, Zapier, or Make—and get 2 custom OAuth apps.",
                      )}
                    </p>
                    <button
                      onClick={() => setUpgradeModal({
                        feature: tx("ui.integrations.platform_integrations", "Platform Integrations"),
                        requiredTier: tx("ui.integrations.starter_tier", "Starter (€199/month)"),
                        description: tx("ui.integrations.platform_integrations_description", "Connect Microsoft 365, Google, Slack, WhatsApp, Zapier, Make, and more"),
                      })}
                      className="desktop-interior-button px-3 py-1 text-xs font-bold text-white"
                      style={{
                        background: 'var(--tone-accent)',
                      }}
                    >
                      {tx("ui.integrations.shared.view_plans", "View Plans")}
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
              borderColor: 'var(--window-document-border)',
              color: 'var(--neutral-gray)'
            }}
          >
            {tx("ui.integrations.footer_hint", "Click an integration to configure it")}
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
