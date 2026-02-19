"use client";

import { Rocket, Clock, Plus, Settings as SettingsIcon, MessageSquare } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
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
  selectedDeploymentId
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
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to view deployments.
      </div>
    );
  }

  if (page === undefined) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
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
  const deployments = hasDeployment ? [{
    id: 'default',
    name: 'Vercel + GitHub Production',
    provider: 'vercel',
    status: deployment?.status || 'configured',
    lastDeployed: deployment?.deployedAt || null,
    deployedUrl: deployment?.deployedUrl || null,
    githubRepo: deployment?.githubRepo,
    vercelUrl: deployment?.vercelDeployButton,
  }] : [];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
            Deployments for {pageName}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
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
        <div
          className="border-2 p-8 text-center"
          style={{
            borderColor: 'var(--window-document-border)',
            background: 'var(--window-document-bg-elevated)'
          }}
        >
          <Rocket size={48} style={{ color: 'var(--neutral-gray)', margin: '0 auto 16px' }} />
          <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
            No Deployments Configured
          </h4>
          <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
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
            <div
              key={dep.id}
              className="border-2 p-4 transition-colors cursor-pointer"
              style={{
                borderColor: selectedDeploymentId === dep.id ? 'var(--tone-accent)' : 'var(--window-document-border)',
                background: selectedDeploymentId === dep.id ? 'var(--desktop-menu-hover)' : 'white'
              }}
              onClick={() => onSelectDeployment(dep)}
            >
              <div className="flex items-start justify-between">
                {/* Left: Deployment info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {dep.name}
                    </h4>
                    <span
                      className="px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: dep.status === 'active' || dep.status === 'deployed'
                          ? 'var(--success)'
                          : dep.status === 'error'
                          ? 'var(--error)'
                          : 'var(--neutral-gray)',
                        color: 'white'
                      }}
                    >
                      {dep.status?.toUpperCase() || 'CONFIGURED'}
                    </span>
                  </div>

                  {/* Deployment details */}
                  <div className="space-y-1 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {dep.githubRepo && (
                      <div className="flex items-center gap-2">
                        <span> GitHub:</span>
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
                          style={{ color: 'var(--tone-accent)' }}
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
                    onClick={() => onSelectDeployment(dep)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <SettingsIcon size={14} />
                    Settings
                  </InteriorButton>
                  <InteriorButton
                    onClick={() => onAddDeployment()}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Rocket size={14} />
                    Deploy Now
                  </InteriorButton>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Deployment Button */}
          <div
            className="border-2 p-4 text-center cursor-pointer transition-colors"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)',
              borderStyle: 'dashed'
            }}
            onClick={onAddDeployment}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--desktop-menu-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
            }}
          >
            <Plus size={24} style={{ color: 'var(--neutral-gray)', margin: '0 auto 8px' }} />
            <p className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
              Add Another Deployment
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Configure staging, preview, or other deployment targets
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
