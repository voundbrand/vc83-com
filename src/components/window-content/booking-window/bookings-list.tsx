"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { BookingFormModal } from "./booking-form-modal"
import { useNotification } from "@/hooks/use-notification"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import {
  InteriorTabButton,
  InteriorTabRow,
} from "@/components/window-content/shared/interior-primitives"

// Workaround for Convex deep type instantiation issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _api = require("../../../../convex/_generated/api").api
} catch {
  _api = null
}

interface BookingsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

interface BookingListRow {
  _id: Id<"objects">
  customerEmail?: string
  customerName?: string
  participants: number
  resourceName?: string
  startDateTime: number
  status: string
  subtype: string
}

type BookingSubtype = "appointment" | "reservation" | "rental" | "class_enrollment" | ""

const STATUS_TABS = [
  { key: "upcoming", labelKey: "ui.app.booking.list.tabs.upcoming", fallback: "Upcoming" },
  { key: "unconfirmed", labelKey: "ui.app.booking.list.tabs.unconfirmed", fallback: "Unconfirmed" },
  { key: "past", labelKey: "ui.app.booking.list.tabs.past", fallback: "Past" },
  { key: "cancelled", labelKey: "ui.app.booking.list.tabs.cancelled", fallback: "Cancelled" },
] as const

type StatusTab = typeof STATUS_TABS[number]["key"]

const getStatusesForTab = (tab: StatusTab): string[] => {
  switch (tab) {
    case "upcoming": return ["confirmed", "checked_in"]
    case "unconfirmed": return ["pending_confirmation"]
    case "past": return ["completed"]
    case "cancelled": return ["cancelled", "no_show"]
  }
}

