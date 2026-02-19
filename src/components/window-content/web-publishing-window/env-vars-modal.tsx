"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Plus, Trash2, FileCode } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";

interface EnvVarsModalProps {
  page: {
    _id: Id<"objects">;
    name: string;
  };
  onClose: () => void;
  onSaved?: () => void;
}

interface EnvVar {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Environment Variables Editor Modal
 *
 * Allows users to document required environment variables for deployment.
 * These are shown to users during Vercel setup and stored in the database.
 */
export function EnvVarsModal({ page, onClose, onSaved }: EnvVarsModalProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  // Fetch current env vars
  const currentEnvVars = useQuery(
    api.publishingOntology.getDeploymentEnvVars,
    sessionId ? { sessionId, pageId: page._id } : "skip"
  );

  const updateEnvVars = useMutation(api.publishingOntology.updateDeploymentEnvVars);

  // Initialize env vars from database
  useEffect(() => {
    if (currentEnvVars && Array.isArray(currentEnvVars)) {
      setEnvVars(currentEnvVars);
    }
  }, [currentEnvVars]);

  const handleAddEnvVar = () => {
    setEnvVars([
      ...envVars,
      {
        key: "",
        description: "",
        required: true,
        defaultValue: "",
      },
    ]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleUpdateEnvVar = (index: number, field: keyof EnvVar, value: string | boolean) => {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: value };
    setEnvVars(updated);
  };

  const handleSave = async () => {
    if (!sessionId) return;

    // Validate that all required fields are filled
    for (let i = 0; i < envVars.length; i++) {
      const envVar = envVars[i];
      if (!envVar.key.trim()) {
        notification.error("Validation Error", `Environment variable #${i + 1} is missing a key`, false);
        return;
      }
      if (!envVar.description.trim()) {
        notification.error("Validation Error", `Environment variable #${i + 1} is missing a description`, false);
        return;
      }
    }

    setIsSaving(true);

    try {
      await updateEnvVars({
        sessionId,
        pageId: page._id,
        envVars: envVars.map(ev => ({
          key: ev.key.trim(),
          description: ev.description.trim(),
          required: ev.required,
          defaultValue: ev.defaultValue?.trim() || undefined,
        })),
      });

      notification.success("Saved", "Environment variables updated successfully");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Failed to update environment variables:", error);
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to update environment variables",
        false
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="border-4 shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-2 flex items-center justify-between sticky top-0 z-10"
          style={{
            background: 'var(--tone-accent)',
            color: 'white'
          }}
        >
          <h3 className="font-bold text-sm flex items-center gap-2">
            <FileCode size={16} />
            Environment Variables - {page.name}
          </h3>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Instructions */}
          <div
            className="mb-6 p-4 border-2"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)'
            }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--window-document-text)' }}>
              Document the environment variables required for deploying this page to Vercel.
              These will be shown to users during deployment setup.
            </p>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              <strong>Example variables:</strong> NEXT_PUBLIC_API_URL, NEXT_PUBLIC_API_KEY, DATABASE_URL, etc.
            </p>
          </div>

          {/* Environment Variables List */}
          <div className="space-y-4 mb-6">
            {envVars.map((envVar, index) => (
              <div
                key={index}
                className="p-4 border-2"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                    Environment Variable #{index + 1}
                  </h4>
                  <button
                    onClick={() => handleRemoveEnvVar(index)}
                    className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                    style={{
                      borderColor: 'var(--error)',
                      background: 'var(--window-document-bg)',
                      color: 'var(--error)'
                    }}
                    title="Remove this environment variable"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--window-document-bg)';
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Key */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                      Variable Key * <span style={{ color: 'var(--error)' }}>Required</span>
                    </label>
                    <input
                      type="text"
                      value={envVar.key}
                      onChange={(e) => handleUpdateEnvVar(index, 'key', e.target.value.toUpperCase())}
                      placeholder="NEXT_PUBLIC_API_URL"
                      className="w-full px-3 py-2 text-sm border-2 font-mono"
                      style={{
                        borderColor: 'var(--window-document-border)',
                        background: 'var(--window-document-bg)',
                        color: 'var(--window-document-text)'
                      }}
                    />
                  </div>

                  {/* Default Value */}
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                      Default Value <span style={{ color: 'var(--neutral-gray)' }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={envVar.defaultValue || ""}
                      onChange={(e) => handleUpdateEnvVar(index, 'defaultValue', e.target.value)}
                      placeholder="https://app.l4yercak3.com/api/v1"
                      className="w-full px-3 py-2 text-sm border-2 font-mono"
                      style={{
                        borderColor: 'var(--window-document-border)',
                        background: 'var(--window-document-bg)',
                        color: 'var(--window-document-text)'
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mt-3">
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Description * <span style={{ color: 'var(--error)' }}>Required</span>
                  </label>
                  <textarea
                    value={envVar.description}
                    onChange={(e) => handleUpdateEnvVar(index, 'description', e.target.value)}
                    placeholder="Your l4yercak3 API URL for making requests to the platform..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border-2"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      background: 'var(--window-document-bg)',
                      color: 'var(--window-document-text)'
                    }}
                  />
                </div>

                {/* Required Checkbox */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`required-${index}`}
                    checked={envVar.required}
                    onChange={(e) => handleUpdateEnvVar(index, 'required', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor={`required-${index}`} className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                    This variable is required for deployment
                  </label>
                </div>
              </div>
            ))}

            {/* Add Button */}
            <button
              onClick={handleAddEnvVar}
              className="w-full px-4 py-3 border-2 flex items-center justify-center gap-2 transition-colors"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)',
                color: 'var(--tone-accent)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--desktop-menu-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
              }}
            >
              <Plus size={16} />
              Add Environment Variable
            </button>
          </div>

          {/* Info Box */}
          {envVars.length === 0 && (
            <div
              className="mb-6 p-4 border-2"
              style={{
                borderColor: 'var(--warning)',
                background: '#FEF3C7'
              }}
            >
              <p className="text-xs" style={{ color: '#92400E' }}>
                No environment variables configured. Click "Add Environment Variable" to document variables needed for deployment.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <InteriorButton
              onClick={onClose}
              variant="outline"
              size="sm"
              disabled={isSaving}
            >
              Cancel
            </InteriorButton>

            <InteriorButton
              onClick={handleSave}
              variant="primary"
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Variables
                </>
              )}
            </InteriorButton>
          </div>
        </div>
      </div>
    </div>
  );
}
