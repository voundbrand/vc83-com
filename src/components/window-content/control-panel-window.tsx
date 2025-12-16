"use client";

import { useWindowManager } from "@/hooks/use-window-manager";
import { SettingsWindow } from "./settings-window";
import { ManageWindow } from "./org-owner-manage-window";
import { TranslationsWindow } from "./translations-window";
import { OrganizationsWindow } from "./super-admin-organizations-window";
import { IntegrationsWindow } from "./integrations-window";
import { QuickStartICPSelector } from "@/components/quick-start";
import { usePermissions } from "@/contexts/permission-context";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ControlPanelItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  description?: string;
}

export function ControlPanelWindow() {
  const { openWindow } = useWindowManager();
  const { isSuperAdmin } = usePermissions();
  const { canPerform, isSignedIn } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.controlpanel");

  const openDesktopSettings = () => {
    openWindow(
      "desktop-settings",
      "Desktop Settings",
      <SettingsWindow />,
      { x: 350, y: 150 },
      { width: 500, height: 600 }
    );
  };

  const openManageWindow = () => {
    openWindow(
      "manage",
      "Manage",
      <ManageWindow />,
      { x: 200, y: 50 },
      { width: 1200, height: 700 }
    );
  };

  const openIntegrationsWindow = () => {
    openWindow(
      "integrations",
      "Integrations & API",
      <IntegrationsWindow />,
      { x: 150, y: 100 },
      { width: 900, height: 650 },
      "ui.windows.integrations.title",
      "🔗"
    );
  };

  const openTranslations = () => {
    openWindow(
      "translations",
      "Translations",
      <TranslationsWindow />,
      { x: 200, y: 100 },
      { width: 1000, height: 700 }
    );
  };

  const openOrganizations = () => {
    openWindow(
      "organizations",
      "System Organizations",
      <OrganizationsWindow />,
      { x: 250, y: 140 },
      { width: 800, height: 600 }
    );
  };

  const openTutorialsWindow = () => {
    openWindow(
      "tutorials-docs",
      "Tutorials & Docs",
      undefined, // Component will be loaded from registry
      { x: 150, y: 80 },
      { width: 1000, height: 700 },
      undefined,
      "📚"
    );
  };

  const openQuickStartWindow = () => {
    openWindow(
      "quick-start",
      "Quick Start",
      <div className="p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--win95-text)' }}>
          Configure Your Workspace
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--neutral-gray)' }}>
          Choose a profile to automatically configure apps and templates for your use case.
        </p>
        <QuickStartICPSelector
          onComplete={(icpId) => {
            console.log("Quick Start completed:", icpId);
          }}
        />
      </div>,
      { x: 200, y: 100 },
      { width: 900, height: 700 },
      undefined,
      "🚀"
    );
  };

  // Base items that everyone sees
  const baseItems: ControlPanelItem[] = [
    {
      id: "desktop",
      icon: "🖥️",
      label: t('ui.controlpanel.item.desktop'),
      onClick: openDesktopSettings,
      description: "Appearance, wallpaper, and region settings",
    },
    {
      id: "quick-start",
      icon: "🚀",
      label: "Quick Start",
      onClick: openQuickStartWindow,
      description: "Configure your workspace for your use case",
    },
    {
      id: "tutorials",
      icon: "📚",
      label: "Tutorials & Docs",
      onClick: openTutorialsWindow,
      description: "Step-by-step guides and documentation to help you master l4yercak3",
    },
  ];

  // Conditionally add items based on permissions
  const controlPanelItems: ControlPanelItem[] = [...baseItems];

  // Manage - requires being signed in with an organization
  // Free users who own their organization should see this
  if (isSignedIn && currentOrg && (canPerform('manage_users') || canPerform('manage_organization') || currentOrg.isOwner)) {
    controlPanelItems.push({
      id: "manage",
      icon: "🏢",
      label: t('ui.controlpanel.item.manage'),
      onClick: openManageWindow,
      description: "Organization settings, users, and security",
    });
  }

  // Integrations & API - available to all signed-in users with an organization
  if (isSignedIn && currentOrg) {
    controlPanelItems.push({
      id: "integrations",
      icon: "🔗",
      label: "Integrations & API",
      onClick: openIntegrationsWindow,
      description: "Connect third-party services and manage API keys",
    });
  }

  // Translations - requires manage_translations
  if (canPerform('manage_translations')) {
    controlPanelItems.push({
      id: "translations",
      icon: "🌐",
      label: t('ui.controlpanel.item.translations'),
      onClick: openTranslations,
      description: "Manage platform translations",
    });
  }

  // System Organizations - requires create_system_organization (super admin only)
  if (canPerform('create_system_organization')) {
    controlPanelItems.push({
      id: "system-organizations",
      icon: "🏢",
      label: t('ui.controlpanel.item.system_organizations'),
      onClick: openOrganizations,
      description: "Manage all organizations in the system",
    });
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
          {t('ui.controlpanel.description')}
          {isSuperAdmin && (
            <span className="ml-2 font-bold text-green-600">
              [SUPER ADMIN MODE]
            </span>
          )}
        </p>
      </div>

      {/* Icon Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {controlPanelItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded transition-colors group"
              style={{
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 128, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title={item.description}
            >
              <div className="text-4xl">{item.icon}</div>
              <span className="text-xs text-center font-medium" style={{ color: 'var(--win95-text)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Help text for users without an organization */}
        {isSignedIn && !currentOrg && (
          <div
            className="mt-6 p-4 border-2 rounded"
            style={{
              borderColor: 'var(--win95-highlight)',
              background: 'var(--win95-bg-light)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--win95-text)' }}>
              <strong>Looking for more options?</strong>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Create or join an organization to access Integrations, API Keys, and organization management features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
