/**
 * BEHAVIOR CONFIG PANEL
 *
 * Right panel for adding and configuring behaviors in the workflow.
 * Allows selecting behavior types and configuring their settings.
 */

"use client";

import React, { useState } from "react";
import { Zap, Plus, Settings, Trash2, Package, FileText, CreditCard, Building2, User, ArrowRight } from "lucide-react";
import { BehaviorConfigModal } from "./behavior-config-modal";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface WorkflowObject {
  objectId: Id<"objects">;
  objectType: string;
  role?: string;
  config?: Record<string, unknown>;
}

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
}

interface BehaviorConfigPanelProps {
  selectedBehaviors: WorkflowBehavior[];
  onAddBehavior: (behavior: WorkflowBehavior) => void;
  onRemoveBehavior: (behaviorId: string) => void;
  onUpdateBehavior: (behaviorId: string, updates: Partial<WorkflowBehavior>) => void;
  sessionId: string;
  organizationId: string;
}

// Behavior type definitions with default configs
// Note: Names and descriptions are translated via translation keys
const BEHAVIOR_TYPES = [
  {
    type: "conditional",
    translationKey: "conditional",
    defaultConfig: {
      conditions: [
        { name: "success", expression: "input.valid === true", color: "#16a34a" },
        { name: "error", expression: "input.valid !== true", color: "#dc2626" },
      ],
    },
  },
  {
    type: "employer-detection",
    translationKey: "employerDetection",
    defaultConfig: {
      employerSourceField: "attendee_category",
      employerMapping: {},
      autoFillBillingAddress: true,
      defaultPaymentTerms: "net30",
    },
  },
  {
    type: "invoice-mapping",
    translationKey: "invoiceMapping",
    defaultConfig: {
      organizationSourceField: "company",
      organizationMapping: {},
      defaultPaymentTerms: "net30",
      requireMapping: false,
    },
  },
  {
    type: "form-linking",
    translationKey: "formLinking",
    defaultConfig: {
      formId: "",
      timing: "duringCheckout",
      required: true,
    },
  },
  {
    type: "addon-calculation",
    translationKey: "addonCalculation",
    defaultConfig: {
      addons: [],
      calculationStrategy: "sum",
      requireAllFields: false,
    },
  },
  {
    type: "payment-provider-selection",
    translationKey: "paymentProviderSelection",
    defaultConfig: {
      defaultProviders: ["stripe"],
      rules: [],
      allowMultipleProviders: true,
      requireProviderSelection: true,
    },
  },
  {
    type: "stripe-payment",
    translationKey: "stripePayment",
    defaultConfig: {
      elementsStyle: {
        base: {
          fontSize: "16px",
          color: "#424770",
        },
      },
      collectBillingDetails: {
        name: true,
        email: true,
        phone: false,
        address: false,
      },
      retryOnFailure: true,
      maxRetries: 3,
    },
  },
  {
    type: "invoice-payment",
    translationKey: "invoicePayment",
    defaultConfig: {
      defaultPaymentTerms: "net30",
      requireCrmOrganization: true,
      autoFillFromCrm: true,
      includeDetailedLineItems: true,
      includeTaxBreakdown: true,
      sendInvoiceEmail: true,
    },
  },
  {
    type: "tax-calculation",
    translationKey: "taxCalculation",
    defaultConfig: {
      taxEnabled: true,
      defaultTaxRate: 19,
      defaultTaxBehavior: "exclusive",
      taxRates: [],
      b2bTaxRules: {
        domesticB2B: "charge",
        internationalB2B: "reverse_charge",
        requireVatNumber: true,
      },
    },
  },
  {
    type: "consolidated-invoice-generation",
    translationKey: "consolidatedInvoiceGeneration",
    defaultConfig: {
      paymentStatus: "awaiting_employer_payment",
      excludeInvoiced: true,
      minimumTicketCount: 1,
      paymentTerms: "net30",
      invoicePrefix: "INV",
      templateId: "b2b_consolidated",
      sendEmail: true,
      ccEmails: [],
      includeTicketHolderDetails: true,
      groupByTicketHolder: true,
    },
  },
];

