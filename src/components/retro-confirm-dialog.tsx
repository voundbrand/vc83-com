/**
 * RETRO CONFIRM DIALOG
 *
 * Windows 95-style confirmation dialog component
 * Replaces browser's native confirm() with custom Win95 UI
 */

"use client";

import { TriangleAlert } from "lucide-react";
import { RetroButton } from "./retro-button";

interface RetroConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "secondary" | "outline";
  onConfirm: () => void;
  onCancel: () => void;
}

export function RetroConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: RetroConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
    >
      {/* Dialog Window */}
      <div
        className="border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-md"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between border-b-4 px-3 py-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-accent)",
          }}
        >
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            {/* Warning Icon */}
            <div
              className="flex-shrink-0 border-2 p-2"
              style={{
                borderColor: "var(--shell-border)",
                background: "var(--warning-light)",
              }}
            >
              <TriangleAlert size={24} style={{ color: "var(--warning)" }} />
            </div>

            {/* Message */}
            <div className="flex-1">
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--shell-text)" }}
              >
                {message}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <RetroButton
              variant="secondary"
              onClick={onCancel}
              className="px-6"
            >
              {cancelText}
            </RetroButton>
            <RetroButton
              variant={confirmVariant}
              onClick={onConfirm}
              className="px-6"
            >
              {confirmText}
            </RetroButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using the confirmation dialog
 *
 * Usage:
 * const confirmDialog = useRetroConfirm();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirmDialog.confirm({
 *     title: "Delete Item",
 *     message: "Are you sure you want to delete this item?",
 *     confirmText: "Delete",
 *     confirmVariant: "danger"
 *   });
 *
 *   if (confirmed) {
 *     // Proceed with deletion
 *   }
 * };
 */

import { useState, useCallback } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "secondary" | "outline";
}

export function useRetroConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const Dialog = useCallback(() => (
    <RetroConfirmDialog
      isOpen={isOpen}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      confirmVariant={options.confirmVariant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [isOpen, options, handleConfirm, handleCancel]);

  return {
    confirm,
    Dialog,
  };
}
