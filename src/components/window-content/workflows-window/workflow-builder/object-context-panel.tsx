/**
 * OBJECT CONTEXT PANEL
 *
 * Displays detailed information and settings when an object is selected in the workflow canvas.
 * Shows connections, properties, and quick actions.
 */

"use client";

import React from "react";
import {
  X,
  Package,
  FileText,
  CreditCard,
  Building2,
  User,
  Zap,
  Link2,
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface WorkflowObject {
  objectId: string;
  objectType: string;
  role?: string;
}

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
}

interface ObjectContextPanelProps {
  selectedNode: { id: string; data: Record<string, unknown> } | null;
  objects: WorkflowObject[];
  behaviors: WorkflowBehavior[];
  onClose: () => void;
  onUpdate?: (nodeId: string, updates: Record<string, unknown>) => void;
}

export function ObjectContextPanel({
  selectedNode,
  objects,
  behaviors,
  onClose,
  onUpdate,
}: ObjectContextPanelProps) {
  const { t } = useNamespaceTranslations("ui.workflows");
  if (!selectedNode) return null;

  const isObject = selectedNode.id.startsWith("object-");
  const isBehavior = selectedNode.id.startsWith("behavior-");

  // Get the actual data object
  const nodeData = selectedNode.data;

  // Find connected behaviors for objects
  const connectedBehaviors = isObject
    ? behaviors.filter((b) => {
        const config = (b.config || {}) as Record<string, unknown>;
        // Check if this object is referenced in behavior config
        return (
          config.formId === nodeData.objectId ||
          config.productId === nodeData.objectId ||
          config.checkoutId === nodeData.objectId ||
          config.organizationId === nodeData.objectId
        );
      })
    : [];

  // Find connected objects for behaviors
  const connectedObjects = isBehavior
    ? objects.filter((o) => {
        const config = (nodeData.config || {}) as Record<string, unknown>;
        return (
          config.formId === o.objectId ||
          config.productId === o.objectId ||
          config.checkoutId === o.objectId ||
          config.organizationId === o.objectId
        );
      })
    : [];

  const getIcon = (type: unknown) => {
    const typeStr = String(type);
    switch (typeStr) {
      case "product": return <Package className="h-4 w-4" />;
      case "form": return <FileText className="h-4 w-4" />;
      case "checkout": return <CreditCard className="h-4 w-4" />;
      case "crm_organization": return <Building2 className="h-4 w-4" />;
      case "crm_contact": return <User className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getColor = (type: unknown) => {
    const typeStr = String(type);
    switch (typeStr) {
      case "product": return { bg: "#dbeafe", border: "#2563eb", text: "#2563eb" };
      case "form": return { bg: "#f3e8ff", border: "#9333ea", text: "#9333ea" };
      case "checkout": return { bg: "#dcfce7", border: "#16a34a", text: "#16a34a" };
      case "crm_organization": return { bg: "#fef3c7", border: "#f59e0b", text: "#f59e0b" };
      case "crm_contact": return { bg: "#fee2e2", border: "#dc2626", text: "#dc2626" };
      default: return { bg: "#f3f4f6", border: "#6b7280", text: "#6b7280" };
    }
  };

  const colors = isObject ? getColor(nodeData.objectType) : { bg: "#f5f3ff", border: "#7c3aed", text: "#7c3aed" };

  return (
    <div
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 rounded-lg border-2 shadow-2xl max-w-4xl w-[90%]"
      style={{ borderColor: colors.border, background: 'var(--win95-bg-light)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b-2"
        style={{ borderColor: colors.border, background: colors.bg }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded p-1.5" style={{ background: 'white', color: colors.text }}>
            {isObject ? getIcon(nodeData.objectType) : <Zap className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: colors.text }}>
              {isObject
                ? `${String(nodeData.objectType || '').toUpperCase()}`
                : String(nodeData.label || "Behavior")
              }
            </h3>
            <p className="text-[10px]" style={{ color: colors.text, opacity: 0.7 }}>
              {isObject
                ? `ID: ${String(nodeData.objectId || '').slice(0, 12)}...`
                : `Priority: ${String(nodeData.priority || 100)}`
              }
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-white/50 transition-colors"
          style={{ color: colors.text }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Properties */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Settings className="h-3 w-3" style={{ color: 'var(--neutral-gray)' }} />
                <h4 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                  {t("objectContext.properties.title")}
                </h4>
              </div>
              <div className="space-y-1.5">
                {isObject && (
                  <>
                    <PropertyRow label={t("objectContext.properties.type")} value={String(nodeData.objectType || '')} />
                    <PropertyRow label={t("objectContext.properties.role")} value={String(nodeData.role || "N/A")} />
                    <PropertyRow
                      label={t("objectContext.properties.status")}
                      value={
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          {t("objectContext.properties.active")}
                        </span>
                      }
                    />
                  </>
                )}
                {isBehavior && (
                  <>
                    <PropertyRow label={t("objectContext.properties.type")} value={String(nodeData.behaviorType || '')} />
                    <PropertyRow label={t("objectContext.properties.priority")} value={String(nodeData.priority || 100)} />
                    <PropertyRow
                      label={t("objectContext.properties.status")}
                      value={
                        <span className="flex items-center gap-1">
                          {nodeData.enabled ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              {t("objectContext.properties.enabled")}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-gray-400" />
                              {t("objectContext.properties.disabled")}
                            </>
                          )}
                        </span>
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Connections */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Link2 className="h-3 w-3" style={{ color: 'var(--neutral-gray)' }} />
                <h4 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                  {t("objectContext.connections.title")}
                </h4>
              </div>

              {isObject && (
                <div className="space-y-1.5">
                  {connectedBehaviors.length > 0 ? (
                    <>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--neutral-gray)' }}>
                        {t("objectContext.connections.usedBy", { count: connectedBehaviors.length })}:
                      </p>
                      {connectedBehaviors.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-1.5 text-[10px] rounded px-2 py-1"
                          style={{ background: '#f5f3ff', color: '#7c3aed' }}
                        >
                          <Zap className="h-3 w-3" />
                          <span>{b.type.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-[10px]" style={{ color: 'var(--neutral-gray)', opacity: 0.7 }}>
                      {t("objectContext.connections.noBehaviors")}
                    </p>
                  )}
                </div>
              )}

              {isBehavior && (
                <div className="space-y-1.5">
                  {connectedObjects.length > 0 ? (
                    <>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--neutral-gray)' }}>
                        {t("objectContext.connections.uses", { count: connectedObjects.length })}:
                      </p>
                      {connectedObjects.map((o) => {
                        const objColor = getColor(o.objectType);
                        return (
                          <div
                            key={o.objectId}
                            className="flex items-center gap-1.5 text-[10px] rounded px-2 py-1"
                            style={{ background: objColor.bg, color: objColor.text }}
                          >
                            {getIcon(o.objectType)}
                            <span>{String(o.objectType)}</span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-[10px]" style={{ color: 'var(--neutral-gray)', opacity: 0.7 }}>
                      {t("objectContext.connections.noObjects")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Configuration Summary */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Eye className="h-3 w-3" style={{ color: 'var(--neutral-gray)' }} />
                <h4 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                  {t("objectContext.configuration.title")}
                </h4>
              </div>

              {isObject && (
                <div className="text-[10px] space-y-1">
                  <p style={{ color: 'var(--neutral-gray)' }}>
                    {t("objectContext.configuration.objectAvailable")}
                  </p>
                  {connectedBehaviors.length === 0 && (
                    <div className="mt-2 p-2 rounded" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {t("objectContext.configuration.notUsed")}
                    </div>
                  )}
                </div>
              )}

              {isBehavior && (
                <div className="space-y-1.5">
                  {nodeData.config && typeof nodeData.config === 'object' && Object.keys(nodeData.config as object).length > 0 ? (
                    <>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--neutral-gray)' }}>
                        {t("objectContext.configuration.configuredSettings")}:
                      </p>
                      <div className="space-y-1">
                        {Object.entries(nodeData.config as object).slice(0, 3).map(([key, value]) => (
                          <PropertyRow
                            key={key}
                            label={key.replace(/_/g, " ")}
                            value={typeof value === "object" ? "Complex" : String(value).slice(0, 20)}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-2 rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      <span className="text-[10px]">{t("objectContext.configuration.noConfig")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-3 border-t-2 flex items-center justify-between" style={{ borderColor: 'var(--win95-border)' }}>
          <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
            {isObject
              ? t("objectContext.quickActions.behaviorsUsingObject", { count: connectedBehaviors.length })
              : t("objectContext.quickActions.objectsConnected", { count: connectedObjects.length })
            }
          </div>

          <div className="flex items-center gap-2">
            {isBehavior && onUpdate && (
              <button
                onClick={() => onUpdate(selectedNode.id, { enabled: !nodeData.enabled })}
                className="retro-button flex items-center gap-1 px-2 py-1 text-[10px]"
              >
                {nodeData.enabled ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    {t("objectContext.quickActions.disable")}
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    {t("objectContext.quickActions.enable")}
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="retro-button px-3 py-1 text-[10px]"
            >
              {t("objectContext.quickActions.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="font-bold" style={{ color: 'var(--neutral-gray)' }}>
        {label}:
      </span>
      <span style={{ color: 'var(--win95-text)' }}>
        {value}
      </span>
    </div>
  );
}
