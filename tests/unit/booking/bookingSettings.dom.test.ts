/* @vitest-environment jsdom */

import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const translations: Record<string, string> = {
  "ui.app.booking.settings.title": "Einstellungen",
  "ui.app.booking.settings.menu.calendar": "Kalender",
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

vi.mock("../../../src/components/window-content/booking-window/calendar-settings", () => ({
  CalendarSettings: () => React.createElement("div", null, "calendar-settings-stub"),
}))

import { BookingSettings } from "../../../src/components/window-content/booking-window/booking-settings"

describe("BookingSettings localization", () => {
  beforeEach(() => {
    ;(globalThis as any).React = React
  })

  it("renders the settings menu with namespace translations", () => {
    render(React.createElement(BookingSettings))

    expect(screen.getByText("Einstellungen")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Kalender/ })).toBeTruthy()
  })
})
