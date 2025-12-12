"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ArrowLeft, Copy, Check, Trash2, RefreshCw, AlertTriangle, Loader2, X, Plus } from "lucide-react";
import { FAIconPicker } from "./fa-icon-picker";
import { ScopeSelector } from "@/components/api-keys/scope-selector";
import { formatScopeLabel } from "@/lib/scopes";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CustomIntegrationModalProps {
  app: {
    id: Id<"oauthApplications">;
    name: string;
    description?: string;
    clientId: string;
    redirectUris: string[];
    scopes: string;
    isActive: boolean;
    isConfidential: boolean;
    icon?: string;
    createdAt: number;
  };
  onBack: () => void;
  onDeleted: () => void;
}

export function CustomIntegrationModal({ app, onBack, onDeleted }: CustomIntegrationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Edit form state
  const [name, setName] = useState(app.name);
  const [description, setDescription] = useState(app.description || "");
  const [icon, setIcon] = useState(app.icon || "fas fa-globe");
  const [redirectUris, setRedirectUris] = useState(app.redirectUris);
  const [selectedScopes, setSelectedScopes] = useState(app.scopes.split(" ").filter(Boolean));

  const updateOAuthApp = useMutation(api.oauth.applications.updateOAuthApplication);
  const deleteOAuthApp = useMutation(api.oauth.applications.deleteOAuthApplication);
  const regenerateSecret = useMutation(api.oauth.applications.regenerateClientSecret);

  const handleCopy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOAuthApp({
        applicationId: app.id,
        name: name.trim(),
        description: description.trim() || undefined,
        redirectUris,
        scopes: selectedScopes.join(" "),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update app:", error);
      alert(`Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmText = `Delete "${app.name}"?\n\nThis will immediately revoke all access tokens and break any integrations using this app. This action cannot be undone.`;
    if (!confirm(confirmText)) return;

    setIsDeleting(true);
    try {
      await deleteOAuthApp({ applicationId: app.id });
      onDeleted();
    } catch (error) {
      console.error("Failed to delete app:", error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsDeleting(false);
    }
  };

  const handleRegenerateSecret = async () => {
    const confirmText = "Regenerate client secret?\n\nThe current secret will stop working immediately. Any applications using it will need to be updated.";
    if (!confirm(confirmText)) return;

    setIsRegenerating(true);
    try {
      const result = await regenerateSecret({ applicationId: app.id });
      setNewSecret(result.clientSecret);
    } catch (error) {
      console.error("Failed to regenerate secret:", error);
      alert(`Failed to regenerate: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAddUri = () => {
    setRedirectUris([...redirectUris, ""]);
  };

  const handleRemoveUri = (index: number) => {
    setRedirectUris(redirectUris.filter((_, i) => i !== index));
  };

  const handleUriChange = (index: number, value: string) => {
    const newUris = [...redirectUris];
    newUris[index] = value;
    setRedirectUris(newUris);
  };

  const scopesList = app.scopes.split(" ").filter(Boolean);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--win95-bg)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2 flex items-center gap-3" style={{ borderColor: 'var(--win95-border)' }}>
        <button
          onClick={onBack}
          className="p-1 hover:bg-opacity-80 transition-colors"
          style={{ color: 'var(--win95-highlight)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center"
            style={{ background: 'var(--win95-bg-light)' }}
          >
            <i className={`${app.icon || "fas fa-globe"} text-xl`} style={{ color: 'var(--win95-gradient-end)' }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--win95-text)' }}>
              {app.name}
            </h2>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Custom OAuth Integration
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* New Secret Alert */}
        {newSecret && (
          <div
            className="p-4 border-2"
            style={{
              borderColor: '#f59e0b',
              background: '#fef3c7',
            }}
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#92400e' }} />
              <div className="text-xs" style={{ color: '#92400e' }}>
                <strong>New Client Secret Generated!</strong>
                <br />
                Copy this secret now - it won't be shown again.
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSecret}
                readOnly
                className="flex-1 px-3 py-2 text-sm border-2 font-mono"
                style={{
                  borderColor: '#ef4444',
                  background: '#fee2e2',
                  color: 'var(--win95-text)',
                }}
              />
              <button
                onClick={() => handleCopy(newSecret, "secret")}
                className="beveled-button px-3 py-2 font-bold text-xs"
                style={{
                  backgroundColor: copied === "secret" ? '#10b981' : 'var(--win95-highlight)',
                  color: 'white',
                }}
              >
                {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={() => setNewSecret(null)}
              className="mt-2 text-xs font-bold"
              style={{ color: '#92400e' }}
            >
              I've saved my secret - dismiss this
            </button>
          </div>
        )}

        {/* Client ID */}
        <div
          className="p-3 border-2 rounded"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)',
          }}
        >
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            Client ID
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--win95-text)' }}>
              {app.clientId}
            </code>
            <button
              onClick={() => handleCopy(app.clientId, "clientId")}
              className="p-1"
              title="Copy Client ID"
            >
              {copied === "clientId" ? (
                <Check size={14} style={{ color: '#10b981' }} />
              ) : (
                <Copy size={14} style={{ color: 'var(--neutral-gray)' }} />
              )}
            </button>
          </div>
        </div>

        {/* Client Secret Management */}
        {app.isConfidential && (
          <div
            className="p-3 border-2 rounded"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
            }}
          >
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
              Client Secret
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
              The secret is hidden for security. Regenerate if you need a new one.
            </p>
            <button
              onClick={handleRegenerateSecret}
              disabled={isRegenerating}
              className="beveled-button flex items-center gap-1 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
              }}
            >
              {isRegenerating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Regenerate Secret
            </button>
          </div>
        )}

        {/* Edit Mode */}
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border-2 resize-none"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Icon
              </label>
              <FAIconPicker selectedIcon={icon} onSelect={setIcon} />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Redirect URIs
              </label>
              <div className="space-y-2">
                {redirectUris.map((uri, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={uri}
                      onChange={(e) => handleUriChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border-2"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: 'var(--win95-input-bg)',
                        color: 'var(--win95-text)',
                      }}
                    />
                    {redirectUris.length > 1 && (
                      <button
                        onClick={() => handleRemoveUri(index)}
                        className="px-2"
                        style={{ color: '#ef4444' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddUri}
                  className="text-xs font-bold flex items-center gap-1"
                  style={{ color: 'var(--win95-highlight)' }}
                >
                  <Plus size={12} /> Add URI
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                Scopes
              </label>
              <ScopeSelector selectedScopes={selectedScopes} onChange={setSelectedScopes} />
            </div>

            {/* Save/Cancel */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(app.name);
                  setDescription(app.description || "");
                  setIcon(app.icon || "fas fa-globe");
                  setRedirectUris(app.redirectUris);
                  setSelectedScopes(app.scopes.split(" ").filter(Boolean));
                }}
                className="beveled-button px-4 py-2 text-xs font-bold"
                style={{
                  backgroundColor: 'var(--win95-button-face)',
                  color: 'var(--win95-text)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="beveled-button px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--win95-highlight)',
                }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* View Mode - Details */}
            <div
              className="p-3 border-2 rounded space-y-3"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
              }}
            >
              {app.description && (
                <div>
                  <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--win95-text)' }}>
                    Description
                  </label>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {app.description}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--win95-text)' }}>
                  Type
                </label>
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {app.isConfidential ? "Confidential (Server-side)" : "Public (Client-side)"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-0.5" style={{ color: 'var(--win95-text)' }}>
                  Created
                </label>
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  Redirect URIs
                </label>
                <div className="space-y-1">
                  {app.redirectUris.map((uri, i) => (
                    <code
                      key={i}
                      className="block text-xs font-mono truncate px-2 py-1 rounded"
                      style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}
                    >
                      {uri}
                    </code>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  Scopes
                </label>
                <div className="flex flex-wrap gap-1">
                  {scopesList.map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: 'var(--win95-bg)',
                        color: 'var(--win95-text)',
                      }}
                    >
                      {formatScopeLabel(scope)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="beveled-button w-full px-4 py-2 text-xs font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              Edit Integration
            </button>
          </>
        )}

        {/* Danger Zone */}
        <div
          className="p-3 border-2 rounded"
          style={{
            borderColor: '#ef4444',
            background: '#fee2e2',
          }}
        >
          <h4 className="text-xs font-bold mb-2" style={{ color: '#991b1b' }}>
            Danger Zone
          </h4>
          <p className="text-xs mb-3" style={{ color: '#991b1b' }}>
            Deleting this integration will immediately revoke all access. This cannot be undone.
          </p>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="beveled-button flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{
              backgroundColor: '#ef4444',
            }}
          >
            {isDeleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Delete Integration
          </button>
        </div>
      </div>
    </div>
  );
}
