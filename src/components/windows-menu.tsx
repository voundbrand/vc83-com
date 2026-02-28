"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { getWindowIconById, ShellWindowIcon } from "@/components/icons/shell-icons";

interface Window {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized?: boolean;
  icon?: string;
}

export type LauncherItem =
  | {
      id: string;
      divider: true;
    }
  | {
      id: string;
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      divider?: false;
    };

interface WindowsMenuProps {
  windows: Window[];
  onWindowClick: (id: string) => void;
  launcherItems?: LauncherItem[];
  buttonLabel?: string;
}

export function WindowsMenu({
  windows,
  onWindowClick,
  launcherItems = [],
  buttonLabel = "Windows",
}: WindowsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSelectableLauncherItems = launcherItems.some((item) => !item.divider);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (!isOpen) {
      return;
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="desktop-taskbar-action inline-flex h-8 items-center gap-2 px-2"
        onClick={() => setIsOpen((open) => !open)}
        data-testid="windows-menu-trigger"
      >
        <ShellWindowIcon size={16} tone="active" />
        <span>{buttonLabel}</span>
        {windows.length > 0 ? (
          <span className="desktop-taskbar-menu-count">
            {windows.length}
          </span>
        ) : null}
      </button>

      {isOpen && (
        <div
          className="desktop-taskbar-menu desktop-taskbar-menu-panel absolute bottom-full left-0 mb-1 min-w-56 max-w-[92vw] p-1"
          style={{ zIndex: 60000 }}
          data-testid="windows-menu-panel"
        >
          {launcherItems.length > 0 && (
            <div className="max-h-[52vh] overflow-y-auto py-1 pr-1" data-testid="windows-menu-launcher-list">
              {launcherItems.map((item) => (
                item.divider ? (
                  <div key={item.id} className="desktop-taskbar-menu-divider my-1" />
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    className="desktop-taskbar-menu-item inline-flex w-full items-center gap-2 justify-start rounded-md px-2 py-1 text-left text-xs"
                    onClick={() => {
                      item.onSelect();
                      setIsOpen(false);
                    }}
                    data-testid={`windows-menu-launcher-${item.id}`}
                  >
                    {item.icon ? <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
                    <span className="truncate text-xs">{item.label}</span>
                  </button>
                )
              ))}
            </div>
          )}

          {hasSelectableLauncherItems && windows.length > 0 && (
            <div className="desktop-taskbar-menu-divider my-1" />
          )}

          <div className="max-h-[40vh] overflow-y-auto py-1 pr-1" data-testid="windows-menu-window-list">
            {windows.map((window) => (
              <button
                key={window.id}
                type="button"
                className="desktop-taskbar-menu-item inline-flex w-full items-center gap-2 justify-start rounded-md px-2 py-1 text-left text-xs"
                onClick={() => {
                  onWindowClick(window.id);
                  setIsOpen(false);
                }}
                data-testid={`windows-menu-window-${window.id}`}
              >
                <span className="flex h-4 w-4 items-center justify-center">{getWindowIconById(window.id, window.icon, 16)}</span>
                <span className="truncate text-xs">{window.title}</span>
              </button>
            ))}
            {launcherItems.length === 0 && windows.length === 0 && (
              <p className="px-2 py-1 text-xs opacity-70">No windows open.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