export function BookingsList({ selectedId, onSelect }: BookingsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<StatusTab>("upcoming")
  const [subtypeFilter, setSubtypeFilter] = useState<BookingSubtype>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateView, setShowCreateView] = useState(false)

  // Query bookings
  const bookingsData = useQuery(
    _api?.bookingOntology?.getOrganizationBookings,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          subtype: subtypeFilter || undefined,
        }
      : "skip"
  ) as { bookings?: BookingListRow[] } | undefined

  const getEmptyMessage = (tab: StatusTab): string => {
    switch (tab) {
      case "upcoming": return tWithFallback("ui.app.booking.list.empty.upcoming", "No upcoming bookings")
      case "unconfirmed": return tWithFallback("ui.app.booking.list.empty.unconfirmed", "No unconfirmed bookings")
      case "past": return tWithFallback("ui.app.booking.list.empty.past", "No past bookings")
      case "cancelled": return tWithFallback("ui.app.booking.list.empty.cancelled", "No cancelled bookings")
    }
  }

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
          {tWithFallback("ui.app.booking.auth.login_required_title", "Please log in")}
        </p>
        <p className="text-xs mt-2">
          {tWithFallback("ui.app.booking.auth.login_required_bookings_hint", "Login required to view bookings")}
        </p>
      </div>
    )
  }

  if (showCreateView) {
    return (
      <BookingFormModal
        onClose={() => setShowCreateView(false)}
        onSuccess={() => {
          setShowCreateView(false)
          notification.success(
            tWithFallback("ui.app.booking.notifications.created_title", "Booking created"),
            tWithFallback("ui.app.booking.notifications.created_body", "Your booking has been created successfully."),
          )
        }}
      />
    )
  }

  const bookings = bookingsData?.bookings || []

  // Filter bookings by tab, search, and subtype
  const filteredBookings = bookings.filter((booking) => {
    // Tab filter
    const tabStatuses = getStatusesForTab(activeTab)
    if (!tabStatuses.includes(booking.status || "")) return false

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const customerName = booking.customerName?.toLowerCase() || ""
      const customerEmail = booking.customerEmail?.toLowerCase() || ""
      const resourceName = booking.resourceName?.toLowerCase() || ""

      if (
        !customerName.includes(searchLower) &&
        !customerEmail.includes(searchLower) &&
        !resourceName.includes(searchLower)
      ) {
        return false
      }
    }

    // Subtype filter
    if (subtypeFilter && booking.subtype !== subtypeFilter) return false

    return true
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_confirmation": return <AlertCircle size={14} className="text-yellow-500" />
      case "confirmed": return <CheckCircle size={14} className="text-blue-500" />
      case "checked_in": return <User size={14} className="text-green-500" />
      case "completed": return <CheckCircle size={14} className="text-green-600" />
      case "cancelled": return <XCircle size={14} className="text-red-500" />
      case "no_show": return <XCircle size={14} className="text-gray-500" />
      default: return <Clock size={14} />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_confirmation": return tWithFallback("ui.app.booking.status.pending_confirmation_short", "Pending")
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
      default: return subtype
    }
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status Tabs */}
      <InteriorTabRow
        className="gap-1 px-3 pt-3 pb-1"
        role="tablist"
        aria-label={tWithFallback("ui.app.booking.list.tabs.aria_label", "Booking status filters")}
      >
        {STATUS_TABS.map((tab) => (
          <InteriorTabButton
            key={tab.key}
            active={activeTab === tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 text-xs"
          >
            {tWithFallback(tab.labelKey, tab.fallback)}
          </InteriorTabButton>
        ))}
      </InteriorTabRow>

      {/* Header with search and filters */}
      <div className="p-3 border-b space-y-2" style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--desktop-menu-text-muted)" }}
            />
            <input
              type="text"
              placeholder={tWithFallback("ui.app.booking.list.search_placeholder", "Search bookings...")}
              aria-label={tWithFallback("ui.app.booking.list.search_aria_label", "Search bookings")}
              className="desktop-interior-input w-full h-8 pr-2 py-1.5 text-sm"
              style={{ paddingLeft: "2.25rem" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`desktop-interior-button px-3 py-1.5 flex items-center gap-1 ${
              showFilters ? "desktop-interior-button-primary" : "desktop-interior-button-subtle"
            }`}
            aria-pressed={showFilters}
            aria-label={tWithFallback("ui.app.booking.filters.toggle", "Toggle booking filters")}
            title={tWithFallback("ui.app.booking.filters.toggle", "Toggle booking filters")}
          >
            <Filter size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateView(true)}
            className="desktop-interior-button desktop-interior-button-primary px-3 py-1.5 flex items-center gap-1"
            title={tWithFallback("ui.app.booking.actions.new_booking", "Create booking")}
          >
            <Plus size={14} />
            <span className="text-xs">{tWithFallback("ui.app.booking.actions.new", "New")}</span>
          </button>
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={subtypeFilter}
              onChange={(e) => setSubtypeFilter(e.target.value as BookingSubtype)}
              aria-label={tWithFallback("ui.app.booking.filters.subtype", "Filter by booking type")}
              className="desktop-interior-select h-8 w-auto px-2 py-1 text-xs"
            >
              <option value="">{tWithFallback("ui.app.booking.filters.all_types", "All Types")}</option>
              <option value="appointment">{tWithFallback("ui.app.booking.subtype.appointment", "Appointment")}</option>
              <option value="reservation">{tWithFallback("ui.app.booking.subtype.reservation", "Reservation")}</option>
              <option value="rental">{tWithFallback("ui.app.booking.subtype.rental", "Rental")}</option>
              <option value="class_enrollment">{tWithFallback("ui.app.booking.subtype.class_enrollment", "Class")}</option>
            </select>
          </div>
        )}
        <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {tWithFallback(
            "ui.app.booking.list.result_count",
            filteredBookings.length === 1
              ? "1 booking"
              : `${filteredBookings.length} bookings`,
            { count: filteredBookings.length },
          )}
        </p>
      </div>

      {/* Bookings list */}
      <div className="flex-1 overflow-y-auto">
        {!bookingsData ? (
          <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
            <p className="text-sm">{tWithFallback("ui.app.booking.list.loading", "Loading bookings...")}</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{getEmptyMessage(activeTab)}</p>
            <p className="text-xs mt-1">
              {activeTab === "upcoming"
                ? tWithFallback("ui.app.booking.list.empty.upcoming_hint", "Create a new booking to get started")
                : tWithFallback("ui.app.booking.list.empty.generic_hint", "Nothing to show here")}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--window-document-border)" }}>
            {filteredBookings.map((booking) => (
              <button
                key={booking._id}
                type="button"
                onClick={() => onSelect(booking._id)}
                className="w-full p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset hover:bg-[var(--desktop-menu-hover)]"
                aria-pressed={selectedId === booking._id}
                aria-label={tWithFallback(
                  "ui.app.booking.list.row_aria_label",
                  "{name} at {time}",
                  {
                    name: booking.customerName || tWithFallback("ui.app.booking.list.unknown_customer", "Unknown customer"),
                    time: formatDateTime(booking.startDateTime),
                  },
                )}
                style={{
                  background: selectedId === booking._id ? "var(--desktop-menu-hover)" : "transparent",
                  color: "var(--window-document-text)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded"
                    style={{
                      background: selectedId === booking._id ? "var(--window-document-border)" : "var(--desktop-menu-hover)",
                      color: "var(--window-document-text)",
                    }}
                  >
                    <Calendar size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{booking.customerName}</span>
                      {getStatusIcon(booking.status)}
                    </div>
                    <p className="text-xs truncate opacity-70 mt-0.5">
                      {booking.resourceName || tWithFallback("ui.app.booking.list.no_resource", "No resource")} • {formatDateTime(booking.startDateTime)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          background: "var(--desktop-menu-hover)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        {getSubtypeLabel(booking.subtype)}
                      </span>
                      <span className="text-xs opacity-60">
                        {getStatusLabel(booking.status)}
                      </span>
                      {booking.participants > 1 && (
                        <span className="text-xs opacity-60 flex items-center gap-1">
                          <User size={10} /> {booking.participants}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
