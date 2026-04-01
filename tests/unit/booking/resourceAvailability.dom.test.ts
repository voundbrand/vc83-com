/* @vitest-environment jsdom */

import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
  useCurrentOrganization: vi.fn(),
}))

vi.mock("@/hooks/use-notification", () => ({
  useNotification: vi.fn(),
}))

vi.mock("@/hooks/use-namespace-translations", () => ({
  useNamespaceTranslations: () => ({
    tWithFallback: (_key: string, fallback: string) => fallback,
  }),
}))

import { useMutation, useQuery } from "convex/react"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { ResourceAvailability } from "../../../src/components/window-content/booking-window/resource-availability"

const useQueryMock = vi.mocked(useQuery as any)
const useMutationMock = vi.mocked(useMutation as any)
const useAuthMock = vi.mocked(useAuth)
const useCurrentOrganizationMock = vi.mocked(useCurrentOrganization)
const useNotificationMock = vi.mocked(useNotification)

const SESSION_ID = "session_resource_availability"
const ORGANIZATION_ID = "organizations_resource_availability" as any
const RESOURCE_ID = "objects_resource_availability" as any

const successMock = vi.fn()
const errorMock = vi.fn()
const setWeeklyScheduleMock = vi.fn()
const updateProductMock = vi.fn()
const createExceptionMock = vi.fn()
const updateExceptionMock = vi.fn()
const deleteExceptionMock = vi.fn()
const createBlockMock = vi.fn()
const updateBlockMock = vi.fn()
const deleteBlockMock = vi.fn()

const PRODUCTS = [
  {
    _id: RESOURCE_ID,
    name: "Harbor Classroom",
    subtype: "room",
    status: "active",
    customProperties: {
      availabilityStructure: "resource_time_slot",
      timezone: "Europe/Berlin",
      minDuration: 60,
      bufferAfter: 15,
      bookableConfig: {
        timezone: "Europe/Berlin",
        minDuration: 60,
        bufferAfter: 15,
      },
    },
  },
]

const baseSchedule = [
  {
    _id: "objects_schedule_resource_availability",
    status: "active",
    customProperties: {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
      timezone: "Europe/Berlin",
    },
  },
]

let availabilitySnapshot: {
  schedules: Array<Record<string, unknown>>
  exceptions: Array<Record<string, unknown>>
  blocks: Array<Record<string, unknown>>
}

function renderResourceAvailability() {
  return render(
    React.createElement(ResourceAvailability, {
      selectedResourceId: RESOURCE_ID,
      onSelectResource: vi.fn(),
    })
  )
}

