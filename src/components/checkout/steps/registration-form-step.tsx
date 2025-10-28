"use client";

/**
 * STEP 2.5: REGISTRATION FORM (CONDITIONAL) - MULTI-TICKET SUPPORT
 *
 * Renders if any selected product has:
 * - product.customProperties.formId
 * - product.customProperties.formTiming === "duringCheckout"
 *
 * MULTI-TICKET FLOW (Option 1):
 * - If user buys 3 tickets, shows "Ticket 1 of 3", "Ticket 2 of 3", etc.
 * - Each ticket gets its own form submission
 * - "Copy from previous ticket" button for convenience
 * - Progress indicator shows current ticket
 *
 * This step:
 * - Calculates total tickets needed
 * - Fetches form schema from formsOntology
 * - Renders dynamic form fields for each ticket
 * - Validates responses per ticket
 * - Calculates dynamic pricing (if form adds costs)
 * - Stores array of form responses (one per ticket)
 */

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CheckoutProduct } from "@/templates/checkout/types";
import { ArrowLeft, FileText, Loader2, Copy } from "lucide-react";
import { calculateAddonsFromResponses, calculateTotalAddonCost, type ProductAddon } from "@/types/product-addons";
import styles from "../styles/multi-step.module.css";

interface FormResponse {
  productId: Id<"objects">;
  ticketNumber: number;
  formId: string;
  responses: Record<string, unknown>;
  addedCosts: number;
  submittedAt: number;
}

interface RegistrationFormStepProps {
  selectedProducts: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;
  linkedProducts: CheckoutProduct[];
  initialData?: FormResponse[];
  onComplete: (data: FormResponse[]) => void;
  onBack: () => void;
}

