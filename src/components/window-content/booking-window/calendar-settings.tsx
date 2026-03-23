"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useWindowManager } from "@/hooks/use-window-manager"
import { Calendar, Plus, Globe, Mail, RefreshCw, MoreHorizontal, Trash2, AlertTriangle } from "lucide-react"

// Workaround for Convex deep type instantiation issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _api: any
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    scopes?: string[]
    syncSettings?: { email: boolean; calendar: boolean; oneDrive: boolean; sharePoint: boolean }
    lastSyncError?: string | null
  } | null
  organizational: {
    id: string
    email: string
    status: string
    connectedAt: number
    scopes?: string[]
    syncSettings?: { email: boolean; calendar: boolean; oneDrive: boolean; sharePoint: boolean }
    lastSyncError?: string | null
  } | null
}

interface MicrosoftConnectionResult {
  id: string
  provider: string
  providerEmail: string
  status: string
  syncSettings?: { email: boolean; calendar: boolean; oneDrive: boolean; sharePoint: boolean }
}

interface SubCalendar {
  calendarId: string
  summary: string
  backgroundColor: string
  accessRole: string
  primary: boolean
  lastFetchedAt: number
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

interface CalendarLinkSettings {
  blockingCalendarIds: string[]
  pushCalendarId: string | null
  explicitBlockingConfigured: boolean
  calendarSyncEnabled: boolean
  canAccessCalendar: boolean
  canWriteCalendar: boolean
  connectionStatus: string
  lastSyncError: string | null
  primaryCalendarId: string | null
  subCalendarCacheReady: boolean
}

export function CalendarSettings() {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const organizationId = currentOrganization?.id
  const { openWindow } = useWindowManager()

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null)

