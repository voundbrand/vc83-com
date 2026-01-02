"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2, Smartphone, Check, Plus, Trash2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";

interface SecurityTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SecurityTab({ organizationId, sessionId }: SecurityTabProps) {
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);

  // Fetch user's passkeys
  const passkeys = useQuery(
    api.passkeys.listPasskeys,
    sessionId ? { sessionId } : "skip"
  );

  return (
    <div className="space-y-6">
      {/* PASSKEY SECTION - Multi-Factor Authentication */}
      <div className="border-2 p-4 space-y-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Smartphone size={16} />
              Multi-Factor Authentication (Face ID / Touch ID)
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Add an extra layer of security with biometric authentication. Use your phone or laptop&apos;s Face ID or Touch ID for fast, secure login.
            </p>
          </div>
        </div>

        {/* Passkey Benefits */}
        <div
          className="p-3 border-2 space-y-2"
          style={{
            backgroundColor: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>Faster login - no typing passwords</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>More secure - phishing-proof biometrics</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>Works on phone, laptop, or security key</span>
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
              No passkeys set up yet
            </p>
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="beveled-button px-3 py-2 text-xs font-bold text-white flex items-center gap-1 mx-auto"
              style={{
                backgroundColor: 'var(--win95-highlight)',
              }}
            >
              <Plus size={12} />
              Set up Face ID / Touch ID
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                sessionId={sessionId}
              />
            ))}
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="beveled-button w-full px-3 py-2 text-xs font-bold flex items-center justify-center gap-1"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              <Plus size={12} />
              Add another device
            </button>
          </div>
        )}
      </div>

      {/* Passkey Setup Modal */}
      {showPasskeySetup && (
        <PasskeySetupModal
          sessionId={sessionId}
          onClose={() => setShowPasskeySetup(false)}
        />
      )}

      {/* Info about API Keys location */}
      <div
        className="p-3 border-2 flex items-start gap-2"
        style={{
          backgroundColor: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)',
        }}
      >
        <span className="text-lg">🔑</span>
        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          <strong style={{ color: 'var(--win95-text)' }}>Looking for API Keys?</strong>
          <p className="mt-1">
            API Keys have moved to Settings → Integrations & API for easier access alongside other integrations.
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
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  passkey: any;
  sessionId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePasskey = useMutation(api.passkeys.deletePasskey);

  const handleDelete = async () => {
    if (!confirm(`Remove ${passkey.deviceName} from your account?\n\nYou'll need to set it up again if you want to use it for login.`)) {
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
      alert(`Failed to remove device: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="p-3 border-2 flex items-center justify-between"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)',
      }}
    >
      <div className="flex items-center gap-3">
        <Smartphone size={16} style={{ color: 'var(--win95-highlight)' }} />
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            {passkey.deviceName}
          </div>
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Added {new Date(passkey.createdAt).toLocaleDateString()}
            {passkey.lastUsedAt && ` • Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`}
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
        Remove
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
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [deviceName, setDeviceName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const notification = useNotification();

  const handleSetup = async () => {
    if (!deviceName.trim()) {
      notification.error("Missing Device Name", "Please enter a device name");
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
        throw new Error("Failed to generate passkey challenge");
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
        throw new Error("Failed to verify passkey");
      }

      // Success!
      notification.success(
        "✅ Face ID / Touch ID",
        `Your ${deviceName} has been set up successfully!`
      );
      onClose();
    } catch (err) {
      console.error("Passkey setup error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          notification.error("Setup Cancelled", "Please try again when you're ready.");
        } else if (err.message.includes("conditional-mediation")) {
          notification.error(
            "Browser Not Supported",
            "Your browser doesn't support passkeys yet. Try Chrome, Safari, or Edge."
          );
        } else {
          notification.error("Setup Failed", err.message);
        }
      } else {
        notification.error(
          "Setup Failed",
          "Failed to set up Face ID / Touch ID. Please try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="border-4 shadow-lg max-w-md w-full mx-4" style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg)'
      }}>
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--win95-highlight)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Smartphone size={16} />
            Set up Face ID / Touch ID
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
        <div className="p-4" style={{ background: 'var(--win95-bg)' }}>
          <p className="text-xs mb-4" style={{ color: 'var(--win95-text)' }}>
            Add biometric authentication for faster, more secure login. You&apos;ll be able to sign in with Face ID or Touch ID instead of typing your password.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., iPhone 15 Pro, MacBook Air"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-text)',
              }}
              disabled={isProcessing}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Give this device a recognizable name so you can identify it later.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="beveled-button px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSetup}
              disabled={isProcessing || !deviceName.trim()}
              className="beveled-button px-3 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
              style={{
                backgroundColor: 'var(--win95-highlight)',
              }}
            >
              {isProcessing && <Loader2 size={12} className="animate-spin" />}
              {isProcessing ? "Setting up..." : "Set up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
