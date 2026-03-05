"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Key, Plus, Trash2, Copy, Loader2, AlertCircle, Shield, Crown } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any };
// Cast Convex hooks to `any` to avoid deep recursive inference with the generated API surface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useQueryAny = useQuery as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useMutationAny = useMutation as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useActionAny = useAction as any;

interface AdminSecurityTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function AdminSecurityTab({ organizationId, sessionId }: AdminSecurityTabProps) {
  const { t } = useNamespaceTranslations("ui.super_admin.manage_org.admin_security");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const fullKey = `ui.super_admin.manage_org.admin_security.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRepairingPrimaryRouting, setIsRepairingPrimaryRouting] = useState(false);
  const [primaryRoutingMessage, setPrimaryRoutingMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check if API keys are enabled for this organization
  const apiSettings = useQueryAny(
    api.organizationApiSettings.getApiSettings,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  // Fetch API keys for this organization
  const apiKeys = useQueryAny(
    api.api.auth.listApiKeys,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  // Get organization details
  const organization = useQueryAny(
    api.organizations.getById,
    organizationId && sessionId ? { organizationId, sessionId } : "skip"
  );
  const backfillPrimaryAgentContextsForOrganization = useMutationAny(
    api.migrations.backfillPrimaryAgentContexts.backfillPrimaryAgentContextsForOrganization
  );

  const isApiKeysEnabled = apiSettings?.apiKeysEnabled ?? false;

  const handleRepairPrimaryRouting = async () => {
    if (isRepairingPrimaryRouting) {
      return;
    }

    const confirmed = confirm(
      tx(
        "primary_repair.confirm",
        "Run primary-agent context backfill for all users in this organization now?"
      )
    );
    if (!confirmed) {
      return;
    }

    setIsRepairingPrimaryRouting(true);
    setPrimaryRoutingMessage(null);
    try {
      const result = await backfillPrimaryAgentContextsForOrganization({
        sessionId,
        organizationId,
        dryRun: false,
      });
      const patchedAgents =
        typeof result?.patchedAgents === "number" ? result.patchedAgents : 0;
      const contextsNeedingPatch =
        typeof result?.contextsNeedingPatch === "number"
          ? result.contextsNeedingPatch
          : 0;
      const recoveryAction =
        typeof result?.recoveryAction === "string" ? result.recoveryAction : null;
      const recoverySuffix = recoveryAction ? ` Recovery: ${recoveryAction}.` : "";
      setPrimaryRoutingMessage({
        type: "success",
        text: `Primary-agent routing backfill completed. Contexts repaired: ${contextsNeedingPatch}. Agents patched: ${patchedAgents}.${recoverySuffix}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : tx("primary_repair.failed", "Primary-agent routing backfill failed.");
      setPrimaryRoutingMessage({ type: "error", text: message });
    } finally {
      setIsRepairingPrimaryRouting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Super Admin Notice */}
      <div
        className="p-3 border-2 flex items-start gap-2"
        style={{
          backgroundColor: 'var(--error)',
          borderColor: 'var(--window-document-border)',
          color: 'white'
        }}
      >
        <Crown size={16} className="mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">{tx("banner.super_admin_mode", "Super Admin Mode")}</p>
          <p className="text-xs mt-1">
            {tx("banner.managing_prefix", "You are managing API keys for")} {organization?.name}
            {tx(
              "banner.managing_suffix",
              ". You have full access to generate, view, and revoke API keys."
            )}
          </p>
        </div>
      </div>

      {/* API Keys Status */}
      {!isApiKeysEnabled ? (
        <div
          className="p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--warning)',
            borderColor: 'var(--window-document-border)',
            color: 'var(--window-document-text)'
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{tx("status.disabled_title", "API Keys Disabled")}</p>
            <p className="text-xs mt-1">
              {tx(
                "status.disabled_body",
                "API keys are currently disabled for this organization. Enable them in the App Availability tab → Security & API Management section."
              )}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--success)',
            borderColor: 'var(--window-document-border)',
            color: 'white'
          }}
        >
          <Shield size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{tx("status.enabled_title", "API Keys Enabled")}</p>
            <p className="text-xs mt-1">
              {tx(
                "status.enabled_body",
                "This organization can generate and manage API keys for external integrations."
              )}
            </p>
          </div>
        </div>
      )}

      {/* Primary Agent Routing Recovery */}
      <div
        className="p-3 border-2"
        style={{
          backgroundColor: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
              {tx("primary_repair.title", "Primary Agent Routing Recovery")}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "primary_repair.body",
                "Repairs active primary-agent context assignments for all users in this organization."
              )}
            </p>
          </div>
          <button
            onClick={handleRepairPrimaryRouting}
            disabled={isRepairingPrimaryRouting}
            className="beveled-button flex items-center gap-1 px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--button-primary-text, #0f0f0f)",
            }}
            title={tx(
              "primary_repair.button_title",
              "Backfill primary-agent context assignments for this org"
            )}
          >
            {isRepairingPrimaryRouting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Shield size={12} />
            )}
            {tx("primary_repair.button", "Run Primary Backfill")}
          </button>
        </div>

        {primaryRoutingMessage && (
          <div
            className="mt-3 p-2 text-xs"
            style={{
              background:
                primaryRoutingMessage.type === "success"
                  ? "var(--success)"
                  : "var(--error)",
              color: "white",
            }}
          >
            {primaryRoutingMessage.text}
          </div>
        )}
      </div>

      {/* Header */}
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
          <Key size={16} />
          {tx("header.title", "API Keys Management")}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {tx("header.subtitle_prefix", "Generate and manage API keys for")} {organization?.name}{" "}
          {tx("header.subtitle_suffix", "to enable external integrations.")}
        </p>
      </div>

      {/* Security Best Practices */}
      <div
        className="p-3 border-2"
        style={{
          backgroundColor: 'var(--window-document-bg-elevated)',
          borderColor: 'var(--window-document-border)',
        }}
      >
        <div className="flex items-start gap-2">
          <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
              {tx("best_practices.title", "Security Best Practices")}
            </p>
            <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>{tx("best_practices.item_1", "• Store API keys securely - never commit them to version control")}</li>
              <li>{tx("best_practices.item_2", "• Rotate keys regularly, especially after team member departures")}</li>
              <li>{tx("best_practices.item_3", "• Revoke unused or compromised keys immediately")}</li>
              <li>{tx("best_practices.item_4", "• Use descriptive names to track where each key is used")}</li>
              <li>{tx("best_practices.item_5", "• Monitor request counts for unusual activity")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="border-2" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg)' }}>
        {/* Header with Create Button */}
        <div
          className="px-3 py-2 border-b-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--window-document-bg-elevated)',
            borderColor: 'var(--window-document-border)',
          }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
            {tx("list.title", "Active API Keys")}
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!isApiKeysEnabled}
            className="beveled-button flex items-center gap-1 px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
            }}
            title={
              !isApiKeysEnabled
                ? tx("list.generate_button_disabled_title", "Enable API keys first in App Availability tab")
                : tx("list.generate_button_title", "Generate a new API key")
            }
          >
            <Plus size={12} />
            {tx("list.generate_button", "Generate Key")}
          </button>
        </div>

        {/* API Keys Table */}
        <div className="p-3">
          {!apiKeys ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--neutral-gray)' }} />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key size={32} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--neutral-gray)' }} />
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {tx("list.empty_title", "No API keys generated yet.")}
              </p>
              {isApiKeysEnabled && (
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  {tx(
                    "list.empty_hint",
                    'Click "Generate Key" to create the first API key for this organization.'
                  )}
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--window-document-border)' }}>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--window-document-text)' }}>
                    {tx("table.name", "Name")}
                  </th>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--window-document-text)' }}>
                    {tx("table.key_preview", "Key Preview")}
                  </th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--window-document-text)' }}>
                    {tx("table.status", "Status")}
                  </th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--window-document-text)' }}>
                    {tx("table.requests", "Requests")}
                  </th>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--window-document-text)' }}>
                    {tx("table.created", "Created")}
                  </th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--window-document-text)' }}>
                    {tx("table.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key: any) => (
                  <ApiKeyRow
                    key={key.id}
                    apiKey={key}
                    organizationId={organizationId}
                    sessionId={sessionId}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          organizationId={organizationId}
          organizationName={organization?.name || ""}
          sessionId={sessionId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

/**
 * API Key Row Component
 */
function ApiKeyRow({
  apiKey,
  organizationId,
  sessionId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiKey: any;
  organizationId: Id<"organizations">;
  sessionId: string;
}) {
  const { t } = useNamespaceTranslations("ui.super_admin.manage_org.admin_security");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const fullKey = `ui.super_admin.manage_org.admin_security.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [isRevoking, setIsRevoking] = useState(false);
  const revokeApiKey = useMutationAny(api.api.auth.revokeApiKey);

  const handleRevoke = async () => {
    if (
      !confirm(
        `${tx("row.revoke_confirm_prefix", "Are you sure you want to revoke the API key")} "${
          apiKey.name
        }"?\n\n${tx(
          "row.revoke_confirm_suffix",
          "This action cannot be undone and will immediately stop all requests using this key."
        )}`
      )
    ) {
      return;
    }

    try {
      setIsRevoking(true);
      await revokeApiKey({
        sessionId,
        organizationId,
        keyPreview: apiKey.keyPreview,
        reason: "Revoked by super admin",
      });
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      alert(
        `${tx("row.revoke_failed", "Failed to revoke:")} ${
          error instanceof Error ? error.message : tx("row.unknown_error", "Unknown error")
        }`
      );
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.keyPreview);
    alert(tx("row.copy_preview_success", "API key preview copied to clipboard"));
  };

  return (
    <tr className="border-b hover:bg-opacity-50" style={{ borderColor: 'var(--window-document-border)' }}>
      <td className="py-2" style={{ color: 'var(--window-document-text)' }}>{apiKey.name}</td>
      <td className="py-2 font-mono text-xs">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1"
          style={{ color: 'var(--window-document-text)' }}
          title={tx("row.copy_title", "Copy to clipboard")}
        >
          {apiKey.keyPreview}
          <Copy size={10} />
        </button>
      </td>
      <td className="py-2 text-center">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            apiKey.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {apiKey.status}
        </span>
      </td>
      <td className="py-2 text-center" style={{ color: 'var(--window-document-text)' }}>
        {apiKey.requestCount.toLocaleString()}
      </td>
      <td className="py-2" style={{ color: 'var(--window-document-text)' }}>
        {new Date(apiKey.createdAt).toLocaleDateString()}
      </td>
      <td className="py-2 text-center">
        {apiKey.status === "active" && (
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            className="beveled-button px-2 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1 mx-auto"
            style={{
              backgroundColor: 'var(--error)',
            }}
          >
            {isRevoking ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Trash2 size={10} />
            )}
            {tx("row.revoke_button", "Revoke")}
          </button>
        )}
      </td>
    </tr>
  );
}

/**
 * Create API Key Modal
 */
function CreateApiKeyModal({
  organizationId,
  organizationName,
  sessionId,
  onClose,
}: {
  organizationId: Id<"organizations">;
  organizationName: string;
  sessionId: string;
  onClose: () => void;
}) {
  const { t } = useNamespaceTranslations("ui.super_admin.manage_org.admin_security");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const fullKey = `ui.super_admin.manage_org.admin_security.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const generateApiKey = useActionAny(api.actions.apiKeys.generateApiKey);

  const handleGenerate = async () => {
    if (!keyName.trim()) {
      alert(tx("modal.name_required", "Please enter a name for the API key"));
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateApiKey({
        sessionId,
        organizationId,
        name: keyName,
      });
      setGeneratedKey(result.key);
    } catch (error) {
      console.error("Failed to generate API key:", error);
      alert(
        `${tx("modal.generate_failed", "Failed to generate:")} ${
          error instanceof Error ? error.message : tx("row.unknown_error", "Unknown error")
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAndClose = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      alert(
        `${tx("modal.copy_success_title", "API key copied to clipboard!")}\n\n${tx(
          "modal.copy_success_body",
          "Store it securely - you won't be able to see the full key again."
        )}`
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-4 shadow-lg max-w-md w-full mx-4" style={{ borderColor: 'var(--window-document-border)' }}>
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--error)',
            color: 'white',
          }}
        >
          <div className="flex items-center gap-2">
            <Crown size={14} />
            <span className="text-sm font-bold">
              {tx("modal.title", "Generate API Key (Super Admin)")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-opacity-80 px-2"
            style={{ color: 'white' }}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4" style={{ background: 'var(--window-document-bg)' }}>
          {!generatedKey ? (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--window-document-text)' }}>
                {tx("modal.description_prefix", "Generate a new API key for")}{" "}
                <strong>{organizationName}</strong>
                {tx(
                  "modal.description_suffix",
                  ". Give it a descriptive name to help track where it's used."
                )}
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                  {tx("modal.name_label", "API Key Name:")}
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder={tx("modal.name_placeholder", "e.g., Production Integration")}
                  className="w-full px-3 py-2 text-sm border-2"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'var(--window-document-bg)',
                    color: 'var(--window-document-text)',
                  }}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="beveled-button px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--window-document-bg)',
                    color: 'var(--window-document-text)',
                  }}
                  disabled={isGenerating}
                >
                  {tx("modal.cancel", "Cancel")}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !keyName.trim()}
                  className="beveled-button px-3 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--success)',
                  }}
                >
                  {isGenerating && <Loader2 size={12} className="animate-spin" />}
                  {tx("modal.generate", "Generate")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-3 border-2" style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--window-document-border)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                  {tx("modal.important_title", "Important: Copy this key now!")}
                </p>
                <p className="text-xs" style={{ color: 'var(--window-document-text)' }}>
                  {tx(
                    "modal.important_body",
                    "This is the only time you'll be able to see the full API key. Store it securely in your application or environment variables."
                  )}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                  {tx("modal.generated_key_label", "Your API Key:")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedKey}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs font-mono border-2"
                    style={{
                      borderColor: 'var(--window-document-border)',
                      background: 'var(--window-document-bg-elevated)',
                      color: 'var(--window-document-text)',
                    }}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedKey)}
                    className="beveled-button px-3 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--window-document-bg)',
                      color: 'var(--window-document-text)',
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleCopyAndClose}
                className="beveled-button w-full px-3 py-2 text-xs font-bold text-white"
                style={{
                  backgroundColor: 'var(--primary)',
                }}
              >
                {tx("modal.copy_and_close", "Copy & Close")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
