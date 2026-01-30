"use client"

import { useQuery, useMutation } from "convex/react"
import { useAuth } from "@/hooks/use-auth"
import { useWindowManager } from "@/hooks/use-window-manager"
import { Calendar, Plus, Globe, Mail } from "lucide-react"

// Workaround for Convex deep type instantiation issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
let _api: any
try {
  _api = require("../../../../convex/_generated/api").api
} catch {
  _api = null
}

interface GoogleConnectionResult {
  personal: {
    id: string
    email: string
    status: string
    connectedAt: number
    syncSettings?: { email: boolean; calendar: boolean; oneDrive: boolean; sharePoint: boolean }
  } | null
  organizational: {
    id: string
    email: string
    status: string
    connectedAt: number
    syncSettings?: { email: boolean; calendar: boolean; oneDrive: boolean; sharePoint: boolean }
  } | null
}

interface MicrosoftConnectionResult {
  id: string
  provider: string
  providerEmail: string
  status: string
  syncSettings?: { email: boolean; calendar: boolean; oneDrive: boolean; sharePoint: boolean }
}

interface ConnectedCalendar {
  provider: string
  email: string
  status: string
  icon: string
  syncEnabled: boolean
  connectionId: string
  connectionType: "google" | "microsoft"
}

export function CalendarSettings() {
  const { sessionId } = useAuth()
  const { openWindow } = useWindowManager()

  const googleConnection = useQuery(
    _api?.oauth?.google?.getGoogleConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as GoogleConnectionResult | null | undefined

  const microsoftConnection = useQuery(
    _api?.oauth?.microsoft?.getUserMicrosoftConnection,
    sessionId ? { sessionId } : "skip"
  ) as MicrosoftConnectionResult | null | undefined

  const updateGoogleSync = useMutation(
    _api?.oauth?.google?.updateGoogleSyncSettings
  )
  const updateMicrosoftSync = useMutation(
    _api?.oauth?.microsoft?.updateMicrosoftSyncSettings
  )

  const connectedCalendars: ConnectedCalendar[] = []

  if (googleConnection?.personal) {
    connectedCalendars.push({
      provider: "Google Calendar",
      email: googleConnection.personal.email,
      status: googleConnection.personal.status,
      icon: "google",
      syncEnabled: googleConnection.personal.syncSettings?.calendar ?? false,
      connectionId: googleConnection.personal.id,
      connectionType: "google",
    })
  }

  if (microsoftConnection) {
    connectedCalendars.push({
      provider: "Outlook Calendar",
      email: microsoftConnection.providerEmail,
      status: microsoftConnection.status,
      icon: "microsoft",
      syncEnabled: microsoftConnection.syncSettings?.calendar ?? false,
      connectionId: microsoftConnection.id,
      connectionType: "microsoft",
    })
  }

  const handleToggleSync = async (cal: ConnectedCalendar) => {
    if (!sessionId) return
    const newValue = !cal.syncEnabled
    if (cal.connectionType === "google") {
      await updateGoogleSync({
        sessionId,
        connectionId: cal.connectionId as any,
        syncSettings: { calendar: newValue },
      })
    } else {
      await updateMicrosoftSync({
        sessionId,
        connectionId: cal.connectionId as any,
        syncSettings: { calendar: newValue },
      })
    }
  }

  const handleAddCalendar = () => {
    openWindow(
      "integrations",
      "Integrations & API",
      undefined,
      { x: 150, y: 100 },
      { width: 900, height: 650 },
      "ui.windows.integrations.title",
      "🔗"
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-sm" style={{ color: 'var(--win95-text)' }}>
            Calendars
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Configure how your bookings interact with your calendars
          </p>
        </div>
        <button
          onClick={handleAddCalendar}
          className="retro-button px-3 py-1.5 flex items-center gap-1.5"
          style={{ color: 'var(--win95-text)' }}
        >
          <Plus size={12} />
          <span className="font-pixel text-xs">Add calendar</span>
        </button>
      </div>

      {/* Add to Calendar */}
      <div
        className="border-2 p-4 space-y-3"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)',
        }}
      >
        <div>
          <h3 className="font-pixel text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
            Add to calendar
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Select where to add events when you&apos;re booked.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
            Add events to
          </label>
          <select
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-input-bg)',
              color: 'var(--win95-input-text)',
            }}
          >
            <option value="">None (do not add to calendar)</option>
            {connectedCalendars.map((cal) => (
              <option key={`${cal.provider}-${cal.email}`} value={cal.email}>
                {cal.email} ({cal.provider})
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            You can override this per-resource in the resource booking settings.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--win95-text)' }}>
            Default reminder
          </label>
          <select
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-input-bg)',
              color: 'var(--win95-input-text)',
            }}
          >
            <option value="">Use default reminders</option>
            <option value="0">No reminder</option>
            <option value="15">15 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Set the default reminder time for events added to your calendar.
          </p>
        </div>
      </div>

      {/* Check for Conflicts */}
      <div
        className="border-2 p-4 space-y-3"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-pixel text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
              Check for conflicts
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Select which calendars you want to check to prevent double bookings.
            </p>
          </div>
          <button
            onClick={handleAddCalendar}
            className="retro-button px-2 py-1 flex items-center gap-1"
            style={{ color: 'var(--win95-text)' }}
          >
            <Plus size={10} />
            <span className="text-xs">Add</span>
          </button>
        </div>

        {connectedCalendars.length === 0 ? (
          <div
            className="text-center py-6"
            style={{ color: 'var(--neutral-gray)' }}
          >
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No calendars connected</p>
            <p className="text-xs mt-1">
              Connect Google or Microsoft to check for conflicts.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {connectedCalendars.map((cal) => (
              <div
                key={`${cal.provider}-${cal.email}`}
                className="flex items-center gap-3 p-3 border-2 rounded"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg)',
                }}
              >
                <div className="flex-shrink-0">
                  {cal.icon === "google" ? (
                    <div className="w-8 h-8 rounded flex items-center justify-center text-lg"
                      style={{ background: 'var(--win95-input-bg)' }}>
                      <Globe size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded flex items-center justify-center text-lg"
                      style={{ background: 'var(--win95-input-bg)' }}>
                      <Mail size={16} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--win95-text)' }}>
                    {cal.provider}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--neutral-gray)' }}>
                    {cal.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: cal.status === "active" ? 'var(--success)' : 'var(--warning)',
                      color: '#fff',
                    }}
                  >
                    {cal.status}
                  </span>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cal.syncEnabled}
                      onChange={() => handleToggleSync(cal)}
                      className="w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
          Toggle the calendars you want to check for conflicts to prevent double bookings.
        </p>
      </div>
    </div>
  )
}
