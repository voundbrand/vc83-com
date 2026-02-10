"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation with large integration modules
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { RetroButton } from "@/components/retro-button";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface V0SettingsProps {
  onBack: () => void;
}

export function V0Settings({ onBack }: V0SettingsProps) {
  const { user, sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  const organizationId = currentOrg?.id;

  // Query v0 settings (requires both sessionId and organizationId)
  const settings = useQuery(
    api.integrations.v0.getV0Settings,
    sessionId && organizationId ? { sessionId, organizationId } : "skip"
  ) as { enabled: boolean; hasApiKey: boolean } | null | undefined;

  const saveSettings = useMutation(api.integrations.v0.saveV0Settings);

  const isLoading = settings === undefined;
  const isEnabled = settings?.enabled === true;
  const hasApiKey = settings?.hasApiKey === true;

  const handleConnect = async () => {
    if (!sessionId || !organizationId) {
      notification.error("Sign In Required", "You must be signed in to configure v0");
      return;
    }
    if (!apiKey.trim()) {
      setValidationError("Please enter your v0 API key");
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      await saveSettings({
        sessionId,
        organizationId,
        apiKey: apiKey.trim(),
        enabled: true,
      });
      notification.success("Connected!", "v0 integration enabled");
      setApiKey("");
    } catch (error) {
      console.error("Failed to save v0 settings:", error);
      notification.error(
        "Connection Error",
        error instanceof Error ? error.message : "Failed to save v0 settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId || !organizationId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Disable v0 Integration",
      message:
        "Are you sure? Your org will fall back to the platform default v0 API key (if configured). Existing v0 chats will still be accessible.",
      confirmText: "Disable",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) return;

    try {
      await saveSettings({
        sessionId,
        organizationId,
        enabled: false,
      });
      notification.success("Disabled", "v0 integration disabled for this org");
    } catch (error) {
      console.error("Failed to disable v0:", error);
      notification.error(
        "Error",
        error instanceof Error ? error.message : "Failed to disable v0"
      );
    }
  };

  const handleUpdateKey = async () => {
    if (!sessionId || !organizationId || !apiKey.trim()) return;

    setIsSaving(true);
    try {
      await saveSettings({
        sessionId,
        organizationId,
        apiKey: apiKey.trim(),
        enabled: true,
      });
      notification.success("Updated", "v0 API key updated");
      setApiKey("");
    } catch (error) {
      console.error("Failed to update v0 key:", error);
      notification.error(
        "Update Failed",
        error instanceof Error ? error.message : "Failed to update API key"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center gap-3"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--win95-highlight)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={24} style={{ color: "#000000" }} />
            <div>
              <h2 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                v0 by Vercel
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                AI-powered UI generation
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="p-6 border-2 rounded flex flex-col items-center justify-center gap-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-text)" }} />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading settings...
              </p>
            </div>
          ) : isEnabled && hasApiKey ? (
            /* Connected State — org has its own key configured */
            <div className="space-y-4">
              {/* Status */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span className="text-xs font-bold" style={{ color: "#10b981" }}>
                    Enabled
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    API Key
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    Custom org key configured
                  </p>
                </div>
              </div>

              {/* Available Features */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Available Features
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>AI-generated UI components</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Builder app scaffolding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Iterative chat refinement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: "#10b981" }} />
                    <span>Live preview with demo URLs</span>
                  </div>
                </div>
              </div>

              {/* Update API Key */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Update API Key
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                  Replace the existing API key with a new one.
                </p>
                <div className="relative mb-3">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="New v0 API key"
                    className="w-full px-2 py-1 border-2 text-xs pr-8"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--neutral-gray)" }}
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <RetroButton
                  onClick={handleUpdateKey}
                  disabled={isSaving || !apiKey.trim()}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Key"
                  )}
                </RetroButton>
              </div>

              {/* Actions */}
              <RetroButton variant="secondary" onClick={handleDisconnect} className="w-full">
                Disable v0 Integration
              </RetroButton>
            </div>
          ) : (
            /* Not Connected State */
            <div className="space-y-4">
              <div
                className="p-6 border-2 rounded text-center"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <Sparkles size={48} className="mx-auto mb-4" style={{ color: "#000000" }} />
                <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Not Configured
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Add your v0 API key to use AI-powered UI generation in the Builder.
                </p>
              </div>

              {/* Features */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Features
                </p>
                <div className="space-y-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <div className="flex items-start gap-2">
                    <span>&#10024;</span>
                    <span>Generate React UI from natural language</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128736;</span>
                    <span>Scaffold full builder apps with AI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#128488;</span>
                    <span>Iterate on designs through chat</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>&#127760;</span>
                    <span>Live preview and demo URLs</span>
                  </div>
                </div>
              </div>

              {/* Connection Form */}
              <div
                className="p-4 border-2 rounded"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <p className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Enter your v0 API key
                </p>

                {validationError && (
                  <div
                    className="p-2 mb-3 border rounded text-xs"
                    style={{
                      borderColor: "#ef4444",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                    }}
                  >
                    {validationError}
                  </div>
                )}

                <div>
                  <label
                    className="text-xs font-bold block mb-1"
                    style={{ color: "var(--win95-text)" }}
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="v0_..."
                      className="w-full px-2 py-1 border-2 text-xs pr-8"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-bg)",
                        color: "var(--win95-text)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--neutral-gray)" }}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Generate a key at v0.dev/chat/settings
                  </p>
                </div>
              </div>

              {/* Help Link */}
              <a
                href="https://v0.dev/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: "var(--win95-highlight)" }}
              >
                <ExternalLink size={12} />
                v0 documentation
              </a>

              {/* Connect Button */}
              <RetroButton
                onClick={handleConnect}
                disabled={isSaving || !user}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="mr-1" />
                    Enable v0 Integration
                  </>
                )}
              </RetroButton>

              {!user && (
                <p className="text-xs text-center italic" style={{ color: "var(--neutral-gray)" }}>
                  Please sign in to configure v0
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
