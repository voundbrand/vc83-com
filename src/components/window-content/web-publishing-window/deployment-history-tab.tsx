"use client";

import { useState } from "react";
import { History, CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCw, FileText } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Id } from "../../../../convex/_generated/dataModel";

interface DeploymentHistoryTabProps {
  pageId: Id<"objects">;
  pageName: string;
}

/**
 * Deployment History Tab
 *
 * Shows timeline of deployments with:
 * - Deployment status (queued, building, ready, error, canceled)
 * - Deployment URL
 * - Commit information
 * - Build logs
 * - Deployment time
 */
export function DeploymentHistoryTab({ pageId, pageName }: DeploymentHistoryTabProps) {
  const { sessionId } = useAuth();
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

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

  // Fetch deployment history (for all targets)
  const allHistory = targets?.map((target: any) => ({
    targetId: target._id,
    targetName: target.projectId,
    targetProvider: target.provider,
    history: useQuery(
      api.deploymentOntology.getDeploymentHistory,
      sessionId ? { sessionId, targetId: target._id } : "skip"
    ) || []
  })) || [];

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to view deployment history.
      </div>
    );
  }

  if (config === undefined || targets === undefined) {
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

  // Flatten all history and sort by timestamp
  const flattenedHistory = allHistory.flatMap((item) =>
    item.history.map((deployment: any) => ({
      ...deployment,
      targetName: item.targetName,
      targetProvider: item.targetProvider,
    }))
  ).sort((a, b) => b._creationTime - a._creationTime);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
            <History size={16} />
            Deployment History for {pageName}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {flattenedHistory.length} deployment{flattenedHistory.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <RetroButton
          onClick={() => window.location.reload()}
          variant="secondary"
          size="sm"
        >
          <RefreshCw size={14} />
          Refresh
        </RetroButton>
      </div>

      {/* Deployments Timeline */}
      {flattenedHistory.length === 0 ? (
        <div
          className="border-2 p-8 text-center"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <History size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)' }} />
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
            No Deployments Yet
          </h4>
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Deploy your page to see deployment history here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {flattenedHistory.map((deployment: any, index: number) => {
            const isExpanded = selectedDeployment === deployment._id;
            const statusColors = {
              queued: { bg: 'var(--neutral-gray)', text: 'white', icon: Loader2 },
              building: { bg: 'var(--warning)', text: 'white', icon: Loader2 },
              ready: { bg: 'var(--success)', text: 'white', icon: CheckCircle },
              error: { bg: 'var(--error)', text: 'white', icon: AlertCircle },
              canceled: { bg: 'var(--neutral-gray)', text: 'white', icon: AlertCircle },
            };

            const statusStyle = statusColors[deployment.status as keyof typeof statusColors] || statusColors.queued;
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={deployment._id}
                className="border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                {/* Deployment Card */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon
                          size={16}
                          style={{ color: statusStyle.bg }}
                          className={deployment.status === "building" ? "animate-spin" : ""}
                        />
                        <span className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                          {deployment.targetProvider === "vercel" ? "Vercel" : deployment.targetProvider}:{" "}
                          {deployment.targetName}
                        </span>
                        <span
                          className="px-2 py-0.5 text-xs font-bold"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                        >
                          {deployment.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Commit Info */}
                      {deployment.commitHash && (
                        <p className="text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                          Commit:{" "}
                          <code
                            className="px-1 font-mono"
                            style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}
                          >
                            {deployment.commitHash.substring(0, 7)}
                          </code>
                          {deployment.commitMessage && (
                            <span className="ml-2">"{deployment.commitMessage}"</span>
                          )}
                        </p>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {new Date(deployment._creationTime).toLocaleString()}
                        {index === 0 && (
                          <span className="ml-2 font-bold" style={{ color: 'var(--win95-highlight)' }}>
                            (Latest)
                          </span>
                        )}
                      </p>

                      {/* Deployment URL */}
                      {deployment.deploymentUrl && (
                        <a
                          href={deployment.deploymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline mt-1 flex items-center gap-1"
                          style={{ color: 'var(--win95-highlight)' }}
                        >
                          {deployment.deploymentUrl}
                          <ExternalLink size={10} />
                        </a>
                      )}

                      {/* Error Message */}
                      {deployment.status === "error" && deployment.buildLogs && (
                        <div
                          className="mt-2 p-2 border text-xs"
                          style={{
                            borderColor: 'var(--error)',
                            background: '#FEE2E2',
                            color: '#991B1B'
                          }}
                        >
                          <strong>Error:</strong> {deployment.buildLogs.substring(0, 200)}
                          {deployment.buildLogs.length > 200 && "..."}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      {deployment.buildLogs && (
                        <button
                          onClick={() => setSelectedDeployment(isExpanded ? null : deployment._id)}
                          className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                          style={{
                            borderColor: 'var(--win95-border)',
                            background: 'var(--win95-bg-light)',
                            color: 'var(--info)'
                          }}
                          title="View build logs"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--win95-hover-light)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--win95-bg-light)';
                          }}
                        >
                          <FileText size={12} />
                          {isExpanded ? "Hide" : "View"} Logs
                        </button>
                      )}
                      {deployment.deploymentUrl && (
                        <a
                          href={deployment.deploymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
                          style={{
                            borderColor: 'var(--win95-border)',
                            background: 'var(--win95-bg-light)',
                            color: 'var(--win95-highlight)'
                          }}
                          title="Open deployment"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--win95-hover-light)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--win95-bg-light)';
                          }}
                        >
                          <ExternalLink size={12} />
                          Open
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Expanded Build Logs */}
                  {isExpanded && deployment.buildLogs && (
                    <div
                      className="mt-3 p-3 border-2 font-mono text-xs overflow-x-auto"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: '#1a1a1a',
                        color: '#00ff00',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      <pre className="whitespace-pre-wrap">{deployment.buildLogs}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
