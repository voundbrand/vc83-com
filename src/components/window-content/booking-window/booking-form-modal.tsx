"use client"

import { useState, useMemo, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { ArrowLeft, Calendar, User, Clock, DollarSign, Info } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

// Workaround for Convex deep type instantiation issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _api = require("../../../../convex/_generated/api").api
} catch {
  _api = null
}

// Bookable subtypes that can be booked
const BOOKABLE_SUBTYPES = [
  "room", "staff", "equipment", "space", "vehicle", "accommodation",
  "appointment", "class", "treatment"
]

// BookableConfig interface (matching product-form)
interface BookableConfig {
  bookingMode: "calendar" | "date-range" | "both"
  minDuration: number
  maxDuration: number
  durationUnit: "minutes" | "hours" | "days" | "nights"
  slotIncrement: number
  bufferBefore: number
  bufferAfter: number
  capacity: number
  confirmationRequired: boolean
  pricePerUnit: number
  priceUnit: "hour" | "day" | "night" | "session" | "flat"
  depositRequired: boolean
  depositAmountCents: number
  depositPercent: number
}

interface BookingFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

type BookingSubtype = "appointment" | "reservation" | "rental" | "class_enrollment"

export function BookingFormModal({
  onClose,
  onSuccess,
}: BookingFormModalProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id as Id<"organizations">
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")

  const [subtype, setSubtype] = useState<BookingSubtype>("appointment")
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [selectedResourceId, setSelectedResourceId] = useState<Id<"objects"> | "">("")
  const [selectedLocationId, setSelectedLocationId] = useState<Id<"objects"> | "">("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [duration, setDuration] = useState(60)
  const [participants, setParticipants] = useState(1)
  const [notes, setNotes] = useState("")
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const createBooking = useMutation(_api?.bookingOntology?.createBooking)

  // Get bookable resources
  const products = useQuery(
    _api?.productOntology?.getProducts,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId }
      : "skip"
  )

  // Get locations
  const locations = useQuery(
    _api?.locationOntology?.getLocations,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId }
      : "skip"
  )

  // Filter to only bookable types (resources and services)
  const bookableResources = useMemo(() => {
    return (products ?? []).filter((p: { subtype?: string | null }) =>
      BOOKABLE_SUBTYPES.includes(p.subtype || "")
    )
  }, [products])

  // Get selected resource details
  const selectedResource = useMemo(() => {
    if (!selectedResourceId) return null
    return bookableResources.find((r: { _id: string }) => r._id === selectedResourceId) || null
  }, [selectedResourceId, bookableResources])

  // Extract bookable config from selected resource
  const resourceConfig = useMemo((): BookableConfig | null => {
    if (!selectedResource) return null
    const props = selectedResource.customProperties as Record<string, unknown> | undefined
    return (props?.bookableConfig as BookableConfig) || null
  }, [selectedResource])

  // Auto-populate settings when resource is selected
  useEffect(() => {
    if (resourceConfig) {
      // Set default duration from resource config
      const defaultDuration = resourceConfig.minDuration || 60
      setDuration(defaultDuration)

      // Set confirmation requirement from resource config
      setConfirmationRequired(resourceConfig.confirmationRequired || false)
    }
  }, [resourceConfig])

  const activeLocations = (locations ?? []).filter((l: { status?: string | null }) => l.status === "active")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!sessionId || !currentOrganizationId) {
      setError(tWithFallback("ui.app.booking.form.errors.login_required", "Please log in to create a booking"))
      return
    }

    if (!customerName || !customerEmail) {
      setError(tWithFallback("ui.app.booking.form.errors.customer_required", "Customer name and email are required"))
      return
    }

    if (!startDate || !startTime) {
      setError(tWithFallback("ui.app.booking.form.errors.date_time_required", "Date and time are required"))
      return
    }

    if (!selectedResourceId) {
      setError(tWithFallback("ui.app.booking.form.errors.resource_required", "Please select a resource"))
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate timestamps
      const startDateTime = new Date(`${startDate}T${startTime}`).getTime()
      const endDateTime = startDateTime + (duration * 60 * 1000)

      await createBooking({
        sessionId,
        organizationId: currentOrganizationId,
        subtype,
        startDateTime,
        endDateTime,
        resourceIds: [selectedResourceId as Id<"objects">],
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        participants,
        locationId: selectedLocationId ? selectedLocationId as Id<"objects"> : undefined,
        confirmationRequired,
        notes: notes || undefined,
        isAdminBooking: true,
      })

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : tWithFallback("ui.app.booking.form.errors.create_failed", "Failed to create booking"))
    } finally {
      setIsSubmitting(false)
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
          <Calendar size={16} />
          {tWithFallback("ui.app.booking.form.title", "New Booking")}
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
          {/* Booking Type */}
          <div>
            <label className="text-xs font-medium block mb-1">
              {tWithFallback("ui.app.booking.form.booking_type", "Booking Type")}
            </label>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value as BookingSubtype)}
              className="desktop-interior-select w-full px-2 py-1.5 text-sm"
            >
              <option value="appointment">{tWithFallback("ui.app.booking.subtype.appointment", "Appointment")}</option>
              <option value="reservation">{tWithFallback("ui.app.booking.subtype.reservation", "Reservation")}</option>
              <option value="rental">{tWithFallback("ui.app.booking.subtype.rental", "Rental")}</option>
              <option value="class_enrollment">{tWithFallback("ui.app.booking.subtype.class_enrollment_long", "Class Enrollment")}</option>
            </select>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User size={14} />
              {tWithFallback("ui.app.booking.form.customer_information", "Customer Information")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.form.customer_name", "Name *")}</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.form.customer_email", "Email *")}</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.form.customer_phone", "Phone")}</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock size={14} />
              {tWithFallback("ui.app.booking.detail.date_time", "Date & Time")}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.form.date", "Date *")}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.form.time", "Time *")}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">{tWithFallback("ui.app.booking.form.duration_minutes", "Duration (min)")}</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  min={15}
                  step={15}
                  className="desktop-interior-input w-full px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Resource */}
          <div>
            <label className="text-xs font-medium block mb-1">{tWithFallback("ui.app.booking.form.resource", "Resource *")}</label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value as Id<"objects"> | "")}
              className="desktop-interior-select w-full px-2 py-1.5 text-sm"
              required
            >
              <option value="">{tWithFallback("ui.app.booking.form.select_resource", "Select a resource...")}</option>
              {bookableResources.map((resource: { _id: string; name?: string | null; subtype?: string | null }) => (
                <option key={resource._id} value={resource._id}>
                  {resource.name} ({resource.subtype?.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {/* Resource Info Panel - Shows when resource is selected */}
          {selectedResource && resourceConfig && (
            <div
              className="p-3 rounded-lg border space-y-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--desktop-shell-accent)",
              }}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info size={14} />
                {tWithFallback("ui.app.booking.form.resource_details", "Resource Details")}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Price Info */}
                <div className="flex items-center gap-1">
                  <DollarSign size={12} style={{ color: 'var(--success-bg)' }} />
                  <span>
                    {resourceConfig.pricePerUnit > 0
                      ? `${(resourceConfig.pricePerUnit / 100).toFixed(2)} / ${resourceConfig.priceUnit}`
                      : tWithFallback("ui.app.booking.form.free", "Free")
                    }
                  </span>
                </div>

                {/* Capacity Info */}
                <div className="flex items-center gap-1">
                  <User size={12} style={{ color: 'var(--primary)' }} />
                  <span>
                    {resourceConfig.capacity > 1
                      ? tWithFallback("ui.app.booking.form.capacity_multiple", "Up to {count} participants", { count: resourceConfig.capacity })
                      : tWithFallback("ui.app.booking.form.capacity_single", "1 participant")
                    }
                  </span>
                </div>

                {/* Duration Range */}
                <div className="flex items-center gap-1">
                  <Clock size={12} style={{ color: 'var(--warning-bg)' }} />
                  <span>
                    {resourceConfig.minDuration === resourceConfig.maxDuration
                      ? `${resourceConfig.minDuration} ${resourceConfig.durationUnit}`
                      : `${resourceConfig.minDuration}-${resourceConfig.maxDuration} ${resourceConfig.durationUnit}`
                    }
                  </span>
                </div>

                {/* Confirmation Info */}
                {resourceConfig.confirmationRequired && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} style={{ color: 'var(--error-bg)' }} />
                    <span>{tWithFallback("ui.app.booking.form.requires_confirmation", "Requires confirmation")}</span>
                  </div>
                )}

                {/* Deposit Info */}
                {resourceConfig.depositRequired && (
                  <div className="flex items-center gap-1 col-span-2">
                    <DollarSign size={12} style={{ color: 'var(--warning-bg)' }} />
                    <span>
                      {tWithFallback("ui.app.booking.detail.deposit", "Deposit")}: {resourceConfig.depositPercent > 0
                        ? `${resourceConfig.depositPercent}%`
                        : `${(resourceConfig.depositAmountCents / 100).toFixed(2)}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="text-xs font-medium block mb-1">{tWithFallback("ui.app.booking.location.detail.location", "Location")}</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value as Id<"objects"> | "")}
              className="desktop-interior-select w-full px-2 py-1.5 text-sm"
            >
              <option value="">{tWithFallback("ui.app.booking.form.no_location", "No location")}</option>
              {activeLocations.map((location: { _id: string; name?: string | null }) => (
                <option key={location._id} value={location._id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs font-medium block mb-1">
              {tWithFallback("ui.app.booking.form.participants", "Number of Participants")}
            </label>
            <input
              type="number"
              value={participants}
              onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
              min={1}
              className="desktop-interior-input w-full px-2 py-1.5 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium block mb-1">{tWithFallback("ui.app.booking.detail.notes", "Notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="desktop-interior-textarea w-full px-2 py-1.5 text-sm resize-none"
            />
          </div>

          {/* Confirmation Required */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmationRequired}
              onChange={(e) => setConfirmationRequired(e.target.checked)}
              className="w-4 h-4"
            />
            {tWithFallback("ui.app.booking.form.require_admin_confirmation", "Require admin confirmation")}
          </label>

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
              : tWithFallback("ui.app.booking.form.create_booking", "Create Booking")}
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
