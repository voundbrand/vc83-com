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
import { isPlatformManagedL2Soul } from "./platform-soul-scope";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Use require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

interface AgentSoulEditorProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function AgentSoulEditor({ agentId, sessionId, organizationId }: AgentSoulEditorProps) {
  const { t } = useNamespaceTranslations("ui.agents.soul_editor");
  const tx = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const agent = useQuery(api.agentOntology.getAgent, { sessionId, agentId });
  const updateAgent = useMutation(api.agentOntology.updateAgent);
  const approveSoul = useMutation(api.ai.soulEvolution.approveSoulProposalAuth);
  const rejectSoul = useMutation(api.ai.soulEvolution.rejectSoulProposalAuth);
  const agentCustomProperties =
    (agent?.customProperties as Record<string, unknown> | undefined) ?? undefined;
  const isPlatformManagedSoul = isPlatformManagedL2Soul(agentCustomProperties);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals = useQuery(
    api.ai.soulEvolution.getSoulProposals,
    agent
      ? (isPlatformManagedSoul
          ? "skip"
          : {
              sessionId,
              organizationId,
              agentId,
              status: "pending",
            })
      : "skip"
  ) as any[] | undefined;
  const platformSoulAdminCapability = useQuery(
    api.ai.platformSoulAdmin.getPlatformSoulAdminCapability,
    { sessionId, agentId }
  ) as {
    allowed: boolean;
    denialReason: string | null;
    actions: Array<{ action: string; allowed: boolean; reason: string }>;
    target: {
      layer: string | null;
      domain: string | null;
      classification: string | null;
      scopePresent: boolean;
    };
  } | undefined;

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
    return (
      <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>
        {tx("loading", "Loading...")}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Identity section */}
      <Section title={tx("sections.identity", "Identity")}>
        <FormField
          label={tx("identity.soul_name.label", "Soul Name")}
          value={soulName}
          onChange={setSoulName}
          placeholder={tx("identity.soul_name.placeholder", "How the agent thinks of itself")}
        />
        <FormField
          label={tx("identity.tagline.label", "Tagline")}
          value={tagline}
          onChange={setTagline}
          placeholder={tx("identity.tagline.placeholder", "One-liner about the agent")}
        />
      </Section>

