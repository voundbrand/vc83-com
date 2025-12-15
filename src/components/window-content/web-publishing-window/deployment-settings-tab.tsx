"use client";

import { useState, useEffect } from "react";
import { Github, Save, Loader2, Plus, Settings2, Key, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";
import { EnvVarsModal } from "./env-vars-modal";

interface DeploymentSettingsTabProps {
  pageId: Id<"objects">;
  pageName: string;
}

/**
 * Deployment Settings Tab
 *
 * Comprehensive deployment configuration interface:
 * - GitHub source configuration
 * - Deployment targets (Vercel, Netlify, etc.)
 * - Environment variables management
 */
export function DeploymentSettingsTab({ pageId, pageName }: DeploymentSettingsTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();

  const [isSaving, setIsSaving] = useState(false);
  const [showEnvVarsModal, setShowEnvVarsModal] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);

  // Form state for GitHub configuration
  const [githubRepo, setGithubRepo] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubDirectory, setGithubDirectory] = useState("/");

  // Fetch existing deployment configuration
  const config = useQuery(
    api.deploymentOntology.getDeploymentConfigForPage,
    sessionId ? { sessionId, pageId } : "skip"
  );

  // Fetch deployment targets
  const targets = useQuery(
    api.deploymentOntology.getDeploymentTargets,
    config && sessionId ? { sessionId, configId: config._id } : "skip"
  );

  // Fetch environment variables (for first target if available)
  const firstTarget = targets && targets.length > 0 ? (targets[0] as any) : null;
  const envVars = useQuery(
    api.deploymentOntology.getEnvironmentVariables,
    firstTarget && sessionId ? { sessionId, targetId: firstTarget._id, includeValues: false } : "skip"
  );

  // Mutations
  const createConfig = useMutation(api.deploymentOntology.createDeploymentConfiguration);
  const updateConfig = useMutation(api.deploymentOntology.updateDeploymentConfiguration);
  const deleteConfig = useMutation(api.deploymentOntology.deleteDeploymentConfiguration);
  const deleteTarget = useMutation(api.deploymentOntology.deleteDeploymentTarget);

  // Load existing config into form
  useEffect(() => {
    if (config?.customProperties?.source) {
      setGithubRepo(config.customProperties.source.repositoryUrl || "");
      setGithubBranch(config.customProperties.source.branch || "main");
      setGithubDirectory(config.customProperties.source.directory || "/");
    }
  }, [config]);

  const handleSaveConfiguration = async () => {
    if (!sessionId || !currentOrg) return;

    // Validation
    if (!githubRepo) {
      notification.error("Validation Error", "GitHub repository URL is required", false);
      return;
    }

    if (!githubRepo.startsWith('https://github.com/')) {
      notification.error("Validation Error", "GitHub URL must start with 'https://github.com/'", false);
      return;
    }

    setIsSaving(true);

    try {
      if (config) {
        // Update existing configuration
        await updateConfig({
          sessionId,
          configId: config._id,
          source: {
            type: "github",
            repositoryId: githubRepo.split('/').slice(-2).join('/'),
            repositoryUrl: githubRepo,
            repositoryName: githubRepo.split('/').pop() || "",
            branch: githubBranch,
            directory: githubDirectory,
            autoSync: false,
          },
        });
        notification.success("Saved", "Deployment configuration updated successfully");
      } else {
        // Create new configuration
        await createConfig({
          sessionId,
          pageId,
          name: `${pageName} Deployment`,
          source: {
            type: "github",
            repositoryId: githubRepo.split('/').slice(-2).join('/'),
            repositoryUrl: githubRepo,
            repositoryName: githubRepo.split('/').pop() || "",
            branch: githubBranch,
            directory: githubDirectory,
            autoSync: false,
          },
        });
        notification.success("Created", "Deployment configuration created successfully");
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save configuration",
        false
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfiguration = async () => {
    if (!sessionId || !config) return;

    if (!confirm(`Are you sure you want to delete the deployment configuration for "${pageName}"? This will also delete all deployment targets and history.`)) {
      return;
    }

    setIsSaving(true);

    try {
      await deleteConfig({
        sessionId,
        configId: config._id,
      });
      notification.success("Deleted", "Deployment configuration deleted successfully");
    } catch (error) {
      console.error("Failed to delete configuration:", error);
      notification.error(
        "Delete Failed",
        error instanceof Error ? error.message : "Failed to delete configuration",
        false
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTarget = async (targetId: Id<"objects">) => {
    if (!sessionId) return;

    if (!confirm("Are you sure you want to delete this deployment target?")) {
      return;
    }

    try {
      await deleteTarget({
        sessionId,
        targetId,
      });
      notification.success("Deleted", "Deployment target deleted successfully");
    } catch (error) {
      console.error("Failed to delete target:", error);
      notification.error(
        "Delete Failed",
        error instanceof Error ? error.message : "Failed to delete target",
        false
      );
    }
  };

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to configure deployment settings.
      </div>
    );
  }

  if (config === undefined || targets === undefined || envVars === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          Deployment Settings for {pageName}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Configure GitHub source and deployment targets
        </p>
      </div>

      {/* Source Configuration */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Github size={16} />
          Source Configuration
        </h4>

        {/* GitHub Repository URL */}
        <div className="mb-3">
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            GitHub Repository URL *
          </label>
          <input
            type="text"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="https://github.com/your-username/your-repo"
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'white',
              color: 'var(--win95-text)'
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Your GitHub template repository
          </p>
        </div>

        {/* Branch and Directory */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
              Branch
            </label>
            <input
              type="text"
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'white',
                color: 'var(--win95-text)'
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
              Directory
            </label>
            <input
              type="text"
              value={githubDirectory}
              onChange={(e) => setGithubDirectory(e.target.value)}
              placeholder="/"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'white',
                color: 'var(--win95-text)'
              }}
            />
          </div>
        </div>

        {/* Status */}
        {config && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
              Status:
            </span>
            <span
              className="px-2 py-0.5 text-xs font-bold"
              style={{
                background: config.status === "active" ? 'var(--success)' : 'var(--neutral-gray)',
                color: 'white'
              }}
            >
              {config.status?.toUpperCase() || "UNKNOWN"}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <RetroButton
            onClick={handleSaveConfiguration}
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
                Save Configuration
              </>
            )}
          </RetroButton>

          {config && (
            <RetroButton
              onClick={handleDeleteConfiguration}
              variant="secondary"
              size="sm"
              disabled={isSaving}
            >
              <Trash2 size={14} />
              Delete Config
            </RetroButton>
          )}
        </div>
      </div>

      {/* Deployment Targets */}
      {config && (
        <div
          className="border-2 p-4"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <ExternalLink size={16} />
              Deployment Targets ({targets.length})
            </h4>
            <RetroButton
              onClick={() => setShowAddTargetModal(true)}
              variant="primary"
              size="sm"
            >
              <Plus size={14} />
              Add Target
            </RetroButton>
          </div>

          {targets.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--neutral-gray)' }}>
              No deployment targets configured. Add one to start deploying!
            </p>
          ) : (
            <div className="space-y-2">
              {targets.map((target: any) => (
                <div
                  key={target._id}
                  className="border-2 p-3 flex items-start justify-between"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'white'
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                        {target.provider === "vercel" ? "Vercel" : target.provider === "netlify" ? "Netlify" : "Unknown"}
                      </span>
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: target.status === "enabled" ? 'var(--success)' : 'var(--neutral-gray)',
                          color: 'white'
                        }}
                      >
                        {target.status?.toUpperCase() || "UNKNOWN"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      Project: <span className="font-bold">{target.projectId}</span>
                    </p>
                    {target.environment && (
                      <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        Environment: <span className="font-bold">{target.environment}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {/* TODO: Open edit target modal */}}
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: 'var(--win95-bg-light)',
                        color: 'var(--info)'
                      }}
                      title="Edit target"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--win95-hover-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--win95-bg-light)';
                      }}
                    >
                      <Settings2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteTarget(target._id)}
                      className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: 'var(--win95-bg-light)',
                        color: 'var(--error)'
                      }}
                      title="Delete target"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--win95-hover-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--win95-bg-light)';
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Environment Variables */}
      {config && (
        <div
          className="border-2 p-4"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Key size={16} />
              Environment Variables ({envVars.length})
            </h4>
            <RetroButton
              onClick={() => setShowEnvVarsModal(true)}
              variant="primary"
              size="sm"
            >
              <Settings2 size={14} />
              Manage Variables
            </RetroButton>
          </div>

          {envVars.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--neutral-gray)' }}>
              No environment variables configured
            </p>
          ) : (
            <div className="space-y-1">
              {envVars.map((envVar: any) => (
                <div
                  key={envVar._id}
                  className="text-xs px-2 py-1 border"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'white',
                    color: 'var(--win95-text)'
                  }}
                >
                  <span className="font-mono font-bold">{envVar.key}</span>
                  {envVar.targetEnvironment && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      ({envVar.targetEnvironment})
                    </span>
                  )}
                  {envVar.encrypted && (
                    <span className="ml-2" style={{ color: 'var(--warning)' }}>
                      🔒
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Environment Variables Modal */}
      {showEnvVarsModal && (
        <EnvVarsModal
          page={{ _id: pageId, name: pageName }}
          onClose={() => setShowEnvVarsModal(false)}
          onSaved={() => {
            setShowEnvVarsModal(false);
          }}
        />
      )}

      {/* Add Target Modal - TODO */}
      {showAddTargetModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddTargetModal(false);
          }}
        >
          <div
            className="border-4 shadow-lg max-w-md w-full mx-4"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)',
              boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{
                background: 'var(--win95-highlight)',
                color: 'white'
              }}
            >
              <h3 className="font-bold text-sm">Add Deployment Target</h3>
              <button onClick={() => setShowAddTargetModal(false)}>✕</button>
            </div>
            <div className="p-4">
              <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
                Coming soon! Use the Deploy tab to configure Vercel deployment.
              </p>
              <RetroButton
                onClick={() => setShowAddTargetModal(false)}
                variant="primary"
                size="sm"
              >
                Close
              </RetroButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
