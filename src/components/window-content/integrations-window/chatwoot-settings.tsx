"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation with large integration modules
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { RetroButton } from "@/components/retro-button";
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
  Copy,
  MessageCircle,
  Mail,
  MessageSquare,
  Send,
  Headset,
} from "lucide-react";

interface ChatwootSettingsProps {
  onBack: () => void;
}

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/>
  </svg>
);

// Channels that Chatwoot supports
const AVAILABLE_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle size={12} />, color: "#25D366" },
  { id: "email", label: "Email", icon: <Mail size={12} />, color: "#EA4335" },
  { id: "webchat", label: "Live Chat", icon: <MessageSquare size={12} />, color: "#1F93FF" },
  { id: "instagram", label: "Instagram", icon: <InstagramIcon size={12} />, color: "#E1306C" },
  { id: "facebook_messenger", label: "Messenger", icon: <MessageCircle size={12} />, color: "#0084FF" },
  { id: "sms", label: "SMS", icon: <MessageSquare size={12} />, color: "#6B7280" },
  { id: "telegram", label: "Telegram", icon: <Send size={12} />, color: "#0088cc" },
] as const;

type ChatwootSettingsData = {
  configured: boolean;
  enabled: boolean;
  chatwootUrl?: string;
  accountId?: number;
  accountName?: string;
  configuredChannels?: string[];
  webhookUrl?: string;
} | null | undefined;

