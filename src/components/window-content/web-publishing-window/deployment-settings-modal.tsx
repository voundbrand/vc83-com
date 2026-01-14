"use client";

import { useState } from "react";
import { X, Save, Loader2, Github, ExternalLink, RefreshCw } from "lucide-react";
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
  const [isGenerating, setIsGenerating] = useState(false);

  const deployment = page.customProperties?.deployment || {};

  // Form state
  const [githubRepo, setGithubRepo] = useState(deployment.githubRepo || "");
  const [vercelDeployButton, setVercelDeployButton] = useState(deployment.vercelDeployButton || "");
  // Preserved for future guide and demo URL features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deploymentGuide, setDeploymentGuide] = useState(deployment.deploymentGuide || "");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [demoUrl, setDemoUrl] = useState(deployment.demoUrl || "");

  // Validation errors
  const [githubError, setGithubError] = useState("");

  const updateDeployment = useMutation(api.publishingOntology.updateDeploymentInfo);
  const autoGenerateVercelUrl = useMutation(api.publishingOntology.autoGenerateVercelDeployUrl);

  // Auto-generate Vercel deploy URL from GitHub repo
  const handleGenerateVercelUrl = async () => {
    if (!sessionId || !githubRepo) {
      notification.error("Validation Error", "Please enter a GitHub repository URL first", false);
      return;
    }

    // Validate GitHub URL format
    if (!githubRepo.startsWith('https://github.com/')) {
      setGithubError("GitHub URL must start with 'https://github.com/'");
      return;
    }

    setIsGenerating(true);
    setGithubError("");

    try {
      const result = await autoGenerateVercelUrl({
        sessionId,
        pageId: page._id,
        githubRepo,
      });

      setVercelDeployButton(result.vercelDeployButton);
      notification.success("Generated", "Vercel deploy URL generated automatically");
    } catch (error) {
      console.error("Failed to generate Vercel URL:", error);
      notification.error(
        "Generation Failed",
        error instanceof Error ? error.message : "Failed to generate Vercel deploy URL",
        false
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId) return;

    // Validate GitHub URL
    if (githubRepo && !githubRepo.startsWith('https://github.com/')) {
      setGithubError("GitHub URL must start with 'https://github.com/'");
      return;
    } else {
      setGithubError("");
    }

    setIsSaving(true);

    try {
      // If GitHub repo changed but Vercel URL is empty, auto-generate it
      if (githubRepo && !vercelDeployButton) {
        const result = await autoGenerateVercelUrl({
          sessionId,
          pageId: page._id,
          githubRepo,
        });
        setVercelDeployButton(result.vercelDeployButton);
        notification.success("Saved", "Deployment settings updated with auto-generated Vercel URL");
      } else {
        await updateDeployment({
          sessionId,
          pageId: page._id,
          githubRepo,
          vercelDeployButton,
        });
        notification.success("Saved", "Deployment settings updated successfully");
      }

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
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
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

          {/* Vercel Deploy Button URL (Auto-generated from GitHub) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                <ExternalLink size={14} className="inline mr-1" />
                Vercel Deploy Button URL
              </label>
              <button
                onClick={handleGenerateVercelUrl}
                disabled={!githubRepo || isGenerating}
                className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors disabled:opacity-50"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg)',
                  color: 'var(--win95-highlight)'
                }}
                title="Auto-generate from GitHub repo URL"
                onMouseEnter={(e) => {
                  if (githubRepo && !isGenerating) {
                    e.currentTarget.style.background = 'var(--win95-hover-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--win95-bg)';
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={12} />
                    Auto-Generate
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={vercelDeployButton}
              readOnly
              placeholder="Click 'Auto-Generate' after entering GitHub URL"
              className="w-full px-3 py-2 text-sm border-2 cursor-not-allowed"
              style={{
                borderColor: 'var(--win95-border)',
                background: '#F9FAFB',
                color: 'var(--neutral-gray)'
              }}
              title="This URL is auto-generated from your GitHub repository"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              ✨ Automatically generated from GitHub repo with environment variables
            </p>
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
