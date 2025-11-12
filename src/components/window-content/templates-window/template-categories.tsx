"use client";

import { FileText, FileType, FileInput, ShoppingCart, Mail } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export type TemplateCategory = "all" | "email" | "pdf_ticket" | "pdf_invoice" | "web" | "form" | "checkout";

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

  const categories = [
    { id: "all" as TemplateCategory, translationKey: "ui.templates.categories.all", icon: FileText, emoji: "📁" },
    { id: "email" as TemplateCategory, translationKey: "ui.templates.categories.email", icon: Mail, emoji: "📧" },
    { id: "pdf_ticket" as TemplateCategory, translationKey: "ui.templates.categories.pdf_ticket", icon: FileType, emoji: "🎫" },
    { id: "pdf_invoice" as TemplateCategory, translationKey: "ui.templates.categories.pdf_invoice", icon: FileType, emoji: "💰" },
    { id: "web" as TemplateCategory, translationKey: "ui.templates.categories.web", icon: FileText, emoji: "🌐" },
    { id: "form" as TemplateCategory, translationKey: "ui.templates.categories.form", icon: FileInput, emoji: "📝" },
    { id: "checkout" as TemplateCategory, translationKey: "ui.templates.categories.checkout", icon: ShoppingCart, emoji: "🛒" },
  ];

  return (
    <div className="border-r-2" style={{ borderColor: "var(--win95-border)", width: "200px" }}>
      <div
        className="p-3 border-b-2 font-bold text-xs"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          color: "var(--win95-text)",
        }}
      >
        {t("ui.templates.categories.title")}
      </div>
      <div className="p-2">
        {categories.map((category) => {
          const count = counts[category.id] || 0;
          const isSelected = selectedCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className="w-full px-3 py-2 text-xs font-semibold flex items-center gap-2 border-2 mb-1 transition-colors"
              style={{
                borderColor: isSelected ? "var(--win95-highlight)" : "var(--win95-border)",
                background: isSelected ? "var(--win95-highlight)" : "var(--win95-button-face)",
                color: isSelected ? "white" : "var(--win95-text)",
              }}
            >
              <span>{category.emoji}</span>
              <span className="flex-1 text-left">{t(category.translationKey)}</span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 text-xs rounded border"
                  style={{
                    borderColor: isSelected ? "rgba(255,255,255,0.3)" : "var(--win95-border)",
                    background: isSelected ? "rgba(255,255,255,0.2)" : "var(--win95-bg)",
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
