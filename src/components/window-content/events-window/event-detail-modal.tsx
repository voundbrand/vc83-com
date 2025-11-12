"use client";

import { Doc } from "../../../../convex/_generated/dataModel";
import { X, Download, Loader2, Calendar, MapPin, Users, Clock } from "lucide-react";
import { useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface EventDetailModalProps {
  event: Doc<"objects">;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const { t } = useNamespaceTranslations("ui.events");
  const [isDownloadingAttendees, setIsDownloadingAttendees] = useState(false);

  // PDF generation action
  const generateAttendeeListPDF = useAction(api.pdfGeneration.generateEventAttendeeListPDF);

  // Query to get attendee count (public query, no auth needed)
  const attendees = useQuery(api.eventOntology.getEventAttendees, {
    eventId: event._id,
  });

  // Handle loading state
  const isLoadingAttendees = attendees === undefined;

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { label: t("ui.events.status.draft"), color: "var(--neutral-gray)" },
      published: { label: t("ui.events.status.published"), color: "var(--success)" },
      in_progress: { label: t("ui.events.status.in_progress"), color: "var(--win95-highlight)" },
      completed: { label: t("ui.events.status.completed"), color: "var(--info)" },
      cancelled: { label: t("ui.events.status.cancelled"), color: "var(--error)" },
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;
    return (
      <span
        className="px-3 py-1 text-sm font-bold rounded"
        style={{ background: badge.color, color: "var(--win95-titlebar-text)" }}
      >
        {badge.label}
      </span>
    );
  };

  const getSubtypeLabel = (subtype: string) => {
    const labels: Record<string, string> = {
      conference: t("ui.events.type.conference"),
      workshop: t("ui.events.type.workshop"),
      concert: t("ui.events.type.concert"),
      meetup: t("ui.events.type.meetup"),
      seminar: t("ui.events.type.seminar"),
    };
    return labels[subtype] || subtype;
  };

  const handleDownloadAttendeeList = async () => {
    setIsDownloadingAttendees(true);
    try {
      const pdf = await generateAttendeeListPDF({
        eventId: event._id,
      });

      if (pdf) {
        // Create download link
        const link = document.createElement("a");
        link.href = `data:${pdf.contentType};base64,${pdf.content}`;
        link.download = pdf.filename;
        link.click();
      }
    } catch (error) {
      console.error("Failed to download attendee list:", error);
      alert(t("ui.events.detail.error.download_failed"));
    } finally {
      setIsDownloadingAttendees(false);
    }
  };

  const customProps = event.customProperties || {};
  const attendeeCount = attendees?.length ?? 0;
  const maxCapacity = customProps.maxCapacity as number | undefined;
  const hasAttendees = attendeeCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="border-4 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          boxShadow: "var(--win95-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--win95-highlight)" }}>
              {event.name}
            </h2>
            <div className="flex items-center gap-3">
              {getStatusBadge(event.status || "draft")}
              <span className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                {getSubtypeLabel(event.subtype || "")}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 border-2 hover:bg-opacity-50 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
            }}
          >
            <X size={20} style={{ color: "var(--win95-text)" }} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Event Details */}
          <div className="space-y-4">
            {/* Date & Time */}
            <div
              className="border-2 p-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                {t("ui.events.detail.section.datetime")}
              </h3>

              <div className="space-y-3">
                {customProps.startDate && (
                  <div className="flex items-start gap-2">
                    <Calendar size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.events.detail.field.start")}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                        {formatDateTime(customProps.startDate as number)}
                      </p>
                    </div>
                  </div>
                )}

                {customProps.endDate && (
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.events.detail.field.end")}
                      </p>
                      <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                        {formatDateTime(customProps.endDate as number)}
                      </p>
                    </div>
                  </div>
                )}

                {customProps.timezone && (
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.events.detail.field.timezone")}
                    </p>
                    <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                      {customProps.timezone as string}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {customProps.location && (
              <div
                className="border-2 p-4"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                  {t("ui.events.detail.section.location")}
                </h3>

                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                  <div>
                    <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                      {customProps.location as string}
                    </p>
                    {customProps.formattedAddress && (
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        {customProps.formattedAddress as string}
                      </p>
                    )}
                  </div>
                </div>

                {customProps.googleMapsUrl && (
                  <a
                    href={customProps.googleMapsUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-2 inline-block"
                    style={{ color: "var(--win95-highlight)" }}
                  >
                    {t("ui.events.detail.action.view_map")}
                  </a>
                )}
              </div>
            )}

            {/* Capacity */}
            <div
              className="border-2 p-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                {t("ui.events.detail.section.capacity")}
              </h3>

              <div className="flex items-start gap-2">
                <Users size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                <div>
                  {isLoadingAttendees ? (
                    <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.events.detail.loading.attendees")}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                        {attendeeCount} {t("ui.events.detail.field.registered")}
                      </p>
                      {maxCapacity && (
                        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {t("ui.events.detail.field.max_capacity")}: {maxCapacity}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Download Attendee List Button */}
              <button
                onClick={handleDownloadAttendeeList}
                disabled={isDownloadingAttendees || isLoadingAttendees || !hasAttendees}
                className="w-full mt-4 px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
                title={
                  isLoadingAttendees
                    ? t("ui.events.detail.tooltip.loading")
                    : !hasAttendees
                    ? t("ui.events.detail.tooltip.no_attendees")
                    : t("ui.events.detail.tooltip.download_pdf")
                }
              >
                {isDownloadingAttendees ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">{t("ui.events.detail.button.downloading")}</span>
                  </>
                ) : isLoadingAttendees ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">{t("ui.events.detail.loading.button")}</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span className="text-sm">{t("ui.events.detail.button.download_attendees")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Middle Column - Description */}
          <div className="md:col-span-2 space-y-4">
            {/* Description */}
            {event.description && (
              <div
                className="border-2 p-4"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                  {t("ui.events.detail.section.description")}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--win95-text)" }}>
                  {event.description}
                </p>
              </div>
            )}

            {/* Detailed Description (HTML) */}
            {customProps.detailedDescription && (
              <div
                className="border-2 p-4"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                  {t("ui.events.detail.section.details")}
                </h3>
                <div
                  className="text-sm prose max-w-none"
                  style={{ color: "var(--win95-text)" }}
                  dangerouslySetInnerHTML={{ __html: customProps.detailedDescription as string }}
                />
              </div>
            )}

            {/* Agenda */}
            {customProps.agenda && Array.isArray(customProps.agenda) && (customProps.agenda as unknown[]).length > 0 && (
              <div
                className="border-2 p-4"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                  {t("ui.events.detail.section.agenda")}
                </h3>

                <div className="space-y-3">
                  {(customProps.agenda as Array<{
                    time: string;
                    title: string;
                    description?: string;
                    speaker?: string;
                    location?: string;
                  }>).map((item, index) => (
                    <div key={index} className="border-l-2 pl-3" style={{ borderColor: "var(--win95-highlight)" }}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold" style={{ color: "var(--win95-highlight)" }}>
                          {item.time}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                          {item.title}
                        </span>
                      </div>
                      {item.speaker && (
                        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                          {t("ui.events.detail.agenda.speaker")}: {item.speaker}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                          {item.description}
                        </p>
                      )}
                      {item.location && (
                        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                          {t("ui.events.detail.agenda.location")}: {item.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Information */}
            <div
              className="border-2 p-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                {t("ui.events.detail.section.system")}
              </h3>

              <div className="space-y-2">
                <div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.events.detail.field.event_id")}
                  </p>
                  <p className="text-xs font-mono break-all" style={{ color: "var(--win95-text)" }}>
                    {event._id}
                  </p>
                </div>

                <div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.events.detail.field.created_at")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>

                {event.updatedAt && event.updatedAt !== event.createdAt && (
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.events.detail.field.last_updated")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                      {formatDateTime(event.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
