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
