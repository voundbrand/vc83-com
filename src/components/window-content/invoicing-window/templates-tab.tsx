"use client";

import { useState } from "react";
import { Eye, FileText, Building2, Users, FileStack, Check, Lightbulb } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TemplatePreviewModal } from "@/components/template-preview-modal";

/**
 * Templates Tab - PDF Invoice Templates
 *
 * Displays available invoice templates with preview functionality.
 * Shows 4 template types: B2C Receipt, B2B Single, B2B Consolidated, B2B Consolidated Detailed
 */

type TemplateId = "b2c_receipt" | "b2b_single" | "b2b_consolidated" | "b2b_consolidated_detailed";

interface Template {
  id: TemplateId;
  nameKey: string;
  descriptionKey: string;
  useCaseKey: string;
  colorVar: string;
  icon: React.ReactNode;
  featureKeys: string[];
}

const getTemplates = (): Template[] => [
  {
    id: "b2c_receipt",
    nameKey: "ui.invoicing_window.templates.b2c_receipt.name",
    descriptionKey: "ui.invoicing_window.templates.b2c_receipt.description",
    useCaseKey: "ui.invoicing_window.templates.b2c_receipt.use_case",
    colorVar: "var(--tone-accent)",
    icon: <FileText size={24} />,
    featureKeys: [
      "ui.invoicing_window.templates.b2c_receipt.features.layout",
      "ui.invoicing_window.templates.b2c_receipt.features.customer",
      "ui.invoicing_window.templates.b2c_receipt.features.items",
      "ui.invoicing_window.templates.b2c_receipt.features.tax",
      "ui.invoicing_window.templates.b2c_receipt.features.payment",
    ],
  },
  {
    id: "b2b_single",
    nameKey: "ui.invoicing_window.templates.b2b_single.name",
    descriptionKey: "ui.invoicing_window.templates.b2b_single.description",
    useCaseKey: "ui.invoicing_window.templates.b2b_single.use_case",
    colorVar: "var(--tone-accent)",
    icon: <Building2 size={24} />,
    featureKeys: [
      "ui.invoicing_window.templates.b2b_single.features.layout",
      "ui.invoicing_window.templates.b2b_single.features.company",
      "ui.invoicing_window.templates.b2b_single.features.address",
      "ui.invoicing_window.templates.b2b_single.features.terms",
      "ui.invoicing_window.templates.b2b_single.features.number",
    ],
  },
  {
    id: "b2b_consolidated",
    nameKey: "ui.invoicing_window.templates.b2b_consolidated.name",
    descriptionKey: "ui.invoicing_window.templates.b2b_consolidated.description",
    useCaseKey: "ui.invoicing_window.templates.b2b_consolidated.use_case",
    colorVar: "var(--success)",
    icon: <Users size={24} />,
    featureKeys: [
      "ui.invoicing_window.templates.b2b_consolidated.features.list",
      "ui.invoicing_window.templates.b2b_consolidated.features.grouped",
      "ui.invoicing_window.templates.b2b_consolidated.features.per_employee",
      "ui.invoicing_window.templates.b2b_consolidated.features.total",
      "ui.invoicing_window.templates.b2b_consolidated.features.billing",
    ],
  },
  {
    id: "b2b_consolidated_detailed",
    nameKey: "ui.invoicing_window.templates.b2b_consolidated_detailed.name",
    descriptionKey: "ui.invoicing_window.templates.b2b_consolidated_detailed.description",
    useCaseKey: "ui.invoicing_window.templates.b2b_consolidated_detailed.use_case",
    colorVar: "var(--tone-accent)",
    icon: <FileStack size={24} />,
    featureKeys: [
      "ui.invoicing_window.templates.b2b_consolidated_detailed.features.itemization",
      "ui.invoicing_window.templates.b2b_consolidated_detailed.features.breakdown",
      "ui.invoicing_window.templates.b2b_consolidated_detailed.features.details",
      "ui.invoicing_window.templates.b2b_consolidated_detailed.features.subtotals",
      "ui.invoicing_window.templates.b2b_consolidated_detailed.features.comprehensive",
    ],
  },
];

export function TemplatesTab() {
  const { t, isLoading } = useNamespaceTranslations("ui.invoicing_window");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>("");

  const handlePreview = (templateId: TemplateId) => {
    // Map template ID to template code
    const templateCodeMap: Record<TemplateId, string> = {
      b2c_receipt: "invoice_b2c_receipt_v1",
      b2b_single: "invoice_b2b_single_v1",
      b2b_consolidated: "invoice_b2b_consolidated_v1",
      b2b_consolidated_detailed: "invoice_b2b_consolidated_detailed_v1",
    };

    setSelectedTemplateCode(templateCodeMap[templateId]);
    setPreviewModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p style={{ color: "var(--window-document-text)" }}>{t("ui.invoicing_window.footer.loading")}</p>
      </div>
    );
  }

  const templates = getTemplates();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
          {t("ui.invoicing_window.templates.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.invoicing_window.templates.description")}
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow"
            style={{
              background: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
          >
            {/* Template Header */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="p-2 rounded border-2"
                style={{
                  backgroundColor: "var(--window-document-bg)",
                  color: template.colorVar,
                  borderColor: template.colorVar,
                }}
              >
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  {t(template.nameKey)}
                </h4>
                <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                  {t(template.descriptionKey)}
                </p>
              </div>
            </div>

            {/* Use Case Badge */}
            <div
              className="inline-block px-2 py-1 text-[10px] font-bold rounded border mb-3"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: template.colorVar,
                borderColor: template.colorVar,
              }}
            >
              {t(template.useCaseKey)}
            </div>

            {/* Features */}
            <div className="space-y-1 mb-4">
              {template.featureKeys.map((featureKey, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <Check size={12} className="mt-0.5" />
                  <span>{t(featureKey)}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePreview(template.id)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded flex items-center justify-center gap-2 hover:opacity-90 transition-opacity border-2"
                style={{
                  backgroundColor: "var(--tone-accent)",
                  color: "white",
                  borderColor: "var(--tone-accent)",
                }}
              >
                <Eye size={14} />
                {t("ui.invoicing_window.templates.buttons.preview")}
              </button>
              <button
                className="px-3 py-2 text-xs font-semibold rounded opacity-50 cursor-not-allowed border-2"
                style={{
                  backgroundColor: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)",
                  borderColor: "var(--window-document-border)",
                }}
                disabled
                title={t("ui.invoicing_window.templates.buttons.use_hint")}
              >
                {t("ui.invoicing_window.templates.buttons.use")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div
        className="mt-6 p-4 border-2 rounded"
        style={{
          backgroundColor: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
        >
        <h4 className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
          <Lightbulb size={12} />
          {t("ui.invoicing_window.templates.usage.title")}
        </h4>
        <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
          <p>• {t("ui.invoicing_window.templates.usage.b2c_receipt")}</p>
          <p>• {t("ui.invoicing_window.templates.usage.b2b_single")}</p>
          <p>• {t("ui.invoicing_window.templates.usage.b2b_consolidated")}</p>
          <p>• {t("ui.invoicing_window.templates.usage.b2b_consolidated_detailed")}</p>
        </div>
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        templateType="pdf"
        templateCode={selectedTemplateCode}
      />
    </div>
  );
}
