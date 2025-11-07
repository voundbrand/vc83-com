"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X, ChevronDown, ChevronUp, Building2, Trash2, Edit2, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { OrganizationFormModal } from "../crm-window/organization-form-modal";
import { EventDescriptionSection } from "./EventDescriptionSection";
import { EventMediaSection } from "./EventMediaSection";
import { EventAgendaSection, type AgendaItem } from "./EventAgendaSection";
import {
  timestampToLocalDate,
  timestampToLocalTime,
  localDateTimeToTimestamp
} from "@/lib/timezone-utils";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

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
  const { t } = useNamespaceTranslations("ui.events");
  const [formData, setFormData] = useState({
    subtype: "conference",
    format: "in-person", // online, in-person, or hybrid
    name: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    capacity: "",
  });

  // Address validation state
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    success: boolean;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
    directionsUrl?: string;
    googleMapsUrl?: string;
    confidence?: string;
    error?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSponsors, setShowSponsors] = useState(false);
  const [selectedSponsorOrgId, setSelectedSponsorOrgId] = useState<string>("");
  const [sponsorLevel, setSponsorLevel] = useState<"platinum" | "gold" | "silver" | "bronze" | "community">("gold");
  const [addingSponsor, setAddingSponsor] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<Id<"objects"> | null>(null);

  // New state for media, description, and agenda sections
  const [showMedia, setShowMedia] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [detailedDescription, setDetailedDescription] = useState("");
  const [eventAgenda, setEventAgenda] = useState<AgendaItem[]>([]);

  // Track if user is actively editing description to prevent loops
  const isEditingDescription = useRef(false);
  const descriptionDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Video state
  const [eventVideos, setEventVideos] = useState<Array<{
    id: string;
    type: 'video';
    videoUrl: string;
    videoProvider: 'youtube' | 'vimeo' | 'other';
    loop: boolean;
    autostart: boolean;
    order: number;
  }>>([]);
  const [showVideoFirst, setShowVideoFirst] = useState(false);

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

  // Get organization settings to access timezone (specifically locale settings)
  const localeSettings = useQuery(
    api.organizationOntology.getOrganizationSettings,
    { organizationId, subtype: "locale" }
  );

  // Extract timezone from organization settings, default to America/New_York if not set
  // localeSettings is a single object when subtype is specified
  const orgTimezone = (localeSettings && !Array.isArray(localeSettings) && localeSettings.customProperties?.timezone as string) || "America/New_York";

  const createEvent = useMutation(api.eventOntology.createEvent);
  const updateEvent = useMutation(api.eventOntology.updateEvent);
  const linkSponsor = useMutation(api.eventOntology.linkSponsorToEvent);
  const unlinkSponsor = useMutation(api.eventOntology.unlinkSponsorFromEvent);
  const updateLocationWithValidation = useMutation(api.eventOntology.updateEventLocationWithValidation);

  // Address validation action
  const validateAddress = useAction(api.addressValidation.validateAddress);

  // New mutations for media and description
  const linkMedia = useMutation(api.eventOntology.linkMediaToEvent);
  const unlinkMedia = useMutation(api.eventOntology.unlinkMediaFromEvent);
  const updateDescription = useMutation(api.eventOntology.updateEventDetailedDescription);
  const updateEventMedia = useMutation(api.eventOntology.updateEventMedia);

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

  // Get event media
  const eventMedia = useQuery(
    api.eventOntology.getEventMedia,
    eventId && sessionId ? { sessionId, eventId } : "skip"
  );

  // Load existing event data
  useEffect(() => {
    if (existingEvent && orgTimezone) {
      const startTimestamp = existingEvent.customProperties?.startDate as number | undefined;
      const endTimestamp = existingEvent.customProperties?.endDate as number | undefined;

      // Convert timestamps to organization's timezone for editing
      setFormData({
        subtype: existingEvent.subtype || "conference",
        format: (existingEvent.customProperties?.format as string) || "in-person",
        name: existingEvent.name || "",
        location: (existingEvent.customProperties?.location as string) || "",
        startDate: startTimestamp ? timestampToLocalDate(startTimestamp, orgTimezone) : "",
        startTime: startTimestamp ? timestampToLocalTime(startTimestamp, orgTimezone) : "",
        endDate: endTimestamp ? timestampToLocalDate(endTimestamp, orgTimezone) : "",
        endTime: endTimestamp ? timestampToLocalTime(endTimestamp, orgTimezone) : "",
        capacity: existingEvent.customProperties?.capacity?.toString() || "",
      });

      // Load detailed description (only if not actively editing to prevent cursor jumps)
      if (!isEditingDescription.current) {
        setDetailedDescription((existingEvent.customProperties?.detailedDescription as string) || "");
      }

      // Load videos if they exist
      if (existingEvent.customProperties?.media?.items) {
        const videos = existingEvent.customProperties.media.items.filter(
          (item: any) => item.type === 'video'
        );
        setEventVideos(videos);
        // Load showVideoFirst setting
        setShowVideoFirst(existingEvent.customProperties.media.showVideoFirst || false);
      }

      // Load agenda if it exists
      if (existingEvent.customProperties?.agenda) {
        setEventAgenda(existingEvent.customProperties.agenda as AgendaItem[]);
      }

      // Load address validation data if available
      if (existingEvent.customProperties?.formattedAddress) {
        setAddressValidation({
          success: true,
          formattedAddress: existingEvent.customProperties.formattedAddress as string,
          latitude: existingEvent.customProperties.latitude as number,
          longitude: existingEvent.customProperties.longitude as number,
          directionsUrl: existingEvent.customProperties.directionsUrl as string,
          googleMapsUrl: existingEvent.customProperties.googleMapsUrl as string,
          confidence: existingEvent.customProperties.addressConfidence as string,
        });
      }
    }
  }, [existingEvent, orgTimezone]);

  const handleAddSponsor = async () => {
    if (!eventId) {
      alert("Please save the event first before adding sponsors");
      return;
    }

    if (!selectedSponsorOrgId) {
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

  // Media handlers
  const handleMediaLink = async (mediaId: Id<"organizationMedia">) => {
    if (!eventId) {
      alert("Please save the event first before adding media");
      return;
    }

    try {
      await linkMedia({
        sessionId,
        eventId,
        mediaId,
        isPrimary: !eventMedia || eventMedia.length === 0, // First image is primary
        displayOrder: eventMedia?.length || 0,
      });
    } catch (error) {
      console.error("Failed to link media:", error);
      alert("Failed to add media. Please try again.");
    }
  };

  const handleMediaUnlink = async (mediaId: Id<"organizationMedia">) => {
    if (!eventId) return;

    try {
      await unlinkMedia({
        sessionId,
        eventId,
        mediaId,
      });
    } catch (error) {
      console.error("Failed to unlink media:", error);
      alert("Failed to remove media. Please try again.");
    }
  };

  // Description handler
  const handleDescriptionChange = async (html: string) => {
    // Mark that we're actively editing
    isEditingDescription.current = true;
    setDetailedDescription(html);

    // Clear any existing debounce timer
    if (descriptionDebounceTimer.current) {
      clearTimeout(descriptionDebounceTimer.current);
    }

    // Auto-save if editing existing event (for new events, it will be saved on submit)
    if (eventId) {
      try {
        await updateDescription({
          sessionId,
          eventId,
          detailedDescription: html,
        });

        // Debounce: only clear editing flag after user stops typing for 100ms
        descriptionDebounceTimer.current = setTimeout(() => {
          isEditingDescription.current = false;
          descriptionDebounceTimer.current = null;
        }, 100);
      } catch (error) {
        console.error("Failed to update description:", error);
        isEditingDescription.current = false;
      }
    } else {
      // For new events, clear flag after short delay
      descriptionDebounceTimer.current = setTimeout(() => {
        isEditingDescription.current = false;
        descriptionDebounceTimer.current = null;
      }, 100);
    }
  };

  // Address validation handler
  const handleValidateAddress = async () => {
    if (!formData.location.trim()) {
      return;
    }

    setValidatingAddress(true);
    setAddressValidation(null);

    try {
      const result = await validateAddress({ address: formData.location });

      setAddressValidation(result);

      // If validation successful and we're editing an event, save the validated data
      if (result.success && eventId) {
        await updateLocationWithValidation({
          sessionId,
          eventId,
          location: formData.location,
          formattedAddress: result.formattedAddress,
          latitude: result.latitude,
          longitude: result.longitude,
          directionsUrl: result.directionsUrl,
          googleMapsUrl: result.googleMapsUrl,
          confidence: result.confidence,
        });
      }
    } catch (error) {
      console.error("Address validation error:", error);
      setAddressValidation({
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate address. Please try again.",
      });
    } finally {
      setValidatingAddress(false);
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
      // Convert date and time to timestamps using organization's timezone
      const startDateTime = formData.startDate && formData.startTime
        ? localDateTimeToTimestamp(formData.startDate, formData.startTime, orgTimezone)
        : undefined;

      const endDateTime = formData.endDate && formData.endTime
        ? localDateTimeToTimestamp(formData.endDate, formData.endTime, orgTimezone)
        : undefined;

      const capacity = formData.capacity ? parseInt(formData.capacity, 10) : undefined;

      let finalEventId = eventId;

      if (eventId) {
        // Update existing event
        // Update custom properties to include detailed description, agenda, and format
        const customProps: Record<string, unknown> = {};
        if (capacity) customProps.capacity = capacity;
        if (detailedDescription) customProps.detailedDescription = detailedDescription;
        if (eventAgenda.length > 0) customProps.agenda = eventAgenda;
        customProps.format = formData.format; // Add format

        await updateEvent({
          sessionId,
          eventId,
          subtype: formData.subtype, // Allow subtype to be updated
          name: formData.name,
          description: undefined, // No longer using plain description
          location: formData.location || undefined,
          startDate: startDateTime,
          endDate: endDateTime,
          customProperties: Object.keys(customProps).length > 0 ? customProps : undefined,
        });
      } else {
        // Create new event - startDate, endDate, location are required
        if (!startDateTime || !endDateTime) {
          alert("Please provide both start and end date/time");
          return;
        }

        // Build custom properties with detailed description, agenda, format, and address validation
        const customProps: Record<string, unknown> = {};
        if (capacity) customProps.capacity = capacity;
        if (detailedDescription) customProps.detailedDescription = detailedDescription;
        if (eventAgenda.length > 0) customProps.agenda = eventAgenda;
        customProps.format = formData.format; // Add format

        // Include validated address data if available
        if (addressValidation?.success) {
          customProps.formattedAddress = addressValidation.formattedAddress;
          customProps.latitude = addressValidation.latitude;
          customProps.longitude = addressValidation.longitude;
          customProps.directionsUrl = addressValidation.directionsUrl;
          customProps.googleMapsUrl = addressValidation.googleMapsUrl;
          customProps.addressConfidence = addressValidation.confidence;
          customProps.addressValidatedAt = Date.now();
        }

        finalEventId = await createEvent({
          sessionId,
          organizationId,
          subtype: formData.subtype,
          name: formData.name,
          description: undefined, // No longer using plain description
          location: formData.location || "TBD",
          startDate: startDateTime,
          endDate: endDateTime,
          customProperties: Object.keys(customProps).length > 0 ? customProps : undefined,
        });

        console.log("Event created with ID:", finalEventId);
      }

      // Save media (images + videos) if we have an event ID
      if (finalEventId) {
        // Get current media from event (not from eventMedia query which may be stale)
        const currentMedia = existingEvent?.customProperties?.media?.items || [];

        // Filter to only include images (exclude old videos)
        const existingImages = currentMedia.filter((item: any) => item.type === 'image');

        // Convert videos to media items
        const mediaItems = [
          // Include existing images as image type
          ...existingImages.map((img: any, index: number) => ({
            id: img.id,
            type: 'image' as const,
            storageId: img.storageId,
            filename: img.filename,
            mimeType: img.mimeType,
            order: index,
          })),
          // Add current videos (this now correctly excludes deleted videos)
          ...eventVideos,
        ];

        // Only update if there are media items OR if we need to update showVideoFirst
        if (mediaItems.length > 0 || showVideoFirst !== (existingEvent?.customProperties?.media?.showVideoFirst || false)) {
          await updateEventMedia({
            sessionId,
            eventId: finalEventId,
            media: {
              items: mediaItems,
              showVideoFirst: showVideoFirst,
            },
          });
        }
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
      </div>

      {/* Event Format */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Event Format <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <select
          value={formData.format}
          onChange={(e) => setFormData({ ...formData, format: e.target.value })}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        >
          <option value="in-person">In-Person - Physical venue attendance</option>
          <option value="online">Online - Virtual/remote attendance</option>
          <option value="hybrid">Hybrid - Both in-person and virtual options</option>
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          How will attendees participate in this event?
        </p>
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

      {/* Description removed - now using rich text WYSIWYG editor below */}

      {/* Location with Address Validation */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Location
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.location}
            onChange={(e) => {
              setFormData({ ...formData, location: e.target.value });
              setAddressValidation(null); // Clear validation when location changes
            }}
            placeholder="San Francisco Convention Center, 747 Howard St, SF"
            className="flex-1 px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          />
          <button
            type="button"
            onClick={handleValidateAddress}
            disabled={validatingAddress || !formData.location.trim()}
            className="px-3 py-2 text-sm font-bold border-2 flex items-center gap-2"
            style={{
              borderColor: "var(--win95-border)",
              background: validatingAddress ? "var(--win95-button-face)" : "var(--primary)",
              color: validatingAddress ? "var(--win95-text)" : "white",
            }}
            title="Validate address and get directions"
          >
            {validatingAddress ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MapPin size={14} />
            )}
            {validatingAddress ? "Validating..." : "Verify"}
          </button>
        </div>

        {/* Validation Results */}
        {addressValidation && (
          <div
            className="p-3 border-2 rounded text-sm space-y-2"
            style={{
              borderColor: addressValidation.success ? "var(--success)" : "var(--error)",
              background: addressValidation.success ? "var(--success-bg)" : "var(--error-bg)",
            }}
          >
            {addressValidation.success ? (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: "var(--success)" }}>
                      Address Verified!
                    </p>
                    <p style={{ color: "var(--win95-text)" }}>
                      {addressValidation.formattedAddress}
                    </p>
                    {addressValidation.confidence && (
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        Confidence: {addressValidation.confidence}
                      </p>
                    )}
                  </div>
                </div>

                {/* Directions Links */}
                {addressValidation.googleMapsUrl && (
                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                    <a
                      href={addressValidation.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs border-2 hover:bg-blue-50 transition-colors"
                      style={{
                        borderColor: "var(--win95-border)",
                        color: "var(--primary)",
                      }}
                    >
                      📍 Open in Google Maps
                    </a>
                    {addressValidation.directionsUrl && (
                      <a
                        href={addressValidation.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs border-2 hover:bg-blue-50 transition-colors"
                        style={{
                          borderColor: "var(--win95-border)",
                          color: "var(--primary)",
                        }}
                      >
                        🗺️ Open in Radar Maps
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
                <div className="flex-1">
                  <p className="font-bold mb-1" style={{ color: "var(--error)" }}>
                    Could not verify address
                  </p>
                  <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(addressValidation as any).error || addressValidation.formattedAddress || "Please check the location and try again"}
                  </p>
                  <p className="text-xs mt-2 italic" style={{ color: "var(--neutral-gray)" }}>
                    💡 Tip: Include street number, postal code, and country for best results
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          💡 Click &quot;Verify&quot; to validate the address and get automatic directions for attendees
        </p>
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

      {/* Timezone Info */}
      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
        🌍 Times are in your organization&apos;s timezone: <strong>{orgTimezone}</strong>
      </p>

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

      {/* Media Section */}
      <EventMediaSection
        eventId={eventId || undefined}
        organizationId={organizationId}
        sessionId={sessionId}
        linkedMediaIds={eventMedia?.map(m => m._id) || []}
        onMediaLink={handleMediaLink}
        onMediaUnlink={handleMediaUnlink}
        videos={eventVideos}
        onVideosChange={setEventVideos}
        showVideoFirst={showVideoFirst}
        onShowVideoFirstChange={setShowVideoFirst}
        isOpen={showMedia}
        onToggle={() => setShowMedia(!showMedia)}
      />

      {/* Description Section */}
      <EventDescriptionSection
        description={detailedDescription}
        onDescriptionChange={handleDescriptionChange}
        isOpen={showDescription}
        onToggle={() => setShowDescription(!showDescription)}
      />

      {/* Agenda Section */}
      <EventAgendaSection
        agenda={eventAgenda}
        onAgendaChange={setEventAgenda}
        isOpen={showAgenda}
        onToggle={() => setShowAgenda(!showAgenda)}
      />

      {/* Sponsors Section */}
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
          {!eventId && " Note: Media and Sponsors can only be added after saving the event. Description is available now."}
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
