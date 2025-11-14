"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { FileText, Loader2, AlertCircle, Building2, Search } from "lucide-react";
import { TemplateCategories, TemplateCategory } from "./template-categories";
import { TemplateCard } from "./template-card";
import { TemplateSetCard } from "./template-set-card";
import { TemplatePreviewModal } from "@/components/template-preview-modal";
import { TemplateSetPreviewModal } from "@/components/template-set-preview-modal";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Templates Window
 *
 * Browse and explore all available templates:
 * - Email templates (React components)
 * - PDF templates (tickets, invoices, certificates)
 * - Web publishing templates
 * - Form templates
 * - Checkout templates
 *
 * Filtered by organization's available templates.
 */
export function TemplatesWindow() {
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.templates");

  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<{
    code: string;
    type: "email" | "pdf";
  } | null>(null);
  const [previewTemplateSetId, setPreviewTemplateSetId] = useState<Id<"objects"> | null>(null);

  // Fetch available PDF templates for this org
  const availablePdfTemplates = useQuery(
    api.pdfTemplateAvailability.getAvailablePdfTemplates,
    sessionId && organizationId
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // Fetch available web page templates
  const availableWebTemplates = useQuery(
    api.templateOntology.getAvailableTemplates,
    sessionId && organizationId
      ? { sessionId, organizationId: organizationId as Id<"organizations">, pageType: undefined }
      : "skip"
  );

  // Fetch all system email templates (public - no availability filtering yet)
  const availableEmailTemplates = useQuery(
    api.emailTemplateOntology.getAllSystemEmailTemplates,
    {}
  );

  // Fetch available template sets for this org
  const availableTemplateSets = useQuery(
    api.templateSetQueries.getAvailableTemplateSets,
    sessionId && organizationId
      ? { organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // Loading state
  if (isLoading || translationsLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--win95-highlight)" }} />
            <p style={{ color: "var(--win95-text)" }}>{t("ui.templates.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }}>{t("ui.templates.error.login_required")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              {t("ui.templates.error.no_org_title")}
            </p>
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm mt-2">
              {t("ui.templates.error.no_org_message")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Combine all templates
  const allTemplates = [
    ...(availableEmailTemplates || []),
    ...(availablePdfTemplates || []),
    ...(availableWebTemplates || []),
  ];

  // Filter by category
  let filteredTemplates = allTemplates;
  let filteredTemplateSets: typeof availableTemplateSets = [];

  if (selectedCategory === "template_sets") {
    // Show template sets instead of templates
    filteredTemplateSets = availableTemplateSets || [];
  } else if (selectedCategory !== "all") {
    filteredTemplates = allTemplates.filter((template) => {
      const subtype = template.subtype;
      const category = template.customProperties?.category;

      if (selectedCategory === "email") {
        return subtype === "email";
      } else if (selectedCategory === "pdf_ticket") {
        return subtype === "pdf" && category === "ticket";
      } else if (selectedCategory === "pdf_invoice") {
        return subtype === "pdf" && (category === "invoice" || category === "receipt");
      } else if (selectedCategory === "web") {
        return subtype === "page";
      } else if (selectedCategory === "form") {
        return template.type === "template" && subtype?.includes("form");
      } else if (selectedCategory === "checkout") {
        return template.type === "template" && category === "checkout";
      }
      return true;
    });
  }

  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredTemplates = filteredTemplates.filter((template) =>
      template.name.toLowerCase().includes(query) ||
      template.customProperties?.description?.toLowerCase().includes(query) ||
      template.customProperties?.code?.toLowerCase().includes(query)
    );
  }

  // Calculate category counts
  const categoryCounts: Record<TemplateCategory, number> = {
    all: allTemplates.length,
    template_sets: (availableTemplateSets || []).length,
    email: allTemplates.filter((t) => t.subtype === "email").length,
    pdf_ticket: allTemplates.filter((t) => t.subtype === "pdf" && t.customProperties?.category === "ticket").length,
    pdf_invoice: allTemplates.filter((t) => t.subtype === "pdf" && (t.customProperties?.category === "invoice" || t.customProperties?.category === "receipt")).length,
    web: allTemplates.filter((t) => t.subtype === "page").length,
    form: allTemplates.filter((t) => t.type === "template" && t.subtype?.includes("form")).length,
    checkout: allTemplates.filter((t) => t.type === "template" && t.customProperties?.category === "checkout").length,
  };

  const handlePreview = (template: typeof allTemplates[0]) => {
    const templateCode = template.customProperties?.code;
    if (!templateCode) return;

    const templateType = template.subtype === "email" ? "email" : "pdf";
    setPreviewTemplate({ code: templateCode, type: templateType });
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <FileText size={16} />
              {t("ui.templates.header.title")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.templates.header.subtitle")}
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {currentOrganization?.name}
            </p>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.templates.header.templates_count", { count: filteredTemplates.length.toString() })}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className="px-4 py-2 border-b-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center gap-2">
          <Search size={14} style={{ color: "var(--neutral-gray)" }} />
          <input
            type="text"
            placeholder={t("ui.templates.search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-text)",
            }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <TemplateCategories
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          counts={categoryCounts}
        />

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedCategory === "template_sets" ? (
            // Template Sets View
            filteredTemplateSets.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle size={48} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
                  <p style={{ color: "var(--win95-text)" }} className="font-semibold">
                    {t("ui.templates.template_set.error.no_sets_title")}
                  </p>
                  <p style={{ color: "var(--neutral-gray)" }} className="text-xs mt-2">
                    {t("ui.templates.template_set.error.no_sets_message")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplateSets.map((set) => (
                  <TemplateSetCard
                    key={set._id}
                    templateSet={set}
                    ticketTemplate={set.ticketTemplateId ? { _id: set.ticketTemplateId, name: "Ticket Template" } : null}
                    invoiceTemplate={set.invoiceTemplateId ? { _id: set.invoiceTemplateId, name: "Invoice Template" } : null}
                    emailTemplate={set.emailTemplateId ? { _id: set.emailTemplateId, name: "Email Template" } : null}
                    onPreview={() => setPreviewTemplateSetId(set._id as Id<"objects">)}
                    onUseSet={() => {
                      // TODO: Handle using this template set
                      console.log("Use template set:", set._id);
                    }}
                    t={t}
                  />
                ))}
              </div>
            )
          ) : (
            // Regular Templates View
            filteredTemplates.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle size={48} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
                  <p style={{ color: "var(--win95-text)" }} className="font-semibold">
                    {t("ui.templates.error.no_templates_title")}
                  </p>
                  <p style={{ color: "var(--neutral-gray)" }} className="text-xs mt-2">
                    {searchQuery
                      ? t("ui.templates.error.no_search_results", { query: searchQuery })
                      : t("ui.templates.error.no_category_templates")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template._id}
                    template={{
                      ...template,
                      organizationId: organizationId as Id<"organizations">,
                    }}
                    onPreview={() => handlePreview(template)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          isOpen={true}
          onClose={() => setPreviewTemplate(null)}
          templateType={previewTemplate.type}
          templateCode={previewTemplate.code}
        />
      )}

      {/* Template Set Preview Modal */}
      {previewTemplateSetId && (
        <TemplateSetPreviewModal
          isOpen={true}
          onClose={() => setPreviewTemplateSetId(null)}
          templateSetId={previewTemplateSetId}
          onUseSet={() => {
            // TODO: Handle using this template set
            console.log("Use template set:", previewTemplateSetId);
            setPreviewTemplateSetId(null);
          }}
          t={t}
        />
      )}
    </div>
  );
}
