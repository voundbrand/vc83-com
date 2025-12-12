"use client";

import { useState } from "react";
import { X, Save, Loader2, Github, ExternalLink } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";

interface DeploymentSettingsModalProps {
  page: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      deployment?: {
        githubRepo?: string;
        vercelDeployButton?: string;
        deploymentGuide?: string;
        demoUrl?: string;
      };
    };
  };
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Deployment Settings Editor Modal
 *
 * Allows users to configure GitHub and Vercel deployment URLs
 * for their published web apps.
 */
export function DeploymentSettingsModal({ page, onClose, onSaved }: DeploymentSettingsModalProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  const deployment = page.customProperties?.deployment || {};

  // Form state
  const [githubRepo, setGithubRepo] = useState(deployment.githubRepo || "");
  const [vercelDeployButton, setVercelDeployButton] = useState(deployment.vercelDeployButton || "");
  const [deploymentGuide, setDeploymentGuide] = useState(deployment.deploymentGuide || "");
  const [demoUrl, setDemoUrl] = useState(deployment.demoUrl || "");

  // Validation errors
  const [githubError, setGithubError] = useState("");
  const [vercelError, setVercelError] = useState("");

  const updateDeployment = useMutation(api.publishingOntology.updateDeploymentInfo);

  const handleSave = async () => {
    if (!sessionId) return;

    // Validate inputs
    let hasErrors = false;

    if (githubRepo && !githubRepo.startsWith('https://github.com/')) {
      setGithubError("GitHub URL must start with 'https://github.com/'");
      hasErrors = true;
    } else {
      setGithubError("");
    }

    if (vercelDeployButton && !vercelDeployButton.startsWith('https://vercel.com/new/clone')) {
      setVercelError("Vercel deploy URL must start with 'https://vercel.com/new/clone'");
      hasErrors = true;
    } else {
      setVercelError("");
    }

    if (hasErrors) return;

    setIsSaving(true);

    try {
      await updateDeployment({
        sessionId,
        pageId: page._id,
        githubRepo,
        vercelDeployButton,
      });

      notification.success("Saved", "Deployment settings updated successfully");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Failed to update deployment settings:", error);
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to update deployment settings",
        false
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="border-4 shadow-lg max-w-2xl w-full mx-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{
            background: 'var(--win95-highlight)',
            color: 'white'
          }}
        >
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Github size={16} />
            Deployment Settings - {page.name}
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
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            <p className="text-xs" style={{ color: 'var(--win95-text)' }}>
              Configure your deployment URLs to enable one-click deployment to Vercel.
              These URLs should point to your GitHub template repository and Vercel deploy button.
            </p>
          </div>

          {/* GitHub Repository URL */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              <Github size={14} className="inline mr-1" />
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/your-username/your-repo"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: githubError ? 'var(--error)' : 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--win95-text)'
              }}
            />
            {githubError && (
              <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                {githubError}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Your GitHub template repository that users will fork/clone
            </p>
          </div>

          {/* Vercel Deploy Button URL */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              <ExternalLink size={14} className="inline mr-1" />
              Vercel Deploy Button URL
            </label>
            <input
              type="text"
              value={vercelDeployButton}
              onChange={(e) => setVercelDeployButton(e.target.value)}
              placeholder="https://vercel.com/new/clone?repository-url=..."
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: vercelError ? 'var(--error)' : 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--win95-text)'
              }}
            />
            {vercelError && (
              <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                {vercelError}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Vercel one-click deploy URL with pre-configured environment variables
            </p>
          </div>

          {/* Helper: Generate Vercel URL */}
          <div
            className="mb-6 p-3 border-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: '#EEF2FF'
            }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: '#4338CA' }}>
              💡 Tip: Generate Vercel Deploy Button
            </p>
            <p className="text-xs mb-2" style={{ color: '#4338CA' }}>
              Use this format for the Vercel deploy button:
            </p>
            <code className="block text-xs p-2 border" style={{
              background: 'white',
              borderColor: 'var(--win95-border)',
              color: 'var(--win95-text)',
              overflowX: 'auto'
            }}>
              https://vercel.com/new/clone?repository-url=YOUR_GITHUB_URL&env=ENV_VAR_1,ENV_VAR_2
            </code>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <RetroButton
              onClick={onClose}
              variant="outline"
              size="sm"
              disabled={isSaving}
            >
              Cancel
            </RetroButton>

            <RetroButton
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
                  Save Settings
                </>
              )}
            </RetroButton>
          </div>
        </div>
      </div>
    </div>
  );
}
