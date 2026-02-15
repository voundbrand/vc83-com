"use client";

/**
 * Agent creation/editing form.
 * Extracted from agent-configuration-window.tsx with the same
 * 5-section sidebar navigation: Identity, Knowledge, Model, Guardrails, Channels.
 */

import { useState } from "react";
import { ArrowLeft, Save, ChevronRight, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useWindowManager } from "@/hooks/use-window-manager";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentCustomProps } from "./types";
import { SUBTYPES, CHANNELS, MODELS } from "./types";
import { FormField } from "./form-field";

interface AgentCreateFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  editingAgentId?: Id<"objects"> | null;
  onSaved: (agentId?: Id<"objects">) => void;
  onCancel: () => void;
}

type FormSection = "identity" | "knowledge" | "model" | "guardrails" | "channels";

export function AgentCreateForm({
  sessionId,
  organizationId,
  editingAgentId,
  onSaved,
  onCancel,
}: AgentCreateFormProps) {
  const { openWindow } = useWindowManager();

  const existingAgent = useQuery(
    api.agentOntology.getAgent,
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

  // Form state
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [subtype, setSubtype] = useState("general");
  const [personality, setPersonality] = useState("");
  const [language, setLanguage] = useState("en");
  const [brandVoice, setBrandVoice] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [autonomyLevel, setAutonomyLevel] = useState<"supervised" | "autonomous" | "draft_only">("supervised");
  const [maxMsgsPerDay, setMaxMsgsPerDay] = useState(100);
  const [maxCostPerDay, setMaxCostPerDay] = useState(5);
  const [modelId, setModelId] = useState("anthropic/claude-sonnet-4-20250514");
  const [temperature, setTemperature] = useState(0.7);
  const [channelBindings, setChannelBindings] = useState<Array<{ channel: string; enabled: boolean }>>(
    CHANNELS.map((c) => ({ channel: c, enabled: false }))
  );
  const [blockedTopics, setBlockedTopics] = useState("");
  const [formSection, setFormSection] = useState<FormSection>("identity");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form when editing
  if (editingAgentId && existingAgent && !initialized) {
    const p = (existingAgent.customProperties || {}) as AgentCustomProps;
    setName(existingAgent.name || "");
    setDisplayName(p.displayName || "");
    setSubtype(existingAgent.subtype || "general");
    setPersonality(p.personality || "");
    setLanguage(p.language || "en");
    setBrandVoice(p.brandVoiceInstructions || "");
    setSystemPrompt(p.systemPrompt || "");
    setAutonomyLevel(p.autonomyLevel || "supervised");
    setMaxMsgsPerDay(p.maxMessagesPerDay || 100);
    setMaxCostPerDay(p.maxCostPerDay || 5);
    setModelId(p.modelId || "anthropic/claude-sonnet-4-20250514");
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
            brandVoiceInstructions: brandVoice, systemPrompt, autonomyLevel,
            maxMessagesPerDay: maxMsgsPerDay, maxCostPerDay: maxCostPerDay,
            modelId, temperature, channelBindings,
            blockedTopics: blockedTopics.split(",").map((t) => t.trim()).filter(Boolean),
          },
        });
        onSaved(editingAgentId);
      } else {
        const agentId = await createAgent({
          sessionId, organizationId, name, displayName, subtype, personality, language,
          brandVoiceInstructions: brandVoice, systemPrompt, autonomyLevel,
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

  const openAgentBuilder = () => {
    openWindow("builder-browser", "Agent Setup Wizard", null, { x: 80, y: 40 }, { width: 1100, height: 750 }, undefined, "🤖", { initialSetupMode: true });
  };

  const sections: Array<{ id: FormSection; label: string }> = [
    { id: "identity", label: "Identity" },
    { id: "knowledge", label: "Knowledge" },
    { id: "model", label: "Model" },
    { id: "guardrails", label: "Guardrails" },
    { id: "channels", label: "Channels" },
  ];

  return (
    <div className="flex h-full">
      {/* Section nav */}
      <div className="w-40 border-r-2 p-2 flex-shrink-0" style={{ borderColor: "var(--win95-border)" }}>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs mb-3 hover:underline"
          style={{ color: "var(--win95-highlight, #000080)" }}
        >
          <ArrowLeft size={12} /> Back
        </button>

        {!editingAgentId && (
          <button
            onClick={openAgentBuilder}
            className="flex items-center gap-1 w-full px-2 py-1.5 mb-3 text-[10px] font-medium border hover:brightness-110"
            style={{ background: "var(--win95-highlight)", borderColor: "var(--win95-border)", color: "white" }}
          >
            <Sparkles size={10} />
            AI Setup Wizard
          </button>
        )}

        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setFormSection(s.id)}
            className="w-full text-left text-xs px-2 py-1.5 flex items-center gap-1"
            style={{
              background: formSection === s.id ? "var(--win95-highlight, #000080)" : "transparent",
              color: formSection === s.id ? "#fff" : "var(--win95-text)",
            }}
          >
            <ChevronRight size={10} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
          {editingAgentId ? "Edit Agent" : "Create Agent"}
        </h3>

        {formSection === "identity" && (
          <div className="space-y-3">
            <FormField label="Name *" value={name} onChange={setName} placeholder="My Support Agent" />
            <FormField label="Display Name" value={displayName} onChange={setDisplayName} placeholder="How the agent introduces itself" />
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Type</label>
              <select value={subtype} onChange={(e) => setSubtype(e.target.value)}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}>
                {SUBTYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <FormField label="Personality" value={personality} onChange={setPersonality} multiline placeholder="Friendly, professional, concise..." />
            <FormField label="Language" value={language} onChange={setLanguage} placeholder="en" />
            <FormField label="Brand Voice" value={brandVoice} onChange={setBrandVoice} multiline placeholder="Tone and style guidelines..." />
          </div>
        )}

        {formSection === "knowledge" && (
          <div className="space-y-3">
            <FormField label="System Prompt" value={systemPrompt} onChange={setSystemPrompt} multiline rows={8} placeholder="Additional instructions..." />
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              FAQ entries and knowledge base docs can be managed after creation.
            </p>
          </div>
        )}

        {formSection === "model" && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Model</label>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}>
                {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
                Temperature: {temperature}
              </label>
              <input type="range" min={0} max={1} step={0.1} value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
              <div className="flex justify-between text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                <span>Precise (0)</span><span>Creative (1)</span>
              </div>
            </div>
          </div>
        )}

        {formSection === "guardrails" && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Autonomy Level</label>
              <select value={autonomyLevel} onChange={(e) => setAutonomyLevel(e.target.value as typeof autonomyLevel)}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}>
                <option value="supervised">Supervised (all actions need approval)</option>
                <option value="autonomous">Autonomous (acts within guardrails)</option>
                <option value="draft_only">Draft Only (read-only, no actions)</option>
              </select>
            </div>
            <FormField label="Max Messages / Day" value={String(maxMsgsPerDay)} onChange={(v) => setMaxMsgsPerDay(parseInt(v) || 100)} />
            <FormField label="Max Cost / Day ($)" value={String(maxCostPerDay)} onChange={(v) => setMaxCostPerDay(parseFloat(v) || 5)} />
            <FormField label="Blocked Topics" value={blockedTopics} onChange={setBlockedTopics} placeholder="competitors, pricing, legal advice" />
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Comma-separated list of topics the agent should avoid.</p>
          </div>
        )}

        {formSection === "channels" && (
          <div className="space-y-3">
            <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
              Enable channels this agent should respond on.
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#dcfce7", color: "#166534" }}>
                      via {providerBinding.providerId}
                    </span>
                  )}
                  {!providerBinding && binding.channel !== "api" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>
                      no provider
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
            className="flex items-center gap-1.5 px-4 py-1.5 border-2 text-xs font-medium disabled:opacity-50"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
            <Save size={12} />
            {saving ? "Saving..." : editingAgentId ? "Update Agent" : "Create Agent"}
          </button>
          <button onClick={onCancel}
            className="px-4 py-1.5 border-2 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
