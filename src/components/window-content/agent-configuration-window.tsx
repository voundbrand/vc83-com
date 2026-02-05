"use client";

import { useState } from "react";
import {
  Bot,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  Shield,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Eye,
  ChevronRight,
  Save,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useWindowManager } from "@/hooks/use-window-manager";
import { CreditWall } from "@/components/credit-wall";
import { CreditBalance } from "@/components/credit-balance";
import type { Id } from "../../../convex/_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

type TabType = "agents" | "create" | "activity" | "approvals";

interface AgentCustomProps {
  displayName?: string;
  personality?: string;
  language?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel?: "supervised" | "autonomous" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  requireApprovalFor?: string[];
  blockedTopics?: string[];
  modelProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  totalMessages?: number;
  totalCostUsd?: number;
}

const SUBTYPES = [
  { value: "customer_support", label: "Customer Support" },
  { value: "sales_assistant", label: "Sales Assistant" },
  { value: "booking_agent", label: "Booking Agent" },
  { value: "general", label: "General" },
];

const CHANNELS = [
  "whatsapp", "email", "webchat", "sms", "api",
  "instagram", "facebook_messenger", "telegram",
];

const MODELS = [
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgentConfigurationWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState<TabType>("agents");
  const [editingAgentId, setEditingAgentId] = useState<Id<"objects"> | null>(null);

  // Credit balance check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creditBalance = useQuery(
    (api as any).credits.index.getCreditBalance,
    currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as {
    totalCredits: number;
    dailyCredits: number;
    monthlyCredits: number;
    monthlyCreditsTotal: number;
    purchasedCredits: number;
    planTier?: string;
  } | null | undefined;
  const hasZeroCredits = creditBalance !== undefined && creditBalance !== null && creditBalance.totalCredits <= 0;
  const isUnlimited = creditBalance?.monthlyCreditsTotal === -1;
  const hasLowCredits = !hasZeroCredits && !isUnlimited && creditBalance != null
    && creditBalance.monthlyCreditsTotal > 0
    && (creditBalance.totalCredits / creditBalance.monthlyCreditsTotal) < 0.2;

  if (!currentOrg || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--win95-bg)" }}>
        <p className="text-sm" style={{ color: "var(--win95-text)" }}>
          Sign in and select an organization to manage agents.
        </p>
      </div>
    );
  }

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "agents", label: "Agents", icon: <Bot size={14} /> },
    { id: "create", label: editingAgentId ? "Edit Agent" : "Create Agent", icon: <Plus size={14} /> },
    { id: "activity", label: "Activity", icon: <Activity size={14} /> },
    { id: "approvals", label: "Approvals", icon: <Shield size={14} /> },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      {/* Tab Bar */}
      <div className="flex items-center border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== "create") setEditingAgentId(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-r transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: activeTab === tab.id ? "var(--win95-bg)" : "var(--win95-bg-dark, #c0c0c0)",
                color: "var(--win95-text)",
                borderBottom: activeTab === tab.id ? "2px solid var(--win95-bg)" : "none",
                marginBottom: activeTab === tab.id ? "-2px" : "0",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {creditBalance && !hasZeroCredits && (
          <div className="px-3">
            <CreditBalance
              dailyCredits={creditBalance.dailyCredits}
              monthlyCredits={creditBalance.monthlyCredits}
              monthlyCreditsTotal={creditBalance.monthlyCreditsTotal}
              purchasedCredits={creditBalance.purchasedCredits}
              totalCredits={creditBalance.totalCredits}
              isUnlimited={isUnlimited}
              variant="compact"
            />
          </div>
        )}
      </div>

      {/* Credit Warning */}
      {hasZeroCredits && (
        <CreditWall
          currentTier={creditBalance?.planTier || "free"}
          creditsAvailable={0}
        />
      )}
      {hasLowCredits && creditBalance && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs border-b-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--warning-bg, #fff3cd)",
            color: "var(--warning, #856404)",
          }}
        >
          <span>Credits running low ({creditBalance.totalCredits} remaining of {creditBalance.monthlyCreditsTotal} monthly). Agents may stop responding when credits run out.</span>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "agents" && (
          <AgentsListTab
            sessionId={sessionId}
            organizationId={currentOrg.id as Id<"organizations">}
            onEdit={(id) => {
              setEditingAgentId(id);
              setActiveTab("create");
            }}
          />
        )}
        {activeTab === "create" && (
          <AgentFormTab
            sessionId={sessionId}
            organizationId={currentOrg.id as Id<"organizations">}
            editingAgentId={editingAgentId}
            onSaved={() => {
              setEditingAgentId(null);
              setActiveTab("agents");
            }}
            onCancel={() => {
              setEditingAgentId(null);
              setActiveTab("agents");
            }}
          />
        )}
        {activeTab === "activity" && (
          <ActivityTab
            sessionId={sessionId}
            organizationId={currentOrg.id as Id<"organizations">}
          />
        )}
        {activeTab === "approvals" && (
          <ApprovalsTab
            sessionId={sessionId}
            organizationId={currentOrg.id as Id<"organizations">}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AGENTS LIST TAB
// ============================================================================

function AgentsListTab({
  sessionId,
  organizationId,
  onEdit,
}: {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (id: Id<"objects">) => void;
}) {
  const { openWindow } = useWindowManager();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = useQuery(api.agentOntology.getAgents, { sessionId, organizationId }) as any[] | undefined;
  const activateAgent = useMutation(api.agentOntology.activateAgent);
  const pauseAgent = useMutation(api.agentOntology.pauseAgent);
  const deleteAgent = useMutation(api.agentOntology.deleteAgent);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAgentBuilder = () => { openWindow("builder-browser", "Agent Setup Wizard", null, { x: 80, y: 40 }, { width: 1100, height: 750 }, undefined, "🤖", { initialSetupMode: true }); };
  if (!agents) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading agents...</div>;
  }

  if (agents.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bot size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm font-medium mb-2" style={{ color: "var(--win95-text)" }}>
          No agents configured
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          Create your first AI agent to start handling customer conversations automatically.
        </p>
        <button
          onClick={openAgentBuilder}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium mx-auto border-2 hover:brightness-110 transition-all"
          style={{
            background: "var(--win95-highlight)",
            borderColor: "var(--win95-border)",
            color: "white",
          }}
        >
          <Sparkles size={14} />
          New Agent (AI Setup)
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header with New Agent button */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: "var(--neutral-gray)" }}>
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={openAgentBuilder}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border hover:brightness-110 transition-all"
          style={{
            background: "var(--win95-highlight)",
            borderColor: "var(--win95-border)",
            color: "white",
          }}
        >
          <Sparkles size={12} />
          New Agent
        </button>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => {
          const props = (agent.customProperties || {}) as AgentCustomProps;
          const isDeleting = confirmDelete === agent._id;

          return (
            <div
              key={agent._id}
              className="border-2 p-3 flex items-center gap-3"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light, #fff)",
              }}
            >
              {/* Status indicator */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background:
                    agent.status === "active" ? "#22c55e" :
                    agent.status === "draft" ? "#eab308" :
                    agent.status === "paused" ? "#ef4444" : "#9ca3af",
                }}
              />

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: "var(--win95-text)" }}>
                    {agent.name}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--win95-bg)",
                      color: "var(--neutral-gray)",
                    }}
                  >
                    {agent.subtype}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                  <span>{props.autonomyLevel || "supervised"}</span>
                  <span>{props.modelId?.split("/").pop() || "claude-sonnet-4"}</span>
                  <span>{props.totalMessages || 0} msgs</span>
                  <span>${(props.totalCostUsd || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {agent.status === "active" ? (
                  <button
                    onClick={() => pauseAgent({ sessionId, agentId: agent._id })}
                    className="p-1.5 border hover:bg-yellow-50"
                    style={{ borderColor: "var(--win95-border)" }}
                    title="Pause agent"
                  >
                    <Pause size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => activateAgent({ sessionId, agentId: agent._id })}
                    className="p-1.5 border hover:bg-green-50"
                    style={{ borderColor: "var(--win95-border)" }}
                    title="Activate agent"
                  >
                    <Play size={12} />
                  </button>
                )}

                <button
                  onClick={() => onEdit(agent._id)}
                  className="p-1.5 border hover:bg-blue-50"
                  style={{ borderColor: "var(--win95-border)" }}
                  title="Edit agent"
                >
                  <Settings size={12} />
                </button>

                {isDeleting ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        deleteAgent({ sessionId, agentId: agent._id });
                        setConfirmDelete(null);
                      }}
                      className="p-1.5 border bg-red-100 hover:bg-red-200 text-red-600"
                      style={{ borderColor: "var(--win95-border)" }}
                      title="Confirm delete"
                    >
                      <CheckCircle size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="p-1.5 border hover:bg-gray-50"
                      style={{ borderColor: "var(--win95-border)" }}
                      title="Cancel"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(agent._id)}
                    className="p-1.5 border hover:bg-red-50"
                    style={{ borderColor: "var(--win95-border)" }}
                    title="Delete agent"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// AGENT FORM TAB (Create / Edit)