export function BehaviorConfigPanel({
  selectedBehaviors,
  onAddBehavior,
  onRemoveBehavior,
  onUpdateBehavior,
  sessionId,
  organizationId,
}: BehaviorConfigPanelProps) {
  const { t } = useNamespaceTranslations("ui.workflows");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<WorkflowBehavior | null>(null);

  const handleAddBehavior = (behaviorType: typeof BEHAVIOR_TYPES[0]) => {
    const newBehavior = {
      id: `bhv_${Date.now()}`,
      type: behaviorType.type,
      enabled: true,
      priority: 100 - selectedBehaviors.length * 10,
      config: behaviorType.defaultConfig,
      triggers: {
        inputTypes: ["form"],
        objectTypes: ["form", "product"],
      },
    };
    onAddBehavior(newBehavior);
    setShowAddMenu(false);

    // Immediately open the config modal for the new behavior
    setEditingBehavior(newBehavior);
  };

  const handleEditBehavior = (behavior: WorkflowBehavior) => {
    setEditingBehavior(behavior);
  };

  const handleSaveBehavior = (updatedBehavior: WorkflowBehavior) => {
    onUpdateBehavior(updatedBehavior.id, updatedBehavior);
    setEditingBehavior(null);
  };

  // Helper to get objects needed by behavior type
  const getRequiredObjects = (behaviorType: string): { types: string[]; description: string } => {
    switch (behaviorType) {
      case "form-linking":
      case "form_linking":
        return {
          types: ["form", "checkout"],
          description: "Needs: 1+ Forms, 1+ Checkout"
        };
      case "addon-calculation":
      case "addon_calculation":
        return {
          types: ["form"],
          description: "Needs: 1+ Forms"
        };
      case "employer-detection":
      case "employer_detection":
        return {
          types: ["form", "checkout"],
          description: "Needs: 1+ Forms, 1+ Checkout"
        };
      case "invoice-mapping":
      case "invoice_mapping":
        return {
          types: ["form", "checkout"],
          description: "Needs: 1+ Forms, 1+ Checkout"
        };
      case "payment-provider-selection":
        return {
          types: ["checkout", "product"],
          description: "Needs: 1+ Products/Checkout"
        };
      case "stripe-payment":
        return {
          types: ["checkout"],
          description: "Needs: 1+ Checkout"
        };
      case "invoice-payment":
        return {
          types: ["checkout"],
          description: "Needs: 1+ Checkout"
        };
      case "tax-calculation":
        return {
          types: ["checkout", "product"],
          description: "Needs: 1+ Products/Checkout"
        };
      case "consolidated-invoice-generation":
        return {
          types: [],
          description: "No required objects (works independently)"
        };
      default:
        return { types: [], description: "" };
    }
  };

  const getBehaviorName = (type: string) => {
    const behaviorType = BEHAVIOR_TYPES.find((b) => b.type === type);
    if (behaviorType) {
      return t(`ui.workflows.behaviorTypes.${behaviorType.translationKey}.name`);
    }
    return type;
  };


  // Get icon for object type
  const getObjectIcon = (objectType: string) => {
    switch (objectType) {
      case "form": return <FileText className="h-3 w-3" />;
      case "product": return <Package className="h-3 w-3" />;
      case "checkout":
      case "checkout_instance": return <CreditCard className="h-3 w-3" />;
      case "crm_organization": return <Building2 className="h-3 w-3" />;
      case "crm_contact": return <User className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  // Get color for object type
  const getObjectColor = (objectType: string) => {
    switch (objectType) {
      case "form": return { bg: "#f3e8ff", text: "#9333ea" };
      case "product": return { bg: "#dbeafe", text: "#2563eb" };
      case "checkout":
      case "checkout_instance": return { bg: "#dcfce7", text: "#16a34a" };
      case "crm_organization": return { bg: "#fef3c7", text: "#f59e0b" };
      case "crm_contact": return { bg: "#fee2e2", text: "#dc2626" };
      default: return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  return (
    <>
      {/* Add Behavior Modal */}
      {showAddMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="border-2 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}
          >
            {/* Modal Header */}
            <div className="border-b-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.workflows.behaviorConfig.addModal.title")}</h3>
                <button
                  onClick={() => setShowAddMenu(false)}
                  className="retro-button p-1 text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.workflows.behaviorConfig.addModal.description")}
              </p>
            </div>

            {/* Behavior Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {BEHAVIOR_TYPES.map((behaviorType) => (
                <button
                  key={behaviorType.type}
                  onClick={() => handleAddBehavior(behaviorType)}
                  className="p-3 text-left border-2 hover:shadow-md transition-all group"
                  style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}
                >
                  <div className="flex items-start gap-2">
                    <div className="border p-1.5 mt-0.5" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
                      <Zap className="h-4 w-4 group-hover:scale-110 transition-transform" style={{ color: 'var(--win95-highlight)' }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
                        {t(`ui.workflows.behaviorTypes.${behaviorType.translationKey}.name`)}
                      </div>
                      <div className="text-[10px] leading-relaxed" style={{ color: 'var(--neutral-gray)' }}>
                        {t(`ui.workflows.behaviorTypes.${behaviorType.translationKey}.description`)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.workflows.behaviorConfig.title")}</h3>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.workflows.behaviorConfig.description")}
              </p>
            </div>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="retro-button p-1"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

      {/* Behavior List */}
      <div className="flex-1 overflow-auto p-3">
        {selectedBehaviors.length === 0 ? (
          <div className="py-8 text-center">
            <Zap className="mx-auto h-12 w-12" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
            <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>{t("ui.workflows.behaviorConfig.noBehaviors")}</p>
            <p className="mt-1 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.workflows.behaviorConfig.clickToAdd")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedBehaviors
              .sort((a, b) => (b.priority || 0) - (a.priority || 0))
              .map((behavior) => {
                return (
                  <div
                    key={behavior.id}
                    className="border-2 mb-2"
                    style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="border p-1" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
                            <Zap className="h-3 w-3" style={{ color: 'var(--win95-highlight)' }} />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                              {getBehaviorName(behavior.type)}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
                              {t("ui.workflows.behaviorConfig.priority")}: {behavior.priority} • {behavior.enabled ? t("ui.workflows.behaviorConfig.enabled") : t("ui.workflows.behaviorConfig.disabled")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditBehavior(behavior)}
                            className="retro-button p-1"
                            title="Configure"
                          >
                            <Settings className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onRemoveBehavior(behavior.id)}
                            className="retro-button p-1"
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

        {/* Behavior Count */}
        <div className="border-t-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
          <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.workflows.behaviorConfig.behaviorCount", { count: selectedBehaviors.length })}
          </div>
        </div>

        {/* Config Modal */}
        {editingBehavior && (
          <BehaviorConfigModal
            behavior={editingBehavior}
            onClose={() => setEditingBehavior(null)}
            onSave={handleSaveBehavior}
            sessionId={sessionId}
            organizationId={organizationId}
          />
        )}
      </div>
    </>
  );
}
