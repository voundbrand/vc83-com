"use client";

/**
 * Agent creation/editing form.
 * Extracted from agent-configuration-window.tsx with the same
 * 5-section sidebar navigation: Identity, Knowledge, Model, Guardrails, Channels.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, ChevronRight, Sparkles, Mic, Keyboard } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import { getVoiceAssistantWindowContract } from "@/components/window-content/ai-chat-window/voice-assistant-contract";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentCustomProps } from "./types";
import { SUBTYPES, CHANNELS, MODELS, DEFAULT_AGENT_MODEL_ID } from "./types";
import { FormField } from "./form-field";

interface AgentCreateFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  editingAgentId?: Id<"objects"> | null;
  onSaved: (agentId?: Id<"objects">) => void;
  onCancel: () => void;
}

type FormSection = "identity" | "knowledge" | "model" | "guardrails" | "channels";
type CreationLaunchMode = "talk" | "type";

type ElevenLabsVoiceCatalogEntry = {
  voiceId: string;
  name: string;
  category?: string;
  language?: string;
  labels?: Record<string, string>;
};

export function AgentCreateForm({
  sessionId,
  organizationId,
  editingAgentId,
  onSaved,
  onCancel,
}: AgentCreateFormProps) {
  const { openWindow } = useWindowManager();
  const { t } = useNamespaceTranslations("ui.agents");
  const tx = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this form component.
  const getAgentQuery = (api as any).agentOntology.getAgent;
  const existingAgent = useQuery(
    getAgentQuery,
    editingAgentId ? { sessionId, agentId: editingAgentId } : "skip"
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const channelApi = (require("../../../../convex/_generated/api") as { api: any }).api;
  const configuredChannels = useQuery(
    channelApi.channels.router.getConfiguredChannels,
    { organizationId }
  ) as Array<{ channel: string; providerId: string }> | undefined;

  const createAgent = useMutation(api.agentOntology.createAgent);
  const updateAgent = useMutation(api.agentOntology.updateAgent);
  const listElevenLabsVoices = useAction(
    (api as any).integrations.elevenlabs.listElevenLabsVoices,
  );

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [subtype, setSubtype] = useState("general");
  const [personality, setPersonality] = useState("");
  const [language, setLanguage] = useState("en");
  const [voiceLanguage, setVoiceLanguage] = useState("en");
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState("");
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [voiceCatalog, setVoiceCatalog] = useState<ElevenLabsVoiceCatalogEntry[]>([]);
  const [isVoiceCatalogLoading, setIsVoiceCatalogLoading] = useState(false);
  const [voiceCatalogError, setVoiceCatalogError] = useState<string | null>(null);
  const [voiceCatalogLoaded, setVoiceCatalogLoaded] = useState(false);
  const [brandVoice, setBrandVoice] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [autonomyLevel, setAutonomyLevel] = useState<"supervised" | "autonomous" | "draft_only">("supervised");
  const [maxMsgsPerDay, setMaxMsgsPerDay] = useState(100);
  const [maxCostPerDay, setMaxCostPerDay] = useState(5);
  const [modelId, setModelId] = useState(DEFAULT_AGENT_MODEL_ID);
  const [temperature, setTemperature] = useState(0.7);
  const [channelBindings, setChannelBindings] = useState<Array<{ channel: string; enabled: boolean }>>(
    CHANNELS.map((c) => ({ channel: c, enabled: false }))
  );
  const [blockedTopics, setBlockedTopics] = useState("");
  const [formSection, setFormSection] = useState<FormSection>("identity");
  const [launchMode, setLaunchMode] = useState<CreationLaunchMode | null>(editingAgentId ? "type" : null);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const filteredVoiceCatalog = useMemo(() => {
    const query = voiceSearchQuery.trim().toLowerCase();
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
  }, [voiceCatalog, voiceSearchQuery]);

  // Populate form when editing
  if (editingAgentId && existingAgent && !initialized) {
    const p = (existingAgent.customProperties || {}) as AgentCustomProps;
    setName(existingAgent.name || "");
    setDisplayName(p.displayName || "");
    setSubtype(existingAgent.subtype || "general");
    setPersonality(p.personality || "");
    setLanguage(p.language || "en");
    setVoiceLanguage(p.voiceLanguage || p.language || "en");
    setElevenLabsVoiceId(p.elevenLabsVoiceId || "");
    setBrandVoice(p.brandVoiceInstructions || "");
    setSystemPrompt(p.systemPrompt || "");
    setAutonomyLevel(p.autonomyLevel || "supervised");
    setMaxMsgsPerDay(p.maxMessagesPerDay || 100);
    setMaxCostPerDay(p.maxCostPerDay || 5);
    setModelId(p.modelId || DEFAULT_AGENT_MODEL_ID);
    setTemperature(p.temperature ?? 0.7);
    setChannelBindings(
      p.channelBindings?.length
        ? p.channelBindings
        : CHANNELS.map((c) => ({ channel: c, enabled: false }))
    );
    setBlockedTopics((p.blockedTopics || []).join(", "));
    setInitialized(true);
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingAgentId) {
        await updateAgent({
          sessionId,
          agentId: editingAgentId,
          updates: {
            name, displayName, subtype, personality, language,
            voiceLanguage: voiceLanguage.trim() || language.trim() || "en",
            brandVoiceInstructions: brandVoice, systemPrompt, autonomyLevel,
            elevenLabsVoiceId: elevenLabsVoiceId.trim() || undefined,
            maxMessagesPerDay: maxMsgsPerDay, maxCostPerDay: maxCostPerDay,
            modelId, temperature, channelBindings,
            blockedTopics: blockedTopics.split(",").map((t) => t.trim()).filter(Boolean),
          },
        });
        onSaved(editingAgentId);
      } else {
        const agentId = await createAgent({
          sessionId, organizationId, name, displayName, subtype, personality, language,
          voiceLanguage: voiceLanguage.trim() || language.trim() || "en",
          brandVoiceInstructions: brandVoice, systemPrompt, autonomyLevel,
          elevenLabsVoiceId: elevenLabsVoiceId.trim() || undefined,
          maxMessagesPerDay: maxMsgsPerDay, maxCostPerDay: maxCostPerDay,
          modelId, temperature, channelBindings,
          blockedTopics: blockedTopics.split(",").map((t) => t.trim()).filter(Boolean),
        });
        onSaved(agentId as Id<"objects"> | undefined);
      }
    } catch (e) {
      console.error("Failed to save agent:", e);
    } finally {
      setSaving(false);
    }
  };

  const loadVoiceCatalog = useCallback(async () => {
    if (!sessionId || !organizationId) {
      return;
    }

    setIsVoiceCatalogLoading(true);
    setVoiceCatalogError(null);
    try {
      const result = (await listElevenLabsVoices({
        sessionId,
        organizationId,
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
            "Unable to load ElevenLabs voices. Configure API key and provider health first.",
        );
      } else {
        setVoiceCatalog(Array.isArray(result.voices) ? result.voices : []);
      }
    } catch (error) {
      setVoiceCatalog([]);
      setVoiceCatalogError(
        error instanceof Error
          ? error.message
          : "Unable to load ElevenLabs voices.",
      );
    } finally {
      setIsVoiceCatalogLoading(false);
      setVoiceCatalogLoaded(true);
    }
  }, [listElevenLabsVoices, organizationId, sessionId]);

  useEffect(() => {
    if (formSection !== "identity") {
      return;
    }
    if (voiceCatalogLoaded || isVoiceCatalogLoading) {
      return;
    }
    void loadVoiceCatalog();
  }, [formSection, isVoiceCatalogLoading, loadVoiceCatalog, voiceCatalogLoaded]);

  const openAgentBuilder = (mode: CreationLaunchMode = "talk") => {
    const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
    openWindow(
      aiAssistantWindowContract.windowId,
      aiAssistantWindowContract.title,
      <AIChatWindow initialLayoutMode="slick" />,
      aiAssistantWindowContract.position,
      aiAssistantWindowContract.size,
      aiAssistantWindowContract.titleKey,
      aiAssistantWindowContract.iconId,
      {
        openContext: mode === "talk" ? "agent_quickstart_talk" : "agent_quickstart_type",
        initialLayoutMode: "slick",
        initialPanel: "agent-creation",
        sourceSessionId: sessionId,
        sourceOrganizationId: String(organizationId),
      }
    );
  };

  const startTalkMode = () => {
    setLaunchMode("talk");
    setFormSection("identity");
    openAgentBuilder("talk");
  };

  const startTypeMode = () => {
    setLaunchMode("type");
    setFormSection("identity");
  };

  const sections: Array<{ id: FormSection; label: string }> = [
    { id: "identity", label: tx("ui.agents.create_form.section.identity", "Identity") },
    { id: "knowledge", label: tx("ui.agents.create_form.section.knowledge", "Knowledge") },
    { id: "model", label: tx("ui.agents.create_form.section.model", "Model") },
    { id: "guardrails", label: tx("ui.agents.create_form.section.guardrails", "Guardrails") },
    { id: "channels", label: tx("ui.agents.create_form.section.channels", "Channels") },
  ];

  return (
    <div className="flex h-full">
      {/* Section nav */}
      <div className="w-40 border-r-2 p-2 flex-shrink-0" style={{ borderColor: "var(--win95-border)" }}>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs mb-3 hover:underline"
          style={{ color: "var(--win95-text-secondary)" }}
        >
          <ArrowLeft size={12} /> {tx("ui.agents.create_form.back", "Back")}
        </button>

        {!editingAgentId && launchMode !== null && (
          <div className="mb-3 space-y-1">
            <button
              onClick={startTalkMode}
              className="retro-button flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--win95-border-light)", background: launchMode === "talk" ? "var(--win95-bg-light)" : "var(--win95-bg)", color: "var(--win95-text)" }}
            >
              <Mic size={10} style={{ color: "var(--warning)" }} />
              {tx("ui.agents.create_form.mode.talk", "Talk")}
            </button>
            <button
              onClick={startTypeMode}
              className="retro-button flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--win95-border-light)", background: launchMode === "type" ? "var(--win95-bg-light)" : "var(--win95-bg)", color: "var(--win95-text)" }}
            >
              <Keyboard size={10} style={{ color: "var(--win95-text)" }} />
              {tx("ui.agents.create_form.mode.type", "Type")}
            </button>
          </div>
        )}

        {(editingAgentId || launchMode !== null) && sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setFormSection(s.id)}
            className="w-full text-left text-xs px-2 py-1.5 flex items-center gap-1"
            style={{
              background: formSection === s.id ? "var(--win95-bg-light)" : "transparent",
              color: "var(--win95-text)",
              boxShadow: formSection === s.id ? "inset 2px 0 0 var(--win95-border-light)" : "none",
            }}
          >
            <ChevronRight size={10} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!editingAgentId && launchMode === null ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
              {tx("ui.agents.create_form.title.create", "Create Agent")}
            </h3>
            <div
              className="border p-3"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--win95-text)" }}>
                <Sparkles size={12} style={{ color: "var(--warning)" }} />
                {tx("ui.agents.create_form.quickstart.title", "Guided Quickstart (<=15 min)")}
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "ui.agents.create_form.quickstart.description",
                  "Choose Talk or Type, define mission + guardrails, then continue to deploy handoff for Webchat, Telegram, or Both.",
                )}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <button
                  onClick={startTalkMode}
                  className="border px-3 py-2 text-left"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Mic size={12} style={{ color: "var(--warning)" }} />
                    {tx("ui.agents.create_form.mode.talk", "Talk")}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "ui.agents.create_form.quickstart.talk_description",
                      "Open guided voice-first assistant mode and co-create through voice/chat prompts.",
                    )}
                  </p>
                </button>
                <button
                  onClick={startTypeMode}
                  className="border px-3 py-2 text-left"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Keyboard size={12} style={{ color: "var(--win95-text)" }} />
                    {tx("ui.agents.create_form.mode.type", "Type")}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "ui.agents.create_form.quickstart.type_description",
                      "Use deterministic form setup while keeping the same first-run deploy follow-through.",
                    )}
                  </p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
              {editingAgentId
                ? tx("ui.agents.create_form.title.edit", "Edit Agent")
                : tx("ui.agents.create_form.title.create", "Create Agent")}
            </h3>

            {!editingAgentId && (
              <div
                className="mb-3 border p-2 text-xs flex items-center justify-between gap-2"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)", color: "var(--win95-text)" }}
              >
                <span>
                  {tx("ui.agents.create_form.start_mode", "Start mode:")}{" "}
                  <strong>{launchMode === "talk"
                    ? tx("ui.agents.create_form.mode.talk", "Talk")
                    : tx("ui.agents.create_form.mode.type", "Type")}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={startTalkMode}
                    className="px-2 py-1 border text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                  >
                    {tx("ui.agents.create_form.mode.talk", "Talk")}
                  </button>
                  <button
                    onClick={startTypeMode}
                    className="px-2 py-1 border text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
                  >
                    {tx("ui.agents.create_form.mode.type", "Type")}
                  </button>
                </div>
              </div>
            )}

            {formSection === "identity" && (
              <div className="space-y-3">
                <FormField
                  label={tx("ui.agents.create_form.field.name", "Name *")}
                  value={name}
                  onChange={setName}
                  placeholder={tx("ui.agents.create_form.field.name_placeholder", "My Support Agent")}
                />
                <FormField
                  label={tx("ui.agents.create_form.field.display_name", "Display Name")}
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder={tx("ui.agents.create_form.field.display_name_placeholder", "How the agent introduces itself")}
                />
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
                    {tx("ui.agents.create_form.field.type", "Type")}
                  </label>
                  <select value={subtype} onChange={(e) => setSubtype(e.target.value)}
                    className="w-full border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, var(--window-document-bg))" }}>
                    {SUBTYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <FormField
                  label={tx("ui.agents.create_form.field.personality", "Personality")}
                  value={personality}
                  onChange={setPersonality}
                  multiline
                  placeholder={tx("ui.agents.create_form.field.personality_placeholder", "Friendly, professional, concise...")}
                />
                <FormField
                  label={tx("ui.agents.create_form.field.language", "Language")}
                  value={language}
                  onChange={setLanguage}
                  placeholder={tx("ui.agents.create_form.field.language_placeholder", "en")}
                />
                <FormField
                  label={tx("ui.agents.create_form.field.voice_language", "Voice Language (ElevenLabs)")}
                  value={voiceLanguage}
                  onChange={setVoiceLanguage}
                  placeholder={tx("ui.agents.create_form.field.voice_language_placeholder", "en or en-US")}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                      {tx("ui.agents.create_form.voice_picker.title", "ElevenLabs Voice Picker")}
                    </label>
                    <button
                      type="button"
                      onClick={() => void loadVoiceCatalog()}
                      disabled={isVoiceCatalogLoading}
                      className="px-2 py-1 border text-xs disabled:opacity-50"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg)",
                        color: "var(--win95-text)",
                      }}
                    >
                      {isVoiceCatalogLoading
                        ? tx("ui.agents.create_form.loading", "Loading...")
                        : voiceCatalogLoaded
                          ? tx("ui.agents.create_form.voice_picker.refresh_voices", "Refresh voices")
                          : tx("ui.agents.create_form.voice_picker.load_voices", "Load voices")}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={voiceSearchQuery}
                    onChange={(event) => setVoiceSearchQuery(event.target.value)}
                    placeholder={tx("ui.agents.create_form.voice_picker.search_placeholder", "Search by voice name, ID, or language")}
                    className="w-full border px-2 py-1 text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg-light, var(--window-document-bg))",
                      color: "var(--win95-text)",
                    }}
                  />
                  <select
                    value={elevenLabsVoiceId}
                    onChange={(event) => setElevenLabsVoiceId(event.target.value)}
                    className="w-full border px-2 py-1 text-xs"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg-light, var(--window-document-bg))",
                      color: "var(--win95-text)",
                    }}
                  >
                    <option value="">{tx("ui.agents.create_form.voice_picker.use_org_default", "Use org default voice")}</option>
                    {filteredVoiceCatalog.map((voice) => (
                      <option key={voice.voiceId} value={voice.voiceId}>
                        {voice.name} ({voice.voiceId})
                        {voice.language ? ` - ${voice.language}` : ""}
                      </option>
                    ))}
                  </select>
                  {voiceCatalogError ? (
                    <p className="text-xs" style={{ color: "var(--error)" }}>
                      {voiceCatalogError}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {voiceCatalog.length > 0
                        ? tx("ui.agents.create_form.voice_picker.loaded_count", "Loaded {count} voices for this org.", {
                          count: voiceCatalog.length,
                        })
                        : tx("ui.agents.create_form.voice_picker.no_voices_loaded", "No voices loaded yet. You can still paste a voice ID manually.")}
                    </p>
                  )}
                </div>
                <FormField
                  label={tx("ui.agents.create_form.field.elevenlabs_voice_id", "ElevenLabs Voice ID")}
                  value={elevenLabsVoiceId}
                  onChange={setElevenLabsVoiceId}
                  placeholder={tx("ui.agents.create_form.field.elevenlabs_voice_id_placeholder", "voice_xxxxx")}
                />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx(
                    "ui.agents.create_form.voice_id_help",
                    "Voice ID and voice language are optional per-agent overrides. Runtime fallback: inbound request -> agent defaults -> org default voice.",
                  )}
                </p>
                <FormField
                  label={tx("ui.agents.create_form.field.brand_voice", "Brand Voice")}
                  value={brandVoice}
                  onChange={setBrandVoice}
                  multiline
                  placeholder={tx("ui.agents.create_form.field.brand_voice_placeholder", "Tone and style guidelines...")}
                />
              </div>
            )}

            {formSection === "knowledge" && (
              <div className="space-y-3">
                <FormField
                  label={tx("ui.agents.create_form.field.system_prompt", "System Prompt")}
                  value={systemPrompt}
                  onChange={setSystemPrompt}
                  multiline
                  rows={8}
                  placeholder={tx("ui.agents.create_form.field.system_prompt_placeholder", "Additional instructions...")}
                />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.agents.create_form.knowledge_help", "FAQ entries and knowledge base docs can be managed after creation.")}
                </p>
              </div>
            )}

            {formSection === "model" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
                    {tx("ui.agents.create_form.field.model", "Model")}
                  </label>
                  <select value={modelId} onChange={(e) => setModelId(e.target.value)}
                    className="w-full border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, var(--window-document-bg))" }}>
                    {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
                    {tx("ui.agents.create_form.field.temperature", "Temperature:")} {temperature}
                  </label>
                  <input type="range" min={0} max={1} step={0.1} value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <span>{tx("ui.agents.create_form.temperature_precise", "Precise (0)")}</span>
                    <span>{tx("ui.agents.create_form.temperature_creative", "Creative (1)")}</span>
                  </div>
                </div>
              </div>
            )}

            {formSection === "guardrails" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
                    {tx("ui.agents.create_form.field.autonomy_level", "Autonomy Level")}
                  </label>
                  <select value={autonomyLevel} onChange={(e) => setAutonomyLevel(e.target.value as typeof autonomyLevel)}
                    className="w-full border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, var(--window-document-bg))" }}>
                    <option value="supervised">{tx("ui.agents.create_form.autonomy.supervised", "Supervised (all actions need approval)")}</option>
                    <option value="autonomous">{tx("ui.agents.create_form.autonomy.autonomous", "Autonomous (acts within guardrails)")}</option>
                    <option value="draft_only">{tx("ui.agents.create_form.autonomy.draft_only", "Draft Only (read-only, no actions)")}</option>
                  </select>
                </div>
                <FormField
                  label={tx("ui.agents.create_form.field.max_messages_per_day", "Max Messages / Day")}
                  value={String(maxMsgsPerDay)}
                  onChange={(v) => setMaxMsgsPerDay(parseInt(v) || 100)}
                />
                <FormField
                  label={tx("ui.agents.create_form.field.max_cost_per_day", "Max Cost / Day ($)")}
                  value={String(maxCostPerDay)}
                  onChange={(v) => setMaxCostPerDay(parseFloat(v) || 5)}
                />
                <FormField
                  label={tx("ui.agents.create_form.field.blocked_topics", "Blocked Topics")}
                  value={blockedTopics}
                  onChange={setBlockedTopics}
                  placeholder={tx("ui.agents.create_form.field.blocked_topics_placeholder", "competitors, pricing, legal advice")}
                />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.agents.create_form.blocked_topics_help", "Comma-separated list of topics the agent should avoid.")}
                </p>
              </div>
            )}

            {formSection === "channels" && (
              <div className="space-y-3">
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  {tx("ui.agents.create_form.channels_help", "Enable channels this agent should respond on.")}
                </p>
                {channelBindings.map((binding, idx) => {
                  const providerBinding = configuredChannels?.find((c) => c.channel === binding.channel);
                  const channelLabel = binding.channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <label key={binding.channel} className="flex items-center gap-2 text-xs cursor-pointer py-1">
                      <input type="checkbox" checked={binding.enabled}
                        onChange={(e) => {
                          const updated = [...channelBindings];
                          updated[idx] = { ...binding, enabled: e.target.checked };
                          setChannelBindings(updated);
                        }} />
                      <span style={{ color: "var(--win95-text)" }}>{channelLabel}</span>
                      {providerBinding && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                          {tx("ui.agents.create_form.channels.via", "via")} {providerBinding.providerId}
                        </span>
                      )}
                      {!providerBinding && binding.channel !== "api" && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                          {tx("ui.agents.create_form.channels.no_provider", "no provider")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Save */}
            <div className="mt-6 pt-3 border-t-2 flex gap-2" style={{ borderColor: "var(--win95-border)" }}>
              <button onClick={handleSave} disabled={saving || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 border text-xs font-medium disabled:opacity-50"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                <Save size={12} />
                {saving
                  ? tx("ui.agents.create_form.saving", "Saving...")
                  : editingAgentId
                    ? tx("ui.agents.create_form.update_agent", "Update Agent")
                    : tx("ui.agents.create_form.title.create", "Create Agent")}
              </button>
              <button onClick={onCancel}
                className="px-4 py-1.5 border text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                {tx("ui.agents.create_form.cancel", "Cancel")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
