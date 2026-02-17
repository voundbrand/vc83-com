"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { AlertTriangle, Blocks, CalendarDays, CheckCircle2, Circle, FolderOpen, Link2, Loader2, Lock, Mail, MessageCircle, RefreshCw } from "lucide-react";
import { MicrosoftScopeSelector } from "./microsoft-scope-selector";

export function IntegrationsTab() {
  const { t } = useNamespaceTranslations("ui.manage");
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
        t("ui.manage.integrations.errors.connection_issue_title"),
        connection.lastSyncError || t("ui.manage.integrations.errors.connection_expired")
      );
    }

    setPrevConnectionStatus(connection.status);
  }, [connection, notification, t, prevConnectionStatus]);

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

      // Extract user-friendly error message
      let errorMessage = t("ui.manage.integrations.errors.sync_generic");

      if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        // Check for common Microsoft OAuth errors
        if (msg.includes("access denied") || msg.includes("403")) {
          errorMessage = t("ui.manage.integrations.errors.permissions_expired");
        } else if (msg.includes("unauthorized") || msg.includes("401")) {
          errorMessage = t("ui.manage.integrations.errors.session_expired");
        } else if (msg.includes("expired") || msg.includes("revoked")) {
          errorMessage = t("ui.manage.integrations.errors.authorization_expired");
        } else if (msg.includes("reconnect")) {
          // If message already suggests reconnecting, use it
          errorMessage = error.message;
        } else {
          // For other errors, show a generic message without technical details
          errorMessage = t("ui.manage.integrations.errors.sync_unavailable");
        }
      }

      notification.error(
        t("ui.manage.integrations.errors.sync_failed_title"),
        errorMessage
      );
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
      <div className="space-y-6">
      {/* Microsoft Integration Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Blocks size={24} style={{ color: "var(--win95-highlight)" }} />
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {t("ui.manage.integrations.microsoft.title")}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.manage.integrations.microsoft.description")}
            </p>
          </div>
        </div>

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
              {t("ui.manage.integrations.status.loading")}
            </p>
          </div>
        ) : hasConnection ? (
          <div
            className="p-4 border-2 rounded space-y-4"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            {/* Connection Status */}
            {isConnected && (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} style={{ color: "var(--win95-highlight)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--win95-highlight)" }}>
                  {t("ui.manage.integrations.status.connected")}
                </span>
              </div>
            )}

            {/* Connection Error Warning */}
            {hasError && connection.lastSyncError && (
              <div
                className="p-3 border-2 rounded flex items-start gap-2"
                style={{
                  borderColor: "var(--retro-red)",
                  background: "rgba(255, 0, 0, 0.05)",
                }}
              >
                <AlertTriangle size={16} style={{ color: "var(--retro-red)" }} />
                <div className="flex-1">
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--retro-red)" }}>
                    {t("ui.manage.integrations.errors.connection_error")}
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
                  {t("ui.manage.integrations.account_label")}
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {connection.providerEmail}
                </p>
              </div>

              {connection.lastSyncAt && (
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    {t("ui.manage.integrations.last_synced")}
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

            {/* Connected Permissions Scope Selector */}
            <MicrosoftScopeSelector
              selectedScopes={connection.scopes || []}
              onChange={() => {}} // No-op since read-only
              readOnly={true}
            />

            {/* Sync Settings */}
            <div
              className="p-3 border-2 rounded"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
              }}
            >
              <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                {t("ui.manage.integrations.sync_settings.title")}
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailSyncStatus?.syncEnabled || false}
                    onChange={(e) => handleEmailSyncToggle(e.target.checked)}
                  />
                  <span style={{ color: "var(--win95-text)" }}>{t("ui.manage.integrations.sync_settings.email")}</span>
                  {emailSyncStatus && (
                    <span className="text-xs ml-auto" style={{ color: "var(--neutral-gray)" }}>
                      ({emailSyncStatus.totalEmails} synced, {emailSyncStatus.unreadEmails} unread)
                    </span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-xs cursor-not-allowed opacity-50">
                  <input type="checkbox" disabled />
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.manage.integrations.sync_settings.calendar_coming_soon")}</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-not-allowed opacity-50">
                  <input type="checkbox" disabled />
                  <span style={{ color: "var(--neutral-gray)" }}>{t("ui.manage.integrations.sync_settings.onedrive_coming_soon")}</span>
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
                    {t("ui.manage.integrations.actions.disconnect")}
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
                        {t("ui.manage.integrations.actions.reconnecting")}
                      </>
                    ) : (
                      t("ui.manage.integrations.actions.reconnect")
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
                    {t("ui.manage.integrations.actions.disconnect")}
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
                        {t("ui.manage.integrations.actions.syncing")}
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className="mr-1" />
                        {t("ui.manage.integrations.actions.sync_now")}
                      </>
                    )}
                  </RetroButton>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            className="p-6 border-2 rounded space-y-4"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Blocks size={40} style={{ color: "var(--win95-highlight)" }} />
              </div>
              <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                {t("ui.manage.integrations.status.not_connected")}
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.manage.integrations.features.connect_message")}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              <div className="flex items-start gap-2">
                <Mail size={12} />
                <span>{t("ui.manage.integrations.features.sync_emails")}</span>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays size={12} />
                <span>{t("ui.manage.integrations.features.access_calendar")}</span>
              </div>
              <div className="flex items-start gap-2">
                <FolderOpen size={12} />
                <span>{t("ui.manage.integrations.features.browse_onedrive")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock size={12} />
                <span>{t("ui.manage.integrations.features.secure_oauth")}</span>
              </div>
            </div>

            {/* Microsoft Scope Selector */}
            <MicrosoftScopeSelector
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
            />

            {/* Connect Button */}
            <RetroButton
              onClick={handleConnect}
              disabled={isConnecting || !user}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={14} className="mr-1 animate-spin" />
                  {t("ui.manage.integrations.actions.connecting")}
                </>
              ) : (
                <>{t("ui.manage.integrations.actions.connect")}</>
              )}
            </RetroButton>

            {!user && (
              <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.manage.integrations.messages.sign_in_required")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Other Integrations (Coming Soon) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={24} style={{ color: "var(--win95-highlight)" }} />
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {t("ui.manage.integrations.other.title")}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.manage.integrations.other.description")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Google */}
          <div
            className="p-4 border-2 rounded flex items-center gap-3 opacity-50"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            <Circle size={18} style={{ color: "var(--error-red)" }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                {t("ui.manage.integrations.google.title")}
              </p>
              <p className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.manage.integrations.coming_soon")}
              </p>
            </div>
          </div>

          {/* Slack */}
          <div
            className="p-4 border-2 rounded flex items-center gap-3 opacity-50"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            <MessageCircle size={18} style={{ color: "var(--win95-highlight)" }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                {t("ui.manage.integrations.slack.title")}
              </p>
              <p className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.manage.integrations.coming_soon")}
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
