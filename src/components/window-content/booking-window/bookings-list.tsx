"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { Search, Filter, Plus, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { BookingFormModal } from "./booking-form-modal"
import { useNotification } from "@/hooks/use-notification"

interface BookingsListProps {
  selectedId: Id<"objects"> | null
  onSelect: (id: Id<"objects">) => void
}

type BookingStatus = "pending_confirmation" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show" | ""
type BookingSubtype = "appointment" | "reservation" | "rental" | "class_enrollment" | ""

export function BookingsList({ selectedId, onSelect }: BookingsListProps) {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id
  const notification = useNotification()

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<BookingStatus>("")
  const [subtypeFilter, setSubtypeFilter] = useState<BookingSubtype>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Query bookings
  const bookingsData = useQuery(
    api.bookingOntology.getOrganizationBookings,
    sessionId && currentOrganizationId
      ? {
          sessionId,
          organizationId: currentOrganizationId as Id<"organizations">,
          status: statusFilter || undefined,
          subtype: subtypeFilter || undefined,
        }
      : "skip"
  )

  if (!sessionId || !currentOrganizationId) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
        <p className="font-pixel text-sm">Please log in</p>
        <p className="text-xs mt-2">Login required to view bookings</p>
      </div>
    )
  }

  const bookings = bookingsData?.bookings || []

  // Filter bookings by search
  const filteredBookings = bookings.filter((booking) => {
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
      case "pending_confirmation": return "Pending"
      case "confirmed": return "Confirmed"
      case "checked_in": return "Checked In"
      case "completed": return "Completed"
      case "cancelled": return "Cancelled"
      case "no_show": return "No Show"
      default: return status
    }
  }

  const getSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case "appointment": return "Appointment"
      case "reservation": return "Reservation"
      case "rental": return "Rental"
      case "class_enrollment": return "Class"
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
      {/* Header with search and filters */}
      <div className="p-3 border-b-2 space-y-2" style={{ background: 'var(--win95-bg)', borderColor: 'var(--win95-border)' }}>
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
            <input
              type="text"
              placeholder="Search bookings..."
              className="w-full pl-8 pr-2 py-1.5 border-2 focus:outline-none text-sm"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`retro-button px-3 py-1.5 flex items-center gap-1 ${
              showFilters ? "shadow-inner" : ""
            }`}
            style={{
              background: showFilters ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
              color: showFilters ? 'var(--win95-selected-text)' : 'var(--win95-text)'
            }}
          >
            <Filter size={14} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="retro-button px-3 py-1.5 flex items-center gap-1"
            style={{
              background: 'var(--win95-button-face)',
              color: 'var(--win95-text)'
            }}
          >
            <Plus size={14} />
            <span className="text-xs">New</span>
          </button>
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus)}
              className="px-2 py-1 border-2 text-xs"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            >
              <option value="">All Status</option>
              <option value="pending_confirmation">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
            <select
              value={subtypeFilter}
              onChange={(e) => setSubtypeFilter(e.target.value as BookingSubtype)}
              className="px-2 py-1 border-2 text-xs"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-input-bg)',
                color: 'var(--win95-input-text)'
              }}
            >
              <option value="">All Types</option>
              <option value="appointment">Appointment</option>
              <option value="reservation">Reservation</option>
              <option value="rental">Rental</option>
              <option value="class_enrollment">Class</option>
            </select>
          </div>
        )}
      </div>

      {/* Bookings list */}
      <div className="flex-1 overflow-y-auto">
        {!bookingsData ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <p className="text-sm">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No bookings found</p>
            <p className="text-xs mt-1">Create a new booking to get started</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--win95-border)' }}>
            {filteredBookings.map((booking) => (
              <button
                key={booking._id}
                onClick={() => onSelect(booking._id)}
                className="w-full p-3 text-left hover:opacity-80 transition-opacity"
                style={{
                  background: selectedId === booking._id ? 'var(--win95-selected-bg)' : 'transparent',
                  color: selectedId === booking._id ? 'var(--win95-selected-text)' : 'var(--win95-text)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded"
                    style={{
                      background: selectedId === booking._id ? 'var(--win95-selected-text)' : 'var(--win95-selected-bg)',
                      color: selectedId === booking._id ? 'var(--win95-selected-bg)' : 'var(--win95-selected-text)'
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
                      {booking.resourceName || "No resource"} • {formatDateTime(booking.startDateTime)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{
                          background: 'var(--win95-bg-light)',
                          color: 'var(--win95-text)'
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

      {/* Add Modal */}
      {showAddModal && (
        <BookingFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            notification.success("Booking created", "Your booking has been created successfully.")
          }}
        />
      )}
    </div>
  )
}
