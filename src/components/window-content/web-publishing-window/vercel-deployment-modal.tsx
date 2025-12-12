"use client";

import { useState, useEffect } from "react";
import { X, Rocket, AlertCircle, CheckCircle, ExternalLink, Settings, Loader2, RefreshCw } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";
import { DeploymentSettingsModal } from "./deployment-settings-modal";
import { EnvVarsModal } from "./env-vars-modal";
import { useWindowManager } from "@/hooks/use-window-manager";

interface VercelDeploymentModalProps {
  page: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      templateCode?: string;
      deployment?: {
        githubRepo?: string;
        vercelDeployButton?: string;
        deployedUrl?: string | null;
        status?: string;
      };
    };
  };
  onClose: () => void;
  onEditPage: () => void;
}

interface ValidationCheck {
  id: string;
  label: string;
  status: "idle" | "checking" | "passed" | "failed" | "warning";
  message?: string;
  fixAction?: () => void;
}

/**
 * Vercel Deployment Pre-flight Modal with REAL validation
 *
 * Performs actual checks:
 * - HTTP request to GitHub API to verify repo exists
 * - HTTP request to Vercel to verify deploy URL
 * - Database query for GitHub integration
 * - Database query for Vercel integration
 * - Database query for active API keys
 * - Database query for environment variables documentation
 */
