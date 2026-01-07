"use client";

import { useState } from "react";
import { Box, Plug, RefreshCw, Trash2, Clock, ExternalLink, Settings as SettingsIcon } from "lucide-react";
import { RetroButton } from "@/components/retro-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ApplicationProps {
  source?: {
    type?: string;
    framework?: string;
    frameworkVersion?: string;
    hasTypeScript?: boolean;
    projectPathHash?: string;
  };
  connection?: {
    features?: string[];
    backendUrl?: string;
    apiKeyId?: Id<"apiKeys">;
  };
  sync?: {
    enabled?: boolean;
    lastSyncAt?: number;
    lastSyncStatus?: string;
    stats?: {
      totalPushed?: number;
      totalPulled?: number;
    };
  };
  cli?: {
    registeredAt?: number;
    lastActivityAt?: number;
    generatedFiles?: Array<{ path: string; type: string; generatedAt: number }>;
  };
}

interface ConnectedApplication {
  _id: Id<"objects">;
  name: string;
  description?: string;
  status: string;
  subtype?: string;
  customProperties?: ApplicationProps;
  createdAt?: number;
  updatedAt?: number;
}

interface ApplicationsTabProps {
  onSelectApplication?: (app: ConnectedApplication) => void;
}

/**
 * Applications Tab - List of CLI-connected external applications
 *
 * Shows:
 * - All connected applications (CLI, boilerplate, manual)
 * - Framework info, features, sync status
 * - Quick actions: View details, Sync, Disconnect
 */
