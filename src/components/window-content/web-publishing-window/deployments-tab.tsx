"use client";

import { Rocket, Clock, Plus, Settings as SettingsIcon } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";

interface DeploymentsTabProps {
  pageId: Id<"objects">;
  pageName: string;
  onSelectDeployment: (deployment: any) => void;
  onAddDeployment: () => void;
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
  selectedDeploymentId
}: DeploymentsTabProps) {
  const { sessionId } = useAuth();

  // Query all deployments for this page from publishingOntology
  // For now, we'll use the page's deployment info until we have a deployments table
  const page = useQuery(
    api.publishingOntology.getPublishedPageById,
    sessionId ? { sessionId, pageId } : "skip"
  );

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
  const deployment = page?.customProperties?.deployment as any;
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
      <div className="mb-4">
        <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          Deployments for {pageName}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          Manage deployment configurations and deploy to hosting platforms
        </p>
      </div>

      {/* Deployments List */}
      {deployments.length === 0 ? (
        // Empty State
        <div
          className="border-2 p-8 text-center"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <Rocket size={48} style={{ color: 'var(--neutral-gray)', margin: '0 auto 16px' }} />
          <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
            No Deployments Configured
          </h4>
          <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
            Add your first deployment to start publishing this page to the web.
          </p>
          <RetroButton
            onClick={onAddDeployment}
            variant="primary"
            size="sm"
            className="flex items-center gap-2 whitespace-nowrap mx-auto"
          >
            <Plus size={14} />
            Add Deployment
          </RetroButton>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Deployment Cards */}
          {deployments.map((dep) => (
            <div
              key={dep.id}
              className="border-2 p-4 transition-colors cursor-pointer"
              style={{
                borderColor: selectedDeploymentId === dep.id ? 'var(--win95-highlight)' : 'var(--win95-border)',
                background: selectedDeploymentId === dep.id ? 'var(--win95-hover-light)' : 'white'
              }}
              onClick={() => onSelectDeployment(dep)}
            >
              <div className="flex items-start justify-between">
                {/* Left: Deployment info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
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
                        <span>📂 GitHub:</span>
                        <span className="font-mono">{dep.githubRepo}</span>
                      </div>
                    )}
                    {dep.deployedUrl && (
                      <div className="flex items-center gap-2">
                        <span>🌐 URL:</span>
                        <a
                          href={dep.deployedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:underline"
                          style={{ color: 'var(--win95-highlight)' }}
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
                  <RetroButton
                    onClick={() => onSelectDeployment(dep)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <SettingsIcon size={14} />
                    Settings
                  </RetroButton>
                  <RetroButton
                    onClick={() => onAddDeployment()}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Rocket size={14} />
                    Deploy Now
                  </RetroButton>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Deployment Button */}
          <div
            className="border-2 p-4 text-center cursor-pointer transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
              borderStyle: 'dashed'
            }}
            onClick={onAddDeployment}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--win95-bg-light)';
            }}
          >
            <Plus size={24} style={{ color: 'var(--neutral-gray)', margin: '0 auto 8px' }} />
            <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
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