// ============================================================================

function AgentFormTab({
  sessionId,
  organizationId,
  editingAgentId,
  onSaved,
  onCancel,
}: {
  sessionId: string;
  organizationId: Id<"organizations">;
  editingAgentId: Id<"objects"> | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const existingAgent = useQuery(
    api.agentOntology.getAgent,
    editingAgentId ? { sessionId, agentId: editingAgentId } : "skip"
  );

  // Query configured channel providers for this org (require() to avoid TS2589)
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
  const channelApi = (require("../../../convex/_generated/api") as { api: any }).api;
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
  const [formSection, setFormSection] = useState<"identity" | "knowledge" | "model" | "guardrails" | "channels">("identity");
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
            name,
            displayName,
            subtype,
            personality,
            language,
            brandVoiceInstructions: brandVoice,
            systemPrompt,
            autonomyLevel,
            maxMessagesPerDay: maxMsgsPerDay,
            maxCostPerDay: maxCostPerDay,
            modelId,
            temperature,
            channelBindings,
            blockedTopics: blockedTopics.split(",").map((t) => t.trim()).filter(Boolean),
          },
        });
      } else {
        await createAgent({
          sessionId,
          organizationId,
          name,
          displayName,
          subtype,
          personality,
          language,
          brandVoiceInstructions: brandVoice,
          systemPrompt,
          autonomyLevel,
          maxMessagesPerDay: maxMsgsPerDay,
          maxCostPerDay: maxCostPerDay,
          modelId,
          temperature,
          channelBindings,
          blockedTopics: blockedTopics.split(",").map((t) => t.trim()).filter(Boolean),
        });
      }
      onSaved();
    } catch (e) {
      console.error("Failed to save agent:", e);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "identity" as const, label: "Identity" },
    { id: "knowledge" as const, label: "Knowledge" },
    { id: "model" as const, label: "Model" },
    { id: "guardrails" as const, label: "Guardrails" },
    { id: "channels" as const, label: "Channels" },
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
          <ArrowLeft size={12} /> Back to list
        </button>
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
        {formSection === "identity" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>Agent Identity</h3>
            <FormField label="Name *" value={name} onChange={setName} placeholder="My Support Agent" />
            <FormField label="Display Name" value={displayName} onChange={setDisplayName} placeholder="How the agent introduces itself" />
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Type</label>
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
              >
                {SUBTYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <FormField label="Personality" value={personality} onChange={setPersonality} multiline placeholder="Friendly, professional, concise..." />
            <FormField label="Language" value={language} onChange={setLanguage} placeholder="en" />
            <FormField label="Brand Voice" value={brandVoice} onChange={setBrandVoice} multiline placeholder="Tone and style guidelines..." />
          </div>
        )}

        {formSection === "knowledge" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>Knowledge Base</h3>
            <FormField
              label="System Prompt"
              value={systemPrompt}
              onChange={setSystemPrompt}
              multiline
              rows={8}
              placeholder="Additional instructions for the agent..."
            />
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              FAQ entries and training data can be managed in the AI System settings.
            </p>
          </div>
        )}

        {formSection === "model" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>Model Configuration</h3>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Model</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>
          </div>
        )}

        {formSection === "guardrails" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>Guardrails & Autonomy</h3>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Autonomy Level</label>
              <select
                value={autonomyLevel}
                onChange={(e) => setAutonomyLevel(e.target.value as "supervised" | "autonomous" | "draft_only")}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
              >
                <option value="supervised">Supervised (all actions need approval)</option>
                <option value="autonomous">Autonomous (acts within guardrails)</option>
                <option value="draft_only">Draft Only (read-only, no actions)</option>
              </select>
            </div>
            <FormField
              label="Max Messages / Day"
              value={String(maxMsgsPerDay)}
              onChange={(v) => setMaxMsgsPerDay(parseInt(v) || 100)}
              placeholder="100"
            />
            <FormField
              label="Max Cost / Day ($)"
              value={String(maxCostPerDay)}
              onChange={(v) => setMaxCostPerDay(parseFloat(v) || 5)}
              placeholder="5.00"
            />
            <FormField
              label="Blocked Topics"
              value={blockedTopics}
              onChange={setBlockedTopics}
              placeholder="competitors, pricing details, legal advice"
            />
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              Comma-separated list of topics the agent should avoid.
            </p>
          </div>
        )}

        {formSection === "channels" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>Channel Bindings</h3>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
              Enable the channels this agent should respond on. Channels marked with a provider
              are connected through Integrations.
            </p>
            {channelBindings.map((binding, idx) => {
              const providerBinding = configuredChannels?.find(
                (c) => c.channel === binding.channel
              );
              const hasProvider = !!providerBinding;
              const channelLabel =
                binding.channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

              return (
                <label
                  key={binding.channel}
                  className="flex items-center gap-2 text-xs cursor-pointer py-1"
                >
                  <input
                    type="checkbox"
                    checked={binding.enabled}
                    onChange={(e) => {
                      const updated = [...channelBindings];
                      updated[idx] = { ...binding, enabled: e.target.checked };
                      setChannelBindings(updated);
                    }}
                  />
                  <span style={{ color: "var(--win95-text)" }}>{channelLabel}</span>
                  {hasProvider && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "#dcfce7",
                        color: "#166534",
                      }}
                    >
                      via {providerBinding.providerId}
                    </span>
                  )}
                  {!hasProvider && binding.channel !== "api" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                      }}
                    >
                      no provider
                    </span>
                  )}
                </label>
              );
            })}
            {configuredChannels && configuredChannels.length === 0 && (
              <p
                className="text-[10px] mt-2 p-2 border"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "#fefce8",
                  color: "#854d0e",
                }}
              >
                No channel providers configured yet. Set up Chatwoot or ManyChat in
                Integrations to enable outbound messaging.
              </p>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="mt-6 pt-3 border-t-2 flex gap-2" style={{ borderColor: "var(--win95-border)" }}>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 border-2 text-xs font-medium disabled:opacity-50"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          >
            <Save size={12} />
            {saving ? "Saving..." : editingAgentId ? "Update Agent" : "Create Agent"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 border-2 text-xs"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY TAB
// ============================================================================

function ActivityTab({
  sessionId,
  organizationId,
}: {
  sessionId: string;
  organizationId: Id<"organizations">;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = useQuery(api.ai.agentSessions.getActiveSessions, {
    sessionId,
    organizationId,
  }) as any[] | undefined;

  if (!sessions) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm font-medium mb-2" style={{ color: "var(--win95-text)" }}>
          No active sessions
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Sessions will appear here when your agent starts handling conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session._id}
            className="border-2 p-3"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light, #fff)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} />
                <span className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                  {session.channel} - {session.externalContactIdentifier}
                </span>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: session.status === "active" ? "#dcfce7" : "#f3f4f6",
                  color: session.status === "active" ? "#166534" : "#6b7280",
                }}
              >
                {session.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              <span>{session.messageCount} messages</span>
              <span>{session.tokensUsed.toLocaleString()} tokens</span>
              <span>${session.costUsd.toFixed(4)}</span>
              <span>{new Date(session.lastMessageAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// APPROVALS TAB
// ============================================================================

function ApprovalsTab({
  sessionId,
  organizationId,
}: {
  sessionId: string;
  organizationId: Id<"organizations">;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvals = useQuery(api.ai.agentApprovals.getPendingApprovals, {
    sessionId,
    organizationId,
  }) as any[] | undefined;
  const approveAction = useMutation(api.ai.agentApprovals.approveAction);
  const rejectAction = useMutation(api.ai.agentApprovals.rejectAction);

  if (!approvals) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading approvals...</div>;
  }

  if (approvals.length === 0) {
    return (
      <div className="p-8 text-center">
        <Shield size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm font-medium mb-2" style={{ color: "var(--win95-text)" }}>
          No pending approvals
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          When agents in supervised mode want to take actions, they will appear here for your review.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {approvals.map((approval) => {
          const props = (approval.customProperties || {}) as Record<string, unknown>;
          return (
            <div
              key={approval._id}
              className="border-2 p-3"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light, #fff)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-yellow-600" />
                  <span className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                    {String(props.actionType || "Unknown action")}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                  {new Date(approval.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Payload preview */}
              {!!props.actionPayload && (
                <pre
                  className="text-[10px] p-2 mb-2 overflow-x-auto border"
                  style={{
                    background: "var(--win95-bg)",
                    borderColor: "var(--win95-border)",
                    color: "var(--win95-text)",
                    maxHeight: "100px",
                  }}
                >
                  {JSON.stringify(props.actionPayload, null, 2)}
                </pre>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => approveAction({ sessionId, approvalId: approval._id })}
                  className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-green-50 hover:bg-green-100"
                  style={{ borderColor: "var(--win95-border)" }}
                >
                  <CheckCircle size={12} className="text-green-600" />
                  Approve
                </button>
                <button
                  onClick={() => rejectAction({ sessionId, approvalId: approval._id })}
                  className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-red-50 hover:bg-red-100"
                  style={{ borderColor: "var(--win95-border)" }}
                >
                  <XCircle size={12} className="text-red-600" />
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SHARED FORM FIELD COMPONENT
// ============================================================================

function FormField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const style = {
    borderColor: "var(--win95-border)",
    background: "var(--win95-bg-light, #fff)",
    color: "var(--win95-text)",
  };

  return (
    <div>
      <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          className="w-full border-2 px-2 py-1 text-xs resize-y"
          style={style}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-2 px-2 py-1 text-xs"
          style={style}
        />
      )}
    </div>
  );
}
