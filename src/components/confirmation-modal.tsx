"use client";

import { AlertTriangle, X, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

/**
 * Win95-style Confirmation Modal
 *
 * A retro confirmation dialog that matches the Windows 95 aesthetic
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
}: ConfirmationModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconColor = variant === "danger" ? "var(--error)" : variant === "warning" ? "var(--warning)" : "var(--info)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--modal-overlay-bg)" }}
      onClick={onClose}
    >
      {/* Modal Window */}
      <div
        className="border-2 max-w-md w-full mx-4"
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--win95-border)",
          boxShadow: "var(--modal-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titlebar */}
        <div
          className="px-2 py-1 flex items-center justify-between border-b-2"
          style={{
            background: "var(--win95-titlebar)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border"
              style={{
                background: "var(--win95-window-icon-bg)",
                borderColor: "var(--win95-window-icon-border)",
              }}
            />
            <span className="text-xs font-bold" style={{ color: "var(--win95-titlebar-text)" }}>
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center border hover:opacity-80"
            style={{
              background: "var(--win95-button-face)",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            <X size={12} style={{ color: "var(--win95-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle size={32} style={{ color: iconColor }} />
            </div>
            <div className="flex-1">
              <p className="text-sm whitespace-pre-line" style={{ color: "var(--win95-text)" }}>
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-4 pb-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-semibold min-w-[80px] border-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-semibold min-w-[80px] border-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{
              background: variant === "danger" ? "var(--error)" : "var(--primary)",
              color: "white",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            {isLoading && <Loader2 size={12} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
