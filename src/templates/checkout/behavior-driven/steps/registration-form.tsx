"use client";

/**
 * STEP 2: REGISTRATION FORM
 *
 * Dynamic form based on product configuration.
 * Supports conditional logic, sections, and all field types.
 *
 * IMPORTANT: This step ALWAYS collects attendee name for each ticket,
 * even when no custom form is configured. This ensures multi-ticket
 * purchases always have per-attendee identification.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { StepProps } from "../types";
import { FileText, ArrowLeft, User } from "lucide-react";
import { executeCheckoutBehaviors, getAddonsFromResults } from "@/lib/behaviors/adapters/checkout-integration";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

type FormField = {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
};

type FormSection = {
  id: string;
  title?: string;
  description?: string;
  fields: FormField[];
  conditional?: {
    show: "all" | "any";
    rules: Array<{
      fieldId: string;
      operator: string;
      value: string | number | string[] | number[];
    }>;
  };
};

type FormSchema = {
  sections?: FormSection[];
  fields?: FormField[];
};

export function RegistrationFormStep({
  checkoutData,
  products,
  workflowBehaviors,
  organizationId,
  sessionId,
  onComplete,
  onBack
}: StepProps) {
  const { t } = useNamespaceTranslations("ui.checkout_template.behavior_driven");
  const selectedProducts = useMemo(() => checkoutData.selectedProducts || [], [checkoutData.selectedProducts]);

  // ============================================================================
  // FORM RESOLUTION: Product-level forms override workflow forms
  // ============================================================================

  interface FormLinkingConfig {
    formId?: string;
    timing?: "duringCheckout" | "afterPurchase" | "standalone";
    triggerConditions?: {
      productSubtype?: string[];
      minQuantity?: number;
    };
  }

  // Get workflow-level form (default for all tickets without product-specific form)
  const formBehaviors = workflowBehaviors?.filter(b =>
    b.type === "form_linking" &&
    (b.config as FormLinkingConfig).timing === "duringCheckout"
  ) || [];

  const activeFormBehavior = formBehaviors.find(behavior => {
    const config = behavior.config as FormLinkingConfig;
    if (config.triggerConditions?.productSubtype) {
      const selectedSubtypes = selectedProducts.map(sp =>
        products.find(p => p._id === sp.productId)?.subtype
      ).filter((st): st is string => st !== undefined);
      if (!selectedSubtypes.some(st => config.triggerConditions?.productSubtype?.includes(st))) return false;
    }
    if (config.triggerConditions?.minQuantity) {
      const totalQty = selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0);
      if (totalQty < config.triggerConditions.minQuantity) return false;
    }
    return true;
  });

  const workflowFormId = activeFormBehavior?.config?.formId as string | undefined;

  // ============================================================================
  // BUILD TICKET-TO-FORM MAPPING
  // Priority: Product-level form > Workflow form > No form
  // ============================================================================

  // Build expanded ticket list with product info
  const ticketsWithProducts = useMemo(() => {
    const tickets: Array<{ ticketNum: number; productId: string; product: typeof products[0] | undefined }> = [];
    let ticketNum = 1;
    for (const sp of selectedProducts) {
      const product = products.find(p => p._id === sp.productId);
      for (let i = 0; i < sp.quantity; i++) {
        tickets.push({ ticketNum, productId: sp.productId as string, product });
        ticketNum++;
      }
    }
    return tickets;
  }, [selectedProducts, products]);

  // Map each ticket to its form (product-level overrides workflow-level)
  const ticketFormMap = useMemo(() => {
    const map: Record<number, string | undefined> = {};
    for (const ticket of ticketsWithProducts) {
      // Priority 1: Product-level form
      const productFormId = ticket.product?.customProperties?.formId as string | undefined;
      if (productFormId) {
        map[ticket.ticketNum] = productFormId;
      }
      // Priority 2: Workflow-level form (fallback)
      else if (workflowFormId) {
        map[ticket.ticketNum] = workflowFormId;
      }
      // No form for this ticket
      else {
        map[ticket.ticketNum] = undefined;
      }
    }
    return map;
  }, [ticketsWithProducts, workflowFormId]);

  // Get unique form IDs we need to fetch
  const uniqueFormIds = useMemo(() => {
    const ids = new Set<string>();
    for (const formId of Object.values(ticketFormMap)) {
      if (formId) ids.add(formId);
    }
    return Array.from(ids);
  }, [ticketFormMap]);

  // For backwards compatibility, use first form as "primary" (for single-form cases)
  const formId = uniqueFormIds[0];

  // ============================================================================
  // MULTI-FORM SUPPORT: Fetch all unique forms needed
  // ============================================================================

  // Fetch form definitions - we fetch up to 3 different forms (typical max per checkout)
  const form1 = useQuery(
    api.formsOntology.getPublicForm,
    uniqueFormIds[0] ? { formId: uniqueFormIds[0] as Id<"objects"> } : "skip"
  );
  const form2 = useQuery(
    api.formsOntology.getPublicForm,
    uniqueFormIds[1] ? { formId: uniqueFormIds[1] as Id<"objects"> } : "skip"
  );
  const form3 = useQuery(
    api.formsOntology.getPublicForm,
    uniqueFormIds[2] ? { formId: uniqueFormIds[2] as Id<"objects"> } : "skip"
  );

  // Build a map of formId -> form data
  const formDataMap = useMemo(() => {
    const map: Record<string, typeof form1> = {};
    if (uniqueFormIds[0] && form1) map[uniqueFormIds[0]] = form1;
    if (uniqueFormIds[1] && form2) map[uniqueFormIds[1]] = form2;
    if (uniqueFormIds[2] && form3) map[uniqueFormIds[2]] = form3;
    return map;
  }, [uniqueFormIds, form1, form2, form3]);

  // Get form data for a specific ticket
  const getFormForTicket = (ticketNum: number) => {
    const ticketFormId = ticketFormMap[ticketNum];
    if (!ticketFormId) return null;
    return formDataMap[ticketFormId] || null;
  };

  // Check if all required forms are loaded
  const allFormsLoaded = useMemo(() => {
    for (const fId of uniqueFormIds) {
      if (!formDataMap[fId]) return false;
    }
    return true;
  }, [uniqueFormIds, formDataMap]);

  // Legacy: single form for backwards compatibility
  const form = form1;

  // Track responses per ticket (includes attendeeName for all tickets)
  const [responses, setResponses] = useState<Record<number, Record<string, unknown>>>({});

  // Calculate total ticket count
  const totalTicketCount = ticketsWithProducts.length;

  // Generate ticket numbers [1, 2, 3, ...] for all tickets
  const allTickets = useMemo(() => {
    return ticketsWithProducts.map(t => t.ticketNum);
  }, [ticketsWithProducts]);

  // Check if ticket has a custom form
  const ticketHasCustomForm = (ticketNum: number) => {
    return !!ticketFormMap[ticketNum];
  };

  // Get the form ID for a specific ticket
  const getTicketFormId = (ticketNum: number) => {
    return ticketFormMap[ticketNum];
  };

  // Legacy: tickets needing forms (for validation)
  const ticketsNeedingForms = useMemo(() => {
    return allTickets.filter(ticketNum => !!ticketFormMap[ticketNum]);
  }, [allTickets, ticketFormMap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate ALL tickets have first name and last name
    const allHaveNames = allTickets.every((ticketNum) => {
      const ticketResponses = responses[ticketNum];
      const firstName = ticketResponses?.firstName as string | undefined;
      const lastName = ticketResponses?.lastName as string | undefined;
      return firstName && firstName.trim().length > 0 && lastName && lastName.trim().length > 0;
    });

    if (!allHaveNames) {
      alert(t("ui.checkout_template.behavior_driven.registration_form.errors.attendee_name_required") ||
        "Please enter first and last name for each ticket");
      return;
    }

    // For tickets with custom forms, validate form responses
    const formsComplete = ticketsNeedingForms.every((ticketNum) => {
      const ticketResponses = responses[ticketNum];
      // Check that at least one form field (besides firstName/lastName) has a value
      const formFields = Object.keys(ticketResponses || {}).filter(k => !['firstName', 'lastName', 'attendeeName'].includes(k));
      return formFields.length > 0;
    });

    if (ticketsNeedingForms.length > 0 && !formsComplete) {
      alert(t("ui.checkout_template.behavior_driven.registration_form.errors.complete_all"));
      return;
    }

    // Build form responses for ALL tickets (even those without custom forms)
    // Uses per-ticket form mapping for multi-form support
    const formResponsesWithCosts = await Promise.all(
      ticketsWithProducts.map(async (ticket) => {
        const ticketNum = ticket.ticketNum;
        const ticketResponses = responses[ticketNum] || {};
        const hasCustomForm = ticketHasCustomForm(ticketNum);
        const ticketFormId = ticketFormMap[ticketNum]; // Per-ticket form ID

        // Only execute behaviors for tickets with custom forms
        let addedCosts = 0;
        if (hasCustomForm && ticketFormId) {
          // Execute behaviors for this specific form response to calculate addons
          const behaviorResult = await executeCheckoutBehaviors(
            {
              organizationId,
              sessionId,
              selectedProducts,
              linkedProducts: products.map(p => ({
                _id: p._id,
                type: "product",
                subtype: p.subtype,
                name: p.name,
                customProperties: p.customProperties,
              })),
              formResponses: [{
                productId: ticket.productId as Id<"objects">,
                ticketNumber: ticketNum,
                formId: ticketFormId,
                responses: ticketResponses,
                addedCosts: 0,
                submittedAt: Date.now(),
              }],
            },
            workflowBehaviors
          );

          // Extract add-on costs from behavior results
          const addons = getAddonsFromResults(behaviorResult);
          addedCosts = addons?.totalAddonCost || 0;
          console.log(`🎟️ [RegistrationForm] Ticket ${ticketNum} add-ons:`, { addons, addedCosts });
        }

        return {
          productId: ticket.productId as Id<"objects">,
          ticketNumber: ticketNum,
          // Only include formId if ticket has a custom form (backend expects valid ID or undefined)
          ...(hasCustomForm && ticketFormId ? { formId: ticketFormId } : {}),
          responses: ticketResponses,
          addedCosts,
          submittedAt: Date.now(),
        };
      })
    );

    onComplete({ formResponses: formResponsesWithCosts });
  };

  const updateResponse = (ticketNum: number, fieldId: string, value: unknown) => {
    setResponses({
      ...responses,
      [ticketNum]: {
        ...(responses[ticketNum] || {}),
        [fieldId]: value,
      },
    });
  };

  // Track if we've already skipped this step to prevent infinite loops
  const hasSkipped = useRef(false);

  // Skip this step ONLY if:
  // 1. Single ticket (buyer name = attendee name, collected in customer-info step)
  // 2. AND no custom form is configured
  // For multiple tickets, we ALWAYS need to collect attendee names
  useEffect(() => {
    if (totalTicketCount <= 1 && !formId && !hasSkipped.current) {
      hasSkipped.current = true;
      onComplete({});
    }
  }, [totalTicketCount, formId, onComplete]);

  // Only return null if we're skipping (single ticket, no form)
  if (totalTicketCount <= 1 && !formId) {
    return null;
  }

  // Show loading only if we have forms that are still loading
  if (uniqueFormIds.length > 0 && !allFormsLoaded) {
    return <div className="p-6">{t("ui.checkout_template.behavior_driven.registration_form.messages.loading")}</div>;
  }

  // Extract form schema with proper typing (legacy - for single form)
  const formSchema = (form as { customProperties?: { formSchema?: FormSchema } })?.customProperties
    ?.formSchema;

  // Get form schema for a specific ticket
  const getFormSchemaForTicket = (ticketNum: number): FormSchema | undefined => {
    const ticketForm = getFormForTicket(ticketNum);
    if (!ticketForm) return undefined;
    return (ticketForm as { customProperties?: { formSchema?: FormSchema } })?.customProperties?.formSchema;
  };

  /**
   * Evaluate conditional rules to determine if a section should be shown
   */
  const evaluateConditional = (
    conditional: FormSection["conditional"],
    ticketResponses: Record<string, unknown>
  ): boolean => {
    if (!conditional) return true; // No conditional = always show

    const { show, rules } = conditional;

    const evaluateRule = (rule: { fieldId: string; operator: string; value: string | number | string[] | number[] }): boolean => {
      const fieldValue = ticketResponses[rule.fieldId];

      switch (rule.operator) {
        case "equals":
          return fieldValue === rule.value;
        case "notEquals":
          return fieldValue !== rule.value;
        case "in":
          return (
            Array.isArray(rule.value) &&
            (rule.value as (string | number)[]).includes(fieldValue as string | number)
          );
        case "notIn":
          return (
            Array.isArray(rule.value) &&
            !(rule.value as (string | number)[]).includes(fieldValue as string | number)
          );
        default:
          return true;
      }
    };

    // Evaluate all rules
    const results = rules.map(evaluateRule);

    // Apply logic (all = AND, any = OR)
    return show === "all" ? results.every((r) => r) : results.some((r) => r);
  };

  /**
   * Get visible sections based on conditional logic for a specific ticket
   * Uses the ticket's specific form schema (per-product forms)
   */
  const getVisibleSections = (ticketNum: number) => {
    const ticketFormSchema = getFormSchemaForTicket(ticketNum);
    if (!ticketFormSchema?.sections) return [];

    const ticketResponses = responses[ticketNum] || {};
    return ticketFormSchema.sections.filter((section) => evaluateConditional(section.conditional, ticketResponses));
  };

  /**
   * Render a single form field
   */
  const renderField = (field: FormField, ticketNum: number) => {
    const value = responses[ticketNum]?.[field.id] || "";

    return (
      <div key={field.id} className="mb-4">
        <label className="block text-sm font-bold mb-2">
          {field.label}
          {field.required && <span className="text-red-600 ml-1">*</span>}
        </label>

        {field.helpText && <p className="text-sm text-gray-600 mb-2">{field.helpText}</p>}

        {/* Text Input */}
        {field.type === "text" && (
          <input
            type="text"
            value={value as string}
            onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
          />
        )}

        {/* Email Input */}
        {field.type === "email" && (
          <input
            type="email"
            value={value as string}
            onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
          />
        )}

        {/* Phone Input */}
        {field.type === "phone" && (
          <input
            type="tel"
            value={value as string}
            onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
          />
        )}

        {/* Time Input */}
        {field.type === "time" && (
          <input
            type="time"
            value={value as string}
            onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
          />
        )}

        {/* Textarea */}
        {field.type === "textarea" && (
          <textarea
            value={value as string}
            onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
          />
        )}

        {/* Select Dropdown */}
        {field.type === "select" && field.options && (
          <select
            value={value as string}
            onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
            required={field.required}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none"
          >
            <option value="">{t("ui.checkout_template.behavior_driven.registration_form.controls.select_placeholder")}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Radio Buttons */}
        {field.type === "radio" && field.options && (
          <div className="space-y-2">
            {field.options.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`${ticketNum}-${field.id}`}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => updateResponse(ticketNum, field.id, e.target.value)}
                  required={field.required}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Checkbox Group */}
        {field.type === "checkbox" && field.options && (
          <div className="space-y-2">
            {field.options.map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={(value as string[] || []).includes(option.value)}
                  onChange={(e) => {
                    const current = (value as string[]) || [];
                    if (e.target.checked) {
                      updateResponse(ticketNum, field.id, [...current, option.value]);
                    } else {
                      updateResponse(
                        ticketNum,
                        field.id,
                        current.filter((v) => v !== option.value)
                      );
                    }
                  }}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Single Checkbox (no options) */}
        {field.type === "checkbox" && !field.options && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => updateResponse(ticketNum, field.id, e.target.checked)}
              required={field.required}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
            />
            <span className="text-sm">{field.placeholder}</span>
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <FileText size={32} />
          {t("ui.checkout_template.behavior_driven.registration_form.headers.title")}
        </h2>
        <p className="text-gray-600">
          {t("ui.checkout_template.behavior_driven.registration_form.headers.subtitle", {
            count: allTickets.length,
            label: allTickets.length === 1
              ? t("ui.checkout_template.behavior_driven.registration_form.labels.ticket_singular")
              : t("ui.checkout_template.behavior_driven.registration_form.labels.ticket_plural")
          })}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Form for EACH ticket - always collect attendee name */}
        {allTickets.map((ticketNum) => {
          const visibleSections = getVisibleSections(ticketNum);
          const hasCustomForm = ticketHasCustomForm(ticketNum);

          return (
            <div key={ticketNum} className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">{t("ui.checkout_template.behavior_driven.registration_form.labels.ticket_number", { number: ticketNum })}</h3>

              {/* ALWAYS show attendee name fields - required for all tickets */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">
                  <User size={16} className="inline mr-2" />
                  {t("ui.checkout_template.behavior_driven.registration_form.fields.attendee_name.section_label") || "Attendee Information"}
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  {t("ui.checkout_template.behavior_driven.registration_form.fields.attendee_name.help") || "This name will appear on the ticket"}
                </p>

                {/* First Name and Last Name side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t("ui.checkout_template.behavior_driven.registration_form.fields.first_name.label") || "First Name"}
                      <span className="text-red-600 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={(responses[ticketNum]?.firstName as string) || ""}
                      onChange={(e) => updateResponse(ticketNum, "firstName", e.target.value)}
                      placeholder={t("ui.checkout_template.behavior_driven.registration_form.fields.first_name.placeholder") || "First name"}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t("ui.checkout_template.behavior_driven.registration_form.fields.last_name.label") || "Last Name"}
                      <span className="text-red-600 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={(responses[ticketNum]?.lastName as string) || ""}
                      onChange={(e) => updateResponse(ticketNum, "lastName", e.target.value)}
                      placeholder={t("ui.checkout_template.behavior_driven.registration_form.fields.last_name.placeholder") || "Last name"}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-purple-500 focus:outline-none text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Custom form fields (if configured) - uses per-ticket form schema */}
              {(() => {
                const ticketFormSchema = getFormSchemaForTicket(ticketNum);
                if (!hasCustomForm || !ticketFormSchema) return null;

                return (
                  <>
                    {/* Render sections if form has sections */}
                    {ticketFormSchema.sections && visibleSections.length > 0 ? (
                      visibleSections.map((section) => (
                        <div key={section.id} className="mb-6">
                          {/* Section Header */}
                          {section.title && (
                            <div className="mb-4">
                              <h4 className="text-lg font-bold">{section.title}</h4>
                              {section.description && (
                                <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                              )}
                            </div>
                          )}

                          {/* Section Fields */}
                          {section.fields.map((field) => renderField(field, ticketNum))}
                        </div>
                      ))
                    ) : (
                      // Legacy: Flat fields array (no sections)
                      ticketFormSchema.fields?.map((field) => renderField(field, ticketNum))
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-lg font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              {t("ui.checkout_template.behavior_driven.registration_form.buttons.back")}
            </button>
          )}

          <button
            type="submit"
            className="flex-1 px-6 py-3 text-lg font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 rounded transition-colors"
          >
            {t("ui.checkout_template.behavior_driven.buttons.next")}
          </button>
        </div>
      </form>
    </div>
  );
}
