"use client";

/**
 * Soul editor tab — edit agent personality, review evolution proposals.
 */

import { useState } from "react";
import { Save, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentCustomProps } from "./types";
import { FormField } from "./form-field";

// Use require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

interface AgentSoulEditorProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function AgentSoulEditor({ agentId, sessionId, organizationId }: AgentSoulEditorProps) {
  const agent = useQuery(api.agentOntology.getAgent, { sessionId, agentId });
  const updateAgent = useMutation(api.agentOntology.updateAgent);
  const approveSoul = useMutation(api.ai.soulEvolution.approveSoulProposalAuth);
  const rejectSoul = useMutation(api.ai.soulEvolution.rejectSoulProposalAuth);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals = useQuery(api.ai.soulEvolution.getSoulProposals, {
    sessionId, organizationId, agentId, status: "pending",
  }) as any[] | undefined;

  const props = (agent?.customProperties || {}) as AgentCustomProps;
  const soul = props.soul || {};

  const [personality, setPersonality] = useState(props.personality || "");
  const [brandVoice, setBrandVoice] = useState(props.brandVoiceInstructions || "");
  const [soulName, setSoulName] = useState(soul.name || "");
  const [tagline, setTagline] = useState(soul.tagline || "");
  const [communicationStyle, setCommunicationStyle] = useState(soul.communicationStyle || "");
  const [alwaysDo, setAlwaysDo] = useState((soul.alwaysDo || []).join("\n"));
  const [neverDo, setNeverDo] = useState((soul.neverDo || []).join("\n"));
  const [emojiUsage, setEmojiUsage] = useState(soul.emojiUsage || "minimal");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Re-init when agent loads
  if (agent && !initialized) {
    const p = (agent.customProperties || {}) as AgentCustomProps;
    const s = p.soul || {};
    setPersonality(p.personality || "");
    setBrandVoice(p.brandVoiceInstructions || "");
    setSoulName(s.name || "");
    setTagline(s.tagline || "");
    setCommunicationStyle(s.communicationStyle || "");
    setAlwaysDo((s.alwaysDo || []).join("\n"));
    setNeverDo((s.neverDo || []).join("\n"));
    setEmojiUsage(s.emojiUsage || "minimal");
    setInitialized(true);
  }

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await updateAgent({
        sessionId,
        agentId,
        updates: {
          personality,
          brandVoiceInstructions: brandVoice,
          soul: {
            ...soul,
            name: soulName || agent.name || "Agent",
            tagline,
            traits: soul.traits || [],
            communicationStyle,
            alwaysDo: alwaysDo.split("\n").map((s: string) => s.trim()).filter(Boolean),
            neverDo: neverDo.split("\n").map((s: string) => s.trim()).filter(Boolean),
            emojiUsage,
          },
        },
      });
    } catch (e) {
      console.error("Failed to save soul:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!agent) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Identity section */}
      <Section title="Identity">
        <FormField label="Soul Name" value={soulName} onChange={setSoulName} placeholder="How the agent thinks of itself" />
        <FormField label="Tagline" value={tagline} onChange={setTagline} placeholder="One-liner about the agent" />
      </Section>

      {/* Personality */}
      <Section title="Personality & Voice">
        <FormField label="Personality" value={personality} onChange={setPersonality} multiline placeholder="Core personality traits..." />
        <FormField label="Brand Voice" value={brandVoice} onChange={setBrandVoice} multiline placeholder="Tone and style guidelines..." />
        <FormField label="Communication Style" value={communicationStyle} onChange={setCommunicationStyle} multiline placeholder="How the agent communicates..." />
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>Emoji Usage</label>
          <select value={emojiUsage} onChange={(e) => setEmojiUsage(e.target.value)}
            className="w-full border-2 px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}>
            <option value="none">None</option>
            <option value="minimal">Minimal</option>
            <option value="moderate">Moderate</option>
            <option value="expressive">Expressive</option>
          </select>
        </div>
      </Section>

      {/* Rules */}
      <Section title="Rules">
        <FormField label="Always Do (one per line)" value={alwaysDo} onChange={setAlwaysDo} multiline rows={4} placeholder="Greet customers by name&#10;Confirm understanding before acting" />
        <FormField label="Never Do (one per line)" value={neverDo} onChange={setNeverDo} multiline rows={4} placeholder="Discuss competitor products&#10;Make promises about delivery dates" />
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 border-2 text-xs font-medium disabled:opacity-50"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}>
        <Save size={12} />
        {saving ? "Saving..." : "Save Soul"}
      </button>

      {/* Soul version info */}
      {soul.version && (
        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          Soul v{soul.version} · Last updated {soul.lastUpdatedAt ? new Date(soul.lastUpdatedAt).toLocaleDateString() : "never"} by {soul.lastUpdatedBy || "owner"}
        </div>
      )}

      {/* Pending proposals */}
      {proposals && proposals.length > 0 && (
        <Section title={`Pending Proposals (${proposals.length})`}>
          <div className="space-y-2">
            {proposals.map((p) => (
              <ProposalCard
                key={p._id}
                proposal={p}
                onApprove={() => approveSoul({ sessionId, proposalId: p._id })}
                onReject={() => rejectSoul({ sessionId, proposalId: p._id })}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// Section wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 mb-2 text-xs font-bold" style={{ color: "var(--win95-text)" }}>
        {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        {title}
      </button>
      {open && <div className="space-y-2 pl-1">{children}</div>}
    </div>
  );
}

// Proposal card
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProposalCard({ proposal, onApprove, onReject }: { proposal: any; onApprove: () => void; onReject: () => void }) {
  const typeLabels: Record<string, string> = { add: "ADD", modify: "CHANGE", remove: "REMOVE", add_faq: "ADD FAQ" };
  const typeColors: Record<string, string> = { add: "#22c55e", modify: "#3b82f6", remove: "#ef4444", add_faq: "#8b5cf6" };

  return (
    <div className="border-2 p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
          style={{ background: typeColors[proposal.proposalType] || "#6b7280" }}>
          {typeLabels[proposal.proposalType] || proposal.proposalType}
        </span>
        <span className="text-[11px] font-medium" style={{ color: "var(--win95-text)" }}>
          {proposal.targetField}
        </span>
      </div>
      {proposal.currentValue && (
        <div className="text-[10px] mb-1" style={{ color: "var(--neutral-gray)" }}>
          Currently: &quot;{proposal.currentValue}&quot;
        </div>
      )}
      <div className="text-xs mb-1" style={{ color: "var(--win95-text)" }}>
        &rarr; &quot;{proposal.proposedValue}&quot;
      </div>
      <div className="text-[10px] mb-2 italic" style={{ color: "var(--neutral-gray)" }}>
        {proposal.reason}
      </div>
      <div className="flex gap-2">
        <button onClick={onApprove}
          className="flex items-center gap-1 px-2 py-1 border text-[10px] bg-green-50 hover:bg-green-100"
          style={{ borderColor: "var(--win95-border)" }}>
          <CheckCircle size={10} className="text-green-600" /> Approve
        </button>
        <button onClick={onReject}
          className="flex items-center gap-1 px-2 py-1 border text-[10px] bg-red-50 hover:bg-red-100"
          style={{ borderColor: "var(--win95-border)" }}>
          <XCircle size={10} className="text-red-600" /> Reject
        </button>
      </div>
    </div>
  );
}
