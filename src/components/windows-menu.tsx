"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { getWindowIconById, ShellWindowIcon } from "@/components/icons/shell-icons";
import { InteriorButton, InteriorPanel } from "@/components/window-content/shared/interior-primitives";

interface Window {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized?: boolean;
  icon?: string;
}

interface LauncherItem {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
}

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
      <InteriorButton className="gap-2" size="md" onClick={() => setIsOpen((open) => !open)}>
        <ShellWindowIcon size={16} tone="active" />
        <span>{buttonLabel} ({windows.length})</span>
      </InteriorButton>

      {isOpen && (
        <InteriorPanel
          className="absolute bottom-full left-0 mb-1 min-w-[220px] p-1"
          style={{ zIndex: 10001, boxShadow: "var(--desktop-menu-shadow)" }}
        >
          {launcherItems.length > 0 && (
            <div className="py-1">
              {launcherItems.map((item) => (
                <InteriorButton
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-md px-2"
                  onClick={() => {
                    item.onSelect();
                    setIsOpen(false);
                  }}
                >
                  {item.icon ? <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
                  <span className="truncate text-xs">{item.label}</span>
                </InteriorButton>
              ))}
            </div>
          )}

          {launcherItems.length > 0 && windows.length > 0 && (
            <div className="desktop-taskbar-menu-divider my-1" />
          )}

          <div className="py-1">
            {windows.map((window) => (
              <InteriorButton
                key={window.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start rounded-md px-2"
                onClick={() => {
                  onWindowClick(window.id);
                  setIsOpen(false);
                }}
              >
                <span className="flex h-4 w-4 items-center justify-center">{getWindowIconById(window.id, window.icon, 16)}</span>
                <span className="truncate text-xs">{window.title}</span>
              </InteriorButton>
            ))}
            {launcherItems.length === 0 && windows.length === 0 && (
              <p className="px-2 py-1 text-xs opacity-70">No windows open.</p>
            )}
          </div>
        </InteriorPanel>
      )}
    </div>
  );
}
