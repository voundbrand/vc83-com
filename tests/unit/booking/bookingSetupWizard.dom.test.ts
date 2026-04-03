/* @vitest-environment jsdom */

import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
  useCurrentOrganization: vi.fn(),
}))

vi.mock("@/hooks/use-notification", () => ({
  useNotification: vi.fn(),
}))

vi.mock("@/hooks/use-window-manager", () => ({
  useWindowManager: vi.fn(),
}))

vi.mock("@/lib/ai/ui-writeback-bridge", () => ({
  addAIWritebackEventListener: vi.fn(() => () => undefined),
  BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION: "booking_setup_writeback_v1",
  BOOKING_SETUP_WRITEBACK_EVENT: "booking_setup_writeback",
}))

vi.mock("../../../src/components/window-content/ai-chat-window", () => ({
  AIChatWindow: () => null,
}))

vi.mock(
  "../../../src/components/window-content/ai-chat-window/voice-assistant-contract",
  () => ({
    getVoiceAssistantWindowContract: () => ({
      windowId: "ai-assistant",
      title: "AI Assistant",
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      titleKey: "ui.windows.ai_assistant.title",
      iconId: undefined,
    }),
  })
)

const translations: Record<string, string> = {
  "ui.app.booking.settings.setup.title": "Buchungs-Einrichtungsassistent",
  "ui.app.booking.settings.setup.actions.start_chat": "Chat starten",
  "ui.app.booking.settings.setup.surface_identity": "Oberflaechen-Identitaet",
  "ui.app.booking.settings.setup.fields.template": "Vorlage",
  "ui.app.booking.settings.setup.fields.app_slug": "App-Slug",
  "ui.app.booking.settings.setup.registered_app_slugs.plural":
    "{count} registrierte App-Slugs",
  "ui.app.booking.settings.setup.inventory_groups.title":
    "Inventargruppen (Sitz/Einheit)",
  "ui.app.booking.settings.setup.inventory_groups.actions.add":
    "Gruppe hinzufuegen",
  "ui.app.booking.settings.setup.profiles.title": "Profile / Produkte",
  "ui.app.booking.settings.setup.profiles.actions.add": "Profil hinzufuegen",
  "ui.app.booking.settings.setup.actions.generate_blueprint":
    "Blueprint erzeugen",
  "ui.app.booking.settings.setup.agent_prompt.title": "Agent-Prompt",
  "ui.app.booking.settings.setup.actions.copy_prompt": "Prompt kopieren",
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

import { useAction, useQuery } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { useWindowManager } from "@/hooks/use-window-manager"
import { BookingSetupWizard } from "../../../src/components/window-content/booking-window/booking-setup-wizard"

const useActionMock = vi.mocked(useAction as any)
const useQueryMock = vi.mocked(useQuery as any)
const useAuthMock = vi.mocked(useAuth)
const useCurrentOrganizationMock = vi.mocked(useCurrentOrganization)
const useNotificationMock = vi.mocked(useNotification)
const useWindowManagerMock = vi.mocked(useWindowManager)

describe("BookingSetupWizard localization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).React = React

    useActionMock.mockReturnValue(vi.fn())
    useQueryMock.mockReturnValue([
      { code: "segelschule-altwarp", name: "Segelschule Altwarp" },
      { code: "harbor-school", name: "Harbor School" },
    ])
    useAuthMock.mockReturnValue({ sessionId: "session_setup_wizard" } as any)
    useCurrentOrganizationMock.mockReturnValue({
      id: "org_setup_wizard",
      name: "Segelschule Altwarp",
    } as any)
    useNotificationMock.mockReturnValue({
      success: vi.fn(),
      error: vi.fn(),
    } as any)
    useWindowManagerMock.mockReturnValue({ openWindow: vi.fn() } as any)
  })

  it("renders the setup wizard chrome with namespace translations", () => {
    render(React.createElement(BookingSetupWizard))

    expect(screen.getByText("Buchungs-Einrichtungsassistent")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Chat starten" })).toBeTruthy()
    expect(screen.getByText("Oberflaechen-Identitaet")).toBeTruthy()
    expect(screen.getByText("Vorlage")).toBeTruthy()
    expect(screen.getByText("App-Slug")).toBeTruthy()
    expect(screen.getByText("2 registrierte App-Slugs")).toBeTruthy()
    expect(screen.getByText("Inventargruppen (Sitz/Einheit)")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Gruppe hinzufuegen" })).toBeTruthy()
    expect(screen.getByText("Profile / Produkte")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Profil hinzufuegen" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Blueprint erzeugen" })).toBeTruthy()
    expect(screen.getByText("Agent-Prompt")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Prompt kopieren" })).toBeTruthy()
  })
})
