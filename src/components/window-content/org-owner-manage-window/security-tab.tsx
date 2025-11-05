"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Key, Plus, Trash2, Copy, Loader2, AlertCircle, Shield } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PermissionGuard } from "@/components/permission";

interface SecurityTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function SecurityTab({ organizationId, sessionId }: SecurityTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Check if API keys are enabled for this organization
  const apiSettings = useQuery(
    api.organizationApiSettings.getApiSettings,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  // Fetch API keys for this organization
  const apiKeys = useQuery(
    api.api.auth.listApiKeys,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  const isApiKeysEnabled = apiSettings?.apiKeysEnabled ?? false;

  return (
    <div className="space-y-4">
      {/* API Keys Disabled Warning */}
      {!isApiKeysEnabled && (
        <div
          className="p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--warning)',
            borderColor: 'var(--win95-border)',
            color: 'var(--win95-text)'
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">API Keys Not Available</p>
            <p className="text-xs mt-1">
              API key generation has not been enabled for your organization. Please contact your system administrator to enable this feature.
            </p>
          </div>
        </div>
      )}

      {/* Permission Warning */}
      <PermissionGuard permission="manage_organization" mode="show-fallback" fallback={
        <div
          className="mb-4 p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--warning)',
            borderColor: 'var(--win95-border)',
            color: 'var(--win95-text)'
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">View Only</p>
            <p className="text-xs mt-1">
              You don&apos;t have permission to manage API keys. Only organization owners and managers can generate and revoke API keys.
            </p>
          </div>
        </div>
      }>
        {null}
      </PermissionGuard>

      {/* Header */}
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Key size={16} />
          API Keys & Security
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Manage API keys for external integrations and services. Keep your keys secure and revoke any compromised keys immediately.
        </p>
      </div>

      {/* Security Best Practices */}
      <div
        className="p-3 border-2"
        style={{
          backgroundColor: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)',
        }}
      >
        <div className="flex items-start gap-2">
          <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>Security Best Practices</p>
            <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>• Store API keys securely - never commit them to version control</li>
              <li>• Rotate keys regularly, especially after team member departures</li>
              <li>• Revoke unused or compromised keys immediately</li>
              <li>• Use descriptive names to track where each key is used</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
        {/* Header with Create Button */}
        <div
          className="px-3 py-2 border-b-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)',
          }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
            Active API Keys
          </span>
          <PermissionGuard permission="manage_organization">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isApiKeysEnabled}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
              title={!isApiKeysEnabled ? "API keys are not enabled for your organization" : "Generate a new API key"}
            >
              <Plus size={12} />
              Generate Key
            </button>
          </PermissionGuard>
        </div>

        {/* API Keys Table */}
        <div className="p-3">
          {!apiKeys ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--neutral-gray)' }} />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key size={32} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--neutral-gray)' }} />
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                No API keys generated yet.
              </p>
              <PermissionGuard permission="manage_organization">
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  Click &quot;Generate Key&quot; to create your first API key.
                </p>
              </PermissionGuard>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--win95-border)' }}>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>Name</th>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>Key Preview</th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>Status</th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>Requests</th>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>Created</th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <ApiKeyRow
                    key={key.id}
                    apiKey={key}
                    organizationId={organizationId}
                    sessionId={sessionId}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          organizationId={organizationId}
          sessionId={sessionId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

/**
 * API Key Row Component
 */
function ApiKeyRow({
  apiKey,
  organizationId,
  sessionId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiKey: any;
  organizationId: Id<"organizations">;
  sessionId: string;
}) {
  const [isRevoking, setIsRevoking] = useState(false);
  const revokeApiKey = useMutation(api.api.auth.revokeApiKey);

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to revoke the API key "${apiKey.name}"?\n\nThis action cannot be undone and will immediately stop all requests using this key.`)) {
      return;
    }

    try {
      setIsRevoking(true);
      await revokeApiKey({
        sessionId,
        organizationId,
        keyPreview: apiKey.keyPreview,
        reason: "Revoked by organization administrator",
      });
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      alert(`Failed to revoke: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.keyPreview);
    alert("API key preview copied to clipboard");
  };

  return (
    <tr className="border-b hover:bg-opacity-50" style={{ borderColor: 'var(--win95-border)' }}>
      <td className="py-2" style={{ color: 'var(--win95-text)' }}>{apiKey.name}</td>
      <td className="py-2 font-mono text-xs">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1"
          style={{ color: 'var(--win95-text)' }}
          title="Copy to clipboard"
        >
          {apiKey.keyPreview}
          <Copy size={10} />
        </button>
      </td>
      <td className="py-2 text-center">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            apiKey.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {apiKey.status}
        </span>
      </td>
      <td className="py-2 text-center" style={{ color: 'var(--win95-text)' }}>
        {apiKey.requestCount.toLocaleString()}
      </td>
      <td className="py-2" style={{ color: 'var(--win95-text)' }}>
        {new Date(apiKey.createdAt).toLocaleDateString()}
      </td>
      <td className="py-2 text-center">
        {apiKey.status === "active" && (
          <PermissionGuard permission="manage_organization">
            <button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="px-2 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1 mx-auto"
              style={{
                backgroundColor: 'var(--error)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
            >
              {isRevoking ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Trash2 size={10} />
              )}
              Revoke
            </button>
          </PermissionGuard>
        )}
      </td>
    </tr>
  );
}

