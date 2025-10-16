"use client";

import { useState } from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userEmail: string;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
}: DeleteAccountModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const requiredText = "DELETE MY ACCOUNT";
  const isConfirmValid = confirmText === requiredText;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setError("");
    setIsDeleting(true);

    try {
      await onConfirm();
      // onConfirm handles logout and redirect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete account";
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "var(--modal-overlay-bg)" }}
        onClick={onClose}
      />

      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 min-w-[550px] max-w-[600px]"
        style={{
          backgroundColor: "var(--modal-bg)",
          border: "2px solid",
          borderColor: "var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{
            background: "var(--error)",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: "white" }} />
            <span className="text-sm font-bold" style={{ color: "white" }}>
              {t("ui.manage.delete_account.title")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:opacity-80"
            style={{
              backgroundColor: "var(--win95-button-face)",
              border: "1px solid",
              borderColor: "var(--win95-button-dark)",
            }}
          >
            <X size={16} style={{ color: "var(--win95-text)" }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Critical Warning Banner */}
          <div
            className="p-4 rounded"
            style={{
              backgroundColor: "var(--error)",
              color: "white",
              border: "2px solid",
              borderColor: "var(--error)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-lg mb-2">
                  {t("ui.manage.delete_account.warning_title")}
                </h3>
                <p className="text-sm">
                  {t("ui.manage.delete_account.warning_message")}
                </p>
              </div>
            </div>
          </div>

          {/* What Will Happen */}
          <div
            className="p-4 rounded space-y-2"
            style={{
              backgroundColor: "var(--win95-bg)",
              border: "2px solid",
              borderColor: "var(--win95-input-border-dark)",
            }}
          >
            <h4 className="font-semibold" style={{ color: "var(--win95-text)" }}>
              {t("ui.manage.delete_account.what_happens")}
            </h4>
            <ul className="text-sm space-y-1.5 ml-4" style={{ color: "var(--win95-text)" }}>
              <li className="list-disc">
                {t("ui.manage.delete_account.consequence_1")}
              </li>
              <li className="list-disc">
                {t("ui.manage.delete_account.consequence_2")}
              </li>
              <li className="list-disc">
                {t("ui.manage.delete_account.consequence_3")}
              </li>
              <li className="list-disc">
                {t("ui.manage.delete_account.consequence_4")}
              </li>
            </ul>
          </div>

          {/* Account Info */}
          <div
            className="p-3 rounded"
            style={{
              backgroundColor: "var(--win95-input-bg)",
              border: "2px inset",
              borderColor: "var(--win95-input-border-dark)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--win95-text)" }}>
              <span className="font-semibold">Account:</span> {userEmail}
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
              {t("ui.manage.delete_account.confirm_instruction")} <code className="bg-gray-200 px-1 py-0.5 rounded">{requiredText}</code>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              className="w-full px-3 py-2 text-sm font-mono"
              style={{
                backgroundColor: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
                border: "2px inset",
                borderColor: "var(--win95-input-border-dark)",
              }}
              autoComplete="off"
            />
          </div>

          {error && (
            <div
              className="p-3 rounded"
              style={{
                backgroundColor: "var(--error)",
                color: "white",
                border: "2px solid",
                borderColor: "var(--error)",
              }}
            >
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
                border: "2px solid",
                borderTopColor: "var(--win95-button-light)",
                borderLeftColor: "var(--win95-button-light)",
                borderBottomColor: "var(--win95-button-dark)",
                borderRightColor: "var(--win95-button-dark)",
              }}
            >
              {t("ui.manage.delete_account.cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
              className="px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: "var(--error)",
                color: "white",
                border: "2px solid",
                borderTopColor: "var(--win95-button-light)",
                borderLeftColor: "var(--win95-button-light)",
                borderBottomColor: "var(--win95-button-dark)",
                borderRightColor: "var(--win95-button-dark)",
              }}
            >
              <Trash2 size={14} />
              {isDeleting ? t("ui.manage.delete_account.deleting") : t("ui.manage.delete_account.confirm_button")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
