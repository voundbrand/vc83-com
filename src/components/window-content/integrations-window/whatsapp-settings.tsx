"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  Copy,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

interface WhatsAppSettingsProps {
  onBack: () => void;
}

type WhatsAppConnectionStatus = {
  connected: boolean;
  isExpiringSoon?: boolean;
  connection?: {
    id: string;
    wabaId?: string;
    wabaName?: string;
    businessName?: string;
    phoneNumberId?: string;
    phoneNumber?: string;
    verifiedName?: string;
    connectedAt?: number;
    tokenExpiresAt?: number;
  } | null;
} | null | undefined;

export function WhatsAppSettings({ onBack }: WhatsAppSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();
  const { t } = useNamespaceTranslations("ui.integrations");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  // UI state
  const [isConnecting, setIsConnecting] = useState(false);

  // Queries & mutations
  const connectionStatus = useQuery(
    api.oauth.whatsapp.getWhatsAppConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as WhatsAppConnectionStatus;

  const initiateOAuth = useMutation(api.oauth.whatsapp.initiateWhatsAppOAuth);
  const disconnectWhatsApp = useMutation(api.oauth.whatsapp.disconnectWhatsApp);

  const isLoading = connectionStatus === undefined;
  const isConnected = connectionStatus?.connected === true;
  const conn = connectionStatus?.connection;

  const handleConnect = async () => {
    if (!sessionId) return;

    setIsConnecting(true);
    try {
      const result = await initiateOAuth({ sessionId });
      // Redirect to Meta OAuth
      if (result.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (error) {
      notification.error(
        "Connection Failed",
        error instanceof Error ? error.message : "Could not initiate OAuth"
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !conn?.id) return;

    const confirmed = await confirmDialog.confirm({
      title: tx("ui.integrations.whatsapp.disconnect_title", "Disconnect WhatsApp"),
      message: tx(
        "ui.integrations.whatsapp.disconnect_message",
        "This will revoke the WhatsApp connection and stop all direct WhatsApp messaging for your organization. Continue?",
      ),
      confirmText: tx("ui.integrations.whatsapp.disconnect_confirm", "Disconnect"),
      cancelText: tx("ui.integrations.shared.cancel", "Cancel"),
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await disconnectWhatsApp({
        sessionId,
        connectionId: conn.id as any,
      });
      notification.success("Disconnected", "WhatsApp has been disconnected");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Disconnect failed"
      );
    }
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/webhooks/whatsapp`
      : "/webhooks/whatsapp";
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/oauth/whatsapp/callback`
      : "/api/oauth/whatsapp/callback";
  const requiredScopes = [
    "whatsapp_business_management",
    "whatsapp_business_messaging",
    "business_management",
  ];
  const isByoaMode = Boolean(isConnected && conn);

  const copyValue = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    notification.success(
      tx("ui.integrations.shared.copied", "Copied"),
      tx("ui.integrations.shared.copied_to_clipboard", "{label} copied to clipboard", { label }),
    );
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return tx("ui.integrations.shared.unknown", "Unknown");
    return new Date(timestamp).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const daysUntilExpiry = conn?.tokenExpiresAt
    ? Math.floor((conn.tokenExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

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
            {tx("ui.integrations.shared.back", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle size={24} style={{ color: "#25D366" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                {tx("ui.integrations.whatsapp.title", "WhatsApp Business")}
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("ui.integrations.whatsapp.subtitle", "Direct Meta WhatsApp Cloud API")}
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
                {tx("ui.integrations.shared.loading", "Loading...")}
              </p>
            </div>
          ) : isConnected && conn ? (
            /* ======== CONNECTED STATE ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-3 uppercase tracking-wide"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.whatsapp.setup_mode", "Setup Mode")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: !isByoaMode ? "#10b981" : "var(--window-document-border)",
                      background: !isByoaMode ? "rgba(16, 185, 129, 0.08)" : "var(--window-document-bg)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("ui.integrations.whatsapp.mode_platform_managed", "Platform-managed channel")}
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "ui.integrations.whatsapp.mode_platform_managed_desc",
                        "Shared channel profile for quick launch and internal fallback handling.",
                      )}
                    </p>
                  </div>
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: isByoaMode ? "#10b981" : "var(--window-document-border)",
                      background: isByoaMode ? "rgba(16, 185, 129, 0.08)" : "var(--window-document-bg)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("ui.integrations.whatsapp.mode_byoa", "Organization BYOA app")}
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "ui.integrations.whatsapp.mode_byoa_desc",
                        "Meta OAuth app and WABA owned by your organization for full credential control.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.integrations.whatsapp.byoa_setup_packet", "WhatsApp BYOA Setup Packet")}
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 p-2 border rounded font-mono break-all"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <span className="font-bold">
                        {tx("ui.integrations.whatsapp.oauth_callback_label", "OAuth callback:")}
                      </span>{" "}
                      {callbackUrl}
                    </div>
                    <button
                      onClick={() => copyValue(tx("ui.integrations.whatsapp.oauth_callback_url", "OAuth callback URL"), callbackUrl)}
                      title={tx("ui.integrations.whatsapp.copy_callback_url", "Copy callback URL")}
                    >
                      <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 p-2 border rounded font-mono break-all"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <span className="font-bold">{tx("ui.integrations.whatsapp.webhook_url_label", "Webhook URL:")}</span> {webhookUrl}
                    </div>
                    <button
                      onClick={() => copyValue(tx("ui.integrations.whatsapp.webhook_url", "Webhook URL"), webhookUrl)}
                      title={tx("ui.integrations.whatsapp.copy_webhook_url", "Copy webhook URL")}
                    >
                      <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.integrations.whatsapp.meta_scopes", "Meta scopes")}
                  </p>
                  {requiredScopes.map((scope) => (
                    <p key={scope} className="font-mono">{scope}</p>
                  ))}
                </div>
                <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.integrations.whatsapp.agency_handoff_flow", "Agency handoff flow")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>{tx("ui.integrations.whatsapp.handoff_step_1", "Owner approves Meta OAuth in client business manager.")}</li>
                    <li>{tx("ui.integrations.whatsapp.handoff_step_2", "Confirm WABA and verified phone number are selected after redirect.")}</li>
                    <li>{tx("ui.integrations.whatsapp.handoff_step_3", "Validate webhook challenge + inbound/outbound message in canary org before cutover.")}</li>
                  </ol>
                </div>
              </div>

              {/* Status */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                    {tx("ui.integrations.shared.connected", "Connected")}
                  </span>
                </div>

                <div className="space-y-2">
                  {conn.verifiedName && (
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {tx("ui.integrations.whatsapp.verified_name", "Verified Name")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {conn.verifiedName}
                      </p>
                    </div>
                  )}
                  {conn.phoneNumber && (
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {tx("ui.integrations.whatsapp.phone_number", "Phone Number")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {conn.phoneNumber}
                      </p>
                    </div>
                  )}
                  {conn.businessName && (
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {tx("ui.integrations.whatsapp.business", "Business")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {conn.businessName}
                      </p>
                    </div>
                  )}
                  {conn.connectedAt && (
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {tx("ui.integrations.shared.connected", "Connected")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {formatDate(conn.connectedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Token Expiry Warning */}
              {connectionStatus?.isExpiringSoon && daysUntilExpiry !== null && (
                <div
                  className="p-3 border-2 rounded flex items-start gap-2"
                  style={{
                    borderColor: "#f59e0b",
                    background: "rgba(245, 158, 11, 0.05)",
                  }}
                >
                  <AlertTriangle
                    size={16}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: "#f59e0b" }}
                  />
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#f59e0b" }}>
                      {tx("ui.integrations.whatsapp.token_expires_in", "Token expires in {days} days", { days: daysUntilExpiry })}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "ui.integrations.whatsapp.token_expiry_warning",
                        "Reconnect your WhatsApp account to refresh the token before it expires on {date}.",
                        { date: formatDate(conn.tokenExpiresAt) },
                      )}
                    </p>
                  </div>
                </div>
              )}

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
                  {tx("ui.integrations.whatsapp.webhook_url", "Webhook URL")}
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  {tx(
                    "ui.integrations.whatsapp.webhook_help",
                    "Configure this URL in your Meta App Dashboard under WhatsApp > Configuration > Webhook URL.",
                  )}
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
                    onClick={() => copyValue(tx("ui.integrations.whatsapp.webhook_url", "Webhook URL"), webhookUrl)}
                    title={tx("ui.integrations.shared.copy", "Copy")}
                  >
                    <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <a
                href="https://business.facebook.com/settings/whatsapp-business-accounts"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InteriorButton variant="secondary" className="w-full">
                  <ExternalLink size={14} className="mr-1" />
                  {tx("ui.integrations.whatsapp.open_meta_business_settings", "Open Meta Business Settings")}
                </InteriorButton>
              </a>

              <InteriorButton
                variant="secondary"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    {tx("ui.integrations.whatsapp.reconnecting", "Reconnecting...")}
                  </>
                ) : (
                  tx("ui.integrations.whatsapp.reconnect_refresh_token", "Reconnect (Refresh Token)")
                )}
              </InteriorButton>

              <InteriorButton
                variant="secondary"
                onClick={handleDisconnect}
                className="w-full"
              >
                {tx("ui.integrations.whatsapp.disconnect", "Disconnect")}
              </InteriorButton>
            </div>
          ) : (
            /* ======== NOT CONNECTED STATE ======== */
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p
                  className="text-xs font-bold mb-3 uppercase tracking-wide"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.whatsapp.setup_mode", "Setup Mode")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: !isByoaMode ? "#10b981" : "var(--window-document-border)",
                      background: !isByoaMode ? "rgba(16, 185, 129, 0.08)" : "var(--window-document-bg)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("ui.integrations.whatsapp.mode_platform_managed", "Platform-managed channel")}
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "ui.integrations.whatsapp.mode_platform_managed_desc",
                        "Shared channel profile for quick launch and internal fallback handling.",
                      )}
                    </p>
                  </div>
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: isByoaMode ? "#10b981" : "var(--window-document-border)",
                      background: isByoaMode ? "rgba(16, 185, 129, 0.08)" : "var(--window-document-bg)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {tx("ui.integrations.whatsapp.mode_byoa", "Organization BYOA app")}
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "ui.integrations.whatsapp.mode_byoa_desc",
                        "Meta OAuth app and WABA owned by your organization for full credential control.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.integrations.whatsapp.byoa_setup_packet", "WhatsApp BYOA Setup Packet")}
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 p-2 border rounded font-mono break-all"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <span className="font-bold">
                        {tx("ui.integrations.whatsapp.oauth_callback_label", "OAuth callback:")}
                      </span>{" "}
                      {callbackUrl}
                    </div>
                    <button
                      onClick={() => copyValue(tx("ui.integrations.whatsapp.oauth_callback_url", "OAuth callback URL"), callbackUrl)}
                      title={tx("ui.integrations.whatsapp.copy_callback_url", "Copy callback URL")}
                    >
                      <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 p-2 border rounded font-mono break-all"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <span className="font-bold">{tx("ui.integrations.whatsapp.webhook_url_label", "Webhook URL:")}</span> {webhookUrl}
                    </div>
                    <button
                      onClick={() => copyValue(tx("ui.integrations.whatsapp.webhook_url", "Webhook URL"), webhookUrl)}
                      title={tx("ui.integrations.whatsapp.copy_webhook_url", "Copy webhook URL")}
                    >
                      <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.integrations.whatsapp.meta_scopes", "Meta scopes")}
                  </p>
                  {requiredScopes.map((scope) => (
                    <p key={scope} className="font-mono">{scope}</p>
                  ))}
                </div>
                <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.integrations.whatsapp.agency_handoff_flow", "Agency handoff flow")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>{tx("ui.integrations.whatsapp.handoff_step_1", "Owner approves Meta OAuth in client business manager.")}</li>
                    <li>{tx("ui.integrations.whatsapp.handoff_step_2", "Confirm WABA and verified phone number are selected after redirect.")}</li>
                    <li>{tx("ui.integrations.whatsapp.handoff_step_3", "Validate webhook challenge + inbound/outbound message in canary org before cutover.")}</li>
                  </ol>
                </div>
              </div>

              {/* Hero */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <MessageCircle size={48} className="mb-4" style={{ color: "#25D366" }} />
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {tx("ui.integrations.whatsapp.connect_title", "Connect WhatsApp Business")}
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx(
                    "ui.integrations.whatsapp.connect_description",
                    "Connect your WhatsApp Business Account to let your AI agent handle customer conversations directly on WhatsApp.",
                  )}
                </p>
              </div>

              {/* Features */}
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
                  {tx("ui.integrations.whatsapp.what_you_get", "What you get")}
                </p>
                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      {tx("ui.integrations.whatsapp.benefit_1", "AI agent responds to WhatsApp messages 24/7")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      {tx("ui.integrations.whatsapp.benefit_2", "Direct Meta Cloud API — no middleman, lower latency")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      {tx("ui.integrations.whatsapp.benefit_3", "Template messages for booking confirmations & reminders")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      {tx("ui.integrations.whatsapp.benefit_4", "Your own verified business number & identity")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>{tx("ui.integrations.whatsapp.benefit_5", "Per-org billing — Meta bills you directly")}</span>
                  </div>
                </div>
              </div>

              {/* Requirements */}
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
                  {tx("ui.integrations.whatsapp.requirements", "Requirements")}
                </p>
                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <div className="flex items-start gap-2">
                    <span>1.</span>
                    <span>{tx("ui.integrations.whatsapp.requirement_1", "A Meta Business Account (Facebook Business)")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>2.</span>
                    <span>{tx("ui.integrations.whatsapp.requirement_2", "A WhatsApp Business Account (WABA) with a verified phone number")}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>3.</span>
                    <span>
                      {tx("ui.integrations.whatsapp.requirement_3", "Admin permissions on the Meta Business Account")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <InteriorButton
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    {tx("ui.integrations.whatsapp.redirecting_to_meta", "Redirecting to Meta...")}
                  </>
                ) : (
                  tx("ui.integrations.whatsapp.connect_title", "Connect WhatsApp Business")
                )}
              </InteriorButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