export function VercelDeploymentModal({ page, onClose, onEditPage }: VercelDeploymentModalProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const { openWindow } = useWindowManager();
  const [checks, setChecks] = useState<ValidationCheck[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnvVarsModal, setShowEnvVarsModal] = useState(false);

  // Query fresh page data to get updated deployment info
  const freshPage = useQuery(
    api.publishingOntology.getPublishedPageById,
    sessionId ? { sessionId, pageId: page._id } : "skip"
  );

  // Use fresh data if available, fall back to prop
  const deployment = (freshPage?.customProperties?.deployment as any) || page.customProperties?.deployment || {};

  // Actions for real HTTP validation
  const validateGithubRepo = useAction(api.publishingOntology.validateGithubRepo);
  const validateVercelUrl = useAction(api.publishingOntology.validateVercelDeployUrl);

  // Queries for integration status
  const githubIntegration = useQuery(
    api.publishingOntology.checkGithubIntegration,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  const vercelIntegration = useQuery(
    api.publishingOntology.checkVercelIntegration,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  const apiKeyStatus = useQuery(
    api.publishingOntology.checkApiKeyStatus,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  const envVars = useQuery(
    api.publishingOntology.getDeploymentEnvVars,
    sessionId ? { sessionId, pageId: page._id } : "skip"
  );

  const updateDeployment = useMutation(api.publishingOntology.updateDeploymentInfo);

  // Run REAL validation checks
  const runValidation = async () => {
    if (!sessionId || !currentOrg) {
      console.warn("[Pre-flight] Cannot run validation: missing sessionId or currentOrg");
      return;
    }

    setIsValidating(true);
    const newChecks: ValidationCheck[] = [];

    console.log("[Pre-flight] Running validation with:", {
      sessionId: !!sessionId,
      currentOrg: !!currentOrg,
      githubIntegration,
      vercelIntegration,
      apiKeyStatus,
      envVars
    });

    // CHECK 1: GitHub Repository URL (REAL HTTP validation)
    const githubCheck: ValidationCheck = {
      id: "github_repo",
      label: "GitHub repository accessible",
      status: "checking",
      message: "Verifying repository exists...",
    };
    newChecks.push(githubCheck);
    setChecks([...newChecks]);

    if (deployment.githubRepo) {
      try {
        const result = await validateGithubRepo({
          sessionId,
          githubUrl: deployment.githubRepo,
        });

        githubCheck.status = result.valid ? "passed" : "failed";
        githubCheck.message = result.valid
          ? `✓ ${result.repoInfo?.owner}/${result.repoInfo?.repo} verified`
          : result.error || "Repository validation failed";
        githubCheck.fixAction = !result.valid ? () => setShowEditModal(true) : undefined;
      } catch (error) {
        githubCheck.status = "failed";
        githubCheck.message = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        githubCheck.fixAction = () => setShowEditModal(true);
      }
    } else {
      githubCheck.status = "failed";
      githubCheck.message = "GitHub repository URL not configured";
      githubCheck.fixAction = () => setShowEditModal(true);
    }
    setChecks([...newChecks]);

    // CHECK 2: Vercel Deploy URL (REAL HTTP validation)
    const vercelUrlCheck: ValidationCheck = {
      id: "vercel_url",
      label: "Vercel deploy URL valid",
      status: "checking",
      message: "Validating Vercel deploy button...",
    };
    newChecks.push(vercelUrlCheck);
    setChecks([...newChecks]);

    if (deployment.vercelDeployButton) {
      try {
        const result = await validateVercelUrl({
          sessionId,
          vercelUrl: deployment.vercelDeployButton,
        });

        vercelUrlCheck.status = result.valid ? "passed" : "failed";
        vercelUrlCheck.message = result.valid
          ? `✓ Vercel deploy URL ready (${result.deployInfo?.envVars?.length || 0} env vars configured)`
          : result.error || "Vercel URL validation failed";
        vercelUrlCheck.fixAction = !result.valid ? () => setShowEditModal(true) : undefined;
      } catch (error) {
        vercelUrlCheck.status = "failed";
        vercelUrlCheck.message = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        vercelUrlCheck.fixAction = () => setShowEditModal(true);
      }
    } else {
      vercelUrlCheck.status = "failed";
      vercelUrlCheck.message = "Vercel deploy button URL not configured";
      vercelUrlCheck.fixAction = () => setShowEditModal(true);
    }
    setChecks([...newChecks]);

    // CHECK 3: GitHub Integration (Database query - REQUIRED NOW)
    const githubIntCheck: ValidationCheck = {
      id: "github_integration",
      label: "GitHub integration connected",
      status: githubIntegration === undefined ? "checking" : (githubIntegration.connected ? "passed" : "failed"),
      message: githubIntegration === undefined
        ? "Checking GitHub OAuth connection..."
        : (githubIntegration.connected
          ? `✓ Connected: ${githubIntegration.integration?.name}`
          : "GitHub integration not connected - required for deployment"),
    };

    if (githubIntegration !== undefined && !githubIntegration.connected) {
      githubIntCheck.fixAction = () => {
        // Open Integrations window
        import("@/components/window-content/integrations-window").then(({ IntegrationsWindow }) => {
          openWindow(
            "integrations",
            "Integrations & API",
            <IntegrationsWindow />,
            undefined,
            undefined,
            "ui.windows.integrations.title",
            "🔗"
          );
        });
        notification.info("Opening Integrations", "Opening Integrations window - select GitHub from the list");
      };
    }
    newChecks.push(githubIntCheck);
    setChecks([...newChecks]);

    // CHECK 4: Vercel Integration (Database query - REQUIRED NOW)
    const vercelIntCheck: ValidationCheck = {
      id: "vercel_integration",
      label: "Vercel integration connected",
      status: vercelIntegration === undefined ? "checking" : (vercelIntegration.connected ? "passed" : "failed"),
      message: vercelIntegration === undefined
        ? "Checking Vercel OAuth connection..."
        : (vercelIntegration.connected
          ? `✓ Connected: ${vercelIntegration.integration?.name}`
          : "Vercel integration not connected - required for deployment"),
    };

    if (vercelIntegration !== undefined && !vercelIntegration.connected) {
      vercelIntCheck.fixAction = () => {
        // Open Integrations window
        import("@/components/window-content/integrations-window").then(({ IntegrationsWindow }) => {
          openWindow(
            "integrations",
            "Integrations & API",
            <IntegrationsWindow />,
            undefined,
            undefined,
            "ui.windows.integrations.title",
            "🔗"
          );
        });
        notification.info("Opening Integrations", "Opening Integrations window - select Vercel from the list");
      };
    }
    newChecks.push(vercelIntCheck);
    setChecks([...newChecks]);

    // CHECK 5: Organization API Key (Database query)
    const apiKeyCheck: ValidationCheck = {
      id: "api_key",
      label: "Organization API key active",
      status: apiKeyStatus === undefined ? "checking" : (apiKeyStatus.hasApiKey ? "passed" : "failed"),
      message: apiKeyStatus === undefined
        ? "Checking for active API keys..."
        : (apiKeyStatus.hasApiKey
          ? `✓ ${apiKeyStatus.count || 0} active API key${(apiKeyStatus.count || 0) > 1 ? "s" : ""} available`
          : "No active API keys found - required for deployment"),
    };

    if (apiKeyStatus !== undefined && !apiKeyStatus.hasApiKey) {
      apiKeyCheck.fixAction = () => {
        // Open Integrations window to API Keys panel
        import("@/components/window-content/integrations-window").then(({ IntegrationsWindow }) => {
          openWindow(
            "integrations",
            "Integrations & API",
            <IntegrationsWindow initialPanel="api-keys" />,
            undefined,
            undefined,
            "ui.windows.integrations.title",
            "🔗",
            { initialPanel: "api-keys" }
          );
        });
        notification.info("Opening API Keys", "Opening Integrations window - API Keys panel");
      };
    }
    newChecks.push(apiKeyCheck);
    setChecks([...newChecks]);

    // CHECK 6: Environment Variables Documented (Database query)
    const envVarsCheck: ValidationCheck = {
      id: "env_vars",
      label: "Environment variables documented",
      status: envVars === undefined ? "checking" : (envVars && Array.isArray(envVars) && envVars.length > 0 ? "passed" : "warning"),
      message: envVars === undefined
        ? "Loading environment variables configuration..."
        : (envVars && Array.isArray(envVars) && envVars.length > 0
          ? `✓ ${envVars.length} environment variable${envVars.length > 1 ? "s" : ""} documented (${Array.isArray(envVars) ? envVars.filter((v: any) => v.required).length : 0} required)`
          : "No environment variables configured - using defaults"),
      fixAction: () => setShowEnvVarsModal(true),
    };
    newChecks.push(envVarsCheck);
    setChecks([...newChecks]);

    setIsValidating(false);
  };

  // Run validation on mount and when dependencies change
  // Only run when we have sessionId, currentOrg, AND the queries have loaded (not undefined)
  useEffect(() => {
    const queriesLoaded = githubIntegration !== undefined &&
                          vercelIntegration !== undefined &&
                          apiKeyStatus !== undefined &&
                          envVars !== undefined;

    console.log("[Pre-flight] useEffect triggered:", {
      sessionId: !!sessionId,
      currentOrg: !!currentOrg,
      queriesLoaded,
      isValidating,
      githubIntegration,
      vercelIntegration,
      apiKeyStatus,
      envVars: envVars ? "loaded" : "undefined"
    });

    if (sessionId && currentOrg && queriesLoaded && !isValidating) {
      runValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentOrg?.id, githubIntegration, vercelIntegration, apiKeyStatus, envVars]);

  // Check if all CRITICAL checks passed (GitHub repo + Vercel URL + GitHub integration + Vercel integration + API key)
  const allCriticalChecksPassed = checks.length > 0 &&
    !isValidating &&
    checks.find(c => c.id === "github_repo")?.status === "passed" &&
    checks.find(c => c.id === "vercel_url")?.status === "passed" &&
    checks.find(c => c.id === "github_integration")?.status === "passed" &&
    checks.find(c => c.id === "vercel_integration")?.status === "passed" &&
    checks.find(c => c.id === "api_key")?.status === "passed";

  const handleDeploy = async () => {
    if (!allCriticalChecksPassed || !sessionId) return;

    setIsDeploying(true);

    try {
      // Track deployment attempt
      await updateDeployment({
        sessionId,
        pageId: page._id,
        deploymentStatus: "deploying",
      });

      // Open Vercel deploy in new tab
      if (deployment.vercelDeployButton) {
        window.open(deployment.vercelDeployButton, '_blank');
        notification.success(
          "Deployment Started",
          "Vercel deployment window opened. Complete the deployment in the new tab."
        );
      }

      onClose();
    } catch (error) {
      console.error("Failed to track deployment:", error);
      notification.error(
        "Tracking Failed",
        "Deployment tracking failed, but you can still deploy manually.",
        false
      );
      setIsDeploying(false);
    }
  };

  return (
    <>
      {/* Pre-flight Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="border-4 shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg)',
            boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div
          className="px-4 py-2 flex items-center justify-between sticky top-0 z-10"
          style={{
            background: 'var(--win95-highlight)',
            color: 'white'
          }}
        >
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Rocket size={16} />
            Deploy to Vercel - Pre-flight Validation
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
          {/* Page info */}
          <div className="mb-4 pb-4 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
            <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--win95-text)' }}>
              {page.name}
            </h4>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Running real validation checks (HTTP requests + database queries)...
            </p>
          </div>

          {/* Validation Checks */}
          <div className="space-y-3 mb-6">
            {checks.map((check) => {
              // Determine if this is an integration check that passed
              const isIntegrationConnected =
                check.status === "passed" &&
                (check.id === "github_integration" || check.id === "vercel_integration" || check.id === "api_key");

              return (
                <div
                  key={check.id}
                  className="flex items-start gap-3 p-3 border-2 relative overflow-hidden"
                  style={{
                    borderColor: isIntegrationConnected ? '#22c55e' : 'var(--win95-border)',
                    background: isIntegrationConnected
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
                      : 'var(--win95-bg-light)',
                    boxShadow: isIntegrationConnected ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
                  }}
                >
                  {/* Green checkmark overlay for connected integrations */}
                  {isIntegrationConnected && (
                    <div
                      className="absolute top-2 right-2 bg-green-500 rounded-full p-1"
                      style={{ boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)' }}
                    >
                      <CheckCircle size={16} style={{ color: 'white' }} />
                    </div>
                  )}

                  <div className="flex-shrink-0 mt-0.5">
                    {check.status === "idle" && (
                      <div className="w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--neutral-gray)' }} />
                    )}
                    {check.status === "checking" && (
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
                    )}
                    {check.status === "passed" && (
                      <CheckCircle size={20} style={{ color: '#22c55e', fontWeight: 'bold' }} />
                    )}
                    {check.status === "failed" && (
                      <AlertCircle size={20} style={{ color: 'var(--error)' }} />
                    )}
                    {check.status === "warning" && (
                      <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
                    )}
                  </div>
                <div className="flex-1">
                  <div className="font-bold text-xs mb-1" style={{ color: 'var(--win95-text)' }}>
                    {check.label}
                  </div>
                  {check.message && (
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      {check.message}
                    </div>
                  )}
                  {check.fixAction && check.status === "failed" && (
                    <button
                      onClick={check.fixAction}
                      className="mt-2 px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: 'var(--error)',
                        background: 'var(--win95-bg)',
                        color: 'var(--error)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--win95-hover-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--win95-bg)';
                      }}
                    >
                      <Settings size={12} />
                      Fix This
                    </button>
                  )}
                  {check.fixAction && check.status === "warning" && (
                    <button
                      onClick={check.fixAction}
                      className="mt-2 px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                      style={{
                        borderColor: 'var(--warning)',
                        background: 'var(--win95-bg)',
                        color: 'var(--warning)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--win95-hover-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--win95-bg)';
                      }}
                    >
                      <Settings size={12} />
                      Configure
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Action Required Section */}
          {!isValidating && !allCriticalChecksPassed && checks.length > 0 && (
            <div
              className="mb-6 p-4 border-2"
              style={{
                borderColor: 'var(--error)',
                background: '#FEE2E2'
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={20} style={{ color: 'var(--error)' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--error)' }}>
                    Critical Issues Found
                  </h4>
                  <ul className="text-xs space-y-1" style={{ color: '#991B1B' }}>
                    {checks.filter(c => c.status === "failed").map((check) => (
                      <li key={check.id} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{check.message || check.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2" style={{ color: '#991B1B' }}>
                    Click "Fix This" buttons above to resolve these issues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Section */}
          {!isValidating && allCriticalChecksPassed && (
            <div
              className="mb-6 p-4 border-2"
              style={{
                borderColor: 'var(--success)',
                background: '#D1FAE5'
              }}
            >
              <div className="flex items-start gap-2">
                <CheckCircle size={20} style={{ color: 'var(--success)' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#065F46' }}>
                    Ready to Deploy!
                  </h4>
                  <p className="text-xs mb-2" style={{ color: '#065F46' }}>
                    All critical pre-flight checks passed. Your deployment is ready to proceed.
                  </p>
                  {checks.some(c => c.status === "warning") && (
                    <p className="text-xs" style={{ color: '#D97706' }}>
                      ⚠️ Some optional checks have warnings. Deployment will work, but consider addressing them for better experience.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <RetroButton
                onClick={runValidation}
                variant="secondary"
                size="sm"
                disabled={isValidating}
              >
                <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} />
                Re-validate
              </RetroButton>
            </div>

            <div className="flex items-center gap-2">
              <RetroButton
                onClick={onClose}
                variant="outline"
                size="sm"
              >
                Cancel
              </RetroButton>

              {allCriticalChecksPassed && (
                <RetroButton
                  onClick={handleDeploy}
                  variant="primary"
                  size="sm"
                  disabled={isDeploying}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Opening Vercel...
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} />
                      Deploy to Vercel
                    </>
                  )}
                </RetroButton>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Deployment Settings Edit Modal - rendered as sibling, not nested */}
      {showEditModal && (
        <DeploymentSettingsModal
          page={page}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            runValidation(); // Re-run validation after saving
          }}
        />
      )}

      {/* Environment Variables Modal - rendered as sibling, not nested */}
      {showEnvVarsModal && (
        <EnvVarsModal
          page={page}
          onClose={() => setShowEnvVarsModal(false)}
          onSaved={() => {
            setShowEnvVarsModal(false);
            runValidation(); // Re-run validation after saving
          }}
        />
      )}
    </>
  );
}
