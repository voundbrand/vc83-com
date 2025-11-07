"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Edit2, Trash2, CheckCircle, Loader2, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface EventsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  onEdit: (eventId: Id<"objects">) => void;
}

export function EventsList({ sessionId, organizationId, onEdit }: EventsListProps) {
  const { t } = useNamespaceTranslations("ui.events");
  const [filter, setFilter] = useState<{ subtype?: string; status?: string }>({});

  // Get events from Convex
  const events = useQuery(api.eventOntology.getEvents, {
    sessionId,
    organizationId,
    ...filter,
  });

  const deleteEvent = useMutation(api.eventOntology.deleteEvent);
  const publishEvent = useMutation(api.eventOntology.publishEvent);

  const handleDelete = async (eventId: Id<"objects">) => {
    if (confirm(t("ui.events.list.delete_confirm"))) {
      try {
        await deleteEvent({ sessionId, eventId });
      } catch (error) {
        console.error("Failed to delete event:", error);
        alert(t("ui.events.list.delete_error"));
      }
    }
  };

  const handlePublish = async (eventId: Id<"objects">) => {
    try {
      await publishEvent({ sessionId, eventId });
    } catch (error) {
      console.error("Failed to publish event:", error);
      alert(t("ui.events.list.publish_error"));
    }
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
        className="px-2 py-0.5 text-xs font-bold rounded"
        style={{ background: badge.color, color: "white" }}
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
    };
    return labels[subtype] || subtype;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (events === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p style={{ color: "var(--neutral-gray)" }} className="text-sm">
            {t("ui.events.list.no_events")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          value={filter.subtype || ""}
          onChange={(e) => setFilter({ ...filter, subtype: e.target.value || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">{t("ui.events.list.filter.all_types")}</option>
          <option value="conference">{t("ui.events.type.conference")}</option>
          <option value="workshop">{t("ui.events.type.workshop")}</option>
          <option value="concert">{t("ui.events.type.concert")}</option>
          <option value="meetup">{t("ui.events.type.meetup")}</option>
        </select>

        <select
          value={filter.status || ""}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="px-3 py-1.5 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--win95-text)",
          }}
        >
          <option value="">{t("ui.events.list.filter.all_statuses")}</option>
          <option value="draft">{t("ui.events.status.draft")}</option>
          <option value="published">{t("ui.events.status.published")}</option>
          <option value="in_progress">{t("ui.events.status.in_progress")}</option>
          <option value="completed">{t("ui.events.status.completed")}</option>
          <option value="cancelled">{t("ui.events.status.cancelled")}</option>
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div
            key={event._id}
            className="border-2 p-4"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">{getSubtypeLabel(event.subtype || "")}</span>
                  {getStatusBadge(event.status || "draft")}
                </div>
                <h3 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
                  {event.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--neutral-gray)" }}>
                {event.description}
              </p>
            )}

            {/* Event Details */}
            <div className="mb-3 space-y-1">
              {event.customProperties?.startDate && (
                <div className="flex items-start gap-2 text-xs">
                  <Clock size={12} style={{ color: "var(--neutral-gray)", marginTop: "2px" }} />
                  <div>
                    <div style={{ color: "var(--win95-text)" }} className="font-semibold">
                      {formatDateTime(event.customProperties.startDate)}
                    </div>
                    {event.customProperties.endDate && (
                      <div style={{ color: "var(--neutral-gray)" }}>
                        to {formatDateTime(event.customProperties.endDate)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {event.customProperties?.location && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin size={12} style={{ color: "var(--neutral-gray)" }} />
                  <span style={{ color: "var(--win95-text)" }}>
                    {event.customProperties.location}
                  </span>
                </div>
              )}
              {event.customProperties?.capacity && (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.events.list.capacity", { count: event.customProperties.capacity as number })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
              <button
                onClick={() => onEdit(event._id)}
                className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
                title={t("ui.events.action.edit")}
              >
                <Edit2 size={12} />
                {t("ui.events.action.edit")}
              </button>

              {event.status === "draft" && (
                <button
                  onClick={() => handlePublish(event._id)}
                  className="flex-1 px-2 py-1.5 text-xs font-bold flex items-center justify-center gap-1 border-2 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                  }}
                  title={t("ui.events.action.publish")}
                >
                  <CheckCircle size={12} />
                  {t("ui.events.action.publish")}
                </button>
              )}

              <button
                onClick={() => handleDelete(event._id)}
                className="px-2 py-1.5 text-xs font-bold flex items-center justify-center border-2 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--error)",
                }}
                title={t("ui.events.action.cancel_event")}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
