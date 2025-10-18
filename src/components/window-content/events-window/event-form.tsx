"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X, ChevronDown, ChevronUp, Building2, Trash2, Edit2 } from "lucide-react";
import { OrganizationFormModal } from "../crm-window/organization-form-modal";

interface EventFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  eventId: Id<"objects"> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EventForm({
  sessionId,
  organizationId,
  eventId,
  onSuccess,
  onCancel,
}: EventFormProps) {
  const [formData, setFormData] = useState({
    subtype: "conference",
    name: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    capacity: "",
  });
  const [saving, setSaving] = useState(false);
  const [showSponsors, setShowSponsors] = useState(false);
  const [selectedSponsorOrgId, setSelectedSponsorOrgId] = useState<string>("");
  const [sponsorLevel, setSponsorLevel] = useState<"platinum" | "gold" | "silver" | "bronze" | "community">("gold");
  const [addingSponsor, setAddingSponsor] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<Id<"objects"> | null>(null);

  // Handler for when sponsor organization is selected - auto-populate level from CRM
  const handleSponsorOrgChange = (orgId: string) => {
    setSelectedSponsorOrgId(orgId);

    if (orgId && sponsorOrganizations) {
      const selectedOrg = sponsorOrganizations.find(org => org._id === orgId);
      if (selectedOrg?.customProperties?.sponsorLevel) {
        const level = selectedOrg.customProperties.sponsorLevel as "platinum" | "gold" | "silver" | "bronze" | "community";
        setSponsorLevel(level);
      } else {
        // Default to gold if no level is set
        setSponsorLevel("gold");
      }
    }
  };

  // Get existing event if editing
  const existingEvent = useQuery(
    api.eventOntology.getEvent,
    eventId ? { sessionId, eventId } : "skip"
  );

  const createEvent = useMutation(api.eventOntology.createEvent);
  const updateEvent = useMutation(api.eventOntology.updateEvent);
  const linkSponsor = useMutation(api.eventOntology.linkSponsorToEvent);
  const unlinkSponsor = useMutation(api.eventOntology.unlinkSponsorFromEvent);

  // Get sponsor CRM organizations (only if editing an existing event)
  const sponsorOrganizations = useQuery(
    api.crmOntology.getCrmOrganizations,
    eventId && sessionId
      ? { sessionId, organizationId, status: "active" }
      : "skip"
  );

  // Get current sponsors for this event
  const currentSponsors = useQuery(
    api.eventOntology.getSponsorsByEvent,
    eventId && sessionId ? { sessionId, eventId } : "skip"
  );

  // Load existing event data
  useEffect(() => {
    if (existingEvent) {
      const startDate = existingEvent.customProperties?.startDate
        ? new Date(existingEvent.customProperties.startDate)
        : null;
      const endDate = existingEvent.customProperties?.endDate
        ? new Date(existingEvent.customProperties.endDate)
        : null;

      setFormData({
        subtype: existingEvent.subtype || "conference",
        name: existingEvent.name || "",
        description: existingEvent.description || "",
        location: (existingEvent.customProperties?.location as string) || "",
        startDate: startDate ? startDate.toISOString().split("T")[0] : "",
        startTime: startDate ? startDate.toTimeString().slice(0, 5) : "",
        endDate: endDate ? endDate.toISOString().split("T")[0] : "",
        endTime: endDate ? endDate.toTimeString().slice(0, 5) : "",
        capacity: existingEvent.customProperties?.capacity?.toString() || "",
      });
    }
  }, [existingEvent]);

  const handleAddSponsor = async () => {
    if (!eventId || !selectedSponsorOrgId) {
      alert("Please select a sponsor organization");
      return;
    }

    setAddingSponsor(true);
    try {
      await linkSponsor({
        sessionId,
        eventId,
        crmOrganizationId: selectedSponsorOrgId as Id<"objects">,
        sponsorLevel,
        displayOrder: (currentSponsors?.length || 0) + 1,
      });
      setSelectedSponsorOrgId("");
      setSponsorLevel("gold");
    } catch (error) {
      console.error("Failed to add sponsor:", error);
      alert("Failed to add sponsor. Please try again.");
    } finally {
      setAddingSponsor(false);
    }
  };

  const handleRemoveSponsor = async (sponsorId: Id<"objects">) => {
    if (!eventId) return;

    if (!confirm("Remove this sponsor from the event?")) return;

    try {
      await unlinkSponsor({
        sessionId,
        eventId,
        crmOrganizationId: sponsorId,
      });
    } catch (error) {
      console.error("Failed to remove sponsor:", error);
      alert("Failed to remove sponsor. Please try again.");
    }
  };

  const getSponsorLevelColor = (level: string) => {
    switch (level) {
      case "platinum":
        return { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700" };
      case "gold":
        return { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-700" };
      case "silver":
        return { bg: "bg-gray-200", border: "border-gray-500", text: "text-gray-700" };
      case "bronze":
        return { bg: "bg-orange-100", border: "border-orange-500", text: "text-orange-700" };
      case "community":
        return { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-700" };
      default:
        return { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700" };
    }
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      // Combine date and time into timestamps
      const startDateTime = formData.startDate && formData.startTime
        ? new Date(`${formData.startDate}T${formData.startTime}`).getTime()
        : undefined;

      const endDateTime = formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`).getTime()
        : undefined;

      const capacity = formData.capacity ? parseInt(formData.capacity, 10) : undefined;

      if (eventId) {
        // Update existing event
        await updateEvent({
          sessionId,
          eventId,
          name: formData.name,
          description: formData.description,
          location: formData.location || undefined,
          startDate: startDateTime,
          endDate: endDateTime,
          customProperties: capacity ? { capacity } : undefined,
        });
      } else {
        // Create new event - startDate, endDate, location are required
        if (!startDateTime || !endDateTime) {
          alert("Please provide both start and end date/time");
          return;
        }

        await createEvent({
          sessionId,
          organizationId,
          subtype: formData.subtype,
          name: formData.name,
          description: formData.description,
          location: formData.location || "TBD",
          startDate: startDateTime,
          endDate: endDateTime,
          customProperties: capacity ? { capacity } : undefined,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Failed to save event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (eventId && !existingEvent) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Event Type */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Event Type <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <select
          value={formData.subtype}
          onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
          disabled={!!eventId}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        >
          <option value="conference">Conference - Multi-track professional event</option>
          <option value="workshop">Workshop - Hands-on training session</option>
          <option value="concert">Concert - Live music performance</option>
          <option value="meetup">Meetup - Casual networking event</option>
        </select>
        {eventId && (
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Event type cannot be changed after creation
          </p>
        )}
      </div>

      {/* Event Name */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Event Name <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Tech Summit 2025, Design Workshop, Jazz Night, etc."
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the event, schedule, speakers, and what attendees can expect..."
          rows={4}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Convention Center, Online via Zoom, Central Park, etc."
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
      </div>

      {/* Start Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Start Date
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Start Time
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
      </div>

      {/* End Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            End Date
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            End Time
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Capacity (Optional)
        </label>
        <input
          type="number"
          min="0"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          placeholder="Maximum number of attendees"
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Leave empty for unlimited capacity
        </p>
      </div>

      {/* Sponsors Section (Only for existing events) */}
      {eventId && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSponsors(!showSponsors)}
            className="flex items-center justify-between w-full text-left py-2 px-3 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
              color: "var(--win95-text)",
            }}
          >
            <span className="text-sm font-bold">🌟 Event Sponsors (Optional)</span>
            {showSponsors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSponsors && (
            <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
              {/* Add Sponsor */}
              <div className="space-y-2">
                <label className="block text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  Add Sponsor
                </label>
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedSponsorOrgId}
                    onChange={(e) => handleSponsorOrgChange(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  >
                    <option value="">-- Select CRM Organization --</option>
                    {sponsorOrganizations
                      ?.filter((org) => org.subtype === "sponsor")
                      .map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name}
                        </option>
                      ))}
                  </select>
                  {selectedSponsorOrgId && (
                    <span
                      className={`px-2 py-1 text-xs font-bold border-2 flex-shrink-0 ${
                        getSponsorLevelColor(sponsorLevel).bg
                      } ${getSponsorLevelColor(sponsorLevel).border} ${
                        getSponsorLevelColor(sponsorLevel).text
                      }`}
                    >
                      {sponsorLevel.toUpperCase()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleAddSponsor}
                    disabled={addingSponsor || !selectedSponsorOrgId}
                    className="px-3 py-1.5 text-sm font-bold border-2 flex-shrink-0"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--primary)",
                      color: "white",
                    }}
                  >
                    {addingSponsor ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Select a sponsor organization. The sponsor level is set in CRM and will be used automatically.
                </p>
              </div>

              {/* Current Sponsors List */}
              {currentSponsors && currentSponsors.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                    Current Sponsors ({currentSponsors.length})
                  </label>
                  <div className="space-y-1">
                    {currentSponsors.map((sponsor) => {
                      const level = sponsor.sponsorshipProperties?.sponsorLevel || "community";
                      const colors = getSponsorLevelColor(level);
                      return (
                        <div
                          key={sponsor._id}
                          className="flex items-center justify-between gap-2 p-2 border-2"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-bg-light)",
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Building2 size={16} style={{ color: "var(--primary)" }} className="flex-shrink-0" />
                            <span className="text-sm font-semibold truncate" style={{ color: "var(--win95-text)" }}>
                              {sponsor.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Sponsor Level Badge (Read-only) */}
                            <span
                              className={`px-2 py-1 text-xs font-bold border-2 ${colors.bg} ${colors.border} ${colors.text}`}
                            >
                              {level.toUpperCase()}
                            </span>
                            {/* Edit Sponsor button - opens CRM organization modal */}
                            <button
                              type="button"
                              onClick={() => setEditingSponsorId(sponsor._id)}
                              className="px-2 py-1 text-xs border-2 hover:bg-blue-100 transition-colors"
                              style={{
                                borderColor: "var(--win95-border)",
                                color: "var(--primary)",
                              }}
                              title="Edit sponsor in CRM"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSponsor(sponsor._id)}
                              className="px-2 py-1 text-xs border-2 hover:bg-red-100 transition-colors"
                              style={{
                                borderColor: "var(--win95-border)",
                                color: "var(--error)",
                              }}
                              title="Remove sponsor"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentSponsors && currentSponsors.length === 0 && (
                <div
                  className="text-center py-4 border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    No sponsors added yet
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          💡 Events start in &ldquo;Draft&rdquo; status. Click &ldquo;Publish&rdquo; to make them visible to attendees.
          {!eventId && " Save the event first to add sponsors."}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              {eventId ? "Update" : "Create"} Event
            </>
          )}
        </button>
      </div>

      {/* Organization Edit Modal (for editing sponsors) */}
      {editingSponsorId && (
        <OrganizationFormModal
          editId={editingSponsorId}
          onClose={() => setEditingSponsorId(null)}
          onSuccess={() => {
            setEditingSponsorId(null);
            // The sponsor list will auto-refresh via the currentSponsors query
          }}
        />
      )}
    </div>
  );
}
