"use client";

import React from "react";
import { ArrowLeft, Cloud, ExternalLink, Check, CheckCircle2, AlertCircle, Sparkles, TriangleAlert } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "@convex/_generated/dataModel";
import { useNotification } from "@/hooks/use-notification";

interface VercelSettingsProps {
  onBack: () => void;
}

/**
 * Vercel Integration Settings
 *
 * Allows users to connect their Vercel account for deployment.
 * Free tier users have access to this integration.
 */
export function VercelSettings({ onBack }: VercelSettingsProps) {
  const { sessionId, user } = useAuth();
  const notification = useNotification();
  const currentOrg = user?.defaultOrgId;

  // Query connection status from backend
  const connections = useQuery(
    api.oauth.vercel.getVercelConnections,
    sessionId && currentOrg
      ? { sessionId, organizationId: currentOrg as Id<"organizations"> }
      : "skip"
  );

  const initiateOAuth = useMutation(api.oauth.vercel.initiateVercelOAuth);
  const disconnectVercel = useMutation(api.oauth.vercel.disconnectVercel);

  const isConnected = connections && connections.length > 0;
  const activeConnection = isConnected ? connections[0] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b-2"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)'
        }}
      >
        <button
          onClick={onBack}
          className="desktop-interior-button p-2"
          style={{
            backgroundColor: 'var(--window-document-bg)',
            color: 'var(--window-document-text)',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <Cloud size={24} style={{ color: '#000000' }} />
        <div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--window-document-text)' }}>
            Vercel Integration
          </h3>
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Deploy and host your web applications
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Connection Status */}
        <div
          className="mb-4 p-4 border-2"
          style={{
            borderColor: 'var(--window-document-border)',
            background: isConnected ? '#D1FAE5' : '#FEF3C7'
          }}
        >
          <div className="flex items-start gap-2">
            {isConnected ? (
              <CheckCircle2 size={20} style={{ color: 'var(--success)' }} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} style={{ color: 'var(--warning)' }} className="flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-xs mb-1" style={{ color: isConnected ? '#065F46' : '#92400E' }}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </h4>
              <p className="text-xs" style={{ color: isConnected ? '#065F46' : '#92400E' }}>
                {isConnected
                  ? `Connected as ${activeConnection?.providerEmail || 'Vercel User'} - Ready for deployments.`
                  : 'Connect your Vercel account to deploy your web apps.'}
              </p>
            </div>
          </div>
        </div>

        {/* Prerequisites */}
        {!isConnected && (
          <div
            className="mb-4 p-3 border-2"
            style={{
              borderColor: '#F59E0B',
              background: '#FEF3C7'
            }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: '#92400E' }}>
              <span className="inline-flex items-center gap-1">
                <TriangleAlert size={12} />
                Prerequisites
              </span>
            </p>
            <p className="text-xs" style={{ color: '#92400E' }}>
              You must connect GitHub first before connecting Vercel. Vercel deploys from GitHub repositories.
            </p>
          </div>
        )}

        {/* What You Can Do */}
        <div className="mb-4">
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--window-document-text)' }}>
            What You Can Do:
          </h4>
          <div
            className="p-3 border-2"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)'
            }}
          >
            <ul className="space-y-2 text-xs" style={{ color: 'var(--window-document-text)' }}>
              <li className="flex items-start gap-2">
                <Check size={12} />
                <span>One-click deployment to Vercel</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={12} />
                <span>Global CDN with edge network</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={12} />
                <span>Automatic HTTPS certificates</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={12} />
                <span>Environment variable management</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={12} />
                <span>Real-time deployment monitoring</span>
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
            <span className="inline-flex items-center gap-1">
              <Sparkles size={12} />
              Available on Free Tier
            </span>
          </p>
          <p className="text-xs" style={{ color: '#4338CA' }}>
            Vercel integration is included with all tiers, including Free. No upgrade required!
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="mb-4">
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--window-document-text)' }}>
            Setup Instructions:
          </h4>
          <div
            className="p-3 border-2 space-y-2"
            style={{
              borderColor: 'var(--window-document-border)',
              background: 'var(--window-document-bg-elevated)'
            }}
          >
            <div className="text-xs" style={{ color: 'var(--window-document-text)' }}>
              <p className="font-bold mb-1">1. Connect GitHub First</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Vercel deploys from GitHub repositories
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--window-document-text)' }}>
              <p className="font-bold mb-1">2. Click "Connect Vercel Account"</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                You'll be redirected to Vercel to authorize access
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--window-document-text)' }}>
              <p className="font-bold mb-1">3. Select Team/Account</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Choose where your deployments will go
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--window-document-text)' }}>
              <p className="font-bold mb-1">4. Deploy Your Apps!</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Use the Publishing window to deploy with one click
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isConnected && (
          <button
            onClick={async () => {
              if (!sessionId) {
                notification.error("Session Error", "Please log in again");
                return;
              }

              try {
                notification.info("Connecting to Vercel", "Redirecting to Vercel authorization...");
                const result = await initiateOAuth({
                  sessionId,
                  connectionType: "organizational",
                });
                // Redirect to Vercel OAuth
                window.location.href = result.authUrl;
              } catch (error) {
                console.error("Error initiating Vercel OAuth:", error);
                notification.error(
                  "Connection Failed",
                  error instanceof Error ? error.message : "Failed to connect to Vercel"
                );
              }
            }}
            className="desktop-interior-button desktop-interior-button-primary w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Cloud size={16} />
            Connect Vercel Account
          </button>
        )}

        {isConnected && (
          <div className="space-y-2">
            <button
              onClick={() => {
                // TODO: Open Vercel dashboard
                window.open('https://vercel.com/dashboard', '_blank');
              }}
              className="desktop-interior-button w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              <ExternalLink size={16} />
              Open Vercel Dashboard
            </button>
            <button
              onClick={async () => {
                if (!sessionId || !activeConnection) return;

                if (confirm('Disconnect Vercel? This will affect your deployment workflows.')) {
                  try {
                    await disconnectVercel({
                      sessionId,
                      connectionId: activeConnection._id,
                    });
                    notification.success("Disconnected", "Vercel account has been disconnected");
                  } catch (error) {
                    console.error("Error disconnecting Vercel:", error);
                    notification.error(
                      "Disconnect Failed",
                      error instanceof Error ? error.message : "Failed to disconnect Vercel"
                    );
                  }
                }
              }}
              className="desktop-interior-button w-full px-4 py-2 text-sm font-bold"
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