export function RegistrationFormStep({
  selectedProducts,
  linkedProducts,
  initialData,
  onComplete,
  onBack,
}: RegistrationFormStepProps) {
  // Calculate total tickets needed across all products
  const totalTickets = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);

  // Find products that need forms
  const productsWithForms = selectedProducts.filter((sp) => {
    const product = linkedProducts.find((p) => p._id === sp.productId);
    return (
      product?.customProperties?.formId &&
      product?.customProperties?.formTiming === "duringCheckout"
    );
  });

  // Get the form ID from the first product with a form
  const firstProductWithForm = productsWithForms[0];
  const productWithFormData = firstProductWithForm
    ? linkedProducts.find((p) => p._id === firstProductWithForm.productId)
    : undefined;

  const formId = productWithFormData?.customProperties?.formId as string | undefined;

  // DEBUG: Log product and form linking
  console.log("🔍 [RegistrationFormStep] Product linking:", {
    totalProducts: selectedProducts.length,
    productsWithForms: productsWithForms.length,
    firstProductWithForm: firstProductWithForm?.productId,
    productWithFormData: productWithFormData?.name,
    formId,
    formIdLength: formId?.length,
    formIdIsValid: formId && formId.length > 20, // Convex IDs are longer
    formTiming: productWithFormData?.customProperties?.formTiming,
    allCustomProps: productWithFormData?.customProperties,
  });

  // Validate formId before querying (Convex IDs are at least 28 characters)
  const isValidFormId = formId && formId.length >= 28;

  // Fetch form schema using public query (no auth required)
  const formSchema = useQuery(
    api.formsOntology.getPublicForm,
    isValidFormId
      ? {
          formId: formId as Id<"objects">,
        }
      : "skip"
  );

  // DEBUG: Log form data to help troubleshoot
  const formSchemaData = formSchema?.customProperties?.formSchema as {
    sections?: Array<{ fields: unknown[] }>;
    fields?: unknown[];
  } | undefined;

  console.log("🔍 [RegistrationFormStep] DEBUG:", {
    formId,
    formSchemaLoaded: !!formSchema,
    formSchemaStatus: formSchema === undefined ? "loading" : formSchema === null ? "not found" : "loaded",
    hasSections: !!formSchemaData?.sections,
    sectionsCount: formSchemaData?.sections?.length || 0,
    hasFields: !!formSchemaData?.fields,
    fieldCount: formSchemaData?.fields?.length || 0,
    formName: formSchema?.name,
    fullSchema: formSchemaData,
  });

  // Multi-ticket state
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const [completedForms, setCompletedForms] = useState<FormResponse[]>(() => {
    // IMPORTANT: When initialData exists but currentTicketIndex would be beyond it,
    // we need to only include forms up to where we currently are.
    // This prevents duplication when navigating back and then forward again.
    return initialData || [];
  });
  const [currentResponses, setCurrentResponses] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form state when component mounts or when initialData changes
  // This ensures we start fresh if the user navigates back from payment step
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      // User navigated back with existing data - restore state
      setCompletedForms(initialData);
      // Set current ticket to the last completed form
      setCurrentTicketIndex(Math.min(initialData.length, totalTickets - 1));
      console.log(`🔄 [RegistrationForm] Restored ${initialData.length} existing forms, current ticket: ${initialData.length + 1}/${totalTickets}`);
    } else {
      // Fresh start
      setCompletedForms([]);
      setCurrentTicketIndex(0);
      setCurrentResponses({});
    }
  }, [initialData, totalTickets]);

  // Get current product info
  const getCurrentTicketInfo = () => {
    let ticketCount = 0;
    for (const sp of selectedProducts) {
      const product = linkedProducts.find((p) => p._id === sp.productId);
      if (!product?.customProperties?.formId) continue;

      for (let i = 0; i < sp.quantity; i++) {
        if (ticketCount === currentTicketIndex) {
          return {
            productId: sp.productId,
            productName: product.name,
            ticketNumber: ticketCount + 1,
            totalTickets,
          };
        }
        ticketCount++;
      }
    }
    return null;
  };

  const currentTicketInfo = getCurrentTicketInfo();

  /**
   * Calculate added costs from form responses using product addon configuration
   * This replaces hardcoded logic with flexible product-level addon system
   */
  const calculateAddedCosts = (_responses: Record<string, unknown>): number => {
    if (!currentTicketInfo) return 0;

    // Get product for this ticket
    const product = linkedProducts.find((p) => p._id === currentTicketInfo.productId);
    if (!product) return 0;

    // Get addon configuration from product
    const productAddons = (product.customProperties as { addons?: ProductAddon[] } | undefined)?.addons;
    if (!productAddons || productAddons.length === 0) return 0;

    // Calculate addons based on form responses
    const calculatedAddons = calculateAddonsFromResponses(productAddons, _responses);
    const totalCost = calculateTotalAddonCost(calculatedAddons);

    // Debug log
    console.log("🔧 [RegistrationForm] Calculated addons:", {
      productId: product._id,
      productName: product.name,
      addonConfigCount: productAddons.length,
      calculatedAddons,
      totalCost,
    });

    return totalCost;
  };

  /**
   * Validate current form responses
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all fields in visible sections
    visibleSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required && !currentResponses[field.id]) {
          newErrors[field.id] = `${field.label} is required`;
        }
      });
    });

    // Also validate flat fields if no sections
    if (visibleSections.length === 0 && formSchemaObj?.fields) {
      formSchemaObj.fields.forEach((field) => {
        if (field.required && !currentResponses[field.id]) {
          newErrors[field.id] = `${field.label} is required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle "Copy from previous ticket" button
   */
  const handleCopyFromPrevious = () => {
    if (completedForms.length > 0) {
      const previousForm = completedForms[completedForms.length - 1];
      setCurrentResponses({ ...previousForm.responses });
      setErrors({});
    }
  };

  /**
   * Handle form submission for current ticket
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    if (!currentTicketInfo) return;

    // Create form response for this ticket
    const formResponse: FormResponse = {
      productId: currentTicketInfo.productId,
      ticketNumber: currentTicketInfo.ticketNumber,
      formId: formId!,
      responses: { ...currentResponses },
      addedCosts: calculateAddedCosts(currentResponses),
      submittedAt: Date.now(),
    };

    // IMPORTANT: Check if we're replacing an existing form response for this ticket
    // This prevents duplication when user goes back and then forward again
    const existingIndex = completedForms.findIndex(
      (form) => form.ticketNumber === currentTicketInfo.ticketNumber
    );

    let updatedForms: FormResponse[];
    if (existingIndex >= 0) {
      // Replace existing form for this ticket
      updatedForms = [...completedForms];
      updatedForms[existingIndex] = formResponse;
      console.log(`🔄 [RegistrationForm] Replaced form for ticket ${currentTicketInfo.ticketNumber}`);
    } else {
      // Add new form response
      updatedForms = [...completedForms, formResponse];
      console.log(`➕ [RegistrationForm] Added new form for ticket ${currentTicketInfo.ticketNumber}`);
    }

    setCompletedForms(updatedForms);

    // Check if we have more tickets to fill out
    if (currentTicketIndex < totalTickets - 1) {
      // Move to next ticket
      setCurrentTicketIndex(currentTicketIndex + 1);
      setCurrentResponses({}); // Clear form for next ticket
      setErrors({});
    } else {
      // All tickets done, complete step
      onComplete(updatedForms);
    }
  };

  if (!formId) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>No form ID found. Skipping registration form.</p>
        <button
          onClick={() => onComplete([])}
          className={styles.primaryButton}
        >
          Continue
        </button>
      </div>
    );
  }

  if (!isValidFormId) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>
          Invalid form configuration. The product has an invalid formId: &quot;{formId}&quot;
        </p>
        <p className={styles.errorMessage} style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Please edit the product and select a valid form from the dropdown, then save.
        </p>
        <button
          onClick={onBack}
          className={styles.secondaryButton}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (formSchema === undefined) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.spinner} />
      </div>
    );
  }

  if (!formSchema) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>Form not found.</p>
        <button onClick={onBack} className={styles.secondaryButton}>
          Go Back
        </button>
      </div>
    );
  }

  // Extract form schema with proper typing
  const formSchemaObj = formSchema.customProperties?.formSchema as {
    sections?: Array<{
      id: string;
      title?: string;
      description?: string;
      fields: Array<{
        id: string;
        label: string;
        type: string;
        required?: boolean;
        placeholder?: string;
        helpText?: string;
        options?: Array<{ value: string; label: string }>;
      }>;
      conditional?: {
        show: "all" | "any";
        rules: Array<{
          fieldId: string;
          operator: string;
          value: string | number | string[] | number[];
        }>;
      };
    }>;
    fields?: Array<{
      id: string;
      label: string;
      type: string;
      required?: boolean;
      placeholder?: string;
      helpText?: string;
      options?: Array<{ value: string; label: string }>;
    }>;
  } | undefined;

  /**
   * Evaluate conditional rules to determine if a section should be shown
   */
  const evaluateConditional = (
    conditional: {
      show: "all" | "any";
      rules: Array<{
        fieldId: string;
        operator: string;
        value: string | number | string[] | number[];
      }>;
    } | undefined
  ): boolean => {
    if (!conditional) return true; // No conditional = always show

    const { show, rules } = conditional;

    const evaluateRule = (rule: {
      fieldId: string;
      operator: string;
      value: string | number | string[] | number[];
    }): boolean => {
      const fieldValue = currentResponses[rule.fieldId];

      switch (rule.operator) {
        case "equals":
          return fieldValue === rule.value;
        case "notEquals":
          return fieldValue !== rule.value;
        case "in":
          return Array.isArray(rule.value) && (rule.value as (string | number)[]).includes(fieldValue as string | number);
        case "notIn":
          return Array.isArray(rule.value) && !(rule.value as (string | number)[]).includes(fieldValue as string | number);
        case "greaterThan":
          return typeof fieldValue === "number" && typeof rule.value === "number" && fieldValue > rule.value;
        case "lessThan":
          return typeof fieldValue === "number" && typeof rule.value === "number" && fieldValue < rule.value;
        case "contains":
          return typeof fieldValue === "string" && typeof rule.value === "string" && fieldValue.includes(rule.value);
        case "isEmpty":
          return !fieldValue || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case "isNotEmpty":
          return !!fieldValue && fieldValue !== "" && (!Array.isArray(fieldValue) || fieldValue.length > 0);
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
   * Get visible sections based on conditional logic
   */
  const getVisibleSections = () => {
    if (!formSchemaObj?.sections) return [];

    return formSchemaObj.sections.filter((section) => evaluateConditional(section.conditional));
  };

  const visibleSections = getVisibleSections();

  // DEBUG: Log sections
  console.log("🔍 [RegistrationFormStep] Sections:", {
    totalSections: formSchemaObj?.sections?.length || 0,
    visibleSections: visibleSections.length,
    sectionTitles: visibleSections.map((s) => s.title),
    currentResponses: Object.keys(currentResponses).length,
  });

  return (
    <div className={styles.stepContainer}>
      {/* Header with Progress */}
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          <FileText size={24} />
          Registration - Ticket {currentTicketInfo?.ticketNumber} of {totalTickets}
        </h2>
        <p className={styles.stepSubtitle}>
          {currentTicketInfo?.productName}
        </p>

        {/* Progress Bar */}
        <div className={styles.ticketProgressBar}>
          {Array.from({ length: totalTickets }).map((_, i) => (
            <div
              key={i}
              className={`${styles.ticketProgressDot} ${
                i < currentTicketIndex
                  ? styles.ticketProgressCompleted
                  : i === currentTicketIndex
                    ? styles.ticketProgressActive
                    : styles.ticketProgressUpcoming
              }`}
            >
              {i < currentTicketIndex ? "✓" : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Copy from Previous Button */}
      {completedForms.length > 0 && (
        <button
          type="button"
          onClick={handleCopyFromPrevious}
          className={styles.copyButton}
        >
          <Copy size={16} />
          Copy from Previous Ticket
        </button>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {visibleSections.length > 0 ? (
          // Render sections with headers
          visibleSections.map((section) => (
            <div key={section.id} className={styles.formSection}>
              {/* Section Header */}
              {section.title && (
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                  {section.description && (
                    <p className={styles.sectionDescription}>{section.description}</p>
                  )}
                </div>
              )}

              {/* Section Fields */}
              {section.fields.map((field) => (
                <div key={field.id} className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    {field.label}
                    {field.required && <span className={styles.required}>*</span>}
                  </label>

                  {/* Help Text */}
                  {field.helpText && (
                    <p className={styles.helpText}>{field.helpText}</p>
                  )}

                  {/* Text Input */}
                  {field.type === "text" && (
                    <input
                      type="text"
                      value={(currentResponses[field.id] as string) || ""}
                      onChange={(e) => {
                        setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                        if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                      }}
                      placeholder={field.placeholder}
                      className={`${styles.input} ${errors[field.id] ? styles.inputError : ""}`}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === "textarea" && (
                    <textarea
                      value={(currentResponses[field.id] as string) || ""}
                      onChange={(e) => {
                        setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                        if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                      }}
                      placeholder={field.placeholder}
                      className={`${styles.textarea} ${errors[field.id] ? styles.inputError : ""}`}
                      rows={4}
                    />
                  )}

                  {/* Email Input */}
                  {field.type === "email" && (
                    <input
                      type="email"
                      value={(currentResponses[field.id] as string) || ""}
                      onChange={(e) => {
                        setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                        if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                      }}
                      placeholder={field.placeholder}
                      className={`${styles.input} ${errors[field.id] ? styles.inputError : ""}`}
                    />
                  )}

                  {/* Phone Input */}
                  {field.type === "phone" && (
                    <input
                      type="tel"
                      value={(currentResponses[field.id] as string) || ""}
                      onChange={(e) => {
                        setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                        if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                      }}
                      placeholder={field.placeholder}
                      className={`${styles.input} ${errors[field.id] ? styles.inputError : ""}`}
                    />
                  )}

                  {/* Time Input */}
                  {field.type === "time" && (
                    <input
                      type="time"
                      value={(currentResponses[field.id] as string) || ""}
                      onChange={(e) => {
                        setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                        if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                      }}
                      className={`${styles.input} ${errors[field.id] ? styles.inputError : ""}`}
                    />
                  )}

                  {/* Select Dropdown */}
                  {field.type === "select" && field.options && (
                    <select
                      value={(currentResponses[field.id] as string) || ""}
                      onChange={(e) => {
                        setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                        if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                      }}
                      className={`${styles.select} ${errors[field.id] ? styles.inputError : ""}`}
                    >
                      <option value="">Bitte wählen</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Radio Buttons */}
                  {field.type === "radio" && field.options && (
                    <div className={styles.radioGroup}>
                      {field.options.map((option) => (
                        <label key={option.value} className={styles.radioLabel}>
                          <input
                            type="radio"
                            name={field.id}
                            value={option.value}
                            checked={currentResponses[field.id] === option.value}
                            onChange={(e) => {
                              setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                              if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                            }}
                            className={styles.radio}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox Group (Multiple Options) */}
                  {field.type === "checkbox" && field.options && (
                    <div className={styles.checkboxGroup}>
                      {field.options.map((option) => (
                        <label key={option.value} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={(currentResponses[field.id] as string[] || []).includes(option.value)}
                            onChange={(e) => {
                              const current = (currentResponses[field.id] as string[]) || [];
                              if (e.target.checked) {
                                setCurrentResponses({
                                  ...currentResponses,
                                  [field.id]: [...current, option.value]
                                });
                              } else {
                                setCurrentResponses({
                                  ...currentResponses,
                                  [field.id]: current.filter(v => v !== option.value)
                                });
                              }
                              if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                            }}
                            className={styles.checkbox}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Single Checkbox (No Options) */}
                  {field.type === "checkbox" && !field.options && (
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={(currentResponses[field.id] as boolean) || false}
                        onChange={(e) => {
                          setCurrentResponses({ ...currentResponses, [field.id]: e.target.checked });
                          if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                        }}
                        className={styles.checkbox}
                      />
                      <span>{field.placeholder}</span>
                    </label>
                  )}

                  {errors[field.id] && (
                    <p className={styles.errorMessage}>{errors[field.id]}</p>
                  )}
                </div>
              ))}
            </div>
          ))
        ) : formSchemaObj?.fields ? (
          // Legacy: Flat fields array (no sections)
          formSchemaObj.fields.map((field) => (
            <div key={field.id} className={styles.formField}>
              <label className={styles.fieldLabel}>
                {field.label}
                {field.required && <span className={styles.required}>*</span>}
              </label>

              {/* Text Input */}
              {field.type === "text" && (
                <input
                  type="text"
                  value={(currentResponses[field.id] as string) || ""}
                  onChange={(e) => {
                    setCurrentResponses({ ...currentResponses, [field.id]: e.target.value });
                    if (errors[field.id]) setErrors({ ...errors, [field.id]: "" });
                  }}
                  placeholder={field.placeholder}
                  className={`${styles.input} ${errors[field.id] ? styles.inputError : ""}`}
                />
              )}

              {/* Add other field types for legacy support... */}
              {errors[field.id] && (
                <p className={styles.errorMessage}>{errors[field.id]}</p>
              )}
            </div>
          ))
        ) : null}

        {/* Actions */}
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={onBack}
            className={styles.secondaryButton}
            disabled={currentTicketIndex > 0}
          >
            <ArrowLeft size={16} />
            {currentTicketIndex === 0 ? "Back" : "Previous Ticket"}
          </button>

          <button
            type="submit"
            className={styles.primaryButton}
          >
            {currentTicketIndex < totalTickets - 1
              ? `Next Ticket (${currentTicketIndex + 2}/${totalTickets}) →`
              : "Continue to Payment →"}
          </button>
        </div>
      </form>
    </div>
  );
}
