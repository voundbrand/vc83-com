"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff, ExternalLink, RefreshCw, Settings, Clock, ArrowRightLeft } from "lucide-react";

interface ActiveCampaignSettingsProps {
  onBack: () => void;
}

type SyncDirection = "to_activecampaign" | "from_activecampaign" | "bidirectional";

interface SyncConfig {
  enabled: boolean;
  direction: SyncDirection;
  syncIntervalMinutes: number;
  lastSyncAt?: number;
  nextSyncAt?: number;
  syncFilters?: {
    tags?: string[];
    contactTypes?: string[];
    createdAfter?: number;
  };
  listMappings?: Array<{
    platformTag: string;
    activeCampaignListId: string;
  }>;
  tagMappings?: Array<{
    platformTag: string;
    activeCampaignTagId: string;
  }>;
  fieldMappings?: Array<{
    platformField: string;
    activeCampaignField: string;
  }>;
}

export function ActiveCampaignSettings({ onBack }: ActiveCampaignSettingsProps) {
  const { user, sessionId } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"connection" | "sync">("connection");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  // Local sync config state
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncDirection, setSyncDirection] = useState<SyncDirection>("to_activecampaign");
  const [syncInterval, setSyncInterval] = useState(0);

  // Query ActiveCampaign connection status
  const connection = useQuery(
    api.oauth.activecampaign.getActiveCampaignConnection,
    sessionId ? { sessionId } : "skip"
  );

  // Query sync configuration
  const syncConfig = useQuery(
    api.oauth.activecampaignSync.getSyncConfig,
    sessionId ? { sessionId } : "skip"
  ) as SyncConfig | null | undefined;

  // Actions and mutations
  const validateCredentials = useAction(api.oauth.activecampaign.validateCredentials);
  const storeConnection = useAction(api.oauth.activecampaign.storeActiveCampaignConnection);
  const disconnectActiveCampaign = useMutation(api.oauth.activecampaign.disconnectActiveCampaign);
  const saveSyncConfig = useMutation(api.oauth.activecampaignSync.saveSyncConfig);
  const triggerManualSync = useAction(api.oauth.activecampaignSync.triggerManualSync);

  // Initialize local state from config
  useEffect(() => {
    if (syncConfig) {
      setSyncEnabled(syncConfig.enabled);
      setSyncDirection(syncConfig.direction);
      setSyncInterval(syncConfig.syncIntervalMinutes);
    }
  }, [syncConfig]);

  const handleConnect = async () => {
    if (!sessionId) {
      notification.error(
        "Sign In Required",
        "You must be signed in to connect ActiveCampaign"
      );
      return;
    }

    // Basic validation
    if (!apiUrl.trim()) {
      setValidationError("Please enter your ActiveCampaign API URL");
      return;
    }

    if (!apiKey.trim()) {
      setValidationError("Please enter your ActiveCampaign API Key");
      return;
    }

    setIsConnecting(true);
    setValidationError(null);

    try {
      // Validate the credentials first
      const validation = await validateCredentials({
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
      });

      if (!validation.valid) {
        setValidationError(validation.error || "Invalid credentials");
        setIsConnecting(false);
        return;
      }

      // Store the validated connection
      await storeConnection({
        sessionId,
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
        connectionType: "organizational",
        accountName: validation.accountName || "Unknown",
        email: validation.email || "Unknown",
      });

      notification.success(
        "Connected!",
        `Successfully connected to ActiveCampaign (${validation.email})`
      );

      // Clear the form
      setApiUrl("");
      setApiKey("");
    } catch (error) {
      console.error("Failed to connect ActiveCampaign:", error);
      notification.error(
        "Connection Error",
        error instanceof Error ? error.message : "Failed to connect ActiveCampaign"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !connection?.id) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect ActiveCampaign",
      message: "Are you sure you want to disconnect ActiveCampaign? This will disable all syncing and automations.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) {
      return;
    }

    try {
      await disconnectActiveCampaign({ sessionId, connectionId: connection.id });

      notification.success(
        "Disconnected",
        "ActiveCampaign disconnected successfully"
      );
    } catch (error) {
      console.error("Failed to disconnect:", error);
      notification.error(
        "Disconnect Failed",
        error instanceof Error ? error.message : "Failed to disconnect"
      );
    }
  };

  const handleSaveSyncConfig = async () => {
    if (!sessionId) return;

    setIsSavingConfig(true);
    try {
      await saveSyncConfig({
        sessionId,
        config: {
          enabled: syncEnabled,
          direction: syncDirection,
          syncIntervalMinutes: syncInterval,
        },
      });

      notification.success(
        "Settings Saved",
        "Sync configuration has been updated"
      );
    } catch (error) {
      console.error("Failed to save sync config:", error);
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save sync settings"
      );
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleManualSync = async () => {
    if (!sessionId) return;

    setIsSyncing(true);
    try {
      const result = await triggerManualSync({ sessionId });

      if (result.success) {
        notification.success(
          "Sync Complete",
          `Successfully synced ${result.syncedCount || 0} contacts`
        );
      } else {
        notification.error(
          "Sync Failed",
          result.error || "Failed to sync contacts"
        );
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      notification.error(
        "Sync Failed",
        error instanceof Error ? error.message : "Failed to trigger sync"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const isLoading = connection === undefined;
  const isConnected = connection && connection.status === "active";
  const hasError = connection && (connection.status === "error" || connection.status === "expired");
  const hasConnection = connection !== undefined && connection !== null;

  const syncIntervalOptions = [
    { value: 0, label: "Manual only" },
    { value: 15, label: "Every 15 minutes" },
    { value: 30, label: "Every 30 minutes" },
    { value: 60, label: "Every hour" },
    { value: 360, label: "Every 6 hours" },
    { value: 1440, label: "Daily" },
  ];

  const directionOptions: { value: SyncDirection; label: string; description: string }[] = [
    { value: "to_activecampaign", label: "Platform to ActiveCampaign", description: "Push contacts from your CRM to ActiveCampaign" },
    { value: "from_activecampaign", label: "ActiveCampaign to Platform", description: "Pull contacts from ActiveCampaign to your CRM" },
    { value: "bidirectional", label: "Bidirectional", description: "Sync contacts both ways (coming soon)" },
  ];

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
            <i className="fas fa-envelope-open-text text-2xl" style={{ color: '#356ae6' }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                ActiveCampaign
              </h2>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                Email marketing & CRM automation
              </p>
            </div>
          </div>
        </div>

        {/* Tabs - Only show when connected */}
        {isConnected && (
          <div className="px-4 pt-3 flex gap-1" style={{ borderColor: 'var(--win95-border)' }}>
            <button
              onClick={() => setActiveTab("connection")}
              className="px-3 py-1 text-xs border-2 border-b-0 -mb-[2px] relative z-10"
              style={{
                borderColor: 'var(--win95-border)',
                background: activeTab === "connection" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                color: 'var(--win95-text)',
                fontWeight: activeTab === "connection" ? 'bold' : 'normal',
              }}
            >
              Connection
            </button>
            <button
              onClick={() => setActiveTab("sync")}
              className="px-3 py-1 text-xs border-2 border-b-0 -mb-[2px] relative z-10"
              style={{
                borderColor: 'var(--win95-border)',
                background: activeTab === "sync" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                color: 'var(--win95-text)',
                fontWeight: activeTab === "sync" ? 'bold' : 'normal',
              }}
            >
              <Settings size={12} className="inline mr-1" />
              Sync Settings
            </button>
          </div>
        )}

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
          ) : hasConnection && activeTab === "connection" ? (
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
                    <span className="text-base">&#9888;&#65039;</span>
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
                      Account
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {connection.providerAccountId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                      Email
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {connection.providerEmail}
                    </p>
                  </div>

                  {connection.apiUrl && (
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        API URL
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {connection.apiUrl}
                      </p>
                    </div>
                  )}

                  {connection.connectedAt && (
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        Connected
                      </p>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {new Date(connection.connectedAt).toLocaleDateString("en-US", {
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

              {/* Available Features */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Available Features
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Sync contacts to/from ActiveCampaign</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Manage lists and tags</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Trigger automations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Track deals and pipelines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Receive webhook events</span>
                  </div>
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
                <a
                  href={connection.apiUrl ? `${connection.apiUrl.replace('.api-us1.com', '.activehosted.com')}/admin` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <RetroButton
                    variant="secondary"
                    className="w-full"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Open Dashboard
                  </RetroButton>
                </a>
              </div>
            </div>
          ) : hasConnection && activeTab === "sync" ? (
            /* Sync Configuration Tab */
            <div className="space-y-4">
              {/* Sync Status */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                    <Clock size={12} className="inline mr-1" />
                    Sync Status
                  </p>
                  <div
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: syncEnabled ? "rgba(16, 185, 129, 0.1)" : "rgba(156, 163, 175, 0.1)",
                      color: syncEnabled ? "#10b981" : "var(--neutral-gray)",
                    }}
                  >
                    {syncEnabled ? "Enabled" : "Disabled"}
                  </div>
                </div>

                <div className="space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {syncConfig?.lastSyncAt && (
                    <div className="flex justify-between">
                      <span>Last sync:</span>
                      <span>{new Date(syncConfig.lastSyncAt).toLocaleString()}</span>
                    </div>
                  )}
                  {syncConfig?.nextSyncAt && syncEnabled && syncInterval > 0 && (
                    <div className="flex justify-between">
                      <span>Next sync:</span>
                      <span>{new Date(syncConfig.nextSyncAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Manual Sync Button */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--win95-border)" }}>
                  <RetroButton
                    variant="secondary"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="w-full"
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
                </div>
              </div>

              {/* Sync Configuration */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  <Settings size={12} className="inline mr-1" />
                  Sync Configuration
                </p>

                {/* Enable/Disable Toggle */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncEnabled}
                      onChange={(e) => setSyncEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                      Enable automatic sync
                    </span>
                  </label>
                </div>

                {/* Sync Direction */}
                <div className="mb-4">
                  <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
                    <ArrowRightLeft size={12} className="inline mr-1" />
                    Sync Direction
                  </label>
                  <div className="space-y-2">
                    {directionOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-start gap-2 cursor-pointer p-2 border rounded"
                        style={{
                          borderColor: syncDirection === option.value ? "var(--win95-highlight)" : "var(--win95-border)",
                          background: syncDirection === option.value ? "rgba(0, 120, 215, 0.05)" : "transparent",
                        }}
                      >
                        <input
                          type="radio"
                          name="syncDirection"
                          value={option.value}
                          checked={syncDirection === option.value}
                          onChange={(e) => setSyncDirection(e.target.value as SyncDirection)}
                          className="mt-0.5"
                          disabled={option.value === "bidirectional"}
                        />
                        <div>
                          <span className="text-xs font-bold block" style={{ color: "var(--win95-text)" }}>
                            {option.label}
                            {option.value === "bidirectional" && (
                              <span className="ml-1 text-xs font-normal" style={{ color: "var(--neutral-gray)" }}>
                                (Coming soon)
                              </span>
                            )}
                          </span>
                          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {option.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sync Interval */}
                <div className="mb-4">
                  <label className="text-xs font-bold block mb-2" style={{ color: "var(--win95-text)" }}>
                    <Clock size={12} className="inline mr-1" />
                    Sync Interval
                  </label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    disabled={!syncEnabled}
                    className="w-full px-2 py-1 border-2 text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: syncEnabled ? "var(--win95-bg)" : "var(--win95-bg-light)",
                      color: "var(--win95-text)",
                      opacity: syncEnabled ? 1 : 0.5,
                    }}
                  >
                    {syncIntervalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    How often to automatically sync contacts
                  </p>
                </div>

                {/* Save Button */}
                <RetroButton
                  onClick={handleSaveSyncConfig}
                  disabled={isSavingConfig}
                  className="w-full"
                >
                  {isSavingConfig ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Sync Settings"
                  )}
                </RetroButton>
              </div>

              {/* Webhook Info */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Webhook Integration
                </p>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  To receive real-time events from ActiveCampaign, configure a webhook in your ActiveCampaign account:
                </p>
                <div
                  className="p-2 border rounded font-mono text-xs break-all"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                    color: "var(--win95-text)",
                  }}
                >
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/activecampaign` : '/api/webhooks/activecampaign'}
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                  Events like contact updates, tag changes, and list subscriptions will trigger workflows automatically.
                </p>
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
                <i className="fas fa-envelope-open-text text-5xl mb-4" style={{ color: '#356ae6' }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Not Connected
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Connect your ActiveCampaign account to sync contacts, manage campaigns, and automate workflows.
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
                    <span>&#128231;</span>
                    <span>Sync contacts bidirectionally</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#127991;</span>
                    <span>Manage lists and tags</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#9889;</span>
                    <span>Trigger automations from your app</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128200;</span>
                    <span>Track deals and pipelines</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128274;</span>
                    <span>Secure API key authentication</span>
                  </div>
                </div>
              </div>

              {/* Connection Form */}
              <div
                className="p-4 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Enter your ActiveCampaign credentials
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
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                      API URL
                    </label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => {
                        setApiUrl(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="https://youraccountname.api-us1.com"
                      className="w-full px-2 py-1 border-2 text-xs"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg)",
                        color: "var(--win95-text)",
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Found in Settings &gt; Developer &gt; API Access
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="Your API key"
                        className="w-full px-2 py-1 border-2 text-xs pr-8"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg)",
                          color: "var(--win95-text)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--neutral-gray)" }}
                      >
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Keep this secret - never share it publicly
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Link */}
              <a
                href="https://help.activecampaign.com/hc/en-us/articles/207317590-Getting-started-with-the-API"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: "var(--win95-highlight)" }}
              >
                <ExternalLink size={12} />
                How to find your API credentials
              </a>

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
                    <i className="fas fa-envelope-open-text mr-2" />
                    Connect ActiveCampaign
                  </>
                )}
              </RetroButton>

              {!user && (
                <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                  Please sign in to connect your ActiveCampaign account
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
