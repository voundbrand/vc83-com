"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Key, Plus, Trash2, Copy, Loader2, AlertCircle, Shield, Smartphone, Check } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { PermissionGuard } from "@/components/permission";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";

interface SecurityTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function SecurityTab({ organizationId, sessionId }: SecurityTabProps) {
  const { t } = useNamespaceTranslations("ui.manage");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasskeySetup, setShowPasskeySetup] = useState(false);

  // Check if API keys are enabled for this organization
  const apiSettings = useQuery(
    api.organizationApiSettings.getApiSettings,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  // Fetch API keys for this organization
  const apiKeys = useQuery(
    api.api.auth.listApiKeys,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  // Fetch user's passkeys
  const passkeys = useQuery(
    api.passkeys.listPasskeys,
    sessionId ? { sessionId } : "skip"
  );

  const isApiKeysEnabled = apiSettings?.apiKeysEnabled ?? false;

  return (
    <div className="space-y-6">
      {/* PASSKEY SECTION - Multi-Factor Authentication */}
      <div className="border-2 p-4 space-y-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
              <Smartphone size={16} />
              Multi-Factor Authentication (Face ID / Touch ID)
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Add an extra layer of security with biometric authentication. Use your phone or laptop&apos;s Face ID or Touch ID for fast, secure login.
            </p>
          </div>
        </div>

        {/* Passkey Benefits */}
        <div
          className="p-3 border-2 space-y-2"
          style={{
            backgroundColor: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>Faster login - no typing passwords</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>More secure - phishing-proof biometrics</span>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--win95-text)' }}>
            <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success)' }} />
            <span>Works on phone, laptop, or security key</span>
          </div>
        </div>

        {/* Passkeys List */}
        {!passkeys ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--neutral-gray)' }} />
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-4">
            <Smartphone size={32} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--neutral-gray)' }} />
            <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
              No passkeys set up yet
            </p>
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="px-3 py-2 text-xs font-bold text-white flex items-center gap-1 mx-auto"
              style={{
                backgroundColor: 'var(--win95-highlight)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
            >
              <Plus size={12} />
              Set up Face ID / Touch ID
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                sessionId={sessionId}
              />
            ))}
            <button
              onClick={() => setShowPasskeySetup(true)}
              className="w-full px-3 py-2 text-xs font-bold flex items-center justify-center gap-1"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
            >
              <Plus size={12} />
              Add another device
            </button>
          </div>
        )}
      </div>

      {/* Passkey Setup Modal */}
      {showPasskeySetup && (
        <PasskeySetupModal
          sessionId={sessionId}
          onClose={() => setShowPasskeySetup(false)}
        />
      )}

      {/* DIVIDER */}
      <div className="border-t-2 my-4" style={{ borderColor: 'var(--win95-border)' }} />

      {/* API KEYS SECTION (existing code below) */}
      {/* API Keys Disabled Warning */}
      {!isApiKeysEnabled && (
        <div
          className="p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--warning)',
            borderColor: 'var(--win95-border)',
            color: 'var(--win95-text)'
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{t("ui.manage.security.warning.api_disabled.title")}</p>
            <p className="text-xs mt-1">
              {t("ui.manage.security.warning.api_disabled.message")}
            </p>
          </div>
        </div>
      )}

      {/* Permission Warning */}
      <PermissionGuard permission="manage_organization" mode="show-fallback" fallback={
        <div
          className="mb-4 p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--warning)',
            borderColor: 'var(--win95-border)',
            color: 'var(--win95-text)'
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{t("ui.manage.security.warning.view_only.title")}</p>
            <p className="text-xs mt-1">
              {t("ui.manage.security.warning.view_only.message")}
            </p>
          </div>
        </div>
      }>
        {null}
      </PermissionGuard>

      {/* Header */}
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Key size={16} />
          {t("ui.manage.security.header.title")}
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.manage.security.header.description")}
        </p>
      </div>

      {/* Security Best Practices */}
      <div
        className="p-3 border-2"
        style={{
          backgroundColor: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)',
        }}
      >
        <div className="flex items-start gap-2">
          <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
              {t("ui.manage.security.best_practices.title")}
            </p>
            <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>• {t("ui.manage.security.best_practices.item_1")}</li>
              <li>• {t("ui.manage.security.best_practices.item_2")}</li>
              <li>• {t("ui.manage.security.best_practices.item_3")}</li>
              <li>• {t("ui.manage.security.best_practices.item_4")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="border-2" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
        {/* Header with Create Button */}
        <div
          className="px-3 py-2 border-b-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)',
          }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.manage.security.list.title")}
          </span>
          <PermissionGuard permission="manage_organization">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isApiKeysEnabled}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
              title={!isApiKeysEnabled ? t("ui.manage.security.list.tooltip.disabled") : t("ui.manage.security.list.tooltip.generate")}
            >
              <Plus size={12} />
              {t("ui.manage.security.list.button.generate")}
            </button>
          </PermissionGuard>
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
                {t("ui.manage.security.list.empty.title")}
              </p>
              <PermissionGuard permission="manage_organization">
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.manage.security.list.empty.description")}
                </p>
              </PermissionGuard>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--win95-border)' }}>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.security.table.header.name")}
                  </th>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.security.table.header.key_preview")}
                  </th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.security.table.header.status")}
                  </th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.security.table.header.requests")}
                  </th>
                  <th className="text-left pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.security.table.header.created")}
                  </th>
                  <th className="text-center pb-2 font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.manage.security.table.header.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
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
  const { t } = useNamespaceTranslations("ui.manage");
  const [isRevoking, setIsRevoking] = useState(false);
  const revokeApiKey = useMutation(api.api.auth.revokeApiKey);

  const handleRevoke = async () => {
    const confirmMessage = `${t("ui.manage.security.revoke.confirm.title")} "${apiKey.name}"?\n\n${t("ui.manage.security.revoke.confirm.message")}`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsRevoking(true);
      await revokeApiKey({
        sessionId,
        organizationId,
        keyPreview: apiKey.keyPreview,
        reason: "Revoked by organization administrator",
      });
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      alert(`${t("ui.manage.security.revoke.error")}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.keyPreview);
    alert(t("ui.manage.security.table.action.copy_success"));
  };

  return (
    <tr className="border-b hover:bg-opacity-50" style={{ borderColor: 'var(--win95-border)' }}>
      <td className="py-2" style={{ color: 'var(--win95-text)' }}>{apiKey.name}</td>
      <td className="py-2 font-mono text-xs">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1"
          style={{ color: 'var(--win95-text)' }}
          title={t("ui.manage.security.table.action.copy")}
        >
          {apiKey.keyPreview}
          <Copy size={10} />
        </button>
      </td>
      <td className="py-2 text-center">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{
            backgroundColor: apiKey.status === "active" ? 'var(--success)' : 'var(--error)',
            color: 'white'
          }}
        >
          {apiKey.status === "active" ? t("ui.manage.security.table.status.active") : t("ui.manage.security.table.status.revoked")}
        </span>
      </td>
      <td className="py-2 text-center" style={{ color: 'var(--win95-text)' }}>
        {apiKey.requestCount.toLocaleString()}
      </td>
      <td className="py-2" style={{ color: 'var(--win95-text)' }}>
        {new Date(apiKey.createdAt).toLocaleDateString()}
      </td>
      <td className="py-2 text-center">
        {apiKey.status === "active" && (
          <PermissionGuard permission="manage_organization">
            <button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="px-2 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1 mx-auto"
              style={{
                backgroundColor: 'var(--error)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
            >
              {isRevoking ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Trash2 size={10} />
              )}
              {t("ui.manage.security.table.action.revoke")}
            </button>
          </PermissionGuard>
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
  sessionId,
  onClose,
}: {
  organizationId: Id<"organizations">;
  sessionId: string;
  onClose: () => void;
}) {
  const { t } = useNamespaceTranslations("ui.manage");
  const [keyName, setKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const generateApiKey = useMutation(api.api.auth.generateApiKey);

  const handleGenerate = async () => {
    if (!keyName.trim()) {
      alert(t("ui.manage.security.create.error.name_required"));
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
      alert(`${t("ui.manage.security.create.error.failed")}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAndClose = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      alert(t("ui.manage.security.generated.copy_success"));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="border-4 shadow-lg max-w-md w-full mx-4" style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg)'
      }}>
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--win95-highlight)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold">{t("ui.manage.security.create.title")}</span>
          <button
            onClick={onClose}
            className="hover:bg-opacity-80 px-2"
            style={{ color: 'white' }}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4" style={{ background: 'var(--win95-bg)' }}>
          {!generatedKey ? (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--win95-text)' }}>
                {t("ui.manage.security.create.description")}
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.security.create.label.name")}
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder={t("ui.manage.security.create.placeholder.name")}
                  className="w-full px-3 py-2 text-sm border-2"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-input-bg)',
                    color: 'var(--win95-text)',
                  }}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--win95-button-face)',
                    color: 'var(--win95-text)',
                    border: '2px solid',
                    borderTopColor: 'var(--win95-button-light)',
                    borderLeftColor: 'var(--win95-button-light)',
                    borderBottomColor: 'var(--win95-button-dark)',
                    borderRightColor: 'var(--win95-button-dark)',
                  }}
                  disabled={isGenerating}
                >
                  {t("ui.manage.security.create.button.cancel")}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !keyName.trim()}
                  className="px-3 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--success)',
                    border: '2px solid',
                    borderTopColor: 'var(--win95-button-light)',
                    borderLeftColor: 'var(--win95-button-light)',
                    borderBottomColor: 'var(--win95-button-dark)',
                    borderRightColor: 'var(--win95-button-dark)',
                  }}
                >
                  {isGenerating && <Loader2 size={12} className="animate-spin" />}
                  {t("ui.manage.security.create.button.generate")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-3 border-2" style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--win95-border)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.security.generated.warning.title")}
                </p>
                <p className="text-xs" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.security.generated.warning.message")}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.manage.security.generated.label.key")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedKey}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs font-mono border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)',
                      color: 'var(--win95-text)',
                    }}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedKey)}
                    className="px-3 py-1 text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--win95-button-face)',
                      color: 'var(--win95-text)',
                      border: '2px solid',
                      borderTopColor: 'var(--win95-button-light)',
                      borderLeftColor: 'var(--win95-button-light)',
                      borderBottomColor: 'var(--win95-button-dark)',
                      borderRightColor: 'var(--win95-button-dark)',
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleCopyAndClose}
                className="w-full px-3 py-2 text-xs font-bold text-white"
                style={{
                  backgroundColor: 'var(--win95-highlight)',
                  border: '2px solid',
                  borderTopColor: 'var(--win95-button-light)',
                  borderLeftColor: 'var(--win95-button-light)',
                  borderBottomColor: 'var(--win95-button-dark)',
                  borderRightColor: 'var(--win95-button-dark)',
                }}
              >
                {t("ui.manage.security.generated.button.copy_close")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Passkey Row Component
 */
function PasskeyRow({
  passkey,
  sessionId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  passkey: any;
  sessionId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePasskey = useMutation(api.passkeys.deletePasskey);

  const handleDelete = async () => {
    if (!confirm(`Remove ${passkey.deviceName} from your account?\n\nYou'll need to set it up again if you want to use it for login.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePasskey({
        sessionId,
        passkeyId: passkey.id,
      });
    } catch (error) {
      console.error("Failed to delete passkey:", error);
      alert(`Failed to remove device: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="p-3 border-2 flex items-center justify-between"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)',
      }}
    >
      <div className="flex items-center gap-3">
        <Smartphone size={16} style={{ color: 'var(--win95-highlight)' }} />
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            {passkey.deviceName}
          </div>
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Added {new Date(passkey.createdAt).toLocaleDateString()}
            {passkey.lastUsedAt && ` • Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`}
          </div>
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-2 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
        style={{
          backgroundColor: 'var(--error)',
          border: '2px solid',
          borderTopColor: 'var(--win95-button-light)',
          borderLeftColor: 'var(--win95-button-light)',
          borderBottomColor: 'var(--win95-button-dark)',
          borderRightColor: 'var(--win95-button-dark)',
        }}
      >
        {isDeleting ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          <Trash2 size={10} />
        )}
        Remove
      </button>
    </div>
  );
}