export function ChatwootSettings({ onBack }: ChatwootSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Form state
  const [chatwootUrl, setChatwootUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showApiToken, setShowApiToken] = useState(false);
  const [enabledChannels, setEnabledChannels] = useState<Set<string>>(new Set());

  // UI state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Queries & mutations
  const settings = useQuery(
    api.integrations.chatwoot.getChatwootSettings,
    sessionId ? { sessionId } : "skip"
  ) as ChatwootSettingsData;

  const saveSettings = useMutation(api.integrations.chatwoot.saveChatwootSettings);
  const disconnectChatwoot = useMutation(api.integrations.chatwoot.disconnectChatwoot);
  const testConnection = useAction(api.integrations.chatwoot.testChatwootConnection);

  const isLoading = settings === undefined;
  const isConfigured = settings?.configured && settings?.enabled;

  // Populate form from saved settings
  useEffect(() => {
    if (settings?.configured) {
      if (settings.chatwootUrl) setChatwootUrl(settings.chatwootUrl);
      if (settings.accountId) setAccountId(String(settings.accountId));
      if (settings.configuredChannels) {
        setEnabledChannels(new Set(settings.configuredChannels));
      }
    }
  }, [settings]);

  const toggleChannel = (channelId: string) => {
    setEnabledChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const handleTest = async () => {
    if (!chatwootUrl || !apiToken || !accountId) {
      notification.error("Missing Fields", "Please fill in all connection fields");
      return;
    }

    setIsTesting(true);
    try {
      const result = await testConnection({
        chatwootUrl: chatwootUrl.trim(),
        chatwootApiToken: apiToken.trim(),
        chatwootAccountId: Number(accountId),
      });

      if (result.success) {
        notification.success("Connection OK", `Connected to: ${result.accountName}`);
      } else {
        notification.error("Connection Failed", result.error || "Could not connect");
      }
    } catch (error) {
      notification.error("Error", error instanceof Error ? error.message : "Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!sessionId || !chatwootUrl || !apiToken || !accountId) {
      notification.error("Missing Fields", "Please fill in all required fields");
      return;
    }

    if (enabledChannels.size === 0) {
      notification.error("No Channels", "Please enable at least one channel");
      return;
    }

    setIsConnecting(true);
    try {
      // Test first
      const testResult = await testConnection({
        chatwootUrl: chatwootUrl.trim(),
        chatwootApiToken: apiToken.trim(),
        chatwootAccountId: Number(accountId),
      });

      if (!testResult.success) {
        notification.error("Connection Failed", testResult.error || "Could not connect");
        setIsConnecting(false);
        return;
      }

      // Save
      await saveSettings({
        sessionId,
        chatwootUrl: chatwootUrl.trim(),
        chatwootApiToken: apiToken.trim(),
        chatwootAccountId: Number(accountId),
        webhookSecret: webhookSecret.trim() || undefined,
        enabled: true,
        configuredChannels: Array.from(enabledChannels),
        accountName: testResult.accountName,
      });

      notification.success("Connected", `Chatwoot connected: ${testResult.accountName}`);
      setApiToken("");
      setWebhookSecret("");
    } catch (error) {
      notification.error("Error", error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveChannels = async () => {
    if (!sessionId || !settings?.chatwootUrl) return;

    setIsSaving(true);
    try {
      await saveSettings({
        sessionId,
        chatwootUrl: settings.chatwootUrl,
        chatwootApiToken: apiToken.trim() || "***existing***", // Backend won't overwrite if unchanged
        chatwootAccountId: settings.accountId || 0,
        enabled: true,
        configuredChannels: Array.from(enabledChannels),
        accountName: settings.accountName,
      });
      notification.success("Saved", "Channel configuration updated");
    } catch (error) {
      notification.error("Error", error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Chatwoot",
      message: "This will remove all channel bindings and stop all inbound/outbound messaging through Chatwoot. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await disconnectChatwoot({ sessionId });
      notification.success("Disconnected", "Chatwoot has been disconnected");
    } catch (error) {
      notification.error("Error", error instanceof Error ? error.message : "Disconnect failed");
    }
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/webhooks/chatwoot`
    : "/webhooks/chatwoot";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    notification.success("Copied", "Webhook URL copied to clipboard");
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
            <Headset size={24} style={{ color: "#1F93FF" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                Chatwoot
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Unified inbox & multi-channel messaging
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Loading...</p>
            </div>
          ) : isConfigured ? (
            /* ======== CONNECTED STATE ======== */
            <div className="space-y-4">
              {/* Status */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>Connected</span>
                </div>

                <div className="space-y-2">
                  {settings?.accountName && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>Account</p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>{settings.accountName}</p>
                    </div>
                  )}
                  {settings?.chatwootUrl && (
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>Instance URL</p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>{settings.chatwootUrl}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Webhook URL */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Webhook URL
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  Add this URL in your Chatwoot account settings under Integrations &gt; Webhooks.
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 p-2 border rounded font-mono text-xs break-all"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                  >
                    {webhookUrl}
                  </div>
                  <button onClick={copyWebhookUrl} title="Copy">
                    <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                  </button>
                </div>
              </div>

              {/* Channel Bindings */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Active Channels
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_CHANNELS.map((ch) => (
                    <label
                      key={ch.id}
                      className="flex items-center gap-2 p-2 border rounded cursor-pointer"
                      style={{
                        borderColor: enabledChannels.has(ch.id)
                          ? "var(--win95-highlight)"
                          : "var(--win95-border)",
                        background: enabledChannels.has(ch.id)
                          ? "rgba(0, 120, 215, 0.05)"
                          : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabledChannels.has(ch.id)}
                        onChange={() => toggleChannel(ch.id)}
                        className="w-3.5 h-3.5"
                      />
                      <span style={{ color: ch.color }}>{ch.icon}</span>
                      <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                        {ch.label}
                      </span>
                    </label>
                  ))}
                </div>
                <RetroButton
                  onClick={handleSaveChannels}
                  disabled={isSaving}
                  className="w-full mt-3"
                >
                  {isSaving ? (
                    <><Loader2 size={14} className="mr-1 animate-spin" />Saving...</>
                  ) : (
                    "Save Channel Config"
                  )}
                </RetroButton>
              </div>

              {/* Open Chatwoot */}
              {settings?.chatwootUrl && (
                <a
                  href={`${settings.chatwootUrl}/app/accounts/${settings.accountId}/dashboard`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <RetroButton variant="secondary" className="w-full">
                    <ExternalLink size={14} className="mr-1" />
                    Open Chatwoot Dashboard
                  </RetroButton>
                </a>
              )}

              {/* Disconnect */}
              <RetroButton variant="secondary" onClick={handleDisconnect} className="w-full">
                Disconnect
              </RetroButton>
            </div>
          ) : (
            /* ======== NOT CONNECTED STATE ======== */
            <div className="space-y-4">
              {/* Info */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <Headset size={48} className="mb-4" style={{ color: "#1F93FF" }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Connect Chatwoot
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Chatwoot provides a unified inbox for WhatsApp, Email, Instagram, Facebook Messenger, SMS, Telegram, and live chat.
                </p>
              </div>

              {/* Connection Form */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Connection Details
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                      Instance URL *
                    </label>
                    <input
                      type="text"
                      value={chatwootUrl}
                      onChange={(e) => setChatwootUrl(e.target.value)}
                      placeholder="https://chatwoot.yourdomain.com"
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                      API Access Token *
                    </label>
                    <div className="relative">
                      <input
                        type={showApiToken ? "text" : "password"}
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="Your Chatwoot API token"
                        className="w-full px-2 py-1 border-2 text-xs pr-8"
                        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
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
                      Found in Chatwoot &gt; Profile Settings &gt; Access Token
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                      Account ID *
                    </label>
                    <input
                      type="number"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="1"
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      The numeric ID of your Chatwoot account
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                      Webhook Secret (optional)
                    </label>
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Optional shared secret for webhook verification"
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Channel Selection */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Enable Channels
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                  Select which channels to route through Chatwoot. You must have matching inboxes configured in your Chatwoot account.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_CHANNELS.map((ch) => (
                    <label
                      key={ch.id}
                      className="flex items-center gap-2 p-2 border rounded cursor-pointer"
                      style={{
                        borderColor: enabledChannels.has(ch.id) ? "var(--win95-highlight)" : "var(--win95-border)",
                        background: enabledChannels.has(ch.id) ? "rgba(0, 120, 215, 0.05)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabledChannels.has(ch.id)}
                        onChange={() => toggleChannel(ch.id)}
                        className="w-3.5 h-3.5"
                      />
                      <span style={{ color: ch.color }}>{ch.icon}</span>
                      <span className="text-xs" style={{ color: "var(--win95-text)" }}>{ch.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <RetroButton variant="secondary" onClick={handleTest} disabled={isTesting} className="flex-1">
                  {isTesting ? (
                    <><Loader2 size={14} className="mr-1 animate-spin" />Testing...</>
                  ) : (
                    "Test Connection"
                  )}
                </RetroButton>
                <RetroButton onClick={handleConnect} disabled={isConnecting} className="flex-1">
                  {isConnecting ? (
                    <><Loader2 size={14} className="mr-1 animate-spin" />Connecting...</>
                  ) : (
                    "Connect"
                  )}
                </RetroButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
