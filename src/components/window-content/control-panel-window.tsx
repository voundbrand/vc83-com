"use client";

import { useWindowManager } from "@/hooks/use-window-manager";
import { SettingsWindow } from "./settings-window";
import { ManageWindow } from "./manage-window";
import { OntologyAdminWindow } from "./ontology-admin";
import { TranslationsWindow } from "./translations-window";
import { usePermissions } from "@/contexts/permission-context";

interface ControlPanelItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

export function ControlPanelWindow() {
  const { openWindow } = useWindowManager();
  const { isSuperAdmin } = usePermissions();

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
      { width: 800, height: 600 }
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

  const baseItems: ControlPanelItem[] = [
    {
      id: "manage",
      icon: "🏢",
      label: "Manage",
      onClick: openManageWindow,
    },
    {
      id: "desktop",
      icon: "🖥️",
      label: "Desktop",
      onClick: openDesktopSettings,
    },
    {
      id: "translations",
      icon: "🌐",
      label: "Translations",
      onClick: openTranslations,
    },
  ];

  // Add ontology admin icon if user is super admin
  const controlPanelItems: ControlPanelItem[] = isSuperAdmin
    ? [
        ...baseItems,
        {
          id: "ontology-admin",
          icon: "🥷",
          label: "Ontology",
          onClick: openOntologyAdmin,
        },
      ]
    : baseItems;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
        <p className="text-sm" style={{ color: 'var(--win95-text)' }}>
          Use the settings in Control Panel to personalize your workspace.
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
