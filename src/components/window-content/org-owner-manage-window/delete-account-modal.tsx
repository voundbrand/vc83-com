"use client";

import { useState } from "react";
import { X, AlertTriangle, Clock, Trash2, Shield } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import { ComplianceWindow } from "../compliance-window";

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
  const { t } = useNamespaceTranslations("ui.manage");
  const { openWindow } = useWindowManager();
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

  const handleOpenComplianceApp = () => {
    onClose(); // Close this modal first
    openWindow(
      "compliance",
      "Compliance",
      <ComplianceWindow />,
      { x: 150, y: 100 },
      { width: 900, height: 600 },
      'ui.app.compliance',
      '⚖️'
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "var(--modal-overlay-bg)" }}
        onClick={onClose}
      />

      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 min-w-[550px] max-w-[650px]"
        style={{
          backgroundColor: "var(--modal-bg)",
          border: "2px solid",
          borderColor: "var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {/* Header - Orange/Warning color for soft delete */}
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{
            background: "#D97706", // Warning orange
          }}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: "white" }} />
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
          {/* Grace Period Info Banner */}
          <div
            className="p-4 rounded"
            style={{
              backgroundColor: "#FEF3C7", // Yellow/amber light
              color: "#92400E", // Amber dark text
              border: "2px solid",
              borderColor: "#D97706",
            }}
          >
            <div className="flex items-start gap-3">
              <Clock size={24} className="flex-shrink-0 mt-0.5" />
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

          {/* Immediate Deletion Option */}
          <div
            className="p-4 rounded"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              border: "2px solid",
              borderColor: "var(--win95-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <Shield size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--win95-highlight)" }} />
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
                  Need immediate permanent deletion?
                </h4>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  If you need to delete your account immediately without the 2-week grace period,
                  use the Compliance app to export your data first, then permanently delete.
                </p>
                <button
                  onClick={handleOpenComplianceApp}
                  className="text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1"
                  style={{
                    backgroundColor: "var(--win95-highlight)",
                    color: "white",
                  }}
                >
                  <Shield size={12} />
                  Open Compliance App
                </button>
              </div>
            </div>
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
              className="beveled-button px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              {t("ui.manage.delete_account.cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
              className="beveled-button px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: "#D97706", // Warning orange instead of error red
                color: "white",
              }}
            >
              <Clock size={14} />
              {isDeleting ? t("ui.manage.delete_account.deleting") : "Schedule Deletion"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
