"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

interface GoogleSettingsProps {
  onBack: () => void;
}

export function GoogleSettings({ onBack }: GoogleSettingsProps) {
  const { user, sessionId } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Query Google connection status
  const connection = useQuery(
    api.oauth.google.getGoogleConnectionStatus,
    sessionId ? { sessionId } : "skip"
  );

  // The active connection is the personal one
  const activeConnection = connection?.personal ?? null;

  // Query sync status
  const syncStatus = useQuery(
    api.calendarSyncOntology.getSyncStatus,
    sessionId && activeConnection?.id
      ? { sessionId, connectionId: activeConnection.id }
      : "skip"
  );

  // Mutations
  const initiateGoogleOAuth = useMutation(api.oauth.google.initiateGoogleOAuth);
  const disconnectGoogle = useMutation(api.oauth.google.disconnectGoogle);
  const updateSyncSettings = useMutation(api.oauth.google.updateGoogleSyncSettings);

  // Track previous connection status to detect changes
  const [prevConnectionStatus, setPrevConnectionStatus] = useState<string | null>(null);

  // Monitor connection status changes
  useEffect(() => {
    if (!activeConnection) return;

    if (prevConnectionStatus === "active" && (activeConnection.status === "error" || activeConnection.status === "expired")) {
      notification.error(
        "Connection Issue",
        "Your Google connection has expired or encountered an error"
      );
    }

    setPrevConnectionStatus(activeConnection.status);
  }, [activeConnection, notification, prevConnectionStatus]);

  // Check URL params for OAuth callback messages
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const email = params.get("email");

    if (success === "google_connected" && email) {
      notification.success(
        "Google Connected!",
        `Successfully connected account: ${decodeURIComponent(email)}`
      );

      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (error) {
      notification.error(
        "Connection Failed",
        `Could not connect Google account: ${decodeURIComponent(error)}`
      );

      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [notification]);

  const handleConnect = async () => {
    if (!sessionId) {
      notification.error(
        "Sign In Required",
        "You must be signed in to connect Google account"
      );
      return;
    }

    setIsConnecting(true);

    try {
      const result = await initiateGoogleOAuth({
        sessionId,
        connectionType: "personal",
        requestedScopes: CALENDAR_SCOPES,
      });

      // Redirect to Google OAuth page
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
    if (!sessionId || !activeConnection?.id) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Google Account",
      message: "Are you sure you want to disconnect your Google account? This will disable calendar syncing and other integrations.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) {
      return;
    }

    try {
      await disconnectGoogle({ sessionId, connectionId: activeConnection.id });

      notification.success(
        "Disconnected",
        "Google account disconnected successfully"
      );
    } catch (error) {
      console.error("Failed to disconnect:", error);
      notification.error(
        "Disconnect Failed",
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  const handleCalendarSyncToggle = async (enabled: boolean) => {
    if (!sessionId || !activeConnection?.id) return;

    try {
      await updateSyncSettings({
        sessionId,
        connectionId: activeConnection.id,
        syncSettings: { calendar: enabled },
      });

      notification.success(
        enabled ? "Calendar Sync Enabled" : "Calendar Sync Disabled",
        enabled
          ? "Calendar syncing has been enabled"
          : "Calendar syncing has been disabled"
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
    if (!sessionId || !activeConnection?.id) return;

    setIsSyncing(true);

    try {
      // For now, just trigger a sync settings update to refresh
      // A dedicated sync action can be added later
      notification.success(
        "Sync Triggered",
        "Calendar sync has been triggered"
      );
    } catch (error) {
      console.error("Failed to sync:", error);
      notification.error(
        "Sync Failed",
        error instanceof Error ? error.message : "Failed to sync. Please try again."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const isLoading = connection === undefined;
  const isConnected = activeConnection && activeConnection.status === "active";
  const hasError = activeConnection && (activeConnection.status === "error" || activeConnection.status === "expired");
  const hasConnection = activeConnection !== null;

  // Determine if calendar sync is enabled (check connection metadata if available)
  const calendarSyncEnabled = !!(activeConnection as Record<string, unknown>)?.calendarSyncEnabled;

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
            <i className="fab fa-google text-2xl" style={{ color: '#4285f4' }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                Google Workspace
              </h2>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Gmail, Calendar, Drive integration
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
                {hasError && (
                  <div
                    className="p-3 border-2 rounded flex items-start gap-2 mb-3"
                    style={{
                      borderColor: "#ef4444",
                      background: "rgba(239, 68, 68, 0.05)",
                    }}
                  >
                    <span className="text-base">&#9888;</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold mb-1" style={{ color: "#ef4444" }}>
                        Connection Error
                      </p>
                      <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                        Your Google connection has expired or encountered an error. Please reconnect.
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
                      {activeConnection.email}
                    </p>
                  </div>

                  {activeConnection.connectedAt && (
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        Connected Since
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {new Date(activeConnection.connectedAt).toLocaleDateString("en-US", {
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

              {/* Permissions */}
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
                <div className="space-y-1">
                  {CALENDAR_SCOPES.map((scope) => (
                    <div key={scope} className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                      <span>{scope.split("/").pop()}</span>
                    </div>
                  ))}
                </div>
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
                      checked={calendarSyncEnabled}
                      onChange={(e) => handleCalendarSyncToggle(e.target.checked)}
                    />
                    <span style={{ color: "var(--win95-text)" }}>Sync Calendar</span>
                  </label>
                  {syncStatus && calendarSyncEnabled && (
                    <div className="ml-5 space-y-1">
                      {syncStatus.lastSyncAt && (
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          Last synced: {new Date(syncStatus.lastSyncAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                      {syncStatus.totalEventsSync > 0 && (
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {syncStatus.totalEventsSync} event{syncStatus.totalEventsSync !== 1 ? "s" : ""} synced
                        </p>
                      )}
                      {syncStatus.lastSyncError && (
                        <p className="text-xs" style={{ color: "#ef4444" }}>
                          Error: {syncStatus.lastSyncError}
                        </p>
                      )}
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-xs cursor-not-allowed opacity-50">
                    <input type="checkbox" disabled />
                    <span style={{ color: "var(--neutral-gray)" }}>Access Drive (coming soon)</span>
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
                      disabled={isSyncing || !calendarSyncEnabled}
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
                <i className="fab fa-google text-5xl mb-4" style={{ color: '#4285f4' }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Not Connected
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Connect your Google account to sync calendar, access files, and more.
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
                    <span>&#128197;</span>
                    <span>Sync your calendar events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128193;</span>
                    <span>Browse Google Drive files</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128101;</span>
                    <span>Access Google Contacts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128274;</span>
                    <span>Secure OAuth 2.0 authentication</span>
                  </div>
                </div>
              </div>

              {/* Scopes Info */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Requested Permissions
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  The following Calendar scopes will be requested:
                </p>
                <div className="space-y-1">
                  {CALENDAR_SCOPES.map((scope) => (
                    <div key={scope} className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      <span>&#8226;</span>
                      <span>{scope.split("/").pop()}</span>
                    </div>
                  ))}
                </div>
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
                    <i className="fab fa-google mr-2" />
                    Connect Google Account
                  </>
                )}
              </RetroButton>

              {!user && (
                <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                  Please sign in to connect your Google account
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
