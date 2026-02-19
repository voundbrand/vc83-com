"use client";

/**
 * Agent tools configuration tab.
 * Toggle which tools the agent can use + autonomy settings.
 */

import { useState, useMemo } from "react";
import { Save } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentCustomProps } from "./types";

interface AgentToolsConfigProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

// Static category mapping for tool grouping
const TOOL_CATEGORIES: Record<string, string> = {
  search_contacts: "CRM", create_contact: "CRM", manage_bookings: "CRM",
  query_org_data: "Data", list_products: "Data", list_forms: "Data", list_events: "Data",
  tag_in_specialist: "Team", list_team_agents: "Team",
  escalate_to_parent: "Coordination", delegate_to_child: "Coordination", share_insight_upward: "Coordination",
  transcribe_audio: "Media", analyze_image: "Media", parse_document: "Media", download_media: "Media",
  create_client_org: "Scale", list_client_orgs: "Scale", get_client_org_stats: "Scale", deploy_telegram_bot: "Scale",
  propose_soul_update: "Soul", review_own_soul: "Soul", view_pending_proposals: "Soul",
  request_feature: "Meta", check_oauth_connection: "Meta",
  create_web_app: "Builder", deploy_web_app: "Builder", check_deploy_status: "Builder",
  detect_web_app_connections: "Builder", connect_web_app_data: "Builder",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AgentToolsConfig({ agentId, sessionId, organizationId }: AgentToolsConfigProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = useQuery(api.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;
  const updateAgent = useMutation(api.agentOntology.updateAgent);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = useQuery((api.ai.tools as any).registry.getToolList, { sessionId }) as any[] | undefined;

  const props = (agent?.customProperties || {}) as AgentCustomProps;
  const [disabledTools, setDisabledTools] = useState<string[]>(props.disabledTools || []);
  const [autonomyLevel, setAutonomyLevel] = useState(props.autonomyLevel || "supervised");
  const [maxMsgsPerDay, setMaxMsgsPerDay] = useState(props.maxMessagesPerDay || 100);
  const [maxCostPerDay, setMaxCostPerDay] = useState(props.maxCostPerDay || 5);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (agent && !initialized) {
    const p = (agent.customProperties || {}) as AgentCustomProps;
    setDisabledTools(p.disabledTools || []);
    setAutonomyLevel(p.autonomyLevel || "supervised");
    setMaxMsgsPerDay(p.maxMessagesPerDay || 100);
    setMaxCostPerDay(p.maxCostPerDay || 5);
    setInitialized(true);
  }

  // Group tools by category
  const grouped = useMemo(() => {
    if (!tools) return {};
    const groups: Record<string, typeof tools> = {};
    for (const tool of tools) {
      const category = TOOL_CATEGORIES[tool.key] || "General";
      if (!groups[category]) groups[category] = [];
      groups[category].push(tool);
    }
    return groups;
  }, [tools]);

  const toggleTool = (toolKey: string) => {
    setDisabledTools((prev) =>
      prev.includes(toolKey) ? prev.filter((k) => k !== toolKey) : [...prev, toolKey]
    );
  };

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await updateAgent({
        sessionId,
        agentId,
        updates: {
          disabledTools,
          autonomyLevel,
          maxMessagesPerDay: maxMsgsPerDay,
          maxCostPerDay: maxCostPerDay,
        },
      });
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

      {/* Tool toggles by category */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          Available Tools ({tools.length})
        </h4>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryTools]) => (
          <div key={category} className="mb-3">
            <h5 className="text-[11px] font-medium mb-1 px-1 py-0.5"
              style={{ background: "var(--win95-bg-dark, #e0e0e0)", color: "var(--win95-text)" }}>
              {category} ({categoryTools.length})
            </h5>
            <div className="space-y-0.5">
              {categoryTools.map((tool) => (
                <label key={tool.key} className="flex items-center gap-2 text-[11px] py-0.5 px-1 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox"
                    checked={!disabledTools.includes(tool.key)}
                    onChange={() => toggleTool(tool.key)} />
                  <span style={{ color: "var(--win95-text)" }}>{tool.name}</span>
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
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 border-2 text-xs font-medium disabled:opacity-50"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
        <Save size={12} />
        {saving ? "Saving..." : "Save Tools Config"}
      </button>
    </div>
  );
}
