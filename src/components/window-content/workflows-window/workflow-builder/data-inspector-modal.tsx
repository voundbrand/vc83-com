/**
 * DATA INSPECTOR MODAL
 *
 * Modal for inspecting input/output data at each workflow step.
 * Shows transformations and data flow.
 */

"use client";

import React, { useState } from "react";
import { X, ChevronRight, Copy, Check } from "lucide-react";

interface DataInspectorModalProps {
  behaviorId: string;
  behaviorType: string;
  input?: unknown;
  output?: unknown;
  transformations?: string[];
  onClose: () => void;
}

export function DataInspectorModal({
  behaviorType,
  input,
  output,
  transformations = [],
  onClose,
}: DataInspectorModalProps) {
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const handleCopy = (data: unknown, type: "input" | "output") => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    if (type === "input") {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="border-4 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-4"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-highlight)" }}
        >
          <div>
            <h3 className="text-sm font-bold text-white">Data Inspector</h3>
            <p className="text-xs text-white opacity-80">{behaviorType}</p>
          </div>
          <button
            onClick={onClose}
            className="border-2 px-2 py-0.5 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
            style={{ borderColor: "white" }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-80px)] overflow-hidden">
          {/* Input Data */}
          <div className="flex-1 flex flex-col border-r-2" style={{ borderColor: "var(--win95-border)" }}>
            <div
              className="border-b-2 px-4 py-2 flex items-center justify-between"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            >
              <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Input Data
              </h4>
              <button
                onClick={() => handleCopy(input, "input")}
                className="retro-button p-1 flex items-center gap-1 text-xs"
                title="Copy to clipboard"
              >
                {copiedInput ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {input ? (
                <pre className="text-xs font-mono p-3 bg-white rounded border-2" style={{ borderColor: "var(--win95-border)" }}>
                  {JSON.stringify(input, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    No input data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transformations Arrow */}
          <div
            className="w-32 flex items-center justify-center border-r-2"
            style={{ borderColor: "var(--win95-border)", background: "#f9fafb" }}
          >
            <div className="text-center">
              <ChevronRight className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--win95-highlight)" }} />
              <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Transform
              </p>
              {transformations.length > 0 && (
                <div className="space-y-1">
                  {transformations.map((transform, index) => (
                    <div
                      key={index}
                      className="text-[10px] px-2 py-1 rounded border"
                      style={{ borderColor: "var(--win95-border)", background: "white" }}
                    >
                      {transform}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Output Data */}
          <div className="flex-1 flex flex-col">
            <div
              className="border-b-2 px-4 py-2 flex items-center justify-between"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            >
              <h4 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Output Data
              </h4>
              <button
                onClick={() => handleCopy(output, "output")}
                className="retro-button p-1 flex items-center gap-1 text-xs"
                title="Copy to clipboard"
              >
                {copiedOutput ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {output ? (
                <pre className="text-xs font-mono p-3 bg-white rounded border-2" style={{ borderColor: "var(--win95-border)" }}>
                  {JSON.stringify(output, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    No output data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="border-t-2 px-4 py-3 flex justify-end"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <button onClick={onClose} className="retro-button px-4 py-2 text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
