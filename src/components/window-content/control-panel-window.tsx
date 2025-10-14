"use client";

import { useWindowManager } from "@/hooks/use-window-manager";
import { SettingsWindow } from "./settings-window";
import { ManageWindow } from "./manage-window";
import { OntologyAdminWindow } from "./ontology-admin";
import { TranslationsWindow } from "./translations-window";
import { OrganizationsWindow } from "./organizations-window";
import { usePermissions } from "@/contexts/permission-context";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/contexts/translation-context";

interface ControlPanelItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

export function ControlPanelWindow() {
  const { openWindow } = useWindowManager();
  const { isSuperAdmin } = usePermissions();
  const { canPerform } = useAuth();
  const { t } = useTranslation();

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
      { width: 950, height: 600 }
    );
  };

  const openOntologyAdmin = () => {
    // Full screen window for ontology admin
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    openWindow(
      "ontology-admin",
      "🥷 Ontology Admin",
      <OntologyAdminWindow />,
      { x: 20, y: 20 },
      { width: screenWidth - 40, height: screenHeight - 40 }
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

  // Base items that everyone sees
  const baseItems: ControlPanelItem[] = [
    {
      id: "desktop",
      icon: "🖥️",
      label: t('ui.controlpanel.item.desktop'),
      onClick: openDesktopSettings,
    },
  ];

  // Conditionally add items based on permissions
  const controlPanelItems: ControlPanelItem[] = [...baseItems];

  // Manage - requires manage_users or manage_organization
  if (canPerform('manage_users') || canPerform('manage_organization')) {
    controlPanelItems.push({
      id: "manage",
      icon: "🏢",
      label: t('ui.controlpanel.item.manage'),
      onClick: openManageWindow,
    });
  }

  // Translations - requires manage_translations
  if (canPerform('manage_translations')) {
    controlPanelItems.push({
      id: "translations",
      icon: "🌐",
      label: t('ui.controlpanel.item.translations'),
      onClick: openTranslations,
    });
  }

  // System Organizations - requires create_system_organization (super admin only)
  if (canPerform('create_system_organization')) {
    controlPanelItems.push({
      id: "system-organizations",
      icon: "🏢",
      label: t('ui.controlpanel.item.system_organizations'),
      onClick: openOrganizations,
    });
  }

  // Ontology - requires manage_ontology (super admin only)
  if (canPerform('manage_ontology')) {
    controlPanelItems.push({
      id: "ontology-admin",
      icon: "🥷",
      label: t('ui.controlpanel.item.ontology'),
      onClick: openOntologyAdmin,
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
            >
              <div className="text-4xl">{item.icon}</div>
              <span className="text-xs text-center font-medium" style={{ color: 'var(--win95-text)' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
