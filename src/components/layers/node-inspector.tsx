"use client";

import { useState } from "react";
import type { Node } from "@xyflow/react";
import type { NodeDefinition, ConfigField } from "../../../convex/layers/types";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

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
  onDelete: (nodeId: string) => void;
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
  onDelete,
  onToggleDisabled,
  onUpdateStatus,
  onClose,
  executionDetails,
}: NodeInspectorProps) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
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
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
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
          title={tWithFallback("ui.app.layers.node_inspector.close", "Close inspector")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab("config")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium ${activeTab === "config" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-slate-300"}`}
        >
          {tWithFallback("ui.app.layers.node_inspector.tabs.config", "Config")}
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium ${activeTab === "logs" ? "border-b-2 border-blue-500 text-blue-400" : "text-muted-foreground hover:text-slate-300"}`}
        >
          {tWithFallback("ui.app.layers.node_inspector.tabs.logs", "Logs")}
          {nodeExecution && (
            <span className={`ml-1 text-xs ${nodeExecution.status === "completed" ? "text-green-400" : nodeExecution.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
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
                {tWithFallback(
                  "ui.app.layers.node_inspector.logs.empty",
                  "No execution data yet. Run the workflow to see logs.",
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {tWithFallback("ui.app.layers.node_inspector.logs.status", "Status")}
                  </span>
                  <span className={`font-medium ${nodeExecution.status === "completed" ? "text-green-400" : nodeExecution.status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
                    {nodeExecution.status}
                  </span>
                </div>
                {nodeExecution.durationMs !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {tWithFallback("ui.app.layers.node_inspector.logs.duration", "Duration")}
                    </span>
                    <span className="font-mono">{nodeExecution.durationMs}ms</span>
                  </div>
                )}
                {nodeExecution.error && (
                  <div className="rounded-md border border-red-800 bg-red-950/30 p-2 text-xs text-red-400">
                    {nodeExecution.error}
                  </div>
                )}
                {nodeExecution.inputData !== undefined && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      {tWithFallback("ui.app.layers.node_inspector.logs.input", "Input")}
                    </div>
                    <pre className="max-h-32 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
                      {JSON.stringify(nodeExecution.inputData, null, 2)}
                    </pre>
                  </div>
                )}
                {nodeExecution.outputData !== undefined && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      {tWithFallback("ui.app.layers.node_inspector.logs.output", "Output")}
                    </div>
                    <pre className="max-h-32 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
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
          <FieldGroup label={tWithFallback("ui.app.layers.node_inspector.label", "Label")}>
            <input
              type="text"
              value={label}
              onChange={(e) => onUpdateLabel(node.id, e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </FieldGroup>

          {/* Description */}
          <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
            {definition.description}
          </div>

          {/* Config fields */}
          {definition.configFields.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {tWithFallback("ui.app.layers.node_inspector.configuration", "Configuration")}
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
              {tWithFallback("ui.app.layers.node_inspector.connections", "Connections")}
            </div>
            {definition.inputs.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-muted-foreground">
                  {tWithFallback("ui.app.layers.node_inspector.inputs", "Inputs")}
                </div>
                {definition.inputs.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-1.5 text-xs"
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
                <div className="text-xs font-medium text-muted-foreground">
                  {tWithFallback("ui.app.layers.node_inspector.outputs", "Outputs")}
                </div>
                {definition.outputs.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-1.5 text-xs"
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
              {tWithFallback("ui.app.layers.node_inspector.actions", "Actions")}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onDuplicate}
                className="flex-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                title={tWithFallback("ui.app.layers.node_inspector.actions.duplicate_title", "Duplicate node (Cmd+D)")}
              >
                {tWithFallback("ui.app.layers.node_inspector.actions.duplicate", "Duplicate")}
              </button>
              <button
                onClick={() => onDelete(node.id)}
                className="flex-1 rounded-md border border-red-800 px-2 py-1.5 text-xs text-red-300 hover:bg-red-950/30"
                title="Delete node"
                aria-label={tWithFallback("ui.app.layers.node_inspector.actions.delete_title", "Delete node")}
              >
                {tWithFallback("ui.app.layers.node_inspector.actions.delete", "Delete")}
              </button>
              <button
                onClick={() => onToggleDisabled(node.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                  isDisabled
                    ? "border-green-700 text-green-400 hover:bg-green-950/30"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
                title={isDisabled
                  ? tWithFallback("ui.app.layers.node_inspector.actions.enable_title", "Enable this node")
                  : tWithFallback("ui.app.layers.node_inspector.actions.disable_title", "Disable this node")}
              >
                {isDisabled
                  ? tWithFallback("ui.app.layers.node_inspector.actions.enable", "Enable")
                  : tWithFallback("ui.app.layers.node_inspector.actions.disable", "Disable")}
              </button>
            </div>
          </div>

          {/* Credits */}
          {(definition.creditCost ?? 0) > 0 && (
            <div className="text-xs text-muted-foreground">
              {tWithFallback("ui.app.layers.node_inspector.credits_per_execution", "Credits per execution:")}{" "}
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
      <label className="text-xs font-medium text-muted-foreground">
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
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
  const inputClasses =
    "w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </label>
      {field.description && (
        <div className="text-xs text-muted-foreground/70">
          {field.description}
        </div>
      )}

      {field.type === "select" && field.options ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">{tWithFallback("ui.app.layers.node_inspector.select_placeholder", "Select...")}</option>
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
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
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
        {tWithFallback("ui.app.layers.node_inspector.connect_account", "Connect Account")}
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2 rounded-md border border-green-800 bg-green-950/30 p-2 text-xs text-green-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {tWithFallback("ui.app.layers.node_inspector.account_connected", "Account connected")}
        </div>
      ) : definition.oauthProvider ? (
        <button
          onClick={handleOAuthConnect}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-700 bg-blue-950/30 px-3 py-2 text-xs text-blue-300 hover:bg-blue-900/40"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          {tWithFallback(
            "ui.app.layers.node_inspector.connect_provider",
            "Connect {provider}",
            { provider: definition.oauthProvider },
          )}
        </button>
      ) : definition.settingsType ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={tWithFallback("ui.app.layers.node_inspector.api_key_placeholder", "Enter API key...")}
              className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApiKeySave(apiKeyInput);
                }
              }}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="rounded-md border border-slate-700 px-1.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
              title={showApiKey
                ? tWithFallback("ui.app.layers.node_inspector.hide", "Hide")
                : tWithFallback("ui.app.layers.node_inspector.show", "Show")}
            >
              {showApiKey
                ? tWithFallback("ui.app.layers.node_inspector.hide", "Hide")
                : tWithFallback("ui.app.layers.node_inspector.show", "Show")}
            </button>
          </div>
          <button
            onClick={() => {
              handleApiKeySave(apiKeyInput);
            }}
            className="w-full rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            {tWithFallback("ui.app.layers.node_inspector.save_api_key", "Save API Key")}
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-slate-700 bg-slate-900/50 p-2 text-xs text-muted-foreground">
          {tWithFallback(
            "ui.app.layers.node_inspector.credentials_required",
            "Credentials required. Configure in Integration Settings.",
          )}
        </div>
      )}
    </div>
  );
}
