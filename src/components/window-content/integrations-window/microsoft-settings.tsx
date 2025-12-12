"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { MicrosoftScopeSelector } from "../settings-window/microsoft-scope-selector";

interface MicrosoftSettingsProps {
  onBack: () => void;
}

export function MicrosoftSettings({ onBack }: MicrosoftSettingsProps) {
  const { user, sessionId } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Query Microsoft connection status
  const connection = useQuery(
    api.oauth.microsoft.getUserMicrosoftConnection,
    sessionId ? { sessionId } : "skip"
  );

  // Query email sync status
  const emailSyncStatus = useQuery(
    api.emails.getEmailSyncStatus,
    connection?.id ? { connectionId: connection.id } : "skip"
  );

  // Mutations and actions
  const initiateMicrosoftOAuth = useMutation(api.oauth.microsoft.initiateMicrosoftOAuth);
  const disconnectMicrosoft = useMutation(api.oauth.microsoft.disconnectMicrosoft);
  const updateSyncSettings = useMutation(api.emails.updateSyncSettings);
  const syncEmails = useAction(api.emails.syncEmailsFromMicrosoft);

  // Track previous connection status to detect changes
  const [prevConnectionStatus, setPrevConnectionStatus] = useState<string | null>(null);

  // Monitor connection status changes
  useEffect(() => {
    if (!connection) return;

    // If connection changed from active to error/expired, notify user
    if (prevConnectionStatus === "active" && (connection.status === "error" || connection.status === "expired")) {
      notification.error(
        "Connection Issue",
        connection.lastSyncError || "Your Microsoft connection has expired"
      );
    }

    setPrevConnectionStatus(connection.status);
  }, [connection?.status, connection?.lastSyncError, notification, prevConnectionStatus]);

  // Check URL params for OAuth callback messages
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const email = params.get("email");

    if (success === "microsoft_connected" && email) {
      notification.success(
        "Microsoft Connected!",
        `Successfully connected account: ${decodeURIComponent(email)}`
      );

      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (error) {
      notification.error(
        "Connection Failed",
        `Could not connect Microsoft account: ${decodeURIComponent(error)}`
      );

      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [notification]);

  const handleConnect = async () => {
    if (!sessionId) {
      notification.error(
        "Sign In Required",
        "You must be signed in to connect Microsoft account"
      );
      return;
    }

    setIsConnecting(true);

    try {
      const result = await initiateMicrosoftOAuth({
        sessionId,
        connectionType: "personal",
        requestedScopes: selectedScopes,
      });

      // Redirect to Microsoft OAuth page
      window.location.href = result.authUrl;
    } catch (error) {
      console.error("Failed to initiate OAuth:", error);
      notification.error(
        "Connection Error",
        error instanceof Error ? error.message : "Failed to start connection process"
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !connection?.id) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Microsoft Account",
      message: "Are you sure you want to disconnect your Microsoft account? This will disable email syncing and other integrations.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) {
      return;
    }

    try {
      await disconnectMicrosoft({ sessionId, connectionId: connection.id });

      notification.success(
        "Disconnected",
        "Microsoft account disconnected successfully"
      );
    } catch (error) {
      console.error("Failed to disconnect:", error);
      notification.error(
        "Disconnect Failed",
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  const handleEmailSyncToggle = async (enabled: boolean) => {
    if (!sessionId || !connection?.id) return;

    try {
      await updateSyncSettings({
        sessionId,
        connectionId: connection.id,
        syncSettings: {
          email: enabled,
        },
      });

      notification.success(
        enabled ? "Email Sync Enabled" : "Email Sync Disabled",
        enabled
          ? "Email syncing has been enabled"
          : "Email syncing has been disabled"
      );
    } catch (error) {
      console.error("Failed to update sync settings:", error);
      notification.error(
        "Update Failed",
        error instanceof Error ? error.message : "Failed to update sync settings"
      );
    }
  };

  const handleSyncNow = async () => {
    if (!sessionId || !connection?.id) return;

    setIsSyncing(true);

    try {
      const result = await syncEmails({
        connectionId: connection.id,
        top: 50,
      });

      notification.success(
        "Sync Complete",
        `Successfully synced ${result.emailsStored} of ${result.totalFetched} emails`
      );
    } catch (error) {
      console.error("Failed to sync emails:", error);

      let errorMessage = "Failed to sync emails. Please try again.";

      if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        if (msg.includes("access denied") || msg.includes("403")) {
          errorMessage = "Permissions have expired. Please reconnect.";
        } else if (msg.includes("unauthorized") || msg.includes("401")) {
          errorMessage = "Session expired. Please reconnect.";
        } else if (msg.includes("expired") || msg.includes("revoked")) {
          errorMessage = "Authorization expired. Please reconnect.";
        } else if (msg.includes("reconnect")) {
          errorMessage = error.message;
        } else {
          errorMessage = "Email sync unavailable. Please try again later.";
        }
      }

      notification.error("Sync Failed", errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const isLoading = connection === undefined;
  const isConnected = connection && connection.status === "active";
  const hasError = connection && (connection.status === "error" || connection.status === "expired");
  const hasConnection = connection !== undefined && connection !== null;

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
        {/* Header with Back Button */}
        <div className="px-4 py-3 border-b-2 flex items-center gap-3" style={{ borderColor: 'var(--win95-border)' }}>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: 'var(--win95-highlight)' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <i className="fab fa-microsoft text-2xl" style={{ color: '#00a4ef' }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                Microsoft 365
              </h2>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Email, Calendar, OneDrive integration
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
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading connection status...
              </p>
            </div>
          ) : hasConnection ? (
            <div className="space-y-4">
              {/* Connection Status */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                {isConnected && (
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                    <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                      Connected
                    </span>
                  </div>
                )}

                {/* Connection Error Warning */}
                {hasError && connection.lastSyncError && (
                  <div
                    className="p-3 border-2 rounded flex items-start gap-2 mb-3"
                    style={{
                      borderColor: "#ef4444",
                      background: "rgba(239, 68, 68, 0.05)",
                    }}
                  >
                    <span className="text-base">⚠️</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold mb-1" style={{ color: "#ef4444" }}>
                        Connection Error
                      </p>
                      <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                        {connection.lastSyncError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Connected Account Info */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Connected Account
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {connection.providerEmail}
                    </p>
                  </div>

                  {connection.lastSyncAt && (
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        Last Synced
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {new Date(connection.lastSyncAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Permissions */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <h3 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Permissions
                </h3>
                <MicrosoftScopeSelector
                  selectedScopes={connection.scopes || []}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>

              {/* Sync Settings */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Sync Settings
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailSyncStatus?.syncEnabled || false}
                      onChange={(e) => handleEmailSyncToggle(e.target.checked)}
                    />
                    <span style={{ color: "var(--win95-text)" }}>Sync Emails</span>
                    {emailSyncStatus && (
                      <span className="text-xs ml-auto" style={{ color: "var(--neutral-gray)" }}>
                        ({emailSyncStatus.totalEmails} synced, {emailSyncStatus.unreadEmails} unread)
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-not-allowed opacity-50">
                    <input type="checkbox" disabled />
                    <span style={{ color: "var(--neutral-gray)" }}>Sync Calendar (coming soon)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-not-allowed opacity-50">
                    <input type="checkbox" disabled />
                    <span style={{ color: "var(--neutral-gray)" }}>Access OneDrive (coming soon)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {hasError ? (
                  <>
                    <RetroButton
                      variant="secondary"
                      onClick={handleDisconnect}
                      className="flex-1"
                    >
                      Disconnect
                    </RetroButton>
                    <RetroButton
                      variant="primary"
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex-1"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Reconnecting...
                        </>
                      ) : (
                        "Reconnect"
                      )}
                    </RetroButton>
                  </>
                ) : (
                  <>
                    <RetroButton
                      variant="secondary"
                      onClick={handleDisconnect}
                      className="flex-1"
                    >
                      Disconnect
                    </RetroButton>
                    <RetroButton
                      variant="secondary"
                      onClick={handleSyncNow}
                      disabled={isSyncing || !emailSyncStatus?.syncEnabled}
                      className="flex-1"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} className="mr-1" />
                          Sync Now
                        </>
                      )}
                    </RetroButton>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Not Connected State */}
              <div
                className="p-6 border-2 rounded text-center"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <i className="fab fa-microsoft text-5xl mb-4" style={{ color: '#00a4ef' }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Not Connected
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Connect your Microsoft account to sync emails, calendar, and files.
                </p>
              </div>

              {/* Features List */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Features
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-start gap-2">
                    <span>📧</span>
                    <span>Sync your emails automatically</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>📅</span>
                    <span>Access your calendar events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>📁</span>
                    <span>Browse OneDrive files</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🔒</span>
                    <span>Secure OAuth 2.0 authentication</span>
                  </div>
                </div>
              </div>

              {/* Scope Selector */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Select Permissions
                </p>
                <MicrosoftScopeSelector
                  selectedScopes={selectedScopes}
                  onChange={setSelectedScopes}
                />
              </div>

              {/* Connect Button */}
              <RetroButton
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
                  <>
                    <i className="fab fa-microsoft mr-2" />
                    Connect Microsoft Account
                  </>
                )}
              </RetroButton>

              {!user && (
                <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                  Please sign in to connect your Microsoft account
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
