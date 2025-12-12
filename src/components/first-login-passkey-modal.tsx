"use client";

import { useState } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { useNotification } from "@/hooks/use-notification";

interface FirstLoginPasskeyModalProps {
  sessionId: string;
  userName?: string;
  onClose: () => void;
  onPasskeySetup?: () => void;
}

/**
 * Modal that prompts new users to set up passkey authentication
 * immediately after their first successful password setup.
 */
export function FirstLoginPasskeyModal({
  sessionId,
  userName,
  onClose,
  onPasskeySetup,
}: FirstLoginPasskeyModalProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const notification = useNotification();

  const handleSetup = async () => {
    setIsSettingUp(true);

    try {
      // Step 1: Generate registration options from backend
      const response = await fetch("/api/passkeys/register/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          deviceName: `${navigator.platform} - ${new Date().toLocaleDateString()}`
        }),
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
        "✅ Account Created!",
        "Your passkey has been set up. You can now sign in with Face ID or Touch ID."
      );

      onPasskeySetup?.();
      onClose();
    } catch (err) {
      console.error("Passkey setup error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          notification.error("Setup Cancelled", "You can set up passkeys later in Security settings.");
          onClose();
        } else {
          notification.error("Setup Failed", err.message);
        }
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSkip = () => {
    notification.info(
      "Passkey Setup Skipped",
      "You can add Face ID / Touch ID later in Security settings."
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div
        className="border-4 shadow-lg max-w-md w-full mx-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--win95-highlight)',
            color: 'var(--win95-titlebar-text)',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            🎉 Welcome{userName ? `, ${userName}` : ""}!
          </span>
        </div>

        {/* Modal Content */}
        <div className="p-6" style={{ background: 'var(--win95-bg)' }}>
          <div className="text-center mb-6">
            <div className="inline-block p-3 rounded-full mb-3" style={{ backgroundColor: 'var(--info)', opacity: 0.1 }}>
              <Smartphone size={32} style={{ color: 'var(--info)' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              Add Face ID / Touch ID?
            </h2>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              Sign in faster and more securely with biometric authentication. Takes just 30 seconds.
            </p>
          </div>

          {/* Benefits List */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <span>Instant login with fingerprint or face</span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <span>No more typing passwords</span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <span>Phishing-proof security</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSetup}
              disabled={isSettingUp}
              className="beveled-button w-full px-4 py-2 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--win95-highlight)',
                color: 'var(--win95-titlebar-text)',
              }}
            >
              {isSettingUp ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Smartphone size={16} />
                  Set up Face ID / Touch ID
                </>
              )}
            </button>

            <button
              onClick={handleSkip}
              disabled={isSettingUp}
              className="beveled-button w-full px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              Maybe later
            </button>
          </div>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--neutral-gray)' }}>
            You can always add this later in Security settings
          </p>
        </div>
      </div>
    </div>
  );
}
