"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Globe, Plus, Edit2, Trash2, Loader2, AlertCircle, Mail, Layout, CheckCircle, XCircle } from "lucide-react";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { PermissionGuard } from "@/components/permission";
import { DomainConfigModal } from "./domain-config-modal";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Type for domain config custom properties
interface DomainConfigProperties {
  domainName?: string;
  branding?: {
    primaryColor?: string;
  };
  email?: {
    senderEmail?: string;
  };
  webPublishing?: {
    siteUrl?: string;
  };
}

interface DomainConfigTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function DomainConfigTab({ organizationId, sessionId }: DomainConfigTabProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.manage.domains");
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Doc<"objects"> | undefined>();

  // Fetch domain configs
  const domainConfigs = useQuery(
    api.domainConfigOntology.listDomainConfigs,
    organizationId && sessionId ? { sessionId, organizationId } : "skip"
  );

  // Delete mutation
  const deleteDomainConfig = useMutation(api.domainConfigOntology.deleteDomainConfig);

  const handleDelete = async (config: Doc<"objects">) => {
    const props = config.customProperties as DomainConfigProperties;
    const domainName = props?.domainName || 'this domain';
    if (!confirm(t("ui.manage.domains.alert.delete_confirm", { domain: domainName }))) {
      return;
    }

    try {
      await deleteDomainConfig({ sessionId, configId: config._id });
    } catch (error) {
      console.error("Failed to delete domain config:", error);
      alert(t("ui.manage.domains.alert.delete_error"));
    }
  };

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Permission Warning */}
      <PermissionGuard permission="manage_organization" mode="show-fallback" fallback={
        <div
          className="mb-4 p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--error)',
            borderColor: 'var(--win95-border)',
            color: 'white'
          }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{t("ui.manage.domains.warning.view_only.title")}</p>
            <p className="text-xs mt-1">
              {t("ui.manage.domains.warning.view_only.message")}
            </p>
          </div>
        </div>
      }>
        {null}
      </PermissionGuard>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
            <Globe size={16} />
            {t("ui.manage.domains.header.title")}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.manage.domains.header.description")}
          </p>
        </div>

        <PermissionGuard permission="manage_organization">
          <button
            onClick={() => {
              setEditingConfig(undefined);
              setShowModal(true);
            }}
            className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
            style={{
              backgroundColor: "var(--success)",
              color: "white",
            }}
          >
            <Plus size={12} />
            {t("ui.manage.domains.actions.add_domain")}
          </button>
        </PermissionGuard>
      </div>

      {/* Info Box */}
      <div
        className="p-3 border-2"
        style={{
          backgroundColor: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)',
        }}
      >
        <div className="flex items-start gap-2">
          <Globe size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
              {t("ui.manage.domains.info.title")}
            </p>
            <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>• {t("ui.manage.domains.info.point_1")}</li>
              <li>• {t("ui.manage.domains.info.point_2")}</li>
              <li>• {t("ui.manage.domains.info.point_3")}</li>
              <li>• {t("ui.manage.domains.info.point_4")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Domain Configs List */}
      {!domainConfigs ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
        </div>
      ) : domainConfigs.length === 0 ? (
        <div
          className="text-center py-12 border-2"
          style={{
            borderColor: 'var(--win95-border)',
            backgroundColor: 'var(--win95-bg-light)'
          }}
        >
          <Globe size={48} className="mx-auto mb-4 opacity-50" style={{ color: 'var(--neutral-gray)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.manage.domains.empty.title")}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.manage.domains.empty.description")}
          </p>
          <PermissionGuard permission="manage_organization">
            <button
              onClick={() => {
                setEditingConfig(undefined);
                setShowModal(true);
              }}
              className="beveled-button mt-4 px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--win95-highlight)",
                color: "white",
              }}
            >
              {t("ui.manage.domains.empty.action")}
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="space-y-3">
          {domainConfigs.map((config) => {
            const props = config.customProperties as DomainConfigProperties;
            const hasEmail = !!props.email;
            const hasWeb = !!props.webPublishing;

            return (
              <div
                key={config._id}
                className="border-2 p-4"
                style={{
                  borderColor: 'var(--win95-border)',
                  backgroundColor: 'var(--win95-bg-light)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Domain Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <Globe size={16} style={{ color: 'var(--win95-highlight)' }} />
                      <h4 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                        {props.domainName}
                      </h4>
                      {config.status === "active" ? (
                        <span
                          className="text-xs px-2 py-0.5 flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--success)',
                            color: 'white',
                          }}
                        >
                          <CheckCircle size={10} />
                          {t("ui.manage.domains.status.active")}
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2 py-0.5 flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--error)',
                            color: 'white',
                          }}
                        >
                          <XCircle size={10} />
                          {t("ui.manage.domains.status.inactive")}
                        </span>
                      )}
                    </div>

                    {/* Branding Info */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--win95-text)' }}>
                          {t("ui.manage.domains.field.branding")}
                        </span>
                        <span style={{ color: 'var(--neutral-gray)' }}> {props.branding?.primaryColor || 'Not set'}</span>
                      </div>

                      {/* Email Config */}
                      {hasEmail && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} style={{ color: 'var(--success)' }} />
                          <span style={{ color: 'var(--win95-text)' }}>
                            {t("ui.manage.domains.field.email")} {props.email?.senderEmail}
                          </span>
                        </div>
                      )}

                      {/* Web Publishing */}
                      {hasWeb && (
                        <div className="flex items-center gap-2">
                          <Layout size={12} style={{ color: 'var(--win95-highlight)' }} />
                          <span style={{ color: 'var(--win95-text)' }}>
                            {t("ui.manage.domains.field.web")} {props.webPublishing?.siteUrl || t("ui.manage.domains.field.configured")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <PermissionGuard permission="manage_organization">
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingConfig(config);
                          setShowModal(true);
                        }}
                        className="beveled-button p-2 text-xs"
                        style={{
                          backgroundColor: "var(--win95-button-face)",
                        }}
                        title="Edit"
                      >
                        <Edit2 size={12} style={{ color: 'var(--win95-text)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(config)}
                        className="beveled-button p-2 text-xs"
                        style={{
                          backgroundColor: "var(--error)",
                          color: "white",
                        }}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </PermissionGuard>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Domain Config Modal */}
      <DomainConfigModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingConfig(undefined);
        }}
        config={editingConfig}
        organizationId={organizationId}
        sessionId={sessionId}
      />
    </div>
  );
}
