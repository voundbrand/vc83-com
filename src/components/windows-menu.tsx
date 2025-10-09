"use client";

import { useState, useRef, useEffect } from "react";

interface Window {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized?: boolean;
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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="retro-button px-3 py-1 text-xs font-pixel"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: 'var(--win95-bg)',
          color: 'var(--win95-text)'
        }}
      >
        📄 Windows ({windows.length})
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-1 retro-window window-corners shadow-lg min-w-[200px]"
          style={{
            background: 'var(--win95-bg)',
            zIndex: 10001
          }}
        >
          <div className="py-1">
            {windows.map((window) => (
              <button
                key={window.id}
                onClick={() => {
                  onWindowClick(window.id);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1 text-left flex items-center gap-2 transition-colors font-pixel hover-menu-item"
                style={{ color: 'var(--win95-text)' }}
              >
                <span className="text-base">📄</span>
                <span className="text-xs truncate">{window.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
