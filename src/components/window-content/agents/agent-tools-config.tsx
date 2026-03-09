"use client";

/**
 * Agent tools configuration tab.
 * Toggle which tools the agent can use + autonomy settings.
 */

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  type AgentCustomProps,
  evaluateTemplateOverrideGate,
  resolveTemplateFieldOverrideMode,
  resolveTemplateLineage,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

interface AgentToolsConfigProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

interface ToolListItem {
  key: string;
  name: string;
  description?: string;
  status: string;
  readOnly?: boolean;
}

const TOOL_PROFILE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general", label: "General" },
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "booking", label: "Booking" },
  { value: "personal_operator", label: "Personal Operator" },
  { value: "readonly", label: "Readonly" },
  { value: "admin", label: "Admin (all tools)" },
];

// Static category mapping for tool grouping
const TOOL_CATEGORIES: Record<string, string> = {
  search_contacts: "CRM", create_contact: "CRM", manage_bookings: "CRM",
  query_org_data: "Data", list_products: "Data", list_forms: "Data", list_events: "Data",
  tag_in_specialist: "Team", list_team_agents: "Team",
  escalate_to_parent: "Coordination", delegate_to_child: "Coordination", share_insight_upward: "Coordination",
  transcribe_audio: "Media", analyze_image: "Media", parse_document: "Media", download_media: "Media",
  create_client_org: "Scale", list_client_orgs: "Scale", get_client_org_stats: "Scale", deploy_telegram_bot: "Scale",
  propose_soul_update: "Soul", review_own_soul: "Soul", view_pending_proposals: "Soul",
  request_feature: "Meta", check_oauth_connection: "Meta", start_slack_workspace_connect: "Meta",
  create_web_app: "Builder", deploy_web_app: "Builder", check_deploy_status: "Builder",
  detect_web_app_connections: "Builder", connect_web_app_data: "Builder",
  run_platform_productivity_loop: "Platform", run_eval_analyst_checks: "Platform",
  platform_soul_admin: "Soul Admin",
};

function normalizeOptionalToken(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDeterministicToolKeys(values: string[] | undefined): string[] {
  const deduped = new Set<string>();
  for (const value of values || []) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    deduped.add(trimmed);
  }
  return Array.from(deduped).sort((a, b) => a.localeCompare(b));
}

