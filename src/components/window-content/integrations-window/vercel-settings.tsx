"use client";

import React from "react";
import { ArrowLeft, Cloud, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";

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
  // TODO: Query connection status from backend
  const isConnected = false;

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
        <Cloud size={24} style={{ color: '#000000' }} />
        <div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
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
            <div>
              <h4 className="font-bold text-xs mb-1" style={{ color: isConnected ? '#065F46' : '#92400E' }}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </h4>
              <p className="text-xs" style={{ color: isConnected ? '#065F46' : '#92400E' }}>
                {isConnected
                  ? 'Your Vercel account is connected and ready for deployments.'
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
              ⚠️ Prerequisites
            </p>
            <p className="text-xs" style={{ color: '#92400E' }}>
              You must connect GitHub first before connecting Vercel. Vercel deploys from GitHub repositories.
            </p>
          </div>
        )}

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
                <span>One-click deployment to Vercel</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Global CDN with edge network</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Automatic HTTPS certificates</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
                <span>Environment variable management</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✓</span>
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
            ✨ Available on Free Tier
          </p>
          <p className="text-xs" style={{ color: '#4338CA' }}>
            Vercel integration is included with all tiers, including Free. No upgrade required!
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
              <p className="font-bold mb-1">1. Connect GitHub First</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Vercel deploys from GitHub repositories
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
              <p className="font-bold mb-1">2. Click "Connect Vercel Account"</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                You'll be redirected to Vercel to authorize access
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
              <p className="font-bold mb-1">3. Select Team/Account</p>
              <p className="ml-4" style={{ color: 'var(--neutral-gray)' }}>
                Choose where your deployments will go
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
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
            onClick={() => {
              // TODO: Implement Vercel OAuth flow
              alert('Vercel OAuth integration coming soon!');
            }}
            className="beveled-button-primary w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
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
              className="beveled-button w-full px-4 py-2 text-sm font-bold flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
              }}
            >
              <ExternalLink size={16} />
              Open Vercel Dashboard
            </button>
            <button
              onClick={() => {
                // TODO: Implement disconnect
                if (confirm('Disconnect Vercel? This will affect your deployment workflows.')) {
                  alert('Disconnect functionality coming soon!');
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