export function ApplicationsTab({ onSelectApplication }: ApplicationsTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Query connected applications
  const applications = useQuery(
    api.applicationOntology.getApplications,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations">, status: statusFilter !== "all" ? statusFilter : undefined }
      : "skip"
  ) as ConnectedApplication[] | undefined;

  // Archive mutation
  const archiveApplication = useMutation(api.applicationOntology.archiveApplication);

  const handleArchive = async (appId: Id<"objects">) => {
    if (!sessionId) return;
    try {
      await archiveApplication({ sessionId, applicationId: appId });
      notification.success("Success", "Application disconnected successfully");
    } catch (error) {
      console.error("Failed to archive application:", error);
      notification.error("Error", "Failed to disconnect application");
    }
  };

  if (!sessionId) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Please log in to view connected applications.
      </div>
    );
  }

  if (applications === undefined) {
    return (
      <div className="p-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
        Loading applications...
      </div>
    );
  }

  const getFrameworkIcon = (framework?: string) => {
    switch (framework?.toLowerCase()) {
      case 'nextjs': return '▲';
      case 'remix': return '💿';
      case 'astro': return '🚀';
      case 'vite': return '⚡';
      case 'nuxt': return '💚';
      case 'sveltekit': return '🔥';
      default: return '📦';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'var(--success)';
      case 'paused': return 'var(--warning)';
      case 'disconnected': return 'var(--error)';
      case 'archived': return 'var(--neutral-gray)';
      default: return 'var(--neutral-gray)';
    }
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            Connected Applications
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            External apps connected via CLI or boilerplate
          </p>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1 text-xs border-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'white',
            color: 'var(--win95-text)'
          }}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        // Empty State
        <div
          className="border-2 p-8 text-center"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <Box size={48} style={{ color: 'var(--neutral-gray)', margin: '0 auto 16px' }} />
          <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
            No Connected Applications
          </h4>
          <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
            Connect your first app using the L4YERCAK3 CLI:
          </p>
          <div
            className="p-3 text-left font-mono text-xs mx-auto max-w-md"
            style={{
              background: 'var(--win95-text)',
              color: 'var(--win95-bg-light)'
            }}
          >
            <div>$ npm install -g l4yercak3</div>
            <div>$ l4yercak3 login</div>
            <div>$ l4yercak3 init</div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Application Cards */}
          {applications.map((app) => {
            const props = app.customProperties || {};
            const source = props.source || {};
            const connection = props.connection || {};
            const sync = props.sync || {};
            const cli = props.cli || {};

            return (
              <div
                key={app._id}
                className="border-2 p-4 transition-colors"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'white'
                }}
              >
                <div className="flex items-start justify-between">
                  {/* Left: App info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getFrameworkIcon(source.framework)}</span>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                        {app.name}
                      </h4>
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: getStatusColor(app.status),
                          color: 'white'
                        }}
                      >
                        {app.status.toUpperCase()}
                      </span>
                      {source.type && (
                        <span
                          className="px-2 py-0.5 text-xs"
                          style={{
                            background: 'var(--win95-bg-light)',
                            color: 'var(--neutral-gray)',
                            border: '1px solid var(--win95-border)'
                          }}
                        >
                          {source.type}
                        </span>
                      )}
                    </div>

                    {app.description && (
                      <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                        {app.description}
                      </p>
                    )}

                    {/* Framework & Features */}
                    <div className="space-y-1 text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      <div className="flex items-center gap-2">
                        <span>Framework:</span>
                        <span className="font-bold" style={{ color: 'var(--win95-text)' }}>
                          {source.framework || 'Unknown'}
                          {source.frameworkVersion && ` v${source.frameworkVersion}`}
                          {source.hasTypeScript && ' (TypeScript)'}
                        </span>
                      </div>

                      {connection.features && connection.features.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>Features:</span>
                          {connection.features.map((feature) => (
                            <span
                              key={feature}
                              className="px-1.5 py-0.5 text-xs"
                              style={{
                                background: 'var(--win95-highlight)',
                                color: 'white'
                              }}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sync Status */}
                      {sync.enabled && (
                        <div className="flex items-center gap-2">
                          <RefreshCw size={12} />
                          <span>
                            Last sync: {formatRelativeTime(sync.lastSyncAt)}
                            {sync.lastSyncStatus && ` (${sync.lastSyncStatus})`}
                          </span>
                          {sync.stats && (
                            <span>
                              • {sync.stats.totalPushed || 0} pushed, {sync.stats.totalPulled || 0} pulled
                            </span>
                          )}
                        </div>
                      )}

                      {/* CLI Activity */}
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>
                          Registered: {cli.registeredAt ? new Date(cli.registeredAt).toLocaleDateString() : 'Unknown'}
                        </span>
                        {cli.lastActivityAt && (
                          <span>• Active: {formatRelativeTime(cli.lastActivityAt)}</span>
                        )}
                      </div>

                      {/* Generated Files */}
                      {cli.generatedFiles && cli.generatedFiles.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span>📄 {cli.generatedFiles.length} generated file(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {connection.backendUrl && (
                      <RetroButton
                        onClick={() => window.open(connection.backendUrl, '_blank')}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                        title="Open Backend"
                      >
                        <ExternalLink size={14} />
                      </RetroButton>
                    )}
                    {onSelectApplication && (
                      <RetroButton
                        onClick={() => onSelectApplication(app)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        <SettingsIcon size={14} />
                        Details
                      </RetroButton>
                    )}
                    {app.status !== 'archived' && (
                      <RetroButton
                        onClick={() => {
                          if (confirm(`Disconnect "${app.name}"? This will archive the application.`)) {
                            handleArchive(app._id);
                          }
                        }}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1 whitespace-nowrap text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </RetroButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLI Installation Guide */}
      {applications.length > 0 && (
        <div
          className="mt-4 p-3 border-2 text-xs"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)',
            color: 'var(--neutral-gray)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Plug size={14} />
            <span className="font-bold" style={{ color: 'var(--win95-text)' }}>
              Connect Another App
            </span>
          </div>
          <p>
            Run <code className="font-mono px-1 py-0.5" style={{ background: 'white' }}>l4yercak3 init</code> in any project directory to connect it.
          </p>
        </div>
      )}
    </div>
  );
}
