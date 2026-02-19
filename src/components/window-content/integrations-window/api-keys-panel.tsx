"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Key, Plus, Trash2, Copy, Loader2, AlertCircle, Shield, ArrowLeft, Check } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PermissionGuard } from "@/components/permission";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
import { formatScopeLabel, hasWildcardScope } from "@/lib/scopes";

interface ApiKeysPanelProps {
  onBack: () => void;
}

export function ApiKeysPanel({ onBack }: ApiKeysPanelProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Check if API keys are enabled for this organization
  const apiSettings = useQuery(
    api.organizationApiSettings.getApiSettings,
    currentOrg?.id && sessionId ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Fetch API keys for this organization
  const apiKeys = useQuery(
    api.api.auth.listApiKeys,
    currentOrg?.id && sessionId ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  const revokeApiKey = useMutation(api.api.auth.revokeApiKey);

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
              backgroundColor: '#fef3c7',
              borderColor: 'var(--window-document-border)',
              color: 'var(--window-document-text)'
            }}
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">API Keys Disabled</p>
              <p className="text-xs mt-1">
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
                onClick={() => setShowCreateDialog(true)}
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
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
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

      {/* Create API Key Dialog */}
      {showCreateDialog && sessionId && (
        <CreateApiKeyDialog
          organizationId={organizationId}
          sessionId={sessionId}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
