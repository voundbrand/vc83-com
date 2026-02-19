"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth } from "@/hooks/use-auth"
import { MapPin, Clock, Mail, Phone, Globe, Building2, Monitor, Trash2 } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"
import { useState } from "react"

interface LocationDetailProps {
  locationId: Id<"objects">
}

export function LocationDetail({ locationId }: LocationDetailProps) {
  const { sessionId } = useAuth()
  const notification = useNotification()
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
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">Please log in</p>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="text-sm">Loading location details...</p>
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
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun"
    }

    return days.map(day => {
      const hours = operatingHours[day]
      if (!hours || !hours.open || !hours.close) return { day: dayLabels[day], hours: "Closed" }
      return { day: dayLabels[day], hours: `${hours.open} - ${hours.close}` }
    })
  }

  const handleArchive = async () => {
    try {
      await archiveLocation({ sessionId, locationId })
      notification.success("Location archived", "The location has been archived.")
      setShowDeleteDialog(false)
    } catch {
      notification.error("Error", "Failed to archive location.")
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

  const formattedAddress = formatAddress()
  const formattedHours = formatOperatingHours()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="p-3 rounded-lg"
            style={{
              background: 'var(--shell-selection-bg)',
              color: 'var(--shell-selection-text)'
            }}
          >
            {getSubtypeIcon(location.subtype || "venue")}
          </div>
          <h2 className="font-pixel text-sm truncate">{location.name}</h2>
          <span className="text-xs opacity-70 capitalize shrink-0">{location.subtype?.replace("_", " ") || "Location"}</span>
        </div>
        <span
          className="px-3 py-1 text-xs font-medium rounded-lg capitalize"
          style={{
            background: getStatusColor(location.status || "active"),
            color: 'white'
          }}
        >
          {location.status || "active"}
        </span>
      </div>

      {/* Address */}
      {formattedAddress && (
        <div
          className="p-3 rounded-lg border"
          style={{
            background: 'var(--desktop-shell-accent)',
            borderColor: 'var(--window-document-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} />
            <span className="font-medium text-sm">Address</span>
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
          style={{
            background: 'var(--desktop-shell-accent)',
            borderColor: 'var(--window-document-border)'
          }}
        >
          <div className="flex items-center gap-2">
            <Globe size={16} />
            <span className="text-sm">Timezone: <strong>{props.timezone}</strong></span>
          </div>
        </div>
      ) : null}

      {/* Operating Hours */}
      {formattedHours && (
        <div
          className="p-3 rounded-lg border"
          style={{
            background: 'var(--desktop-shell-accent)',
            borderColor: 'var(--window-document-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} />
            <span className="font-medium text-sm">Operating Hours</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm">
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
          style={{
            background: 'var(--desktop-shell-accent)',
            borderColor: 'var(--window-document-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Mail size={16} />
            <span className="font-medium text-sm">Contact</span>
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
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="desktop-interior-button px-3 py-1.5 flex items-center gap-1 text-xs"
            style={{ background: 'var(--error-bg)', color: 'white' }}
          >
            <Trash2 size={14} /> Archive
          </button>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "var(--modal-overlay-bg)" }}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            className="p-4 rounded-xl border max-w-md w-full"
            style={{
              background: 'var(--window-document-bg)',
              borderColor: 'var(--window-document-border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-pixel text-sm mb-3">Archive Location</h3>
            <p className="text-sm mb-4">
              Are you sure you want to archive "{location.name}"? This location will no longer be available for new bookings.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleArchive}
                className="desktop-interior-button px-4 py-2 text-xs flex-1"
                style={{ background: 'var(--error-bg)', color: 'white' }}
              >
                Archive Location
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="desktop-interior-button px-4 py-2 text-xs"
                style={{ background: 'var(--shell-button-surface)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
