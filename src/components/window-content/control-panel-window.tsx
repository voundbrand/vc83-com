"use client";

import { useWindowManager } from "@/hooks/use-window-manager";
import { SettingsWindow } from "./settings-window";
import { useAuth } from "@/hooks/use-auth";

interface ControlPanelItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

export function ControlPanelWindow() {
  const { openWindow } = useWindowManager();
  const { user } = useAuth();
  const isSuperAdmin = user?.roleName === "super_admin";

  const openDesktopSettings = () => {
    openWindow(
      "desktop-settings",
      "Desktop Settings",
      <SettingsWindow />,
      { x: 350, y: 150 },
      { width: 500, height: 600 }
    );
  };


  const baseItems: ControlPanelItem[] = [
    {
      id: "accessibility",
      icon: "♿",
      label: "Accessibility Options",
      onClick: () => console.log("Accessibility - Coming soon"),
    },
    {
      id: "add-hardware",
      icon: "🔌",
      label: "Add New Hardware",
      onClick: () => console.log("Add Hardware - Coming soon"),
    },
    {
      id: "add-remove",
      icon: "📦",
      label: "Add/Remove Programs",
      onClick: () => console.log("Add/Remove - Coming soon"),
    },
    {
      id: "date-time",
      icon: "🕐",
      label: "Date/Time",
      onClick: () => console.log("Date/Time - Coming soon"),
    },
    {
      id: "desktop",
      icon: "🖥️",
      label: "Desktop",
      onClick: openDesktopSettings,
    },
    {
      id: "fonts",
      icon: "🔤",
      label: "Fonts",
      onClick: () => console.log("Fonts - Coming soon"),
    },
    {
      id: "internet",
      icon: "🌐",
      label: "Internet Options",
      onClick: () => console.log("Internet - Coming soon"),
    },
    {
      id: "keyboard",
      icon: "⌨️",
      label: "Keyboard",
      onClick: () => console.log("Keyboard - Coming soon"),
    },
    {
      id: "mouse",
      icon: "🖱️",
      label: "Mouse",
      onClick: () => console.log("Mouse - Coming soon"),
    },
    {
      id: "network",
      icon: "🔗",
      label: "Network",
      onClick: () => console.log("Network - Coming soon"),
    },
    {
      id: "power",
      icon: "🔋",
      label: "Power Management",
      onClick: () => console.log("Power - Coming soon"),
    },
    {
      id: "printers",
      icon: "🖨️",
      label: "Printers",
      onClick: () => console.log("Printers - Coming soon"),
    },
    {
      id: "sounds",
      icon: "🔊",
      label: "Sounds",
      onClick: () => console.log("Sounds - Coming soon"),
    },
    {
      id: "system",
      icon: "💻",
      label: "System",
      onClick: () => console.log("System - Coming soon"),
    },
  ];

  // Add super admin icon if user is super admin
  const controlPanelItems: ControlPanelItem[] = isSuperAdmin
    ? [
        ...baseItems,
        {
          id: "super-admin",
          icon: "🔐",
          label: "Super Admin",
          onClick: () => console.log("Super Admin Panel - Coming soon"),
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
