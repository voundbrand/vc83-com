"use client";

import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { useNotification } from "@/hooks/use-notification";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface PasskeyEncouragementBannerProps {
  sessionId: string;
  onPasskeySetup?: () => void;
}

/**
 * Banner that encourages users to set up passkey authentication.
 * Shows every time user logs in with password until they set up a passkey.
 */
export function PasskeyEncouragementBanner({ sessionId, onPasskeySetup }: PasskeyEncouragementBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const notification = useNotification();
  const { t } = useNamespaceTranslations("ui.login");

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
        `✅ ${t("ui.login.passkey_notification.success_title")}`,
        t("ui.login.passkey_notification.success_message")
      );

      setIsDismissed(true);
      onPasskeySetup?.();
    } catch (err) {
      console.error("Passkey setup error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          notification.error(
            t("ui.login.passkey_notification.setup_cancelled_title"),
            t("ui.login.passkey_notification.setup_cancelled_message")
          );
        } else {
          notification.error(
            t("ui.login.passkey_notification.setup_failed_title"),
            err.message
          );
        }
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="border-2 p-4 mb-4 animate-fade-in"
      style={{
        backgroundColor: 'var(--info)',
        borderColor: 'var(--win95-border)',
        opacity: 0.95,
      }}
    >
      <div className="flex items-start gap-3">
        <Smartphone size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'white' }} />

        <div className="flex-1">
          <h3 className="text-sm font-bold mb-1" style={{ color: 'white' }}>
            🔐 {t("ui.login.passkey_banner.title")}
          </h3>
          <p className="text-xs mb-3" style={{ color: 'white', opacity: 0.9 }}>
            {t("ui.login.passkey_banner.description")}
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleSetup}
              disabled={isSettingUp}
              className="px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              style={{
                backgroundColor: 'white',
                color: 'var(--info)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
            >
              {isSettingUp ? t("ui.login.passkey_banner.button_setting_up") : t("ui.login.passkey_banner.button_setup")}
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          style={{ color: 'white' }}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
