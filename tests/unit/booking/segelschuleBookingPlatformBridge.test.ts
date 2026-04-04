import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getCoursePlatformBinding,
  getSegelschuleSurfaceBindingIdentity,
  getSegelschuleBookingRuntimeConfig,
  normalizeSeatSelections,
  parseBookingStartTimestamp,
  resolveSegelschuleBookingCatalog,
  resolveSegelschuleBookingCourse,
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

  it("builds a backend-authoritative booking catalog, ignores surface-only courses, and resolves distinct checkout/resource links", async () => {
    const queryInternalFn = vi.fn(async (_convex, queryRef, args) => {
      if (queryRef === "resolver_ref") {
        return {
          bindingId: "binding_catalog_1",
          runtimeConfig: {
            timezone: "Europe/Berlin",
            defaultAvailableTimes: ["09:00"],
            inventoryGroups: [
              { id: "fraukje", label: "Fraukje", capacity: 4 },
            ],
            courses: [
              {
                courseId: "grund",
                bookingDurationMinutes: 480,
                availableTimes: ["09:00"],
                bookingResourceId: "resource_grund",
                checkoutProductId: "resource_grund",
              },
              {
                courseId: "intensiv",
                bookingDurationMinutes: 480,
                availableTimes: ["11:00"],
                bookingResourceId: "resource_intensiv",
                checkoutProductId: "resource_intensiv",
              },
            ],
          },
          legacyBindings: null,
        }
      }

      if (queryRef === "list_products_ref") {
        return [
          {
            _id: "resource_grund",
            type: "product",
            subtype: "class",
            name: "Grundkurs Resource",
            status: "active",
            customProperties: {
              segelschuleCourseId: "grund",
              bookingSurface: "segelschule-altwarp",
              bookingType: "class_enrollment",
              fulfillmentType: "ticket",
              bookingDurationMinutes: 480,
              priceInCents: 19_900,
              currency: "eur",
              isMultiDay: true,
              catalogContent: {
                aliases: ["wochenende"],
                title: {
                  de: "Wochenendkurs",
                  en: "Weekend Course",
                },
                description: {
                  de: "Zwei Tage Segelpraxis",
                  en: "Two full days on the water",
                },
                durationLabel: {
                  de: "2 Tage",
                  en: "2 days",
                },
              },
            },
          },
          {
            _id: "checkout_grund",
            type: "product",
            subtype: "ticket",
            name: "Grundkurs Checkout",
            status: "active",
            customProperties: {
              availabilityResourceId: "resource_grund",
              fulfillmentType: "ticket",
              price: 19_900,
              currency: "eur",
            },
          },
        ]
      }

      if (queryRef === "links_ref") {
        return []
      }

      if (args.objectId === "checkout_grund") {
        return {
          _id: "checkout_grund",
          type: "product",
          subtype: "ticket",
          name: "Grundkurs Checkout",
          customProperties: {
            fulfillmentType: "ticket",
            availabilityResourceId: "resource_grund",
            price: 19_900,
            currency: "eur",
          },
        }
      }

      if (args.objectId === "resource_grund") {
        return {
          _id: "resource_grund",
          type: "product",
          subtype: "class",
          name: "Grundkurs Resource",
          customProperties: {
            segelschuleCourseId: "grund",
            bookingSurface: "segelschule-altwarp",
            bookingType: "class_enrollment",
            fulfillmentType: "ticket",
            bookingDurationMinutes: 480,
            priceInCents: 19_900,
            currency: "eur",
            isMultiDay: true,
            catalogContent: {
              aliases: ["wochenende"],
              title: {
                de: "Wochenendkurs",
                en: "Weekend Course",
              },
              description: {
                de: "Zwei Tage Segelpraxis",
                en: "Two full days on the water",
              },
              durationLabel: {
                de: "2 Tage",
                en: "2 days",
              },
            },
          },
        }
      }

      return null
    })

    const catalog = await resolveSegelschuleBookingCatalog({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
        channels: {
          router: {
            getObjectByIdInternal: "get_object_ref",
            listObjectsByOrgTypeInternal: "list_products_ref",
          },
        },
        objectLinksInternal: {
          getLinksFromObject: "links_ref",
        },
      },
      organizationId: "org_123",
      language: "de",
    })

    expect(catalog.runtimeResolution.source).toBe("backend_surface_binding")
    expect(catalog.courses.map((course) => course.courseId)).toEqual(["grund"])
    const grundCourse = catalog.courses.find((course) => course.courseId === "grund")
    expect(grundCourse).toBeTruthy()
    expect(grundCourse?.warnings).toContain(
      "runtime_checkout_product_mismatch_with_backend"
    )
    expect(grundCourse).toMatchObject({
      courseId: "grund",
      aliases: ["grund", "wochenende"],
      title: "Wochenendkurs",
      description: "Zwei Tage Segelpraxis",
      durationLabel: "2 Tage",
      durationMinutes: 480,
      priceInCents: 19_900,
      currency: "EUR",
      isMultiDay: true,
      checkoutProductId: "checkout_grund",
      bookingResourceId: "resource_grund",
      fulfillmentType: "ticket",
    })

    const courseResolution = await resolveSegelschuleBookingCourse({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
        channels: {
          router: {
            getObjectByIdInternal: "get_object_ref",
            listObjectsByOrgTypeInternal: "list_products_ref",
          },
        },
        objectLinksInternal: {
          getLinksFromObject: "links_ref",
        },
      },
      organizationId: "org_123",
      courseId: "wochenende",
      language: "en",
    })

    expect(courseResolution.requestedCourseId).toBe("wochenende")
    expect(courseResolution.resolvedCourseId).toBe("grund")
    expect(courseResolution.course).toMatchObject({
      courseId: "grund",
      title: "Weekend Course",
      description: "Two full days on the water",
      durationLabel: "2 days",
    })
  })

  it("discovers backend courses even when the surface payload does not enumerate them", async () => {
    const queryInternalFn = vi.fn(async (_convex, queryRef, args) => {
      if (queryRef === "resolver_ref") {
        return {
          bindingId: "binding_catalog_2",
          runtimeConfig: {
            timezone: "Europe/Berlin",
            defaultAvailableTimes: ["09:00"],
            inventoryGroups: [
              { id: "fraukje", label: "Fraukje", capacity: 4 },
            ],
            courses: [
              {
                courseId: "intensiv",
                bookingDurationMinutes: 480,
                availableTimes: ["11:00"],
                bookingResourceId: "resource_intensiv",
                checkoutProductId: "resource_intensiv",
              },
            ],
          },
          legacyBindings: null,
        }
      }

      if (queryRef === "list_products_ref") {
        return [
          {
            _id: "checkout_grund",
            type: "product",
            subtype: "ticket",
            status: "active",
            name: "Grundkurs Checkout",
            customProperties: {
              segelschuleCourseId: "grund",
              bookingSurface: "segelschule-altwarp",
              fulfillmentType: "ticket",
              availabilityResourceId: "resource_grund",
              priceInCents: 19_900,
              currency: "eur",
            },
          },
          {
            _id: "resource_grund",
            type: "product",
            subtype: "class",
            status: "active",
            name: "Grundkurs Resource",
            customProperties: {
              segelschuleCourseId: "grund",
              bookingSurface: "segelschule-altwarp",
              bookingType: "class_enrollment",
              fulfillmentType: "ticket",
              bookingDurationMinutes: 480,
              priceInCents: 19_900,
              currency: "eur",
              isMultiDay: true,
              catalogContent: {
                title: {
                  de: "Grundkurs",
                },
              },
            },
          },
        ]
      }

      if (queryRef === "links_ref") {
        return []
      }

      if (args.objectId === "checkout_grund") {
        return {
          _id: "checkout_grund",
          type: "product",
          subtype: "ticket",
          name: "Grundkurs Checkout",
          customProperties: {
            segelschuleCourseId: "grund",
            bookingSurface: "segelschule-altwarp",
            fulfillmentType: "ticket",
            availabilityResourceId: "resource_grund",
            priceInCents: 19_900,
            currency: "eur",
          },
        }
      }

      if (args.objectId === "resource_grund") {
        return {
          _id: "resource_grund",
          type: "product",
          subtype: "class",
          name: "Grundkurs Resource",
          customProperties: {
            segelschuleCourseId: "grund",
            bookingSurface: "segelschule-altwarp",
            bookingType: "class_enrollment",
            fulfillmentType: "ticket",
            bookingDurationMinutes: 480,
            priceInCents: 19_900,
            currency: "eur",
            isMultiDay: true,
            catalogContent: {
              title: {
                de: "Grundkurs",
              },
            },
          },
        }
      }

      return null
    })

    const catalog = await resolveSegelschuleBookingCatalog({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
        channels: {
          router: {
            getObjectByIdInternal: "get_object_ref",
            listObjectsByOrgTypeInternal: "list_products_ref",
          },
        },
        objectLinksInternal: {
          getLinksFromObject: "links_ref",
        },
      },
      organizationId: "org_123",
      language: "de",
    })

    expect(catalog.courses.map((course) => course.courseId)).toEqual(["grund"])
    expect(catalog.courses[0]).toMatchObject({
      courseId: "grund",
      title: "Grundkurs",
      checkoutProductId: "checkout_grund",
      bookingResourceId: "resource_grund",
    })
  })

  it("keeps commercial pricing authoritative on the checkout product instead of the booking resource", async () => {
    const queryInternalFn = vi.fn(async (_convex, queryRef, args) => {
      if (queryRef === "resolver_ref") {
        return {
          bindingId: "binding_catalog_2b",
          runtimeConfig: {
            timezone: "Europe/Berlin",
            defaultAvailableTimes: ["09:00"],
            inventoryGroups: [
              { id: "fraukje", label: "Fraukje", capacity: 4 },
            ],
          },
          legacyBindings: null,
        }
      }

      if (queryRef === "list_products_ref") {
        return [
          {
            _id: "checkout_grund",
            type: "product",
            subtype: "ticket",
            status: "active",
            name: "Grundkurs Checkout",
            customProperties: {
              segelschuleCourseId: "grund",
              bookingSurface: "segelschule-altwarp",
              fulfillmentType: "ticket",
              availabilityResourceId: "resource_grund",
              currency: "eur",
            },
          },
          {
            _id: "resource_grund",
            type: "product",
            subtype: "class",
            status: "active",
            name: "Grundkurs Resource",
            customProperties: {
              segelschuleCourseId: "grund",
              bookingSurface: "segelschule-altwarp",
              bookingType: "class_enrollment",
              fulfillmentType: "ticket",
              bookingDurationMinutes: 480,
              priceInCents: 19_900,
              currency: "eur",
              isMultiDay: true,
              catalogContent: {
                title: {
                  de: "Grundkurs",
                },
              },
            },
          },
        ]
      }

      if (queryRef === "links_ref") {
        return []
      }

      if (args.objectId === "checkout_grund") {
        return {
          _id: "checkout_grund",
          type: "product",
          subtype: "ticket",
          name: "Grundkurs Checkout",
          customProperties: {
            segelschuleCourseId: "grund",
            bookingSurface: "segelschule-altwarp",
            fulfillmentType: "ticket",
            availabilityResourceId: "resource_grund",
            currency: "eur",
          },
        }
      }

      if (args.objectId === "resource_grund") {
        return {
          _id: "resource_grund",
          type: "product",
          subtype: "class",
          name: "Grundkurs Resource",
          customProperties: {
            segelschuleCourseId: "grund",
            bookingSurface: "segelschule-altwarp",
            bookingType: "class_enrollment",
            fulfillmentType: "ticket",
            bookingDurationMinutes: 480,
            priceInCents: 19_900,
            currency: "eur",
            isMultiDay: true,
            catalogContent: {
              title: {
                de: "Grundkurs",
              },
            },
          },
        }
      }

      return null
    })

    const catalog = await resolveSegelschuleBookingCatalog({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
        channels: {
          router: {
            getObjectByIdInternal: "get_object_ref",
            listObjectsByOrgTypeInternal: "list_products_ref",
          },
        },
        objectLinksInternal: {
          getLinksFromObject: "links_ref",
        },
      },
      organizationId: "org_123",
      language: "de",
    })

    expect(catalog.courses).toHaveLength(1)
    expect(catalog.courses[0]).toMatchObject({
      courseId: "grund",
      checkoutProductId: "checkout_grund",
      bookingResourceId: "resource_grund",
      priceInCents: 0,
    })
    expect(catalog.courses[0]?.warnings).toContain("course_price_missing")
  })

  it("returns an empty catalog when only course resources exist and no commercial products are linked", async () => {
    const queryInternalFn = vi.fn(async (_convex, queryRef, args) => {
      if (queryRef === "resolver_ref") {
        return {
          bindingId: "binding_catalog_3",
          runtimeConfig: {
            timezone: "Europe/Berlin",
            defaultAvailableTimes: ["09:00"],
            inventoryGroups: [
              { id: "fraukje", label: "Fraukje", capacity: 4 },
            ],
            courses: [
              {
                courseId: "grund",
                bookingDurationMinutes: 480,
                availableTimes: ["09:00"],
                bookingResourceId: "resource_grund",
                checkoutProductId: "resource_grund",
              },
            ],
          },
          legacyBindings: null,
        }
      }

      if (queryRef === "list_products_ref") {
        return [
          {
            _id: "resource_grund",
            type: "product",
            subtype: "class",
            status: "active",
            name: "Grundkurs Resource",
            customProperties: {
              segelschuleCourseId: "grund",
              bookingSurface: "segelschule-altwarp",
              bookingType: "class_enrollment",
              fulfillmentType: "ticket",
              bookingDurationMinutes: 480,
              priceInCents: 19_900,
              currency: "eur",
              isMultiDay: true,
              catalogContent: {
                title: {
                  de: "Grundkurs",
                },
              },
            },
          },
        ]
      }

      if (queryRef === "links_ref") {
        return []
      }

      if (args.objectId === "resource_grund") {
        return {
          _id: "resource_grund",
          type: "product",
          subtype: "class",
          name: "Grundkurs Resource",
          customProperties: {
            segelschuleCourseId: "grund",
            bookingSurface: "segelschule-altwarp",
            bookingType: "class_enrollment",
            fulfillmentType: "ticket",
            bookingDurationMinutes: 480,
            priceInCents: 19_900,
            currency: "eur",
            isMultiDay: true,
            catalogContent: {
              title: {
                de: "Grundkurs",
              },
            },
          },
        }
      }

      return null
    })

    const catalog = await resolveSegelschuleBookingCatalog({
      convex: {},
      queryInternalFn,
      generatedInternalApi: {
        frontendSurfaceBindings: {
          resolveBookingSurfaceBindingInternal: "resolver_ref",
        },
        channels: {
          router: {
            getObjectByIdInternal: "get_object_ref",
            listObjectsByOrgTypeInternal: "list_products_ref",
          },
        },
        objectLinksInternal: {
          getLinksFromObject: "links_ref",
        },
      },
      organizationId: "org_123",
      language: "de",
    })

    expect(catalog.courses).toEqual([])
    expect(catalog.runtimeResolution.warnings).toContain("backend_catalog_empty")
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
