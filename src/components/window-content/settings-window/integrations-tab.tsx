"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export function IntegrationsTab() {
  const { user, sessionId } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Query Microsoft connection status
  const connection = useQuery(
    api.oauth.microsoft.getUserMicrosoftConnection,
    sessionId ? { sessionId } : "skip"
  );

  // Mutations
  const initiateMicrosoftOAuth = useMutation(api.oauth.microsoft.initiateMicrosoftOAuth);
  const disconnectMicrosoft = useMutation(api.oauth.microsoft.disconnectMicrosoft);

  // Check URL params for OAuth callback messages
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const email = params.get("email");

    if (success === "microsoft_connected" && email) {
      setStatusMessage({
        type: "success",
        message: `Successfully connected Microsoft account: ${decodeURIComponent(email)}`,
      });

      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);

      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    }

    if (error) {
      setStatusMessage({
        type: "error",
        message: `Connection failed: ${decodeURIComponent(error)}`,
      });

      // Clean up URL params
      window.history.replaceState({}, "", window.location.pathname);

      // Clear message after 7 seconds
      setTimeout(() => setStatusMessage(null), 7000);
    }
  }, []);

  const handleConnect = async () => {
    if (!sessionId) {
      setStatusMessage({
        type: "error",
        message: "You must be signed in to connect Microsoft account",
      });
      return;
    }

    setIsConnecting(true);
    setStatusMessage(null);

    try {
      const result = await initiateMicrosoftOAuth({
        sessionId,
        connectionType: "personal",
      });

      // Redirect to Microsoft OAuth page
      window.location.href = result.authUrl;
    } catch (error) {
      console.error("Failed to initiate OAuth:", error);
      setStatusMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to start connection process",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !connection?.id) return;

    if (!confirm("Are you sure you want to disconnect your Microsoft account?")) {
      return;
    }

    try {
      await disconnectMicrosoft({ sessionId, connectionId: connection.id });

      setStatusMessage({
        type: "success",
        message: "Microsoft account disconnected successfully",
      });

      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      console.error("Failed to disconnect:", error);
      setStatusMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to disconnect",
      });
    }
  };

  const isLoading = connection === undefined;
  const isConnected = connection && connection.status === "active";

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {statusMessage && (
        <div
          className="p-3 border-2 rounded flex items-start gap-2"
          style={{
            borderColor: statusMessage.type === "success" ? "var(--win95-highlight)" : "#dc2626",
            background: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
          }}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={16} className="mt-0.5" style={{ color: "var(--win95-highlight)" }} />
          ) : (
            <XCircle size={16} className="mt-0.5" style={{ color: "#dc2626" }} />
          )}
          <p className="text-xs flex-1" style={{ color: "var(--win95-text)" }}>
            {statusMessage.message}
          </p>
        </div>
      )}

      {/* Microsoft Integration Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-3xl">🔷</div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              Microsoft Account
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Connect your Microsoft account to sync emails, calendar, and files
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
              Loading connection status...
            </p>
          </div>
        ) : isConnected ? (
          <div
            className="p-4 border-2 rounded space-y-4"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} style={{ color: "var(--win95-highlight)" }} />
              <span className="text-xs font-bold" style={{ color: "var(--win95-highlight)" }}>
                Connected
              </span>
            </div>

            {/* Connected Account Info */}
            <div className="space-y-2">
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Account:
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {connection.providerEmail}
                </p>
              </div>

              {connection.lastSyncAt && (
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Last Synced:
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

            {/* Sync Settings (Phase 3 - Coming Soon) */}
            <div
              className="p-3 border-2 rounded opacity-50"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
              }}
            >
              <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Sync Settings
              </p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs cursor-not-allowed">
                  <input type="checkbox" disabled className="opacity-50" />
                  <span style={{ color: "var(--neutral-gray)" }}>Email (Coming Soon)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-not-allowed">
                  <input type="checkbox" disabled className="opacity-50" />
                  <span style={{ color: "var(--neutral-gray)" }}>Calendar (Coming Soon)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-not-allowed">
                  <input type="checkbox" disabled className="opacity-50" />
                  <span style={{ color: "var(--neutral-gray)" }}>OneDrive (Coming Soon)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <RetroButton
                variant="secondary"
                onClick={handleDisconnect}
                className="flex-1"
              >
                Disconnect
              </RetroButton>
              <RetroButton
                variant="secondary"
                disabled
                className="flex-1 opacity-50"
              >
                <RefreshCw size={14} className="mr-1" />
                Sync Now
              </RetroButton>
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
              <div className="text-5xl">🔷</div>
              <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Not Connected
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Connect your Microsoft account to access these features:
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              <div className="flex items-start gap-2">
                <span>📧</span>
                <span>Sync emails and contacts (Coming Soon)</span>
              </div>
              <div className="flex items-start gap-2">
                <span>📅</span>
                <span>Access calendar and events (Coming Soon)</span>
              </div>
              <div className="flex items-start gap-2">
                <span>📁</span>
                <span>Browse OneDrive files (Coming Soon)</span>
              </div>
              <div className="flex items-start gap-2">
                <span>🔒</span>
                <span>Secure OAuth 2.0 connection with encryption</span>
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
                <>Connect Microsoft Account</>
              )}
            </RetroButton>

            {!user && (
              <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                Please sign in to connect integrations
              </p>
            )}
          </div>
        )}
      </div>

      {/* Other Integrations (Coming Soon) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-3xl">🔗</div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              Other Integrations
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              More integrations coming soon
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
            <div className="text-2xl">🔴</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                Google Workspace
              </p>
              <p className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
                Coming Soon
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
            <div className="text-2xl">💬</div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                Slack
              </p>
              <p className="text-xs italic" style={{ color: "var(--neutral-gray)" }}>
                Coming Soon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
