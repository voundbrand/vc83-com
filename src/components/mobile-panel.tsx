"use client";

import { X } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { parseShellUrlState, stripShellQueryParams } from "@/lib/shell/url-state";

interface MobilePanelProps {
  windowId: string;
  title: string;
  children: React.ReactNode;
  zIndex?: number;
  className?: string;
}

export function MobilePanel({ windowId, title, children, zIndex, className = "" }: MobilePanelProps) {
  const { closeWindow } = useWindowManager();
  const effectiveZIndex = 10000 + (zIndex ?? 0);

  const handleClose = () => {
    closeWindow(windowId);

    const params = new URLSearchParams(window.location.search);
    const shellState = parseShellUrlState(params);

    if (shellState.app !== windowId) {
      return;
    }

    const nextParams = stripShellQueryParams(params);
    const query = nextParams.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 flex flex-col"
      style={{
        background: "var(--background)",
        zIndex: effectiveZIndex,
        paddingTop: "env(safe-area-inset-top, 0px)",
        bottom: "calc(var(--taskbar-height, 48px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Mobile Title Bar */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{
          background: 'var(--shell-titlebar-gradient)',
          borderColor: 'var(--shell-border)',
          color: 'var(--shell-titlebar-text)',
        }}
      >
        <h2 className="text-sm font-semibold tracking-[0.01em] truncate pr-3">{title}</h2>
        <button
          type="button"
          onClick={handleClose}
          className="desktop-shell-control-button desktop-window-control desktop-window-control-close touch-manipulation"
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