/**
 * Passkey Setup Modal
 */
function PasskeySetupModal({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [deviceName, setDeviceName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const notification = useNotification();

  const handleSetup = async () => {
    if (!deviceName.trim()) {
      notification.error("Missing Device Name", "Please enter a device name");
      return;
    }

    setIsProcessing(true);

    try {
      // Import WebAuthn browser library dynamically
      const { startRegistration } = await import("@simplewebauthn/browser");

      // Step 1: Generate registration options from backend
      const response = await fetch("/api/passkeys/register/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, deviceName }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate passkey challenge");
      }

      const options = await response.json();

      // Step 2: Prompt user for biometric (Face ID/Touch ID)
      const registrationResponse = await startRegistration(options);

      // Step 3: Verify with backend
      const verifyResponse = await fetch("/api/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, response: registrationResponse }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify passkey");
      }

      // Success!
      notification.success(
        "✅ Face ID / Touch ID",
        `Your ${deviceName} has been set up successfully!`
      );
      onClose();
    } catch (err) {
      console.error("Passkey setup error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          notification.error("Setup Cancelled", "Please try again when you're ready.");
        } else if (err.message.includes("conditional-mediation")) {
          notification.error(
            "Browser Not Supported",
            "Your browser doesn't support passkeys yet. Try Chrome, Safari, or Edge."
          );
        } else {
          notification.error("Setup Failed", err.message);
        }
      } else {
        notification.error(
          "Setup Failed",
          "Failed to set up Face ID / Touch ID. Please try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="border-4 shadow-lg max-w-md w-full mx-4" style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg)'
      }}>
        {/* Modal Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--win95-highlight)',
            color: 'white',
          }}
        >
          <span className="text-sm font-bold flex items-center gap-2">
            <Smartphone size={16} />
            Set up Face ID / Touch ID
          </span>
          <button
            onClick={onClose}
            className="hover:bg-opacity-80 px-2"
            style={{ color: 'white' }}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4" style={{ background: 'var(--win95-bg)' }}>
          <p className="text-xs mb-4" style={{ color: 'var(--win95-text)' }}>
            Add biometric authentication for faster, more secure login. You&apos;ll be able to sign in with Face ID or Touch ID instead of typing your password.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., iPhone 15 Pro, MacBook Air"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-text)',
              }}
              disabled={isProcessing}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Give this device a recognizable name so you can identify it later.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: 'var(--win95-button-face)',
                color: 'var(--win95-text)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSetup}
              disabled={isProcessing || !deviceName.trim()}
              className="px-3 py-1 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
              style={{
                backgroundColor: 'var(--win95-highlight)',
                border: '2px solid',
                borderTopColor: 'var(--win95-button-light)',
                borderLeftColor: 'var(--win95-button-light)',
                borderBottomColor: 'var(--win95-button-dark)',
                borderRightColor: 'var(--win95-button-dark)',
              }}
            >
              {isProcessing && <Loader2 size={12} className="animate-spin" />}
              {isProcessing ? "Setting up..." : "Set up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
