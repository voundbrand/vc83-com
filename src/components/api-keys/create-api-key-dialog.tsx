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
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ScopeSelector } from "./scope-selector";
import { Id } from "../../../convex/_generated/dataModel";

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

  // Use useAction instead of useMutation since generateApiKey is an Action
  const generateApiKey = useMutation(api.actions.apiKeys.generateApiKey as any);

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
    } catch (error: any) {
      alert(`Failed to create API key: ${error.message}`);
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
    } catch (error) {
      alert("Failed to copy to clipboard");
    }
  };

  // If key is created, show the one-time display
  if (createdKey) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="space-y-4">
            {/* Success Header */}
            <div className="flex items-center gap-3 text-green-600">
              <div className="text-3xl">✓</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  API Key Created!
                </h2>
                <p className="text-sm text-gray-600">
                  Save this key now - it won't be shown again
                </p>
              </div>
            </div>

            {/* Key Display */}
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 text-xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Save Your API Key Now
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    For security reasons, we can only show you this key once. Copy it
                    now and store it securely.
                  </p>

                  {/* Key Input with Copy Button */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdKey}
                      readOnly
                      className="flex-1 px-3 py-2 border border-red-300 rounded bg-white font-mono text-sm"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={handleCopy}
                      className={`px-4 py-2 rounded font-semibold transition-colors ${
                        copied
                          ? "bg-green-600 text-white"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Using Your API Key
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                Include this key in the Authorization header of your API requests:
              </p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                {`Authorization: Bearer ${createdKey}`}
              </pre>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Create API Key
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure permissions and generate a new API key for programmatic access
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              API Key Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Server, Mobile App, Analytics Pipeline"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a descriptive name to help identify this key's purpose
            </p>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Permissions
            </label>
            <ScopeSelector
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
              disabled={isCreating}
            />
          </div>

          {/* Security Best Practices */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              🔒 Security Best Practices
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
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
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || selectedScopes.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create API Key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
