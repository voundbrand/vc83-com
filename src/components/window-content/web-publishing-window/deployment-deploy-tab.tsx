"use client";

import { useState, useEffect } from "react";
import { Rocket, AlertCircle, CheckCircle, ExternalLink, Settings, Loader2, RefreshCw, Copy } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";
import { useWindowManager } from "@/hooks/use-window-manager";

interface DeploymentDeployTabProps {
  pageId: Id<"objects">;
  pageName: string;
}

interface ValidationCheck {
  id: string;
  label: string;
  status: "idle" | "checking" | "passed" | "failed" | "warning";
  message?: string;
  fixAction?: () => void;
}

/**
 * Deployment Deploy Tab
 *
 * Unified deployment interface that consolidates:
 * - Deployment target selection
 * - Pre-flight validation checks
 * - Side-by-side environment variable copy/paste
 * - Deploy button to open Vercel
 */
export function DeploymentDeployTab({ pageId, pageName }: DeploymentDeployTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const { openWindow } = useWindowManager();

  const [checks, setChecks] = useState<ValidationCheck[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<Id<"objects"> | null>(null);

  // Fetch deployment configuration
  const config = useQuery(
    api.deploymentOntology.getDeploymentConfigForPage,
    sessionId ? { sessionId, pageId } : "skip"
  );

  // Fetch deployment targets
  const targets = useQuery(
    api.deploymentOntology.getDeploymentTargets,
    config && sessionId ? { sessionId, configId: config._id } : "skip"
  );

  // Fetch environment variables (for selected target)
  const envVars = useQuery(
    api.deploymentOntology.getEnvironmentVariables,
    selectedTargetId && sessionId ? { sessionId, targetId: selectedTargetId, includeValues: true } : "skip"
  );

  // Actions for validation
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

  const recordDeployment = useMutation(api.deploymentOntology.recordDeployment);

  // Auto-select first target if available
  useEffect(() => {
    if (targets && targets.length > 0 && !selectedTargetId) {
      const firstTarget = targets[0] as any;
      setSelectedTargetId(firstTarget._id);
    }
  }, [targets, selectedTargetId]);

  // Run validation checks
  const runValidation = async () => {
    if (!sessionId || !currentOrg || !config) {
      return;
    }

    setIsValidating(true);
    const newChecks: ValidationCheck[] = [];

    // CHECK 1: GitHub Repository URL
    const githubCheck: ValidationCheck = {
      id: "github_repo",
      label: "GitHub repository accessible",
      status: "checking",
      message: "Verifying repository exists...",
    };
    newChecks.push(githubCheck);
    setChecks([...newChecks]);

    if (config.customProperties?.source?.repositoryUrl) {
      try {
        const result = await validateGithubRepo({
          sessionId,
          githubUrl: config.customProperties.source.repositoryUrl,
        });

        githubCheck.status = result.valid ? "passed" : "failed";
        githubCheck.message = result.valid
          ? `✓ ${result.repoInfo?.owner}/${result.repoInfo?.repo} verified`
          : result.error || "Repository validation failed";
      } catch (error) {
        githubCheck.status = "failed";
        githubCheck.message = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    } else {
      githubCheck.status = "failed";
      githubCheck.message = "GitHub repository URL not configured";
    }
    setChecks([...newChecks]);

    // CHECK 2: GitHub Integration
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

    // CHECK 3: Vercel Integration
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

    // CHECK 4: Organization API Key
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

    // CHECK 5: Environment Variables
    const envVarsCheck: ValidationCheck = {
      id: "env_vars",
      label: "Environment variables documented",
      status: envVars === undefined ? "checking" : (envVars && Array.isArray(envVars) && envVars.length > 0 ? "passed" : "warning"),
      message: envVars === undefined
        ? "Loading environment variables configuration..."
        : (envVars && Array.isArray(envVars) && envVars.length > 0
          ? `✓ ${envVars.length} environment variable${envVars.length > 1 ? "s" : ""} documented`
          : "No environment variables configured - using defaults"),
    };
    newChecks.push(envVarsCheck);
    setChecks([...newChecks]);

    setIsValidating(false);
  };

  // Run validation on mount and when dependencies change
  useEffect(() => {
    const queriesLoaded = githubIntegration !== undefined &&
                          vercelIntegration !== undefined &&
                          apiKeyStatus !== undefined &&
                          envVars !== undefined &&
                          config !== undefined;

    if (sessionId && currentOrg && queriesLoaded && !isValidating && config) {
      runValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentOrg?.id, githubIntegration, vercelIntegration, apiKeyStatus, envVars, config]);

  // Check if all critical checks passed
  const allCriticalChecksPassed = checks.length > 0 &&
    !isValidating &&
    checks.find(c => c.id === "github_repo")?.status === "passed" &&
    checks.find(c => c.id === "github_integration")?.status === "passed" &&
    checks.find(c => c.id === "vercel_integration")?.status === "passed" &&
    checks.find(c => c.id === "api_key")?.status === "passed";

  const handleDeploy = async () => {
    if (!allCriticalChecksPassed || !sessionId || !selectedTargetId) return;

    setIsDeploying(true);

    try {
      // Record deployment in history
      await recordDeployment({
        sessionId,
        targetId: selectedTargetId,
        deploymentId: `deploy-${Date.now()}`,
        deploymentUrl: "",
        triggeredBy: "manual",
        commit: {
          sha: "unknown",
          message: "Manual deployment",
          author: "User",
          authorEmail: "user@example.com",
          timestamp: Date.now(),
        },
      });

      // Generate Vercel deploy URL from GitHub repo
      const githubRepo = config?.customProperties?.source?.repositoryUrl || "";
      if (githubRepo) {
        const vercelDeployUrl = `https://vercel.com/new/clone?repository-url=${encodeURIComponent(githubRepo)}`;
        window.open(vercelDeployUrl, '_blank');
        notification.success(
          "Deployment Started",
          "Vercel deployment window opened. Complete the deployment in the new tab."
        );
      }
    } catch (error) {
      console.error("Failed to record deployment:", error);
      notification.error(
        "Deployment Error",
        error instanceof Error ? error.message : "Failed to record deployment",
        false
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notification.success("Copied", `${label} copied to clipboard`);
  };

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to deploy.
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

  if (!config) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: 'var(--warning)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: 'var(--warning)' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                No Deployment Configuration
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                Please configure deployment settings in the Settings tab first.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: 'var(--warning)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: 'var(--warning)' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                No Deployment Targets
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                Please add a deployment target in the Settings tab first.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedTarget = targets.find((t: any) => t._id === selectedTargetId);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          Deploy {pageName}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Select target and deploy to hosting
        </p>
      </div>

      {/* Target Selection */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
          Select Deployment Target
        </h4>
        <div className="space-y-2">
          {targets.map((target: any) => (
            <label
              key={target._id}
              className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors"
              style={{
                borderColor: selectedTargetId === target._id ? 'var(--win95-highlight)' : 'var(--win95-border)',
                background: selectedTargetId === target._id ? 'var(--win95-hover-light)' : 'white'
              }}
            >
              <input
                type="radio"
                name="deployment-target"
                checked={selectedTargetId === target._id}
                onChange={() => setSelectedTargetId(target._id)}
                className="w-4 h-4"
              />
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
                    {target.status?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  Project: <span className="font-bold">{target.projectId}</span>
                  {target.environment && ` • Environment: ${target.environment}`}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Pre-flight Validation */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            Pre-flight Validation
          </h4>
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

        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className="flex items-start gap-3 p-3 border-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'white'
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {check.status === "checking" && (
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
                )}
                {check.status === "passed" && (
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Environment Variables Copy/Paste */}
      {envVars && envVars.length > 0 && (
        <div
          className="border-2 p-4"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--win95-text)' }}>
            Environment Variables
          </h4>
          <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
            Copy these values and paste them into Vercel when deploying:
          </p>
          <div className="space-y-2">
            {envVars.map((envVar: any) => (
              <div
                key={envVar._id}
                className="flex items-center justify-between p-2 border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'white'
                }}
              >
                <div className="flex-1 font-mono text-xs">
                  <span className="font-bold">{envVar.key}</span> = {envVar.value || "***"}
                </div>
                <button
                  onClick={() => copyToClipboard(envVar.value || "", envVar.key)}
                  className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors ml-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-bg-light)',
                    color: 'var(--info)'
                  }}
                  title={`Copy ${envVar.key}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--win95-hover-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--win95-bg-light)';
                  }}
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deploy Button */}
      <div
        className="border-2 p-4"
        style={{
          borderColor: allCriticalChecksPassed ? 'var(--success)' : 'var(--error)',
          background: allCriticalChecksPassed ? '#D1FAE5' : '#FEE2E2'
        }}
      >
        <div className="flex items-start gap-2 mb-3">
          {allCriticalChecksPassed ? (
            <CheckCircle size={20} style={{ color: 'var(--success)' }} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} style={{ color: 'var(--error)' }} className="flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1" style={{ color: allCriticalChecksPassed ? '#065F46' : '#991B1B' }}>
              {allCriticalChecksPassed ? "Ready to Deploy!" : "Cannot Deploy Yet"}
            </h4>
            <p className="text-xs" style={{ color: allCriticalChecksPassed ? '#065F46' : '#991B1B' }}>
              {allCriticalChecksPassed
                ? "All pre-flight checks passed. Click Deploy to open Vercel."
                : "Please fix the issues above before deploying."}
            </p>
          </div>
        </div>

        <RetroButton
          onClick={handleDeploy}
          variant="primary"
          size="md"
          disabled={!allCriticalChecksPassed || isDeploying}
        >
          {isDeploying ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Opening Vercel...
            </>
          ) : (
            <>
              <Rocket size={16} />
              Deploy to Vercel
            </>
          )}
        </RetroButton>
      </div>
    </div>
  );
}
