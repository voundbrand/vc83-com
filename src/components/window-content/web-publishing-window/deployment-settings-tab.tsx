"use client";

import { useState } from "react";
import { Settings, Github, ExternalLink, Key, Copy, Plus, History, Save, Edit2, Sparkles } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";

interface DeploymentConfig {
  id?: string;
  name?: string;
  provider?: string;
  status?: string;
  lastDeployed?: number | null;
  deployedUrl?: string | null;
  githubRepo?: string;
  vercelUrl?: string;
}

interface DeploymentSettingsTabProps {
  pageId: Id<"objects">;
  pageName: string;
  deployment: DeploymentConfig;
  onOpenEnvVarsModal: () => void;
}

/**
 * Deployment Settings Tab - Contextual settings for selected deployment
 *
 * Shows all settings for the SELECTED deployment:
 * - GitHub configuration (repo, branch, directory)
 * - Deployment target (provider, project, environment)
 * - Environment variables (with copy buttons)
 * - Recent deployment history
 */
export function DeploymentSettingsTab({
  pageId,
  pageName,
  deployment,
  onOpenEnvVarsModal
}: DeploymentSettingsTabProps) {
  const { sessionId } = useAuth();
  const notification = useNotification();
  const [githubRepo, setGithubRepo] = useState(deployment?.githubRepo || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Query page data (may be needed for future features)
  useQuery(
    api.publishingOntology.getPublishedPageById,
    sessionId ? { sessionId, pageId } : "skip"
  );

  // Query environment variables
  const envVars = useQuery(
    api.publishingOntology.getDeploymentEnvVars,
    sessionId ? { sessionId, pageId } : "skip"
  );

  // Mutations and Actions
  const updateDeployment = useMutation(api.publishingOntology.updateDeploymentInfo);
  const updateEnvVars = useMutation(api.publishingOntology.updateDeploymentEnvVars);
  const autoDetectEnvVars = useAction(api.publishingOntology.autoDetectEnvVarsFromGithub);

  const handleSave = async () => {
    if (!sessionId) return;
    setIsSaving(true);
    try {
      await updateDeployment({
        sessionId,
        pageId,
        githubRepo,
      });
      notification.success("Saved", "Deployment settings updated successfully");
    } catch (error) {
      console.error("Failed to save deployment settings:", error);
      notification.error("Save Failed", error instanceof Error ? error.message : "Unknown error", false);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notification.success("Copied", `${label} copied to clipboard`);
  };

  const handleAutoDetectEnvVars = async () => {
    if (!sessionId || !githubRepo) {
      notification.error("Missing Info", "Please enter a GitHub repository URL first", false);
      return;
    }

    setIsAutoDetecting(true);
    try {
      const result = await autoDetectEnvVars({
        sessionId,
        githubUrl: githubRepo,
      });

      if (result.success && result.envVars.length > 0) {
        // Update the environment variables
        await updateEnvVars({
          sessionId,
          pageId,
          envVars: result.envVars,
        });

        notification.success(
          "Auto-Detected!",
          `Found ${result.envVars.length} environment variables from ${result.foundFile}`
        );
      } else {
        notification.error(
          "No Variables Found",
          result.error || "Could not find .env.example in repository",
          false
        );
      }
    } catch (error) {
      console.error("Failed to auto-detect env vars:", error);
      notification.error(
        "Detection Failed",
        error instanceof Error ? error.message : "Unknown error",
        false
      );
    } finally {
      setIsAutoDetecting(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to view deployment settings.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
          <Settings size={16} />
          Settings: {deployment.name}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Configure deployment settings for {pageName}
        </p>
      </div>

      {/* GitHub Configuration */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)'
        }}
      >
        <h4 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--window-document-text)' }}>
          <Github size={16} />
          GitHub Configuration
        </h4>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--window-document-text)' }}>
              Repository URL
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="w-full px-2 py-1 text-xs border-2"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'white',
                color: 'var(--window-document-text)'
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              The GitHub repository to deploy from
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: 'var(--window-document-text)' }}>
                Branch
              </label>
              <input
                type="text"
                value="main"
                readOnly
                className="w-full px-2 py-1 text-xs border-2"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)',
                  color: 'var(--neutral-gray)'
                }}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1" style={{ color: 'var(--window-document-text)' }}>
                Directory
              </label>
              <input
                type="text"
                value="/"
                readOnly
                className="w-full px-2 py-1 text-xs border-2"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'var(--window-document-bg-elevated)',
                  color: 'var(--neutral-gray)'
                }}
              />
            </div>
          </div>

          <InteriorButton
            onClick={handleSave}
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Changes"}
          </InteriorButton>
        </div>
      </div>

      {/* Deployment Target */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)'
        }}
      >
        <h4 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--window-document-text)' }}>
          <ExternalLink size={16} />
          Deployment Target
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
            <span style={{ color: 'var(--neutral-gray)' }}>Provider:</span>
            <span className="font-bold" style={{ color: 'var(--window-document-text)' }}>
              {deployment.provider === 'vercel' ? 'Vercel' : deployment.provider}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--window-document-border)' }}>
            <span style={{ color: 'var(--neutral-gray)' }}>Environment:</span>
            <span className="font-bold" style={{ color: 'var(--window-document-text)' }}>Production</span>
          </div>
          {deployment.deployedUrl && (
            <div className="flex items-center justify-between py-2">
              <span style={{ color: 'var(--neutral-gray)' }}>Deployed URL:</span>
              <a
                href={deployment.deployedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:underline"
                style={{ color: 'var(--tone-accent)' }}
              >
                {deployment.deployedUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
            <Key size={16} />
            Environment Variables ({envVars && Array.isArray(envVars) ? envVars.length : 0})
          </h4>
          <div className="flex items-center gap-2">
            <InteriorButton
              onClick={handleAutoDetectEnvVars}
              variant="outline"
              size="sm"
              disabled={!githubRepo || isAutoDetecting}
              className="flex items-center gap-2 whitespace-nowrap"
              title="Auto-detect environment variables from .env.example in GitHub repo"
            >
              <Sparkles size={14} />
              {isAutoDetecting ? "Detecting..." : "Auto-Detect"}
            </InteriorButton>
            <InteriorButton
              onClick={onOpenEnvVarsModal}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={14} />
              Add Variable
            </InteriorButton>
          </div>
        </div>

        {!envVars || (Array.isArray(envVars) && envVars.length === 0) ? (
          <div className="text-center py-4">
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              No environment variables configured for this deployment.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {Array.isArray(envVars) && envVars.map((envVar: { _id: string; key: string; value?: string; required?: boolean; description?: string }) => (
              <div
                key={envVar._id}
                className="flex items-center justify-between p-2 border-2"
                style={{
                  borderColor: 'var(--window-document-border)',
                  background: 'white'
                }}
              >
                <div className="flex-1 font-mono text-xs overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {envVar.key}
                    </span>
                    {envVar.required && (
                      <span
                        className="px-1.5 py-0.5 text-xs font-bold"
                        style={{
                          background: 'var(--error)',
                          color: 'white'
                        }}
                      >
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--neutral-gray)' }}>
                    {envVar.value ? (envVar.value.length > 50 ? envVar.value.substring(0, 50) + '...' : envVar.value) : '(not set)'}
                  </div>
                  {envVar.description && (
                    <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                      {envVar.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={onOpenEnvVarsModal}
                    className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      background: 'var(--window-document-bg-elevated)',
                      color: 'var(--tone-accent)'
                    }}
                    title="Edit environment variables"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
                    }}
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (envVar.value) {
                        copyToClipboard(envVar.value, envVar.key);
                      }
                    }}
                    className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      background: 'var(--window-document-bg-elevated)',
                      color: 'var(--info)'
                    }}
                    title={`Copy ${envVar.key}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
                    }}
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Deployments */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)'
        }}
      >
        <h4 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--window-document-text)' }}>
          <History size={16} />
          Recent Deployments
        </h4>
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            No deployment history yet. Deploy to see history here.
          </p>
        </div>
      </div>
    </div>
  );
}
