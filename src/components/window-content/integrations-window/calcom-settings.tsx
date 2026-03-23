"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";

// Dynamic require avoids generated type blowups in this panel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type CalcomSettingsSnapshot = {
  configured?: boolean;
  hasOrganizationSettings?: boolean;
  enabled?: boolean;
  credentialMode?: "platform" | "byok";
  source?: "platform" | "org" | null;
  hasApiKey?: boolean;
  apiBaseUrl?: string;
  defaultEventTypeId?: number | null;
  defaultEventTypeName?: string | null;
  defaultEventTypeSlug?: string | null;
  canUsePlatformManaged?: boolean;
  isPlatformOrg?: boolean;
  isSuperAdmin?: boolean;
} | null;

type CalcomEventType = {
  id: number;
  slug: string | null;
  name: string;
  lengthInMinutes: number | null;
  schedulingType: string | null;
};

interface CalcomSettingsProps {
  onBack: () => void;
}

export function CalcomSettings({ onBack }: CalcomSettingsProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  const settings = useQuery(
    api.integrations.calcom.getCalcomSettings,
    sessionId ? { sessionId } : "skip",
  ) as CalcomSettingsSnapshot | undefined;
  const saveSettings = useMutation(api.integrations.calcom.saveCalcomSettings);
  const disconnect = useMutation(api.integrations.calcom.disconnectCalcom);
  const testConnection = useAction(api.integrations.calcom.testCalcomConnection);
  const listEventTypes = useAction(api.integrations.calcom.listCalcomEventTypes);

  const [enabled, setEnabled] = useState(true);
  const [credentialMode, setCredentialMode] = useState<"platform" | "byok">(
    "byok",
  );
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.cal.com/v2");
  const [defaultEventTypeId, setDefaultEventTypeId] = useState("");
  const [defaultEventTypeName, setDefaultEventTypeName] = useState("");
  const [defaultEventTypeSlug, setDefaultEventTypeSlug] = useState("");
  const [eventTypes, setEventTypes] = useState<CalcomEventType[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingEventTypes, setIsLoadingEventTypes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setEnabled(settings.enabled !== false);
    setCredentialMode(settings.credentialMode === "platform" ? "platform" : "byok");
    setApiKey("");
    setApiBaseUrl(settings.apiBaseUrl || "https://api.cal.com/v2");
    setDefaultEventTypeId(
      settings.defaultEventTypeId ? String(settings.defaultEventTypeId) : "",
    );
    setDefaultEventTypeName(settings.defaultEventTypeName || "");
    setDefaultEventTypeSlug(settings.defaultEventTypeSlug || "");
    setStatusMessage(null);
  }, [settings]);

  const isLoading = settings === undefined;
  const canUsePlatformManaged = settings?.canUsePlatformManaged === true;
  const hasOrganizationSettings = settings?.hasOrganizationSettings === true;

  const selectedEventType = useMemo(() => {
    const numericId = Number.parseInt(defaultEventTypeId, 10);
    if (!Number.isInteger(numericId)) {
      return null;
    }
    return eventTypes.find((eventType) => eventType.id === numericId) || null;
  }, [defaultEventTypeId, eventTypes]);

  useEffect(() => {
    if (!selectedEventType) {
      return;
    }
    setDefaultEventTypeName(selectedEventType.name);
    setDefaultEventTypeSlug(selectedEventType.slug || "");
  }, [selectedEventType]);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      notification.error("Missing API key", "Enter a Cal.com API key to test.");
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    try {
      const result = await testConnection({
        apiKey: apiKey.trim(),
        apiBaseUrl: apiBaseUrl.trim() || undefined,
      });
      if (result.success) {
        setStatusMessage({
          tone: "success",
          text: `Connection OK${result.apiBaseUrl ? ` (${result.apiBaseUrl})` : ""}`,
        });
        notification.success("Connection OK", "Cal.com credentials look valid.");
      } else {
        const text = result.error || "Could not validate Cal.com credentials.";
        setStatusMessage({ tone: "error", text });
        notification.error("Test failed", text);
      }
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Could not validate Cal.com credentials.";
      setStatusMessage({ tone: "error", text });
      notification.error("Test failed", text);
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadEventTypes = async () => {
    if (!sessionId) {
      return;
    }

    setIsLoadingEventTypes(true);
    setStatusMessage(null);
    try {
      const result = await listEventTypes({
        sessionId,
        apiKey: apiKey.trim() || undefined,
        apiBaseUrl: apiBaseUrl.trim() || undefined,
      });

      if (!result.success) {
        const text = result.error || "Could not load Cal.com event types.";
        setEventTypes([]);
        setStatusMessage({ tone: "error", text });
        notification.error("Load failed", text);
        return;
      }

      setEventTypes(Array.isArray(result.eventTypes) ? result.eventTypes : []);
      if ((result.eventTypes || []).length === 0) {
        setStatusMessage({
          tone: "error",
          text: "No Cal.com event types were returned for this credential set.",
        });
      } else {
        setStatusMessage({
          tone: "success",
          text: `Loaded ${(result.eventTypes || []).length} event type${(result.eventTypes || []).length === 1 ? "" : "s"}.`,
        });
      }
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Could not load Cal.com event types.";
      setEventTypes([]);
      setStatusMessage({ tone: "error", text });
      notification.error("Load failed", text);
    } finally {
      setIsLoadingEventTypes(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId) {
      return;
    }

    if (credentialMode === "platform" && !canUsePlatformManaged) {
      notification.error(
        "Platform mode unavailable",
        "Only a super admin on the platform organization can use platform-managed Cal.com.",
      );
      return;
    }

    if (enabled && !apiKey.trim() && !settings?.hasApiKey) {
      notification.error(
        "Missing API key",
        "Cal.com requires an API key before the integration can be enabled.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const normalizedDefaultEventTypeId = defaultEventTypeId
        ? Number.parseInt(defaultEventTypeId, 10)
        : undefined;
      await saveSettings({
        sessionId,
        enabled,
        credentialMode,
        apiKey: apiKey.trim() || undefined,
        apiBaseUrl: apiBaseUrl.trim() || undefined,
        defaultEventTypeId: normalizedDefaultEventTypeId,
        defaultEventTypeName: normalizedDefaultEventTypeId
          ? defaultEventTypeName.trim() || undefined
          : undefined,
        defaultEventTypeSlug: normalizedDefaultEventTypeId
          ? defaultEventTypeSlug.trim() || undefined
          : undefined,
      });

      setApiKey("");
      notification.success("Saved", "Cal.com settings saved successfully.");
      setStatusMessage({
        tone: "success",
        text:
          credentialMode === "platform"
            ? "Platform-managed Cal.com saved."
            : "BYOK Cal.com saved.",
      });
    } catch (error) {
      notification.error(
        "Save failed",
        error instanceof Error ? error.message : "Could not save Cal.com settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) {
      return;
    }

    const confirmed = await confirmDialog.confirm({
      title: "Disconnect Cal.com",
      message:
        "This removes the current organization's Cal.com configuration. Continue?",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) {
      return;
    }

    try {
      await disconnect({ sessionId });
      setApiKey("");
      setEventTypes([]);
      setStatusMessage(null);
      notification.success("Disconnected", "Cal.com settings removed.");
    } catch (error) {
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Could not disconnect Cal.com.",
      );
    }
  };

  const activeSourceLabel =
    settings?.source === "platform"
      ? "Platform-managed"
      : settings?.source === "org"
        ? "Organization BYOK"
        : "Not configured";

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
            <CalendarDays size={24} style={{ color: "#111827" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                Cal.com
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Event types, availability, and booking via Cal.com API
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
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--window-document-text)" }}
              />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading...
              </p>
            </div>
          ) : (
            <>
              <div
                className="p-4 border-2 rounded space-y-3"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    style={{
                      color: settings?.source ? "#10b981" : "var(--neutral-gray)",
                    }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: settings?.source ? "#10b981" : "var(--window-document-text)",
                    }}
                  >
                    {activeSourceLabel}
                  </span>
                </div>
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      API base URL
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {settings?.apiBaseUrl || "https://api.cal.com/v2"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      Default event type
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {settings?.defaultEventTypeName
                        ? `${settings.defaultEventTypeName}${settings.defaultEventTypeSlug ? ` (${settings.defaultEventTypeSlug})` : ""}${settings.defaultEventTypeId ? ` • #${settings.defaultEventTypeId}` : ""}`
                        : "No default event type selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      Access policy
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {canUsePlatformManaged
                        ? "Platform-managed mode is available because you are a super admin on the platform org."
                        : "This org must use its own Cal.com API key. Platform-managed mode is reserved for super admins on the platform org."}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 border-2 rounded space-y-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      Integration enabled
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Disable this to keep the configuration stored but inactive.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => setEnabled(event.target.checked)}
                    />
                    Enabled
                  </label>
                </div>

                <div>
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                    Credential mode
                  </p>
                  <div className="grid gap-2">
                    <label
                      className="p-3 border-2 rounded cursor-pointer"
                      style={{
                        borderColor:
                          credentialMode === "byok"
                            ? "var(--tone-accent)"
                            : "var(--window-document-border)",
                        background:
                          credentialMode === "byok"
                            ? "var(--window-document-bg)"
                            : "var(--window-document-bg-elevated)",
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="calcom-mode"
                          checked={credentialMode === "byok"}
                          onChange={() => setCredentialMode("byok")}
                        />
                        <div>
                          <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                            Bring your own key (BYOK)
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                            Required for every non-platform organization.
                          </p>
                        </div>
                      </div>
                    </label>

                    <label
                      className="p-3 border-2 rounded"
                      style={{
                        borderColor:
                          credentialMode === "platform"
                            ? "var(--tone-accent)"
                            : "var(--window-document-border)",
                        background:
                          credentialMode === "platform"
                            ? "var(--window-document-bg)"
                            : "var(--window-document-bg-elevated)",
                        opacity: canUsePlatformManaged ? 1 : 0.6,
                        cursor: canUsePlatformManaged ? "pointer" : "not-allowed",
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="calcom-mode"
                          checked={credentialMode === "platform"}
                          onChange={() => {
                            if (canUsePlatformManaged) {
                              setCredentialMode("platform");
                            }
                          }}
                          disabled={!canUsePlatformManaged}
                        />
                        <div>
                          <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                            Platform-managed default
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                            Only available to super admins on the platform org.
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      API base URL
                    </label>
                    <input
                      type="text"
                      value={apiBaseUrl}
                      onChange={(event) => setApiBaseUrl(event.target.value)}
                      placeholder="https://api.cal.com/v2"
                      className="w-full p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      API key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder={
                        settings?.hasApiKey
                          ? "Stored key exists. Enter a new key only to rotate it."
                          : "cal_live_..."
                      }
                      className="w-full p-2 border-2 rounded text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <InteriorButton
                      variant="secondary"
                      onClick={handleTest}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test credentials"
                      )}
                    </InteriorButton>

                    <InteriorButton
                      variant="secondary"
                      onClick={handleLoadEventTypes}
                      disabled={isLoadingEventTypes}
                    >
                      {isLoadingEventTypes ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} className="mr-1" />
                          Load event types
                        </>
                      )}
                    </InteriorButton>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1" style={{ color: "var(--window-document-text)" }}>
                      Default event type
                    </label>
                    {eventTypes.length > 0 ? (
                      <select
                        value={defaultEventTypeId}
                        onChange={(event) => setDefaultEventTypeId(event.target.value)}
                        className="w-full p-2 border-2 rounded text-xs"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <option value="">No default event type</option>
                        {eventTypes.map((eventType) => (
                          <option key={eventType.id} value={String(eventType.id)}>
                            {eventType.name}
                            {eventType.slug ? ` (${eventType.slug})` : ""}
                            {eventType.lengthInMinutes
                              ? ` • ${eventType.lengthInMinutes} min`
                              : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={defaultEventTypeId}
                        onChange={(event) => setDefaultEventTypeId(event.target.value)}
                        placeholder="Optional event type ID"
                        className="w-full p-2 border-2 rounded text-xs"
                        style={{
                          borderColor: "var(--window-document-border)",
                          background: "var(--window-document-bg)",
                          color: "var(--window-document-text)",
                        }}
                      />
                    )}
                    <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Used by availability and booking actions when no event type is passed explicitly.
                    </p>
                  </div>
                </div>

                {statusMessage ? (
                  <div
                    className="p-3 border rounded text-xs"
                    style={{
                      borderColor:
                        statusMessage.tone === "success"
                          ? "rgba(16, 185, 129, 0.35)"
                          : "rgba(239, 68, 68, 0.35)",
                      background:
                        statusMessage.tone === "success"
                          ? "rgba(16, 185, 129, 0.08)"
                          : "rgba(239, 68, 68, 0.08)",
                      color:
                        statusMessage.tone === "success"
                          ? "#047857"
                          : "#b91c1c",
                    }}
                  >
                    {statusMessage.text}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <InteriorButton onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 size={14} className="mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save settings"
                    )}
                  </InteriorButton>

                  {hasOrganizationSettings ? (
                    <InteriorButton variant="secondary" onClick={handleDisconnect}>
                      Disconnect
                    </InteriorButton>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
