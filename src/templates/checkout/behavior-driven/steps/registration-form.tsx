"use client";

/**
 * STEP 2: REGISTRATION FORM
 *
 * Dynamic form based on product configuration.
 * Supports conditional logic, sections, and all field types.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { StepProps } from "../types";
import { FileText, ArrowLeft } from "lucide-react";
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
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.checkout_template.behavior_driven");
  const selectedProducts = checkoutData.selectedProducts || [];

  // ============================================================================
  // PRIORITY 1: Get form from workflow behaviors (new behavior-driven approach)
  // ============================================================================

  interface FormLinkingConfig {
    formId?: string;
    timing?: "duringCheckout" | "afterPurchase" | "standalone";
    triggerConditions?: {
      productSubtype?: string[];
      minQuantity?: number;
    };
  }

  const formBehaviors = workflowBehaviors?.filter(b =>
    b.type === "form_linking" &&
    (b.config as FormLinkingConfig).timing === "duringCheckout"
  ) || [];

  // Evaluate trigger conditions to find active form
  const activeFormBehavior = formBehaviors.find(behavior => {
    const config = behavior.config as FormLinkingConfig;

    // Check product subtype condition
    if (config.triggerConditions?.productSubtype) {
      const selectedSubtypes = selectedProducts.map(sp =>
        products.find(p => p._id === sp.productId)?.subtype
      ).filter((st): st is string => st !== undefined);
      const matches = selectedSubtypes.some(st =>
        config.triggerConditions?.productSubtype?.includes(st)
      );
      if (!matches) return false;
    }

    // Check min quantity condition
    if (config.triggerConditions?.minQuantity) {
      const totalQty = selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0);
      if (totalQty < config.triggerConditions.minQuantity) return false;
    }

    return true; // No conditions or all conditions met
  });

  // Get formId from workflow behavior
  let formId = activeFormBehavior?.config?.formId as string | undefined;

  // ============================================================================
  // PRIORITY 2: Fallback to product-level form (legacy support)
  // ============================================================================

  if (!formId) {
    const firstProduct = products.find((p) => p._id === selectedProducts[0]?.productId);
    formId = firstProduct?.customProperties?.formId as string | undefined;
  }

  // Fetch form definition (public query - no auth required)
  const form = useQuery(
    api.formsOntology.getPublicForm,
    formId ? { formId: formId as Id<"objects"> } : "skip"
  );

  // Track responses per ticket
  const [responses, setResponses] = useState<Record<number, Record<string, unknown>>>({});

  // Calculate how many tickets need forms
  const ticketsNeedingForms = useMemo(() => {
    return selectedProducts
      .filter((sp) => {
        const product = products.find((p) => p._id === sp.productId);
        return product?.customProperties?.formId;
      })
      .flatMap((sp) => Array.from({ length: sp.quantity }, (_, i) => i + 1));
  }, [selectedProducts, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all tickets have responses
    const allComplete = ticketsNeedingForms.every((ticketNum) => {
      const ticketResponses = responses[ticketNum];
      return ticketResponses && Object.keys(ticketResponses).length > 0;
    });

    if (!allComplete) {
      alert(t("ui.checkout_template.behavior_driven.registration_form.errors.complete_all"));
      return;
    }

    // Calculate add-on costs by executing behaviors for each form submission
    const formResponsesWithCosts = await Promise.all(
      ticketsNeedingForms.map(async (ticketNum) => {
        const ticketResponses = responses[ticketNum];

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
              productId: selectedProducts[0].productId,
              ticketNumber: ticketNum,
              formId: formId!,
              responses: ticketResponses,
              addedCosts: 0, // Will be calculated
              submittedAt: Date.now(),
            }],
          },
          workflowBehaviors
        );

        // Extract add-on costs from behavior results
        const addons = getAddonsFromResults(behaviorResult);
        const addedCosts = addons?.totalAddonCost || 0;

        console.log(`🎟️ [RegistrationForm] Ticket ${ticketNum} add-ons:`, { addons, addedCosts });

        return {
          productId: selectedProducts[0].productId,
          ticketNumber: ticketNum,
          formId: formId!,
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

  // Skip this step if no form is needed (use effect to avoid setState during render)
  useEffect(() => {
    if (!formId && !hasSkipped.current) {
      hasSkipped.current = true;
      onComplete({});
    }
  }, [formId, onComplete]);

  if (!formId) {
    return null;
  }

  if (!form) {
    return <div className="p-6">{t("ui.checkout_template.behavior_driven.registration_form.messages.loading")}</div>;
  }

  // Extract form schema with proper typing
  const formSchema = (form as { customProperties?: { formSchema?: FormSchema } })?.customProperties
    ?.formSchema;

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
   */
  const getVisibleSections = (ticketNum: number) => {
    if (!formSchema?.sections) return [];

    const ticketResponses = responses[ticketNum] || {};
    return formSchema.sections.filter((section) => evaluateConditional(section.conditional, ticketResponses));
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
            count: ticketsNeedingForms.length,
            label: ticketsNeedingForms.length === 1
              ? t("ui.checkout_template.behavior_driven.registration_form.labels.ticket_singular")
              : t("ui.checkout_template.behavior_driven.registration_form.labels.ticket_plural")
          })}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Form for each ticket */}
        {ticketsNeedingForms.map((ticketNum) => {
          const visibleSections = getVisibleSections(ticketNum);

          return (
            <div key={ticketNum} className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">{t("ui.checkout_template.behavior_driven.registration_form.labels.ticket_number", { number: ticketNum })}</h3>

              {/* Render sections if form has sections */}
              {formSchema?.sections && visibleSections.length > 0 ? (
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
                formSchema?.fields?.map((field) => renderField(field, ticketNum))
              )}
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
            {t("ui.checkout_template.behavior_driven.registration_form.buttons.continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
