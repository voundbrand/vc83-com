"use client"

import { useState } from "react"
import { Calendar, MapPin, Clock, Settings, ArrowLeft, Maximize2, Wand2 } from "lucide-react"
import Link from "next/link"
import { BookingsList } from "./booking-window/bookings-list"
import { BookingDetail } from "./booking-window/booking-detail"
import { LocationsList } from "./booking-window/locations-list"
import { LocationDetail } from "./booking-window/location-detail"
import { AvailabilitySchedulesList } from "./booking-window/availability-schedules-list"
import { AvailabilityScheduleEditor } from "./booking-window/availability-schedule-editor"
import { BookingSettings } from "./booking-window/booking-settings"
import { BookingSetupWizard } from "./booking-window/booking-setup-wizard"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import type { Id } from "../../../convex/_generated/dataModel"

type ViewType = "bookings" | "locations" | "availability" | "setup" | "settings"

interface BookingWindowProps {
  initialTab?: ViewType;
  /** When true, shows back-to-desktop navigation (for /booking route) */
  fullScreen?: boolean;
}

export function BookingWindow({ initialTab, fullScreen = false }: BookingWindowProps = {}) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.booking")
  const [activeView, setActiveView] = useState<ViewType>(initialTab || "bookings")
  const [selectedBookingId, setSelectedBookingId] = useState<Id<"objects"> | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<Id<"objects"> | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<Id<"objects"> | null>(null)
  const [availabilityView, setAvailabilityView] = useState<"list" | "editor">("list")
  const [editingScheduleId, setEditingScheduleId] = useState<Id<"objects"> | null>(null)

  // Reset selection when switching views
  const handleViewSwitch = (view: ViewType) => {
    setActiveView(view)
    setSelectedBookingId(null)
    setSelectedLocationId(null)
    setSelectedResourceId(null)
    setAvailabilityView("list")
    setEditingScheduleId(null)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--win95-bg)' }}>
      {/* View Switcher Tabs */}
      <div
        className="flex flex-wrap items-center gap-1 border-b-2 p-2"
        role="tablist"
        aria-label={tWithFallback("ui.app.booking.tabs.aria_label", "Booking sections")}
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)'
        }}
      >
        {/* Back to desktop link (full-screen mode only) */}
        {fullScreen && (
          <Link
            href="/"
            className="retro-button px-3 py-2 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--focus-ring-offset)]"
            title={tWithFallback("ui.app.booking.nav.back_to_desktop", "Back to Desktop")}
            aria-label={tWithFallback("ui.app.booking.nav.back_to_desktop", "Back to Desktop")}
          >
            <ArrowLeft size={16} />
          </Link>
        )}
        <button
          type="button"
          id="booking-tab-bookings"
          role="tab"
          aria-selected={activeView === "bookings"}
          aria-controls="booking-view-bookings-panel"
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
          <span className="font-pixel text-xs">
            {tWithFallback("ui.app.booking.tabs.bookings", "Bookings")}
          </span>
        </button>
        <button
          type="button"
          id="booking-tab-locations"
          role="tab"
          aria-selected={activeView === "locations"}
          aria-controls="booking-view-locations-panel"
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
          <span className="font-pixel text-xs">
            {tWithFallback("ui.app.booking.tabs.locations", "Locations")}
          </span>
        </button>
        <button
          type="button"
          id="booking-tab-availability"
          role="tab"
          aria-selected={activeView === "availability"}
          aria-controls="booking-view-availability-panel"
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
          <span className="font-pixel text-xs">
            {tWithFallback("ui.app.booking.tabs.availability", "Availability")}
          </span>
        </button>
        <button
          type="button"
          id="booking-tab-settings"
          role="tab"
          aria-selected={activeView === "settings"}
          aria-controls="booking-view-settings-panel"
          onClick={() => handleViewSwitch("settings")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "settings" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "settings" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "settings" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Settings size={16} />
          <span className="font-pixel text-xs">
            {tWithFallback("ui.app.booking.tabs.settings", "Settings")}
          </span>
        </button>
        <button
          type="button"
          id="booking-tab-setup"
          role="tab"
          aria-selected={activeView === "setup"}
          aria-controls="booking-view-setup-panel"
          onClick={() => handleViewSwitch("setup")}
          className={`retro-button px-4 py-2 flex items-center gap-2 ${
            activeView === "setup" ? "shadow-inner" : ""
          }`}
          style={{
            background: activeView === "setup" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
            color: activeView === "setup" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
          }}
        >
          <Wand2 size={16} />
          <span className="font-pixel text-xs">
            {tWithFallback("ui.app.booking.tabs.setup", "Setup Wizard")}
          </span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Open full screen link (window mode only) */}
        {!fullScreen && (
          <Link
            href="/booking"
            className="retro-button px-3 py-2 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--focus-ring-offset)]"
            title={tWithFallback("ui.app.booking.nav.open_full_screen", "Open Full Screen")}
            aria-label={tWithFallback("ui.app.booking.nav.open_full_screen", "Open Full Screen")}
          >
            <Maximize2 size={16} />
          </Link>
        )}
      </div>

      {/* Content Area */}
      {activeView === "setup" ? (
        <div
          id="booking-view-setup-panel"
          role="tabpanel"
          aria-labelledby="booking-tab-setup"
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          style={{ background: "var(--shell-surface)" }}
        >
          <BookingSetupWizard />
        </div>
      ) : activeView === "settings" ? (
        <div
          id="booking-view-settings-panel"
          role="tabpanel"
          aria-labelledby="booking-tab-settings"
          className="flex-1 overflow-hidden"
        >
          <BookingSettings />
        </div>
      ) : activeView === "availability" ? (
        <div
          id="booking-view-availability-panel"
          role="tabpanel"
          aria-labelledby="booking-tab-availability"
          className="flex-1 overflow-hidden"
        >
          {availabilityView === "list" ? (
            <AvailabilitySchedulesList
              onEdit={(id) => {
                setEditingScheduleId(id)
                setAvailabilityView("editor")
              }}
              onCreate={() => {
                setEditingScheduleId(null)
                setAvailabilityView("editor")
              }}
            />
          ) : (
            <AvailabilityScheduleEditor
              scheduleId={editingScheduleId}
              onBack={() => {
                setAvailabilityView("list")
                setEditingScheduleId(null)
              }}
            />
          )}
        </div>
      ) : (
        <div
          id={activeView === "bookings" ? "booking-view-bookings-panel" : "booking-view-locations-panel"}
          role="tabpanel"
          aria-labelledby={activeView === "bookings" ? "booking-tab-bookings" : "booking-tab-locations"}
          className="flex flex-1 flex-col overflow-hidden lg:flex-row"
        >
          {/* Left: List View */}
          <div
            className="h-1/2 border-b-2 overflow-y-auto lg:h-auto lg:w-1/2 lg:border-b-0 lg:border-r-2"
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
            className="h-1/2 overflow-y-auto p-4 lg:h-auto lg:w-1/2"
            style={{ background: 'var(--win95-bg)' }}
          >
            {activeView === "bookings" ? (
              selectedBookingId ? (
                <BookingDetail bookingId={selectedBookingId} />
              ) : (
                <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <Calendar size={48} className="mb-4 opacity-30" />
                  <p className="font-pixel text-sm">
                    {tWithFallback("ui.app.booking.detail.select_booking", "Select a booking")}
                  </p>
                  <p className="text-xs mt-2">
                    {tWithFallback("ui.app.booking.detail.select_booking_hint", "Click on a booking to view details")}
                  </p>
                </div>
              )
            ) : (
              selectedLocationId ? (
                <LocationDetail locationId={selectedLocationId} />
              ) : (
                <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center text-center" style={{ color: 'var(--neutral-gray)' }}>
                  <MapPin size={48} className="mb-4 opacity-30" />
                  <p className="font-pixel text-sm">
                    {tWithFallback("ui.app.booking.location.detail.select_location", "Select a location")}
                  </p>
                  <p className="text-xs mt-2">
                    {tWithFallback("ui.app.booking.location.detail.select_location_hint", "Click on a location to view details")}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
