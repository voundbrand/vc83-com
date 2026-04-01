"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { MapPin, Clock, Mail, Phone, Globe, Building2, Monitor, Trash2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"
import { useState } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { InteriorBadge } from "@/components/window-content/shared/interior-primitives"

interface LocationDetailProps {
  locationId: Id<"objects">
}

export function LocationDetail({ locationId }: LocationDetailProps) {
  const { sessionId } = useAuth()
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const location = useQuery(
    api.locationOntology.getLocation,
    sessionId
      ? { sessionId, locationId }
      : "skip"
  )

  const archiveLocation = useMutation(api.locationOntology.deleteLocation)

  if (!sessionId) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>{tWithFallback("ui.app.booking.auth.login_required_title", "Please log in")}</p>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <p className="text-sm">{tWithFallback("ui.app.booking.location.detail.loading", "Loading location details...")}</p>
      </div>
    )
  }

  const props = location.customProperties as Record<string, unknown> || {}
  const address = props.address as { street?: string; city?: string; state?: string; postalCode?: string; country?: string } | undefined
  const operatingHours = props.defaultOperatingHours as Record<string, { open?: string; close?: string }> | undefined

  const getSubtypeIcon = (subtype: string) => {
    switch (subtype) {
      case "branch": return <Building2 size={20} />
      case "venue": return <MapPin size={20} />
      case "virtual": return <Monitor size={20} />
      default: return <MapPin size={20} />
    }
  }

  const formatAddress = (): string[] | null => {
    if (!address) return null
    const cityLine = [address.city, address.state, address.postalCode].filter(Boolean).join(", ")
    const parts: string[] = [
      address.street,
      cityLine,
      address.country
    ].filter((part): part is string => typeof part === "string" && part.length > 0)
    return parts.length > 0 ? parts : null
  }

  const formatOperatingHours = () => {
    if (!operatingHours) return null
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const dayLabels: Record<string, string> = {
      monday: tWithFallback("ui.app.booking.days.short.monday", "Mon"),
      tuesday: tWithFallback("ui.app.booking.days.short.tuesday", "Tue"),
      wednesday: tWithFallback("ui.app.booking.days.short.wednesday", "Wed"),
      thursday: tWithFallback("ui.app.booking.days.short.thursday", "Thu"),
      friday: tWithFallback("ui.app.booking.days.short.friday", "Fri"),
      saturday: tWithFallback("ui.app.booking.days.short.saturday", "Sat"),
      sunday: tWithFallback("ui.app.booking.days.short.sunday", "Sun"),
    }

    return days.map(day => {
      const hours = operatingHours[day]
      if (!hours || !hours.open || !hours.close) {
        return { day: dayLabels[day], hours: tWithFallback("ui.app.booking.location.detail.closed", "Closed") }
      }
      return { day: dayLabels[day], hours: `${hours.open} - ${hours.close}` }
    })
  }

  const handleArchive = async () => {
    try {
      await archiveLocation({ sessionId, locationId })
      notification.success(
        tWithFallback("ui.app.booking.location.notifications.archived_title", "Location archived"),
        tWithFallback("ui.app.booking.location.notifications.archived_body", "The location has been archived."),
      )
      setShowDeleteDialog(false)
    } catch {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.location.notifications.archive_failed", "Failed to archive location."),
      )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "var(--success-bg)"
      case "inactive": return "var(--warning-bg)"
      case "archived": return "var(--error-bg)"
      default: return "var(--desktop-shell-accent)"
    }
  }

  const getStatusTone = (status?: string | null): "success" | "warn" | "error" | "default" => {
    switch (status) {
      case "active":
        return "success"
      case "inactive":
        return "warn"
      case "archived":
        return "error"
      default:
        return "default"
    }
  }

  const getSubtypeLabel = (subtype?: string | null) => {
    switch (subtype) {
      case "branch": return tWithFallback("ui.app.booking.location.subtype.branch", "Branch")
      case "venue": return tWithFallback("ui.app.booking.location.subtype.venue", "Venue")
      case "virtual": return tWithFallback("ui.app.booking.location.subtype.virtual", "Virtual")
      default: return tWithFallback("ui.app.booking.location.subtype.location", "Location")
    }
  }

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case "active": return tWithFallback("ui.app.booking.location.status.active", "Active")
      case "inactive": return tWithFallback("ui.app.booking.location.status.inactive", "Inactive")
      case "archived": return tWithFallback("ui.app.booking.location.status.archived", "Archived")
      default: return tWithFallback("ui.app.booking.location.status.active", "Active")
    }
  }

  const detailPanelStyle = {
    background: "var(--desktop-shell-accent)",
    borderColor: "var(--window-document-border)",
  } as const

  const actionButtonClassName =
    "desktop-interior-button px-3 py-1.5 flex items-center gap-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"

  const formattedAddress = formatAddress()
  const formattedHours = formatOperatingHours()

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3" style={detailPanelStyle}>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="p-3 rounded-lg"
            style={{
              background: "var(--desktop-menu-hover)",
              color: "var(--window-document-text)",
            }}
          >
            {getSubtypeIcon(location.subtype || "venue")}
          </div>
          <h2 className="font-pixel text-sm truncate">{location.name}</h2>
          <span className="text-xs opacity-70 capitalize shrink-0">{getSubtypeLabel(location.subtype)}</span>
        </div>
        <InteriorBadge
          tone={getStatusTone(location.status)}
          className="px-3 py-1 text-xs font-medium capitalize"
          style={{ background: getStatusColor(location.status || "active") }}
        >
          {getStatusLabel(location.status)}
        </InteriorBadge>
      </div>

      {/* Address */}
      {formattedAddress && (
        <div
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} />
          <span className="font-medium text-sm">
            {tWithFallback("ui.app.booking.location.detail.address", "Address")}
          </span>
        </div>
          {formattedAddress.map((line: string, i: number) => (
            <p key={i} className="text-sm">{line}</p>
          ))}
        </div>
      )}

      {/* Timezone */}
      {typeof props.timezone === "string" && props.timezone ? (
        <div
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
          <div className="flex items-center gap-2">
            <Globe size={16} />
            <span className="text-sm">
              {tWithFallback("ui.app.booking.location.detail.timezone", "Timezone:")} <strong>{props.timezone}</strong>
            </span>
          </div>
        </div>
      ) : null}

      {/* Operating Hours */}
      {formattedHours && (
        <div
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} />
          <span className="font-medium text-sm">
            {tWithFallback("ui.app.booking.location.detail.operating_hours", "Operating Hours")}
          </span>
        </div>
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {formattedHours.map(({ day, hours }) => (
              <div key={day} className="flex justify-between">
                <span className="opacity-70">{day}</span>
                <span>{hours}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info */}
      {(typeof props.contactEmail === "string" || typeof props.contactPhone === "string") ? (
        <div
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} />
          <span className="font-medium text-sm">
            {tWithFallback("ui.app.booking.location.detail.contact", "Contact")}
          </span>
        </div>
          {typeof props.contactEmail === "string" && props.contactEmail ? (
            <p className="text-sm flex items-center gap-2">
              <Mail size={12} /> {props.contactEmail}
            </p>
          ) : null}
          {typeof props.contactPhone === "string" && props.contactPhone ? (
            <p className="text-sm flex items-center gap-2 mt-1">
              <Phone size={12} /> {props.contactPhone}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      {location.status !== "archived" && (
        <div className="flex gap-2 border-t pt-3" style={{ borderColor: 'var(--window-document-border)' }}>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className={`${actionButtonClassName} desktop-interior-button-danger`}
          >
            <Trash2 size={14} /> {tWithFallback("ui.app.booking.location.actions.archive", "Archive")}
          </button>
        </div>
      )}

      {/* Inline Archive Panel */}
      {showDeleteDialog && (
        <div
          className="p-4 rounded-xl border"
          style={{
            background: "var(--window-document-bg)",
            borderColor: "var(--window-document-border)",
          }}
          role="region"
          aria-labelledby="location-archive-dialog-title"
        >
          <h3 id="location-archive-dialog-title" className="font-pixel text-sm mb-3">
            {tWithFallback("ui.app.booking.location.archive_dialog.title", "Archive Location")}
          </h3>
          <p className="text-sm mb-4">
            {tWithFallback(
              "ui.app.booking.location.archive_dialog.body",
              "Are you sure you want to archive \"{name}\"? This location will no longer be available for new bookings.",
              { name: location.name },
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleArchive}
              className="desktop-interior-button desktop-interior-button-danger px-4 py-2 text-xs flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
            >
              {tWithFallback("ui.app.booking.location.archive_dialog.confirm", "Archive Location")}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(false)}
              className="desktop-interior-button desktop-interior-button-subtle px-4 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
            >
              {tWithFallback("ui.app.booking.actions.cancel", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
