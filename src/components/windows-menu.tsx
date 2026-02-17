"use client";

import { useEffect, useRef, useState } from "react";
import { getWindowIconById, ShellWindowIcon } from "@/components/icons/shell-icons";
import { InteriorButton, InteriorPanel } from "@/components/window-content/shared/interior-primitives";

interface Window {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized?: boolean;
  icon?: string;
}

interface WindowsMenuProps {
  windows: Window[];
  onWindowClick: (id: string) => void;
}

export function WindowsMenu({ windows, onWindowClick }: WindowsMenuProps) {
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
        <span>Windows ({windows.length})</span>
      </InteriorButton>

      {isOpen && (
        <InteriorPanel
          className="absolute bottom-full left-0 mb-1 min-w-[220px] p-1"
          style={{ zIndex: 10001, boxShadow: "var(--desktop-menu-shadow)" }}
        >
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
          </div>
        </InteriorPanel>
      )}
    </div>
  );
}
