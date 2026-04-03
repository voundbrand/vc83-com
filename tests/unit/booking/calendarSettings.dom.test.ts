/* @vitest-environment jsdom */

import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
  useCurrentOrganization: vi.fn(),
}))

vi.mock("@/hooks/use-window-manager", () => ({
  useWindowManager: vi.fn(),
}))

const translations: Record<string, string> = {
  "ui.app.booking.settings.calendar.add_to_calendar.reconcile_selected_target":
    "Bestaetigte Buchungen werden anhand der Zielverbindung und des ausgewaehlten Google-Kalenders abgeglichen.",
  "ui.app.booking.settings.calendar.add_to_calendar.missing_write_scope":
    "Google neu verbinden, bevor ausgehende Buchungseintraege synchronisiert werden koennen.",
  "ui.app.booking.settings.calendar.actions.connect_google": "Google verbinden",
  "ui.app.booking.settings.calendar.actions.enable_sync": "Synchronisierung aktivieren",
  "ui.app.booking.settings.calendar.actions.choose_calendar": "Kalender waehlen",
  "ui.app.booking.settings.calendar.actions.reconnect_google": "Google neu verbinden",
  "ui.app.booking.settings.calendar.conflicts.sync_google_hint":
    "Konfliktpruefungen schlagen absichernd fehl, wenn die Synchronisierung deaktiviert ist.",
  "ui.app.booking.settings.calendar.conflicts.selection_hint":
    "Waehlen Sie mindestens einen Google-Kalender aus, der native Buchungen blockiert.",
  "ui.app.booking.settings.calendar.labels.primary_suffix": "(Hauptkalender)",
}

vi.mock("@/hooks/use-namespace-translations", () => ({
  useNamespaceTranslations: () => ({
    tWithFallback: (
      key: string,
      fallback: string,
      values?: Record<string, string | number>
    ) => {
      const template = translations[key] ?? fallback
      return template.replace(/\{(\w+)\}/g, (_match, token) =>
        values && token in values ? String(values[token]) : `{${token}}`
      )
    },
  }),
}))

import { useAction, useMutation, useQuery } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useWindowManager } from "@/hooks/use-window-manager"
import { CalendarSettings } from "../../../src/components/window-content/booking-window/calendar-settings"

const useQueryMock = vi.mocked(useQuery as any)
const useMutationMock = vi.mocked(useMutation as any)
const useActionMock = vi.mocked(useAction as any)
const useAuthMock = vi.mocked(useAuth)
const useCurrentOrganizationMock = vi.mocked(useCurrentOrganization)
const useWindowManagerMock = vi.mocked(useWindowManager)
const openWindowMock = vi.fn()
const updateGoogleSyncMock = vi.fn()
const updateMicrosoftSyncMock = vi.fn()
const updateCalendarLinkSettingsMock = vi.fn()
const refreshSubCalendarsMock = vi.fn()

