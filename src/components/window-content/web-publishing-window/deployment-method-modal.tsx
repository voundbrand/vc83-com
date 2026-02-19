"use client";

import { X, Cloud, Server, Code } from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";

interface DeploymentMethodModalProps {
  onClose: () => void;
  onSelectMethod: (method: "vercel" | "manual" | "other") => void;
}

/**
 * Deployment Method Selection Modal
 *
 * Asks user how they want to deploy their published web app.
 * This appears before the Vercel pre-flight check.
 */
export function DeploymentMethodModal({ onClose, onSelectMethod }: DeploymentMethodModalProps) {
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
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{
            background: 'var(--tone-accent)',
            color: 'white'
          }}
        >
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Cloud size={16} />
            Choose Deployment Method
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
          {/* Intro */}
          <div className="mb-6">
            <p className="text-sm mb-2" style={{ color: 'var(--window-document-text)' }}>
              How would you like to deploy your web app?
            </p>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Choose a deployment method that works best for your workflow.
            </p>
          </div>

          {/* Deployment Options */}
          <div className="space-y-3 mb-6">
            {/* Option 1: Vercel (One-Click) */}
            <button
              onClick={() => onSelectMethod("vercel")}
              className="w-full text-left p-4 border-2 transition-colors"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                e.currentTarget.style.borderColor = 'var(--tone-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
                e.currentTarget.style.borderColor = 'var(--window-document-border)';
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 p-2 border-2"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'white'
                  }}
                >
                  <Cloud size={24} style={{ color: 'var(--tone-accent)' }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Deploy to Vercel (Recommended)
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    One-click deployment to Vercel with automatic setup. Best for quick deployment and hosting.
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: 'var(--success)',
                        color: 'white'
                      }}
                    >
                      EASIEST
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      • Free tier available • Automatic SSL • Global CDN
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: Manual Deployment */}
            <button
              onClick={() => onSelectMethod("manual")}
              className="w-full text-left p-4 border-2 transition-colors"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                e.currentTarget.style.borderColor = 'var(--tone-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
                e.currentTarget.style.borderColor = 'var(--window-document-border)';
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 p-2 border-2"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'white'
                  }}
                >
                  <Code size={24} style={{ color: 'var(--info)' }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Manual Deployment
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    Get deployment instructions and code to deploy on your own infrastructure.
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: 'var(--info)',
                        color: 'white'
                      }}
                    >
                      FLEXIBLE
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      • Full control • Any hosting provider • Custom configuration
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Option 3: Other Platforms */}
            <button
              onClick={() => onSelectMethod("other")}
              className="w-full text-left p-4 border-2 transition-colors"
              style={{
                borderColor: 'var(--window-document-border)',
                background: 'var(--window-document-bg-elevated)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                e.currentTarget.style.borderColor = 'var(--tone-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
                e.currentTarget.style.borderColor = 'var(--window-document-border)';
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 p-2 border-2"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'white'
                  }}
                >
                  <Server size={24} style={{ color: 'var(--warning)' }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--window-document-text)' }}>
                    Other Platforms (Coming Soon)
                  </h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    Deploy to Netlify, AWS, or other cloud platforms. Integration coming soon.
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: 'var(--warning)',
                        color: 'white'
                      }}
                    >
                      SOON
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                      • Netlify • AWS Amplify • Digital Ocean
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <InteriorButton
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Cancel
            </InteriorButton>
          </div>
        </div>
      </div>
    </div>
  );
}