function humanizeToken(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AgentToolsConfig({ agentId, sessionId, organizationId }: AgentToolsConfigProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = useQuery(apiAny.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;
  const updateAgent = useMutation(apiAny.agentOntology.updateAgent);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = useQuery((apiAny.ai.tools as any).registry.getToolList, { sessionId }) as ToolListItem[] | undefined;

  const props = (agent?.customProperties || {}) as AgentCustomProps;
  const templateLineage = resolveTemplateLineage(props);
  const toolProfilePolicyMode = resolveTemplateFieldOverrideMode(props, "toolProfile");
  const enabledToolsPolicyMode = resolveTemplateFieldOverrideMode(props, "enabledTools");
  const disabledToolsPolicyMode = resolveTemplateFieldOverrideMode(props, "disabledTools");
  const [toolProfile, setToolProfile] = useState<string>(normalizeOptionalToken(props.toolProfile) || "");
  const [enabledTools, setEnabledTools] = useState<string[]>(normalizeDeterministicToolKeys(props.enabledTools));
  const [disabledTools, setDisabledTools] = useState<string[]>(normalizeDeterministicToolKeys(props.disabledTools));
  const [autonomyLevel, setAutonomyLevel] = useState(props.autonomyLevel || "supervised");
  const [maxMsgsPerDay, setMaxMsgsPerDay] = useState(props.maxMessagesPerDay || 100);
  const [maxCostPerDay, setMaxCostPerDay] = useState(props.maxCostPerDay || 5);
  const [toolScopeFilter, setToolScopeFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [overrideWarnConfirmed, setOverrideWarnConfirmed] = useState(false);
  const [overrideWarnReason, setOverrideWarnReason] = useState("");
  const [policyGateMessage, setPolicyGateMessage] = useState<string | null>(null);
  const [lastInitializedAgentId, setLastInitializedAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) {
      return;
    }
    const currentAgentId = String(agent._id || agentId);
    if (currentAgentId === lastInitializedAgentId) {
      return;
    }
    const nextProps = (agent.customProperties || {}) as AgentCustomProps;
    setToolProfile(normalizeOptionalToken(nextProps.toolProfile) || "");
    setEnabledTools(normalizeDeterministicToolKeys(nextProps.enabledTools));
    setDisabledTools(normalizeDeterministicToolKeys(nextProps.disabledTools));
    setAutonomyLevel(nextProps.autonomyLevel || "supervised");
    setMaxMsgsPerDay(nextProps.maxMessagesPerDay || 100);
    setMaxCostPerDay(nextProps.maxCostPerDay || 5);
    setToolScopeFilter("");
    setOverrideWarnConfirmed(false);
    setOverrideWarnReason("");
    setPolicyGateMessage(null);
    setLastInitializedAgentId(currentAgentId);
  }, [agent, agentId, lastInitializedAgentId]);

  // Group tools by category
  const grouped = useMemo<Record<string, ToolListItem[]>>(() => {
    if (!tools) return {};
    const groups: Record<string, ToolListItem[]> = {};
    const sortedTools = [...tools].sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      return byName !== 0 ? byName : a.key.localeCompare(b.key);
    });
    for (const tool of sortedTools) {
      const category = TOOL_CATEGORIES[tool.key] || "General";
      if (!groups[category]) groups[category] = [];
      groups[category].push(tool);
    }
    return groups;
  }, [tools]);

  const filteredScopeGroups = useMemo<Record<string, ToolListItem[]>>(() => {
    if (!tools) return {};
    const query = toolScopeFilter.trim().toLowerCase();
    const groups: Record<string, ToolListItem[]> = {};
    for (const tool of tools) {
      const category = TOOL_CATEGORIES[tool.key] || "General";
      if (query) {
        const haystack = `${tool.name} ${tool.key} ${category}`.toLowerCase();
        if (!haystack.includes(query)) {
          continue;
        }
      }
      if (!groups[category]) groups[category] = [];
      groups[category].push(tool);
    }
    for (const category of Object.keys(groups)) {
      groups[category] = groups[category].sort((a, b) => {
        const byName = a.name.localeCompare(b.name);
        return byName !== 0 ? byName : a.key.localeCompare(b.key);
      });
    }
    return groups;
  }, [tools, toolScopeFilter]);

  const toggleToolAvailability = (toolKey: string) => {
    setDisabledTools((prev) =>
      normalizeDeterministicToolKeys(
        prev.includes(toolKey) ? prev.filter((k) => k !== toolKey) : [...prev, toolKey]
      )
    );
  };

  const toggleEnabledTool = (toolKey: string) => {
    setEnabledTools((prev) =>
      normalizeDeterministicToolKeys(
        prev.includes(toolKey) ? prev.filter((k) => k !== toolKey) : [...prev, toolKey]
      )
    );
  };

  const toolNameByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const tool of tools || []) {
      map.set(tool.key, tool.name);
    }
    return map;
  }, [tools]);

  const conflictingTools = useMemo(() => {
    const enabledSet = new Set(enabledTools);
    return normalizeDeterministicToolKeys(
      disabledTools.filter((toolKey) => enabledSet.has(toolKey))
    );
  }, [enabledTools, disabledTools]);

  const toolProfileOptions = useMemo(() => {
    if (!toolProfile) {
      return TOOL_PROFILE_OPTIONS;
    }
    if (TOOL_PROFILE_OPTIONS.some((option) => option.value === toolProfile)) {
      return TOOL_PROFILE_OPTIONS;
    }
    return [
      ...TOOL_PROFILE_OPTIONS,
      {
        value: toolProfile,
        label: `Custom (${humanizeToken(toolProfile)})`,
      },
    ];
  }, [toolProfile]);

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const normalizedEnabledTools = normalizeDeterministicToolKeys(enabledTools);
      const normalizedDisabledTools = normalizeDeterministicToolKeys(disabledTools);
      const normalizedToolProfile = normalizeOptionalToken(toolProfile);
      const overrideGate = evaluateTemplateOverrideGate(props, {
        toolProfile: normalizedToolProfile,
        enabledTools: normalizedEnabledTools,
        disabledTools: normalizedDisabledTools,
        autonomyLevel,
      });
      if (overrideGate.lockedFields.length > 0) {
        setPolicyGateMessage(
          `Template lock: edits blocked for ${overrideGate.lockedFields.join(", ")}.`
        );
        return;
      }
      if (overrideGate.warnFields.length > 0) {
        const normalizedReason = overrideWarnReason.trim();
        if (!overrideWarnConfirmed || normalizedReason.length === 0) {
          setPolicyGateMessage(
            `Template warning: confirm override and provide reason for ${overrideGate.warnFields.join(", ")}.`
          );
          return;
        }
      }
      setPolicyGateMessage(null);

      await updateAgent({
        sessionId,
        agentId,
        updates: {
          ...(normalizedToolProfile ? { toolProfile: normalizedToolProfile } : {}),
          enabledTools: normalizedEnabledTools,
          disabledTools: normalizedDisabledTools,
          autonomyLevel,
          maxMessagesPerDay: maxMsgsPerDay,
          maxCostPerDay: maxCostPerDay,
        },
        ...(overrideGate.warnFields.length > 0
          ? {
              overridePolicyGate: {
                confirmWarnOverride: true,
                reason: overrideWarnReason.trim(),
              },
            }
          : {}),
      });
      setEnabledTools(normalizedEnabledTools);
      setDisabledTools(normalizedDisabledTools);
      setOverrideWarnConfirmed(false);
      setOverrideWarnReason("");
    } catch (e) {
      console.error("Failed to save tools config:", e);
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    ready: "#22c55e",
    beta: "#f59e0b",
    placeholder: "#9ca3af",
  };

  if (!agent || !tools) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {templateLineage.isTemplateLinked && (
        <div
          className="border-2 p-2 text-[11px] space-y-1"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
        >
          <p style={{ color: "var(--win95-text)", fontWeight: 700 }}>Template Lineage</p>
          <p style={{ color: "var(--neutral-gray)" }}>
            Source template: {templateLineage.sourceTemplateId || "n/a"}
          </p>
          <p style={{ color: "var(--neutral-gray)" }}>
            Source version: {templateLineage.sourceTemplateVersion || "n/a"}
          </p>
          <p style={{ color: "var(--neutral-gray)" }}>
            Lifecycle: {(templateLineage.cloneLifecycleState || "legacy_unmanaged").replace(/_/g, " ")}
          </p>
          {templateLineage.overridePolicyMode && (
            <p
              style={{
                color:
                  templateLineage.overridePolicyMode === "locked"
                    ? "#dc2626"
                    : templateLineage.overridePolicyMode === "warn"
                      ? "#f59e0b"
                      : "#22c55e",
              }}
            >
              Override policy: {templateLineage.overridePolicyMode}
            </p>
          )}
        </div>
      )}

      {/* Tool scope */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Tool Scope
        </h4>
        <div className="space-y-2">
          <div>
            <label
              htmlFor="tool-profile"
              className="text-[11px] font-medium block mb-1"
              style={{ color: "var(--win95-text)" }}
            >
              Tool profile
            </label>
            {toolProfilePolicyMode && (
              <p
                className="text-[10px] mb-1"
                style={{
                  color:
                    toolProfilePolicyMode === "locked"
                      ? "#dc2626"
                      : toolProfilePolicyMode === "warn"
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              >
                Template override mode: {toolProfilePolicyMode}
              </p>
            )}
            <select
              id="tool-profile"
              value={toolProfile}
              onChange={(event) => setToolProfile(event.target.value)}
              className="w-full border-2 px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
            >
              <option value="">Use backend default profile</option>
              {toolProfileOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              Leave unset to keep current backend default behavior for this agent.
            </p>
          </div>

          <div>
            <label
              htmlFor="enabled-tools-filter"
              className="text-[11px] font-medium block mb-1"
              style={{ color: "var(--win95-text)" }}
            >
              Enabled tools allowlist
            </label>
            {enabledToolsPolicyMode && (
              <p
                className="text-[10px] mb-1"
                style={{
                  color:
                    enabledToolsPolicyMode === "locked"
                      ? "#dc2626"
                      : enabledToolsPolicyMode === "warn"
                        ? "#f59e0b"
                        : "#22c55e",
                }}
              >
                Template override mode: {enabledToolsPolicyMode}
              </p>
            )}
            <input
              id="enabled-tools-filter"
              type="text"
              value={toolScopeFilter}
              onChange={(event) => setToolScopeFilter(event.target.value)}
              placeholder="Filter by name, key, or category"
              className="w-full border-2 px-2 py-1 text-xs mb-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
            />
            {Object.keys(filteredScopeGroups).length === 0 ? (
              <div
                className="text-[11px] border-2 px-2 py-2"
                style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}
              >
                No tools match this filter.
              </div>
            ) : (
              <div
                className="border-2 p-2 space-y-2 max-h-56 overflow-y-auto"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
              >
                {Object.entries(filteredScopeGroups)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, categoryTools]) => (
                    <div key={category}>
                      <h5 className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--neutral-gray)" }}>
                        {category}
                      </h5>
                      <div className="space-y-0.5">
                        {categoryTools.map((tool) => {
                          const allowlisted = enabledTools.includes(tool.key);
                          const disabled = disabledTools.includes(tool.key);
                          return (
                            <label
                              key={`enabled-${tool.key}`}
                              className="flex items-center gap-2 text-xs py-0.5 px-1 cursor-pointer transition-opacity hover:opacity-80"
                            >
                              <input
                                type="checkbox"
                                checked={allowlisted}
                                aria-label={`Allowlist ${tool.name} (${tool.key})`}
                                onChange={() => toggleEnabledTool(tool.key)}
                              />
                              <span style={{ color: "var(--win95-text)" }}>{tool.name}</span>
                              <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>{tool.key}</span>
                              {disabled && (
                                <span className="text-[9px] px-1 py-0.5 border ml-auto" style={{ borderColor: "var(--warning)", color: "var(--warning)" }}>
                                  disabled
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
              {enabledTools.length === 0
                ? "No explicit allowlist (profile/default scoping applies)"
                : "Allowlist active: only listed tools can be executed (subject to profile + disabled tools)."}
            </p>
          </div>

          {conflictingTools.length > 0 && (
            <div
              className="border-2 px-2 py-1.5 text-[10px]"
              style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
            >
              Conflict detected: these tools are both allowlisted and disabled. Disabled always wins.
              {" "}
              {conflictingTools.map((toolKey) => toolNameByKey.get(toolKey) || toolKey).join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Autonomy level */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Autonomy Level</h4>
        {(["supervised", "autonomous", "draft_only"] as const).map((level) => (
          <label key={level} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
            <input type="radio" name="autonomy" checked={autonomyLevel === level}
              onChange={() => setAutonomyLevel(level)} />
            <span style={{ color: "var(--win95-text)" }}>
              {level === "supervised" && "Supervised — all actions need approval"}
              {level === "autonomous" && "Autonomous — acts within guardrails"}
              {level === "draft_only" && "Draft Only — read-only, no actions"}
            </span>
          </label>
        ))}
      </div>

      {/* Rate limits */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Rate Limits</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Max msgs/day</label>
            <input type="number" value={maxMsgsPerDay} onChange={(e) => setMaxMsgsPerDay(parseInt(e.target.value) || 100)}
              className="w-full border-2 px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }} />
          </div>
          <div>
            <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Max cost/day ($)</label>
            <input type="number" value={maxCostPerDay} step="0.5" onChange={(e) => setMaxCostPerDay(parseFloat(e.target.value) || 5)}
              className="w-full border-2 px-2 py-1 text-xs"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }} />
          </div>
        </div>
      </div>

      {/* Tool availability toggles by category */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Available Tools ({tools.length})
        </h4>
        {disabledToolsPolicyMode && (
          <p
            className="text-[10px] mb-1"
            style={{
              color:
                disabledToolsPolicyMode === "locked"
                  ? "#dc2626"
                  : disabledToolsPolicyMode === "warn"
                    ? "#f59e0b"
                    : "#22c55e",
            }}
          >
            Template override mode: {disabledToolsPolicyMode}
          </p>
        )}
        <p className="text-[10px] mb-2" style={{ color: "var(--neutral-gray)" }}>
          Checked means available. Unchecked adds the tool to the disabled list.
        </p>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryTools]) => (
          <div key={category} className="mb-3">
            <h5 className="text-[11px] font-medium mb-1 px-1 py-0.5"
              style={{ background: "var(--win95-bg-dark, #e0e0e0)", color: "var(--win95-text)" }}>
              {category} ({categoryTools.length})
            </h5>
            <div className="space-y-0.5">
              {categoryTools.map((tool) => (
                <label key={tool.key} className="flex items-center gap-2 text-xs py-0.5 px-1 cursor-pointer transition-opacity hover:opacity-80">
                  <input type="checkbox"
                    checked={!disabledTools.includes(tool.key)}
                    aria-label={`Available ${tool.name} (${tool.key})`}
                    onChange={() => toggleToolAvailability(tool.key)} />
                  <span style={{ color: "var(--win95-text)" }}>{tool.name}</span>
                  <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>{tool.key}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded font-medium text-white ml-auto"
                    style={{ background: statusColors[tool.status] || "#9ca3af" }}>
                    {tool.status}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <div>
        {policyGateMessage && (
          <div
            className="border-2 px-2 py-1.5 text-[10px] mb-2"
            style={{ borderColor: "#dc2626", color: "#dc2626" }}
          >
            {policyGateMessage}
          </div>
        )}
        {templateLineage.isTemplateLinked && templateLineage.overridePolicyMode === "warn" && (
          <div
            className="border-2 px-2 py-2 text-[10px] mb-2 space-y-2"
            style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
          >
            <p>Warn policy overrides require confirmation and reason.</p>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={overrideWarnConfirmed}
                onChange={(event) => setOverrideWarnConfirmed(event.target.checked)}
                aria-label="Confirm warn policy override"
              />
              <span>I confirm this warn override.</span>
            </label>
            <div>
              <label htmlFor="tools-override-reason" className="block mb-1">
                Override reason
              </label>
              <input
                id="tools-override-reason"
                value={overrideWarnReason}
                onChange={(event) => setOverrideWarnReason(event.target.value)}
                className="w-full border-2 px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)", color: "var(--win95-text)" }}
                placeholder="Explain why this org-level override is needed"
              />
            </div>
          </div>
        )}
        <p className="text-[10px] mb-2" style={{ color: "var(--neutral-gray)" }}>
          Precedence on save/runtime: tool profile baseline, then enabled allowlist when present, then disabled tools (disabled always wins).
        </p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 border-2 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
          <Save size={12} />
          {saving ? "Saving..." : "Save Tools Config"}
        </button>
      </div>
    </div>
  );
}
