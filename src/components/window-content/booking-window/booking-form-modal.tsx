"use client"

import { useState, useMemo, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { X, Calendar, User, Clock, DollarSign, Info } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"

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

export function BookingFormModal({ onClose, onSuccess }: BookingFormModalProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id as Id<"organizations">

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

  const createBooking = useMutation(api.bookingOntology.createBooking)

  // Get bookable resources
  const products = useQuery(
    api.productOntology.getProducts,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId }
      : "skip"
  )

  // Get locations
  const locations = useQuery(
    api.locationOntology.getLocations,
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
      setError("Please log in to create a booking")
      return
    }

    if (!customerName || !customerEmail) {
      setError("Customer name and email are required")
      return
    }

    if (!startDate || !startTime) {
      setError("Date and time are required")
      return
    }

    if (!selectedResourceId) {
      setError("Please select a resource")
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
      setError(err instanceof Error ? err.message : "Failed to create booking")
    } finally {
      setIsSubmitting(false)
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
          background: 'var(--shell-surface)',
          borderColor: 'var(--shell-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b-2"
          style={{
            background: 'var(--shell-selection-bg)',
            borderColor: 'var(--shell-border)'
          }}
        >
          <span className="font-pixel text-sm text-white flex items-center gap-2">
            <Calendar size={16} />
            New Booking
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
          {/* Booking Type */}
          <div>
            <label className="text-xs font-medium block mb-1">Booking Type</label>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value as BookingSubtype)}
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
            >
              <option value="appointment">Appointment</option>
              <option value="reservation">Reservation</option>
              <option value="rental">Rental</option>
              <option value="class_enrollment">Class Enrollment</option>
            </select>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User size={14} />
              Customer Information
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs block mb-1">Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-input-surface)',
                    color: 'var(--shell-input-text)'
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Email *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-input-surface)',
                    color: 'var(--shell-input-text)'
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-input-surface)',
                    color: 'var(--shell-input-text)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock size={14} />
              Date & Time
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs block mb-1">Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-input-surface)',
                    color: 'var(--shell-input-text)'
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-input-surface)',
                    color: 'var(--shell-input-text)'
                  }}
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  min={15}
                  step={15}
                  className="w-full px-2 py-1.5 border-2 text-sm"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-input-surface)',
                    color: 'var(--shell-input-text)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Resource */}
          <div>
            <label className="text-xs font-medium block mb-1">Resource *</label>
            <select
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value as Id<"objects"> | "")}
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
              required
            >
              <option value="">Select a resource...</option>
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
              className="p-3 rounded border-2 space-y-2"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-surface-elevated)'
              }}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info size={14} />
                Resource Details
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Price Info */}
                <div className="flex items-center gap-1">
                  <DollarSign size={12} style={{ color: 'var(--success-bg)' }} />
                  <span>
                    {resourceConfig.pricePerUnit > 0
                      ? `${(resourceConfig.pricePerUnit / 100).toFixed(2)} / ${resourceConfig.priceUnit}`
                      : "Free"
                    }
                  </span>
                </div>

                {/* Capacity Info */}
                <div className="flex items-center gap-1">
                  <User size={12} style={{ color: 'var(--primary)' }} />
                  <span>
                    {resourceConfig.capacity > 1
                      ? `Up to ${resourceConfig.capacity} participants`
                      : "1 participant"
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
                    <span>Requires confirmation</span>
                  </div>
                )}

                {/* Deposit Info */}
                {resourceConfig.depositRequired && (
                  <div className="flex items-center gap-1 col-span-2">
                    <DollarSign size={12} style={{ color: 'var(--warning-bg)' }} />
                    <span>
                      Deposit: {resourceConfig.depositPercent > 0
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
            <label className="text-xs font-medium block mb-1">Location</label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value as Id<"objects"> | "")}
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
            >
              <option value="">No location</option>
              {activeLocations.map((location) => (
                <option key={location._id} value={location._id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs font-medium block mb-1">Number of Participants</label>
            <input
              type="number"
              value={participants}
              onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
              min={1}
              className="w-full px-2 py-1.5 border-2 text-sm"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border-2 text-sm resize-none"
              style={{
                borderColor: 'var(--shell-border)',
                background: 'var(--shell-input-surface)',
                color: 'var(--shell-input-text)'
              }}
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
            Require admin confirmation
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs p-2 rounded" style={{ background: 'var(--error-bg)', color: 'white' }}>
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
                background: 'var(--shell-selection-bg)',
                color: 'var(--shell-selection-text)',
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? "Creating..." : "Create Booking"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-sm"
              style={{ background: 'var(--shell-button-surface)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
