"use client";

/**
 * ENV VARS SECTION
 *
 * Shared collapsible environment variables UI used by:
 * - Publish dropdown (deployed + not-deployed states)
 * - Connection panel (connected step)
 *
 * Shows platform env vars and codebase-detected vars with
 * eye toggle, per-var copy, copy-all, and scrollable list.
 */

import { useState } from "react";
import {
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

export interface EnvVar {
  key: string;
  value: string;
  description: string;
  sensitive: boolean;
  source: "platform" | "codebase";
  required: boolean;
}

interface EnvVarsSectionProps {
  envVars: EnvVar[];
  /** Externally controlled open state (optional — uses internal state if not provided) */
  showEnvVars?: boolean;
  setShowEnvVars?: (v: boolean) => void;
  showEnvValues?: boolean;
  setShowEnvValues?: (v: boolean) => void;
  copiedField?: string | null;
  copyToClipboard?: (text: string, field: string) => void;
  /** Compact styling for deployed card context */
  compact?: boolean;
  /** Footer hint text (defaults to Vercel message) */
  footerHint?: string;
}

export function EnvVarsSection({
  envVars,
  showEnvVars: externalShowEnvVars,
  setShowEnvVars: externalSetShowEnvVars,
  showEnvValues: externalShowEnvValues,
  setShowEnvValues: externalSetShowEnvValues,
  copiedField: externalCopiedField,
  copyToClipboard: externalCopyToClipboard,
  compact,
  footerHint,
}: EnvVarsSectionProps) {
  // Internal state fallbacks
  const [internalShowEnvVars, setInternalShowEnvVars] = useState(false);
  const [internalShowEnvValues, setInternalShowEnvValues] = useState(false);
  const [internalCopiedField, setInternalCopiedField] = useState<string | null>(null);

  const showEnvVars = externalShowEnvVars ?? internalShowEnvVars;
  const setShowEnvVars = externalSetShowEnvVars ?? setInternalShowEnvVars;
  const showEnvValues = externalShowEnvValues ?? internalShowEnvValues;
  const setShowEnvValues = externalSetShowEnvValues ?? setInternalShowEnvValues;
  const copiedField = externalCopiedField ?? internalCopiedField;
  const copyToClipboard = externalCopyToClipboard ?? ((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setInternalCopiedField(field);
    setTimeout(() => setInternalCopiedField(null), 2000);
  });

  const platformVars = envVars.filter((v) => v.source === "platform");
  const codebaseVars = envVars.filter((v) => v.source === "codebase");

  return (
    <div className={compact ? "mt-2" : "mb-3"}>
      <button
        onClick={() => setShowEnvVars(!showEnvVars)}
        className={`w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-800/50 ${
          compact ? "px-3 py-2" : "px-2 py-1.5"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Key className="w-3 h-3" />
          Environment Variables ({envVars.length})
        </span>
        {showEnvVars ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
      {showEnvVars && (
        <div className="mt-1.5 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/80 border-b border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              Required for Vercel
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEnvValues(!showEnvValues)}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-500"
                title={showEnvValues ? "Hide values" : "Show values"}
              >
                {showEnvValues ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => {
                  const envText = envVars
                    .map((v) => `${v.key}=${v.value}`)
                    .join("\n");
                  copyToClipboard(envText, "allEnv");
                }}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-500"
                title="Copy all env vars"
              >
                {copiedField === "allEnv" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/50">
            {/* Platform env vars */}
            {platformVars.map((envVar) => (
              <EnvVarRow
                key={envVar.key}
                envVar={envVar}
                showValue={showEnvValues}
                copiedField={copiedField}
                copyToClipboard={copyToClipboard}
              />
            ))}
            {/* Codebase-detected env vars */}
            {codebaseVars.length > 0 && (
              <>
                <div className="px-2.5 py-1 bg-zinc-900/60">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-medium">
                    Detected from codebase
                  </span>
                </div>
                {codebaseVars.map((envVar) => (
                  <EnvVarRow
                    key={envVar.key}
                    envVar={envVar}
                    showValue={showEnvValues}
                    copiedField={copiedField}
                    copyToClipboard={copyToClipboard}
                  />
                ))}
              </>
            )}
          </div>
          <div className="px-2.5 py-1.5 bg-zinc-900/30 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600">
              {footerHint || "Enter these in Vercel\u0027s \"Environment Variables\" step during deployment."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EnvVarRow({
  envVar,
  showValue,
  copiedField,
  copyToClipboard,
}: {
  envVar: EnvVar;
  showValue: boolean;
  copiedField: string | null;
  copyToClipboard: (text: string, field: string) => void;
}) {
  const displayValue =
    envVar.sensitive && !showValue
      ? envVar.value
        ? `${envVar.value.substring(0, 8)}${"*".repeat(12)}`
        : "Not set"
      : envVar.value || "Not set";

  return (
    <div className="px-2.5 py-2 bg-zinc-900/50 group">
      <div className="flex items-center justify-between gap-2">
        <code className="text-[11px] text-zinc-300 font-mono truncate">
          {envVar.key}
        </code>
        <button
          onClick={() =>
            copyToClipboard(
              `${envVar.key}=${envVar.value}`,
              `env-${envVar.key}`
            )
          }
          className="p-0.5 rounded hover:bg-zinc-700 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          {copiedField === `env-${envVar.key}` ? (
            <Check className="w-2.5 h-2.5 text-emerald-400" />
          ) : (
            <Copy className="w-2.5 h-2.5" />
          )}
        </button>
      </div>
      {showValue && (
        <code className="text-[10px] text-zinc-500 font-mono block mt-0.5 truncate">
          {displayValue}
        </code>
      )}
      <p className="text-[10px] text-zinc-600 mt-0.5">{envVar.description}</p>
    </div>
  );
}
