"use client"

import { useQuery, useMutation } from "convex/react"
import { useAuth } from "@/hooks/use-auth"
import { Calendar, Clock, User, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle, Users, Mail, Phone } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { useNotification } from "@/hooks/use-notification"
import { useState } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { InteriorBadge } from "@/components/window-content/shared/interior-primitives"

// Workaround for Convex deep type instantiation issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _api = require("../../../../convex/_generated/api").api
} catch {
  _api = null
}

interface BookingDetailProps {
  bookingId: Id<"objects">
}

export function BookingDetail({ bookingId }: BookingDetailProps) {
  const { sessionId } = useAuth()
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const [cancellationReason, setCancellationReason] = useState("")
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const booking = useQuery(
    _api?.bookingOntology?.getBookingDetail,
    sessionId
      ? { sessionId, bookingId }
      : "skip"
  ) as any

  const confirmBooking = useMutation(_api?.bookingOntology?.confirmBooking)
  const checkInBooking = useMutation(_api?.bookingOntology?.checkInBooking)
  const completeBooking = useMutation(_api?.bookingOntology?.completeBooking)
  const cancelBooking = useMutation(_api?.bookingOntology?.cancelBooking)
  const markNoShow = useMutation(_api?.bookingOntology?.markNoShow)

  if (!sessionId) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tWithFallback("ui.app.booking.auth.login_required_title", "Please log in")}
        </p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <p className="text-sm">
          {tWithFallback("ui.app.booking.detail.loading", "Loading booking details...")}
        </p>
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
      case "pending_confirmation": return "var(--warning-bg)"
      case "confirmed": return "var(--info-bg)"
      case "checked_in": return "var(--success-bg)"
      case "completed": return "var(--success-bg)"
      case "cancelled": return "var(--error-bg)"
      case "no_show": return "var(--error-bg)"
      default: return "var(--desktop-shell-accent)"
    }
  }

  const getStatusTone = (status: string): "success" | "warn" | "error" | "info" | "default" => {
    switch (status) {
      case "pending_confirmation":
        return "warn"
      case "confirmed":
        return "info"
      case "checked_in":
      case "completed":
        return "success"
      case "cancelled":
      case "no_show":
        return "error"
      default:
        return "default"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_confirmation": return tWithFallback("ui.app.booking.status.pending_confirmation", "Pending Confirmation")
      case "confirmed": return tWithFallback("ui.app.booking.status.confirmed", "Confirmed")
      case "checked_in": return tWithFallback("ui.app.booking.status.checked_in", "Checked In")
      case "completed": return tWithFallback("ui.app.booking.status.completed", "Completed")
      case "cancelled": return tWithFallback("ui.app.booking.status.cancelled", "Cancelled")
      case "no_show": return tWithFallback("ui.app.booking.status.no_show", "No Show")
      default: return status
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "appointment": return tWithFallback("ui.app.booking.subtype.appointment", "Appointment")
      case "reservation": return tWithFallback("ui.app.booking.subtype.reservation", "Reservation")
      case "rental": return tWithFallback("ui.app.booking.subtype.rental", "Rental")
      case "class_enrollment": return tWithFallback("ui.app.booking.subtype.class_enrollment", "Class")
      default: return subtype.replace("_", " ")
    }
  }

  const detailPanelStyle = {
    background: "var(--desktop-shell-accent)",
    borderColor: "var(--window-document-border)",
  } as const

  const attentionPanelStyle = {
    background: "var(--tone-warning-soft)",
    borderColor: "var(--tone-warning)",
  } as const

  const actionButtonClassName =
    "desktop-interior-button px-3 py-1.5 flex items-center gap-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"

  const handleConfirm = async () => {
    try {
      await confirmBooking({ sessionId, bookingId })
      notification.success(
        tWithFallback("ui.app.booking.notifications.confirmed_title", "Booking confirmed"),
        tWithFallback("ui.app.booking.notifications.confirmed_body", "The booking has been confirmed."),
      )
    } catch {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.notifications.confirm_failed", "Failed to confirm booking."),
      )
    }
  }

  const handleCheckIn = async () => {
    try {
      await checkInBooking({ sessionId, bookingId })
      notification.success(
        tWithFallback("ui.app.booking.notifications.checked_in_title", "Checked in"),
        tWithFallback("ui.app.booking.notifications.checked_in_body", "The customer has been checked in."),
      )
    } catch {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.notifications.check_in_failed", "Failed to check in."),
      )
    }
  }

  const handleComplete = async () => {
    try {
      await completeBooking({ sessionId, bookingId })
      notification.success(
        tWithFallback("ui.app.booking.notifications.completed_title", "Completed"),
        tWithFallback("ui.app.booking.notifications.completed_body", "The booking has been marked as completed."),
      )
    } catch {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.notifications.complete_failed", "Failed to complete booking."),
      )
    }
  }

  const handleCancel = async () => {
    try {
      await cancelBooking({
        sessionId,
        bookingId,
        reason: cancellationReason || undefined,
      })
      notification.success(
        tWithFallback("ui.app.booking.notifications.cancelled_title", "Cancelled"),
        tWithFallback("ui.app.booking.notifications.cancelled_body", "The booking has been cancelled."),
      )
      setShowCancelDialog(false)
      setCancellationReason("")
    } catch {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.notifications.cancel_failed", "Failed to cancel booking."),
      )
    }
  }

  const handleNoShow = async () => {
    try {
      await markNoShow({ sessionId, bookingId })
      notification.success(
        tWithFallback("ui.app.booking.notifications.no_show_title", "Marked as No Show"),
        tWithFallback("ui.app.booking.notifications.no_show_body", "The booking has been marked as no show."),
      )
    } catch {
      notification.error(
        tWithFallback("ui.app.booking.notifications.error_title", "Error"),
        tWithFallback("ui.app.booking.notifications.no_show_failed", "Failed to mark as no show."),
      )
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3" style={detailPanelStyle}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-pixel text-sm truncate">{booking.customerName}</h2>
          <span className="shrink-0 text-xs capitalize opacity-70">{getSubtypeLabel(booking.subtype)}</span>
        </div>
        <InteriorBadge
          tone={getStatusTone(booking.status)}
          className="px-3 py-1 text-xs font-medium"
          style={{ background: getStatusColor(booking.status) }}
        >
          {getStatusLabel(booking.status)}
        </InteriorBadge>
      </div>

      {/* Time Info */}
      <div
        className="p-3 rounded-lg border"
        style={detailPanelStyle}
      >
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} />
          <span className="font-medium text-sm">
            {tWithFallback("ui.app.booking.detail.date_time", "Date & Time")}
          </span>
        </div>
        <p className="text-sm">{formatDateTime(booking.startDateTime)}</p>
        <p className="text-xs opacity-70 mt-1">
          {tWithFallback(
            "ui.app.booking.detail.duration_and_end",
            "Duration: {duration} • Ends at {endTime}",
            {
              duration: formatDuration(booking.duration),
              endTime: new Date(booking.endDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            },
          )}
        </p>
        <p className="text-xs opacity-70">
          {tWithFallback("ui.app.booking.detail.timezone", "Timezone: {timezone}", { timezone: booking.timezone })}
        </p>
      </div>

      {/* Customer Info */}
      <div
        className="p-3 rounded-lg border"
        style={detailPanelStyle}
      >
        <div className="flex items-center gap-2 mb-2">
          <User size={16} />
          <span className="font-medium text-sm">
            {tWithFallback("ui.app.booking.detail.customer", "Customer")}
          </span>
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
              <Users size={12} />{" "}
              {tWithFallback("ui.app.booking.detail.participants_count", "{count} participants", {
                count: booking.participants,
              })}
            </p>
          )}
        </div>
        {booking.guestDetails && booking.guestDetails.length > 0 && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--window-document-border)' }}>
            <p className="text-xs font-medium mb-1">
              {tWithFallback("ui.app.booking.detail.additional_guests", "Additional Guests:")}
            </p>
            {booking.guestDetails.map((guest: { name?: string; email?: string }, i: number) => (
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
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
          {booking.resourceName && (
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} />
              <span className="text-sm">
                {tWithFallback("ui.app.booking.detail.resource", "Resource:")} <strong>{booking.resourceName}</strong>
              </span>
            </div>
          )}
          {booking.locationName && (
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span className="text-sm">
                {tWithFallback("ui.app.booking.detail.location", "Location:")} <strong>{booking.locationName}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Info */}
      {booking.totalAmountCents > 0 && (
        <div
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} />
            <span className="font-medium text-sm">
              {tWithFallback("ui.app.booking.detail.payment", "Payment")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs opacity-70">{tWithFallback("ui.app.booking.detail.total", "Total")}</p>
              <p className="font-medium">{formatCurrency(booking.totalAmountCents)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">{tWithFallback("ui.app.booking.detail.paid", "Paid")}</p>
              <p className="font-medium">{formatCurrency(booking.paidAmountCents)}</p>
            </div>
            {booking.depositAmountCents > 0 && (
              <div>
                <p className="text-xs opacity-70">{tWithFallback("ui.app.booking.detail.deposit", "Deposit")}</p>
                <p className="font-medium">{formatCurrency(booking.depositAmountCents)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div
          className="p-3 rounded-lg border"
          style={detailPanelStyle}
        >
          <p className="text-xs font-medium mb-1">{tWithFallback("ui.app.booking.detail.notes", "Notes")}</p>
          <p className="text-sm">{booking.notes}</p>
        </div>
      )}

      {/* Internal Notes (admin only) */}
      {booking.internalNotes && (
        <div
          className="p-3 rounded-lg border"
          style={attentionPanelStyle}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--tone-warning)" }}>
            {tWithFallback("ui.app.booking.detail.internal_notes", "Internal Notes")}
          </p>
          <p className="text-sm" style={{ color: "var(--window-document-text)" }}>{booking.internalNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'var(--window-document-border)' }}>
        {booking.status === "pending_confirmation" && (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              className={`${actionButtonClassName} desktop-interior-button-primary`}
            >
              <CheckCircle size={14} /> {tWithFallback("ui.app.booking.actions.confirm", "Confirm")}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className={`${actionButtonClassName} desktop-interior-button-danger`}
            >
              <XCircle size={14} /> {tWithFallback("ui.app.booking.actions.decline", "Decline")}
            </button>
          </>
        )}

        {booking.status === "confirmed" && (
          <>
            <button
              type="button"
              onClick={handleCheckIn}
              className={`${actionButtonClassName} desktop-interior-button-primary`}
            >
              <User size={14} /> {tWithFallback("ui.app.booking.actions.check_in", "Check In")}
            </button>
            <button
              type="button"
              onClick={handleNoShow}
              className={`${actionButtonClassName} desktop-interior-button-subtle`}
            >
              <AlertCircle size={14} /> {tWithFallback("ui.app.booking.actions.no_show", "No Show")}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className={`${actionButtonClassName} desktop-interior-button-danger`}
            >
              <XCircle size={14} /> {tWithFallback("ui.app.booking.actions.cancel", "Cancel")}
            </button>
          </>
        )}

        {booking.status === "checked_in" && (
          <button
            type="button"
            onClick={handleComplete}
            className={`${actionButtonClassName} desktop-interior-button-primary`}
          >
            <CheckCircle size={14} /> {tWithFallback("ui.app.booking.actions.complete", "Complete")}
          </button>
        )}
      </div>

      {/* Inline Cancel Panel */}
      {showCancelDialog && (
        <div
          className="p-4 rounded-xl border"
          style={{
            background: "var(--window-document-bg)",
            borderColor: "var(--window-document-border)",
          }}
          role="region"
          aria-labelledby="booking-cancel-dialog-title"
        >
          <h3 id="booking-cancel-dialog-title" className="font-pixel text-sm mb-3">
            {tWithFallback("ui.app.booking.cancel_dialog.title", "Cancel Booking")}
          </h3>
          <textarea
            placeholder={tWithFallback("ui.app.booking.cancel_dialog.reason_placeholder", "Reason for cancellation (optional)")}
            aria-label={tWithFallback("ui.app.booking.cancel_dialog.reason_aria_label", "Cancellation reason")}
            className="desktop-interior-textarea w-full p-2 text-sm resize-none h-24"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
              color: "var(--window-document-text)",
            }}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="desktop-interior-button desktop-interior-button-danger px-4 py-2 text-xs flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
            >
              {tWithFallback("ui.app.booking.cancel_dialog.confirm_button", "Cancel Booking")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCancelDialog(false)
                setCancellationReason("")
              }}
              className="desktop-interior-button desktop-interior-button-subtle px-4 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
            >
              {tWithFallback("ui.app.booking.cancel_dialog.keep_button", "Keep Booking")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
