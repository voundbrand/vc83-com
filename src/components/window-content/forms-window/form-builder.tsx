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
} from "lucide-react";
import { getFormTemplate } from "@/templates/forms/registry";
import { webPublishingThemes } from "@/templates/themes";

interface FormBuilderProps {
  formId: string | null;
  onBack: () => void;
}

// Type for template/theme objects from DB
interface TemplateOrTheme {
  _id: string;
  name: string;
  customProperties?: {
    code?: string;
    description?: string;
    category?: string;
  };
}

export function FormBuilder({ formId, onBack }: FormBuilderProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.forms");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSubtype, setFormSubtype] = useState<string>("registration");
  const [isSaving, setIsSaving] = useState(false);
  const [templateAccordionOpen, setTemplateAccordionOpen] = useState(true);
  const [themeAccordionOpen, setThemeAccordionOpen] = useState(true);
  const [dataSourcesAccordionOpen, setDataSourcesAccordionOpen] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch available form templates for this org
  const availableTemplates = useQuery(
    api.formTemplateAvailability.getAvailableFormTemplates,
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

  // Fetch existing form data if editing
  const existingForm = useQuery(
    api.formsOntology.getForm,
    formId && sessionId ? { sessionId, formId: formId as Id<"objects"> } : "skip"
  );

  const createForm = useMutation(api.formsOntology.createForm);
  const updateForm = useMutation(api.formsOntology.updateForm);

  // Load existing form data when editing
  useEffect(() => {
    if (existingForm && availableTemplates && availableThemes) {
      setFormName(existingForm.name || "");
      setFormDescription(existingForm.description || "");
      setFormSubtype(existingForm.subtype || "registration");

      // Load eventId if present
      const eventId = existingForm.customProperties?.eventId as string | undefined;
      if (eventId) {
        setSelectedEventId(eventId);
      }

      // Find template and theme IDs from codes stored in formSchema
      const formSchema = existingForm.customProperties?.formSchema as {
        templateCode?: string;
        themeCode?: string;
      } | undefined;
      const templateCode = formSchema?.templateCode;
      const themeCode = formSchema?.themeCode;

      if (templateCode && availableTemplates) {
        const template = availableTemplates.find(
          (t) => t.customProperties?.code === templateCode
        );
        if (template) setSelectedTemplateId(template._id);
      }

      if (themeCode && availableThemes) {
        const theme = availableThemes.find((t) => t.customProperties?.code === themeCode);
        if (theme) setSelectedThemeId(theme._id);
      }
    }
  }, [existingForm, availableTemplates, availableThemes]);

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
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  if (availableTemplates.length === 0 || availableThemes.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: "var(--warning)", background: "rgba(251, 191, 36, 0.1)" }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: "var(--warning)" }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "var(--warning)" }}>
                {t("ui.forms.templates_unavailable_title")}
              </h4>
              <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>
                {availableTemplates.length === 0 && t("ui.forms.no_templates_message") + " "}
                {availableThemes.length === 0 && t("ui.forms.no_themes_message") + " "}
                {t("ui.forms.contact_admin")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedThemeId || !formName) return;

    setIsSaving(true);
    try {
      // Get the selected template and theme codes
      const selectedTemplate = availableTemplates.find(
        (t: TemplateOrTheme) => t._id === selectedTemplateId
      );
      const selectedTheme = availableThemes.find(
        (t: TemplateOrTheme) => t._id === selectedThemeId
      );

      if (!selectedTemplate || !selectedTheme) {
        throw new Error("Selected template or theme not found");
      }

      const templateCode = selectedTemplate.customProperties?.code as string;
      const themeCode = selectedTheme.customProperties?.code as string;

      if (formId) {
        // UPDATE existing form
        // Store templateCode and themeCode in formSchema
        const existingSchema = (existingForm?.customProperties?.formSchema || {}) as {
          version?: string;
          fields?: unknown[];
          settings?: Record<string, unknown>;
        };

        await updateForm({
          sessionId,
          formId: formId as Id<"objects">,
          name: formName,
          description: formDescription,
          formSchema: {
            ...existingSchema,
            version: "1.0",
            templateCode,
            themeCode,
            fields: existingSchema.fields || [],
            settings: existingSchema.settings || {
              allowMultipleSubmissions: false,
              showProgressBar: true,
              submitButtonText: "Submit",
              successMessage: "Thank you for your submission!",
              redirectUrl: null,
            },
          },
          eventId: selectedEventId ? (selectedEventId as Id<"objects">) : null,
        });

        setSuccessMessage(t("ui.forms.form_updated"));
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        // CREATE new form - Load schema from DATABASE template (primary source)
        const templateSchemaFromDB = selectedTemplate.customProperties?.formSchema as {
          version?: string;
          sections?: unknown[];
          settings?: Record<string, unknown>;
        } | undefined;

        // Fallback to TypeScript registry if DB doesn't have schema
        const templateComponent = getFormTemplate(templateCode);
        const templateSchemaFromCode = templateComponent?.schema;

        // Get sections from template (sections contain all fields!)
        const sections = templateSchemaFromDB?.sections || templateSchemaFromCode?.sections || [];

        console.log("🔍 [FormBuilder] Creating form with schema:", {
          templateCode,
          selectedTemplateCustomProps: selectedTemplate.customProperties,
          templateSchemaFromDB: templateSchemaFromDB,
          templateSchemaFromCode: !!templateSchemaFromCode,
          hasSections: sections.length > 0,
          sectionsCount: sections.length,
        });

        await createForm({
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          subtype: formSubtype,
          name: formName,
          description: formDescription,
          formSchema: {
            version: templateSchemaFromCode?.version || templateSchemaFromDB?.version || "1.0",
            templateCode,
            themeCode,
            // Sections contain all fields and conditional logic!
            sections,
            settings: templateSchemaFromCode?.settings || templateSchemaFromDB?.settings || {
              allowMultipleSubmissions: false,
              showProgressBar: true,
              submitButtonText: "Submit",
              successMessage: "Thank you for your submission!",
              redirectUrl: null,
            },
          },
          eventId: selectedEventId ? (selectedEventId as Id<"objects">) : undefined,
        });

        setSuccessMessage(t("ui.forms.form_created"));

        // Reset form
        setSelectedTemplateId("");
        setSelectedThemeId("");
        setSelectedEventId("");
        setFormName("");
        setFormDescription("");
        setFormSubtype("registration");

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

  return (
    <div className="flex h-full">
      {/* LEFT: Form Editor (40%) */}
      <div className="w-[40%] p-4 overflow-y-auto border-r-2" style={{ borderColor: "var(--win95-border)" }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-4 px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
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

        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <FileText size={16} />
          {formId ? t("ui.forms.builder_title_edit") : t("ui.forms.builder_title_create")}
        </h3>

        {formId && (
          <div className="border-2 p-3 mb-4" style={{ borderColor: "var(--win95-highlight)", background: "rgba(0, 0, 128, 0.05)" }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs" style={{ color: "var(--win95-highlight)" }}>{t("ui.forms.editing_mode_title")}</h4>
                <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                  {t("ui.forms.editing_mode_message")}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selection */}
          <div className="border-2" style={{ borderColor: "var(--win95-border)" }}>
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setTemplateAccordionOpen(!templateAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:brightness-95"
              style={{ background: "var(--win95-bg-light)", color: "var(--win95-text)" }}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span className="text-sm font-bold">
                  {t("ui.forms.section_select_template")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
                </span>
                {selectedTemplateId && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--win95-highlight)", color: "white" }}>
                    {availableTemplates.find((t) => t._id === selectedTemplateId)?.name}
                  </span>
                )}
              </div>
              {templateAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {templateAccordionOpen && (
              <div className="p-3 space-y-2" style={{ background: "var(--win95-input-bg)" }}>
                {availableTemplates.map((template) => (
                  <button
                    key={template._id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template._id)}
                    className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                    style={{
                      borderColor:
                        selectedTemplateId === template._id ? "var(--win95-highlight)" : "var(--win95-border)",
                      backgroundColor:
                        selectedTemplateId === template._id ? "var(--win95-bg-light)" : "var(--win95-input-bg)",
                      borderWidth: selectedTemplateId === template._id ? "3px" : "2px",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>{template.name}</div>
                        <p className="text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                          {template.customProperties?.description}
                        </p>
                        <code className="text-xs px-1" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                          {template.customProperties?.code}
                        </code>
                      </div>
                      {selectedTemplateId === template._id && (
                        <Check size={20} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme selection */}
          <div className="border-2" style={{ borderColor: "var(--win95-border)" }}>
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setThemeAccordionOpen(!themeAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:brightness-95"
              style={{ background: "var(--win95-bg-light)", color: "var(--win95-text)" }}
            >
              <div className="flex items-center gap-2">
                <Palette size={16} />
                <span className="text-sm font-bold">
                  {t("ui.forms.section_select_theme")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
                </span>
                {selectedThemeId && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--win95-highlight)", color: "white" }}>
                    {availableThemes.find((t) => t._id === selectedThemeId)?.name}
                  </span>
                )}
              </div>
              {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {themeAccordionOpen && (
              <div className="p-3 space-y-2" style={{ background: "var(--win95-input-bg)" }}>
                {availableThemes.map((theme: TemplateOrTheme) => (
                  <button
                    key={theme._id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme._id)}
                    className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                    style={{
                      borderColor: selectedThemeId === theme._id ? "var(--win95-highlight)" : "var(--win95-border)",
                      backgroundColor: selectedThemeId === theme._id ? "var(--win95-bg-light)" : "var(--win95-input-bg)",
                      borderWidth: selectedThemeId === theme._id ? "3px" : "2px",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>{theme.name}</div>
                        <p className="text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>
                          {theme.customProperties?.description}
                        </p>
                        <code className="text-xs px-1" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                          {theme.customProperties?.code}
                        </code>
                      </div>
                      {selectedThemeId === theme._id && (
                        <Check size={20} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0" />
                      )}
                    </div>
                    {/* Color palette preview */}
                    <div className="flex gap-1 mt-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          borderColor: "var(--win95-border)"
                        }}
                        title={t("ui.forms.color_primary_gradient")}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "var(--win95-input-bg)",
                          borderColor: "var(--win95-border)"
                        }}
                        title={t("ui.forms.color_background")}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "var(--win95-text)",
                          borderColor: "var(--win95-border)"
                        }}
                        title={t("ui.forms.color_text")}
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{
                          background: "var(--win95-bg)",
                          borderColor: "var(--win95-border)"
                        }}
                        title={t("ui.forms.color_secondary")}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Data Sources (Optional) */}
          <div className="border-2" style={{ borderColor: "var(--win95-border)" }}>
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setDataSourcesAccordionOpen(!dataSourcesAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:brightness-95"
              style={{ background: "var(--win95-bg-light)", color: "var(--win95-text)" }}
            >
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span className="text-sm font-bold">{t("ui.forms.section_link_event")}</span>
                {selectedEventId && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--win95-highlight)", color: "white" }}>
                    {availableEvents?.find((e) => e._id === selectedEventId)?.name}
                  </span>
                )}
              </div>
              {dataSourcesAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {dataSourcesAccordionOpen && (
              <div className="p-3" style={{ background: "var(--win95-input-bg)" }}>
                <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.forms.link_event_description")}
                </p>

                {availableEvents === undefined && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
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
                        borderColor: selectedEventId === "" ? "var(--win95-highlight)" : "var(--win95-border)",
                        backgroundColor: selectedEventId === "" ? "var(--win95-bg-light)" : "var(--win95-input-bg)",
                        borderWidth: selectedEventId === "" ? "3px" : "2px",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>{t("ui.forms.no_event")}</div>
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>{t("ui.forms.no_event_description")}</p>
                        </div>
                        {selectedEventId === "" && (
                          <Check size={20} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0" />
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
                          borderColor: selectedEventId === event._id ? "var(--win95-highlight)" : "var(--win95-border)",
                          backgroundColor: selectedEventId === event._id ? "var(--win95-bg-light)" : "var(--win95-input-bg)",
                          borderWidth: selectedEventId === event._id ? "3px" : "2px",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>{event.name}</div>
                            {event.description && (
                              <p className="text-xs mb-1" style={{ color: "var(--neutral-gray)" }}>{event.description}</p>
                            )}
                            <code className="text-xs px-1" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>ID: {event._id}</code>
                          </div>
                          {selectedEventId === event._id && (
                            <Check size={20} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Type (only for new forms) */}
          {!formId && (
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                {t("ui.forms.label_form_type")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
              </label>
              <select
                value={formSubtype}
                onChange={(e) => setFormSubtype(e.target.value)}
                className="w-full border-2 px-2 py-1 text-sm"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-text)"
                }}
                required
              >
                <option value="registration">{t("ui.forms.type_option_registration")}</option>
                <option value="survey">{t("ui.forms.type_option_survey")}</option>
                <option value="application">{t("ui.forms.type_option_application")}</option>
              </select>
            </div>
          )}

          {/* Form Name */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.forms.label_form_name")} <span style={{ color: "var(--error)" }}>{t("ui.forms.required_indicator")}</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full border-2 px-2 py-1 text-sm"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-text)"
              }}
              placeholder={t("ui.forms.placeholder_form_name")}
              required
            />
          </div>

          {/* Form Description */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>{t("ui.forms.label_description")}</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full border-2 px-2 py-1 text-sm"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-text)"
              }}
              placeholder={t("ui.forms.placeholder_description")}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {formDescription.length}/500 {t("ui.forms.characters")}
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.submit_note")} <span className="font-bold">{t("ui.forms.status_draft").toLowerCase()}</span>.
            </p>
            <button
              type="submit"
              disabled={!selectedTemplateId || !selectedThemeId || !formName || isSaving}
              className="px-4 py-2 text-sm font-bold border-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--win95-border)",
                backgroundColor:
                  selectedTemplateId && selectedThemeId && formName && !isSaving
                    ? "var(--win95-highlight)"
                    : "var(--win95-button-face)",
                color:
                  selectedTemplateId && selectedThemeId && formName && !isSaving
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
        </form>
      </div>

      {/* RIGHT: Live Preview (60%) */}
      <div className="w-[60%] p-4 overflow-y-auto" style={{ background: "var(--win95-bg)" }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Eye size={16} />
          {t("ui.forms.live_preview")}
        </h3>

        {/* Preview content */}
        {selectedTemplateId && selectedThemeId ? (
          <div className="space-y-4">
            {/* LIVE FORM PREVIEW - Isolated from Win95 theme */}
            <div className="border-2" style={{ borderColor: "var(--win95-border)" }}>
              {/* Label above preview */}
              <div className="px-3 py-2 border-b-2" style={{
                background: "var(--win95-bg-light)",
                borderColor: "var(--win95-border)"
              }}>
                <p className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
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

                    // 🚨 CRITICAL: Load schema from TypeScript template, NOT database!
                    // The FormComponent.schema contains the actual sections (which contain fields)
                    const templateSchema = FormComponent.schema;

                    console.log("🎨 [FormBuilder] Live preview loading schema:", {
                      templateCode,
                      themeCode,
                      hasSchema: !!templateSchema,
                      sectionsCount: templateSchema?.sections?.length || 0,
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

            {/* Template Info */}
            <div className="border-2 p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
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
              <code className="text-xs px-2 py-1" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                {
                  availableTemplates.find((t) => t._id === selectedTemplateId)
                    ?.customProperties?.code
                }
              </code>
            </div>

            {/* Theme Info */}
            <div className="border-2 p-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
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
                <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>{t("ui.forms.label_colors")}</span>
                <div className="flex gap-1">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderColor: "var(--win95-border)"
                    }}
                    title={t("ui.forms.color_primary_gradient")}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "var(--win95-input-bg)",
                      borderColor: "var(--win95-border)"
                    }}
                    title={t("ui.forms.color_background")}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "var(--win95-text)",
                      borderColor: "var(--win95-border)"
                    }}
                    title={t("ui.forms.color_text")}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{
                      background: "var(--win95-bg)",
                      borderColor: "var(--win95-border)"
                    }}
                    title={t("ui.forms.color_secondary")}
                  />
                </div>
              </div>

              <code className="text-xs px-2 py-1" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                {
                  availableThemes.find((t) => t._id === selectedThemeId)?.customProperties
                    ?.code
                }
              </code>
            </div>
          </div>
        ) : (
          <div className="border-2 p-8 text-center" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
            <FileText size={64} className="mx-auto mb-4" style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
            <h4 className="font-bold text-sm mb-2" style={{ color: "var(--win95-text)" }}>
              {t("ui.forms.preview_select_prompt")}
            </h4>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.preview_select_description")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
