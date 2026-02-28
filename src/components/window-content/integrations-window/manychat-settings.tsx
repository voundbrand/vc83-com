"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation with 25-export manychat module
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { InteriorButton } from "@/components/ui/interior-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  MessageSquare,
} from "lucide-react";

interface ManyChatSettingsProps {
  onBack: () => void;
}

export function ManyChatSettings({ onBack }: ManyChatSettingsProps) {
  const { user, sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [syncContacts, setSyncContacts] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Default flow mappings
  const [orderConfirmationFlow, setOrderConfirmationFlow] = useState("");
  const [eventReminderFlow, setEventReminderFlow] = useState("");
  const [welcomeSequenceFlow, setWelcomeSequenceFlow] = useState("");
  const [abandonedCartFlow, setAbandonedCartFlow] = useState("");

  // Query ManyChat settings
  const settings = useQuery(
    api.integrations.manychat.getManyChatSettings,
    sessionId ? { sessionId } : "skip"
  ) as {
    configured: boolean;
    enabled: boolean;
    hasApiKey: boolean;
    syncContacts: boolean;
    defaultFlows: Record<string, string>;
  } | null | undefined;

  // Mutations and actions
  const saveSettings = useMutation(api.integrations.manychat.saveManyChatSettings);
  const testConnection = useAction(api.integrations.manychat.testManyChatConnection);

  const isLoading = settings === undefined;
  const isConfigured = settings?.configured === true;
  const isEnabled = settings?.enabled === true;

  // Populate form fields from saved settings
  useEffect(() => {
    if (settings && isConfigured) {
      setSyncContacts(settings.syncContacts ?? true);
      if (settings.defaultFlows) {
        setOrderConfirmationFlow(settings.defaultFlows.orderConfirmation || "");
        setEventReminderFlow(settings.defaultFlows.eventReminder || "");
        setWelcomeSequenceFlow(settings.defaultFlows.welcomeSequence || "");
        setAbandonedCartFlow(settings.defaultFlows.abandonedCart || "");
      }
    }
  }, [settings, isConfigured]);

  const handleConnect = async () => {
    if (!sessionId) {
      notification.error(
        "Sign In Required",
        "You must be signed in to configure ManyChat"
      );
      return;
    }

    if (!apiKey.trim()) {
      setValidationError("Please enter your ManyChat API key");
      return;
    }

    setIsConnecting(true);
    setValidationError(null);

    try {
      await saveSettings({
        sessionId,
        apiKey: apiKey.trim(),
        enabled: true,
        syncContacts,
        defaultFlows: {
          orderConfirmation: orderConfirmationFlow || undefined,
          eventReminder: eventReminderFlow || undefined,
          welcomeSequence: welcomeSequenceFlow || undefined,
          abandonedCart: abandonedCartFlow || undefined,
        },
      });

      notification.success("Connected!", "ManyChat settings saved successfully");
      setApiKey("");
    } catch (error) {
      console.error("Failed to save ManyChat settings:", error);
      notification.error(
        "Connection Error",
        error instanceof Error
          ? error.message
          : "Failed to save ManyChat settings"
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
        setTestResult({
          success: true,
          message: "Connection successful! ManyChat API is reachable.",
        });
        notification.success("Test Passed", "ManyChat connection is working");
      } else {
        setTestResult({
          success: false,
          message: result.error || "Connection test failed",
        });
        notification.error(
          "Test Failed",
          result.error || "Connection test failed"
        );
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Connection test failed";
      setTestResult({ success: false, message: msg });
      notification.error("Test Failed", msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect ManyChat",
      message:
        "Are you sure you want to disable ManyChat? This will stop all automated messaging and contact sync.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await saveSettings({
        sessionId,
        apiKey: "",
        enabled: false,
        syncContacts: false,
      });

      notification.success("Disconnected", "ManyChat has been disabled");
    } catch (error) {
      console.error("Failed to disconnect ManyChat:", error);
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
        apiKey: apiKey.trim() || "__keep_existing__",
        enabled: true,
        syncContacts,
        defaultFlows: {
          orderConfirmation: orderConfirmationFlow || undefined,
          eventReminder: eventReminderFlow || undefined,
          welcomeSequence: welcomeSequenceFlow || undefined,
          abandonedCart: abandonedCartFlow || undefined,
        },
      });

      notification.success("Settings Updated", "ManyChat configuration saved");
    } catch (error) {
      console.error("Failed to update ManyChat settings:", error);
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to update settings"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/manychat`
      : "/api/webhooks/manychat";

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    notification.success("Copied", "Webhook URL copied to clipboard");
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div
        className="flex flex-col h-full"
        style={{ background: "var(--window-document-bg)" }}
      >
        {/* Header with Back Button */}
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
            {tx("ui.integrations.shared.back", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare size={24} style={{ color: "#0084FF" }} />
            <div>
              <h2
                className="font-bold text-sm"
                style={{ color: "var(--window-document-text)" }}
              >
                {tx("ui.integrations.manychat.title", "ManyChat")}
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("ui.integrations.manychat.subtitle", "Multi-channel messaging automation")}
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
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--window-document-text)" }}
              />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("ui.integrations.manychat.loading_connection_status", "Loading connection status...")}
              </p>
            </div>
          ) : isConfigured && isEnabled ? (
            /* Connected State */
            <div className="space-y-4">
              {/* Connection Status */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#10b981" }}
                  >
                    {tx("ui.integrations.shared.connected", "Connected")}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <p
                      className="text-xs font-bold mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {tx("ui.integrations.shared.api_key", "API Key")}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      {settings?.hasApiKey
                        ? tx("ui.integrations.manychat.configured_hidden", "Configured (hidden)")
                        : tx("ui.integrations.shared.not_set", "Not set")}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs font-bold mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {tx("ui.integrations.manychat.contact_sync", "Contact Sync")}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      {settings?.syncContacts
                        ? tx("ui.integrations.shared.enabled", "Enabled")
                        : tx("ui.integrations.shared.disabled", "Disabled")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Connection Result */}
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

              {/* Available Features */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.manychat.available_features", "Available Features")}
                </p>
                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_facebook_messenger", "Facebook Messenger automation")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_instagram_direct", "Instagram Direct messaging")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_whatsapp", "WhatsApp messaging (via ManyChat)")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_sms", "SMS messaging")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_subscriber_management", "Subscriber management & tagging")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_flow_triggering", "Flow triggering from platform events")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>{tx("ui.integrations.manychat.feature_contact_sync", "Contact sync (CRM to ManyChat)")}</span>
                  </div>
                </div>
              </div>

              {/* Webhook URL */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.shared.webhook_url", "Webhook URL")}
                </p>
                <p
                  className="text-xs mb-2"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {tx("ui.integrations.manychat.webhook_help", "Add this URL in your ManyChat Flow actions to receive events:")}
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 p-2 border rounded font-mono text-xs break-all"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                  >
                    {webhookUrl}
                  </div>
                  <button
                    onClick={handleCopyWebhookUrl}
                    className="p-2 border-2 rounded hover:bg-gray-100"
                    style={{ borderColor: "var(--window-document-border)" }}
                    title={tx("ui.integrations.manychat.copy_webhook_url", "Copy webhook URL")}
                  >
                    <Copy size={14} style={{ color: "var(--window-document-text)" }} />
                  </button>
                </div>
              </div>

              {/* Default Flow Mappings */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.manychat.default_flow_mappings", "Default Flow Mappings")}
                </p>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {tx(
                    "ui.integrations.manychat.default_flow_mappings_help",
                    "Map platform events to ManyChat flows. Enter the flow namespace from ManyChat.",
                  )}
                </p>

                <div className="space-y-3">
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {tx("ui.integrations.manychat.order_confirmation_flow", "Order Confirmation Flow")}
                    </label>
                    <input
                      type="text"
                      value={orderConfirmationFlow}
                      onChange={(e) => setOrderConfirmationFlow(e.target.value)}
                      placeholder={tx("ui.integrations.manychat.flow_namespace_example", "e.g. content20250101000001_000000")}
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {tx("ui.integrations.manychat.event_reminder_flow", "Event Reminder Flow")}
                    </label>
                    <input
                      type="text"
                      value={eventReminderFlow}
                      onChange={(e) => setEventReminderFlow(e.target.value)}
                      placeholder={tx("ui.integrations.manychat.flow_namespace", "Flow namespace")}
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {tx("ui.integrations.manychat.welcome_sequence_flow", "Welcome Sequence Flow")}
                    </label>
                    <input
                      type="text"
                      value={welcomeSequenceFlow}
                      onChange={(e) => setWelcomeSequenceFlow(e.target.value)}
                      placeholder={tx("ui.integrations.manychat.flow_namespace", "Flow namespace")}
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs font-bold block mb-1"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {tx("ui.integrations.manychat.abandoned_cart_flow", "Abandoned Cart Flow")}
                    </label>
                    <input
                      type="text"
                      value={abandonedCartFlow}
                      onChange={(e) => setAbandonedCartFlow(e.target.value)}
                      placeholder={tx("ui.integrations.manychat.flow_namespace", "Flow namespace")}
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
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
                        {tx("ui.integrations.shared.saving", "Saving...")}
                      </>
                    ) : (
                      tx("ui.integrations.manychat.save_flow_mappings", "Save Flow Mappings")
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
                      {tx("ui.integrations.manychat.testing", "Testing...")}
                    </>
                  ) : (
                    tx("ui.integrations.manychat.test_connection", "Test Connection")
                  )}
                </InteriorButton>
                <InteriorButton
                  variant="secondary"
                  onClick={handleDisconnect}
                  className="flex-1"
                >
                  {tx("ui.integrations.shared.disconnect", "Disconnect")}
                </InteriorButton>
              </div>
            </div>
          ) : (
            /* Not Connected State */
            <div className="space-y-4">
              <div
                className="p-6 border-2 rounded text-center"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <MessageSquare size={48} className="mb-4" style={{ color: "#0084FF" }} />
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.shared.not_connected", "Not Connected")}
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {tx(
                    "ui.integrations.manychat.not_connected_description",
                    "Connect your ManyChat account to automate messaging across Facebook Messenger, Instagram, WhatsApp, and SMS.",
                  )}
                </p>
              </div>

              {/* Features List */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.shared.features", "Features")}
                </p>
                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <div className="flex items-start gap-2">
                    <span>&#128172;</span>
                    <span>
                      {tx("ui.integrations.manychat.feature_channel_list", "Facebook Messenger, Instagram, WhatsApp, SMS")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128101;</span>
                    <span>{tx("ui.integrations.manychat.feature_subscriber_segmentation", "Subscriber management and segmentation")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#9889;</span>
                    <span>
                      {tx("ui.integrations.manychat.feature_trigger_automation", "Trigger automation flows from platform events")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128260;</span>
                    <span>{tx("ui.integrations.manychat.feature_sync_crm_contacts", "Sync CRM contacts to ManyChat subscribers")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128274;</span>
                    <span>{tx("ui.integrations.manychat.feature_secure_auth", "Secure API key authentication")}</span>
                  </div>
                </div>
              </div>

              {/* Connection Form */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-3"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.manychat.enter_api_key", "Enter your ManyChat API key")}
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
                      {tx("ui.integrations.shared.api_key", "API Key")}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder={tx("ui.integrations.manychat.api_key_placeholder", "Your ManyChat API key")}
                        className="w-full px-2 py-1 border-2 text-xs pr-8"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {showApiKey ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      {tx("ui.integrations.manychat.api_key_help", "Found in ManyChat Settings > API > Token")}
                    </p>
                  </div>

                  {/* Sync Contacts Toggle */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncContacts}
                        onChange={(e) => setSyncContacts(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span
                        className="text-xs"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {tx("ui.integrations.manychat.enable_contact_sync", "Enable contact sync (CRM to ManyChat)")}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Help Link */}
              <a
                href="https://support.manychat.com/support/solutions/articles/36000191105-api-introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: "var(--tone-accent)" }}
              >
                <ExternalLink size={12} />
                {tx("ui.integrations.manychat.how_to_find_api_key", "How to find your ManyChat API key")}
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
                    {tx("ui.integrations.shared.connecting", "Connecting...")}
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} className="mr-2 inline" />
                    {tx("ui.integrations.manychat.connect", "Connect ManyChat")}
                  </>
                )}
              </InteriorButton>

              {!user && (
                <p
                  className="text-xs text-center italic"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  {tx("ui.integrations.manychat.sign_in_required", "Please sign in to connect your ManyChat account")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
