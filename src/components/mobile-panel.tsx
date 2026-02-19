"use client";

import { X } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";

interface MobilePanelProps {
  windowType: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function MobilePanel({ windowType, title, children, className = "" }: MobilePanelProps) {
  const { closeWindow } = useWindowManager();

  const handleClose = () => {
    closeWindow(windowType);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col" style={{
      background: 'var(--background)',
      bottom: 'var(--taskbar-height, 48px)' // Reserve space for taskbar, default 48px if not set
    }}>
      {/* Mobile Title Bar */}
      <div className="flex items-center justify-between px-4 h-12" style={{ background: 'var(--shell-titlebar-gradient)', color: 'var(--shell-titlebar-text)' }}>
        <h2 className="font-pixel-retro text-sm">{title}</h2>
        <button
          onClick={handleClose}
          className="p-2 -mr-2 touch-manipulation"
          aria-label="Close window"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Content */}
      <div className={`flex-1 overflow-y-auto ${className}`} style={{ background: 'var(--shell-surface)', color: 'var(--shell-text)' }}>
        {children}
      </div>
    </div>
  );
}