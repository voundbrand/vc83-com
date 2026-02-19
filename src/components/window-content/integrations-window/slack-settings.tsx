"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
  Unplug,
} from "lucide-react";

interface SlackSettingsProps {
  onBack: () => void;
}

type SlackConnectionStatus =
  | {
      connected: boolean;
      isExpiringSoon?: boolean;
      requiredScopes?: string[];
      connection?: {
        id: string;
        providerEmail: string;
        workspaceId: string;
        workspaceName?: string;
        workspaceDomain?: string;
        botUserId?: string;
        appId?: string;
        scopes: string[];
        connectedAt: number;
        tokenExpiresAt: number;
        status: string;
      } | null;
    }
  | null
  | undefined;

const SLACK_SCOPE_FALLBACK = ["app_mentions:read", "channels:history", "channels:read", "chat:write"];

function formatDate(timestamp?: number): string {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function SlackSettings({ onBack }: SlackSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectionStatus = useQuery(
    api.oauth.slack.getSlackConnectionStatus as any,
    sessionId ? ({ sessionId } as any) : "skip"
  ) as SlackConnectionStatus;

  const initiateSlackOAuth = useMutation(api.oauth.slack.initiateSlackOAuth as any);
  const disconnectSlack = useMutation(api.oauth.slack.disconnectSlack as any);

  const isLoading = connectionStatus === undefined;
  const isConnected = connectionStatus?.connected === true;
  const connection = connectionStatus?.connection ?? null;

  const grantedScopes = useMemo(
    () => new Set(connection?.scopes ?? []),
    [connection?.scopes]
  );
  const requiredScopes = connectionStatus?.requiredScopes ?? SLACK_SCOPE_FALLBACK;
  const slashCommandsEnabled = requiredScopes.includes("commands");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const workspace = params.get("workspace");

    if (success === "slack_connected") {
      notification.success(
        "Slack Connected",
        workspace
          ? `Connected workspace: ${decodeURIComponent(workspace)}`
          : "Slack workspace connected successfully"
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (error) {
      notification.error(
        "Slack Connection Failed",
        decodeURIComponent(error)
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [notification]);

  const handleConnect = async () => {
    if (!sessionId) return;
    setIsConnecting(true);
    try {
      const result = await initiateSlackOAuth({
        sessionId,
        connectionType: "organizational",
      });
      window.location.href = result.authUrl;
    } catch (err) {
      notification.error(
        "Connection Error",
        err instanceof Error ? err.message : "Failed to start Slack OAuth"
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !connection?.id) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Slack",
      message:
        "Disconnecting will stop inbound Slack events and outbound Slack replies. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    try {
      await disconnectSlack({
        sessionId,
        connectionId: connection.id as Id<"oauthConnections">,
      });
      notification.success("Disconnected", "Slack integration disconnected");
    } catch (err) {
      notification.error(
        "Disconnect Failed",
        err instanceof Error ? err.message : "Could not disconnect Slack"
      );
    }
  };

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/oauth/slack/callback`
      : "/api/oauth/slack/callback";

  const eventsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/slack/events`
      : "/slack/events";
  const slashCommandsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/slack/commands`
      : "/slack/commands";

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notification.success("Copied", `${label} copied to clipboard`);
    } catch {
      notification.error("Copy Failed", "Clipboard is unavailable in this browser");
    }
  };

  const setupValues = [
    { label: "OAuth Callback URL", value: callbackUrl },
    { label: "Events Request URL", value: eventsUrl },
    {
      label: "Slash Commands URL",
      value: slashCommandsEnabled ? slashCommandsUrl : "Disabled (commands scope off)",
      copyable: slashCommandsEnabled,
    },
  ];

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
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
            <MessageSquare size={22} style={{ color: "#4A154B" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                Slack
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Team notifications and commands
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--window-document-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading Slack connection status...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <p className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: "var(--window-document-text)" }}>
                  Setup Mode
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: !isConnected ? "#10b981" : "var(--window-document-border)",
                      background: !isConnected ? "rgba(16, 185, 129, 0.08)" : "var(--window-document-bg)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      Platform-managed app
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      Default fallback for fast launch. No org-specific Slack credentials to rotate.
                    </p>
                  </div>
                  <div
                    className="rounded border p-3"
                    style={{
                      borderColor: isConnected ? "#10b981" : "var(--window-document-border)",
                      background: isConnected ? "rgba(16, 185, 129, 0.08)" : "var(--window-document-bg)",
                    }}
                  >
                    <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      Organization BYOA app
                    </p>
                    <p style={{ color: "var(--neutral-gray)" }}>
                      Use your own Slack app and workspace install for tenant-specific ownership and token rotation.
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    Slack BYOA Setup Packet
                  </p>
                  <a
                    href="https://api.slack.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: "var(--tone-accent)" }}
                  >
                    Open Slack App Dashboard
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className="space-y-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                  {setupValues.map((field) => (
                    <div key={field.label} className="flex items-center gap-2">
                      <div
                        className="flex-1 p-2 rounded border font-mono break-all"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <span className="font-bold" style={{ color: "var(--window-document-text)" }}>
                          {field.label}:
                        </span>{" "}
                        {field.value}
                      </div>
                      {field.copyable !== false && (
                        <button onClick={() => copyValue(field.label, field.value)} title={`Copy ${field.label}`}>
                          <Copy size={14} style={{ color: "var(--neutral-gray)" }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                    OAuth Bot Token Scopes
                  </p>
                  {requiredScopes.map((scope) => (
                    <p key={scope} className="font-mono">{scope}</p>
                  ))}
                </div>
                <div className="mt-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <p className="font-bold" style={{ color: "var(--window-document-text)" }}>
                    Agency handoff flow
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create Slack app in client workspace and paste values above.</li>
                    <li>Install app to workspace, then run Connect Slack Workspace in this panel.</li>
                    <li>Confirm app mention event and one slash command in client canary channel.</li>
                  </ol>
                </div>
              </div>

              {isConnected && connection ? (
                <>
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
                        BYOA Workspace Connected
                      </span>
                    </div>

                    <div className="space-y-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                      <p>
                        <span className="font-bold">Workspace:</span>{" "}
                        {connection.workspaceName || connection.workspaceId}
                      </p>
                      <p>
                        <span className="font-bold">Workspace ID:</span>{" "}
                        {connection.workspaceId}
                      </p>
                      <p>
                        <span className="font-bold">Bot User ID:</span>{" "}
                        {connection.botUserId || "Unavailable"}
                      </p>
                      <p>
                        <span className="font-bold">Connected:</span>{" "}
                        {formatDate(connection.connectedAt)}
                      </p>
                    </div>
                  </div>

                  {connectionStatus?.isExpiringSoon && (
                    <div
                      className="p-3 border-2 rounded flex items-start gap-2"
                      style={{
                        borderColor: "#f59e0b",
                        background: "rgba(245, 158, 11, 0.06)",
                      }}
                    >
                      <AlertTriangle
                        size={16}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: "#f59e0b" }}
                      />
                      <div className="text-xs">
                        <p className="font-bold" style={{ color: "#92400e" }}>
                          Token requires reconnection soon
                        </p>
                        <p style={{ color: "var(--neutral-gray)" }}>
                          Current token expires on {formatDate(connection.tokenExpiresAt)}.
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    className="p-4 border-2 rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                      Scope Verification
                    </p>
                    <div className="space-y-1 text-xs">
                      {requiredScopes.map((scope) => {
                        const granted = grantedScopes.has(scope);
                        return (
                          <div
                            key={scope}
                            className="flex items-center justify-between"
                            style={{ color: granted ? "#065f46" : "#7f1d1d" }}
                          >
                            <span className="font-mono">{scope}</span>
                            <span className="font-bold">{granted ? "Granted" : "Missing"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                      style={{
                        background: "#000000",
                        color: "#ffffff",
                        border: "1px solid #ffffff",
                        borderRadius: "6px",
                      }}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Reconnecting...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          Reconnect
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="desktop-interior-button w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <Unplug size={14} />
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div
                    className="p-4 border-2 rounded"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                      Slack BYOA is not connected
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Connect your Slack workspace to move from platform-managed fallback into org-owned routing and credentials.
                    </p>
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                    style={{
                      background: "#000000",
                      color: "#ffffff",
                      border: "1px solid #ffffff",
                      borderRadius: "6px",
                    }}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        Connect Slack Workspace
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
