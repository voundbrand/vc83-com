"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
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
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to create forms.
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
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (availableTemplates.length === 0 || availableThemes.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-yellow-900">
                Templates or Themes Not Available
              </h4>
              <p className="text-xs text-yellow-800 mt-1">
                {availableTemplates.length === 0 &&
                  "Your organization does not have any form templates enabled yet. "}
                {availableThemes.length === 0 && "No themes found in system. "}
                Contact your system administrator to enable templates.
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

        setSuccessMessage("Form updated successfully!");
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

        setSuccessMessage("Form created successfully!");

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
      <div className="w-[40%] p-4 overflow-y-auto border-r-2 border-gray-400">
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
          Back to Forms
        </button>

        {/* Success message */}
        {successMessage && (
          <div className="border-2 border-green-600 bg-green-50 p-4 mb-4">
            <div className="flex items-start gap-2">
              <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-green-900">Success!</h4>
                <p className="text-xs text-green-800 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <FileText size={16} />
          {formId ? "Edit Form" : "Create New Form"}
        </h3>

        {formId && (
          <div className="border-2 border-blue-600 bg-blue-50 p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-blue-900">Editing Mode</h4>
                <p className="text-xs text-blue-800 mt-1">
                  You are editing an existing form. Changes will update the form immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selection */}
          <div className="border-2 border-gray-400">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setTemplateAccordionOpen(!templateAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span className="text-sm font-bold">
                  Select Form Template <span className="text-red-600">*</span>
                </span>
                {selectedTemplateId && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                    {availableTemplates.find((t) => t._id === selectedTemplateId)?.name}
                  </span>
                )}
              </div>
              {templateAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {templateAccordionOpen && (
              <div className="p-3 bg-white space-y-2">
                {availableTemplates.map((template) => (
                  <button
                    key={template._id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template._id)}
                    className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                    style={{
                      borderColor:
                        selectedTemplateId === template._id ? "#6B46C1" : "#D1D5DB",
                      backgroundColor:
                        selectedTemplateId === template._id ? "#F3E8FF" : "white",
                      borderWidth: selectedTemplateId === template._id ? "3px" : "2px",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1">{template.name}</div>
                        <p className="text-xs text-gray-600 mb-1">
                          {template.customProperties?.description}
                        </p>
                        <code className="text-xs bg-gray-100 px-1">
                          {template.customProperties?.code}
                        </code>
                      </div>
                      {selectedTemplateId === template._id && (
                        <Check size={20} className="text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme selection */}
          <div className="border-2 border-gray-400">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setThemeAccordionOpen(!themeAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Palette size={16} />
                <span className="text-sm font-bold">
                  Select Theme <span className="text-red-600">*</span>
                </span>
                {selectedThemeId && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                    {availableThemes.find((t) => t._id === selectedThemeId)?.name}
                  </span>
                )}
              </div>
              {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {themeAccordionOpen && (
              <div className="p-3 bg-white space-y-2">
                {availableThemes.map((theme: TemplateOrTheme) => (
                  <button
                    key={theme._id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme._id)}
                    className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                    style={{
                      borderColor: selectedThemeId === theme._id ? "#6B46C1" : "#D1D5DB",
                      backgroundColor: selectedThemeId === theme._id ? "#F3E8FF" : "white",
                      borderWidth: selectedThemeId === theme._id ? "3px" : "2px",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1">{theme.name}</div>
                        <p className="text-xs text-gray-600 mb-1">
                          {theme.customProperties?.description}
                        </p>
                        <code className="text-xs bg-gray-100 px-1">
                          {theme.customProperties?.code}
                        </code>
                      </div>
                      {selectedThemeId === theme._id && (
                        <Check size={20} className="text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                    {/* Color palette preview */}
                    <div className="flex gap-1 mt-2">
                      <div
                        className="w-8 h-8 rounded border border-gray-300"
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                        title="Primary Gradient"
                      />
                      <div
                        className="w-8 h-8 rounded border border-gray-300 bg-white"
                        title="Background"
                      />
                      <div
                        className="w-8 h-8 rounded border border-gray-300 bg-gray-900"
                        title="Text"
                      />
                      <div
                        className="w-8 h-8 rounded border border-gray-300 bg-gray-100"
                        title="Secondary"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Data Sources (Optional) */}
          <div className="border-2 border-gray-400">
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => setDataSourcesAccordionOpen(!dataSourcesAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span className="text-sm font-bold">Link to Event (Optional)</span>
                {selectedEventId && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                    {availableEvents?.find((e) => e._id === selectedEventId)?.name}
                  </span>
                )}
              </div>
              {dataSourcesAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Accordion Content */}
            {dataSourcesAccordionOpen && (
              <div className="p-3 bg-white">
                <p className="text-xs text-gray-600 mb-3">
                  Link this form to an event to automatically connect form responses with event tickets.
                </p>

                {availableEvents === undefined && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 size={20} className="animate-spin text-purple-600" />
                  </div>
                )}

                {availableEvents && availableEvents.length === 0 && (
                  <div className="border-2 border-yellow-600 bg-yellow-50 p-3">
                    <p className="text-xs text-yellow-800">
                      No events found. Create an event first to link it to this form.
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
                        borderColor: selectedEventId === "" ? "#6B46C1" : "#D1D5DB",
                        backgroundColor: selectedEventId === "" ? "#F3E8FF" : "white",
                        borderWidth: selectedEventId === "" ? "3px" : "2px",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-sm mb-1">No Event</div>
                          <p className="text-xs text-gray-600">Form is not linked to any event</p>
                        </div>
                        {selectedEventId === "" && (
                          <Check size={20} className="text-purple-600 flex-shrink-0" />
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
                          borderColor: selectedEventId === event._id ? "#6B46C1" : "#D1D5DB",
                          backgroundColor: selectedEventId === event._id ? "#F3E8FF" : "white",
                          borderWidth: selectedEventId === event._id ? "3px" : "2px",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-sm mb-1">{event.name}</div>
                            {event.description && (
                              <p className="text-xs text-gray-600 mb-1">{event.description}</p>
                            )}
                            <code className="text-xs bg-gray-100 px-1">ID: {event._id}</code>
                          </div>
                          {selectedEventId === event._id && (
                            <Check size={20} className="text-purple-600 flex-shrink-0" />
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
              <label className="block text-xs font-bold mb-1">
                Form Type <span className="text-red-600">*</span>
              </label>
              <select
                value={formSubtype}
                onChange={(e) => setFormSubtype(e.target.value)}
                className="w-full border-2 border-gray-400 px-2 py-1 text-sm"
                required
              >
                <option value="registration">Registration - Event sign-ups</option>
                <option value="survey">Survey - Feedback collection</option>
                <option value="application">Application - Speaker proposals</option>
              </select>
            </div>
          )}

          {/* Form Name */}
          <div>
            <label className="block text-xs font-bold mb-1">
              Form Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full border-2 border-gray-400 px-2 py-1 text-sm"
              placeholder="e.g., HaffSymposium 2024 Registration"
              required
            />
          </div>

          {/* Form Description */}
          <div>
            <label className="block text-xs font-bold mb-1">Description (Optional)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full border-2 border-gray-400 px-2 py-1 text-sm"
              placeholder="Describe what this form is for..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formDescription.length}/500 characters
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-400">
            <p className="text-xs text-gray-600">
              Form will be created as a <span className="font-bold">draft</span>.
            </p>
            <button
              type="submit"
              disabled={!selectedTemplateId || !selectedThemeId || !formName || isSaving}
              className="px-4 py-2 text-sm font-bold border-2 border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  selectedTemplateId && selectedThemeId && formName && !isSaving
                    ? "#6B46C1"
                    : "#E5E7EB",
                color:
                  selectedTemplateId && selectedThemeId && formName && !isSaving
                    ? "white"
                    : "#6B7280",
              }}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {formId ? "Updating..." : "Creating..."}
                </span>
              ) : formId ? (
                "Update Form"
              ) : (
                "Create Form"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT: Live Preview (60%) */}
      <div className="w-[60%] p-4 overflow-y-auto bg-gray-50">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Eye size={16} />
          Live Preview
        </h3>

        {/* Preview content */}
        {selectedTemplateId && selectedThemeId ? (
          <div className="space-y-4">
            {/* LIVE FORM PREVIEW */}
            <div className="border-2 border-gray-400 bg-white overflow-hidden">
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
                      <div className="p-8 text-center text-gray-500">
                        <p className="text-xs">Form template not found: {templateCode}</p>
                      </div>
                    );
                  }

                  if (!theme) {
                    return (
                      <div className="p-8 text-center text-gray-500">
                        <p className="text-xs">Theme not found: {themeCode}</p>
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
                    <div className="transform scale-75 origin-top-left w-[133%]">
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
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-xs">Form preview loading...</p>
                  </div>
                );
              })()}
            </div>

            {/* Template Info */}
            <div className="border-2 border-gray-400 bg-white p-4">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <FileText size={14} />
                Template:{" "}
                {availableTemplates.find((t) => t._id === selectedTemplateId)?.name}
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                {
                  availableTemplates.find((t) => t._id === selectedTemplateId)
                    ?.customProperties?.description
                }
              </p>
              <code className="text-xs bg-gray-100 px-2 py-1">
                {
                  availableTemplates.find((t) => t._id === selectedTemplateId)
                    ?.customProperties?.code
                }
              </code>
            </div>

            {/* Theme Info */}
            <div className="border-2 border-gray-400 bg-white p-4">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <Palette size={14} />
                Theme: {availableThemes.find((t) => t._id === selectedThemeId)?.name}
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                {
                  availableThemes.find((t) => t._id === selectedThemeId)?.customProperties
                    ?.description
                }
              </p>

              {/* Color swatches */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold">Colors:</span>
                <div className="flex gap-1">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                    title="Primary Gradient"
                  />
                  <div
                    className="w-8 h-8 rounded border border-gray-300 bg-white"
                    title="Background"
                  />
                  <div
                    className="w-8 h-8 rounded border border-gray-300 bg-gray-900"
                    title="Text"
                  />
                  <div
                    className="w-8 h-8 rounded border border-gray-300 bg-gray-100"
                    title="Secondary"
                  />
                </div>
              </div>

              <code className="text-xs bg-gray-100 px-2 py-1">
                {
                  availableThemes.find((t) => t._id === selectedThemeId)?.customProperties
                    ?.code
                }
              </code>
            </div>
          </div>
        ) : (
          <div className="border-2 border-gray-400 bg-white p-8 text-center">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <h4 className="font-bold text-sm text-gray-700 mb-2">
              Select Template & Theme
            </h4>
            <p className="text-xs text-gray-600">
              Choose a form template and theme from the left panel to see a live preview
              here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
