"use client";

/**
 * PUBLIC FORM CLIENT COMPONENT
 *
 * Renders forms publicly - supports both template-based and schema-only forms.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, AlertCircle, CheckCircle, Home, Send } from "lucide-react";
import { getFormTemplate } from "@/templates/forms/registry";
import { getThemeByCode } from "@/templates/themes";
import Link from "next/link";
import type { FormSchema, FormField } from "@/templates/forms/types";

type PublicFormClientProps = {
  formId: string;
};

export function PublicFormClient({ formId }: PublicFormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Fetch form data
  const form = useQuery(api.formsOntology.getPublicForm, {
    formId: formId as Id<"objects">,
  });

  // Submit mutation
  const submitResponse = useMutation(api.formsOntology.submitPublicForm);

  // Loading state
  if (form === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-4">
            The form you&apos;re looking for doesn&apos;t exist or has been unpublished.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home size={16} />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    const customProps = form.customProperties as Record<string, unknown> | undefined;
    const formSchema = customProps?.formSchema as FormSchema | undefined;
    const successMessage = formSchema?.settings?.successMessage || "Thank you! Your form has been submitted successfully.";
    const redirectUrl = formSchema?.settings?.redirectUrl;

    if (redirectUrl) {
      window.location.href = redirectUrl;
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
          <p className="text-gray-600 mb-4">{successMessage}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Home size={16} />
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Get form schema and template info
  const customProps = form.customProperties as Record<string, unknown> | undefined;
  const formSchema = customProps?.formSchema as FormSchema | undefined;
  const templateCode = customProps?.templateCode as string | undefined;
  const themeCode = customProps?.themeCode as string | undefined;

  // Check if we have a registered template
  const FormComponent = templateCode ? getFormTemplate(templateCode) : null;
  const theme = themeCode ? getThemeByCode(themeCode) : null;

  // Handle form submission
  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitResponse({
        formId: formId as Id<"objects">,
        responses: data,
        metadata: {
          submittedAt: Date.now(),
          userAgent: typeof window !== "undefined" ? navigator.userAgent : "unknown",
        },
      });
      setSubmitSuccess(true);
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we have a template component and theme, use it
  if (FormComponent && theme) {
    return (
      <FormComponent
        formId={formId as Id<"objects">}
        organizationId={form.organizationId}
        theme={theme}
        customSchema={formSchema}
        onSubmit={handleSubmit}
        initialData={{}}
        mode="standalone"
      />
    );
  }

  // Otherwise, render generic form from schema
  if (formSchema?.sections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Form Header */}
          <div className="bg-white rounded-t-lg shadow-lg p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
            {form.description && (
              <p className="text-gray-600 mt-2">{form.description}</p>
            )}
          </div>

          {/* Form Body */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(formData);
            }}
            className="bg-white shadow-lg rounded-b-lg"
          >
            {formSchema.sections.map((section, sectionIdx) => (
              <div
                key={section.id || sectionIdx}
                className="p-6 border-b last:border-b-0"
              >
                {section.title && (
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {section.title}
                  </h2>
                )}
                {section.description && (
                  <p className="text-gray-600 mb-4 text-sm">{section.description}</p>
                )}

                <div className="space-y-4">
                  {section.fields?.map((field) => (
                    <GenericFieldRenderer
                      key={field.id}
                      field={field}
                      value={formData[field.id]}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, [field.id]: value }))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <div className="p-6 bg-gray-50 rounded-b-lg">
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {submitError}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    {formSchema.settings?.submitButtonText || "Submit"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Fallback - no schema
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertCircle size={64} className="text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Configured</h1>
        <p className="text-gray-600 mb-4">
          This form hasn&apos;t been configured with any fields yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Home size={16} />
          Return Home
        </Link>
      </div>
    </div>
  );
}

/**
 * Generic Field Renderer
 *
 * Renders form fields based on their type - supports basic field types.
 */
function GenericFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const baseInputClasses =
    "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";

  // Text block / description - just render content
  if (field.type === "text_block" || field.type === "description") {
    return (
      <div
        className={`prose prose-sm max-w-none ${
          field.formatting?.style === "info"
            ? "bg-blue-50 border-blue-200 p-4 rounded-lg"
            : field.formatting?.style === "warning"
            ? "bg-yellow-50 border-yellow-200 p-4 rounded-lg"
            : field.formatting?.style === "success"
            ? "bg-green-50 border-green-200 p-4 rounded-lg"
            : field.formatting?.style === "error"
            ? "bg-red-50 border-red-200 p-4 rounded-lg"
            : ""
        }`}
        style={{ textAlign: field.formatting?.alignment || "left" }}
        dangerouslySetInnerHTML={{ __html: field.content || "" }}
      />
    );
  }

  // Section header - just render title
  if (field.type === "section_header") {
    return (
      <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
        {field.label}
      </h3>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === "text" && (
        <input
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseInputClasses}
        />
      )}

      {field.type === "email" && (
        <input
          type="email"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseInputClasses}
        />
      )}

      {field.type === "phone" && (
        <input
          type="tel"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseInputClasses}
        />
      )}

      {field.type === "number" && (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.valueAsNumber || "")}
          placeholder={field.placeholder}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          className={baseInputClasses}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className={baseInputClasses}
        />
      )}

      {field.type === "date" && (
        <input
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInputClasses}
        />
      )}

      {field.type === "time" && (
        <input
          type="time"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInputClasses}
        />
      )}

      {field.type === "datetime" && (
        <input
          type="datetime-local"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInputClasses}
        />
      )}

      {field.type === "select" && (
        <select
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseInputClasses}
        >
          <option value="">{field.placeholder || "Select an option..."}</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "radio" && (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                required={field.required}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "checkbox" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-gray-700">{field.placeholder || field.label}</span>
        </label>
      )}

      {field.type === "multi_select" && (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(option.value)}
                onChange={(e) => {
                  const currentValues = Array.isArray(value) ? value : [];
                  if (e.target.checked) {
                    onChange([...currentValues, option.value]);
                  } else {
                    onChange(currentValues.filter((v) => v !== option.value));
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "rating" && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={`w-10 h-10 rounded-full border-2 font-semibold transition-colors ${
                value === rating
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-600 hover:border-blue-400"
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
      )}

      {field.helpText && (
        <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
