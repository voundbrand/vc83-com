"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Key, Plus, Trash2, Copy, Loader2, AlertCircle, Shield, ArrowLeft, Check, CheckCircle2, AlertTriangle } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PermissionGuard } from "@/components/permission";
import { ScopeSelector } from "@/components/api-keys/scope-selector";
import { formatScopeLabel, hasWildcardScope } from "@/lib/scopes";

// Dynamic require plus local hook casts avoid TS2589 deep type instantiation
// against the generated Convex API surface in this large panel.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useQueryAny = useQuery as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useMutationAny = useMutation as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useActionAny = useAction as any;

interface ApiKeysPanelProps {
  onBack: () => void;
}

type PanelView = "list" | "create" | "success";

type ApiKeyListEntry = {
  id: string;
  name: string;
  keyPreview: string;
  status: string;
  scopes: string[];
  createdAt: number;
  requestCount: number;
};

export function ApiKeysPanel({ onBack }: ApiKeysPanelProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View state: list (default), create form, or success display
  const [view, setView] = useState<PanelView>("list");

  // Create form state
  const [createName, setCreateName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["*"]);
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedNewKey, setCopiedNewKey] = useState(false);

  // Check if API keys are enabled for this organization
  const apiSettings = useQueryAny(
    api.organizationApiSettings.getApiSettings,
    currentOrg?.id && sessionId ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Fetch API keys for this organization
  const apiKeys = useQueryAny(
    api.api.auth.listApiKeys,
    currentOrg?.id && sessionId ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  ) as ApiKeyListEntry[] | undefined;

  const revokeApiKey = useMutationAny(api.api.auth.revokeApiKey);
  const generateApiKey = useActionAny(api.actions.apiKeys.generateApiKey);

  // API keys are initialized to enabled during onboarding (per tierConfigs.ts)
  // Super admins can disable them, fallback to false if settings don't exist (legacy orgs)
  const isApiKeysEnabled = apiSettings?.apiKeysEnabled ?? false;
  const organizationId = currentOrg?.id as Id<"organizations">;

  const handleCopy = async (keyPreview: string) => {
    await navigator.clipboard.writeText(keyPreview);
    setCopiedKey(keyPreview);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevoke = async (apiKey: { name: string; keyPreview: string }) => {
    if (!confirm(`Revoke API key "${apiKey.name}"?\n\nThis action cannot be undone. Any applications using this key will stop working.`)) {
      return;
    }

    try {
      await revokeApiKey({
        sessionId: sessionId!,
        organizationId,
        keyPreview: apiKey.keyPreview,
        reason: "Revoked by user from Integrations panel",
      });
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      alert(`Failed to revoke API key: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleCreateKey = async () => {
    if (!createName.trim()) {
      alert("Please enter a name for the API key");
      return;
    }
    if (selectedScopes.length === 0) {
      alert("Please select at least one permission scope");
      return;
    }

    try {
      setIsCreating(true);
      const result = await generateApiKey({
        sessionId: sessionId!,
        organizationId,
        name: createName.trim(),
        scopes: selectedScopes,
        type: "simple",
      });
      setCreatedKey(result.key);
      setView("success");
    } catch (error: unknown) {
      alert(`Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyNewKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopiedNewKey(true);
      setTimeout(() => setCopiedNewKey(false), 2000);
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  const handleBackToList = () => {
    setView("list");
    setCreateName("");
    setSelectedScopes(["*"]);
    setCreatedKey(null);
    setCopiedNewKey(false);
  };

  // --- Success view: show created key one-time ---
  if (view === "success" && createdKey) {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 flex items-center gap-3" style={{ borderColor: 'var(--window-document-border)' }}>
          <button
            onClick={handleBackToList}
            className="p-1 hover:bg-opacity-80 transition-colors"
            style={{ color: 'var(--tone-accent)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
              <CheckCircle2 size={18} style={{ color: '#10b981' }} />
              API Key Created
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
              Save this key now — it won't be shown again
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Key Display */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--window-document-bg-elevated)',
              borderColor: '#ef4444',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                  Save Your API Key Now
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  For security reasons, we can only show you this key once. Copy it now and store it securely.
                </p>

                {/* Key with Copy */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={createdKey}
                    readOnly
                    className="flex-1 px-2 py-1.5 text-xs font-mono border-2"
                    style={{
                      background: 'var(--window-document-bg)',
                      borderColor: 'var(--window-document-border)',
                      color: 'var(--window-document-text)',
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopyNewKey}
                    className="desktop-interior-button px-3 py-1.5 text-xs font-bold"
                    style={{
                      backgroundColor: copiedNewKey ? '#10b981' : 'var(--tone-accent)',
                      color: 'white',
                    }}
                  >
                    {copiedNewKey ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div
            className="p-4 border-2"
            style={{
              backgroundColor: 'var(--window-document-bg-elevated)',
              borderColor: 'var(--window-document-border)',
            }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
              Using Your API Key
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
              Include this key in the Authorization header of your API requests:
            </p>
            <pre
              className="p-3 text-xs overflow-x-auto border-2"
              style={{
                background: 'var(--window-document-bg)',
                borderColor: 'var(--window-document-border)',
                color: 'var(--window-document-text)',
              }}
            >
              {`Authorization: Bearer ${createdKey}`}
            </pre>
          </div>

          {/* Done Button */}
          <div className="flex justify-end">
            <button
              onClick={handleBackToList}
              className="desktop-interior-button px-4 py-2 text-xs font-bold"
              style={{
                backgroundColor: 'var(--tone-accent)',
                color: 'white',
              }}
            >
              Done — I've Saved My Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Create view: inline form ---
  if (view === "create") {
    return (
      <div className="flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 flex items-center gap-3" style={{ borderColor: 'var(--window-document-border)' }}>
          <button
            onClick={handleBackToList}
            className="p-1 hover:bg-opacity-80 transition-colors"
            style={{ color: 'var(--tone-accent)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
              <Key size={18} />
              Create API Key
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
              Configure permissions and generate a new API key
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
              API Key Name
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g., Production Server, Mobile App, Analytics Pipeline"
              className="w-full px-2 py-1.5 text-xs border-2"
              style={{
                background: 'var(--window-document-bg)',
                borderColor: 'var(--window-document-border)',
                color: 'var(--window-document-text)',
              }}
              disabled={isCreating}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Choose a descriptive name to help identify this key's purpose
            </p>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
              Permissions
            </label>
            <ScopeSelector
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
              disabled={isCreating}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2 border-t-2" style={{ borderColor: 'var(--window-document-border)' }}>
            <button
              onClick={handleBackToList}
              disabled={isCreating}
              className="desktop-interior-button px-4 py-1.5 text-xs font-bold disabled:opacity-50"
              style={{
                backgroundColor: 'var(--window-document-bg-elevated)',
                color: 'var(--window-document-text)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateKey}
              disabled={isCreating || !createName.trim() || selectedScopes.length === 0}
              className="desktop-interior-button px-4 py-1.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
              }}
            >
              {isCreating ? "Creating..." : "Create API Key"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- List view (default) ---
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--window-document-bg)' }}>
      {/* Header with Back Button */}
      <div className="px-4 py-3 border-b-2 flex items-center gap-3" style={{ borderColor: 'var(--window-document-border)' }}>
        <button
          onClick={onBack}
          className="p-1 hover:bg-opacity-80 transition-colors"
          style={{ color: 'var(--tone-accent)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
            <Key size={18} />
            API Keys
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-gray)' }}>
            Manage programmatic access to your organization
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* API Keys Disabled Warning */}
        {!isApiKeysEnabled && (
          <div
            className="p-3 border-2 flex items-start gap-2"
            style={{
              backgroundColor: 'var(--window-document-bg-elevated)',
              borderColor: '#f59e0b',
              color: 'var(--window-document-text)'
            }}
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <div className="text-sm">
              <p className="font-semibold">API Keys Disabled</p>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                API keys are not enabled for this organization. Contact an administrator to enable API access.
              </p>
            </div>
          </div>
        )}

        {/* Security Best Practices */}
        <div
          className="p-3 border-2"
          style={{
            backgroundColor: 'var(--window-document-bg-elevated)',
            borderColor: 'var(--window-document-border)',
          }}
        >
          <div className="flex items-start gap-2">
            <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--tone-accent)' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                Security Best Practices
              </p>
              <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--neutral-gray)' }}>
                <li>• Use the minimum required permissions</li>
                <li>• Create separate keys for different services</li>
                <li>• Never share API keys in public code</li>
                <li>• Rotate keys regularly</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="border-2" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg)' }}>
          {/* Header with Create Button */}
          <div
            className="px-3 py-2 border-b-2 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--window-document-bg-elevated)',
              borderColor: 'var(--window-document-border)',
            }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
              Your API Keys
            </span>
            <PermissionGuard permission="manage_organization">
              <button
                onClick={() => setView("create")}
                disabled={!isApiKeysEnabled}
                className="desktop-interior-button flex items-center gap-1 px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                }}
              >
                <Plus size={12} />
                Create Key
              </button>
            </PermissionGuard>
          </div>

          {/* Keys Table */}
          <div className="p-3">
            {apiKeys === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--neutral-gray)' }} />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--neutral-gray)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                  No API Keys
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  Create your first API key to start integrating
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="p-3 border-2 rounded"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      background: 'var(--window-document-bg-elevated)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: 'var(--window-document-text)' }}>
                            {key.name}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: key.status === "active" ? '#10b981' : '#ef4444',
                              color: 'white'
                            }}
                          >
                            {key.status === "active" ? "Active" : "Revoked"}
                          </span>
                        </div>

                        {/* Key Preview */}
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs font-mono" style={{ color: 'var(--neutral-gray)' }}>
                            {key.keyPreview}...
                          </code>
                          <button
                            onClick={() => handleCopy(key.keyPreview)}
                            className="p-0.5 hover:bg-opacity-80"
                            title="Copy key prefix"
                          >
                            {copiedKey === key.keyPreview ? (
                              <Check size={12} style={{ color: '#10b981' }} />
                            ) : (
                              <Copy size={12} style={{ color: 'var(--neutral-gray)' }} />
                            )}
                          </button>
                        </div>

                        {/* Scopes */}
                        {key.scopes && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hasWildcardScope(key.scopes) ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  backgroundColor: '#f59e0b',
                                  color: '#ffffff',
                                }}
                              >
                                Full Access (*)
                              </span>
                            ) : (
                              key.scopes.slice(0, 3).map((scope: string) => (
                                <span
                                  key={scope}
                                  className="px-1.5 py-0.5 rounded text-[10px]"
                                  style={{
                                    backgroundColor: 'var(--window-document-bg)',
                                    color: 'var(--window-document-text)',
                                  }}
                                >
                                  {formatScopeLabel(scope)}
                                </span>
                              ))
                            )}
                            {!hasWildcardScope(key.scopes) && key.scopes.length > 3 && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{
                                  backgroundColor: 'var(--window-document-bg)',
                                  color: 'var(--neutral-gray)',
                                }}
                              >
                                +{key.scopes.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                          <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Requests: {key.requestCount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {key.status === "active" && (
                        <PermissionGuard permission="manage_organization">
                          <button
                            onClick={() => handleRevoke(key)}
                            className="desktop-interior-button p-2 text-xs font-bold text-white"
                            style={{
                              backgroundColor: '#ef4444',
                            }}
                            title="Revoke key"
                          >
                            <Trash2 size={14} />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
