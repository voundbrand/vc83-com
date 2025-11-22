"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { X, Save, Loader2, Settings2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ContentRulesModalProps {
  page: {
    _id: Id<"objects"> | string; // Allow string for temp pages
    name: string;
    customProperties?: {
      slug?: string;
      contentRules?: {
        events?: {
          filter?: "all" | "future" | "past" | "featured";
          visibility?: "all" | "public" | "private";
          subtypes?: string[];
          limit?: number;
          sortBy?: string;
          sortOrder?: "asc" | "desc";
        };
        checkoutId?: string;
        formIds?: string[];
      };
    };
  };
  onClose: () => void;
  onSaveRules?: (rules: any) => void; // Callback for temp pages
}

/**
 * Content Rules Modal
 *
 * Allows org owners to configure content filtering rules for external frontends.
 * This determines what events, checkouts, and forms are returned by the API.
 */
export function ContentRulesModal({ page, onClose, onSaveRules }: ContentRulesModalProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();

  // Fetch available resources
  const checkouts = useQuery(
    api.checkoutOntology.getCheckoutInstances,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  const forms = useQuery(
    api.formsOntology.getForms,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // Get existing content rules
  const existingRules = page.customProperties?.contentRules || {};

  // Form state
  const [eventFilter, setEventFilter] = useState<"all" | "future" | "past" | "featured">(
    existingRules.events?.filter || "all"
  );
  const [eventVisibility, setEventVisibility] = useState<"all" | "public" | "private">(
    existingRules.events?.visibility || "public"
  );
  const [eventSubtypes, setEventSubtypes] = useState<string[]>(
    existingRules.events?.subtypes || []
  );
  const [eventLimit, setEventLimit] = useState<number>(
    existingRules.events?.limit || 10
  );
  const [eventSortBy, setEventSortBy] = useState<string>(
    existingRules.events?.sortBy || "startDate"
  );
  const [eventSortOrder, setEventSortOrder] = useState<"asc" | "desc">(
    existingRules.events?.sortOrder || "asc"
  );
  const [selectedCheckoutId, setSelectedCheckoutId] = useState<string>(
    existingRules.checkoutId || ""
  );
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(
    existingRules.formIds || []
  );

  const updateContentRules = useMutation(api.publishingOntology.updateContentRules);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const contentRules = {
      events: {
        filter: eventFilter,
        visibility: eventVisibility,
        subtypes: eventSubtypes.length > 0 ? eventSubtypes : undefined,
        limit: eventLimit,
        sortBy: eventSortBy,
        sortOrder: eventSortOrder,
      },
      checkoutId: selectedCheckoutId || undefined,
      formIds: selectedFormIds.length > 0 ? selectedFormIds : undefined,
    };

    // Check if this is a temporary page (during creation)
    const isTempPage = typeof page._id === "string" && page._id === "temp_page";

    if (isTempPage) {
      // For temp pages, just call the callback and close
      if (onSaveRules) {
        onSaveRules(contentRules);
        notification.success("Applied!", "Content rules will be saved with the page");
      }
      onClose();
      return;
    }

    // For real pages, save to backend
    if (!sessionId) return;

    setIsSaving(true);
    try {
      await updateContentRules({
        sessionId,
        pageId: page._id as Id<"objects">,
        contentRules,
      });

      notification.success("Saved!", "Content rules updated successfully");
      onClose();
    } catch (error) {
      console.error("Failed to save content rules:", error);
      notification.error("Save Failed", "Could not update content rules");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubtypeToggle = (subtype: string) => {
    setEventSubtypes((prev) =>
      prev.includes(subtype)
        ? prev.filter((s) => s !== subtype)
        : [...prev, subtype]
    );
  };

  const handleFormToggle = (formId: string) => {
    setSelectedFormIds((prev) =>
      prev.includes(formId)
        ? prev.filter((id) => id !== formId)
        : [...prev, formId]
    );
  };

  const availableSubtypes = ["seminar", "conference", "workshop", "meetup"];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden border-4 shadow-xl"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-2"
          style={{
            background: "var(--win95-highlight)",
            borderColor: "var(--win95-border)",
            color: "var(--win95-titlebar-text)",
          }}
        >
          <div className="flex items-center gap-2">
            <Settings2 size={16} />
            <h3 className="font-bold text-sm">Content Rules - {page.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-1 transition-colors"
            disabled={isSaving}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>
          <div className="p-4 space-y-6">
            {/* Event Filters Section */}
            <div>
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                📅 Event Display Rules
              </h4>

              {/* Time Filter */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Show Events:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(["all", "future", "past", "featured"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setEventFilter(filter)}
                      className="px-3 py-1.5 text-xs font-bold border-2 transition-colors"
                      style={{
                        borderColor: eventFilter === filter ? "var(--win95-highlight)" : "var(--win95-border)",
                        background: eventFilter === filter ? "var(--win95-highlight)" : "var(--win95-button-face)",
                        color: eventFilter === filter ? "var(--win95-titlebar-text)" : "var(--win95-text)",
                      }}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Filter */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Visibility:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(["all", "public", "private"] as const).map((visibility) => (
                    <button
                      key={visibility}
                      onClick={() => setEventVisibility(visibility)}
                      className="px-3 py-1.5 text-xs font-bold border-2 transition-colors"
                      style={{
                        borderColor: eventVisibility === visibility ? "var(--win95-highlight)" : "var(--win95-border)",
                        background: eventVisibility === visibility ? "var(--win95-highlight)" : "var(--win95-button-face)",
                        color: eventVisibility === visibility ? "var(--win95-titlebar-text)" : "var(--win95-text)",
                      }}
                    >
                      {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Types */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Event Types (optional):
                </label>
                <div className="flex gap-2 flex-wrap">
                  {availableSubtypes.map((subtype) => (
                    <button
                      key={subtype}
                      onClick={() => handleSubtypeToggle(subtype)}
                      className="px-3 py-1.5 text-xs font-bold border-2 transition-colors"
                      style={{
                        borderColor: eventSubtypes.includes(subtype) ? "var(--win95-highlight)" : "var(--win95-border)",
                        background: eventSubtypes.includes(subtype) ? "var(--win95-highlight)" : "var(--win95-button-face)",
                        color: eventSubtypes.includes(subtype) ? "var(--win95-titlebar-text)" : "var(--win95-text)",
                      }}
                    >
                      {subtype.charAt(0).toUpperCase() + subtype.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Leave empty to show all event types
                </p>
              </div>

              {/* Limit */}
              <div className="mb-4">
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Maximum Events:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={eventLimit}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty string during editing, otherwise parse
                    if (val === "") {
                      setEventLimit(0);
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 1 && num <= 100) {
                        setEventLimit(num);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, ensure valid value (default to 10 if invalid)
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val) || val < 1) {
                      setEventLimit(10);
                    }
                  }}
                  className="w-24 px-2 py-1 text-xs border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                    color: "var(--win95-text)",
                  }}
                />
              </div>

              {/* Sort Options */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    Sort By:
                  </label>
                  <select
                    value={eventSortBy}
                    onChange={(e) => setEventSortBy(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg-light)",
                      color: "var(--win95-text)",
                    }}
                  >
                    <option value="startDate">Start Date</option>
                    <option value="createdAt">Created Date</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    Order:
                  </label>
                  <select
                    value={eventSortOrder}
                    onChange={(e) => setEventSortOrder(e.target.value as "asc" | "desc")}
                    className="w-full px-2 py-1.5 text-xs border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg-light)",
                      color: "var(--win95-text)",
                    }}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t-2" style={{ borderColor: "var(--win95-border)" }} />

            {/* Checkout Selection */}
            <div>
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                🛒 Primary Checkout
              </h4>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Checkout Instance (optional):
              </label>
              <select
                value={selectedCheckoutId}
                onChange={(e) => setSelectedCheckoutId(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                  color: "var(--win95-text)",
                }}
              >
                <option value="">-- None --</option>
                {checkouts?.map((checkout) => (
                  <option key={checkout._id} value={checkout._id}>
                    {checkout.name} ({checkout.status})
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                This checkout will be available to all events on this page
              </p>
            </div>

            <div className="border-t-2" style={{ borderColor: "var(--win95-border)" }} />

            {/* Forms Selection */}
            <div>
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                📋 Available Forms
              </h4>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Forms (optional):
              </label>
              {forms && forms.length > 0 ? (
                <div className="space-y-2">
                  {forms.map((form: { _id: string; name: string }) => (
                    <label
                      key={form._id}
                      className="flex items-center gap-2 p-2 border-2 cursor-pointer hover:bg-opacity-50"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: selectedFormIds.includes(form._id) ? "rgba(107, 70, 193, 0.1)" : "var(--win95-bg-light)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFormIds.includes(form._id)}
                        onChange={() => handleFormToggle(form._id)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                        {form.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  No forms available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold border-2 transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold border-2 transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{
              borderColor: "var(--win95-highlight)",
              background: "var(--win95-highlight)",
              color: "var(--win95-titlebar-text)",
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Rules
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
