"use client"

import { useState } from "react"
import { Calendar, MapPin, Clock, Users } from "lucide-react"
import { BookingsList } from "./booking-window/bookings-list"
import { BookingDetail } from "./booking-window/booking-detail"
import { LocationsList } from "./booking-window/locations-list"
import { LocationDetail } from "./booking-window/location-detail"
import { ResourceAvailability } from "./booking-window/resource-availability"
import type { Id } from "../../../convex/_generated/dataModel"

type ViewType = "bookings" | "locations" | "availability"

export function BookingWindow() {
  const [activeView, setActiveView] = useState<ViewType>("bookings")
  const [selectedBookingId, setSelectedBookingId] = useState<Id<"objects"> | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<Id<"objects"> | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<Id<"objects"> | null>(null)

  // Reset selection when switching views
  const handleViewSwitch = (view: ViewType) => {
    setActiveView(view)
    setSelectedBookingId(null)
    setSelectedLocationId(null)
    setSelectedResourceId(null)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* View Switcher Tabs */}
      <div
        className="flex gap-1 border-b-2 p-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        <button
          onClick={() => handleViewSwitch("bookings")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "bookings" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "bookings" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "bookings" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Calendar size={16} />
          <span className="font-pixel text-xs">Bookings</span>
        </button>
        <button
          onClick={() => handleViewSwitch("locations")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "locations" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "locations" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "locations" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <MapPin size={16} />
          <span className="font-pixel text-xs">Locations</span>
        </button>
        <button
          onClick={() => handleViewSwitch("availability")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "availability" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "availability" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "availability" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Clock size={16} />
          <span className="font-pixel text-xs">Availability</span>
        </button>
      </div>

      {/* Content Area */}
      {activeView === "availability" ? (
        <div className="flex-1 overflow-hidden">
          <ResourceAvailability
            selectedResourceId={selectedResourceId}
            onSelectResource={setSelectedResourceId}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: List View */}
          <div
            className="w-1/2 border-r-2 overflow-y-auto"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)'
            }}
          >
            {activeView === "bookings" ? (
              <BookingsList
                selectedId={selectedBookingId}
                onSelect={setSelectedBookingId}
              />
            ) : (
              <LocationsList
                selectedId={selectedLocationId}
                onSelect={setSelectedLocationId}
              />
            )}
          </div>

          {/* Right: Detail View */}
          <div
            className="w-1/2 overflow-y-auto p-4"
            style={{ background: 'var(--win95-bg)' }}
          >
            {activeView === "bookings" ? (
              selectedBookingId ? (
                <BookingDetail bookingId={selectedBookingId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <Calendar size={48} className="mb-4 opacity-30" />
                  <p className="font-pixel text-sm">Select a booking</p>
                  <p className="text-xs mt-2">Click on a booking to view details</p>
                </div>
              )
            ) : (
              selectedLocationId ? (
                <LocationDetail locationId={selectedLocationId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <MapPin size={48} className="mb-4 opacity-30" />
                  <p className="font-pixel text-sm">Select a location</p>
                  <p className="text-xs mt-2">Click on a location to view details</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
