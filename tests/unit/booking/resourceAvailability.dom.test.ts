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
    tWithFallback: (
      _key: string,
      fallback: string,
      values?: Record<string, string | number>
    ) =>
      fallback.replace(/\{(\w+)\}/g, (_match, token) =>
        values && token in values ? String(values[token]) : `{${token}}`
      ),
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
const createProductMock = vi.fn()
const setWeeklyScheduleMock = vi.fn()
const updateProductMock = vi.fn()
const createExceptionMock = vi.fn()
const updateExceptionMock = vi.fn()
const deleteExceptionMock = vi.fn()
const createBlockMock = vi.fn()
const updateBlockMock = vi.fn()
const deleteBlockMock = vi.fn()
const archiveProductMock = vi.fn()

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

function renderResourceAvailability(selectedResourceId: any = RESOURCE_ID) {
  return render(
    React.createElement(ResourceAvailability, {
      selectedResourceId,
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

    createProductMock.mockResolvedValue("objects_resource_new")
    setWeeklyScheduleMock.mockResolvedValue({ scheduleIds: [] })
    updateProductMock.mockResolvedValue({ success: true })
    createExceptionMock.mockResolvedValue({ exceptionId: "objects_exception_new" })
    updateExceptionMock.mockResolvedValue({ exceptionId: "objects_exception_existing" })
    deleteExceptionMock.mockResolvedValue({ success: true })
    createBlockMock.mockResolvedValue({ blockId: "objects_block_new" })
    updateBlockMock.mockResolvedValue({ blockId: "objects_block_existing" })
    deleteBlockMock.mockResolvedValue({ success: true })
    archiveProductMock.mockResolvedValue({ success: true })
    vi.spyOn(window, "confirm").mockReturnValue(true)

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

    useMutationMock.mockImplementation(() => {
      return async (args: Record<string, unknown>) => {
        if ("organizationId" in args && "subtype" in args && "price" in args) {
          return createProductMock(args)
        }
        if ("resourceId" in args && "schedules" in args) {
          return setWeeklyScheduleMock(args)
        }
        if ("productId" in args && (Object.keys(args).length > 2 || "customProperties" in args || "name" in args)) {
          return updateProductMock(args)
        }
        if ("exceptionId" in args && Object.keys(args).length === 2) {
          return deleteExceptionMock(args)
        }
        if ("exceptionId" in args) {
          return updateExceptionMock(args)
        }
        if ("blockId" in args && Object.keys(args).length === 2) {
          return deleteBlockMock(args)
        }
        if ("blockId" in args) {
          return updateBlockMock(args)
        }
        if ("resourceId" in args && "date" in args) {
          return createExceptionMock(args)
        }
        if ("resourceId" in args && "startDate" in args && "endDate" in args) {
          return createBlockMock(args)
        }
        if ("productId" in args) {
          return archiveProductMock(args)
        }
        return undefined
      }
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

  it("renders backend-discovered carriers without client-side subtype filtering", () => {
    const emptyAvailabilitySnapshot = {
      schedules: [],
      exceptions: [],
      blocks: [],
    }

    useQueryMock.mockImplementation((_queryRef, args) => {
      if (args === "skip") {
        return undefined
      }
      if (args && typeof args === "object" && "organizationId" in args) {
        return [
          {
            _id: "objects_legacy_carrier",
            name: "Legacy Carrier",
            subtype: "digital",
            status: "active",
            customProperties: {},
          },
        ]
      }
      if (args && typeof args === "object" && "resourceId" in args) {
        return emptyAvailabilitySnapshot
      }
      return undefined
    })

    renderResourceAvailability(null)

    expect(screen.getByText("Legacy Carrier")).toBeTruthy()
    expect(screen.queryByText("No bookable resources found")).toBeNull()
  })

  it("creates overrides and same-day blackout windows with UTC day timestamps", async () => {
    availabilitySnapshot = {
      schedules: baseSchedule,
      exceptions: [],
      blocks: [],
    }

    renderResourceAvailability()

    fireEvent.click(screen.getByRole("button", { name: "Add an override" }))
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

  it("renders slot duration options with minute and hour breakdowns and saves the selected duration", async () => {
    renderResourceAvailability()

    const slotDurationSelect = screen.getByRole("combobox", {
      name: /Slot duration/,
    }) as HTMLSelectElement
    expect(slotDurationSelect.value).toBe("60")
    expect(screen.getByRole("option", { name: "90 min (1h 30min)" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "120 min (2h)" })).toBeTruthy()

    fireEvent.change(slotDurationSelect, {
      target: { value: "90" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

    await waitFor(() => {
      expect(updateProductMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        productId: RESOURCE_ID,
        customProperties: {
          ...PRODUCTS[0].customProperties,
          timezone: "Europe/Berlin",
          minDuration: 90,
          slotIncrement: 90,
          bufferAfter: 15,
          bookableConfig: {
            ...PRODUCTS[0].customProperties.bookableConfig,
            timezone: "Europe/Berlin",
            minDuration: 90,
            slotIncrement: 90,
            bufferAfter: 15,
          },
        },
      })
    })
  })

  it("creates a new resource inline from the availability screen", async () => {
    renderResourceAvailability(null)

    fireEvent.click(screen.getByRole("button", { name: "Create resource" }))
    fireEvent.change(screen.getByLabelText("Resource name"), {
      target: { value: "Boat Shed" },
    })
    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "space" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create resource" }))

    await waitFor(() => {
      expect(createProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: SESSION_ID,
          organizationId: ORGANIZATION_ID,
          subtype: "space",
          name: "Boat Shed",
          price: 0,
          currency: "EUR",
          customProperties: expect.objectContaining({
            availabilityStructure: "resource_time_slot",
            timezone: expect.any(String),
            minDuration: 60,
            slotIncrement: 60,
            bufferAfter: 0,
          }),
        })
      )
    })
  })

  it("renames and archives the selected resource inline", async () => {
    renderResourceAvailability()

    fireEvent.change(screen.getByLabelText("Resource name"), {
      target: { value: "Harbor Deck" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }))

    await waitFor(() => {
      expect(updateProductMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: SESSION_ID,
          productId: RESOURCE_ID,
          name: "Harbor Deck",
        })
      )
    })

    fireEvent.click(screen.getByRole("button", { name: "Archive Resource" }))

    await waitFor(() => {
      expect(archiveProductMock).toHaveBeenCalledWith({
        sessionId: SESSION_ID,
        productId: RESOURCE_ID,
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
