"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { Loader2, CheckCircle2, ArrowLeft, MessageCircle, Copy } from "lucide-react";

interface InfobipSettingsProps {
  onBack: () => void;
}

export function InfobipSettings({ onBack }: InfobipSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [senderId, setSenderId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Queries & mutations
  const infobipSettings = useQuery(
    api.integrations.infobip.getInfobipSettings,
    sessionId ? { sessionId } : "skip"
  );
  const saveSettings = useMutation(api.integrations.infobip.saveInfobipSettings);
  const disconnect = useMutation(api.integrations.infobip.disconnectInfobip);
  const testConnection = useAction(api.integrations.infobip.testInfobipConnection);

  const isLoading = infobipSettings === undefined;
  const isConnected = infobipSettings?.configured && infobipSettings?.enabled;

  const WEBHOOK_URL = "https://agreeable-lion-828.convex.site/webhooks/infobip";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    notification.success("Copied", "Webhook URL copied to clipboard");
  };

  const handleTestAndSave = async () => {
    if (!sessionId) return;
    if (!apiKey.trim() || !baseUrl.trim() || !senderId.trim()) {
      notification.error("Missing Fields", "Please fill in all fields.");
      return;
    }

    setIsSaving(true);
    try {
      // Test connection first
      const testResult = await testConnection({
        sessionId,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        senderId: senderId.trim(),
      });

      if (!testResult.success) {
        notification.error("Connection Failed", testResult.error || "Could not connect to Infobip.");
        setIsSaving(false);
        return;
      }

      // Save settings
      await saveSettings({
        sessionId,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        senderId: senderId.trim(),
      });

      notification.success("Connected", "Infobip SMS has been connected successfully.");
      setApiKey("");
      setBaseUrl("");
      setSenderId("");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!sessionId) return;
    setIsTesting(true);
    try {
      const result = await testConnection({ sessionId });
      if (result.success) {
        notification.success("Success", "Infobip connection is working.");
      } else {
        notification.error("Test Failed", result.error || "Connection test failed.");
      }
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Connection test failed"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Infobip",
      message:
        "This will remove the Infobip SMS integration and stop all SMS messaging for your organization. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await disconnect({ sessionId });
      notification.success("Disconnected", "Infobip SMS has been disconnected.");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Disconnect failed"
      );
    }
  };

  const handleSenderIdChange = (value: string) => {
    // Allow alphanumeric (for branded sender) or phone number format (+digits)
    const sanitized = value.replace(/[^a-zA-Z0-9+]/g, "").slice(0, 16);
    setSenderId(sanitized);
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center gap-3"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--win95-highlight)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle size={24} style={{ color: "#FF6B00" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                Infobip Enterprise
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Bring your own Infobip account
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Loading...</p>
            </div>
          ) : isConnected ? (
            /* ======== CONNECTED STATE ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>Connected</span>
                </div>
                <div className="space-y-2">
                  {infobipSettings?.baseUrl && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        Base URL
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {infobipSettings.baseUrl}
                      </p>
                    </div>
                  )}
                  {infobipSettings?.senderId && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        Sender ID
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {infobipSettings.senderId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Webhook Setup */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Webhook URL (for inbound SMS)
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  To receive inbound SMS and delivery reports, set this URL in your Infobip portal
                  under Numbers &gt; Your Number &gt; SMS &gt; Forward to HTTP (MO_JSON_2):
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 p-2 border-2 rounded text-xs break-all select-all"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  >
                    {WEBHOOK_URL}
                  </code>
                  <button
                    onClick={handleCopyWebhook}
                    className="p-2 border-2 rounded hover:opacity-80"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                    title="Copy webhook URL"
                  >
                    <Copy size={14} style={{ color: "var(--win95-text)" }} />
                  </button>
                </div>
              </div>

              <RetroButton
                variant="secondary"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </RetroButton>

              <RetroButton variant="secondary" onClick={handleDisconnect} className="w-full">
                Disconnect
              </RetroButton>
            </div>
          ) : (
            /* ======== NOT CONNECTED STATE ======== */
            <div className="space-y-4">
              {/* Hero */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <MessageCircle size={48} className="mb-4 block" style={{ color: "#FF6B00" }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Connect Infobip Enterprise
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Connect your own Infobip account for custom sender IDs and dedicated numbers.
                </p>
              </div>

              {/* Features */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  What you get
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Direct SMS API integration</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>DACH region optimized</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Per-org billing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Template support (coming)</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div
                className="p-4 border-2 rounded space-y-3"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your Infobip API key"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://xxxxx.api.infobip.com"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                    Sender ID
                  </label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={(e) => handleSenderIdChange(e.target.value)}
                    placeholder="L4YERCAK3"
                    maxLength={16}
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Alphanumeric (max 11) or phone number (+49...)
                  </p>
                </div>
              </div>

              {/* Webhook Setup Instructions */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "#FF6B00", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Step 2: Configure Webhook
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  After saving, go to your Infobip portal and set the inbound SMS forwarding URL.
                  Navigate to Numbers &gt; Your Number &gt; SMS tab &gt; Forward to HTTP.
                  Select <strong>MO_JSON_2</strong> as the renderer type and paste this URL:
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 p-2 border-2 rounded text-xs break-all select-all"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  >
                    {WEBHOOK_URL}
                  </code>
                  <button
                    onClick={handleCopyWebhook}
                    className="p-2 border-2 rounded hover:opacity-80"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                    title="Copy webhook URL"
                  >
                    <Copy size={14} style={{ color: "var(--win95-text)" }} />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <RetroButton onClick={handleTestAndSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Testing &amp; Saving...
                  </>
                ) : (
                  "Test & Save"
                )}
              </RetroButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