  // Google connection
  const googleConnection = useQuery(
    _api?.oauth?.google?.getGoogleConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as GoogleConnectionResult | null | undefined

  // Microsoft connection
  const microsoftConnection = useQuery(
    _api?.oauth?.microsoft?.getUserMicrosoftConnection,
    sessionId ? { sessionId } : "skip"
  ) as MicrosoftConnectionResult | null | undefined

  // Derive Google connection ID
  const googleConnectionId = googleConnection?.personal?.id || null

  // Sub-calendars for the Google connection
  const subCalendars = useQuery(
    _api?.calendarSyncSubcalendars?.getSubCalendars,
    sessionId && googleConnectionId
      ? { sessionId, connectionId: googleConnectionId }
      : "skip"
  ) as SubCalendar[] | null | undefined

  // Calendar link settings (blocking IDs + push target)
  const calendarLinkSettings = useQuery(
    _api?.calendarSyncSubcalendars?.getCalendarLinkSettings,
    sessionId && organizationId && googleConnectionId
      ? { sessionId, organizationId, connectionId: googleConnectionId }
      : "skip"
  ) as CalendarLinkSettings | null | undefined

  const googleCalendarConnection = googleConnection?.personal ?? null
  const blockingCalendarIds = calendarLinkSettings?.blockingCalendarIds ?? (googleConnectionId ? ["primary"] : [])
  const pushCalendarId = calendarLinkSettings?.pushCalendarId ?? null
  const googleSyncEnabled = calendarLinkSettings?.calendarSyncEnabled
    ?? (googleCalendarConnection?.syncSettings?.calendar ?? false)
  const googleCanAccessCalendar = calendarLinkSettings?.canAccessCalendar ?? false
  const googleCanWriteCalendar = calendarLinkSettings?.canWriteCalendar ?? false
  const googleConnectionStatus = calendarLinkSettings?.connectionStatus ?? googleCalendarConnection?.status ?? "missing"
  const googleLastSyncError = calendarLinkSettings?.lastSyncError ?? googleCalendarConnection?.lastSyncError ?? null
  const googleSubCalendarCacheReady = calendarLinkSettings?.subCalendarCacheReady ?? false
  const googlePushControlsDisabled =
    !googleConnectionId ||
    googleConnectionStatus !== "active" ||
    !googleSyncEnabled ||
    !googleCanWriteCalendar
  const googleBlockingControlsDisabled =
    !googleConnectionId ||
    googleConnectionStatus !== "active" ||
    !googleSyncEnabled ||
    !googleCanAccessCalendar

  // Mutations & actions
  const updateGoogleSync = useMutation(_api?.oauth?.google?.updateGoogleSyncSettings)
  const updateMicrosoftSync = useMutation(_api?.oauth?.microsoft?.updateMicrosoftSyncSettings)
  const updateCalendarLinkSettings = useMutation(_api?.calendarSyncSubcalendars?.updateCalendarLinkSettings)
  const refreshSubCalendarsAction = useAction(_api?.calendarSyncSubcalendars?.refreshSubCalendars)

  // Build connected calendars list
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

  const handleAddCalendar = () => {
    openWindow(
      "integrations",
      "Integrations & API",
      undefined,
      { x: 150, y: 100 },
      { width: 900, height: 650 },
      "ui.windows.integrations.title",
      undefined
    )
  }

  const handleToggleSync = async (cal: ConnectedCalendar) => {
    if (!sessionId) return
    const newValue = !cal.syncEnabled
    setSyncingConnectionId(cal.connectionId)
    try {
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
    } finally {
      setSyncingConnectionId(null)
    }
  }

  const handleToggleBlockingCalendar = useCallback(async (calendarId: string) => {
    if (!sessionId || !organizationId || !googleConnectionId) return
    const current = [...blockingCalendarIds]
    const idx = current.indexOf(calendarId)
    if (idx >= 0) {
      if (current.length === 1) return
      current.splice(idx, 1)
    } else {
      current.push(calendarId)
    }
    await updateCalendarLinkSettings({
      sessionId,
      organizationId,
      connectionId: googleConnectionId as any,
      blockingCalendarIds: current,
    })
  }, [sessionId, organizationId, googleConnectionId, blockingCalendarIds, updateCalendarLinkSettings])

  const handleSetPushCalendar = useCallback(async (calendarId: string) => {
    if (!sessionId || !organizationId || !googleConnectionId) return
    await updateCalendarLinkSettings({
      sessionId,
      organizationId,
      connectionId: googleConnectionId as any,
      pushCalendarId: calendarId,
    })
  }, [sessionId, organizationId, googleConnectionId, updateCalendarLinkSettings])

  const handleRefreshSubCalendars = useCallback(async () => {
    if (!sessionId || !googleConnectionId) return
    setRefreshing(true)
    try {
      await refreshSubCalendarsAction({
        sessionId,
        connectionId: googleConnectionId as any,
      })
    } finally {
      setRefreshing(false)
    }
  }, [sessionId, googleConnectionId, refreshSubCalendarsAction])

  const handleRemoveConnection = useCallback(async (cal: ConnectedCalendar) => {
    setMenuOpenFor(null)
    // For now, redirect to integrations to manage the connection
    handleAddCalendar()
  }, [])

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-sm" style={{ color: 'var(--shell-text)' }}>
            Calendars
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Configure how your bookings interact with your calendars
          </p>
        </div>
        <button
          onClick={handleAddCalendar}
          className="desktop-interior-button px-3 py-1.5 flex items-center gap-1.5"
          style={{ color: 'var(--shell-text)' }}
        >
          <Plus size={12} />
          <span className="font-pixel text-xs">Add calendar</span>
        </button>
      </div>

      {/* Add to Calendar */}
      <div
        className="border-2 p-4 space-y-3"
        style={{
          borderColor: 'var(--shell-border)',
          background: 'var(--shell-surface-elevated)',
        }}
      >
        <div>
          <h3 className="font-pixel text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
            Add to calendar
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Select where to add events when you&apos;re booked.
          </p>
        </div>

        {!googleConnectionId && (
          <div
            className="border px-3 py-2 text-xs"
            style={{
              borderColor: 'var(--shell-border)',
              background: 'var(--shell-surface)',
              color: 'var(--neutral-gray)',
            }}
          >
            Connect Google Calendar to push confirmed bookings to an external calendar.
          </div>
        )}

        {googleConnectionId && (
          <div
            className="border px-3 py-2 text-xs"
            style={{
              borderColor: googlePushControlsDisabled ? 'var(--warning)' : 'var(--shell-border)',
              background: 'var(--shell-surface)',
              color: googlePushControlsDisabled ? 'var(--warning)' : 'var(--neutral-gray)',
            }}
          >
            {!googleSyncEnabled && "Google calendar sync is off. Native bookings stay internal until sync is re-enabled."}
            {googleSyncEnabled && !googleCanWriteCalendar && "Reconnect Google with calendar write scope before outbound booking pushes can run."}
            {googleSyncEnabled && googleCanWriteCalendar && !pushCalendarId && "No outbound calendar selected. Confirmed bookings stay native-only until you choose one."}
            {googleSyncEnabled && googleCanWriteCalendar && pushCalendarId && "Confirmed bookings reconcile by target connection and selected Google calendar instead of always writing a new primary-calendar event."}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--shell-text)' }}>
            Add events to
          </label>
          <select
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: 'var(--shell-border)',
              background: 'var(--shell-input-surface)',
              color: 'var(--shell-input-text)',
            }}
            disabled={googlePushControlsDisabled}
            value={pushCalendarId || ""}
            onChange={(e) => handleSetPushCalendar(e.target.value)}
          >
            <option value="">None (do not add to calendar)</option>
            {(subCalendars ?? []).map((sc) => (
              <option key={sc.calendarId} value={sc.calendarId}>
                {sc.summary}{sc.primary ? " (primary)" : ""} — {googleCalendarConnection?.email}
              </option>
            ))}
            {googleConnectionId && (!subCalendars || subCalendars.length === 0) && (
              <option value="" disabled>
                {googleSubCalendarCacheReady
                  ? "No Google calendars available"
                  : "No calendars loaded — use \"Fetch calendars\" below"}
              </option>
            )}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Clearing this keeps booking records native-only even when Google sync stays enabled.
          </p>
        </div>

