"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation with large integration modules
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { InteriorButton } from "@/components/ui/interior-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Bell,
} from "lucide-react";

interface PushoverSettingsProps {
  onBack: () => void;
}

interface NotifyOnConfig {
  newBooking: boolean;
  paymentReceived: boolean;
  paymentFailed: boolean;
  customerMessage: boolean;
  formSubmission: boolean;
  systemAlert: boolean;
}

const DEFAULT_NOTIFY_ON: NotifyOnConfig = {
  newBooking: true,
  paymentReceived: true,
  paymentFailed: true,
  customerMessage: true,
  formSubmission: false,
  systemAlert: true,
};

const NOTIFY_LABELS: Record<keyof NotifyOnConfig, string> = {
  newBooking: "New Booking",
  paymentReceived: "Payment Received",
  paymentFailed: "Payment Failed",
  customerMessage: "Customer Message",
  formSubmission: "Form Submission",
  systemAlert: "System Alert",
};

const SOUND_OPTIONS = [
  { value: "pushover", label: "Pushover (default)" },
  { value: "bike", label: "Bike" },
  { value: "bugle", label: "Bugle" },
  { value: "cashregister", label: "Cash Register" },
  { value: "classical", label: "Classical" },
  { value: "cosmic", label: "Cosmic" },
  { value: "falling", label: "Falling" },
  { value: "gamelan", label: "Gamelan" },
  { value: "incoming", label: "Incoming" },
  { value: "intermission", label: "Intermission" },
  { value: "magic", label: "Magic" },
  { value: "mechanical", label: "Mechanical" },
  { value: "pianobar", label: "Piano Bar" },
  { value: "siren", label: "Siren" },
  { value: "spacealarm", label: "Space Alarm" },
  { value: "tugboat", label: "Tugboat" },
  { value: "alien", label: "Alien Alarm (long)" },
  { value: "climb", label: "Climb (long)" },
  { value: "persistent", label: "Persistent (long)" },
  { value: "echo", label: "Pushover Echo (long)" },
  { value: "updown", label: "Up Down (long)" },
  { value: "vibrate", label: "Vibrate Only" },
  { value: "none", label: "None (silent)" },
];

const PRIORITY_OPTIONS = [
  { value: -2, label: "Lowest (no alert)" },
  { value: -1, label: "Low (quiet)" },
  { value: 0, label: "Normal" },
  { value: 1, label: "High (bypass quiet hours)" },
];

