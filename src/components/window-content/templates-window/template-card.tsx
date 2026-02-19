"use client";

import {
  Award,
  Download,
  Eye,
  FileInput,
  FileText,
  Globe,
  Mail,
  ShoppingCart,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TemplateThumbnail } from "@/components/template-thumbnail";

interface TemplateCardProps {
  template: {
    _id: Id<"objects">;
    type: string;
    subtype?: string;
    name: string;
    organizationId?: Id<"organizations">;
    customProperties?: {
      code?: string;
      description?: string;
      category?: string;
      author?: string;
      version?: string;
      previewImageUrl?: string;
    };
  };
  onPreview: () => void;
  onSelect?: () => void;
}

/**
 * Template Card Component
 *
 * Displays a visual card for a template with:
 * - Preview image or placeholder
 * - Template name and description
 * - Category badge
 * - Action buttons (Preview, Select)
 */
export function TemplateCard({ template, onPreview, onSelect }: TemplateCardProps) {
  const { t } = useNamespaceTranslations("ui.templates");

  const categoryIcons: Record<string, LucideIcon> = {
    ticket: Ticket,
    invoice: FileText,
    receipt: FileText,
    certificate: Award,
    email: Mail,
    web: Globe,
    form: FileInput,
    checkout: ShoppingCart,
    events: Award,
  };

  const category = template.customProperties?.category || "general";
  const CategoryIcon = categoryIcons[category] || FileText;

  // Get translated category name
  const getCategoryName = (cat: string) => {
    return t(`ui.templates.category.${cat}`);
  };

  // Determine template type for thumbnail
  const getTemplateType = (): "email" | "pdf" | "web" | "checkout" | "form" => {
    if (template.type === "template") {
      const subtype = template.subtype;
      if (subtype === "pdf") return "pdf";
      if (subtype === "page") return "web";
      if (subtype === "form") return "form";
      if (subtype === "checkout") return "checkout";
      if (subtype === "email") return "email";

      // Fallback to category-based detection
      if (category === "ticket" || category === "invoice" || category === "receipt" || category === "certificate") {
        return "pdf";
      }
      if (category === "email") return "email";
      if (category === "web") return "web";
      if (category === "form") return "form";
      if (category === "checkout") return "checkout";
    }
    return "pdf"; // Default fallback
  };

  const templateType = getTemplateType();
  const templateCode = template.customProperties?.code || "";

  return (
    <div
      className="border-2 flex flex-col h-full"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg)",
      }}
    >
      {/* Live Template Preview */}
      <div
        className="h-32 flex items-center justify-center border-b-2"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--desktop-shell-accent)",
        }}
      >
        {templateCode ? (
          <TemplateThumbnail
            templateType={templateType}
            templateCode={templateCode}
            organizationId={template.organizationId}
            scale={0.15}
            width={200}
            height={128}
          />
        ) : (
          <div className="text-center">
            <CategoryIcon size={36} className="mx-auto mb-2" style={{ color: "var(--window-document-text)" }} />
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.templates.card.no_preview")}
            </div>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Category Badge */}
        <div className="mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 border"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <CategoryIcon size={12} />
            {getCategoryName(category)}
          </span>
        </div>

        {/* Name */}
        <h4
          className="text-sm font-bold mb-1"
          style={{ color: "var(--window-document-text)" }}
        >
          {template.name}
        </h4>

        {/* Description */}
        {template.customProperties?.description && (
          <p
            className="text-xs mb-2 flex-1"
            style={{ color: "var(--neutral-gray)" }}
          >
            {template.customProperties.description.length > 80
              ? `${template.customProperties.description.substring(0, 80)}...`
              : template.customProperties.description}
          </p>
        )}

        {/* Code */}
        {template.customProperties?.code && (
          <code
            className="text-xs px-1 py-0.5 mb-2 border inline-block"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--desktop-shell-accent)",
              color: "var(--neutral-gray)",
            }}
          >
            {template.customProperties.code}
          </code>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
          {template.customProperties?.author && (
            <span>{t("ui.templates.card.author", { author: template.customProperties.author })}</span>
          )}
          {template.customProperties?.version && (
            <span>{t("ui.templates.card.version", { version: template.customProperties.version })}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            <Eye size={12} />
            {t("ui.templates.card.button.preview")}
          </button>
          {onSelect && (
            <button
              onClick={onSelect}
              className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--success)",
                color: "white",
              }}
            >
              <Download size={12} />
              {t("ui.templates.card.button.select")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