/**
 * Create API Key Modal
 */
function CreateApiKeyModal({
  organizationId,
  sessionId,
  onClose,
}: {
  organizationId: Id<"organizations">;
  sessionId: string;
  onClose: () => void;
}) {
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const generateApiKey = useMutation(api.api.auth.generateApiKey);

  const handleGenerate = async () => {
    if (!keyName.trim()) {
      alert("Please enter a name for the API key");
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateApiKey({
        sessionId,
        organizationId,
        name: keyName,
      });
      setGeneratedKey(result.key);
    } catch (error) {
      console.error("Failed to generate API key:", error);
      alert(`Failed to generate: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAndClose = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      alert("API key copied to clipboard!\n\nStore it securely - you won't be able to see the full key again.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-4 shadow-lg max-w-md w-full mx-4" style={{ borderColor: 'var(--win95-border)' }}>
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold">Generate API Key</span>
          <button
            onClick={onClose}
            className="hover:bg-opacity-80 px-2"
            style={{ color: 'white' }}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4" style={{ background: 'var(--win95-bg)' }}>
          {!generatedKey ? (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--win95-text)' }}>
                Generate a new API key for external integrations. Give it a descriptive name to help you remember where it&apos;s used.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  API Key Name:
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production Integration"
                  className="w-full px-3 py-2 text-sm border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-bg)',
                    color: 'var(--win95-text)',
                  }}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--win95-button-face)',
                    color: 'var(--win95-text)',
                    border: '2px solid',
                    borderTopColor: 'var(--win95-button-light)',
                    borderLeftColor: 'var(--win95-button-light)',
                    borderBottomColor: 'var(--win95-button-dark)',
                    borderRightColor: 'var(--win95-button-dark)',
                  }}
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !keyName.trim()}
                  className="px-3 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--success)',
                    border: '2px solid',
                    borderTopColor: 'var(--win95-button-light)',
                    borderLeftColor: 'var(--win95-button-light)',
                    borderBottomColor: 'var(--win95-button-dark)',
                    borderRightColor: 'var(--win95-button-dark)',
                  }}
                >
                  {isGenerating && <Loader2 size={12} className="animate-spin" />}
                  Generate
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-3 border-2" style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--win95-border)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  ⚠️ Important: Copy this key now!
                </p>
                <p className="text-xs" style={{ color: 'var(--win95-text)' }}>
                  This is the only time you&apos;ll be able to see the full API key. Store it securely in your application or environment variables.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Your API Key:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedKey}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs font-mono border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)',
                      color: 'var(--win95-text)',
                    }}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedKey)}
                    className="px-3 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--win95-button-face)',
                      color: 'var(--win95-text)',
                      border: '2px solid',
                      borderTopColor: 'var(--win95-button-light)',
                      borderLeftColor: 'var(--win95-button-light)',
                      borderBottomColor: 'var(--win95-button-dark)',
                      borderRightColor: 'var(--win95-button-dark)',
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleCopyAndClose}
                className="w-full px-3 py-2 text-xs font-bold text-white"
                style={{
                  backgroundColor: 'var(--primary)',
                  border: '2px solid',
                  borderTopColor: 'var(--win95-button-light)',
                  borderLeftColor: 'var(--win95-button-light)',
                  borderBottomColor: 'var(--win95-button-dark)',
                  borderRightColor: 'var(--win95-button-dark)',
                }}
              >
                Copy & Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