        {googleLastSyncError && (
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            Last Google sync error: {googleLastSyncError}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--shell-text)' }}>
            Default reminder
          </label>
          <select
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: 'var(--shell-border)',
              background: 'var(--shell-input-surface)',
              color: 'var(--shell-input-text)',
            }}
          >
            <option value="">Use default reminders</option>
            <option value="0">No reminder</option>
            <option value="10">10 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">60 minutes before</option>
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
          borderColor: 'var(--shell-border)',
          background: 'var(--shell-surface-elevated)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-pixel text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
              Check for conflicts
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              Select which calendars you want to check to prevent double bookings.
            </p>
          </div>
          <button
            onClick={handleAddCalendar}
            className="desktop-interior-button px-2 py-1 flex items-center gap-1"
            style={{ color: 'var(--shell-text)' }}
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
          <div className="space-y-3">
            {connectedCalendars.map((cal) => (
              <div
                key={`${cal.provider}-${cal.email}`}
                className="border-2 rounded overflow-hidden"
                style={{
                  borderColor: 'var(--shell-border)',
                  background: 'var(--shell-surface)',
                }}
              >
                {/* Connection header card */}
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-shrink-0">
                    {cal.icon === "google" ? (
                      <div className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ background: 'var(--shell-input-surface)' }}>
                        <Globe size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ background: 'var(--shell-input-surface)' }}>
                        <Mail size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--shell-text)' }}>
                      {cal.provider}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--neutral-gray)' }}>
                      {cal.email}
                    </p>
                    {cal.status !== "active" && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <AlertTriangle size={10} style={{ color: 'var(--warning)' }} />
                        <span className="text-xs" style={{ color: 'var(--warning)' }}>
                          {cal.status === "expired" && "Connection expired"}
                          {cal.status === "error" && "Connection error"}
                          {cal.status === "revoked" && "Access revoked"}
                        </span>
                        <button
                          onClick={() => handleAddCalendar()}
                          className="text-xs underline ml-1"
                          style={{ color: 'var(--warning)' }}
                        >
                          Reconnect
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenFor(menuOpenFor === cal.connectionId ? null : cal.connectionId)}
                      className="desktop-interior-button p-1.5"
                      style={{ color: 'var(--shell-text)' }}
                      title="Options"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpenFor === cal.connectionId && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 border-2 rounded shadow-lg min-w-[160px]"
                        style={{
                          borderColor: 'var(--shell-border)',
                          background: 'var(--shell-surface-elevated)',
                        }}
                      >
                        <button
                          onClick={() => handleRemoveConnection(cal)}
                          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:opacity-80"
                          style={{ color: 'var(--danger, #e53e3e)' }}
                        >
                          <Trash2 size={12} />
                          Remove connection
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-calendar toggles */}
                {cal.connectionType === "google" && (
                  <div className="px-3 pb-3 space-y-1">
                    <div className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--shell-text)' }}>
                          Sync Google conflict data
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                          Conflict checks fail closed when sync is off, the connection is inactive, or Google read scope is missing.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cal.syncEnabled}
                        onClick={() => handleToggleSync(cal)}
                        disabled={syncingConnectionId === cal.connectionId || cal.status !== "active"}
                        className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-60"
                        style={{
                          background: cal.syncEnabled ? 'var(--success)' : 'var(--shell-border)',
                        }}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
                          style={{
                            background: '#fff',
                            transform: cal.syncEnabled ? 'translateX(16px)' : 'translateX(0)',
                          }}
                        />
                      </button>
                    </div>

                    {cal.status !== "active" ? (
                      <div className="py-2">
                        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                          Reconnect your {cal.provider} account to manage conflict calendars.
                        </p>
                      </div>
                    ) : !googleSyncEnabled ? (
                      <div className="py-2">
                        <p className="text-xs" style={{ color: 'var(--warning)' }}>
                          Google conflict checks are disabled. The booking engine will fail closed until sync is turned back on.
                        </p>
                      </div>
                    ) : !googleCanAccessCalendar ? (
                      <div className="py-2">
                        <p className="text-xs" style={{ color: 'var(--warning)' }}>
                          This Google connection is missing calendar read scope. Reconnect before using Google as a conflict source.
                        </p>
                      </div>
                    ) : subCalendars && subCalendars.length > 0 ? (
                      <>
                        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                          Select at least one Google calendar to block native bookings. The final selected blocker stays on until another blocker is enabled.
                        </p>
                        {subCalendars.map((sc) => {
                          const isBlocking = blockingCalendarIds.includes(sc.calendarId)
                          return (
                            <label
                              key={sc.calendarId}
                              className="flex items-center gap-3 py-1.5 cursor-pointer hover:opacity-80"
                            >
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isBlocking}
                                disabled={googleBlockingControlsDisabled}
                                onClick={() => handleToggleBlockingCalendar(sc.calendarId)}
                                className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-60"
                                style={{
                                  background: isBlocking ? 'var(--success)' : 'var(--shell-border)',
                                }}
                              >
                                <span
                                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
                                  style={{
                                    background: '#fff',
                                    transform: isBlocking ? 'translateX(16px)' : 'translateX(0)',
                                  }}
                                />
                              </button>
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: sc.backgroundColor }}
                              />
                              <span className="text-xs flex-1 truncate" style={{ color: 'var(--shell-text)' }}>
                                {sc.summary}
                              </span>
                            </label>
                          )
                        })}

                        {googleConnectionId && (
                          <button
                            onClick={handleRefreshSubCalendars}
                            disabled={refreshing || googleBlockingControlsDisabled}
                            className="flex items-center gap-1 mt-2 text-xs hover:opacity-80 disabled:opacity-60"
                            style={{ color: 'var(--neutral-gray)' }}
                            title="Refresh calendar list from Google"
                          >
                            <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
                            <span>{refreshing ? "Refreshing..." : "Refresh calendars"}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="py-2">
                        <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                          No calendars loaded yet. Fetch your Google calendars or reconnect if needed.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={handleRefreshSubCalendars}
                            disabled={refreshing || googleBlockingControlsDisabled}
                            className="desktop-interior-button px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-60"
                            style={{ color: 'var(--shell-text)' }}
                          >
                            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
                            <span className="text-xs font-pixel">
                              {refreshing ? "Fetching..." : "Fetch calendars"}
                            </span>
                          </button>
                          <button
                            onClick={handleAddCalendar}
                            className="desktop-interior-button px-3 py-1.5 flex items-center gap-1.5"
                            style={{ color: 'var(--shell-text)' }}
                          >
                            <Globe size={12} />
                            <span className="text-xs font-pixel">Reconnect</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Microsoft: simple toggle (no sub-calendar support yet) */}
                {cal.connectionType === "microsoft" && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center cursor-pointer gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={cal.syncEnabled}
                          onClick={() => handleToggleSync(cal)}
                          className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
                          style={{
                            background: cal.syncEnabled ? 'var(--success)' : 'var(--shell-border)',
                          }}
                        >
                          <span
                            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
                            style={{
                              background: '#fff',
                              transform: cal.syncEnabled ? 'translateX(16px)' : 'translateX(0)',
                            }}
                          />
                        </button>
                        <span className="text-xs" style={{ color: 'var(--shell-text)' }}>
                          Check Outlook for conflicts
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