describe("ResourceAvailability override and blackout editor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).React = React

    availabilitySnapshot = {
      schedules: baseSchedule,
      exceptions: [
        {
          _id: "objects_exception_existing",
          status: "active",
          customProperties: {
            date: Date.UTC(2026, 3, 10),
            isAvailable: true,
            customHours: {
              startTime: "10:00",
              endTime: "12:00",
            },
            reason: "Regatta prep",
          },
        },
      ],
      blocks: [
        {
          _id: "objects_block_existing",
          status: "active",
          customProperties: {
            startDate: Date.UTC(2026, 3, 11),
            endDate: Date.UTC(2026, 3, 13),
            reason: "Maintenance",
          },
        },
      ],
    }

    useAuthMock.mockReturnValue({ sessionId: SESSION_ID } as any)
    useCurrentOrganizationMock.mockReturnValue({ id: ORGANIZATION_ID } as any)
    useNotificationMock.mockReturnValue({
      success: successMock,
      error: errorMock,
      info: vi.fn(),
    } as any)

    setWeeklyScheduleMock.mockResolvedValue({ scheduleIds: [] })
    updateProductMock.mockResolvedValue({ success: true })
    createExceptionMock.mockResolvedValue({ exceptionId: "objects_exception_new" })
    updateExceptionMock.mockResolvedValue({ exceptionId: "objects_exception_existing" })
    deleteExceptionMock.mockResolvedValue({ success: true })
    createBlockMock.mockResolvedValue({ blockId: "objects_block_new" })
    updateBlockMock.mockResolvedValue({ blockId: "objects_block_existing" })
    deleteBlockMock.mockResolvedValue({ success: true })

    useQueryMock.mockImplementation((_queryRef, args) => {
      if (args === "skip") {
        return undefined
      }
      if (args && typeof args === "object" && "organizationId" in args) {
        return PRODUCTS
      }
      if (args && typeof args === "object" && "resourceId" in args) {
        return availabilitySnapshot
      }
      return undefined
    })

    let mutationIndex = 0
    const orderedMutations = [
      setWeeklyScheduleMock,
      updateProductMock,
      createExceptionMock,
      updateExceptionMock,
      deleteExceptionMock,
      createBlockMock,
      updateBlockMock,
      deleteBlockMock,
    ]

    useMutationMock.mockImplementation(() => {
      const nextMutation = orderedMutations[mutationIndex % orderedMutations.length] || vi.fn()
      mutationIndex += 1
      return nextMutation
    })
  })

  it("hydrates saved overrides and blackout windows for the selected resource", () => {
    renderResourceAvailability()

    expect(screen.getByText("Date Overrides")).toBeTruthy()
    expect(screen.getByDisplayValue("2026-04-10")).toBeTruthy()
    expect(screen.getByDisplayValue("10:00")).toBeTruthy()
    expect(screen.getByDisplayValue("12:00")).toBeTruthy()
    expect(screen.getByDisplayValue("Regatta prep")).toBeTruthy()
    expect(screen.getByDisplayValue("2026-04-11")).toBeTruthy()
    expect(screen.getByDisplayValue("2026-04-13")).toBeTruthy()
    expect(screen.getByDisplayValue("Maintenance")).toBeTruthy()
  })

  it("creates overrides and same-day blackout windows with UTC day timestamps", async () => {
    availabilitySnapshot = {
      schedules: baseSchedule,
      exceptions: [],
      blocks: [],
    }

    renderResourceAvailability()

    fireEvent.click(screen.getByRole("button", { name: "Add override" }))
    fireEvent.change(screen.getByLabelText("Override date"), {
      target: { value: "2026-04-15" },
    })
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "08:30" },
    })
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "11:00" },
    })
    fireEvent.change(screen.getByPlaceholderText("Holiday, special event, staff time-off..."), {
      target: { value: "Race-day special hours" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create override" }))

    await waitFor(() => {
      expect(createExceptionMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        resourceId: RESOURCE_ID,
        date: Date.UTC(2026, 3, 15),
        isAvailable: true,
        customHours: {
          startTime: "08:30",
          endTime: "11:00",
        },
        reason: "Race-day special hours",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Add blackout" }))
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-04-16" },
    })
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-04-16" },
    })
    fireEvent.change(screen.getByPlaceholderText("Maintenance, chartered trip, seasonal closure..."), {
      target: { value: "One-day yard slot" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create blackout" }))

    await waitFor(() => {
      expect(createBlockMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        resourceId: RESOURCE_ID,
        startDate: Date.UTC(2026, 3, 16),
        endDate: Date.UTC(2026, 3, 16),
        reason: "One-day yard slot",
      })
    })
  })

  it("updates and deletes existing overrides and blackout windows", async () => {
    renderResourceAvailability()

    fireEvent.change(screen.getByDisplayValue("Regatta prep"), {
      target: { value: "Weather hold" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Update override" }))

    await waitFor(() => {
      expect(updateExceptionMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        exceptionId: "objects_exception_existing",
        date: Date.UTC(2026, 3, 10),
        isAvailable: true,
        customHours: {
          startTime: "10:00",
          endTime: "12:00",
        },
        reason: "Weather hold",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Delete override" }))

    await waitFor(() => {
      expect(deleteExceptionMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        exceptionId: "objects_exception_existing",
      })
    })

    fireEvent.change(screen.getByDisplayValue("Maintenance"), {
      target: { value: "Boatyard access" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Update blackout" }))

    await waitFor(() => {
      expect(updateBlockMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        blockId: "objects_block_existing",
        startDate: Date.UTC(2026, 3, 11),
        endDate: Date.UTC(2026, 3, 13),
        reason: "Boatyard access",
      })
    })

    fireEvent.click(screen.getByRole("button", { name: "Delete blackout" }))

    await waitFor(() => {
      expect(deleteBlockMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        blockId: "objects_block_existing",
      })
    })
  })
})