export function PushoverSettings({ onBack }: PushoverSettingsProps) {
  const { user, sessionId } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [userKey, setUserKey] = useState("");
  const [showApiToken, setShowApiToken] = useState(false);
  const [showUserKey, setShowUserKey] = useState(false);
  const [defaultSound, setDefaultSound] = useState("pushover");
  const [defaultPriority, setDefaultPriority] = useState(0);
  const [notifyOn, setNotifyOn] = useState<NotifyOnConfig>(DEFAULT_NOTIFY_ON);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  const settings = useQuery(
    api.integrations.pushover.getPushoverSettings,
    sessionId ? { sessionId } : "skip"
  ) as {
    configured: boolean;
    enabled: boolean;
    hasApiToken: boolean;
    hasUserKey: boolean;
    defaultSound: string;
    defaultPriority: number;
    notifyOn: NotifyOnConfig;
  } | null | undefined;

  const saveSettings = useMutation(api.integrations.pushover.savePushoverSettings);
  const testConnection = useAction(api.integrations.pushover.testPushoverConnection);

  const isLoading = settings === undefined;
  const isConfigured = settings?.configured === true;
  const isEnabled = settings?.enabled === true;

  // Initialize form state from loaded settings
  useEffect(() => {
    if (settings && isConfigured) {
      setDefaultSound(settings.defaultSound || "pushover");
      setDefaultPriority(settings.defaultPriority ?? 0);
      if (settings.notifyOn) {
        setNotifyOn(settings.notifyOn);
      }
    }
  }, [settings, isConfigured]);

  const handleConnect = async () => {
    if (!sessionId) {
      notification.error("Sign In Required", "You must be signed in to configure Pushover");
      return;
    }
    if (!apiToken.trim()) {
      setValidationError("Please enter your Pushover API Token");
      return;
    }
    if (!userKey.trim()) {
      setValidationError("Please enter your Pushover User Key");
      return;
    }

    setIsConnecting(true);
    setValidationError(null);

    try {
      await saveSettings({
        sessionId,
        apiToken: apiToken.trim(),
        userKey: userKey.trim(),
        enabled: true,
        defaultSound,
        defaultPriority,
        notifyOn,
      });
      notification.success("Connected!", "Pushover settings saved successfully");
      setApiToken("");
      setUserKey("");
    } catch (error) {
      console.error("Failed to save Pushover settings:", error);
      notification.error(
        "Connection Error",
        error instanceof Error ? error.message : "Failed to save Pushover settings"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!sessionId) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection({ sessionId });
      if (result.success) {
        setTestResult({ success: true, message: "Test notification sent! Check your device." });
        notification.success("Test Passed", "Pushover notification sent");
      } else {
        setTestResult({ success: false, message: result.error || "Connection test failed" });
        notification.error("Test Failed", result.error || "Connection test failed");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Connection test failed";
      setTestResult({ success: false, message: msg });
      notification.error("Test Failed", msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Pushover",
      message: "Are you sure? This will stop all push notifications.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) return;

    try {
      await saveSettings({
        sessionId,
        apiToken: "",
        userKey: "",
        enabled: false,
      });
      notification.success("Disconnected", "Pushover has been disabled");
    } catch (error) {
      console.error("Failed to disconnect Pushover:", error);
      notification.error(
        "Disconnect Failed",
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  const handleUpdateSettings = async () => {
    if (!sessionId) return;
    setIsConnecting(true);

    try {
      await saveSettings({
        sessionId,
        apiToken: apiToken.trim() || "__keep_existing__",
        userKey: userKey.trim() || "__keep_existing__",
        enabled: true,
        defaultSound,
        defaultPriority,
        notifyOn,
      });
      notification.success("Settings Updated", "Pushover notification preferences saved");
    } catch (error) {
      console.error("Failed to update Pushover settings:", error);
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to update settings"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleNotifyOn = (key: keyof NotifyOnConfig) => {
    setNotifyOn((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center gap-3"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--tone-accent)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Bell size={24} style={{ color: "#249df0" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                Pushover
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Real-time push notifications
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--window-document-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading connection status...
              </p>
            </div>
          ) : isConfigured && isEnabled ? (
            /* Connected State */
            <div className="space-y-4">
              {/* Status */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                    Connected
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                      API Token
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {settings?.hasApiToken ? "Configured (hidden)" : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                      User Key
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {settings?.hasUserKey ? "Configured (hidden)" : "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div
                  className="p-3 border-2 rounded text-xs"
                  style={{
                    borderColor: testResult.success ? "#10b981" : "#ef4444",
                    background: testResult.success
                      ? "rgba(16, 185, 129, 0.05)"
                      : "rgba(239, 68, 68, 0.05)",
                    color: testResult.success ? "#10b981" : "#ef4444",
                  }}
                >
                  {testResult.message}
                </div>
              )}

              {/* Notification Preferences */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  Notify On
                </p>
                <div className="space-y-2">
                  {(Object.keys(NOTIFY_LABELS) as Array<keyof NotifyOnConfig>).map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyOn[key]}
                        onChange={() => toggleNotifyOn(key)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs" style={{ color: "var(--window-document-text)" }}>
                        {NOTIFY_LABELS[key]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sound & Priority */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  Defaults
                </p>
                <div className="space-y-3">
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      Sound
                    </label>
                    <select
                      value={defaultSound}
                      onChange={(e) => setDefaultSound(e.target.value)}
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {SOUND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      Priority
                    </label>
                    <select
                      value={defaultPriority}
                      onChange={(e) => setDefaultPriority(Number(e.target.value))}
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <InteriorButton
                    onClick={handleUpdateSettings}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </InteriorButton>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <InteriorButton
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Test"
                  )}
                </InteriorButton>
                <InteriorButton variant="secondary" onClick={handleDisconnect} className="flex-1">
                  Disconnect
                </InteriorButton>
              </div>
            </div>
          ) : (
            /* Not Connected State */
            <div className="space-y-4">
              <div
                className="p-6 border-2 rounded text-center"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <Bell size={48} className="mx-auto mb-4" style={{ color: "#249df0" }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  Not Connected
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Connect Pushover to receive instant push notifications for bookings, payments,
                  messages, and system alerts.
                </p>
              </div>

              {/* Features */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  Features
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-start gap-2">
                    <span>&#128276;</span>
                    <span>Real-time push notifications to your devices</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#9889;</span>
                    <span>Configurable event triggers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128266;</span>
                    <span>Custom sounds and priority levels</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128241;</span>
                    <span>iOS, Android, and desktop support</span>
                  </div>
                </div>
              </div>

              {/* Connection Form */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  Enter your Pushover credentials
                </p>

                {validationError && (
                  <div
                    className="p-2 mb-3 border rounded text-xs"
                    style={{
                      borderColor: "#ef4444",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                    }}
                  >
                    {validationError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      API Token (Application Token)
                    </label>
                    <div className="relative">
                      <input
                        type={showApiToken ? "text" : "password"}
                        value={apiToken}
                        onChange={(e) => {
                          setApiToken(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="Your Pushover API token"
                        className="w-full px-2 py-1 border-2 text-xs pr-8"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiToken(!showApiToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {showApiToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Create an application at pushover.net/apps/build
                    </p>
                  </div>

                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      User Key
                    </label>
                    <div className="relative">
                      <input
                        type={showUserKey ? "text" : "password"}
                        value={userKey}
                        onChange={(e) => {
                          setUserKey(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="Your Pushover user key"
                        className="w-full px-2 py-1 border-2 text-xs pr-8"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserKey(!showUserKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {showUserKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Found on your Pushover dashboard
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Link */}
              <a
                href="https://pushover.net/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: "var(--tone-accent)" }}
              >
                <ExternalLink size={12} />
                Pushover API documentation
              </a>

              {/* Connect Button */}
              <InteriorButton
                onClick={handleConnect}
                disabled={isConnecting || !user}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Pushover"
                )}
              </InteriorButton>

              {!user && (
                <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                  Please sign in to connect your Pushover account
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
