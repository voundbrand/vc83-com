"use client";

import { Rocket, Clock, Plus, Settings as SettingsIcon, MessageSquare } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface DeploymentConfig {
  id: string;
  name: string;
  provider: string;
  status: string;
  lastDeployed: number | null;
  deployedUrl: string | null;
  githubRepo?: string;
  vercelUrl?: string;
}

interface DeploymentsTabProps {
  pageId: Id<"objects">;
  pageName: string;
  onSelectDeployment: (deployment: DeploymentConfig) => void;
  onAddDeployment: () => void;
  onOpenWebchatDeployment: () => void;
  selectedDeploymentId?: string | null;
}

function resolveStatusTone(status?: string): "success" | "error" | "neutral" {
  if (status === "active" || status === "deployed") {
    return "success";
  }
  if (status === "error") {
    return "error";
  }
  return "neutral";
}

function formatStatusLabel(status?: string): string {
  if (!status || status.trim().length === 0) {
    return "CONFIGURED";
  }
  return status.trim().toUpperCase();
}

/**
 * Deployments Tab - List of all deployments for a published page
 *
 * Shows:
 * - All configured deployments (Vercel, Netlify, etc.)
 * - Deployment status and last deploy time
 * - Quick deploy and settings buttons
 * - Add new deployment button
 */
export function DeploymentsTab({
  pageId,
  pageName,
  onSelectDeployment,
  onAddDeployment,
  onOpenWebchatDeployment,
  selectedDeploymentId,
}: DeploymentsTabProps) {
  const { sessionId } = useAuth();

  // Query all deployments for this page from publishingOntology
  // For now, we'll use the page's deployment info until we have a deployments table
  // Query type can exceed TS instantiation depth in this component.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publishingApi = (require("../../../../convex/_generated/api") as { api: any }).api;
  const page = useQuery(
    publishingApi.publishingOntology.getPublishedPageById,
    sessionId ? { sessionId, pageId } : "skip"
  ) as { customProperties?: { deployment?: PageDeploymentInfo } } | undefined;

  if (!sessionId) {
    return (
      <div className="p-4 text-xs desktop-interior-subtitle">
        Please log in to view deployments.
      </div>
    );
  }

  if (page === undefined) {
    return (
      <div className="p-4 text-xs desktop-interior-subtitle">
        Loading deployments...
      </div>
    );
  }

  // Extract deployment info from page
  interface PageDeploymentInfo {
    githubRepo?: string;
    vercelDeployButton?: string;
    status?: string;
    deployedAt?: number;
    deployedUrl?: string;
  }
  const deployment = page?.customProperties?.deployment as PageDeploymentInfo | undefined;
  const hasDeployment = deployment?.githubRepo || deployment?.vercelDeployButton;

  // Mock deployment object (we'll enhance this when we add a deployments table)
  const deployments = hasDeployment
    ? [
        {
          id: "default",
          name: "Vercel + GitHub Production",
          provider: "vercel",
          status: deployment?.status || "configured",
          lastDeployed: deployment?.deployedAt || null,
          deployedUrl: deployment?.deployedUrl || null,
          githubRepo: deployment?.githubRepo,
          vercelUrl: deployment?.vercelDeployButton,
        },
      ]
    : [];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="desktop-interior-title text-sm">
            Deployments for {pageName}
          </h3>
          <p className="desktop-interior-subtitle mt-1">
            Manage deployment configurations and deploy to hosting platforms
          </p>
        </div>
        <InteriorButton
          onClick={onOpenWebchatDeployment}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <MessageSquare size={14} />
          Open Webchat Deployment
        </InteriorButton>
      </div>

      {/* Deployments List */}
      {deployments.length === 0 ? (
        // Empty State
        <div className="desktop-interior-panel web-publishing-modern-panel p-8 text-center">
          <Rocket size={48} className="mx-auto mb-4" style={{ color: "var(--neutral-gray)" }} />
          <h4 className="desktop-interior-title text-sm mb-2">
            No Deployments Configured
          </h4>
          <p className="desktop-interior-subtitle text-xs mb-4">
            Add your first deployment to start publishing this page to the web.
          </p>
          <InteriorButton
            onClick={onAddDeployment}
            variant="primary"
            size="sm"
            className="flex items-center gap-2 whitespace-nowrap mx-auto"
          >
            <Plus size={14} />
            Add Deployment
          </InteriorButton>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Deployment Cards */}
          {deployments.map((dep) => (
            <button
              type="button"
              key={dep.id}
              className={cn(
                "w-full text-left desktop-interior-panel web-publishing-modern-panel p-4 transition-colors",
                selectedDeploymentId === dep.id && "web-publishing-modern-panel-active",
              )}
              onClick={() => onSelectDeployment(dep)}
            >
              <div className="flex items-start justify-between">
                {/* Left: Deployment info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="desktop-interior-title text-sm">
                      {dep.name}
                    </h4>
                    <span
                      className="web-publishing-modern-status-badge"
                      data-tone={resolveStatusTone(dep.status)}
                    >
                      {formatStatusLabel(dep.status)}
                    </span>
                  </div>

                  {/* Deployment details */}
                  <div className="space-y-1 text-xs desktop-interior-subtitle">
                    {dep.githubRepo && (
                      <div className="flex items-center gap-2">
                        <span>GitHub:</span>
                        <span className="font-mono">{dep.githubRepo}</span>
                      </div>
                    )}
                    {dep.deployedUrl && (
                      <div className="flex items-center gap-2">
                        <span> URL:</span>
                        <a
                          href={dep.deployedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:underline"
                          style={{ color: "var(--tone-accent)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {dep.deployedUrl}
                        </a>
                      </div>
                    )}
                    {dep.lastDeployed && (
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>Last deployed: {new Date(dep.lastDeployed).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Action buttons */}
                <div className="flex items-center gap-2 ml-4">
                  <InteriorButton
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectDeployment(dep);
                    }}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <SettingsIcon size={14} />
                    Settings
                  </InteriorButton>
                  <InteriorButton
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddDeployment();
                    }}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Rocket size={14} />
                    Deploy Now
                  </InteriorButton>
                </div>
              </div>
            </button>
          ))}

          {/* Add New Deployment Button */}
          <button
            type="button"
            className="w-full p-4 text-center transition-colors desktop-interior-panel web-publishing-modern-panel web-publishing-modern-dashed hover:bg-[var(--desktop-menu-hover)]"
            onClick={onAddDeployment}
          >
            <Plus size={24} className="mx-auto mb-2" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              Add Another Deployment
            </p>
            <p className="desktop-interior-subtitle text-xs mt-1">
              Configure staging, preview, or other deployment targets
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
