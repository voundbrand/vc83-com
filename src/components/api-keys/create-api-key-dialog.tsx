/**
 * CREATE API KEY DIALOG
 *
 * Dialog for creating new API keys with scope selection.
 * Integrates with the ScopeSelector component for granular permission control.
 *
 * Features:
 * - API key name input
 * - Scope selection with preview
 * - One-time key display with copy button
 * - Warning messages for security best practices
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 5
 */

"use client";

import React, { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ScopeSelector } from "./scope-selector";
import { Id } from "../../../convex/_generated/dataModel";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface CreateApiKeyDialogProps {
  organizationId: Id<"organizations">;
  sessionId: string;
  onSuccess?: (key: string) => void;
  onClose: () => void;
}

export function CreateApiKeyDialog({
  organizationId,
  sessionId,
  onSuccess,
  onClose,
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["*"]);
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Use useAction since generateApiKey is an Action
  const generateApiKey = useAction(api.actions.apiKeys.generateApiKey);

  const handleCreate = async () => {
    if (!name.trim()) {
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
        sessionId,
        organizationId,
        name: name.trim(),
        scopes: selectedScopes,
        type: "simple",
      });

      setCreatedKey(result.key);
      if (onSuccess) {
        onSuccess(result.key);
      }
    } catch (error: unknown) {
      alert(`Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;

    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  // If key is created, show the one-time display
  if (createdKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="rounded-lg shadow-xl max-w-2xl w-full p-6" style={{ background: 'var(--win95-bg)' }}>
          <div className="space-y-4">
            {/* Success Header */}
            <div className="flex items-center gap-3" style={{ color: 'var(--success)' }}>
              <CheckCircle2 className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--win95-text)' }}>
                  API Key Created!
                </h2>
                <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
                  Save this key now - it won't be shown again
                </p>
              </div>
            </div>

            {/* Key Display */}
            <div className="border-2 rounded-lg p-4" style={{
              background: 'var(--win95-bg-light)',
              borderColor: 'var(--error)'
            }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: 'var(--error)' }} />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
                    Save Your API Key Now
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--neutral-gray)' }}>
                    For security reasons, we can only show you this key once. Copy it
                    now and store it securely.
                  </p>

                  {/* Key Input with Copy Button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdKey}
                      readOnly
                      className="retro-input flex-1 font-mono text-sm"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={handleCopy}
                      className="retro-button px-4 py-2 rounded font-semibold transition-colors"
                      style={copied ? {
                        background: 'var(--success)',
                        color: 'var(--win95-titlebar-text)'
                      } : {
                        background: 'var(--win95-highlight)',
                        color: 'var(--win95-titlebar-text)'
                      }}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Instructions */}
            <div className="border-2 rounded-lg p-4" style={{
              background: 'var(--win95-bg-light)',
              borderColor: 'var(--win95-border)'
            }}>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
                Using Your API Key
              </h4>
              <p className="text-sm mb-3" style={{ color: 'var(--neutral-gray)' }}>
                Include this key in the Authorization header of your API requests:
              </p>
              <pre className="p-3 rounded text-xs overflow-x-auto" style={{
                background: 'var(--audio-player-bg)',
                color: 'var(--audio-player-text)'
              }}>
                {`Authorization: Bearer ${createdKey}`}
              </pre>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="retro-button px-6 py-2 rounded-lg font-semibold transition-colors"
                style={{
                  background: 'var(--win95-highlight)',
                  color: 'var(--win95-titlebar-text)'
                }}
              >
                Done - I've Saved My Key
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the creation form
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--win95-text)' }}>
              Create API Key
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Configure permissions and generate a new API key for programmatic access
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
              API Key Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Server, Mobile App, Analytics Pipeline"
              className="retro-input w-full"
              disabled={isCreating}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Choose a descriptive name to help identify this key's purpose
            </p>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
              Permissions
            </label>
            <ScopeSelector
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
              disabled={isCreating}
            />
          </div>

          {/* Security Best Practices */}
          <div className="border-2 rounded-lg p-4" style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}>
            <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <ShieldCheck className="w-4 h-4" />
              Security Best Practices
            </h4>
            <ul className="text-sm space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>• Use the minimum required permissions (principle of least privilege)</li>
              <li>• Create separate keys for different services or environments</li>
              <li>• Store keys securely (environment variables, secret managers)</li>
              <li>• Never commit keys to version control</li>
              <li>• Rotate keys regularly and revoke unused ones</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="retro-button px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{
                background: 'var(--win95-bg-light)',
                color: 'var(--win95-text)',
                borderColor: 'var(--win95-border)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || selectedScopes.length === 0}
              className="retro-button px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--win95-highlight)',
                color: 'var(--win95-titlebar-text)'
              }}
            >
              {isCreating ? "Creating..." : "Create API Key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
