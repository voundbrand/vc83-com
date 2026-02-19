"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  Eye,
  Database,
  Globe,
  ExternalLink,
  Save,
  X,
  Code,
  Lightbulb,
} from "lucide-react";
import { getFormTemplate } from "@/templates/forms/registry";
import { webPublishingThemes } from "@/templates/themes";
import { FORM_TYPES, DEFAULT_FORM_TYPE, getFormTypeIcon } from "@/templates/forms/form-types";
import { SchemaEditorTab } from "./schema-editor-tab";

interface FormBuilderProps {
  formId: string | null;
  templateCode: string | null; // templateCode prop from Templates tab
  onBack: () => void;
  openSchemaModal?: boolean; // Auto-open schema modal on mount
}

// Type for template/theme objects from DB
interface TemplateOrTheme {
  _id: string;
  name: string;
  customProperties?: {
    code?: string;
    description?: string;
    category?: string;
    formSchema?: unknown;
  };
}

export function FormBuilder({ formId, templateCode, onBack, openSchemaModal }: FormBuilderProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.forms");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubtype, setFormSubtype] = useState<string>(DEFAULT_FORM_TYPE);
  const [isSaving, setIsSaving] = useState(false);
  const [themeAccordionOpen, setThemeAccordionOpen] = useState(true);
  const [dataSourcesAccordionOpen, setDataSourcesAccordionOpen] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Hosting mode: separate flags for internal and external
  const [enableInternalHosting, setEnableInternalHosting] = useState(true); // Default: internal hosting enabled
  const [enableExternalHosting, setEnableExternalHosting] = useState(false); // Default: external hosting disabled
  const [selectedPublishedPageId, setSelectedPublishedPageId] = useState<string>(""); // Published page with external domain (for external hosting)
  const [previewMode, setPreviewMode] = useState<"internal" | "external">("internal"); // Preview mode toggle
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateCode, setNewTemplateCode] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Form Settings State
  const [displayMode, setDisplayMode] = useState<"all" | "single-question" | "section-by-section" | "paginated">("all");
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [submitButtonText, setSubmitButtonText] = useState("Submit");
  const [formSuccessMessage, setFormSuccessMessage] = useState("Thank you for your submission!");
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");

  // Fetch available form templates for this org
  // @ts-ignore TS2589: Convex generated query type may exceed instantiation depth in this component.
  const getAvailableFormTemplatesQuery = api.formTemplateAvailability.getAvailableFormTemplates;
  const availableTemplates = useQuery(
    getAvailableFormTemplatesQuery,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // Fetch available themes (reuse web publishing themes!)
  const availableThemes = useQuery(
    api.templateAvailability.getAllSystemThemes,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch available events for linking
  const availableEvents = useQuery(
    api.eventOntology.getEvents,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // Fetch published pages with external domains (for external form hosting)
  const availablePublishedPages = useQuery(
    api.publishingOntology.getPublishedPages,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // Filter to only pages with external domains (isExternal flag)
  const externalPublishedPages = availablePublishedPages?.filter(page => {
    const templateContent = page.customProperties?.templateContent as { isExternal?: boolean; externalDomain?: string } | undefined;
    return templateContent?.isExternal && templateContent?.externalDomain;
  }) || [];

  // Fetch existing form data if editing
  const existingForm = useQuery(
    api.formsOntology.getForm,
    formId && sessionId ? { sessionId, formId: formId as Id<"objects"> } : "skip"
  );

  const createForm = useMutation(api.formsOntology.createForm);
  const updateForm = useMutation(api.formsOntology.updateForm);
  const saveFormAsTemplate = useMutation(api.formsOntology.saveFormAsTemplate);

  // Load existing form basic metadata immediately (name, description, etc.)
  useEffect(() => {
    if (existingForm) {
      setFormName(existingForm.name || "");
      setFormDescription(existingForm.description || "");
      setFormSubtype(existingForm.subtype || DEFAULT_FORM_TYPE);

      // Load eventId if present
      const eventId = existingForm.customProperties?.eventId as string | undefined;
      if (eventId) {
        setSelectedEventId(eventId);
      }

      // Load hosting mode and settings from formSchema
      const formSchema = existingForm.customProperties?.formSchema as {
        templateCode?: string;
        themeCode?: string;
        enableInternalHosting?: boolean;
        enableExternalHosting?: boolean;
        publishedPageId?: string;
        settings?: {
          displayMode?: "all" | "single-question" | "section-by-section" | "paginated";
          showProgressBar?: boolean;
          submitButtonText?: string;
          successMessage?: string;
          allowMultipleSubmissions?: boolean;
          redirectUrl?: string | null;
        };
      } | undefined;

      const themeCode = formSchema?.themeCode;
      const hasTheme = !!themeCode;
      setEnableInternalHosting(
        formSchema?.enableInternalHosting !== undefined
          ? formSchema.enableInternalHosting
          : hasTheme
      );
      setEnableExternalHosting(formSchema?.enableExternalHosting === true);

      if (formSchema?.enableExternalHosting && formSchema?.publishedPageId) {
        setSelectedPublishedPageId(formSchema.publishedPageId);
      }

      if (formSchema?.settings) {
        const settings = formSchema.settings;
        setDisplayMode(settings.displayMode || "all");
        setShowProgressBar(settings.showProgressBar !== false);
        setSubmitButtonText(settings.submitButtonText || "Submit");
        setFormSuccessMessage(settings.successMessage || "Thank you for your submission!");
        setAllowMultipleSubmissions(settings.allowMultipleSubmissions || false);
        setRedirectUrl(settings.redirectUrl || "");
      }
    }
  }, [existingForm]);

  // Load template and theme selections once they're available
  useEffect(() => {
    if (existingForm && availableTemplates && availableThemes) {
      const formSchema = existingForm.customProperties?.formSchema as {
        templateCode?: string;
        themeCode?: string;
      } | undefined;
      const templateCode = formSchema?.templateCode;
      const themeCode = formSchema?.themeCode;

      if (templateCode) {
        const template = availableTemplates.find(
          (t) => t.customProperties?.code === templateCode
        );
        if (template) setSelectedTemplateId(template._id);
      }

      if (themeCode) {
        const theme = availableThemes.find((t) => t.customProperties?.code === themeCode);
        if (theme) setSelectedThemeId(theme._id);
      }
    }
  }, [existingForm, availableTemplates, availableThemes]);

  // Auto-select template when coming from Templates tab
  useEffect(() => {
    if (templateCode && availableTemplates && !formId) {
      const template = availableTemplates.find(
        (t) => t.customProperties?.code === templateCode
      );
      if (template) {
        setSelectedTemplateId(template._id);
      }
    }
  }, [templateCode, availableTemplates, formId]);

  // Auto-set preview mode based on hosting configuration
  useEffect(() => {
    // If only external hosting is enabled (internal disabled), force external preview
    if (enableExternalHosting && !enableInternalHosting) {
      setPreviewMode("external");
    }
    // If only internal hosting is enabled (external disabled), force internal preview
    else if (enableInternalHosting && !enableExternalHosting) {
      setPreviewMode("internal");
    }
    // If both are enabled, keep current preview mode (user can toggle)
  }, [enableInternalHosting, enableExternalHosting]);

  // Auto-open schema modal if requested (from list view)
  useEffect(() => {
    if (openSchemaModal && formId && existingForm) {
      setShowSchemaModal(true);
    }
  }, [openSchemaModal, formId, existingForm]);

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: "var(--error)", background: "rgba(239, 68, 68, 0.1)" }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: "var(--error)" }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "var(--error)" }}>{t("ui.forms.auth_required_title")}</h4>
              <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
                {t("ui.forms.auth_required_message")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (availableTemplates === undefined || availableThemes === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  // NOTE: Templates and themes are optional - users can create forms from scratch
  // No blocking check needed here anymore

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on hosting mode
    if (!formName) {
      alert("Please enter a form name");
      return;
    }

    // At least one hosting mode must be enabled
    if (!enableInternalHosting && !enableExternalHosting) {
      alert("Please enable at least one hosting mode (Internal or External)");
      return;
    }

    // Theme is only required for internal hosting on NEW forms
    // Existing forms can be updated without requiring theme (schema-only forms are valid)
    if (enableInternalHosting && !selectedThemeId && !formId) {
      alert(t("ui.forms.select_template_theme_required") || "Internal hosting requires theme selection");
      return;
    }

    // External hosting requires published page
    if (enableExternalHosting && !selectedPublishedPageId) {
      alert(t("ui.forms.select_published_page_required") || "External hosting requires a published page selection");
      return;
    }

    setIsSaving(true);
    try {
      // Get template and theme codes (only if selected)
      const templateCode = selectedTemplateId
        ? availableTemplates.find((t: TemplateOrTheme) => t._id === selectedTemplateId)?.customProperties?.code as string | undefined
        : undefined;

      const themeCode = selectedThemeId
        ? availableThemes.find((t: TemplateOrTheme) => t._id === selectedThemeId)?.customProperties?.code as string | undefined
        : undefined;

      if (formId) {
        // UPDATE existing form
        const existingSchema = (existingForm?.customProperties?.formSchema || {}) as {
          version?: string;
          fields?: unknown[];
          settings?: Record<string, unknown>;
        };

        // Build formSchema - only include fields that have values (Option B)
        const formSchema: Record<string, unknown> = {
          ...existingSchema,
          version: "1.0",
          fields: existingSchema.fields || [],
          settings: {
            displayMode,
            allowMultipleSubmissions,
            showProgressBar,
            submitButtonText,
            successMessage: formSuccessMessage,
            redirectUrl: redirectUrl || null,
          },
          enableInternalHosting,
          enableExternalHosting,
        };

        // Only add optional fields if they exist
        if (templateCode) formSchema.templateCode = templateCode;
        if (themeCode) formSchema.themeCode = themeCode;
        if (enableExternalHosting && selectedPublishedPageId) {
          formSchema.publishedPageId = selectedPublishedPageId;
        }

        // Calculate publicUrl if external hosting is enabled
        // If external hosting is disabled or no page selected, clear the publicUrl
        let publicUrl: string | null = null;
        if (enableExternalHosting && selectedPublishedPageId && formId) {
          const selectedPage = externalPublishedPages.find(p => p._id === selectedPublishedPageId);
          if (selectedPage) {
            const templateContent = selectedPage.customProperties?.templateContent as { externalDomain?: string } | undefined;
            const externalDomain = templateContent?.externalDomain || "";
            const slug = selectedPage.customProperties?.slug || "";

            // Construct the URL
            const cleanDomain = externalDomain.replace(/\/$/, '');
            const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;
            publicUrl = `${cleanDomain}${cleanSlug}/${formId}`;
          }
        }
        // Note: publicUrl will be null if external hosting is disabled or no page is selected
        // This ensures the URL is cleared from the database in those cases

        await updateForm({
          sessionId,
          formId: formId as Id<"objects">,
          name: formName,
          description: formDescription,
          subtype: formSubtype,
          formSchema,
          eventId: selectedEventId ? (selectedEventId as Id<"objects">) : null,
          publicUrl,
        });

        setSuccessMessage(t("ui.forms.form_updated"));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        // CREATE new form
        let sections: unknown[] = [];

        // Load sections from template if one is selected
        if (templateCode) {
          const selectedTemplate = availableTemplates.find(
            (t: TemplateOrTheme) => t._id === selectedTemplateId
          );
          const templateSchemaFromDB = selectedTemplate?.customProperties?.formSchema as {
            version?: string;
            sections?: unknown[];
            settings?: Record<string, unknown>;
          } | undefined;

          // Fallback to TypeScript registry if DB doesn't have schema
          const templateComponent = templateCode ? getFormTemplate(templateCode) : null;
          const templateSchemaFromCode = templateComponent?.schema;

          // Get sections from template (sections contain all fields!)
          sections = templateSchemaFromDB?.sections || templateSchemaFromCode?.sections || [];
        }
        // Forms without templates will have empty sections (user will build manually in future)

        console.log("🔍 [FormBuilder] Creating form with schema:", {
          enableInternalHosting,
          enableExternalHosting,
          templateCode: templateCode || "none",
          themeCode: themeCode || "none",
          hasSections: sections.length > 0,
          sectionsCount: sections.length,
        });

        // Build formSchema - only include fields that have values (Option B)
        const formSchema: Record<string, unknown> = {
          version: "1.0",
          sections,
          settings: {
            displayMode,
            allowMultipleSubmissions,
            showProgressBar,
            submitButtonText,
            successMessage: formSuccessMessage,
            redirectUrl: redirectUrl || null,
          },
          enableInternalHosting,
          enableExternalHosting,
        };

        // Only add optional fields if they exist
        if (templateCode) formSchema.templateCode = templateCode;
        if (themeCode) formSchema.themeCode = themeCode;
        if (enableExternalHosting && selectedPublishedPageId) {
          formSchema.publishedPageId = selectedPublishedPageId;
        }

        await createForm({
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          subtype: formSubtype,
          name: formName,
          description: formDescription,
          formSchema,
          eventId: selectedEventId ? (selectedEventId as Id<"objects">) : undefined,
        });

        setSuccessMessage(t("ui.forms.form_created"));

        // Reset form
        setSelectedTemplateId("");
        setSelectedThemeId("");
        setSelectedEventId("");
        setFormName("");
        setFormDescription("");
        setFormSubtype(DEFAULT_FORM_TYPE);

        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error(`Failed to ${formId ? "update" : "create"} form:`, error);
      alert(
        `Failed to ${formId ? "update" : "create"} form: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId || !formId) {
      alert("Can only save existing forms as templates");
      return;
    }

    if (!newTemplateName || !newTemplateCode) {
      alert("Template name and code are required");
      return;
    }

    setIsSavingTemplate(true);
    try {
      await saveFormAsTemplate({
        sessionId,
        formId: formId as Id<"objects">,
        templateName: newTemplateName,
        templateDescription: newTemplateDescription,
        templateCode: newTemplateCode.toLowerCase().replace(/\s+/g, "_"),
      });

      setSuccessMessage(`Template "${newTemplateName}" created successfully! It's now available in your Templates tab.`);
      setShowTemplateModal(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateCode("");

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error("Failed to save template:", error);
      alert(
        `Failed to save template: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* LEFT: Form Editor (40%) */}
      <div className="w-[40%] p-4 overflow-y-auto border-r-2" style={{ borderColor: "var(--window-document-border)" }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-4 px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
          }}
        >
          <ArrowLeft size={12} />
          {t("ui.forms.button_back_to_forms")}
        </button>

        {/* Success message */}
        {successMessage && (
          <div className="border-2 p-4 mb-4" style={{ borderColor: "var(--success)", background: "rgba(16, 185, 129, 0.1)" }}>
            <div className="flex items-start gap-2">
              <Check size={20} style={{ color: "var(--success)" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm" style={{ color: "var(--success)" }}>{t("ui.forms.success_title")}</h4>
                <p className="text-xs mt-1" style={{ color: "var(--success)" }}>{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <FileText size={16} />
            {formId ? t("ui.forms.builder_title_edit") : t("ui.forms.builder_title_create")}
          </h3>

          {/* Edit Schema Button - only show when editing an existing form */}
          {formId && (
            <button
              type="button"
              onClick={() => setShowSchemaModal(true)}
              className="px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--tone-accent)",
              }}
              title="Edit form schema (JSON)"
            >
              <Code size={12} />
              Edit Schema
            </button>
          )}
        </div>

        {formId && (
          <div className="border-2 p-3 mb-4" style={{ borderColor: "var(--tone-accent)", background: "rgba(0, 0, 128, 0.05)" }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} style={{ color: "var(--tone-accent)" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs" style={{ color: "var(--tone-accent)" }}>{t("ui.forms.editing_mode_title")}</h4>
                <p className="text-xs mt-1" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.forms.editing_mode_message")}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hosting Mode Selection - AT THE TOP */}
          <div className="border-2 p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
            <h4 className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.forms.hosting_mode_title") || "Hosting Mode"}
            </h4>

            {/* Internal Hosting Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={enableInternalHosting}
                onChange={(e) => setEnableInternalHosting(e.target.checked)}
                className="w-4 h-4"
              />
              <div className="flex items-center gap-2">
                <Database size={16} style={{ color: "var(--tone-accent)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.forms.internal_hosting_label") || "Internal Hosting"}
                </span>
              </div>
            </label>
            <p className="text-xs ml-6 mb-3" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.internal_hosting_description") || "Host form on your main application (requires template + theme)"}
            </p>

            {/* External Hosting Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableExternalHosting}
                onChange={(e) => setEnableExternalHosting(e.target.checked)}
                className="w-4 h-4"
              />
              <div className="flex items-center gap-2">
                <Globe size={16} style={{ color: "var(--tone-accent)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.forms.external_hosting_label")}
                </span>
              </div>
            </label>
            <p className="text-xs mt-2 ml-6" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.external_hosting_description")}
            </p>
          </div>

          {/* Template Display (Read-only when coming from Templates tab) */}
          {selectedTemplateId && (
            <div className="border-2 p-4" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
              <div className="flex items-start gap-2">
                <FileText size={16} style={{ color: "var(--tone-accent)" }} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1" style={{ color: "var(--window-document-text)" }}>
                    {t("ui.forms.label_template")}: {availableTemplates.find((t) => t._id === selectedTemplateId)?.name}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                    {availableTemplates.find((t) => t._id === selectedTemplateId)?.customProperties?.description}
                  </p>
                  <code className="text-xs px-2 py-1" style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}>
                    {availableTemplates.find((t) => t._id === selectedTemplateId)?.customProperties?.code}
                  </code>
                  {templateCode && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--tone-accent)" }}>
                      <Lightbulb size={12} />
                      {t("ui.forms.template_from_library")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warning if no template selected - only show for NEW forms without schema */}
          {!selectedTemplateId && !formId && !existingForm?.customProperties?.formSchema && (
            <div className="border-2 p-4" style={{ borderColor: "var(--warning)", background: "rgba(251, 191, 36, 0.1)" }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} style={{ color: "var(--warning)" }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs" style={{ color: "var(--warning)" }}>
                    {t("ui.forms.no_template_selected_title")}
                  </h4>
                  <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>
                    {t("ui.forms.no_template_selected_message")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Theme selection - Only show if internal hosting is enabled */}
          {enableInternalHosting && (
          <div className="border-2" style={{ borderColor: "var(--window-document-border)" }}>
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setThemeAccordionOpen(!themeAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:brightness-95"
              style={{ background: "var(--window-document-bg-elevated)", color: "var(--window-document-text)" }}
            >
              <div className="flex items-center gap-2">
                <Palette size={16} />
                <span className="text-sm font-bold">
                  {t("ui.forms.section_select_theme")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
                </span>
                {selectedThemeId && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--tone-accent)", color: "var(--window-document-text)" }}>
                    {availableThemes.find((t) => t._id === selectedThemeId)?.name}
                  </span>
                )}
              </div>
              {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {themeAccordionOpen && (
              <div className="p-3 space-y-2" style={{ background: "var(--window-document-bg-elevated)" }}>
                {availableThemes.map((theme: TemplateOrTheme) => (
                  <button
                    key={theme._id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme._id)}
                    className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                    style={{
                      borderColor: selectedThemeId === theme._id ? "var(--tone-accent)" : "var(--window-document-border)",
                      backgroundColor: selectedThemeId === theme._id ? "var(--window-document-bg-elevated)" : "var(--window-document-bg-elevated)",
                      borderWidth: selectedThemeId === theme._id ? "3px" : "2px",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1" style={{ color: "var(--window-document-text)" }}>{theme.name}</div>
                        <p className="text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                          {theme.customProperties?.description}
                        </p>
                        <code className="text-xs px-1" style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}>
                          {theme.customProperties?.code}
                        </code>
                      </div>
                      {selectedThemeId === theme._id && (
                        <Check size={20} style={{ color: "var(--tone-accent)" }} className="flex-shrink-0" />
                      )}
                    </div>
                    {/* Color palette preview */}
                    <div className="flex gap-1 mt-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          borderColor: "var(--window-document-border)"
                        }}
                        title={t("ui.forms.color_primary_gradient")}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "var(--window-document-bg-elevated)",
                          borderColor: "var(--window-document-border)"
                        }}
                        title={t("ui.forms.color_background")}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "var(--window-document-text)",
                          borderColor: "var(--window-document-border)"
                        }}
                        title={t("ui.forms.color_text")}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "var(--window-document-bg)",
                          borderColor: "var(--window-document-border)"
                        }}
                        title={t("ui.forms.color_secondary")}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Data Sources (Optional) - Only show if internal hosting is enabled */}
          {enableInternalHosting && (
          <div className="border-2" style={{ borderColor: "var(--window-document-border)" }}>
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setDataSourcesAccordionOpen(!dataSourcesAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:brightness-95"
              style={{ background: "var(--window-document-bg-elevated)", color: "var(--window-document-text)" }}
            >
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span className="text-sm font-bold">{t("ui.forms.section_link_event")}</span>
                {selectedEventId && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--tone-accent)", color: "var(--window-document-text)" }}>
                    {availableEvents?.find((e) => e._id === selectedEventId)?.name}
                  </span>
                )}
              </div>
              {dataSourcesAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {dataSourcesAccordionOpen && (
              <div className="p-3" style={{ background: "var(--window-document-bg-elevated)" }}>
                <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.forms.link_event_description")}
                </p>

                {availableEvents === undefined && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
                  </div>
                )}

                {availableEvents && availableEvents.length === 0 && (
                  <div className="border-2 p-3" style={{ borderColor: "var(--warning)", background: "rgba(251, 191, 36, 0.1)" }}>
                    <p className="text-xs" style={{ color: "var(--warning)" }}>
                      {t("ui.forms.no_events_message")}
                    </p>
                  </div>
                )}

                {availableEvents && availableEvents.length > 0 && (
                  <div className="space-y-2">
                    {/* None option */}
                    <button
                      type="button"
                      onClick={() => setSelectedEventId("")}
                      className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                      style={{
                        borderColor: selectedEventId === "" ? "var(--tone-accent)" : "var(--window-document-border)",
                        backgroundColor: selectedEventId === "" ? "var(--window-document-bg-elevated)" : "var(--window-document-bg-elevated)",
                        borderWidth: selectedEventId === "" ? "3px" : "2px",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-sm mb-1" style={{ color: "var(--window-document-text)" }}>{t("ui.forms.no_event")}</div>
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>{t("ui.forms.no_event_description")}</p>
                        </div>
                        {selectedEventId === "" && (
                          <Check size={20} style={{ color: "var(--tone-accent)" }} className="flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Event options */}
                    {availableEvents.map((event) => (
                      <button
                        key={event._id}
                        type="button"
                        onClick={() => setSelectedEventId(event._id)}
                        className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                        style={{
                          borderColor: selectedEventId === event._id ? "var(--tone-accent)" : "var(--window-document-border)",
                          backgroundColor: selectedEventId === event._id ? "var(--window-document-bg-elevated)" : "var(--window-document-bg-elevated)",
                          borderWidth: selectedEventId === event._id ? "3px" : "2px",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-sm mb-1" style={{ color: "var(--window-document-text)" }}>{event.name}</div>
                            {event.description && (
                              <p className="text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>{event.description}</p>
                            )}
                            <code className="text-xs px-1" style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}>ID: {event._id}</code>
                          </div>
                          {selectedEventId === event._id && (
                            <Check size={20} style={{ color: "var(--tone-accent)" }} className="flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Published Page Selection (only if external hosting is enabled) */}
          {enableExternalHosting && (
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                {t("ui.forms.select_published_page")} <span style={{ color: "var(--error)" }}>*</span>
              </label>

              {externalPublishedPages.length === 0 ? (
                <div className="border-2 p-3" style={{ borderColor: "var(--warning)", background: "rgba(251, 191, 36, 0.1)" }}>
                  <p className="text-xs" style={{ color: "var(--warning)" }}>
                    {t("ui.forms.no_external_pages")}
                  </p>
                  <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.forms.create_external_page_hint")}
                  </p>
                </div>
              ) : (
                <>
                  <select
                    value={selectedPublishedPageId}
                    onChange={(e) => setSelectedPublishedPageId(e.target.value)}
                    className="w-full border-2 px-2 py-1 text-sm"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg-elevated)",
                      color: "var(--window-document-text)"
                    }}
                    required={enableExternalHosting}
                  >
                    <option value="">{t("ui.forms.select_page_placeholder")}</option>
                    {externalPublishedPages.map((page) => {
                      const templateContent = page.customProperties?.templateContent as { externalDomain?: string } | undefined;
                      const domain = templateContent?.externalDomain || "";
                      const slug = page.customProperties?.slug || "";
                      return (
                        <option key={page._id} value={page._id}>
                          {page.name} ({domain}{slug})
                        </option>
                      );
                    })}
                  </select>

                  {/* Show clickable external URL if a page is selected */}
                  {selectedPublishedPageId && (() => {
                    const selectedPage = externalPublishedPages.find(p => p._id === selectedPublishedPageId);
                    const templateContent = selectedPage?.customProperties?.templateContent as { externalDomain?: string } | undefined;
                    const externalDomain = templateContent?.externalDomain || "";
                    const slug = selectedPage?.customProperties?.slug || "";

                    // Construct the URL
                    const cleanDomain = externalDomain.replace(/\/$/, '');
                    const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;
                    const externalUrl = formId
                      ? `${cleanDomain}${cleanSlug}/${formId}`
                      : `${cleanDomain}${cleanSlug}/{form-id}`;

                    return (
                      <div className="mt-2 p-2 border-2 rounded" style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg-elevated)"
                      }}>
                        <div className="flex items-center gap-2">
                          <Globe size={14} style={{ color: "var(--tone-accent)" }} />
                          <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                            External URL:
                          </span>
                        </div>
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs break-all hover:underline flex items-center gap-1 mt-1"
                          style={{ color: "var(--tone-accent)" }}
                        >
                          {externalUrl}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    );
                  })()}

                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.forms.published_page_hint")}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Form Type - now editable for both new and existing forms */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
              {t("ui.forms.label_form_type")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
            </label>
            <select
              value={formSubtype}
              onChange={(e) => setFormSubtype(e.target.value)}
              className="w-full border-2 px-2 py-1 text-sm"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)"
              }}
              required
            >
              {FORM_TYPES.map((formType) => (
                <option key={formType.code} value={formType.code}>
                  {getFormTypeIcon(formType.code)} {t(formType.translationKey as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          {/* Form Name */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
              {t("ui.forms.label_form_name")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full border-2 px-2 py-1 text-sm"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)"
              }}
              placeholder={t("ui.forms.placeholder_form_name")}
              required
            />
          </div>

          {/* Form Description */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>{t("ui.forms.label_description")}</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full border-2 px-2 py-1 text-sm"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-bg-elevated)",
                color: "var(--window-document-text)"
              }}
              placeholder={t("ui.forms.placeholder_description")}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {formDescription.length}/500 {t("ui.forms.characters")}
            </p>
          </div>

          {/* Form Settings Section */}
          <div className="border-2 p-4 space-y-4" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
            <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Database size={16} />
              Form Settings
            </h4>

            {/* Display Mode */}
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                Display Mode
              </label>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as typeof displayMode)}
                className="w-full border-2 px-2 py-1 text-sm"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)"
                }}
              >
                <option value="all">All Questions (Traditional)</option>
                <option value="single-question">One Question at a Time (Wizard)</option>
                <option value="section-by-section">Section by Section</option>
                <option value="paginated">Paginated (Custom)</option>
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                How the form is displayed to users
              </p>
            </div>

            {/* Show Progress Bar */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProgressBar}
                  onChange={(e) => setShowProgressBar(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Show Progress Bar
                </span>
              </label>
              <p className="text-xs mt-1 ml-6" style={{ color: "var(--neutral-gray)" }}>
                Display progress indicator during form completion
              </p>
            </div>

            {/* Allow Multiple Submissions */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMultipleSubmissions}
                  onChange={(e) => setAllowMultipleSubmissions(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                  Allow Multiple Submissions
                </span>
              </label>
              <p className="text-xs mt-1 ml-6" style={{ color: "var(--neutral-gray)" }}>
                Users can submit the form multiple times
              </p>
            </div>

            {/* Submit Button Text */}
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                Submit Button Text
              </label>
              <input
                type="text"
                value={submitButtonText}
                onChange={(e) => setSubmitButtonText(e.target.value)}
                className="w-full border-2 px-2 py-1 text-sm"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)"
                }}
                placeholder="Submit"
              />
            </div>

            {/* Success Message */}
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                Success Message
              </label>
              <textarea
                value={formSuccessMessage}
                onChange={(e) => setFormSuccessMessage(e.target.value)}
                className="w-full border-2 px-2 py-1 text-sm"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)"
                }}
                placeholder="Thank you for your submission!"
                rows={2}
                maxLength={200}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {formSuccessMessage.length}/200 characters
              </p>
            </div>

            {/* Redirect URL */}
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                Redirect URL (Optional)
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="w-full border-2 px-2 py-1 text-sm"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)"
                }}
                placeholder="https://example.com/thank-you"
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Redirect users after successful submission
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t-2 space-y-3" style={{ borderColor: "var(--window-document-border)" }}>
            {/* Helpful message if form can't be saved */}
            {(!formName || (!enableInternalHosting && !enableExternalHosting) || (enableExternalHosting && !selectedPublishedPageId)) && (
              <div className="border-2 p-3" style={{ borderColor: "var(--info)", background: "rgba(59, 130, 246, 0.1)" }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} style={{ color: "var(--info)" }} className="flex-shrink-0 mt-0.5" />
                  <div className="text-xs" style={{ color: "var(--info)" }}>
                    <p className="font-bold mb-1">Form kann nicht gespeichert werden:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {!formName && <li>Bitte geben Sie einen Formularnamen ein</li>}
                      {(!enableInternalHosting && !enableExternalHosting) && (
                        <li>Bitte wählen Sie mindestens eine Hosting-Methode (Intern oder Extern)</li>
                      )}
                      {enableExternalHosting && !selectedPublishedPageId && (
                        <li>Bitte wählen Sie eine veröffentlichte Seite für externes Hosting</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.forms.submit_note")} <span className="font-bold">{t("ui.forms.status_draft").toLowerCase()}</span>.
              </p>
              <button
                type="submit"
                disabled={
                  !formName ||
                  isSaving ||
                  (!enableInternalHosting && !enableExternalHosting) ||
                  (enableExternalHosting && !selectedPublishedPageId)
                }
                className="px-4 py-2 text-sm font-bold border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: "var(--window-document-border)",
                  backgroundColor:
                    formName &&
                    !isSaving &&
                    (enableInternalHosting || enableExternalHosting) &&
                    (!enableExternalHosting || selectedPublishedPageId)
                      ? "var(--tone-accent)"
                      : "var(--window-document-bg-elevated)",
                  color:
                    formName &&
                    !isSaving &&
                    (enableInternalHosting || enableExternalHosting) &&
                    (!enableExternalHosting || selectedPublishedPageId)
                      ? "white"
                      : "var(--neutral-gray)",
                }}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {formId ? t("ui.forms.button_updating") : t("ui.forms.button_creating")}
                  </span>
                ) : formId ? (
                  t("ui.forms.button_update_form")
                ) : (
                  t("ui.forms.button_create_form")
                )}
              </button>
            </div>

            {/* Save as Template button (only when editing) */}
            {formId && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3 py-1.5 text-xs font-bold border-2 flex items-center gap-2 transition-colors hover:brightness-95"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "#8b5cf6", // Purple color
                  }}
                >
                  <Save size={12} />
                  Save as Template
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* RIGHT: Live Preview (60%) */}
      <div className="w-[60%] p-4 overflow-y-auto" style={{ background: "var(--window-document-bg)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Eye size={16} />
            {t("ui.forms.live_preview")}
          </h3>

          {/* Debug: Show conditions */}
          {(() => {
            console.log("🔍 Preview Toggle Conditions:", {
              enableInternalHosting,
              enableExternalHosting,
              selectedPublishedPageId,
              selectedTemplateId,
              selectedThemeId,
              externalPublishedPages: externalPublishedPages.length,
              shouldShowToggle: enableInternalHosting && enableExternalHosting && selectedPublishedPageId && selectedTemplateId && selectedThemeId
            });
            return null;
          })()}

          {/* Preview Mode Toggle - only show when BOTH internal AND external hosting are enabled */}
          {enableInternalHosting && enableExternalHosting && selectedPublishedPageId && selectedTemplateId && selectedThemeId && (
            <div className="flex border-2" style={{ borderColor: "var(--window-document-border)" }}>
              <button
                type="button"
                onClick={() => setPreviewMode("internal")}
                className="px-3 py-1 text-xs font-bold transition-colors"
                style={{
                  background: previewMode === "internal" ? "var(--tone-accent)" : "var(--window-document-bg-elevated)",
                  color: previewMode === "internal" ? "white" : "var(--window-document-text)",
                  borderRight: "2px solid var(--window-document-border)"
                }}
              >
                {t("ui.forms.preview_internal")}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("external")}
                className="px-3 py-1 text-xs font-bold transition-colors"
                style={{
                  background: previewMode === "external" ? "var(--tone-accent)" : "var(--window-document-bg-elevated)",
                  color: previewMode === "external" ? "white" : "var(--window-document-text)"
                }}
              >
                {t("ui.forms.preview_external")}
              </button>
            </div>
          )}
        </div>

        {/* Preview content */}
        {/* Show preview if:
            1. Internal hosting with template+theme selected, OR
            2. External hosting with published page selected, OR
            3. Form has schema fields (editing existing form without template)
        */}
        {(enableInternalHosting && selectedTemplateId && selectedThemeId) ||
         (enableExternalHosting && selectedPublishedPageId) ||
         (existingForm?.customProperties?.formSchema &&
          (existingForm.customProperties.formSchema as { sections?: unknown[] }).sections?.length) ? (
          <div className="space-y-4">
            {/* Debug: Show preview mode state */}
            {(() => {
              console.log("🔍 Preview Mode State:", {
                previewMode,
                enableInternalHosting,
                enableExternalHosting,
                selectedPublishedPageId,
                shouldShowExternal: previewMode === "external" && enableExternalHosting && selectedPublishedPageId,
                shouldShowInternal: previewMode === "internal" && enableInternalHosting && selectedTemplateId && selectedThemeId
              });
              return null;
            })()}

            {/* Show internal OR external preview based on previewMode */}
            {previewMode === "external" && enableExternalHosting && selectedPublishedPageId && (() => {
              // Get the selected published page to extract external domain and slug
              const selectedPage = externalPublishedPages.find(p => p._id === selectedPublishedPageId);
              const templateContent = selectedPage?.customProperties?.templateContent as { externalDomain?: string } | undefined;
              const externalDomain = templateContent?.externalDomain || "";
              const slug = selectedPage?.customProperties?.slug || "";

              // Construct the preview URL: {externalDomain}{slug}/{formId}
              // Remove trailing slash from domain and leading slash from slug to avoid double slashes
              const cleanDomain = externalDomain.replace(/\/$/, '');
              const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;

              const previewUrl = formId
                ? `${cleanDomain}${cleanSlug}/${formId}`
                : `${cleanDomain}${cleanSlug}/preview-form-id`;

              // Debug logging
              console.log("🔍 External Preview URL:", {
                previewUrl,
                cleanDomain,
                cleanSlug,
                formId,
                enableExternalHosting,
                selectedPublishedPageId
              });

              return (
                /* EXTERNAL IFRAME PREVIEW */
                <div className="border-2" style={{ borderColor: "var(--window-document-border)" }}>
                  <div className="px-3 py-2 border-b-2 flex items-center gap-2" style={{
                    background: "var(--window-document-bg-elevated)",
                    borderColor: "var(--window-document-border)"
                  }}>
                    <Globe size={14} style={{ color: "var(--tone-accent)" }} />
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      {t("ui.forms.external_preview")}
                    </p>
                  </div>
                  <iframe
                    src={previewUrl}
                    className="w-full"
                    style={{ height: "600px", border: "none" }}
                    title="External Form Preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                  <div className="px-3 py-2 border-t-2 text-xs" style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}>
                    {t("ui.forms.showing")}: {previewUrl}
                  </div>
                </div>
              );
            })()}
            {(previewMode === "internal" || !enableExternalHosting || !selectedPublishedPageId) && enableInternalHosting && selectedTemplateId && selectedThemeId && (
              /* INTERNAL TEMPLATE PREVIEW - Isolated from Win95 theme */
              <div className="border-2" style={{ borderColor: "var(--window-document-border)" }}>
                {/* Label above preview */}
                <div className="px-3 py-2 border-b-2" style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)"
                }}>
                  <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                    {t("ui.forms.live_preview")}
                  </p>
                </div>

                {/* Isolated preview container - resets all CSS variables */}
                <div
                className="overflow-hidden relative"
                style={{
                  // Reset all Win95 theme variables to neutral values
                  // This ensures the template's own theme is not affected
                  all: 'initial',
                  display: 'block',
                  overflow: 'hidden',
                  position: 'relative',
                  // Set a neutral background for the preview area
                  background: '#ffffff',
                }}
              >
                {(() => {
                  const selectedTemplate = availableTemplates.find(
                    (t) => t._id === selectedTemplateId
                  );
                  const selectedTheme = availableThemes.find(
                    (t) => t._id === selectedThemeId
                  );
                  const templateCode = selectedTemplate?.customProperties?.code as string;
                  const themeCode = selectedTheme?.customProperties?.code as string;

                  if (templateCode && themeCode) {
                    const FormComponent = getFormTemplate(templateCode);
                    const theme = webPublishingThemes.find((t) => t.code === themeCode);

                    if (!FormComponent) {
                      return (
                        <div style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontSize: '0.75rem'
                        }}>
                          <p>Form template not found: {templateCode}</p>
                        </div>
                      );
                    }

                    if (!theme) {
                      return (
                        <div style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontSize: '0.75rem'
                        }}>
                          <p>Theme not found: {themeCode}</p>
                        </div>
                      );
                    }

                    // 🎯 FIXED: Load custom schema from database when editing, fallback to template schema
                    // When editing: use customProperties.formSchema (with user modifications like text_blocks)
                    // When creating: use FormComponent.schema (template default)
                    const customSchema = existingForm?.customProperties?.formSchema as typeof FormComponent.schema | undefined;
                    const templateSchema = customSchema || FormComponent.schema;

                    console.log("🎨 [FormBuilder] Live preview loading schema:", {
                      templateCode,
                      themeCode,
                      hasSchema: !!templateSchema,
                      sectionsCount: templateSchema?.sections?.length || 0,
                      isCustomSchema: !!customSchema,
                      isEditing: !!existingForm,
                    });

                    return (
                      <div style={{
                        transform: 'scale(0.75)',
                        transformOrigin: 'top left',
                        width: '133.33%',
                        // Ensure template styles take precedence
                        isolation: 'isolate',
                      }}>
                        <FormComponent
                          formId={"preview" as Id<"objects">}
                          organizationId={currentOrg.id as Id<"organizations">}
                          theme={theme}
                          customSchema={templateSchema}
                          onSubmit={async (data) => {
                            console.log("Preview submission:", data);
                            alert("This is a preview - form not actually submitted");
                          }}
                          initialData={{}}
                          mode="standalone"
                        />
                      </div>
                    );
                  }

                  return (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontSize: '0.75rem'
                    }}>
                      <p>Form preview loading...</p>
                    </div>
                  );
                })()}
              </div>
              </div>
            )}
            {/* SCHEMA-BASED PREVIEW - For forms without templates but with schema fields */}
            {!selectedTemplateId && existingForm?.customProperties?.formSchema && (() => {
              const formSchema = existingForm.customProperties.formSchema as {
                sections?: Array<{
                  id?: string;
                  title?: string;
                  fields?: Array<{
                    id: string;
                    type: string;
                    label?: string;
                    placeholder?: string;
                    required?: boolean;
                    options?: Array<{ label: string; value: string }>;
                    content?: string;
                  }>;
                }>;
              };

              if (!formSchema.sections?.length) return null;

              return (
                <div className="border-2" style={{ borderColor: "var(--window-document-border)" }}>
                  <div className="px-3 py-2 border-b-2 flex items-center gap-2" style={{
                    background: "var(--window-document-bg-elevated)",
                    borderColor: "var(--window-document-border)"
                  }}>
                    <FileText size={14} style={{ color: "var(--tone-accent)" }} />
                    <p className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                      Schema Preview (No Template)
                    </p>
                  </div>
                  <div className="p-4 space-y-4" style={{ background: "var(--window-document-bg-elevated)" }}>
                    <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
                      This form was created without a template. Select a template and theme above to see a styled preview, or view the form fields below:
                    </p>
                    {formSchema.sections.map((section, sectionIdx) => (
                      <div key={section.id || sectionIdx} className="border-2 p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
                        {section.title && (
                          <h4 className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                            {section.title}
                          </h4>
                        )}
                        <div className="space-y-2">
                          {section.fields?.map((field, fieldIdx) => (
                            <div key={field.id || fieldIdx} className="flex items-start gap-2">
                              <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{
                                background: "var(--tone-accent)",
                                color: "white",
                                fontSize: "10px"
                              }}>
                                {field.type}
                              </span>
                              <div className="flex-1">
                                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                                  {field.label || field.id}
                                </span>
                                {field.required && (
                                  <span className="text-xs ml-1" style={{ color: "var(--error)" }}>*</span>
                                )}
                                {field.placeholder && (
                                  <span className="text-xs ml-2" style={{ color: "var(--neutral-gray)" }}>
                                    ({field.placeholder})
                                  </span>
                                )}
                                {field.type === "text_block" && field.content && (
                                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                                    {field.content.substring(0, 100)}...
                                  </p>
                                )}
                                {field.options && (
                                  <div className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                                    Options: {field.options.map(o => o.label).join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Template Info - only show if template is selected */}
            {selectedTemplateId && (
            <div className="border-2 p-4" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                <FileText size={14} />
                {t("ui.forms.label_template")}{" "}
                {availableTemplates.find((t) => t._id === selectedTemplateId)?.name}
              </h4>
              <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                {
                  availableTemplates.find((t) => t._id === selectedTemplateId)
                    ?.customProperties?.description
                }
              </p>
              <code className="text-xs px-2 py-1" style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}>
                {
                  availableTemplates.find((t) => t._id === selectedTemplateId)
                    ?.customProperties?.code
                }
              </code>
            </div>
            )}

            {/* Theme Info - only show if theme is selected */}
            {selectedThemeId && (
            <div className="border-2 p-4" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                <Palette size={14} />
                {t("ui.forms.label_theme")} {availableThemes.find((t) => t._id === selectedThemeId)?.name}
              </h4>
              <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                {
                  availableThemes.find((t) => t._id === selectedThemeId)?.customProperties
                    ?.description
                }
              </p>

              {/* Color swatches */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>{t("ui.forms.label_colors")}</span>
                <div className="flex gap-1">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderColor: "var(--window-document-border)"
                    }}
                    title={t("ui.forms.color_primary_gradient")}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "var(--window-document-bg-elevated)",
                      borderColor: "var(--window-document-border)"
                    }}
                    title={t("ui.forms.color_background")}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "var(--window-document-text)",
                      borderColor: "var(--window-document-border)"
                    }}
                    title={t("ui.forms.color_text")}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "var(--window-document-bg)",
                      borderColor: "var(--window-document-border)"
                    }}
                    title={t("ui.forms.color_secondary")}
                  />
                </div>
              </div>

              <code className="text-xs px-2 py-1" style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)" }}>
                {
                  availableThemes.find((t) => t._id === selectedThemeId)?.customProperties
                    ?.code
                }
              </code>
            </div>
            )}
          </div>
        ) : (
          <div className="border-2 p-8 text-center" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
            <FileText size={64} className="mx-auto mb-4" style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
            <h4 className="font-bold text-sm mb-2" style={{ color: "var(--window-document-text)" }}>
              {t("ui.forms.preview_select_prompt")}
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.preview_select_description")}
            </p>
          </div>
        )}
      </div>

      {/* Schema Editor Modal */}
      {showSchemaModal && formId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setShowSchemaModal(false)}
        >
          <div
            className="border-4 w-[90%] h-[90%] flex flex-col"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="flex items-center gap-2">
                <Code size={20} style={{ color: "var(--tone-accent)" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                  Edit Schema - {existingForm?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="p-1 hover:brightness-95"
                style={{ color: "var(--window-document-text)" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SchemaEditorTab formId={formId as Id<"objects">} />
            </div>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {showTemplateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="border-4 p-6 max-w-md w-full mx-4"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Save size={20} style={{ color: "#8b5cf6" }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                  Save as Template
                </h3>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1 hover:brightness-95"
                style={{ color: "var(--window-document-text)" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAsTemplate} className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Template Name <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full border-2 px-2 py-1 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder="e.g., Registration Form"
                  required
                />
              </div>

              {/* Template Code */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Template Code <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newTemplateCode}
                  onChange={(e) => setNewTemplateCode(e.target.value)}
                  className="w-full border-2 px-2 py-1 text-sm font-mono"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder="e.g., registration_form"
                  pattern="[a-z0-9_]+"
                  required
                />
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Lowercase letters, numbers, and underscores only
                </p>
              </div>

              {/* Template Description */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Description
                </label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className="w-full border-2 px-2 py-1 text-sm"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                  placeholder="Brief description of this template"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t-2" style={{ borderColor: "var(--window-document-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-sm font-bold border-2"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTemplateName || !newTemplateCode || isSavingTemplate}
                  className="px-4 py-2 text-sm font-bold border-2 disabled:opacity-50"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: newTemplateName && newTemplateCode && !isSavingTemplate ? "#8b5cf6" : "var(--window-document-bg-elevated)",
                    color: newTemplateName && newTemplateCode && !isSavingTemplate ? "white" : "var(--neutral-gray)",
                  }}
                >
                  {isSavingTemplate ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Save Template"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
