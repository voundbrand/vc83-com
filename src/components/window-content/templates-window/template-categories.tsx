"use client";

import { FileText, FileType, FileInput, ShoppingCart, Mail, Package, type LucideIcon } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export type TemplateCategory = "all" | "template_sets" | "email" | "pdf_ticket" | "pdf_invoice" | "web" | "form" | "checkout";

interface TemplateCategoriesProps {
  selectedCategory: TemplateCategory;
  onCategoryChange: (category: TemplateCategory) => void;
  counts?: Record<TemplateCategory, number>;
}

/**
 * Template Categories Sidebar
 *
 * Shows filterable categories for templates:
 * - All Templates
 * - Email Templates
 * - PDF Tickets
 * - PDF Invoices
 * - Web Publishing
 * - Form Templates
 * - Checkout Templates
 */
export function TemplateCategories({
  selectedCategory,
  onCategoryChange,
  counts = {} as Record<TemplateCategory, number>,
}: TemplateCategoriesProps) {
  const { t } = useNamespaceTranslations("ui.templates");

  const categories: Array<{ id: TemplateCategory; translationKey: string; icon: LucideIcon }> = [
    { id: "all", translationKey: "ui.templates.categories.all", icon: FileText },
    { id: "template_sets", translationKey: "ui.templates.categories.template_sets", icon: Package },
    { id: "email", translationKey: "ui.templates.categories.email", icon: Mail },
    { id: "pdf_ticket", translationKey: "ui.templates.categories.pdf_ticket", icon: FileType },
    { id: "pdf_invoice", translationKey: "ui.templates.categories.pdf_invoice", icon: FileType },
    { id: "web", translationKey: "ui.templates.categories.web", icon: FileText },
    { id: "form", translationKey: "ui.templates.categories.form", icon: FileInput },
    { id: "checkout", translationKey: "ui.templates.categories.checkout", icon: ShoppingCart },
  ];

  return (
    <div className="border-r-2" style={{ borderColor: "var(--window-document-border)", width: "200px" }}>
      <div
        className="p-3 border-b-2 font-bold text-xs"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg-elevated)",
          color: "var(--window-document-text)",
        }}
      >
        {t("ui.templates.categories.title")}
      </div>
      <div className="p-2">
        {categories.map((category) => {
          const count = counts[category.id] || 0;
          const isSelected = selectedCategory === category.id;
          const CategoryIcon = category.icon;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className="w-full px-3 py-2 text-xs font-semibold flex items-center gap-2 border-2 mb-1 transition-colors"
              style={{
                borderColor: isSelected ? "var(--tone-accent)" : "var(--window-document-border)",
                background: isSelected ? "var(--tone-accent-soft)" : "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)",
              }}
            >
              <CategoryIcon size={14} className="shrink-0" />
              <span className="flex-1 text-left">{t(category.translationKey)}</span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 text-xs rounded border"
                  style={{
                    borderColor: isSelected ? "var(--tone-accent)" : "var(--window-document-border)",
                    background: isSelected ? "var(--window-document-bg)" : "var(--window-document-bg)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
