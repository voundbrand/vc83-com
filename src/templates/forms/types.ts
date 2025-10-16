/**
 * FORM FIELD TYPES
 *
 * Supported field types for form templates.
 */

import React from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Theme } from "../types";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "radio"
  | "checkbox"
  | "multi_select"
  | "file"
  | "rating"
  | "section_header";

/**
 * Conditional Logic Operator
 */
export type ConditionalOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "greaterThan"
  | "lessThan"
  | "contains"
  | "isEmpty"
  | "isNotEmpty";

/**
 * Conditional Logic Rule
 *
 * Defines when a field or section should be visible.
 */
export interface ConditionalRule {
  fieldId: string; // Field to check
  operator: ConditionalOperator;
  value: string | number | string[] | number[];
}

/**
 * Form Field Definition
 */
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>; // For select/radio/checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  };
  conditional?: {
    show: "all" | "any"; // AND or OR logic
    rules: ConditionalRule[];
  };
  metadata?: Record<string, unknown>;
}

/**
 * Form Section
 *
 * Groups related fields together with conditional display logic.
 */
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  conditional?: {
    show: "all" | "any";
    rules: ConditionalRule[];
  };
  metadata?: Record<string, unknown>;
}

/**
 * Form Schema
 *
 * Complete structure of a form template.
 */
export interface FormSchema {
  version: string;
  sections: FormSection[];
  settings: {
    allowMultipleSubmissions: boolean;
    showProgressBar: boolean;
    submitButtonText: string;
    successMessage: string;
    redirectUrl?: string;
    requireAuth: boolean;
    saveProgress: boolean;
  };
  styling?: {
    layout: "single-column" | "two-column" | "wizard";
    sectionBorders: boolean;
    compactMode: boolean;
  };
}

/**
 * Form Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // fieldId -> error message
}

/**
 * Form Pricing Calculation
 *
 * For forms that calculate prices based on selections.
 */
export interface PricingCalculation {
  basePrice: number;
  addOns: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discounts: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  taxes: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  total: number;
  currency: string;
}

/**
 * Form Template Component Props
 *
 * Props passed to form template components when rendered.
 */
export interface FormTemplateProps {
  formId: Id<"objects">; // The form instance
  organizationId: Id<"organizations">; // The organization context
  theme: Theme; // Full theme object
  onSubmit: (data: FormSubmissionData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<FormSubmissionData>;
  mode?: "standalone" | "checkout" | "embedded";
}

/**
 * Form Submission Data
 *
 * Generic structure for form submission results.
 */
export interface FormSubmissionData {
  [key: string]: unknown;
  firstName?: string;
  lastName?: string;
  email?: string;
  submittedAt?: number;
}

/**
 * Form Template Component Type
 * Can have an optional schema property attached for form builder
 */
export type FormTemplateComponent = React.ComponentType<FormTemplateProps> & {
  schema?: FormSchema;
};
