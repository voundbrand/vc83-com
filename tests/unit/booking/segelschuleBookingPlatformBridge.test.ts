import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getCoursePlatformBinding,
  getSegelschuleSurfaceBindingIdentity,
  getSegelschuleBookingRuntimeConfig,
  normalizeSeatSelections,
  parseBookingStartTimestamp,
  resolveSegelschuleRuntimeConfig,
  resolveCourseBookingDurationMinutes,
} from "../../../apps/segelschule-altwarp/lib/booking-platform-bridge"

const ORIGINAL_ENV = { ...process.env }

function resetBookingEnv() {
  delete process.env.SEGELSCHULE_COURSE_BINDINGS
  delete process.env.SEGELSCHULE_COURSE_BINDINGS_JSON
  delete process.env.SEGELSCHULE_BOOKING_CATALOG
  delete process.env.SEGELSCHULE_BOOKING_CATALOG_JSON
  delete process.env.SEGELSCHULE_BOOKING_TIMEZONE
  delete process.env.SEGELSCHULE_SURFACE_APP_SLUG
  delete process.env.SEGELSCHULE_SURFACE_TYPE
  delete process.env.SEGELSCHULE_SURFACE_KEY
}

describe("segelschule booking platform bridge", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    resetBookingEnv()
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    resetBookingEnv()
  })

  it("provides default two-boat runtime config and default courses", () => {
    const runtime = getSegelschuleBookingRuntimeConfig()

    expect(runtime.boats).toEqual([
      { id: "fraukje", name: "Fraukje", seatCount: 4 },
      { id: "rose", name: "Rose", seatCount: 4 },
    ])
    expect(Object.keys(runtime.courses).sort()).toEqual(
      ["grund", "intensiv", "schnupper"]
    )
    expect(runtime.defaultAvailableTimes).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "13:00",
      "14:00",
      "15:00",
    ])
  })

  it("supports legacy course binding env and exposes bridge lookup", () => {
    process.env.SEGELSCHULE_COURSE_BINDINGS_JSON = JSON.stringify({
      schnupper: {
        bookingResourceId: "resource_schnupper",
        checkoutProductId: "product_schnupper",
        bookingDurationMinutes: 210,
      },
    })

    const binding = getCoursePlatformBinding("schnupper")
    expect(binding).toEqual({
      courseId: "schnupper",
      bookingResourceId: "resource_schnupper",
      checkoutProductId: "product_schnupper",
      checkoutPublicUrl: undefined,
      bookingDurationMinutes: 210,
    })

    expect(
      resolveCourseBookingDurationMinutes({
        courseId: "schnupper",
        isMultiDayCourse: false,
      })
    ).toBe(210)
  })

  it("allows catalog env to override slots, boats, and duration", () => {
    process.env.SEGELSCHULE_BOOKING_CATALOG_JSON = JSON.stringify({
      timezone: "Europe/Berlin",
      defaultAvailableTimes: ["08:00", "12:00"],
      boats: [
        { id: "fraukje", name: "Fraukje", seatCount: 4 },
        { id: "rose", name: "Rose", seatCount: 4 },
      ],
      courses: [
        {
          courseId: "intensiv",
          bookingDurationMinutes: 540,
          availableTimes: ["08:00"],
          bookingResourceId: "resource_intensiv",
          checkoutProductId: "product_intensiv",
        },
      ],
    })

    const runtime = getSegelschuleBookingRuntimeConfig()
    expect(runtime.defaultAvailableTimes).toEqual(["08:00", "12:00"])
    expect(runtime.courses.intensiv.availableTimes).toEqual(["08:00"])
    expect(runtime.courses.intensiv.bookingDurationMinutes).toBe(540)
    expect(runtime.courses.intensiv.bookingResourceId).toBe("resource_intensiv")
  })

  it("normalizes seat selections by boat id/name and validates seat ranges", () => {
    const normalized = normalizeSeatSelections({
      selections: [
        { boatName: "Fraukje", seatNumbers: [1, 2, 2] },
        { boatId: "rose", boatName: "Rose", seatNumbers: [1, 4] },
        { boatId: "fraukje", seatNumbers: [9] },
      ],
    })

    expect(normalized.selections).toEqual([
      { boatId: "fraukje", boatName: "Fraukje", seatNumbers: [1, 2] },
      { boatId: "rose", boatName: "Rose", seatNumbers: [1, 4] },
    ])
    expect(normalized.totalSeats).toBe(4)
    expect(normalized.errors).toContain("Seat 9 is invalid for Fraukje")
  })

  it("parses booking timestamps in the configured organization timezone", () => {
    expect(
      parseBookingStartTimestamp("2026-04-08", "09:00", "Europe/Berlin")
    ).toBe(Date.parse("2026-04-08T07:00:00.000Z"))
  })

  it("resolves runtime config from backend surface binding when available", async () => {
    const queryInternalFn = vi.fn().mockResolvedValue({
      bindingId: "binding_surface_1",
      runtimeConfig: {
        timezone: "Europe/Berlin",
        defaultAvailableTimes: ["08:30", "12:30"],
        inventoryGroups: [
          { id: "fraukje", label: "Fraukje", capacity: 4 },
          { id: "rose", label: "Rose", capacity: 4 },
        ],
        courses: [
          {
            courseId: "schnupper",
            bookingDurationMinutes: 210,
            availableTimes: ["08:30"],
            bookingResourceId: "resource_schnupper",
            checkoutProductId: "checkout_schnupper",
          },
        ],
      },
      legacyBindings: null,
    })

    const resolution = await resolveSegelschuleRuntimeConfig({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
      },
      organizationId: "org_123",
    })

    expect(resolution.source).toBe("backend_surface_binding")
    expect(resolution.bindingId).toBe("binding_surface_1")
    expect(resolution.warnings).toEqual([])
    expect(resolution.runtimeConfig.defaultAvailableTimes).toEqual([
      "08:30",
      "12:30",
    ])
    expect(resolution.runtimeConfig.boats).toEqual([
      { id: "fraukje", name: "Fraukje", seatCount: 4 },
      { id: "rose", name: "Rose", seatCount: 4 },
    ])
    expect(resolution.runtimeConfig.courses.schnupper.bookingResourceId).toBe(
      "resource_schnupper"
    )
    expect(
      resolution.runtimeConfig.courses.schnupper.bookingDurationMinutes
    ).toBe(210)
  })

  it("falls back to env runtime when no backend surface binding exists", async () => {
    process.env.SEGELSCHULE_COURSE_BINDINGS_JSON = JSON.stringify({
      schnupper: {
        bookingResourceId: "resource_env_schnupper",
        checkoutProductId: "checkout_env_schnupper",
        bookingDurationMinutes: 180,
      },
    })

    const resolution = await resolveSegelschuleRuntimeConfig({
      convex: {},
      queryInternalFn: vi.fn().mockResolvedValue(null),
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
      },
      organizationId: "org_123",
    })

    expect(resolution.source).toBe("env_fallback")
    expect(resolution.bindingId).toBe(null)
    expect(resolution.warnings).toContain("surface_binding_not_found")
    expect(resolution.runtimeConfig.courses.schnupper.bookingResourceId).toBe(
      "resource_env_schnupper"
    )
  })

  it("builds surface binding identity from env with sane defaults", () => {
    expect(getSegelschuleSurfaceBindingIdentity()).toEqual({
      appSlug: "segelschule-altwarp",
      surfaceType: "booking",
      surfaceKey: "default",
    })

    process.env.SEGELSCHULE_SURFACE_APP_SLUG = "custom-app"
    process.env.SEGELSCHULE_SURFACE_TYPE = "booking"
    process.env.SEGELSCHULE_SURFACE_KEY = "de-prod"

    expect(getSegelschuleSurfaceBindingIdentity()).toEqual({
      appSlug: "custom-app",
      surfaceType: "booking",
      surfaceKey: "de-prod",
    })
  })
})
