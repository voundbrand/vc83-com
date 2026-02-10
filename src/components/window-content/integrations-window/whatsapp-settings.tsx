"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
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
      title: "Disconnect WhatsApp",
      message:
        "This will revoke the WhatsApp connection and stop all direct WhatsApp messaging for your organization. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
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

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    notification.success("Copied", "Webhook URL copied to clipboard");
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
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
            <MessageCircle size={24} style={{ color: "#25D366" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                WhatsApp Business
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Direct Meta WhatsApp Cloud API
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
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--win95-text)" }}
              />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading...
              </p>
            </div>
          ) : isConnected && conn ? (
            /* ======== CONNECTED STATE ======== */
            <div className="space-y-4">
              {/* Status */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                    Connected
                  </span>
                </div>

                <div className="space-y-2">
                  {conn.verifiedName && (
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--win95-text)" }}
                      >
                        Verified Name
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
                        style={{ color: "var(--win95-text)" }}
                      >
                        Phone Number
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
                        style={{ color: "var(--win95-text)" }}
                      >
                        Business
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
                        style={{ color: "var(--win95-text)" }}
                      >
                        Connected
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
                      Token expires in {daysUntilExpiry} days
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Reconnect your WhatsApp account to refresh the token before it
                      expires on {formatDate(conn.tokenExpiresAt)}.
                    </p>
                  </div>
                </div>
              )}

              {/* Webhook URL */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--win95-text)" }}
                >
                  Webhook URL
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  Configure this URL in your Meta App Dashboard under WhatsApp &gt;
                  Configuration &gt; Webhook URL.
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 p-2 border rounded font-mono text-xs break-all"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  >
                    {webhookUrl}
                  </div>
                  <button onClick={copyWebhookUrl} title="Copy">
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
                <RetroButton variant="secondary" className="w-full">
                  <ExternalLink size={14} className="mr-1" />
                  Open Meta Business Settings
                </RetroButton>
              </a>

              <RetroButton
                variant="secondary"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  "Reconnect (Refresh Token)"
                )}
              </RetroButton>

              <RetroButton
                variant="secondary"
                onClick={handleDisconnect}
                className="w-full"
              >
                Disconnect
              </RetroButton>
            </div>
          ) : (
            /* ======== NOT CONNECTED STATE ======== */
            <div className="space-y-4">
              {/* Hero */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <MessageCircle size={48} className="mb-4" style={{ color: "#25D366" }} />
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "var(--win95-text)" }}
                >
                  Connect WhatsApp Business
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Connect your WhatsApp Business Account to let your AI agent handle
                  customer conversations directly on WhatsApp.
                </p>
              </div>

              {/* Features */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--win95-text)" }}
                >
                  What you get
                </p>
                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      AI agent responds to WhatsApp messages 24/7
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      Direct Meta Cloud API — no middleman, lower latency
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      Template messages for booking confirmations & reminders
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>
                      Your own verified business number & identity
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#10003;</span>
                    <span>Per-org billing — Meta bills you directly</span>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--win95-text)" }}
                >
                  Requirements
                </p>
                <div
                  className="space-y-1 text-xs"
                  style={{ color: "var(--neutral-gray)" }}
                >
                  <div className="flex items-start gap-2">
                    <span>1.</span>
                    <span>A Meta Business Account (Facebook Business)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>2.</span>
                    <span>A WhatsApp Business Account (WABA) with a verified phone number</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>3.</span>
                    <span>
                      Admin permissions on the Meta Business Account
                    </span>
                  </div>
                </div>
              </div>

              {/* Connect Button */}
              <RetroButton
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Redirecting to Meta...
                  </>
                ) : (
                  "Connect WhatsApp Business"
                )}
              </RetroButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
