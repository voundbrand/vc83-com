"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReference } from "convex/server";
import { Loader2, Smartphone, Check, Plus, Trash2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
const generatedApi = require("../../../../convex/_generated/api") as {
  api: {
    passkeys: {
      listPasskeys: unknown;
      deletePasskey: unknown;
    };
  };
};

interface SecurityTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

interface PasskeyRecord {
  id: string;
  deviceName: string;
  createdAt: number;
  lastUsedAt?: number;
}

function interpolateMessage(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;

  return Object.entries(params).reduce((value, [paramKey, paramValue]) => {
    return value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
  }, template);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SecurityTab({ organizationId, sessionId }: SecurityTabProps) {
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);
  const { translationsMap } = useNamespaceTranslations("ui.manage");
  const tx = useCallback<TranslateWithFallback>(
    (key, fallback, params) => interpolateMessage(translationsMap?.[key] ?? fallback, params),
    [translationsMap]
  );

  // Fetch user's passkeys
  const passkeys = useQuery(
    generatedApi.api.passkeys.listPasskeys as FunctionReference<"query">,
    sessionId ? { sessionId } : "skip"
  ) as PasskeyRecord[] | undefined;

  return (
    <div className="space-y-6">
      {/* PASSKEY SECTION - Multi-Factor Authentication */}
      <div className="border-2 p-4 space-y-3" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
              <Smartphone size={16} />
              {tx(
                "ui.manage.security.passkeys.title",
                "Multi-Factor Authentication (Face ID / Touch ID)"
              )}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.manage.security.passkeys.description",
                "Add an extra layer of security with biometric authentication. Use your phone or laptop's Face ID or Touch ID for fast, secure login."
              )}
            </p>
          </div>
        </div>

        {/* Passkey Benefits */}
        <div
          className="p-3 border-2 space-y-2"
          style={{
            backgroundColor: 'var(--window-document-bg-elevated)',
            borderColor: 'var(--window-document-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--window-document-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>{tx("ui.manage.security.passkeys.benefit.fast_login", "Faster login - no typing passwords")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--window-document-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>{tx("ui.manage.security.passkeys.benefit.secure_login", "More secure - phishing-proof biometrics")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--window-document-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>{tx("ui.manage.security.passkeys.benefit.device_support", "Works on phone, laptop, or security key")}</span>
          </div>
        </div>

        {/* Passkeys List */}
        {!passkeys ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--neutral-gray)' }} />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-4">
            <Smartphone size={32} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--neutral-gray)' }} />
            <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
              {tx("ui.manage.security.passkeys.empty.title", "No passkeys set up yet")}
            </p>
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="beveled-button px-3 py-2 text-xs font-bold text-white flex items-center gap-1 mx-auto"
              style={{
                backgroundColor: 'var(--tone-accent)',
              }}
            >
              <Plus size={12} />
              {tx("ui.manage.security.passkeys.empty.cta", "Set up Face ID / Touch ID")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                sessionId={sessionId}
                tx={tx}
              />
            ))}
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="beveled-button w-full px-3 py-2 text-xs font-bold flex items-center justify-center gap-1"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              <Plus size={12} />
              {tx("ui.manage.security.passkeys.add_device", "Add another device")}
            </button>
          </div>
        )}
      </div>

      {/* Passkey Setup Modal */}
      {showPasskeySetup && (
        <PasskeySetupModal
          sessionId={sessionId}
          onClose={() => setShowPasskeySetup(false)}
          tx={tx}
        />
      )}

      {/* Info about API Keys location */}
      <div
        className="p-3 border-2 flex items-start gap-2"
        style={{
          backgroundColor: 'var(--window-document-bg-elevated)',
          borderColor: 'var(--window-document-border)',
        }}
      >
        <span className="text-lg"></span>
        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          <strong style={{ color: 'var(--window-document-text)' }}>
            {tx("ui.manage.security.passkeys.api_keys_notice.title", "Looking for API Keys?")}
          </strong>
          <p className="mt-1">
            {tx(
              "ui.manage.security.passkeys.api_keys_notice.description",
              "API Keys have moved to Settings -> Integrations & API for easier access alongside other integrations."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Passkey Row Component
 */
function PasskeyRow({
  passkey,
  sessionId,
  tx,
}: {
  passkey: PasskeyRecord;
  sessionId: string;
  tx: TranslateWithFallback;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePasskey = useMutation(
    generatedApi.api.passkeys.deletePasskey as FunctionReference<"mutation">
  );

  const handleDelete = async () => {
    if (!confirm(tx(
      "ui.manage.security.passkeys.remove.confirm",
      "Remove {deviceName} from your account?\n\nYou'll need to set it up again if you want to use it for login.",
      { deviceName: passkey.deviceName }
    ))) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePasskey({
        sessionId,
        passkeyId: passkey.id,
      });
    } catch (error) {
      console.error("Failed to delete passkey:", error);
      alert(tx(
        "ui.manage.security.passkeys.remove.error",
        "Failed to remove device: {error}",
        {
          error: error instanceof Error
            ? error.message
            : tx("ui.manage.security.passkeys.errors.unknown", "Unknown error"),
        }
      ));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="p-3 border-2 flex items-center justify-between"
      style={{
        borderColor: 'var(--window-document-border)',
        background: 'var(--window-document-bg-elevated)',
      }}
    >
      <div className="flex items-center gap-3">
        <Smartphone size={16} style={{ color: 'var(--tone-accent)' }} />
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
            {passkey.deviceName}
          </div>
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {tx("ui.manage.security.passkeys.row.added", "Added")} {new Date(passkey.createdAt).toLocaleDateString()}
            {passkey.lastUsedAt && ` • ${tx("ui.manage.security.passkeys.row.last_used", "Last used")} ${new Date(passkey.lastUsedAt).toLocaleDateString()}`}
          </div>
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="beveled-button px-2 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
        style={{
          backgroundColor: 'var(--error)',
        }}
      >
        {isDeleting ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          <Trash2 size={10} />
        )}
        {tx("ui.manage.security.passkeys.remove.button", "Remove")}
      </button>
    </div>
  );
}

/**
 * Passkey Setup Modal
 */
function PasskeySetupModal({
  sessionId,
  onClose,
  tx,
}: {
  sessionId: string;
  onClose: () => void;
  tx: TranslateWithFallback;
}) {
  const [deviceName, setDeviceName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const notification = useNotification();

  const handleSetup = async () => {
    if (!deviceName.trim()) {
      notification.error(
        tx("ui.manage.security.passkeys.setup.errors.missing_device_name_title", "Missing Device Name"),
        tx("ui.manage.security.passkeys.setup.errors.missing_device_name_message", "Please enter a device name")
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Import WebAuthn browser library dynamically
      const { startRegistration } = await import("@simplewebauthn/browser");

      // Step 1: Generate registration options from backend
      const response = await fetch("/api/passkeys/register/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, deviceName }),
      });

      if (!response.ok) {
        throw new Error(
          tx(
            "ui.manage.security.passkeys.setup.errors.challenge_failed",
            "Failed to generate passkey challenge"
          )
        );
      }

      const options = await response.json();

      // Step 2: Prompt user for biometric (Face ID/Touch ID)
      const registrationResponse = await startRegistration(options);

      // Step 3: Verify with backend
      const verifyResponse = await fetch("/api/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, response: registrationResponse }),
      });

      if (!verifyResponse.ok) {
        throw new Error(
          tx(
            "ui.manage.security.passkeys.setup.errors.verify_failed",
            "Failed to verify passkey"
          )
        );
      }

      // Success!
      notification.success(
        tx("ui.manage.security.passkeys.setup.success.title", "Face ID / Touch ID"),
        tx(
          "ui.manage.security.passkeys.setup.success.message",
          "Your {deviceName} has been set up successfully!",
          { deviceName }
        )
      );
      onClose();
    } catch (err) {
      console.error("Passkey setup error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          notification.error(
            tx("ui.manage.security.passkeys.setup.errors.cancelled_title", "Setup Cancelled"),
            tx("ui.manage.security.passkeys.setup.errors.cancelled_message", "Please try again when you're ready.")
          );
        } else if (err.message.includes("conditional-mediation")) {
          notification.error(
            tx("ui.manage.security.passkeys.setup.errors.browser_not_supported_title", "Browser Not Supported"),
            tx(
              "ui.manage.security.passkeys.setup.errors.browser_not_supported_message",
              "Your browser doesn't support passkeys yet. Try Chrome, Safari, or Edge."
            )
          );
        } else {
          notification.error(tx("ui.manage.security.passkeys.setup.errors.setup_failed_title", "Setup Failed"), err.message);
        }
      } else {
        notification.error(
          tx("ui.manage.security.passkeys.setup.errors.setup_failed_title", "Setup Failed"),
          tx(
            "ui.manage.security.passkeys.setup.errors.setup_failed_message",
            "Failed to set up Face ID / Touch ID. Please try again."
          )
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="border-4 shadow-lg max-w-md w-full mx-4" style={{
        borderColor: 'var(--window-document-border)',
        background: 'var(--window-document-bg)'
      }}>
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--tone-accent)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Smartphone size={16} />
            {tx("ui.manage.security.passkeys.setup.modal_title", "Set up Face ID / Touch ID")}
          </span>
          <button
            onClick={onClose}
            className="hover:bg-opacity-80 px-2"
            style={{ color: 'white' }}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4" style={{ background: 'var(--window-document-bg)' }}>
          <p className="text-xs mb-4" style={{ color: 'var(--window-document-text)' }}>
            {tx(
              "ui.manage.security.passkeys.setup.modal_description",
              "Add biometric authentication for faster, more secure login. You'll be able to sign in with Face ID or Touch ID instead of typing your password."
            )}
          </p>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
              {tx("ui.manage.security.passkeys.setup.device_name.label", "Device Name")}
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={tx("ui.manage.security.passkeys.setup.device_name.placeholder", "e.g., iPhone 15 Pro, MacBook Air")}
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
              disabled={isProcessing}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.manage.security.passkeys.setup.device_name.help",
                "Give this device a recognizable name so you can identify it later."
              )}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="beveled-button px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
              disabled={isProcessing}
            >
              {tx("ui.manage.security.passkeys.setup.actions.cancel", "Cancel")}
            </button>
            <button
              onClick={handleSetup}
              disabled={isProcessing || !deviceName.trim()}
              className="beveled-button px-3 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
              style={{
                backgroundColor: 'var(--tone-accent)',
              }}
            >
              {isProcessing && <Loader2 size={12} className="animate-spin" />}
              {isProcessing
                ? tx("ui.manage.security.passkeys.setup.actions.setting_up", "Setting up...")
                : tx("ui.manage.security.passkeys.setup.actions.setup", "Set up")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
