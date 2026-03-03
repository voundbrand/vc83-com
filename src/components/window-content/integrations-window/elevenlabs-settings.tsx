"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

type ElevenLabsBillingSource = "platform" | "byok" | "private";
type ProbeStatus = "healthy" | "degraded" | "offline";

type ElevenLabsSettingsSnapshot = {
  enabled: boolean;
  hasApiKey: boolean;
  hasPlatformApiKey?: boolean;
  hasEffectiveApiKey?: boolean;
  canUsePlatformManaged?: boolean;
  billingSource?: ElevenLabsBillingSource;
  baseUrl: string;
  defaultVoiceId: string | null;
  lastFailureReason?: string | null;
  healthStatus?: ProbeStatus;
  healthReason?: string | null;
};

type ElevenLabsVoiceCatalogEntry = {
  voiceId: string;
  name: string;
  category?: string;
  language?: string;
  labels?: Record<string, string>;
  previewUrl?: string;
};

interface ElevenLabsSettingsProps {
  onBack: () => void;
}

export function ElevenLabsSettings({ onBack }: ElevenLabsSettingsProps) {
  const { sessionId, user } = useAuth();
  const organizationId = user?.currentOrganization?.id as Id<"organizations"> | undefined;

  const settings = useQuery(
    apiAny.integrations.elevenlabs.getElevenLabsSettings,
    sessionId && organizationId ? { sessionId, organizationId } : "skip",
  ) as ElevenLabsSettingsSnapshot | undefined;

  const saveElevenLabsSettings = useMutation(
    apiAny.integrations.elevenlabs.saveElevenLabsSettings,
  );
  const probeElevenLabsHealth = useAction(
    apiAny.integrations.elevenlabs.probeElevenLabsHealth,
  );
  const listElevenLabsVoices = useAction(
    apiAny.integrations.elevenlabs.listElevenLabsVoices,
  );
  const synthesizeElevenLabsVoiceSample = useAction(
    apiAny.integrations.elevenlabs.synthesizeElevenLabsVoiceSample,
  );

  const [enabled, setEnabled] = useState(false);
  const [billingSource, setBillingSource] = useState<"platform" | "byok">("platform");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.elevenlabs.io/v1");
  const [defaultVoiceId, setDefaultVoiceId] = useState("");
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [hasPlatformApiKey, setHasPlatformApiKey] = useState(false);

  const [voiceCatalog, setVoiceCatalog] = useState<ElevenLabsVoiceCatalogEntry[]>([]);
  const [voiceSearch, setVoiceSearch] = useState("");
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceCatalogError, setVoiceCatalogError] = useState<string | null>(null);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    status: ProbeStatus;
    reason?: string;
    checkedAt: number;
  } | null>(null);
  const canUsePlatformManaged = settings?.canUsePlatformManaged === true;
  const platformManagedLocked =
    !canUsePlatformManaged && settings?.billingSource === "platform";

  useEffect(() => {
    if (!settings) {
      return;
    }

    setEnabled(Boolean(settings.enabled));
    if (settings.billingSource === "byok") {
      setBillingSource("byok");
    } else if (settings.billingSource === "platform") {
      setBillingSource("platform");
    } else {
      setBillingSource(canUsePlatformManaged ? "platform" : "byok");
    }
    setBaseUrl(settings.baseUrl || "https://api.elevenlabs.io/v1");
    setDefaultVoiceId(settings.defaultVoiceId ?? "");
    setHasSavedApiKey(Boolean(settings.hasApiKey));
    setHasPlatformApiKey(Boolean(settings.hasPlatformApiKey));
    setProbeResult({
      status: settings.healthStatus ?? "degraded",
      reason: settings.healthReason ?? settings.lastFailureReason ?? undefined,
      checkedAt: Date.now(),
    });
    if (!settings.hasApiKey) {
      setApiKey("");
    }
  }, [settings, canUsePlatformManaged]);

  const filteredVoiceCatalog = useMemo(() => {
    const query = voiceSearch.trim().toLowerCase();
    if (!query) {
      return voiceCatalog;
    }
    return voiceCatalog.filter((voice) => {
      const labelValues = voice.labels ? Object.values(voice.labels) : [];
      const haystack = [
        voice.name,
        voice.voiceId,
        voice.language || "",
        voice.category || "",
        ...labelValues,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [voiceCatalog, voiceSearch]);

  const healthStatus = probeResult?.status ?? settings?.healthStatus ?? "degraded";
  const healthReason =
    probeResult?.reason ??
    settings?.healthReason ??
    settings?.lastFailureReason ??
    undefined;
  const healthColor =
    healthStatus === "healthy"
      ? "var(--success)"
      : healthStatus === "offline"
        ? "var(--error)"
        : "var(--warning)";
  const healthLabel =
    healthStatus === "healthy"
      ? "Healthy"
      : healthStatus === "offline"
        ? "Offline"
        : "Degraded";
  const hasEffectiveCredential =
    billingSource === "platform"
      ? hasPlatformApiKey
      : hasSavedApiKey || apiKey.trim().length > 0;

  const handleLoadVoices = async () => {
    if (!sessionId || !organizationId) {
      return;
    }

    setIsLoadingVoices(true);
    setVoiceCatalogError(null);
    try {
      const result = (await listElevenLabsVoices({
        sessionId,
        organizationId,
        apiKey: billingSource === "byok" ? apiKey.trim() || undefined : undefined,
        baseUrl: baseUrl.trim() || undefined,
        pageSize: 100,
      })) as {
        success: boolean;
        voices?: ElevenLabsVoiceCatalogEntry[];
        reason?: string;
      };

      if (!result.success) {
        setVoiceCatalog([]);
        setVoiceCatalogError(
          result.reason ||
            "Unable to load ElevenLabs voices. Confirm credentials and provider status.",
        );
      } else {
        setVoiceCatalog(Array.isArray(result.voices) ? result.voices : []);
      }
    } catch (error) {
      setVoiceCatalog([]);
      setVoiceCatalogError(
        error instanceof Error ? error.message : "Unable to load ElevenLabs voices.",
      );
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleProbe = async () => {
    if (!sessionId || !organizationId) {
      return;
    }

    setIsProbing(true);
    try {
      const result = (await probeElevenLabsHealth({
        sessionId,
        organizationId,
        apiKey: billingSource === "byok" ? apiKey.trim() || undefined : undefined,
        baseUrl: baseUrl.trim() || undefined,
      })) as {
        status: ProbeStatus;
        reason?: string;
        checkedAt: number;
      };
      setProbeResult({
        status: result.status,
        reason: result.reason,
        checkedAt: result.checkedAt,
      });
    } catch (error) {
      setProbeResult({
        status: "offline",
        reason: error instanceof Error ? error.message : "Probe failed.",
        checkedAt: Date.now(),
      });
    } finally {
      setIsProbing(false);
    }
  };

  const handlePreviewVoice = async (voiceId: string) => {
    if (!sessionId || !organizationId || !voiceId) {
      return;
    }

    setVoicePreviewError(null);
    setIsPreviewingVoice(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const selected = voiceCatalog.find((voice) => voice.voiceId === voiceId);
    const previewName = selected?.name || voiceId;

    try {
      const result = (await synthesizeElevenLabsVoiceSample({
        sessionId,
        organizationId,
        voiceId,
        text: `hello this is ${previewName}`,
        apiKey: billingSource === "byok" ? apiKey.trim() || undefined : undefined,
        baseUrl: baseUrl.trim() || undefined,
      })) as {
        success: boolean;
        reason?: string;
        mimeType?: string;
        audioBase64?: string;
      };

      if (!result.success || !result.audioBase64 || !result.mimeType) {
        setVoicePreviewError(
          result.reason || "Unable to preview this voice."
        );
        return;
      }

      const audio = new Audio(
        `data:${result.mimeType};base64,${result.audioBase64}`,
      );
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      setVoicePreviewError(
        error instanceof Error ? error.message : "Unable to preview this voice.",
      );
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSave = async () => {
    if (!sessionId || !organizationId) {
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await saveElevenLabsSettings({
        sessionId,
        organizationId,
        enabled,
        billingSource,
        apiKey: billingSource === "byok" ? apiKey.trim() || undefined : undefined,
        baseUrl: baseUrl.trim() || undefined,
        defaultVoiceId: defaultVoiceId.trim() || undefined,
      });
      setHasSavedApiKey(
        billingSource === "byok"
          ? Boolean(apiKey.trim()) || hasSavedApiKey
          : hasSavedApiKey,
      );
      if (billingSource !== "byok") {
        setApiKey("");
      }
      setSaveMessage({
        tone: "success",
        text: "ElevenLabs settings saved.",
      });
    } catch (error) {
      setSaveMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to save ElevenLabs settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="integration-ui-scope flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading ElevenLabs settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="integration-ui-scope flex flex-col h-full" style={{ background: "var(--window-document-bg)" }}>
      <div className="px-4 py-3 border-b-2 flex items-center justify-between gap-3" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm hover:underline" style={{ color: "var(--tone-accent)" }}>
            <ArrowLeft size={14} className="inline mr-1" />
            Back
          </button>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Mic size={15} />
              ElevenLabs Voice Runtime
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Manage provider mode, key source, health probes, and org default voice.
            </p>
          </div>
        </div>
        <span
          className="text-[11px] px-2 py-1 font-bold"
          style={{
            background: enabled && hasEffectiveCredential ? "var(--success)" : "var(--window-document-border)",
            color: enabled && hasEffectiveCredential ? "white" : "var(--neutral-gray)",
          }}
        >
          {enabled && hasEffectiveCredential ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          className="p-3 border-2 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                disabled={platformManagedLocked}
              />
              Enable ElevenLabs provider
            </label>

            <label className="text-xs flex flex-col gap-1" style={{ color: "var(--window-document-text)" }}>
              Key source
              <select
                value={billingSource}
                onChange={(event) =>
                  setBillingSource(event.target.value === "byok" ? "byok" : "platform")
                }
                disabled={platformManagedLocked}
                className="p-2 text-xs border-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                {canUsePlatformManaged ? (
                  <option value="platform">Platform key</option>
                ) : null}
                <option value="byok">Bring your own key (BYOK)</option>
              </select>
              {!canUsePlatformManaged ? (
                <span style={{ color: "var(--neutral-gray)" }}>
                  Platform-managed ElevenLabs is super-admin only.
                </span>
              ) : null}
            </label>
          </div>

          {platformManagedLocked ? (
            <div
              className="p-2 border text-xs"
              style={{
                borderColor: "var(--warning)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              Platform-managed ElevenLabs settings are locked to super-admin.
            </div>
          ) : null}

          {billingSource === "platform" ? (
            <div
              className="p-2 border text-xs flex items-start gap-2"
              style={{
                borderColor: hasPlatformApiKey ? "var(--success)" : "var(--warning)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              {hasPlatformApiKey ? (
                <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
              ) : (
                <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
              )}
              <span>
                {hasPlatformApiKey
                  ? "Platform ElevenLabs key is available."
                  : "No platform ElevenLabs key detected. Runtime remains degraded until platform key is configured."}
              </span>
            </div>
          ) : (
            <label className="text-xs flex flex-col gap-1" style={{ color: "var(--window-document-text)" }}>
              ElevenLabs API Key
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                disabled={platformManagedLocked}
                placeholder={
                  hasSavedApiKey
                    ? "Stored key present. Enter a new key to rotate."
                    : "xi-api-key..."
                }
                className="p-2 text-xs border-2 font-mono"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              />
              <span style={{ color: "var(--neutral-gray)" }}>
                Keys stay redacted. Enter a value only when setting or rotating.
              </span>
            </label>
          )}

          <label className="text-xs flex flex-col gap-1" style={{ color: "var(--window-document-text)" }}>
            Base URL
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              disabled={platformManagedLocked}
              placeholder="https://api.elevenlabs.io/v1"
              className="p-2 text-xs border-2 font-mono"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            />
          </label>
        </div>

        <div
          className="p-3 border-2 space-y-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              Default Voice ID (optional)
            </p>
            <button
              type="button"
              onClick={handleLoadVoices}
              disabled={isLoadingVoices}
              className="desktop-interior-button py-1 px-3 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isLoadingVoices ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {isLoadingVoices ? "Loading..." : "Load voices"}
            </button>
          </div>

          <input
            type="text"
            value={voiceSearch}
            onChange={(event) => setVoiceSearch(event.target.value)}
            placeholder="Search by name, ID, or language"
            className="w-full p-2 text-xs border-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          />

          <select
            value={defaultVoiceId}
            onChange={(event) => {
              const nextVoiceId = event.target.value;
              setDefaultVoiceId(nextVoiceId);
              if (nextVoiceId) {
                void handlePreviewVoice(nextVoiceId);
              }
            }}
            disabled={platformManagedLocked}
            className="w-full p-2 text-xs border-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          >
            <option value="">No org default voice</option>
            {filteredVoiceCatalog.map((voice) => (
              <option key={voice.voiceId} value={voice.voiceId}>
                {voice.name} ({voice.voiceId})
                {voice.language ? ` - ${voice.language}` : ""}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (defaultVoiceId) {
                  void handlePreviewVoice(defaultVoiceId);
                }
              }}
              disabled={!defaultVoiceId || isPreviewingVoice}
              className="desktop-interior-button py-1 px-3 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isPreviewingVoice ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Mic size={12} />
              )}
              {isPreviewingVoice ? "Playing..." : "Replay preview"}
            </button>
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Selecting a voice auto-plays: hello this is [name]
            </span>
          </div>

          <input
            type="text"
            value={defaultVoiceId}
            onChange={(event) => setDefaultVoiceId(event.target.value)}
            disabled={platformManagedLocked}
            placeholder="voice_xxxxx"
            className="w-full p-2 text-xs border-2 font-mono"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
          />

          {voiceCatalogError ? (
            <p className="text-xs" style={{ color: "var(--error)" }}>
              {voiceCatalogError}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {voiceCatalog.length > 0
                ? `${voiceCatalog.length} voices loaded for this org.`
                : "Select from live list or paste a custom voice ID."}
            </p>
          )}
          {voicePreviewError ? (
            <p className="text-xs" style={{ color: "var(--error)" }}>
              {voicePreviewError}
            </p>
          ) : null}
        </div>

        <div
          className="p-3 border-2 space-y-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-2 py-1 text-xs font-bold"
              style={{ backgroundColor: healthColor, color: "white" }}
            >
              Provider health: {healthLabel}
            </span>
            {healthReason ? (
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Reason: {healthReason}
              </span>
            ) : null}
          </div>

          <button
            onClick={handleProbe}
            disabled={isProbing}
            className="desktop-interior-button py-1.5 px-3 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProbing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {isProbing ? "Testing provider..." : "Test provider health"}
          </button>
        </div>
      </div>

      <div
        className="px-4 py-3 border-t-2 flex items-center justify-between gap-3"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        {saveMessage ? (
          <span
            className="text-xs"
            style={{ color: saveMessage.tone === "success" ? "var(--success)" : "var(--error)" }}
          >
            {saveMessage.text}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Save applies org-level ElevenLabs defaults for all agent voice sessions.
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving || !sessionId || !organizationId || platformManagedLocked}
          className="desktop-interior-button py-2 px-4 text-xs font-pixel disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {isSaving ? "Saving..." : "Save ElevenLabs Settings"}
        </button>
      </div>
    </div>
  );
}
