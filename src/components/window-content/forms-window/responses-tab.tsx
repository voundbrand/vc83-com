"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { Loader2, Eye, Download, Search, FileText, X } from "lucide-react";

interface ResponsesTabProps {
  forms: Array<{
    _id: Id<"objects">;
    name: string;
    subtype?: string;
    customProperties?: {
      stats?: {
        submissions?: number;
      };
    };
  }>;
}

// Response object type from the forms ontology
interface FormResponse {
  _id: Id<"objects">;
  customProperties?: {
    responses?: Record<string, unknown>;
    submittedAt?: number;
    isPublicSubmission?: boolean;
    ipAddress?: string;
  };
}

export function ResponsesTab({ forms }: ResponsesTabProps) {
  const { sessionId } = useAuth();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.forms");
  const [selectedFormId, setSelectedFormId] = useState<Id<"objects"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingResponse, setViewingResponse] = useState<FormResponse | null>(null);

  // Get responses for selected form
  const responses = useQuery(
    api.formsOntology.getFormResponses,
    sessionId && selectedFormId
      ? { sessionId, formId: selectedFormId }
      : "skip"
  );

  if (translationsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  // If no form selected, show form selector
  if (!selectedFormId) {
    const formsWithResponses = forms.filter(
      (form) => (form.customProperties?.stats?.submissions ?? 0) > 0
    );

    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--window-document-text)" }}>
          {t("ui.forms.responses.select_form")}
        </h3>

        {formsWithResponses.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">
              <FileText size={36} style={{ color: "var(--neutral-gray)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.responses.no_responses")}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.forms.responses.no_responses_hint")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formsWithResponses.map((form) => {
              const submissionCount = form.customProperties?.stats?.submissions ?? 0;
              return (
                <button
                  key={form._id}
                  onClick={() => setSelectedFormId(form._id)}
                  className="p-4 border-2 text-left transition-colors"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--desktop-menu-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--window-document-bg-elevated)";
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                        {form.name}
                      </h4>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {form.subtype || "form"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: "var(--tone-accent)" }}>
                        {submissionCount}
                      </div>
                      <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {submissionCount === 1
                          ? t("ui.forms.responses.response_singular")
                          : t("ui.forms.responses.response_plural")}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (responses === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  // Filter responses by search query
  const filteredResponses = responses.filter((response) => {
    if (!searchQuery) return true;
    const responseData = JSON.stringify(response.customProperties?.responses || {}).toLowerCase();
    return responseData.includes(searchQuery.toLowerCase());
  });

  const selectedForm = forms.find((f) => f._id === selectedFormId);

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="p-4 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedFormId(null)}
            className="text-xs px-3 py-1 border-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
          >
            ← {t("ui.forms.responses.back_to_forms")}
          </button>
          <button
            className="text-xs px-3 py-1 border-2 flex items-center gap-2 opacity-50 cursor-not-allowed"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              color: "var(--window-document-text)",
            }}
            title={t("ui.forms.responses.export_csv_coming_soon")}
            disabled
          >
            <Download size={12} />
            {t("ui.forms.responses.export_csv")}
          </button>
        </div>

        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
          {selectedForm?.name}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {filteredResponses.length}{" "}
          {filteredResponses.length === 1
            ? t("ui.forms.responses.response_singular")
            : t("ui.forms.responses.response_plural")}
        </p>

        {/* Search */}
        <div
          className="mt-3 flex items-center gap-2 border-2 px-3 py-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <Search size={14} style={{ color: "var(--neutral-gray)" }} />
          <input
            type="text"
            placeholder={t("ui.forms.responses.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs outline-none"
            style={{ color: "var(--window-document-text)", background: "transparent" }}
          />
        </div>
      </div>

      {/* Response List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredResponses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              {searchQuery
                ? t("ui.forms.responses.no_matches")
                : t("ui.forms.responses.no_responses")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResponses.map((response) => {
              const responseData = (response.customProperties?.responses ?? {}) as Record<string, unknown>;
              const submittedAt = response.customProperties?.submittedAt as number;
              const isPublic = response.customProperties?.isPublicSubmission as boolean;

              // Try to get a name from the response data
              const name = String(responseData.firstName || responseData.first_name ||
                          responseData.contact_name || responseData.name ||
                          responseData.email || t("ui.forms.responses.anonymous"));

              return (
                <div
                  key={response._id}
                  className="p-3 border-2 transition-colors"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--desktop-menu-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--window-document-bg-elevated)";
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                          {name}
                        </h4>
                        {isPublic && (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              background: "var(--tone-accent)",
                              color: "var(--window-document-text)",
                            }}
                          >
                            {t("ui.forms.responses.public")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                        {submittedAt ? new Date(submittedAt).toLocaleString() : t("ui.forms.responses.unknown_time")}
                      </p>

                      {/* Show first few fields */}
                      <div className="text-xs space-y-1">
                        {Object.entries(responseData).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span style={{ color: "var(--neutral-gray)" }}>{key}:</span>
                            <span style={{ color: "var(--window-document-text)" }} className="font-semibold">
                              {String(value).substring(0, 50)}
                              {String(value).length > 50 ? "..." : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingResponse(response)}
                      className="ml-4 px-3 py-1 border-2 flex items-center gap-2 text-xs"
                      style={{
                        borderColor: "var(--window-document-border)",
                        background: "var(--window-document-bg-elevated)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      <Eye size={12} />
                      {t("ui.forms.responses.view")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Response Detail Modal */}
      {viewingResponse && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setViewingResponse(null)}
        >
          <div
            className="border-4 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg-elevated)",
              boxShadow: "var(--window-shell-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-4 py-2 flex items-center justify-between border-b-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--tone-accent)",
              }}
            >
              <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                {t("ui.forms.responses.response_details")}
              </h3>
              <button
                onClick={() => setViewingResponse(null)}
                className="text-sm font-bold px-2 hover:bg-black/20"
                style={{ color: "var(--window-document-text)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Metadata */}
              <div
                className="p-3 border-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                }}
              >
                <h4 className="text-xs font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.forms.responses.submission_info")}
                </h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.forms.responses.submitted")}:
                    </span>
                    <span style={{ color: "var(--window-document-text)" }}>
                      {new Date(viewingResponse.customProperties?.submittedAt || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.forms.responses.type")}:
                    </span>
                    <span style={{ color: "var(--window-document-text)" }}>
                      {viewingResponse.customProperties?.isPublicSubmission
                        ? t("ui.forms.responses.public_submission")
                        : t("ui.forms.responses.authenticated")}
                    </span>
                  </div>
                  {viewingResponse.customProperties?.ipAddress && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.forms.responses.ip_address")}:
                      </span>
                      <span style={{ color: "var(--window-document-text)" }}>
                        {viewingResponse.customProperties.ipAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Data */}
              <div
                className="p-3 border-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                }}
              >
                <h4 className="text-xs font-bold mb-3" style={{ color: "var(--window-document-text)" }}>
                  {t("ui.forms.responses.form_data")}
                </h4>
                <div className="text-xs space-y-3">
                  {Object.entries((viewingResponse.customProperties?.responses ?? {}) as Record<string, unknown>).map(
                    ([key, value]) => (
                      <div key={key} className="border-b pb-2 last:border-b-0" style={{ borderColor: "var(--desktop-shell-border)" }}>
                        <div className="font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                          {key}
                        </div>
                        <div style={{ color: "var(--window-document-text)" }}>
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setViewingResponse(null)}
                  className="px-4 py-2 border-2 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg-elevated)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {t("ui.forms.responses.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
