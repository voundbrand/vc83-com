"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Eye, Download, Search } from "lucide-react";

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

export function ResponsesTab({ forms }: ResponsesTabProps) {
  const { sessionId } = useAuth();
  const [selectedFormId, setSelectedFormId] = useState<Id<"objects"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingResponse, setViewingResponse] = useState<any | null>(null);

  // Get responses for selected form
  const responses = useQuery(
    api.formsOntology.getFormResponses,
    sessionId && selectedFormId
      ? { sessionId, formId: selectedFormId }
      : "skip"
  );

  // If no form selected, show form selector
  if (!selectedFormId) {
    const formsWithResponses = forms.filter(
      (form) => (form.customProperties?.stats?.submissions ?? 0) > 0
    );

    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          Select a form to view responses
        </h3>

        {formsWithResponses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              No form responses yet
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              Responses will appear here once forms are submitted
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
                  className="p-4 border-2 text-left hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                        {form.name}
                      </h4>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {form.subtype || "form"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: "var(--win95-highlight)" }}>
                        {submissionCount}
                      </div>
                      <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {submissionCount === 1 ? "response" : "responses"}
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
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
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
      <div className="p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedFormId(null)}
            className="text-xs px-3 py-1 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
            }}
          >
            ← Back to Forms
          </button>
          <button
            className="text-xs px-3 py-1 border-2 flex items-center gap-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
            }}
            title="Export to CSV (coming soon)"
            disabled
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>

        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
          {selectedForm?.name}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {filteredResponses.length} {filteredResponses.length === 1 ? "response" : "responses"}
        </p>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 border-2 px-3 py-2 bg-white">
          <Search size={14} style={{ color: "var(--neutral-gray)" }} />
          <input
            type="text"
            placeholder="Search responses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs outline-none"
            style={{ color: "var(--win95-text)" }}
          />
        </div>
      </div>

      {/* Response List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredResponses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              {searchQuery ? "No responses match your search" : "No responses yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResponses.map((response) => {
              const responseData = response.customProperties?.responses as Record<string, any> || {};
              const submittedAt = response.customProperties?.submittedAt as number;
              const isPublic = response.customProperties?.isPublicSubmission as boolean;

              // Try to get a name from the response data
              const name = responseData.firstName || responseData.first_name ||
                          responseData.contact_name || responseData.name ||
                          responseData.email || "Anonymous";

              return (
                <div
                  key={response._id}
                  className="p-3 border-2 hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                          {name}
                        </h4>
                        {isPublic && (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              background: "var(--win95-highlight)",
                              color: "white",
                            }}
                          >
                            Public
                          </span>
                        )}
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                        {submittedAt ? new Date(submittedAt).toLocaleString() : "Unknown time"}
                      </p>

                      {/* Show first few fields */}
                      <div className="text-xs space-y-1">
                        {Object.entries(responseData).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span style={{ color: "var(--neutral-gray)" }}>{key}:</span>
                            <span style={{ color: "var(--win95-text)" }} className="font-semibold">
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
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-button-face)",
                      }}
                    >
                      <Eye size={12} />
                      View
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
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
              boxShadow: "4px 4px 0 rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-4 py-2 flex items-center justify-between border-b-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-highlight)",
              }}
            >
              <h3 className="text-sm font-bold text-white">Response Details</h3>
              <button
                onClick={() => setViewingResponse(null)}
                className="text-white text-sm font-bold px-2 hover:bg-black/20"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Metadata */}
              <div className="p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "white" }}>
                <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Submission Info
                </h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Submitted:</span>
                    <span style={{ color: "var(--win95-text)" }}>
                      {new Date(viewingResponse.customProperties?.submittedAt || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Type:</span>
                    <span style={{ color: "var(--win95-text)" }}>
                      {viewingResponse.customProperties?.isPublicSubmission ? "Public Submission" : "Authenticated"}
                    </span>
                  </div>
                  {viewingResponse.customProperties?.ipAddress && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--neutral-gray)" }}>IP Address:</span>
                      <span style={{ color: "var(--win95-text)" }}>
                        {viewingResponse.customProperties.ipAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Data */}
              <div className="p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "white" }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                  Form Data
                </h4>
                <div className="text-xs space-y-3">
                  {Object.entries((viewingResponse.customProperties?.responses as Record<string, any>) || {}).map(
                    ([key, value]) => (
                      <div key={key} className="border-b pb-2 last:border-b-0">
                        <div className="font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                          {key}
                        </div>
                        <div style={{ color: "var(--win95-text)" }}>
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
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
