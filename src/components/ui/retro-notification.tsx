"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface RetroNotificationProps {
  title: string;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function RetroNotification({
  title,
  message,
  type = "info",
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: RetroNotificationProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const bgColor = {
    success: "bg-green-100 border-green-600",
    error: "bg-red-100 border-red-600",
    info: "bg-purple-100 border-purple-600",
  }[type];

  const titleColor = {
    success: "text-green-800",
    error: "text-red-800",
    info: "text-purple-800",
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] ${bgColor} border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] animate-in slide-in-from-top-5`}
    >
      {/* Title Bar */}
      <div className={`flex items-center justify-between ${titleColor} bg-opacity-20 px-3 py-2 border-b-4 ${bgColor.split(' ')[1]}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-current rounded-sm"></div>
          <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-black hover:bg-opacity-10 p-1 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-800 leading-relaxed">{message}</p>
      </div>

      {/* Progress bar for auto-close */}
      {autoClose && (
        <div className="h-1 bg-black bg-opacity-10 overflow-hidden">
          <div
            className={`h-full ${titleColor.replace('text-', 'bg-')} animate-shrink`}
            style={{
              animation: `shrink ${autoCloseDelay}ms linear`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
