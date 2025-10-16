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

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CheckoutProduct } from "@/templates/checkout/types";
import { ArrowLeft, FileText, Loader2, Copy } from "lucide-react";
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
  const [completedForms, setCompletedForms] = useState<FormResponse[]>(initialData || []);
  const [currentResponses, setCurrentResponses] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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
   * Calculate added costs from form responses
   * Example: Boat excursion adds €60, Workshop adds €50
   */
  const calculateAddedCosts = (_responses: Record<string, unknown>): number => {
    if (!formSchema?.customProperties?.formSchema?.fields) return 0;

    const total = 0;

    // TODO: Implement dynamic pricing logic based on field responses
    // Example: Check if response includes add-ons with prices
    // const fields = formSchema.customProperties.formSchema.fields as Array<any>;
    // fields.forEach(field => {
    //   if (field.addsPrice && _responses[field.key]) {
    //     total += field.addsPrice;
    //   }
    // });

    return total;
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

    const updatedForms = [...completedForms, formResponse];
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
                      <option value="">-- Select --</option>
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

                  {/* Checkbox */}
                  {field.type === "checkbox" && (
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