describe("CalendarSettings localization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).React = React

    useAuthMock.mockReturnValue({ sessionId: "session_calendar_settings" } as any)
    useCurrentOrganizationMock.mockReturnValue({
      id: "org_calendar_settings",
      name: "Segelschule",
    } as any)
    openWindowMock.mockReset()
    updateGoogleSyncMock.mockReset()
    updateMicrosoftSyncMock.mockReset()
    updateCalendarLinkSettingsMock.mockReset()
    refreshSubCalendarsMock.mockReset()
    useWindowManagerMock.mockReturnValue({ openWindow: openWindowMock } as any)
    let mutationIndex = 0
    useMutationMock.mockImplementation(() => {
      mutationIndex += 1
      switch (mutationIndex) {
        case 1:
          return updateGoogleSyncMock
        case 2:
          return updateMicrosoftSyncMock
        case 3:
          return updateCalendarLinkSettingsMock
        default:
          return vi.fn()
      }
    })
    useActionMock.mockReturnValue(refreshSubCalendarsMock)

    let queryIndex = 0
    useQueryMock.mockImplementation(() => {
      queryIndex += 1
      switch (queryIndex) {
        case 1:
          return {
            personal: {
              id: "google_connection",
              email: "ops@example.com",
              status: "active",
              connectedAt: 0,
              syncSettings: {
                email: false,
                calendar: true,
                oneDrive: false,
                sharePoint: false,
              },
              lastSyncError: null,
            },
            organizational: null,
          }
        case 2:
          return null
        case 3:
          return [
            {
              calendarId: "calendar_primary",
              summary: "Buchungen",
              backgroundColor: "#00ff00",
              accessRole: "owner",
              primary: true,
              lastFetchedAt: 0,
            },
          ]
        case 4:
          return {
            blockingCalendarIds: ["calendar_primary"],
            pushCalendarId: "calendar_primary",
            explicitBlockingConfigured: true,
            calendarSyncEnabled: true,
            canAccessCalendar: true,
            canWriteCalendar: true,
            connectionStatus: "active",
            lastSyncError: null,
            primaryCalendarId: "calendar_primary",
            subCalendarCacheReady: true,
          }
        default:
          return null
      }
    })
  })

  it("renders translated Google calendar status and conflict copy", () => {
    render(React.createElement(CalendarSettings))

    expect(
      screen.getByText(
        "Bestaetigte Buchungen werden anhand der Zielverbindung und des ausgewaehlten Google-Kalenders abgeglichen."
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        "Konfliktpruefungen schlagen absichernd fehl, wenn die Synchronisierung deaktiviert ist."
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        "Waehlen Sie mindestens einen Google-Kalender aus, der native Buchungen blockiert."
      )
    ).toBeTruthy()
    expect(
      screen.getByRole("option", { name: /Buchungen \(Hauptkalender\)/ })
    ).toBeTruthy()
  })

  it("shows a reconnect CTA when Google write scope is missing", () => {
    let queryIndex = 0
    useQueryMock.mockImplementation(() => {
      queryIndex += 1
      switch (queryIndex) {
        case 1:
          return {
            personal: {
              id: "google_connection",
              email: "ops@example.com",
              status: "active",
              connectedAt: 0,
              syncSettings: {
                email: false,
                calendar: true,
                oneDrive: false,
                sharePoint: false,
              },
              lastSyncError: null,
            },
            organizational: null,
          }
        case 2:
          return null
        case 3:
          return [
            {
              calendarId: "calendar_primary",
              summary: "Buchungen",
              backgroundColor: "#00ff00",
              accessRole: "owner",
              primary: true,
              lastFetchedAt: 0,
            },
          ]
        case 4:
          return {
            blockingCalendarIds: ["calendar_primary"],
            pushCalendarId: null,
            explicitBlockingConfigured: true,
            calendarSyncEnabled: true,
            canAccessCalendar: true,
            canWriteCalendar: false,
            connectionStatus: "active",
            lastSyncError: null,
            primaryCalendarId: "calendar_primary",
            subCalendarCacheReady: true,
          }
        default:
          return null
      }
    })

    render(React.createElement(CalendarSettings))

    expect(
      screen.getByText(
        "Google neu verbinden, bevor ausgehende Buchungseintraege synchronisiert werden koennen."
      )
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Google neu verbinden" }))

    expect(openWindowMock).toHaveBeenCalled()
  })

  it("shows an enable-sync CTA when Google sync is off", async () => {
    let queryIndex = 0
    useQueryMock.mockImplementation(() => {
      queryIndex += 1
      switch (queryIndex) {
        case 1:
          return {
            personal: {
              id: "google_connection",
              email: "ops@example.com",
              status: "active",
              connectedAt: 0,
              syncSettings: {
                email: false,
                calendar: false,
                oneDrive: false,
                sharePoint: false,
              },
              lastSyncError: null,
            },
            organizational: null,
          }
        case 2:
          return null
        case 3:
          return [
            {
              calendarId: "calendar_primary",
              summary: "Buchungen",
              backgroundColor: "#00ff00",
              accessRole: "owner",
              primary: true,
              lastFetchedAt: 0,
            },
          ]
        case 4:
          return {
            blockingCalendarIds: ["calendar_primary"],
            pushCalendarId: null,
            explicitBlockingConfigured: true,
            calendarSyncEnabled: false,
            canAccessCalendar: true,
            canWriteCalendar: true,
            connectionStatus: "active",
            lastSyncError: null,
            primaryCalendarId: "calendar_primary",
            subCalendarCacheReady: true,
          }
        default:
          return null
      }
    })

    render(React.createElement(CalendarSettings))

    fireEvent.click(screen.getAllByRole("button", { name: "Synchronisierung aktivieren" })[0])

    await waitFor(() => {
      expect(updateGoogleSyncMock).toHaveBeenCalledWith({
        sessionId: "session_calendar_settings",
        connectionId: "google_connection",
        syncSettings: { calendar: true },
      })
    })
  })
})
