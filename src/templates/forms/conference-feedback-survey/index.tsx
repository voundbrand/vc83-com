/**
 * CONFERENCE FEEDBACK SURVEY FORM COMPONENT
 *
 * Post-event feedback survey for HaffNet conferences.
 * Dynamically renders based on schema with rating scales, matrix questions, and text feedback.
 */

import React from "react";
import type { FormTemplateComponent } from "../types";
import { conferenceFeedbackSurveySchema } from "./schema";

export const ConferenceFeedbackSurveyForm: FormTemplateComponent = ({
  theme,
  onSubmit,
  initialData = {},
}) => {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(
    initialData
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  return (
    <div
      className="min-h-screen p-8"
      style={{
        background: theme?.colors?.background || "#f9fafb",
        fontFamily: theme?.typography?.fontFamily?.body || "system-ui, sans-serif",
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div
          className="mb-8 text-center"
          style={{
            color: theme?.colors?.text || "#111827",
          }}
        >
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: theme?.typography?.fontFamily?.heading || "system-ui, sans-serif",
            }}
          >
            Feedback-Umfrage
          </h1>
          <p className="text-gray-600">
            Ihre Meinung ist uns wichtig! Bitte nehmen Sie sich einen Moment Zeit.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {conferenceFeedbackSurveySchema.sections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-lg shadow-md p-6"
              style={{
                borderColor: theme?.colors?.border || "#e5e7eb",
              }}
            >
              <h2
                className="text-xl font-bold mb-4"
                style={{
                  color: theme?.colors?.text || "#111827",
                  fontFamily: theme?.typography?.fontFamily?.heading || "system-ui, sans-serif",
                }}
              >
                {section.title}
              </h2>
              {section.description && (
                <p className="text-sm text-gray-600 mb-4">
                  {section.description}
                </p>
              )}

              <div className="space-y-4">
                {section.fields.map((field) => {
                  const value = formData[field.id];

                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && " *"}
                      </label>
                      {field.helpText && (
                        <p className="text-xs text-gray-500 mb-2">
                          {field.helpText}
                        </p>
                      )}

                      {/* Render field based on type */}
                      {field.type === "rating" &&
                        field.metadata?.type === "nps" && (
                          // NPS Rating (0-10)
                          <div className="grid grid-cols-11 gap-2">
                            {Array.from({ length: 11 }, (_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleFieldChange(field.id, i)}
                                className="h-12 rounded-lg font-semibold text-sm transition-all"
                                style={{
                                  background:
                                    value === i
                                      ? theme?.colors?.primary || "#10b981"
                                      : "#f3f4f6",
                                  color: value === i ? "white" : "#374151",
                                }}
                              >
                                {i}
                              </button>
                            ))}
                          </div>
                        )}

                      {field.type === "rating" &&
                        field.metadata?.type !== "nps" && (
                          // 5-Point Rating
                          <div className="flex items-center gap-2">
                            {Array.from(
                              {
                                length:
                                  (field.validation?.max as number) || 5,
                              },
                              (_, i) => i + 1
                            ).map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() =>
                                  handleFieldChange(field.id, rating)
                                }
                                className="w-12 h-12 rounded-full font-semibold text-sm transition-all"
                                style={{
                                  background:
                                    value === rating
                                      ? theme?.colors?.primary || "#10b981"
                                      : "#f3f4f6",
                                  color: value === rating ? "white" : "#374151",
                                }}
                              >
                                {rating}
                              </button>
                            ))}
                            {field.metadata?.ratingLabels && value !== undefined ? (
                              <span className="text-xs text-gray-500 ml-2">
                                {String(
                                  (field.metadata.ratingLabels as Record<number, string>)[
                                    value as number
                                  ] || ''
                                )}
                              </span>
                            ) : null}
                          </div>
                        )}

                      {field.type === "textarea" && (
                        <textarea
                          value={(value as string) || ""}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-offset-2"
                          style={{
                            borderColor: theme?.colors?.border || "#e5e7eb",
                          }}
                        />
                      )}

                      {field.type === "text" && (
                        <input
                          type="text"
                          value={(value as string) || ""}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-offset-2"
                          style={{
                            borderColor: theme?.colors?.border || "#e5e7eb",
                          }}
                        />
                      )}

                      {field.type === "email" && (
                        <input
                          type="email"
                          value={(value as string) || ""}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          placeholder={field.placeholder}
                          required={field.required}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-offset-2"
                          style={{
                            borderColor: theme?.colors?.border || "#e5e7eb",
                          }}
                        />
                      )}

                      {field.type === "radio" && field.options && (
                        <div className="space-y-2">
                          {field.options.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center cursor-pointer p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="radio"
                                name={field.id}
                                value={option.value}
                                checked={value === option.value}
                                onChange={(e) =>
                                  handleFieldChange(field.id, e.target.value)
                                }
                                required={field.required}
                                className="mr-3 w-5 h-5"
                                style={{
                                  accentColor: theme?.colors?.primary || "#10b981",
                                }}
                              />
                              <span className="text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "checkbox" && field.options && (
                        <div className="space-y-2">
                          {field.options.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center cursor-pointer p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={(value as string[])?.includes(
                                  option.value
                                )}
                                onChange={(e) => {
                                  const arr = (value as string[]) || [];
                                  const newValue = e.target.checked
                                    ? [...arr, option.value]
                                    : arr.filter((v) => v !== option.value);
                                  handleFieldChange(field.id, newValue);
                                }}
                                className="mr-3 w-5 h-5"
                                style={{
                                  accentColor: theme?.colors?.primary || "#10b981",
                                }}
                              />
                              <span className="text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: theme?.colors?.primary || "#10b981",
              }}
            >
              Feedback absenden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Attach schema to component for preview
ConferenceFeedbackSurveyForm.schema = conferenceFeedbackSurveySchema;
