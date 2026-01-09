"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Calendar, Clock, User, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle, Users, Mail, Phone } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"
import { useState } from "react"

interface BookingDetailProps {
  bookingId: Id<"objects">
}

export function BookingDetail({ bookingId }: BookingDetailProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const notification = useNotification()
  const [cancellationReason, setCancellationReason] = useState("")
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const booking = useQuery(
    api.bookingOntology.getBookingDetail,
    sessionId
      ? { sessionId, bookingId }
      : "skip"
  )

  const confirmBooking = useMutation(api.bookingOntology.confirmBooking)
  const checkInBooking = useMutation(api.bookingOntology.checkInBooking)
  const completeBooking = useMutation(api.bookingOntology.completeBooking)
  const cancelBooking = useMutation(api.bookingOntology.cancelBooking)
  const markNoShow = useMutation(api.bookingOntology.markNoShow)

  if (!sessionId) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">Please log in</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="text-sm">Loading booking details...</p>
      </div>
    )
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_confirmation": return "var(--win95-warning-bg)"
      case "confirmed": return "var(--win95-info-bg)"
      case "checked_in": return "var(--win95-success-bg)"
      case "completed": return "var(--win95-success-bg)"
      case "cancelled": return "var(--win95-error-bg)"
      case "no_show": return "var(--win95-error-bg)"
      default: return "var(--win95-bg-light)"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_confirmation": return "Pending Confirmation"
      case "confirmed": return "Confirmed"
      case "checked_in": return "Checked In"
      case "completed": return "Completed"
      case "cancelled": return "Cancelled"
      case "no_show": return "No Show"
      default: return status
    }
  }

  const handleConfirm = async () => {
    try {
      await confirmBooking({ sessionId, bookingId })
      notification.success("Booking confirmed", "The booking has been confirmed.")
    } catch (error) {
      notification.error("Error", "Failed to confirm booking.")
    }
  }

  const handleCheckIn = async () => {
    try {
      await checkInBooking({ sessionId, bookingId })
      notification.success("Checked in", "The customer has been checked in.")
    } catch (error) {
      notification.error("Error", "Failed to check in.")
    }
  }

  const handleComplete = async () => {
    try {
      await completeBooking({ sessionId, bookingId })
      notification.success("Completed", "The booking has been marked as completed.")
    } catch (error) {
      notification.error("Error", "Failed to complete booking.")
    }
  }

  const handleCancel = async () => {
    try {
      await cancelBooking({
        sessionId,
        bookingId,
        reason: cancellationReason || undefined,
      })
      notification.success("Cancelled", "The booking has been cancelled.")
      setShowCancelDialog(false)
      setCancellationReason("")
    } catch (error) {
      notification.error("Error", "Failed to cancel booking.")
    }
  }

  const handleNoShow = async () => {
    try {
      await markNoShow({ sessionId, bookingId })
      notification.success("Marked as No Show", "The booking has been marked as no show.")
    } catch (error) {
      notification.error("Error", "Failed to mark as no show.")
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-pixel text-lg">{booking.customerName}</h2>
          <p className="text-sm opacity-70 mt-1 capitalize">{booking.subtype.replace("_", " ")}</p>
        </div>
        <span
          className="px-3 py-1 text-xs font-medium rounded"
          style={{
            background: getStatusColor(booking.status),
            color: 'white'
          }}
        >
          {getStatusLabel(booking.status)}
        </span>
      </div>

      {/* Time Info */}
      <div
        className="p-3 rounded border-2"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} />
          <span className="font-medium text-sm">Date & Time</span>
        </div>
        <p className="text-sm">{formatDateTime(booking.startDateTime)}</p>
        <p className="text-xs opacity-70 mt-1">
          Duration: {formatDuration(booking.duration)} • Ends at {new Date(booking.endDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="text-xs opacity-70">Timezone: {booking.timezone}</p>
      </div>

      {/* Customer Info */}
      <div
        className="p-3 rounded border-2"
        style={{
          background: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <User size={16} />
          <span className="font-medium text-sm">Customer</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{booking.customerName}</p>
          <p className="text-xs flex items-center gap-1">
            <Mail size={12} /> {booking.customerEmail}
          </p>
          {booking.customerPhone && (
            <p className="text-xs flex items-center gap-1">
              <Phone size={12} /> {booking.customerPhone}
            </p>
          )}
          {booking.participants > 1 && (
            <p className="text-xs flex items-center gap-1 mt-2">
              <Users size={12} /> {booking.participants} participants
            </p>
          )}
        </div>
        {booking.guestDetails && booking.guestDetails.length > 0 && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--win95-border)' }}>
            <p className="text-xs font-medium mb-1">Additional Guests:</p>
            {booking.guestDetails.map((guest, i) => (
              <p key={i} className="text-xs opacity-70">
                {guest.name} {guest.email && `(${guest.email})`}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Resource & Location */}
      {(booking.resourceName || booking.locationName) && (
        <div
          className="p-3 rounded border-2"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          {booking.resourceName && (
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} />
              <span className="text-sm">Resource: <strong>{booking.resourceName}</strong></span>
            </div>
          )}
          {booking.locationName && (
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span className="text-sm">Location: <strong>{booking.locationName}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Payment Info */}
      {booking.totalAmountCents > 0 && (
        <div
          className="p-3 rounded border-2"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} />
            <span className="font-medium text-sm">Payment</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs opacity-70">Total</p>
              <p className="font-medium">{formatCurrency(booking.totalAmountCents)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Paid</p>
              <p className="font-medium">{formatCurrency(booking.paidAmountCents)}</p>
            </div>
            {booking.depositAmountCents > 0 && (
              <div>
                <p className="text-xs opacity-70">Deposit</p>
                <p className="font-medium">{formatCurrency(booking.depositAmountCents)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div
          className="p-3 rounded border-2"
          style={{
            background: 'var(--win95-bg-light)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <p className="text-xs font-medium mb-1">Notes</p>
          <p className="text-sm">{booking.notes}</p>
        </div>
      )}

      {/* Internal Notes (admin only) */}
      {booking.internalNotes && (
        <div
          className="p-3 rounded border-2"
          style={{
            background: 'var(--win95-warning-bg)',
            borderColor: 'var(--win95-border)'
          }}
        >
          <p className="text-xs font-medium mb-1 text-white">Internal Notes</p>
          <p className="text-sm text-white">{booking.internalNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--win95-border)' }}>
        {booking.status === "pending_confirmation" && (
          <>
            <button
              onClick={handleConfirm}
              className="retro-button px-3 py-1.5 flex items-center gap-1 text-xs"
              style={{ background: 'var(--win95-success-bg)', color: 'white' }}
            >
              <CheckCircle size={14} /> Confirm
            </button>
            <button
              onClick={() => setShowCancelDialog(true)}
              className="retro-button px-3 py-1.5 flex items-center gap-1 text-xs"
              style={{ background: 'var(--win95-error-bg)', color: 'white' }}
            >
              <XCircle size={14} /> Decline
            </button>
          </>
        )}

        {booking.status === "confirmed" && (
          <>
            <button
              onClick={handleCheckIn}
              className="retro-button px-3 py-1.5 flex items-center gap-1 text-xs"
              style={{ background: 'var(--win95-success-bg)', color: 'white' }}
            >
              <User size={14} /> Check In
            </button>
            <button
              onClick={handleNoShow}
              className="retro-button px-3 py-1.5 flex items-center gap-1 text-xs"
              style={{ background: 'var(--win95-warning-bg)', color: 'white' }}
            >
              <AlertCircle size={14} /> No Show
            </button>
            <button
              onClick={() => setShowCancelDialog(true)}
              className="retro-button px-3 py-1.5 flex items-center gap-1 text-xs"
              style={{ background: 'var(--win95-error-bg)', color: 'white' }}
            >
              <XCircle size={14} /> Cancel
            </button>
          </>
        )}

        {booking.status === "checked_in" && (
          <button
            onClick={handleComplete}
            className="retro-button px-3 py-1.5 flex items-center gap-1 text-xs"
            style={{ background: 'var(--win95-success-bg)', color: 'white' }}
          >
            <CheckCircle size={14} /> Complete
          </button>
        )}
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCancelDialog(false)}
        >
          <div
            className="p-4 rounded border-2 max-w-md w-full mx-4"
            style={{
              background: 'var(--win95-bg)',
              borderColor: 'var(--win95-border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-pixel text-sm mb-3">Cancel Booking</h3>
            <textarea
              placeholder="Reason for cancellation (optional)"
              className="w-full p-2 border-2 text-sm resize-none h-24"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCancel}
                className="retro-button px-4 py-2 text-xs flex-1"
                style={{ background: 'var(--win95-error-bg)', color: 'white' }}
              >
                Cancel Booking
              </button>
              <button
                onClick={() => {
                  setShowCancelDialog(false)
                  setCancellationReason("")
                }}
                className="retro-button px-4 py-2 text-xs"
                style={{ background: 'var(--win95-button-face)' }}
              >
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
