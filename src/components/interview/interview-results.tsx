"use client";

/**
 * INTERVIEW RESULTS
 *
 * Displays extracted Content DNA after interview completion.
 * Shows data organized by category (voice, expertise, audience, etc.)
 * and renders trust artifacts used by Brain/Setup/Agents/Admin surfaces.
 */

import { useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../convex/_generated/dataModel";
import {
  User,
  Target,
  MessageSquare,
  Lightbulb,
  Palette,
  Flag,
  Loader2,
  Download,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  Users2,
  Activity,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

interface InterviewResultsProps {
  contentDNAId: Id<"objects">;
  onClose?: () => void;
  className?: string;
}

interface TrustArtifactEntry {
  fieldId: string;
  label: string;
  valuePreview: string;
  phaseId: string;
  phaseName: string;
  questionId: string;
  questionPrompt: string;
}

interface TrustArtifactCard {
  cardId: "soul_card" | "guardrails_card" | "team_charter";
  title: string;
  summary: string;
  identityAnchors: TrustArtifactEntry[];
  guardrails: TrustArtifactEntry[];
  handoffBoundaries: TrustArtifactEntry[];
  driftCues: TrustArtifactEntry[];
}

interface MemoryLedgerArtifactCard {
  cardId: "memory_ledger";
  title: string;
  summary: string;
  identityAnchors: TrustArtifactEntry[];
  guardrails: TrustArtifactEntry[];
  handoffBoundaries: TrustArtifactEntry[];
  driftCues: TrustArtifactEntry[];
  consentScope: string;
  consentDecision: "accepted";
  consentPromptVersion: string;
  ledgerEntries: TrustArtifactEntry[];
}

interface TrustArtifactsBundle {
  version: string;
  generatedAt: number;
  sourceTemplateName: string;
  soulCard: TrustArtifactCard;
  guardrailsCard: TrustArtifactCard;
  teamCharter: TrustArtifactCard;
  memoryLedger: MemoryLedgerArtifactCard;
}

interface VoiceConsentSourceAttributionEntry {
  fieldId: string;
  phaseId: string;
  phaseName: string;
  questionId: string;
  questionPrompt: string;
  valuePreview: string;
}

interface VoiceConsentSummary {
  channel: string;
  voiceCaptureMode: "voice_enabled";
  activeCheckpointId: string;
  providerFallbackPolicy: string;
  sourceAttributionPolicy: string;
  sourceAttributionCount: number;
  sourceAttributionPreview: VoiceConsentSourceAttributionEntry[];
  memoryCandidateCount: number;
}

const CATEGORY_CONFIG = {
  voice: {
    icon: MessageSquare,
    label: "Voice & Tone",
    headerClass: "bg-violet-900/20",
    iconClass: "text-violet-400",
  },
  expertise: {
    icon: Lightbulb,
    label: "Expertise",
    headerClass: "bg-blue-900/20",
    iconClass: "text-blue-400",
  },
  audience: {
    icon: Target,
    label: "Target Audience",
    headerClass: "bg-green-900/20",
    iconClass: "text-green-400",
  },
  content_prefs: {
    icon: Palette,
    label: "Content Preferences",
    headerClass: "bg-orange-900/20",
    iconClass: "text-orange-400",
  },
  brand: {
    icon: User,
    label: "Brand Identity",
    headerClass: "bg-pink-900/20",
    iconClass: "text-pink-400",
  },
  goals: {
    icon: Flag,
    label: "Goals",
    headerClass: "bg-yellow-900/20",
    iconClass: "text-yellow-400",
  },
} as const;

const TRUST_CARD_CONFIG = {
  soul_card: { icon: Activity, label: "Soul Card" },
  guardrails_card: { icon: ShieldCheck, label: "Guardrails Card" },
  team_charter: { icon: Users2, label: "Team Charter" },
  memory_ledger: { icon: BookOpen, label: "Memory Ledger" },
} as const;

function isMemoryLedgerCard(
  card: TrustArtifactCard | MemoryLedgerArtifactCard,
): card is MemoryLedgerArtifactCard {
  return card.cardId === "memory_ledger";
}

function ArtifactSection({
  title,
  entries,
}: {
  title: string;
  entries: TrustArtifactEntry[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No entries</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={`${entry.phaseId}:${entry.questionId}:${entry.fieldId}`} className="rounded bg-slate-900/70 p-2">
              <p className="text-sm text-slate-200">{entry.valuePreview}</p>
              <p className="text-xs text-slate-500 mt-1">
                {entry.phaseName} • {entry.questionId}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InterviewResults({ contentDNAId, onClose, className = "" }: InterviewResultsProps) {
  const [copied, setCopied] = useState(false);
  const useQueryAny = useQuery as any;

  const contentDNA = useQueryAny(
    (api as any).ontologyHelpers.getObject,
    { objectId: contentDNAId },
  ) as any;

  if (!contentDNA) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        <span className="ml-2 text-slate-400">Loading Content DNA...</span>
      </div>
    );
  }

  if (contentDNA.type !== "content_profile") {
    return (
      <div className={`p-6 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-slate-300">Invalid content profile</p>
      </div>
    );
  }

  const props = contentDNA.customProperties as {
    extractedData: Record<string, unknown>;
    schema?: { fields: Array<{ fieldId: string; category: string; fieldName: string }> };
    extractedAt?: number;
    sourceTemplateId?: string;
    trustArtifacts?: TrustArtifactsBundle;
    voiceConsentSummary?: VoiceConsentSummary;
  };

  const extractedData = props?.extractedData || {};
  const schema = props?.schema;
  const trustArtifacts = props?.trustArtifacts;
  const voiceConsentSummary = props?.voiceConsentSummary;

  const categorizedData: Record<string, Array<{ key: string; value: unknown; label: string }>> = {};

  if (schema?.fields) {
    for (const field of schema.fields) {
      const value = extractedData[field.fieldId];
      if (value !== undefined && value !== null && value !== "") {
        if (!categorizedData[field.category]) categorizedData[field.category] = [];
        categorizedData[field.category].push({ key: field.fieldId, value, label: field.fieldName });
      }
    }
  } else {
    for (const [key, value] of Object.entries(extractedData)) {
      if (value !== undefined && value !== null && value !== "") {
        if (!categorizedData.general) categorizedData.general = [];
        categorizedData.general.push({ key, value, label: key.replace(/_/g, " ") });
      }
    }
  }

  const trustCards: Array<TrustArtifactCard | MemoryLedgerArtifactCard> =
    trustArtifacts
      ? [
          trustArtifacts.soulCard,
          trustArtifacts.guardrailsCard,
          trustArtifacts.teamCharter,
          trustArtifacts.memoryLedger,
        ]
      : [];

  const exportPayload = {
    extractedData,
    schema: schema || null,
    sourceTemplateId: props?.sourceTemplateId || null,
    extractedAt: props?.extractedAt || null,
    trustArtifacts: trustArtifacts || null,
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-dna-trust-${contentDNAId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{contentDNA.name}</h2>
            <p className="text-sm text-slate-500">
              {props?.extractedAt && new Date(props.extractedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400"
              title="Copy JSON"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleExport}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400"
              title="Download JSON"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {trustArtifacts && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="font-medium text-slate-100">Trust Artifacts</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Version {trustArtifacts.version} • Template: {trustArtifacts.sourceTemplateName}
                </p>
              </div>
              {voiceConsentSummary && (
                <div className="px-4 pt-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Voice Consent Summary</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Channel: {voiceConsentSummary.channel} • Active checkpoint: {voiceConsentSummary.activeCheckpointId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{voiceConsentSummary.sourceAttributionPolicy}</p>
                    <p className="mt-1 text-xs text-slate-500">{voiceConsentSummary.providerFallbackPolicy}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Source-attributed candidates: {voiceConsentSummary.sourceAttributionCount}
                    </p>
                    {voiceConsentSummary.sourceAttributionPreview.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {voiceConsentSummary.sourceAttributionPreview.map((entry) => (
                          <p
                            key={`voice-consent:${entry.phaseId}:${entry.questionId}:${entry.fieldId}`}
                            className="text-xs text-slate-500"
                          >
                            {entry.phaseName} • {entry.questionId} • {entry.fieldId}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {trustCards.map((card) => {
                  const config = TRUST_CARD_CONFIG[card.cardId];
                  const Icon = config.icon;

                  return (
                    <div key={card.cardId} className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-violet-300" />
                        <h4 className="text-sm font-medium text-slate-100">{config.label}</h4>
                      </div>
                      <p className="text-sm text-slate-400">{card.summary}</p>

                      <ArtifactSection title="Identity Anchors" entries={card.identityAnchors} />
                      <ArtifactSection title="Guardrails" entries={card.guardrails} />
                      <ArtifactSection title="Handoff Boundaries" entries={card.handoffBoundaries} />
                      <ArtifactSection title="Drift Cues" entries={card.driftCues} />

                      {isMemoryLedgerCard(card) && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Ledger Entries</p>
                          <p className="text-xs text-slate-500 mb-2">
                            Consent: {card.consentDecision} ({card.consentScope})
                          </p>
                          <div className="space-y-2">
                            {card.ledgerEntries.slice(0, 8).map((entry) => (
                              <div
                                key={`ledger:${entry.phaseId}:${entry.questionId}:${entry.fieldId}`}
                                className="rounded bg-slate-900/70 p-2"
                              >
                                <p className="text-sm text-slate-200">{entry.valuePreview}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {entry.phaseName} • {entry.questionId}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.entries(categorizedData).map(([category, fields]) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
              icon: Lightbulb,
              label: category.replace(/_/g, " "),
              headerClass: "bg-slate-900/20",
              iconClass: "text-slate-400",
            };
            const Icon = config.icon;

            return (
              <div key={category} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className={`px-4 py-3 ${config.headerClass} border-b border-slate-700`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.iconClass}`} />
                    <h3 className="font-medium text-slate-200 capitalize">{config.label}</h3>
                    <span className="ml-auto text-xs text-slate-500">{fields.length} fields</span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {fields.map(({ key, value, label }) => (
                    <div key={key}>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                      <div className="text-slate-200">
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-2">
                            {value.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-700 rounded text-sm">
                                {String(item)}
                              </span>
                            ))}
                          </div>
                        ) : typeof value === "object" ? (
                          <pre className="text-sm bg-slate-900 rounded p-2 overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm">{String(value)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onClose && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewResults;
