"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { Loader2, CheckCircle2, ArrowLeft, Send } from "lucide-react";

interface ResendSettingsProps {
  onBack: () => void;
}

export function ResendSettings({ onBack }: ResendSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);

  // Queries & mutations
  const resendSettings = useQuery(
    api.integrations.resend.getResendSettings,
    sessionId ? { sessionId } : "skip"
  );
  const saveSettings = useMutation(api.integrations.resend.saveResendSettings);
  const disconnect = useMutation(api.integrations.resend.disconnectResend);
  const testConnection = useAction(api.integrations.resend.testResendConnection);

  const isLoading = resendSettings === undefined;
  const isConnected = resendSettings?.configured && resendSettings?.enabled;

  const handleTestConnection = async () => {
    if (!sessionId) return;
    setIsTesting(true);
    try {
      const result = await testConnection({ sessionId });
      if (result.success) {
        setVerifiedDomains(result.domains ?? []);
        notification.success("Connection OK", "Resend API key is valid");
      } else {
        notification.error("Test Failed", result.error ?? "Could not connect to Resend");
      }
    } catch (error) {
      notification.error(
        "Test Failed",
        error instanceof Error ? error.message : "Could not connect to Resend"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId) return;
    if (!apiKey.trim() || !senderEmail.trim()) {
      notification.error("Missing Fields", "API Key and Sender Email are required");
      return;
    }
    setIsSaving(true);
    try {
      // Test first
      const result = await testConnection({
        sessionId,
        apiKey: apiKey.trim(),
      });
      if (!result.success) {
        notification.error("Invalid API Key", result.error ?? "Could not verify API key");
        setIsSaving(false);
        return;
      }
      setVerifiedDomains(result.domains ?? []);
      // Save
      await saveSettings({
        sessionId,
        apiKey: apiKey.trim(),
        senderEmail: senderEmail.trim(),
        replyToEmail: replyToEmail.trim() || undefined,
      });
      notification.success("Saved", "Resend email settings saved successfully");
      setApiKey("");
      setSenderEmail("");
      setReplyToEmail("");
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Could not save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;
    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Resend",
      message:
        "This will remove your Resend API key and stop all branded email sending for your organization. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) return;
    try {
      await disconnect({ sessionId });
      setVerifiedDomains([]);
      notification.success("Disconnected", "Resend has been disconnected");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Disconnect failed"
      );
    }
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
            <Send size={24} style={{ color: "#000000" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                Resend Email
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Branded transactional email
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
                  {resendSettings?.senderEmail && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        Sender Email
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {resendSettings.senderEmail}
                      </p>
                    </div>
                  )}
                  {resendSettings?.replyToEmail && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                        Reply-To Email
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {resendSettings.replyToEmail}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verified Domains */}
              {verifiedDomains.length > 0 && (
                <div
                  className="p-4 border-2 rounded"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
                >
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    Verified Domains
                  </p>
                  <div className="space-y-1">
                    {verifiedDomains.map((domain) => (
                      <div key={domain} className="flex items-center gap-2">
                        <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                        <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {domain}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                <Send size={48} className="mb-4 block" style={{ color: "#000000" }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Connect Resend Email
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Send branded emails from your own domain. Customers see YOUR brand, not ours.
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
                    <span>Custom sender domain</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Your brand identity</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Transactional + marketing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Per-org API key</span>
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
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="hello@yourdomain.com"
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
                    Reply-To Email{" "}
                    <span className="font-normal" style={{ color: "var(--neutral-gray)" }}>
                      (optional)
                    </span>
                  </label>
                  <input
                    type="email"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    placeholder="support@yourdomain.com"
                    className="w-full p-2 border-2 rounded text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <RetroButton onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Testing & Saving...
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
