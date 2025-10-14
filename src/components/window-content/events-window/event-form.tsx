"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X } from "lucide-react";

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

  // Get existing event if editing
  const existingEvent = useQuery(
    api.eventOntology.getEvent,
    eventId ? { sessionId, eventId } : "skip"
  );

  const createEvent = useMutation(api.eventOntology.createEvent);
  const updateEvent = useMutation(api.eventOntology.updateEvent);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
          type="submit"
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
    </form>
  );
}
