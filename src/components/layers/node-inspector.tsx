"use client";

import { useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import type { NodeDefinition, ConfigField } from "../../../convex/layers/types";

interface ExecutionDetailsData {
  nodeExecutions: Array<{
    nodeId: string;
    status: string;
    inputData?: unknown;
    outputData?: unknown;
    error?: string;
    durationMs?: number;
    startedAt?: number;
    completedAt?: number;
  }>;
}

interface NodeInspectorProps {
  node: Node | null;
  onUpdateConfig: (nodeId: string, key: string, value: unknown) => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onDuplicate: () => void;
  onToggleDisabled: (nodeId: string) => void;
  onUpdateStatus: (nodeId: string, status: string) => void;
  onClose: () => void;
  executionDetails?: ExecutionDetailsData;
}

export function NodeInspector({
  node,
  onUpdateConfig,
  onUpdateLabel,
  onDuplicate,
  onToggleDisabled,
  onUpdateStatus,
  onClose,
  executionDetails,
}: NodeInspectorProps) {
  const [activeTab, setActiveTab] = useState<"config" | "logs">("config");

  if (!node) return null;

  const definition = node.data.definition as NodeDefinition;
  const config = (node.data.config ?? {}) as Record<string, unknown>;
  const label = (node.data.label as string) ?? definition.name;
  const nodeStatus = (node.data.status as string) ?? "draft";
  const isDisabled = nodeStatus === "disabled";

  const nodeExecution = executionDetails?.nodeExecutions?.find(
    (ne) => ne.nodeId === node.id,
  );

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-800 text-zinc-100" style={{ background: "#09090b" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: definition.color }}
          />
          <span className="text-sm font-semibold">{definition.name}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Close inspector"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("config")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium ${activeTab === "config" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-zinc-300"}`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium ${activeTab === "logs" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-zinc-300"}`}
        >
          Logs
          {nodeExecution && (
            <span className={`ml-1 text-[10px] ${nodeExecution.status === "completed" ? "text-green-400" : nodeExecution.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
              ({nodeExecution.status})
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Logs tab */}
        {activeTab === "logs" && (
          <div className="space-y-3">
            {!nodeExecution ? (
              <div className="text-xs text-muted-foreground">
                No execution data yet. Run the workflow to see logs.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${nodeExecution.status === "completed" ? "text-green-400" : nodeExecution.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
                    {nodeExecution.status}
                  </span>
                </div>
                {nodeExecution.durationMs !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-mono">{nodeExecution.durationMs}ms</span>
                  </div>
                )}
                {nodeExecution.error && (
                  <div className="rounded-md border border-red-800 bg-red-950/30 p-2 text-[11px] text-red-400">
                    {nodeExecution.error}
                  </div>
                )}
                {nodeExecution.inputData !== undefined && (
                  <div>
                    <div className="mb-1 text-[10px] font-medium text-muted-foreground">Input</div>
                    <pre className="max-h-32 overflow-auto rounded bg-zinc-900 p-2 text-[10px] text-zinc-300">
                      {JSON.stringify(nodeExecution.inputData, null, 2)}
                    </pre>
                  </div>
                )}
                {nodeExecution.outputData !== undefined && (
                  <div>
                    <div className="mb-1 text-[10px] font-medium text-muted-foreground">Output</div>
                    <pre className="max-h-32 overflow-auto rounded bg-zinc-900 p-2 text-[10px] text-zinc-300">
                      {JSON.stringify(nodeExecution.outputData, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Config tab */}
        {activeTab === "config" && <div className="space-y-4">
          {/* Label */}
          <FieldGroup label="Label">
            <input
              type="text"
              value={label}
              onChange={(e) => onUpdateLabel(node.id, e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </FieldGroup>

          {/* Description */}
          <div className="rounded-md bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {definition.description}
          </div>

          {/* Config fields */}
          {definition.configFields.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Configuration
              </div>
              {definition.configFields.map((field) => (
                <ConfigFieldInput
                  key={field.key}
                  field={field}
                  value={config[field.key]}
                  onChange={(val) =>
                    onUpdateConfig(node.id, field.key, val)
                  }
                />
              ))}
            </div>
          )}

          {/* Credential flows */}
          {definition.requiresAuth && (
            <CredentialSection
              node={node}
              definition={definition}
              config={config}
              onUpdateConfig={onUpdateConfig}
              onUpdateStatus={onUpdateStatus}
            />
          )}

          {/* Handles info */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Connections
            </div>
            {definition.inputs.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">
                  Inputs
                </div>
                {definition.inputs.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-1.5 text-[11px]"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {h.label}
                    {h.dataType && h.dataType !== "any" && (
                      <span className="text-muted-foreground">
                        ({h.dataType})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {definition.outputs.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">
                  Outputs
                </div>
                {definition.outputs.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-1.5 text-[11px]"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {h.label}
                    {h.dataType && h.dataType !== "any" && (
                      <span className="text-muted-foreground">
                        ({h.dataType})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Actions
            </div>
            <div className="flex gap-2">
              <button
                onClick={onDuplicate}
                className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
                title="Duplicate node (Cmd+D)"
              >
                Duplicate
              </button>
              <button
                onClick={() => onToggleDisabled(node.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] ${
                  isDisabled
                    ? "border-green-700 text-green-400 hover:bg-green-950/30"
                    : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                }`}
                title={isDisabled ? "Enable this node" : "Disable this node"}
              >
                {isDisabled ? "Enable" : "Disable"}
              </button>
            </div>
          </div>

          {/* Credits */}
          {(definition.creditCost ?? 0) > 0 && (
            <div className="text-[11px] text-muted-foreground">
              Credits per execution:{" "}
              <span className="font-medium">{definition.creditCost}</span>
            </div>
          )}
        </div>}
      </div>
    </aside>
  );
}

