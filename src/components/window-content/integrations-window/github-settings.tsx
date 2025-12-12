"use client";

import React, { useState } from "react";
import { ArrowLeft, Github, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

interface GitHubSettingsProps {
  onBack: () => void;
}

/**
 * GitHub Integration Settings
 *
 * Allows users to connect their GitHub account for deployment workflows.
 * Free tier users have access to this integration.
 */
export function GitHubSettings({ onBack }: GitHubSettingsProps) {
  const { sessionId } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query connection status from backend
  const connectionStatus = useQuery(
    api.oauth.github.getGitHubConnectionStatus,
    sessionId ? { sessionId } : "skip"
  );

  // Mutations
  const initiateGitHubOAuth = useMutation(api.oauth.github.initiateGitHubOAuth);
  const disconnectGitHub = useMutation(api.oauth.github.disconnectGitHub);

  const isConnected = connectionStatus?.connected || false;
  const connection = connectionStatus?.connection;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <button
          onClick={onBack}
          className="beveled-button p-2"
          style={{
            backgroundColor: 'var(--win95-button-face)',
            color: 'var(--win95-text)',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <Github size={24} style={{ color: '#181717' }} />
        <div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
            GitHub Integration
          </h3>
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Connect your GitHub account for deployment
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error Message */}
        {error && (
          <div
            className="mb-4 p-4 border-2"
            style={{
              borderColor: '#DC2626',
              background: '#FEE2E2'
            }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={20} style={{ color: '#DC2626' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs mb-1" style={{ color: '#991B1B' }}>
                  Connection Error
                </h4>
                <p className="text-xs" style={{ color: '#991B1B' }}>
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div
          className="mb-4 p-4 border-2"
          style={{
            borderColor: 'var(--win95-border)',
            background: isConnected ? '#D1FAE5' : '#FEF3C7'
          }}
        >
          <div className="flex items-start gap-2">
            {isConnected ? (
              <CheckCircle2 size={20} style={{ color: 'var(--success)' }} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} style={{ color: 'var(--warning)' }} className="flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-xs mb-1" style={{ color: isConnected ? '#065F46' : '#92400E' }}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </h4>
              <p className="text-xs" style={{ color: isConnected ? '#065F46' : '#92400E' }}>
                {isConnected
                  ? `Connected as ${connection?.metadata?.login || connection?.providerEmail}`
                  : 'Connect your GitHub account to enable web app deployments.'}
              </p>
              {isConnected && connection && (
                <p className="text-xs mt-1" style={{ color: '#065F46' }}>
                  Connected: {new Date(connection.connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* What You Can Do */}
        <div className="mb-4">
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
            What You Can Do:
          </h4>
          <div
            className="p-3 border-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            <ul className="space-y-2 text-xs" style={{ color: 'var(--win95-text)' }}>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Create and manage deployment repositories</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Sync your published web apps to GitHub</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Enable one-click deployment to Vercel</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Version control for your projects</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Free Tier Notice */}
        <div
          className="mb-4 p-3 border-2"
          style={{
            borderColor: '#6366F1',
            background: '#EEF2FF'
          }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: '#4338CA' }}>
            ✨ Available on Free Tier
          </p>
          <p className="text-xs" style={{ color: '#4338CA' }}>
            GitHub integration is included with all tiers, including Free. No upgrade required!
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="mb-4">
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
            Setup Instructions:
          </h4>
          <div
            className="p-3 border-2 space-y-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
              <p className="font-bold mb-1">1. Click "Connect GitHub Account"</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                You'll be redirected to GitHub to authorize access
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
              <p className="font-bold mb-1">2. Grant Repository Permissions</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Allow l4yercak3 to create and manage deployment repositories
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
              <p className="font-bold mb-1">3. Start Deploying!</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Your web apps will be ready to deploy to Vercel
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isConnected && (
          <button
            onClick={async () => {
              if (!sessionId) {
                setError('You must be logged in to connect GitHub');
                return;
              }

              setIsConnecting(true);
              setError(null);

              try {
                const result = await initiateGitHubOAuth({
                  sessionId,
                  connectionType: "organizational", // Default to organizational
                });

                // Redirect to GitHub OAuth page
                window.location.href = result.authUrl;
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to initiate GitHub connection');
                setIsConnecting(false);
              }
            }}
            disabled={isConnecting}
            className="beveled-button-primary w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github size={16} />
                Connect GitHub Account
              </>
            )}
          </button>
        )}

        {isConnected && (
          <div className="space-y-2">
            <button
              onClick={() => {
                if (connection?.metadata?.htmlUrl) {
                  window.open(connection.metadata.htmlUrl, '_blank');
                } else {
                  window.open('https://github.com', '_blank');
                }
              }}
              className="beveled-button w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              <ExternalLink size={16} />
              View GitHub Profile
            </button>
            <button
              onClick={async () => {
                if (!sessionId || !connection) return;

                const confirmed = confirm(
                  'Disconnect GitHub? This will affect your deployment workflows and you will need to reconnect to deploy apps.'
                );

                if (!confirmed) return;

                setError(null);

                try {
                  await disconnectGitHub({
                    sessionId,
                    connectionId: connection.id,
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to disconnect GitHub');
                }
              }}
              className="beveled-button w-full px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: 'var(--error)',
                color: 'white',
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
