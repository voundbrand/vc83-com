"use client";

/**
 * INTERVIEW RESULTS
 *
 * Displays extracted Content DNA after interview completion.
 * Shows data organized by category (voice, expertise, audience, etc.)
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
} from "lucide-react";
import { useState } from "react";

interface InterviewResultsProps {
  contentDNAId: Id<"objects">;
  onClose?: () => void;
  className?: string;
}

const CATEGORY_CONFIG = {
  voice: { icon: MessageSquare, label: "Voice & Tone", color: "purple" },
  expertise: { icon: Lightbulb, label: "Expertise", color: "blue" },
  audience: { icon: Target, label: "Target Audience", color: "green" },
  content_prefs: { icon: Palette, label: "Content Preferences", color: "orange" },
  brand: { icon: User, label: "Brand Identity", color: "pink" },
  goals: { icon: Flag, label: "Goals", color: "yellow" },
} as const;

export function InterviewResults({ contentDNAId, onClose, className = "" }: InterviewResultsProps) {
  const [copied, setCopied] = useState(false);

  const contentDNA = useQuery(api.ontologyHelpers.getObject, { objectId: contentDNAId });

  if (!contentDNA) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-zinc-400">Loading Content DNA...</span>
      </div>
    );
  }

  if (contentDNA.type !== "content_profile") {
    return (
      <div className={`p-6 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-zinc-300">Invalid content profile</p>
      </div>
    );
  }

  const props = contentDNA.customProperties as {
    extractedData: Record<string, unknown>;
    schema?: { fields: Array<{ fieldId: string; category: string; fieldName: string }> };
    extractedAt?: number;
  };

  const extractedData = props?.extractedData || {};
  const schema = props?.schema;

  // Group data by category
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
    // Fallback: show all data under "general"
    for (const [key, value] of Object.entries(extractedData)) {
      if (value !== undefined && value !== null && value !== "") {
        if (!categorizedData.general) categorizedData.general = [];
        categorizedData.general.push({ key, value, label: key.replace(/_/g, " ") });
      }
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-dna-${contentDNAId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-700 bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{contentDNA.name}</h2>
            <p className="text-sm text-zinc-500">
              {props?.extractedAt && new Date(props.extractedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-400"
              title="Copy JSON"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleExport}
              className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-400"
              title="Download JSON"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {Object.entries(categorizedData).map(([category, fields]) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
              icon: Lightbulb,
              label: category.replace(/_/g, " "),
              color: "zinc",
            };
            const Icon = config.icon;

            return (
              <div key={category} className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                <div className={`px-4 py-3 bg-${config.color}-900/20 border-b border-zinc-700`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 text-${config.color}-400`} />
                    <h3 className="font-medium text-zinc-200 capitalize">{config.label}</h3>
                    <span className="ml-auto text-xs text-zinc-500">{fields.length} fields</span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {fields.map(({ key, value, label }) => (
                    <div key={key}>
                      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
                      <div className="text-zinc-200">
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-2">
                            {value.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-zinc-700 rounded text-sm">
                                {String(item)}
                              </span>
                            ))}
                          </div>
                        ) : typeof value === "object" ? (
                          <pre className="text-sm bg-zinc-900 rounded p-2 overflow-x-auto">
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

      {/* Footer */}
      {onClose && (
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewResults;
