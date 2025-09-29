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
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Mobile Title Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 h-12">
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
      <div className={`flex-1 overflow-y-auto bg-white dark:bg-gray-900 ${className}`}>
        {children}
      </div>
    </div>
  );
}