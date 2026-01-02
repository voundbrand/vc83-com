"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { RetroButton } from "@/components/retro-button";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  CheckCircle,
  AlertCircle,
  Key,
  Lock,
  Globe
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

interface OAuthTutorialWindowProps {
  organizationId: Id<"organizations">;
  portalUrl: string;
  onComplete: (credentials: { clientId: string; clientSecret: string }) => void;
  onSkip: () => void;
  onClose: () => void;
}

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  applicationId: Id<"oauthApplications">;
}

/**
 * OAuth Tutorial Window
 *
 * Step-by-step guide for creating an OAuth application for portal authentication.
 * This window walks users through:
 * 1. Creating an OAuth app
 * 2. Copying credentials
 * 3. Understanding redirect URIs
 * 4. Granting scopes
 */
export function OAuthTutorialWindow({
  organizationId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  portalUrl: _portalUrl,
  onComplete,
  onSkip,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose: _onClose,
}: OAuthTutorialWindowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [oauthCredentials, setOauthCredentials] = useState<OAuthCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Mutations
  const createOAuthApp = useMutation(api.oauth.applications.createOAuthApplication);

  // Tutorial steps
  const steps = [
    {
      title: "Why OAuth? 🔐",
      subtitle: "Secure authentication for your portal",
      icon: <Lock className="h-8 w-8" />,
    },
    {
      title: "Create OAuth App 🔑",
      subtitle: "Generate your credentials",
      icon: <Key className="h-8 w-8" />,
    },
    {
      title: "Save Credentials 💾",
      subtitle: "Copy your client ID and secret",
      icon: <Copy className="h-8 w-8" />,
    },
    {
      title: "All Set! ✅",
      subtitle: "Your portal is ready for OAuth",
      icon: <CheckCircle className="h-8 w-8" />,
    },
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progressPercentage = Math.round(((currentStep + 1) / steps.length) * 100);

  // Handle OAuth app creation
  const handleCreateOAuthApp = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const redirectUri = `${portalUrl}/auth/callback`;

      const result = await createOAuthApp({
        name: `Freelancer Portal - ${new Date().toLocaleDateString()}`,
        description: `OAuth application for external freelancer portal at ${portalUrl}`,
        redirectUris: [redirectUri],
        scopes: "contacts:read projects:read invoices:read",
        type: "confidential",
        organizationId,
      });

      setOauthCredentials({
        clientId: result.clientId,
        clientSecret: result.clientSecret,
        applicationId: result.applicationId,
      });

      // Auto-advance to next step
      setCurrentStep(2);
    } catch (err: any) {
      console.error("Failed to create OAuth app:", err);
      setError(err.message || "Failed to create OAuth application");
    } finally {
      setIsCreating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle next button
  const handleNext = () => {
    if (isLastStep) {
      if (oauthCredentials) {
        onComplete({
          clientId: oauthCredentials.clientId,
          clientSecret: oauthCredentials.clientSecret,
        });
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  // Handle previous button
  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--win95-bg)' }}
    >
      {/* Header */}
      <div
        className="p-4 border-b-2 flex items-center justify-between"
        style={{ borderColor: 'var(--win95-border)' }}
      >
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--win95-highlight)' }}>
            {currentStepData.icon}
          </div>
          <div>
            <h2 className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
              OAuth Setup Tutorial
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
        <RetroButton
          variant="outline"
          size="sm"
          onClick={onSkip}
          className="text-xs"
        >
          Use Magic Link Instead
        </RetroButton>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-3">
        <div
          className="h-2 border-2 overflow-hidden"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercentage}%`,
              background: 'var(--win95-highlight)',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Step Title */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold" style={{ color: 'var(--win95-text)' }}>
              {currentStepData.title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
              {currentStepData.subtitle}
            </p>
          </div>

          {/* Step-specific content */}
          {currentStep === 0 && <Step0Introduction />}
          {currentStep === 1 && (
            <Step1CreateApp
              portalUrl={portalUrl}
              onCreateApp={handleCreateOAuthApp}
              isCreating={isCreating}
              error={error}
            />
          )}
          {currentStep === 2 && oauthCredentials && (
            <Step2SaveCredentials
              credentials={oauthCredentials}
              onCopy={handleCopy}
              copiedField={copiedField}
            />
          )}
          {currentStep === 3 && oauthCredentials && (
            <Step3Complete portalUrl={portalUrl} />
          )}

          {/* Visual step indicators */}
          <div className="pt-6 flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className="h-2 w-2 rounded-full border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: index <= currentStep ? 'var(--win95-highlight)' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div
        className="p-4 border-t-2 flex items-center justify-between"
        style={{ borderColor: 'var(--win95-border)' }}
      >
        <RetroButton
          onClick={handlePrevious}
          disabled={isFirstStep || currentStep === 1}
          variant="outline"
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </RetroButton>

        <RetroButton
          onClick={handleNext}
          disabled={currentStep === 1 || (currentStep === 2 && !oauthCredentials)}
          className="flex items-center gap-1"
        >
          {isLastStep ? (
            <>
              <span>Complete Setup</span>
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </RetroButton>
      </div>

      {/* Info Footer */}
      <div
        className="px-4 py-2 text-xs text-center border-t"
        style={{
          color: 'var(--neutral-gray)',
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        💡 OAuth provides secure, industry-standard authentication for your portal
      </div>
    </div>
  );
}

/**
 * Step 0: Introduction to OAuth
 */
function Step0Introduction() {
  return (
    <div className="space-y-4">
      <div
        className="p-4 border-2 rounded"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Lock className="h-4 w-4" style={{ color: 'var(--win95-highlight)' }} />
          What is OAuth?
        </h4>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--win95-text)' }}>
          OAuth 2.0 is an industry-standard protocol that allows your contacts to securely
          log into your portal using their existing Google or Microsoft accounts.
        </p>
      </div>

      <div className="grid gap-3">
        <BenefitCard
          icon="✅"
          title="No Password Management"
          description="Contacts log in with Google/Microsoft - no passwords to remember"
        />
        <BenefitCard
          icon="🔐"
          title="Enhanced Security"
          description="Industry-standard authentication with automatic security updates"
        />
        <BenefitCard
          icon="⚡"
          title="Quick Setup"
          description="Takes just 2 minutes to configure, then you're done"
        />
      </div>

      <div
        className="p-3 border-2 rounded flex items-start gap-2"
        style={{
          borderColor: 'var(--win95-highlight)',
          background: 'var(--win95-bg)'
        }}
      >
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
        <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
          <strong>Alternative:</strong> If you prefer a simpler setup, you can skip OAuth and use
          Magic Link authentication instead (email-based, no OAuth configuration needed).
        </div>
      </div>
    </div>
  );
}

/**
 * Step 1: Create OAuth Application
 */
function Step1CreateApp({
  portalUrl,
  onCreateApp,
  isCreating,
  error,
}: {
  portalUrl: string;
  onCreateApp: () => void;
  isCreating: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div
        className="p-4 border-2 rounded space-y-3"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Key className="h-4 w-4" style={{ color: 'var(--win95-highlight)' }} />
          Portal Configuration
        </h4>

        <div className="space-y-2 text-sm" style={{ color: 'var(--win95-text)' }}>
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--neutral-gray)' }} />
            <div>
              <div className="font-semibold">Portal URL:</div>
              <div className="font-mono text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {portalUrl}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--neutral-gray)' }} />
            <div>
              <div className="font-semibold">Redirect URI:</div>
              <div className="font-mono text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {portalUrl}/auth/callback
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--neutral-gray)' }} />
            <div>
              <div className="font-semibold">Scopes:</div>
              <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                contacts:read, projects:read, invoices:read
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="p-3 border-2 rounded flex items-start gap-2"
          style={{
            borderColor: '#EF4444',
            background: '#FEE2E2'
          }}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
          <div className="text-xs text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      <RetroButton
        onClick={onCreateApp}
        disabled={isCreating}
        className="w-full"
        size="lg"
      >
        {isCreating ? "Creating OAuth App..." : "🔑 Create OAuth Application"}
      </RetroButton>

      <p className="text-xs text-center" style={{ color: 'var(--neutral-gray)' }}>
        This will generate your Client ID and Client Secret
      </p>
    </div>
  );
}

/**
 * Step 2: Save Credentials
 */
function Step2SaveCredentials({
  credentials,
  onCopy,
  copiedField,
}: {
  credentials: OAuthCredentials;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  return (
    <div className="space-y-4">
      <div
        className="p-4 border-2 rounded"
        style={{
          borderColor: '#EF4444',
          background: '#FEE2E2'
        }}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600" />
          <div className="text-sm text-red-800">
            <strong className="block mb-1">⚠️ IMPORTANT: Save These Credentials Now!</strong>
            Your <strong>Client Secret</strong> will only be shown once.
            Copy both values before continuing.
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <CredentialField
          label="Client ID"
          value={credentials.clientId}
          onCopy={() => onCopy(credentials.clientId, 'clientId')}
          copied={copiedField === 'clientId'}
        />

        <CredentialField
          label="Client Secret"
          value={credentials.clientSecret}
          onCopy={() => onCopy(credentials.clientSecret, 'clientSecret')}
          copied={copiedField === 'clientSecret'}
          isSecret
        />
      </div>

      <div
        className="p-3 border-2 rounded"
        style={{
          borderColor: 'var(--win95-highlight)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
          <div>
            <strong>Where will these be used?</strong><br />
            These credentials will be automatically added to your portal's environment variables
            during deployment. You don't need to manually configure them.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 3: Complete
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Step3Complete({ portalUrl: _portalUrl }: { portalUrl: string }) {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div
          className="p-6 rounded-full border-4"
          style={{
            borderColor: 'var(--win95-highlight)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <CheckCircle className="h-16 w-16" style={{ color: 'var(--win95-highlight)' }} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-lg font-bold" style={{ color: 'var(--win95-text)' }}>
          OAuth Setup Complete! 🎉
        </h4>
        <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
          Your portal is now configured for secure OAuth authentication.
        </p>
      </div>

      <div
        className="p-4 border-2 rounded space-y-2 text-left"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <h5 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
          What happens next:
        </h5>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--win95-text)' }}>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Your portal will be deployed with OAuth credentials</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Contacts can log in with Google or Microsoft</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✅</span>
            <span>Authentication is handled securely and automatically</span>
          </li>
        </ul>
      </div>

      <div className="pt-4">
        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          Click "Complete Setup" to continue with deployment
        </p>
      </div>
    </div>
  );
}

/**
 * Benefit Card Component
 */
function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-3 border-2 rounded flex items-start gap-3"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg)'
      }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <h5 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
          {title}
        </h5>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * Credential Field Component
 */
function CredentialField({
  label,
  value,
  onCopy,
  copied,
  isSecret = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  isSecret?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
        {label} {isSecret && <span className="text-red-600">*</span>}
      </label>
      <div className="flex gap-2">
        <div
          className="flex-1 p-2 border-2 rounded font-mono text-xs overflow-x-auto"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)',
            color: 'var(--win95-text)'
          }}
        >
          {value}
        </div>
        <RetroButton
          onClick={onCopy}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" style={{ color: '#10B981' }} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </RetroButton>
      </div>
      {isSecret && (
        <p className="text-xs mt-1 text-red-600">
          ⚠️ This secret will not be shown again
        </p>
      )}
    </div>
  );
}