// ============================================================================
// FIELD GROUP
// ============================================================================

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// ============================================================================
// CONFIG FIELD INPUT
// ============================================================================

function ConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const inputClasses =
    "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </label>
      {field.description && (
        <div className="text-[10px] text-muted-foreground/70">
          {field.description}
        </div>
      )}

      {field.type === "select" && field.options ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Select...</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" || field.type === "json" ? (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.type === "json" ? 4 : 3}
          className={`${inputClasses} resize-y font-mono`}
        />
      ) : field.type === "boolean" ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-xs">{field.label}</span>
        </label>
      ) : field.type === "number" ? (
        <input
          type="number"
          value={(value as number) ?? field.defaultValue ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          className={inputClasses}
        />
      ) : (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClasses}
        />
      )}
    </div>
  );
}

// ============================================================================
// CREDENTIAL SECTION
// ============================================================================

function CredentialSection({
  node,
  definition,
  config,
  onUpdateConfig,
  onUpdateStatus,
}: {
  node: Node;
  definition: NodeDefinition;
  config: Record<string, unknown>;
  onUpdateConfig: (nodeId: string, key: string, value: unknown) => void;
  onUpdateStatus: (nodeId: string, status: string) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const isConnected = (node.data.status as string) === "ready" || !!(config.__credentialConnected);

  const handleOAuthConnect = () => {
    // Open OAuth flow in popup using existing project-drawer OAuth infrastructure
    const provider = definition.oauthProvider;
    if (!provider) return;
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;
    const popup = window.open(
      `/api/auth/project-drawer/?provider=${encodeURIComponent(provider)}&returnTo=${encodeURIComponent(window.location.pathname)}`,
      `oauth_${provider}`,
      `width=${width},height=${height},left=${left},top=${top},popup=1`,
    );
    // Listen for popup close / success message
    if (popup) {
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          // Mark as connected optimistically; real status comes from server
          onUpdateConfig(node.id, "__credentialConnected", true);
          onUpdateStatus(node.id, "ready");
        }
      }, 500);
    }
  };

  const handleApiKeySave = (apiKey: string) => {
    if (!apiKey.trim()) return;
    onUpdateConfig(node.id, "__apiKey", apiKey);
    onUpdateConfig(node.id, "__credentialConnected", true);
    onUpdateStatus(node.id, "ready");
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Connect Account
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2 rounded-md border border-green-800 bg-green-950/30 p-2 text-[11px] text-green-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Account connected
        </div>
      ) : definition.oauthProvider ? (
        <button
          onClick={handleOAuthConnect}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-700 bg-blue-950/30 px-3 py-2 text-[11px] text-blue-300 hover:bg-blue-900/40"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Connect {definition.oauthProvider}
        </button>
      ) : definition.settingsType ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type={showApiKey ? "text" : "password"}
              placeholder="Enter API key..."
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApiKeySave((e.target as HTMLInputElement).value);
                }
              }}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="rounded-md border border-zinc-700 px-1.5 py-1.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
              title={showApiKey ? "Hide" : "Show"}
            >
              {showApiKey ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>(
                'input[type="password"], input[placeholder="Enter API key..."]'
              );
              if (input) handleApiKeySave(input.value);
            }}
            className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            Save API Key
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-700 bg-zinc-900/50 p-2 text-[11px] text-muted-foreground">
          Credentials required. Configure in Integration Settings.
        </div>
      )}
    </div>
  );
}
