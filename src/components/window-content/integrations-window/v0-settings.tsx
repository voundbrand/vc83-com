"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { InteriorButton } from "@/components/ui/interior-button";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { useNotification } from "@/hooks/use-notification";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";

// Dynamic require to avoid deep type-instantiation with the generated API object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

interface V0SettingsProps {
  onBack: () => void;
}

interface V0SettingsResponse {
  enabled: boolean;
  hasApiKey: boolean;
  credentialMode?: "managed" | "byok";
  usingManagedProvider?: boolean;
  canConfigureByok?: boolean;
  requiredTierForByok?: string;
  planTier?: string;
}

export function V0Settings({ onBack }: V0SettingsProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const organizationId = currentOrg?.id;
  const settings = useQuery(
    api.integrations.v0.getV0Settings,
    sessionId && organizationId ? { sessionId, organizationId } : "skip"
  ) as V0SettingsResponse | null | undefined;
  const saveSettings = useMutation(api.integrations.v0.saveV0Settings);

  const isLoading = settings === undefined;
  const isEnabled = settings?.enabled === true;
  const hasByokKey = settings?.hasApiKey === true;
  const credentialMode = settings?.credentialMode || (hasByokKey ? "byok" : "managed");
  const usingManagedProvider =
    settings?.usingManagedProvider ?? credentialMode !== "byok";
  const canConfigureByok = settings?.canConfigureByok === true;
  const requiredTierForByok =
    settings?.requiredTierForByok || "Scale (€299/month)";

  const handleEnableManaged = async () => {
    if (!sessionId || !organizationId) return;
    setIsSaving(true);
    setValidationError(null);
    try {
      await saveSettings({
        sessionId,
        organizationId,
        apiKey: "",
        enabled: true,
      });
      notification.success("Managed Mode Enabled", "Platform-managed v0 credits are active.");
    } catch (error) {
      notification.error(
        "Enable Failed",
        error instanceof Error ? error.message : "Failed to enable managed mode"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!sessionId || !organizationId) return;
    const confirmed = await confirmDialog.confirm({
      title: "Disable v0 Integration",
      message:
        "Disable generation for this organization? You can re-enable managed mode at any time.",
      confirmText: "Disable",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await saveSettings({
        sessionId,
        organizationId,
        enabled: false,
      });
      notification.success("Disabled", "v0 integration is disabled for this organization.");
    } catch (error) {
      notification.error(
        "Disable Failed",
        error instanceof Error ? error.message : "Failed to disable v0 integration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveByok = async () => {
    if (!sessionId || !organizationId) return;
    if (!canConfigureByok) {
      notification.error(
        "Upgrade Required",
        `BYOK requires ${requiredTierForByok} or higher.`
      );
      return;
    }
    if (!apiKey.trim()) {
      setValidationError("Enter a valid v0 API key.");
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
      setApiKey("");
      notification.success("BYOK Enabled", "Your organization v0 key is now active.");
    } catch (error) {
      notification.error(
        "Save Failed",
        error instanceof Error ? error.message : "Failed to save BYOK key"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToManaged = async () => {
    if (!sessionId || !organizationId) return;
    setIsSaving(true);
    try {
      await saveSettings({
        sessionId,
        organizationId,
        apiKey: "",
        enabled: true,
      });
      setApiKey("");
      notification.success("Managed Mode Enabled", "Switched back to platform-managed credits.");
    } catch (error) {
      notification.error(
        "Switch Failed",
        error instanceof Error ? error.message : "Failed to switch to managed mode"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <confirmDialog.Dialog />
      <div className="flex h-full flex-col" style={{ background: "var(--window-document-bg)" }}>
        <div
          className="flex items-center gap-3 border-b-2 px-4 py-3"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm hover:underline"
            style={{ color: "var(--tone-accent)" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={22} style={{ color: "#000000" }} />
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                v0 by Vercel
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Managed credits by default, BYOK for Scale+
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isLoading ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded border-2 p-6"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
              }}
            >
              <Loader2 size={24} className="animate-spin" />
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Loading settings...
              </p>
            </div>
          ) : (
            <>
              <div
                className="rounded border-2 p-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    style={{
                      color: isEnabled ? "#10b981" : "var(--neutral-gray)",
                    }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: isEnabled ? "#10b981" : "var(--neutral-gray)",
                    }}
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {!isEnabled
                    ? "v0 generation is disabled for this organization."
                    : usingManagedProvider
                    ? "Managed mode is active. Generation uses platform-managed credits."
                    : "BYOK mode is active for this organization."}
                </p>
              </div>

              {!isEnabled && (
                <InteriorButton onClick={handleEnableManaged} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    "Enable Managed Mode"
                  )}
                </InteriorButton>
              )}

              {isEnabled && (
                <div className="space-y-3">
                  <div
                    className="rounded border-2 p-4"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck size={14} />
                      <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                        Mode
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {usingManagedProvider
                        ? "Managed (recommended for Starter/Pro/Professional)."
                        : "BYOK (Scale/Enterprise entitlement required)."}
                    </p>
                    {!usingManagedProvider && (
                      <div className="mt-3">
                        <InteriorButton
                          variant="secondary"
                          onClick={handleSwitchToManaged}
                          disabled={isSaving}
                          className="w-full"
                        >
                          Switch to Managed
                        </InteriorButton>
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded border-2 p-4"
                    style={{
                      borderColor: canConfigureByok ? "var(--window-document-border)" : "#f59e0b",
                      background: canConfigureByok
                        ? "var(--window-document-bg-elevated)"
                        : "#fef3c7",
                    }}
                  >
                    <p className="mb-2 text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      Bring Your Own v0 Key (Optional)
                    </p>
                    {!canConfigureByok ? (
                      <p className="text-xs" style={{ color: "#92400E" }}>
                        Upgrade to {requiredTierForByok} or higher to enable BYOK.
                      </p>
                    ) : (
                      <>
                        <p className="mb-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                          Save your organization key to use BYOK mode.
                        </p>
                        {validationError && (
                          <div
                            className="mb-3 rounded border p-2 text-xs"
                            style={{
                              borderColor: "#ef4444",
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                            }}
                          >
                            {validationError}
                          </div>
                        )}
                        <div className="relative">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(event) => {
                              setApiKey(event.target.value);
                              setValidationError(null);
                            }}
                            placeholder="v0_..."
                            className="w-full border-2 px-2 py-1 pr-8 text-xs"
                            style={{
                              borderColor: "var(--window-document-border)",
                              background: "var(--window-document-bg)",
                              color: "var(--window-document-text)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey((current) => !current)}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            style={{ color: "var(--neutral-gray)" }}
                          >
                            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                          Paste a v0 key from your v0 account settings.
                        </p>
                        <div className="mt-3">
                          <InteriorButton
                            onClick={handleSaveByok}
                            disabled={isSaving || !apiKey.trim()}
                            className="w-full"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 size={14} className="mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save BYOK Key"
                            )}
                          </InteriorButton>
                        </div>
                      </>
                    )}
                  </div>

                  <InteriorButton
                    variant="secondary"
                    onClick={handleDisable}
                    disabled={isSaving}
                    className="w-full"
                  >
                    Disable v0 Integration
                  </InteriorButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
