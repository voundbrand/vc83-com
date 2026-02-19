"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { X, MapPin, Building2, Monitor, Globe } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

interface LocationFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

type LocationSubtype = "branch" | "venue" | "virtual"

export function LocationFormModal({ onClose, onSuccess }: LocationFormModalProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id as Id<"organizations">

  const [name, setName] = useState("")
  const [subtype, setSubtype] = useState<LocationSubtype>("venue")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("")
  const [timezone, setTimezone] = useState("America/Los_Angeles")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const createLocation = useMutation(api.locationOntology.createLocation)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!sessionId || !currentOrganizationId) {
      setError("Please log in to create a location")
      return
    }

    if (!name) {
      setError("Location name is required")
      return
    }

    setIsSubmitting(true)

    try {
      const hasAddress = street || city || state || postalCode || country

      await createLocation({
        sessionId,
        organizationId: currentOrganizationId,
        name,
        subtype,
        address: hasAddress ? {
          street: street || undefined,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
          country: country || undefined,
        } : undefined,
        timezone: timezone || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      })

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create location")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSubtypeIcon = (type: LocationSubtype) => {
    switch (type) {
      case "branch": return <Building2 size={16} />
      case "venue": return <MapPin size={16} />
      case "virtual": return <Monitor size={16} />
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="rounded border-2 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--win95-bg)',
          borderColor: 'var(--win95-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b-2"
          style={{
            background: 'var(--win95-selected-bg)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <span className="font-pixel text-sm text-white flex items-center gap-2">
            <MapPin size={16} />
            New Location
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-70"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium block mb-1">Location Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main Office, Downtown Studio, etc."
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium block mb-1">Location Type</label>
            <div className="flex gap-2">
              {(["branch", "venue", "virtual"] as LocationSubtype[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSubtype(type)}
                  className={`desktop-interior-button flex-1 py-2 flex items-center justify-center gap-2 text-xs ${
                    subtype === type ? "shadow-inner" : ""
                  }`}
                  style={{
                    background: subtype === type ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
                    color: subtype === type ? 'var(--win95-selected-text)' : 'var(--win95-text)'
                  }}
                >
                  {getSubtypeIcon(type)}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Address (only for non-virtual) */}
          {subtype !== "virtual" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin size={14} />
                Address
              </div>
              <div>
                <label className="text-xs block mb-1">Street</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-input-bg)',
                    color: 'var(--win95-input-text)'
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-2 py-1.5 border-2 text-sm"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-input-bg)',
                      color: 'var(--win95-input-text)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1">State/Province</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-2 py-1.5 border-2 text-sm"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-input-bg)',
                      color: 'var(--win95-input-text)'
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-2 py-1.5 border-2 text-sm"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-input-bg)',
                      color: 'var(--win95-input-text)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-2 py-1.5 border-2 text-sm"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-input-bg)',
                      color: 'var(--win95-input-text)'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="text-xs font-medium block mb-1 flex items-center gap-1">
              <Globe size={12} />
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            >
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Europe/Berlin">Berlin (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Shanghai">Shanghai (CST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-2 py-1.5 border-2 text-sm"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-input-bg)',
                  color: 'var(--win95-input-text)'
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs p-2 rounded" style={{ background: 'var(--win95-error-bg)', color: 'white' }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="desktop-interior-button flex-1 py-2 text-sm"
              style={{
                background: 'var(--win95-selected-bg)',
                color: 'var(--win95-selected-text)',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? "Creating..." : "Create Location"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-sm"
              style={{ background: 'var(--win95-button-face)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
