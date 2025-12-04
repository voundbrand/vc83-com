/**
 * Window Registry
 *
 * Maps window IDs to their component factories, enabling window restoration
 * from sessionStorage after page refresh.
 */

import { lazy, type ComponentType, type ReactNode } from "react";

export interface WindowConfig {
  id: string;
  title: string;
  titleKey?: string;
  icon?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  props?: Record<string, unknown>;
}

export interface WindowFactory {
  createComponent: (props?: Record<string, unknown>) => ReactNode;
  defaultConfig: Omit<WindowConfig, 'id' | 'props'>;
}

// Lazy load window components
const AIAssistantWindow = lazy(() =>
  import("@/components/window-content/ai-chat-window").then(m => ({ default: m.AIChatWindow }))
);

const ManageWindow = lazy(() =>
  import("@/components/window-content/org-owner-manage-window").then(m => ({ default: m.ManageWindow }))
);

const ControlPanelWindow = lazy(() =>
  import("@/components/window-content/control-panel-window").then(m => ({ default: m.ControlPanelWindow }))
);

const OrganizationsWindow = lazy(() =>
  import("@/components/window-content/super-admin-organizations-window").then(m => ({ default: m.OrganizationsWindow }))
);

const SettingsWindow = lazy(() =>
  import("@/components/window-content/settings-window").then(m => ({ default: m.SettingsWindow }))
);

const CRMWindow = lazy(() =>
  import("@/components/window-content/crm-window").then(m => ({ default: m.CRMWindow }))
);

const StoreWindow = lazy(() =>
  import("@/components/window-content/store-window").then(m => ({ default: m.StoreWindow }))
);

const ComplianceWindow = lazy(() =>
  import("@/components/window-content/compliance-window").then(m => ({ default: m.ComplianceWindow }))
);

const TranslationsWindow = lazy(() =>
  import("@/components/window-content/translations-window").then(m => ({ default: m.TranslationsWindow }))
);

const AboutWindow = lazy(() =>
  import("@/components/window-content/about-window").then(m => ({ default: m.AboutWindow }))
);

const WelcomeWindow = lazy(() =>
  import("@/components/window-content/welcome-window").then(m => ({ default: m.WelcomeWindow }))
);

const AllAppsWindow = lazy(() =>
  import("@/components/window-content/all-apps-window").then(m => ({ default: m.AllAppsWindow }))
);

const PlatformCartWindow = lazy(() =>
  import("@/components/window-content/platform-cart-window").then(m => ({ default: m.PlatformCartWindow }))
);

/**
 * Registry of all available windows
 */
export const WINDOW_REGISTRY: Record<string, WindowFactory> = {
  "ai-assistant": {
    createComponent: (props) => <AIAssistantWindow {...(props || {})} />,
    defaultConfig: {
      title: "AI Assistant",
      titleKey: "ui.windows.ai_assistant.title",
      icon: "🤖",
      position: { x: 100, y: 100 },
      size: { width: 1000, height: 600 }
    }
  },

  "manage": {
    createComponent: (props) => <ManageWindow {...(props as any)} />,
    defaultConfig: {
      title: "Manage",
      titleKey: "ui.windows.manage.title",
      icon: "⚙️",
      position: { x: 200, y: 50 },
      size: { width: 1200, height: 700 }
    }
  },

  "control-panel": {
    createComponent: () => <ControlPanelWindow />,
    defaultConfig: {
      title: "Control Panel",
      titleKey: "ui.windows.control_panel.title",
      icon: "🎛️",
      position: { x: 150, y: 100 },
      size: { width: 900, height: 600 }
    }
  },

  "organizations": {
    createComponent: () => <OrganizationsWindow />,
    defaultConfig: {
      title: "Organizations",
      titleKey: "ui.windows.organizations.title",
      icon: "🏢",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "settings": {
    createComponent: () => <SettingsWindow />,
    defaultConfig: {
      title: "Settings",
      titleKey: "ui.windows.settings.title",
      icon: "⚙️",
      position: { x: 200, y: 150 },
      size: { width: 900, height: 600 }
    }
  },

  "crm": {
    createComponent: () => <CRMWindow />,
    defaultConfig: {
      title: "CRM",
      titleKey: "ui.windows.crm.title",
      icon: "👥",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "store": {
    createComponent: () => <StoreWindow />,
    defaultConfig: {
      title: "Store",
      titleKey: "ui.windows.store.title",
      icon: "🛍️",
      position: { x: 150, y: 100 },
      size: { width: 1200, height: 700 }
    }
  },

  "compliance": {
    createComponent: () => <ComplianceWindow />,
    defaultConfig: {
      title: "Compliance",
      titleKey: "ui.windows.compliance.title",
      icon: "📋",
      position: { x: 150, y: 100 },
      size: { width: 900, height: 600 }
    }
  },

  "translations": {
    createComponent: () => <TranslationsWindow />,
    defaultConfig: {
      title: "Translations",
      titleKey: "ui.windows.translations.title",
      icon: "🌐",
      position: { x: 150, y: 100 },
      size: { width: 1100, height: 700 }
    }
  },

  "about": {
    createComponent: () => <AboutWindow />,
    defaultConfig: {
      title: "About",
      titleKey: "ui.windows.about.title",
      icon: "ℹ️",
      position: { x: 200, y: 150 },
      size: { width: 600, height: 500 }
    }
  },

  "welcome": {
    createComponent: () => <WelcomeWindow />,
    defaultConfig: {
      title: "Welcome",
      titleKey: "ui.windows.welcome.title",
      icon: "👋",
      position: { x: 200, y: 150 },
      size: { width: 700, height: 500 }
    }
  },

  "all-apps": {
    createComponent: () => <AllAppsWindow />,
    defaultConfig: {
      title: "All Apps",
      titleKey: "ui.windows.all_apps.title",
      icon: "📱",
      position: { x: 150, y: 100 },
      size: { width: 800, height: 600 }
    }
  },

  "cart": {
    createComponent: () => <PlatformCartWindow />,
    defaultConfig: {
      title: "Cart",
      titleKey: "ui.windows.cart.title",
      icon: "🛒",
      position: { x: 200, y: 150 },
      size: { width: 800, height: 600 }
    }
  }
};

/**
 * Check if a window ID is registered
 */
export function isWindowRegistered(id: string): boolean {
  return id in WINDOW_REGISTRY;
}

/**
 * Get window factory by ID
 */
export function getWindowFactory(id: string): WindowFactory | undefined {
  return WINDOW_REGISTRY[id];
}
