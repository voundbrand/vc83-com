"use client";

import type { ReactNode } from "react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { SettingsWindow } from "./settings-window";
import { ManageWindow } from "./org-owner-manage-window";
import { TranslationsWindow } from "./translations-window";
import { OrganizationsWindow } from "./super-admin-organizations-window";
import { IntegrationsWindow } from "./integrations-window";
import { AiSystemWindow } from "./ai-system-window";
import { TerminalWindow } from "./terminal-window";
import { usePermissions } from "@/contexts/permission-context";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  ShellBotIcon,
  ShellBrainIcon,
  ShellDocsIcon,
  ShellIntegrationsIcon,
  ShellPeopleIcon,
  ShellSettingsIcon,
  ShellTerminalIcon,
  ShellTranslationsIcon,
} from "@/components/icons/shell-icons";
import {
  InteriorHeader,
  InteriorHelperText,
  InteriorPanel,
  InteriorRoot,
  InteriorTileButton,
} from "@/components/window-content/shared/interior-primitives";

interface ControlPanelItem {
  id: string;
  icon: ReactNode;
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
    openWindow("desktop-settings", "Desktop Settings", <SettingsWindow />, { x: 350, y: 150 }, { width: 500, height: 600 });
  };

  const openManageWindow = () => {
    openWindow("manage", "Manage", <ManageWindow />, { x: 200, y: 50 }, { width: 1200, height: 700 });
  };

  const openIntegrationsWindow = () => {
    openWindow(
      "integrations",
      "Integrations & API",
      <IntegrationsWindow />,
      { x: 150, y: 100 },
      { width: 900, height: 650 },
      "ui.windows.integrations.title",
    );
  };

  const openTranslations = () => {
    openWindow("translations", "Translations", <TranslationsWindow />, { x: 200, y: 100 }, { width: 1000, height: 700 });
  };

  const openOrganizations = () => {
    openWindow(
      "organizations",
      "System Organizations",
      <OrganizationsWindow />,
      { x: 250, y: 140 },
      { width: 800, height: 600 },
    );
  };

  const openAiSystem = () => {
    openWindow(
      "ai-system",
      "AI System",
      <AiSystemWindow />,
      { x: 150, y: 100 },
      { width: 1100, height: 700 },
      "ui.windows.ai_system.title",
    );
  };

  const openTerminalWindow = () => {
    openWindow("terminal", "Terminal", <TerminalWindow />, { x: 120, y: 80 }, { width: 900, height: 550 });
  };

  const openTutorialsWindow = () => {
    openWindow(
      "tutorials-docs",
      "Tutorials & Docs",
      undefined,
      { x: 150, y: 80 },
      { width: 1000, height: 700 },
    );
  };

  const openQuickStartWindow = () => {
    openWindow("quick-start", "Quick Start", undefined, { x: 200, y: 100 }, { width: 900, height: 700 });
  };

  const baseItems: ControlPanelItem[] = [
    {
      id: "desktop",
      icon: <ShellSettingsIcon size={20} />,
      label: t("ui.controlpanel.item.desktop"),
      onClick: openDesktopSettings,
      description: "Appearance, wallpaper, and region settings",
    },
    {
      id: "quick-start",
      icon: <ShellBotIcon size={20} />,
      label: "Quick Start",
      onClick: openQuickStartWindow,
      description: "Configure your workspace for your use case",
    },
    {
      id: "tutorials",
      icon: <ShellDocsIcon size={20} />,
      label: "Tutorials & Docs",
      onClick: openTutorialsWindow,
      description: "Step-by-step guides and documentation to help you master l4yercak3",
    },
  ];

  const controlPanelItems: ControlPanelItem[] = [...baseItems];

  if (isSignedIn && currentOrg && (canPerform("manage_users") || canPerform("manage_organization") || currentOrg.isOwner)) {
    controlPanelItems.push({
      id: "manage",
      icon: <ShellPeopleIcon size={20} />,
      label: t("ui.controlpanel.item.manage"),
      onClick: openManageWindow,
      description: "Organization settings, users, and security",
    });
  }

  if (isSignedIn && currentOrg) {
    controlPanelItems.push({
      id: "integrations",
      icon: <ShellIntegrationsIcon size={20} />,
      label: "Integrations & API",
      onClick: openIntegrationsWindow,
      description: "Connect third-party services and manage API keys",
    });
  }

  if (isSignedIn && currentOrg) {
    controlPanelItems.push({
      id: "terminal",
      icon: <ShellTerminalIcon size={20} />,
      label: "Terminal",
      onClick: openTerminalWindow,
      description: "Real-time activity log viewer for agent sessions and events",
    });
  }

  if (canPerform("manage_translations")) {
    controlPanelItems.push({
      id: "translations",
      icon: <ShellTranslationsIcon size={20} />,
      label: t("ui.controlpanel.item.translations"),
      onClick: openTranslations,
      description: "Manage platform translations",
    });
  }

  if (canPerform("create_system_organization")) {
    controlPanelItems.push({
      id: "system-organizations",
      icon: <ShellPeopleIcon size={20} />,
      label: t("ui.controlpanel.item.system_organizations"),
      onClick: openOrganizations,
      description: "Manage all organizations in the system",
    });
  }

  if (canPerform("create_system_organization")) {
    controlPanelItems.push({
      id: "ai-system",
      icon: <ShellBrainIcon size={20} />,
      label: "AI System",
      onClick: openAiSystem,
      description: "AI training data, model fine-tuning, and system status",
    });
  }

  return (
    <InteriorRoot className="flex h-full flex-col">
      <InteriorHeader className="px-4 py-3">
        <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
          {t("ui.controlpanel.description")}
          {isSuperAdmin && (
            <span className="ml-2 font-semibold" style={{ color: "var(--tone-accent-strong)" }}>
              [SUPER ADMIN MODE]
            </span>
          )}
        </p>
      </InteriorHeader>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {controlPanelItems.map((item) => (
            <InteriorTileButton
              key={item.id}
              onClick={item.onClick}
              title={item.description}
              className="min-h-[120px] items-start text-left"
            >
              <div
                className="rounded-md border p-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
              >
                {item.icon}
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                {item.label}
              </span>
              {item.description && <InteriorHelperText className="text-[11px]">{item.description}</InteriorHelperText>}
            </InteriorTileButton>
          ))}
        </div>

        {isSignedIn && !currentOrg && (
          <InteriorPanel className="mt-6 space-y-1">
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              Looking for more options?
            </p>
            <InteriorHelperText>
              Create or join an organization to access Integrations, API Keys, and organization management features.
            </InteriorHelperText>
          </InteriorPanel>
        )}
      </div>
    </InteriorRoot>
  );
}
