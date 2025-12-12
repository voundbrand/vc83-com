"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Rocket, AlertCircle, CheckCircle, ExternalLink, Settings, Loader2 } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";
import { DeploymentSettingsModal } from "./deployment-settings-modal";

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
  status: "checking" | "passed" | "failed" | "warning";
  message?: string;
}

/**
 * Vercel Deployment Pre-flight Modal
 *
 * Shows validation checks before deploying to Vercel:
 * - GitHub repository configured
 * - Vercel deploy button URL configured
 * - Organization has API key (needed for deployment env vars)
 */
export function VercelDeploymentModal({ page, onClose, onEditPage }: VercelDeploymentModalProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const [isValidating, setIsValidating] = useState(true);
  const [checks, setChecks] = useState<ValidationCheck[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const updateDeployment = useMutation(api.publishingOntology.updateDeploymentInfo);

  // Fetch API keys to check if organization has any configured
  const apiKeys = useQuery(
    api.api.auth.listApiKeys,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  const deployment = page.customProperties?.deployment || {};

  // Run validation checks
  useEffect(() => {
    if (!sessionId || !currentOrg) return;

    const runValidation = async () => {
      setIsValidating(true);

      const newChecks: ValidationCheck[] = [];

      // Check 1: GitHub repository URL
      const hasGithubRepo = Boolean(
        deployment.githubRepo &&
        deployment.githubRepo.startsWith('https://github.com/')
      );
      newChecks.push({
        id: "github_repo",
        label: "GitHub repository configured",
        status: hasGithubRepo ? "passed" : "failed",
        message: hasGithubRepo
          ? deployment.githubRepo
          : "GitHub repository URL is missing or invalid"
      });

      // Check 2: Vercel deploy button URL
      const hasVercelUrl = Boolean(
        deployment.vercelDeployButton &&
        deployment.vercelDeployButton.startsWith('https://vercel.com/new/clone')
      );
      newChecks.push({
        id: "vercel_url",
        label: "Vercel deploy URL configured",
        status: hasVercelUrl ? "passed" : "failed",
        message: hasVercelUrl
          ? "Vercel one-click deploy ready"
          : "Vercel deploy button URL is missing or invalid"
      });

      // Check 3: API key exists (wait for query to load)
      if (apiKeys !== undefined) {
        const hasApiKey = apiKeys && apiKeys.length > 0;
        newChecks.push({
          id: "api_key",
          label: "Organization API key",
          status: hasApiKey ? "passed" : "warning",
          message: hasApiKey
            ? "API key available for deployment"
            : "No API key found. You'll need to create one in Integrations > API Keys"
        });
      } else {
        // Still loading
        newChecks.push({
          id: "api_key",
          label: "Organization API key",
          status: "checking",
          message: "Checking for API keys..."
        });
      }

      // Check 4: Environment variables documented
      const envVarsDocumented = true; // Always true - we document them in the deployment
      newChecks.push({
        id: "env_vars",
        label: "Environment variables documented",
        status: envVarsDocumented ? "passed" : "warning",
        message: "Required environment variables will be shown during deployment"
      });

      setChecks(newChecks);
      setIsValidating(false);
    };

    runValidation();
  }, [sessionId, currentOrg, deployment, apiKeys]);

  // Check if all critical checks passed
  const allChecksPassed = useMemo(() => {
    if (isValidating || checks.length === 0) return false;
    // Must have GitHub repo and Vercel URL
    const criticalChecks = checks.filter(c => ["github_repo", "vercel_url"].includes(c.id));
    return criticalChecks.every(c => c.status === "passed");
  }, [checks, isValidating]);

  const handleDeploy = async () => {
    if (!allChecksPassed || !sessionId) return;

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

  const handleFixIssues = () => {
    setShowEditModal(true);
  };

  const handleEditSaved = () => {
    // Close edit modal and re-run validation
    setShowEditModal(false);
    setIsValidating(true);

    // Force re-check after a brief delay to let the mutation complete
    setTimeout(() => {
      window.location.reload(); // Simple approach: reload to get fresh data
    }, 500);
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
            <Rocket size={16} />
            Deploy to Vercel - Pre-flight Check
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
              Checking deployment requirements...
            </p>
          </div>

          {/* Validation Checks */}
          <div className="space-y-3 mb-6">
            {checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-3 p-3 border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {check.status === "checking" && (
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
                  )}
                  {check.status === "passed" && (
                    <CheckCircle size={20} style={{ color: 'var(--success)' }} />
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
                </div>
              </div>
            ))}
          </div>

          {/* Action Required Section */}
          {!isValidating && !allChecksPassed && (
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
                    Action Required
                  </h4>
                  <ul className="text-xs space-y-1" style={{ color: '#991B1B' }}>
                    {checks.filter(c => c.status === "failed").map((check) => (
                      <li key={check.id} className="flex items-start gap-1">
                        <span>•</span>
                        <span>
                          {check.id === "github_repo" && "Configure GitHub repository URL"}
                          {check.id === "vercel_url" && "Configure Vercel deploy button URL"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success Section */}
          {!isValidating && allChecksPassed && (
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
                    All pre-flight checks passed. Clicking "Deploy to Vercel" will open Vercel in a new tab with pre-configured settings.
                  </p>
                  {checks.find(c => c.id === "api_key" && c.status === "warning") && (
                    <p className="text-xs" style={{ color: '#D97706' }}>
                      ⚠️ Note: Create an API key in Integrations &gt; API Keys to enable your app to communicate with l4yercak3.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <RetroButton
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Cancel
            </RetroButton>

            {!allChecksPassed && !isValidating && (
              <RetroButton
                onClick={handleFixIssues}
                variant="secondary"
                size="sm"
              >
                <Settings size={14} />
                Fix Issues
              </RetroButton>
            )}

            {allChecksPassed && (
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

      {/* Deployment Settings Edit Modal */}
      {showEditModal && (
        <DeploymentSettingsModal
          page={page}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