      {/* Personality */}
      <Section title={tx("sections.personality_voice", "Personality & Voice")}>
        <FormField
          label={tx("personality.personality.label", "Personality")}
          value={personality}
          onChange={setPersonality}
          multiline
          placeholder={tx("personality.personality.placeholder", "Core personality traits...")}
        />
        <FormField
          label={tx("personality.brand_voice.label", "Brand Voice")}
          value={brandVoice}
          onChange={setBrandVoice}
          multiline
          placeholder={tx("personality.brand_voice.placeholder", "Tone and style guidelines...")}
        />
        <FormField
          label={tx("personality.communication_style.label", "Communication Style")}
          value={communicationStyle}
          onChange={setCommunicationStyle}
          multiline
          placeholder={tx("personality.communication_style.placeholder", "How the agent communicates...")}
        />
        <div>
          <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--win95-text)" }}>
            {tx("personality.emoji_usage.label", "Emoji Usage")}
          </label>
          <select
            value={emojiUsage}
            onChange={(e) => setEmojiUsage(e.target.value)}
            className="w-full border-2 px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
          >
            <option value="none">{tx("personality.emoji_usage.none", "None")}</option>
            <option value="minimal">{tx("personality.emoji_usage.minimal", "Minimal")}</option>
            <option value="moderate">{tx("personality.emoji_usage.moderate", "Moderate")}</option>
            <option value="expressive">{tx("personality.emoji_usage.expressive", "Expressive")}</option>
          </select>
        </div>
      </Section>

      {/* Rules */}
      <Section title={tx("sections.rules", "Rules")}>
        <FormField
          label={tx("rules.always_do.label", "Always Do (one per line)")}
          value={alwaysDo}
          onChange={setAlwaysDo}
          multiline
          rows={4}
          placeholder={tx(
            "rules.always_do.placeholder",
            "Greet customers by name\nConfirm understanding before acting"
          )}
        />
        <FormField
          label={tx("rules.never_do.label", "Never Do (one per line)")}
          value={neverDo}
          onChange={setNeverDo}
          multiline
          rows={4}
          placeholder={tx(
            "rules.never_do.placeholder",
            "Discuss competitor products\nMake promises about delivery dates"
          )}
        />
      </Section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 border-2 text-xs font-medium disabled:opacity-50"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", color: "var(--win95-text)" }}
      >
        <Save size={12} />
        {saving ? tx("actions.saving", "Saving...") : tx("actions.save_soul", "Save Soul")}
      </button>

      {/* Soul version info */}
      {soul.version && (
        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          {tx("version.prefix", "Soul v")}
          {soul.version} {tx("version.last_updated", "· Last updated")}{" "}
          {soul.lastUpdatedAt
            ? new Date(soul.lastUpdatedAt).toLocaleDateString()
            : tx("version.never", "never")}{" "}
          {tx("version.by", "by")} {soul.lastUpdatedBy || tx("version.owner_fallback", "owner")}
        </div>
      )}

      {/* Pending proposals */}
      {proposals && proposals.length > 0 && (
        <Section
          title={`${tx("sections.pending_proposals", "Pending Proposals")} (${proposals.length})`}
        >
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

      {platformSoulAdminCapability && (
        <Section title={tx("sections.platform_soul_admin_matrix", "Platform Soul Admin Matrix")}>
          <div
            className="border p-3 space-y-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            <div className="text-xs" style={{ color: "var(--win95-text)" }}>
              {tx("platform_matrix.scope", "Scope:")} {tx("platform_matrix.layer", "layer=")}
              {platformSoulAdminCapability.target.layer || tx("platform_matrix.unknown", "unknown")}
              {", "}
              {tx("platform_matrix.domain", "domain=")}
              {platformSoulAdminCapability.target.domain || tx("platform_matrix.unknown", "unknown")}
              {", "}
              {tx("platform_matrix.classification", "classification=")}
              {platformSoulAdminCapability.target.classification || tx("platform_matrix.unknown", "unknown")}
            </div>
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx("platform_matrix.access", "Access:")}{" "}
              {platformSoulAdminCapability.allowed
                ? tx("platform_matrix.allowed", "ALLOWED")
                : tx("platform_matrix.denied", "DENIED")}
            </div>
            {!platformSoulAdminCapability.allowed && platformSoulAdminCapability.denialReason && (
              <div className="text-xs" style={{ color: "var(--error)" }}>
                {platformSoulAdminCapability.denialReason}
              </div>
            )}
            <div className="space-y-1">
              {platformSoulAdminCapability.actions.map((entry) => (
                <div key={entry.action} className="flex items-center justify-between text-xs">
                  <span style={{ color: "var(--win95-text)" }}>{entry.action}</span>
                  <span
                    className="px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: entry.allowed ? "var(--success-bg)" : "var(--error-bg)",
                      color: entry.allowed ? "var(--success)" : "var(--error)",
                    }}
                  >
                    {entry.allowed ? tx("platform_matrix.pass", "PASS") : tx("platform_matrix.fail", "FAIL")}
                  </span>
                </div>
              ))}
            </div>
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
  const { t } = useNamespaceTranslations("ui.agents.soul_editor");
  const tx = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const typeLabels: Record<string, string> = {
    add: tx("proposal.type.add", "ADD"),
    modify: tx("proposal.type.modify", "CHANGE"),
    remove: tx("proposal.type.remove", "REMOVE"),
    add_faq: tx("proposal.type.add_faq", "ADD FAQ"),
  };
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
          {tx("proposal.currently", "Currently:")} {tx("proposal.quote", '"')}
          {proposal.currentValue}
          {tx("proposal.quote", '"')}
        </div>
      )}
      <div className="text-xs mb-1" style={{ color: "var(--win95-text)" }}>
        {tx("proposal.arrow", "→")} {tx("proposal.quote", '"')}
        {proposal.proposedValue}
        {tx("proposal.quote", '"')}
      </div>
      <div className="text-[10px] mb-2 italic" style={{ color: "var(--neutral-gray)" }}>
        {proposal.reason}
      </div>
      <div className="flex gap-2">
        <button onClick={onApprove}
          className="flex items-center gap-1 px-2 py-1 border text-[10px] bg-green-50 hover:bg-green-100"
          style={{ borderColor: "var(--win95-border)" }}>
          <CheckCircle size={10} className="text-green-600" /> {tx("proposal.approve", "Approve")}
        </button>
        <button onClick={onReject}
          className="flex items-center gap-1 px-2 py-1 border text-[10px] bg-red-50 hover:bg-red-100"
          style={{ borderColor: "var(--win95-border)" }}>
          <XCircle size={10} className="text-red-600" /> {tx("proposal.reject", "Reject")}
        </button>
      </div>
    </div>
  );
}
