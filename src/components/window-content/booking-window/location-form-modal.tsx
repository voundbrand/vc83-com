"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { ArrowLeft, MapPin, Building2, Monitor, Globe } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

interface LocationFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

type LocationSubtype = "branch" | "venue" | "virtual"

export function LocationFormModal({
  onClose,
  onSuccess,
}: LocationFormModalProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id as Id<"organizations">
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")

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
      setError(tWithFallback("ui.app.booking.location.form.errors.login_required", "Please log in to create a location"))
      return
    }

    if (!name) {
      setError(tWithFallback("ui.app.booking.location.form.errors.name_required", "Location name is required"))
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
      setError(err instanceof Error ? err.message : tWithFallback("ui.app.booking.location.form.errors.create_failed", "Failed to create location"))
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
    <div className="h-full overflow-y-auto p-4 sm:p-6" style={{ background: "var(--window-document-bg)" }}>
      <div
        className="mx-auto w-full max-w-2xl rounded-xl border"
        style={{
          background: "var(--window-document-bg)",
          borderColor: "var(--window-document-border)",
        }}
      >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{
          background: "var(--desktop-shell-accent)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <MapPin size={16} />
          {tWithFallback("ui.app.booking.location.form.title", "New Location")}
        </span>
        <button
          onClick={onClose}
          className="desktop-interior-button desktop-interior-button-ghost h-8 w-8 p-0"
          aria-label={tWithFallback("ui.app.booking.nav.back", "Back")}
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium block mb-1">
              {tWithFallback("ui.app.booking.location.form.name", "Location Name *")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tWithFallback("ui.app.booking.location.form.name_placeholder", "Main Office, Downtown Studio, etc.")}
              className="desktop-interior-input w-full px-2 py-1.5 text-sm"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium block mb-1">
              {tWithFallback("ui.app.booking.location.form.type", "Location Type")}
            </label>
            <div className="flex gap-2">
              {(["branch", "venue", "virtual"] as LocationSubtype[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSubtype(type)}
                  className={`desktop-interior-button flex-1 py-2 flex items-center justify-center gap-2 text-xs ${
                    subtype === type ? "desktop-interior-button-primary" : "desktop-interior-button-subtle"
                  }`}
                >
                  {getSubtypeIcon(type)}
                  {type === "branch"
                    ? tWithFallback("ui.app.booking.location.subtype.branch", "Branch")
                    : type === "venue"
                      ? tWithFallback("ui.app.booking.location.subtype.venue", "Venue")
                      : tWithFallback("ui.app.booking.location.subtype.virtual", "Virtual")}
                </button>
              ))}
            </div>
          </div>

          {/* Address (only for non-virtual) */}
          {subtype !== "virtual" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin size={14} />
                {tWithFallback("ui.app.booking.location.detail.address", "Address")}
              </div>
              <div>
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.location.form.street", "Street")}</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.location.form.city", "City")}</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.location.form.state", "State/Province")}</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.location.form.postal_code", "Postal Code")}</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.location.form.country", "Country")}</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="text-xs font-medium block mb-1 flex items-center gap-1">
              <Globe size={12} />
              {tWithFallback("ui.app.booking.location.detail.timezone", "Timezone")}
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="desktop-interior-select w-full px-2 py-1.5 text-sm"
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
              <label className="text-xs font-medium block mb-1">
                {tWithFallback("ui.app.booking.location.form.contact_email", "Contact Email")}
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="desktop-interior-input w-full px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">
                {tWithFallback("ui.app.booking.location.form.contact_phone", "Contact Phone")}
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="desktop-interior-input w-full px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs p-2 rounded border" style={{ background: "var(--tone-danger-soft)", borderColor: "var(--tone-danger)", color: "var(--tone-danger)" }}>
              {error}
            </p>
          )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="desktop-interior-button desktop-interior-button-primary flex-1 py-2 text-sm"
          >
            {isSubmitting
              ? tWithFallback("ui.app.booking.actions.creating", "Creating...")
              : tWithFallback("ui.app.booking.location.form.create", "Create Location")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="desktop-interior-button desktop-interior-button-subtle px-4 py-2 text-sm"
          >
            {tWithFallback("ui.app.booking.nav.back", "Back")}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}
