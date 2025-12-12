"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentOrganization } from "@/hooks/use-auth";
import { X, ArrowRight, ArrowLeft, Check, Copy, AlertTriangle } from "lucide-react";
import { FAIconPicker } from "./fa-icon-picker";
import { ScopeSelector } from "@/components/api-keys/scope-selector";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CreateIntegrationDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

type Step = "info" | "uris" | "scopes" | "type" | "success";

export function CreateIntegrationDialog({ onClose, onCreated }: CreateIntegrationDialogProps) {
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id as Id<"organizations">;

  const [currentStep, setCurrentStep] = useState<Step>("info");
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("fas fa-globe");
  const [redirectUris, setRedirectUris] = useState<string[]>([""]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["contacts:read"]);
  const [appType, setAppType] = useState<"confidential" | "public">("confidential");

  // Created app credentials
  const [createdApp, setCreatedApp] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);
  const [copied, setCopied] = useState<"id" | "secret" | null>(null);

  const createOAuthApp = useMutation(api.oauth.applications.createOAuthApplication);

  // Step validation
  const isInfoValid = name.trim().length >= 3;
  const isUrisValid = redirectUris.some((uri) => {
    try {
      const url = new URL(uri);
      return url.protocol === "https:" || url.hostname === "localhost";
    } catch {
      return false;
    }
  });
  const isScopesValid = selectedScopes.length > 0;

  const handleAddUri = () => {
    setRedirectUris([...redirectUris, ""]);
  };

  const handleRemoveUri = (index: number) => {
    setRedirectUris(redirectUris.filter((_, i) => i !== index));
  };

  const handleUriChange = (index: number, value: string) => {
    const newUris = [...redirectUris];
    newUris[index] = value;
    setRedirectUris(newUris);
  };

  const handleCreate = async () => {
    if (!organizationId) return;

    setIsCreating(true);

    try {
      const validUris = redirectUris.filter((uri) => {
        try {
          const url = new URL(uri);
          return url.protocol === "https:" || url.hostname === "localhost";
        } catch {
          return false;
        }
      });

      const result = await createOAuthApp({
        organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        redirectUris: validUris,
        scopes: selectedScopes.join(" "),
        type: appType,
      });

      setCreatedApp({
        clientId: result.clientId,
        clientSecret: result.clientSecret,
      });
      setCurrentStep("success");
    } catch (error) {
      console.error("Failed to create OAuth app:", error);
      alert(`Failed to create integration: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (type: "id" | "secret") => {
    if (!createdApp) return;
    const value = type === "id" ? createdApp.clientId : createdApp.clientSecret;
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDone = () => {
    onCreated();
    onClose();
  };

  const goNext = () => {
    const steps: Step[] = ["info", "uris", "scopes", "type", "success"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 2) {
      setCurrentStep(steps[currentIndex + 1]);
    } else if (currentStep === "type") {
      handleCreate();
    }
  };

  const goPrev = () => {
    const steps: Step[] = ["info", "uris", "scopes", "type"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "info":
        return isInfoValid;
      case "uris":
        return isUrisValid;
      case "scopes":
        return isScopesValid;
      case "type":
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-4 shadow-lg"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg)',
        }}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--win95-highlight)',
            color: 'white',
          }}
        >
          <span className="font-bold text-sm flex items-center gap-2">
            <i className="fas fa-plus-circle" />
            {currentStep === "success" ? "Integration Created!" : "Create Custom Integration"}
          </span>
          {currentStep !== "success" && (
            <button onClick={onClose} className="hover:bg-white/20 px-2 py-1 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Progress Steps (hidden on success) */}
        {currentStep !== "success" && (
          <div className="flex border-b-2 shrink-0" style={{ borderColor: 'var(--win95-border)' }}>
            {[
              { key: "info", label: "1. Info" },
              { key: "uris", label: "2. Redirect URIs" },
              { key: "scopes", label: "3. Scopes" },
              { key: "type", label: "4. Type" },
            ].map((step, index, arr) => (
              <div
                key={step.key}
                className="flex-1 px-3 py-2 text-xs font-bold text-center border-r-2 last:border-r-0"
                style={{
                  borderColor: 'var(--win95-border)',
                  backgroundColor: currentStep === step.key ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                  color: currentStep === step.key ? 'var(--win95-text)' : 'var(--neutral-gray)',
                }}
              >
                {step.label}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Basic Info */}
          {currentStep === "info" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Integration Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Website, Mobile App"
                  className="w-full px-3 py-2 text-sm border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-input-bg)',
                    color: 'var(--win95-text)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  At least 3 characters
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will this integration be used for?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border-2 resize-none"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-input-bg)',
                    color: 'var(--win95-text)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Icon
                </label>
                <FAIconPicker selectedIcon={icon} onSelect={setIcon} />
              </div>
            </div>
          )}

          {/* Step 2: Redirect URIs */}
          {currentStep === "uris" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Redirect URIs *
                </label>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  Enter the URLs where users will be redirected after authorization. HTTPS is required (except localhost for development).
                </p>

                <div className="space-y-2">
                  {redirectUris.map((uri, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={uri}
                        onChange={(e) => handleUriChange(index, e.target.value)}
                        placeholder="https://yoursite.com/callback"
                        className="flex-1 px-3 py-2 text-sm border-2"
                        style={{
                          borderColor: 'var(--win95-border)',
                          background: 'var(--win95-input-bg)',
                          color: 'var(--win95-text)',
                        }}
                      />
                      {redirectUris.length > 1 && (
                        <button
                          onClick={() => handleRemoveUri(index)}
                          className="beveled-button px-3 py-2"
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddUri}
                  className="mt-2 text-xs font-bold"
                  style={{ color: 'var(--win95-highlight)' }}
                >
                  + Add another URI
                </button>
              </div>

              <div
                className="p-3 border-2 rounded text-xs"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)',
                }}
              >
                <p className="font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                  💡 Tips:
                </p>
                <ul style={{ color: 'var(--neutral-gray)' }} className="space-y-1">
                  <li>• For local development: <code>http://localhost:3000/callback</code></li>
                  <li>• For production: <code>https://yourapp.com/oauth/callback</code></li>
                  <li>• The URI must exactly match what your app sends</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Scopes */}
          {currentStep === "scopes" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Permissions (Scopes)
                </label>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  Select the permissions this integration will request. Users will see these when authorizing.
                </p>
                <ScopeSelector
                  selectedScopes={selectedScopes}
                  onChange={setSelectedScopes}
                />
              </div>
            </div>
          )}

          {/* Step 4: App Type */}
          {currentStep === "type" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  Application Type
                </label>
                <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                  Choose based on whether your app can securely store a client secret.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => setAppType("confidential")}
                    className="w-full flex items-start gap-3 p-3 border-2 rounded text-left transition-colors"
                    style={{
                      borderColor: appType === "confidential" ? 'var(--win95-highlight)' : 'var(--win95-border)',
                      background: appType === "confidential" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                    }}
                  >
                    <div className="mt-0.5">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: 'var(--win95-border)' }}
                      >
                        {appType === "confidential" && (
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--win95-highlight)' }} />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                        Confidential (Server-side)
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                        For backend applications that can securely store secrets. Uses authorization code flow with client secret.
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setAppType("public")}
                    className="w-full flex items-start gap-3 p-3 border-2 rounded text-left transition-colors"
                    style={{
                      borderColor: appType === "public" ? 'var(--win95-highlight)' : 'var(--win95-border)',
                      background: appType === "public" ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                    }}
                  >
                    <div className="mt-0.5">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: 'var(--win95-border)' }}
                      >
                        {appType === "public" && (
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--win95-highlight)' }} />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                        Public (Client-side)
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                        For mobile apps, SPAs, or native apps that cannot store secrets. Uses PKCE flow.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {currentStep === "success" && createdApp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                  <Check size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--win95-text)' }}>
                    Integration Created!
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    Save these credentials - the secret won't be shown again
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div
                className="p-3 border-2 flex items-start gap-2"
                style={{
                  borderColor: '#f59e0b',
                  background: '#fef3c7',
                }}
              >
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#92400e' }} />
                <div className="text-xs" style={{ color: '#92400e' }}>
                  <strong>Important:</strong> Copy and save your client secret now. It will only be shown once for security reasons.
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Client ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdApp.clientId}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border-2 font-mono"
                      style={{
                        borderColor: 'var(--win95-border)',
                        background: 'var(--win95-bg-light)',
                        color: 'var(--win95-text)',
                      }}
                    />
                    <button
                      onClick={() => handleCopy("id")}
                      className="beveled-button px-3 py-2 font-bold text-xs"
                      style={{
                        backgroundColor: copied === "id" ? '#10b981' : 'var(--win95-highlight)',
                        color: 'white',
                      }}
                    >
                      {copied === "id" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                    Client Secret
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdApp.clientSecret}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border-2 font-mono"
                      style={{
                        borderColor: '#ef4444',
                        background: '#fee2e2',
                        color: 'var(--win95-text)',
                      }}
                    />
                    <button
                      onClick={() => handleCopy("secret")}
                      className="beveled-button px-3 py-2 font-bold text-xs"
                      style={{
                        backgroundColor: copied === "secret" ? '#10b981' : 'var(--win95-highlight)',
                        color: 'white',
                      }}
                    >
                      {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t-2 flex justify-between shrink-0"
          style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}
        >
          {currentStep !== "success" ? (
            <>
              <button
                onClick={currentStep === "info" ? onClose : goPrev}
                className="beveled-button px-4 py-2 text-xs font-bold flex items-center gap-1"
                style={{
                  backgroundColor: 'var(--win95-button-face)',
                  color: 'var(--win95-text)',
                }}
              >
                {currentStep === "info" ? (
                  "Cancel"
                ) : (
                  <>
                    <ArrowLeft size={12} /> Back
                  </>
                )}
              </button>
              <button
                onClick={goNext}
                disabled={!canProceed() || isCreating}
                className="beveled-button px-4 py-2 text-xs font-bold text-white flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--win95-highlight)',
                }}
              >
                {isCreating ? (
                  "Creating..."
                ) : currentStep === "type" ? (
                  <>
                    Create <Check size={12} />
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={12} />
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleDone}
              className="beveled-button ml-auto px-6 py-2 text-xs font-bold text-white"
              style={{
                backgroundColor: 'var(--win95-highlight)',
              }}
            >
              Done - I've Saved My Credentials
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
