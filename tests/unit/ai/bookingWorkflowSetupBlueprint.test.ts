import { describe, expect, it } from "vitest"
import { __testables } from "../../../convex/ai/tools/bookingWorkflowTool"

describe("booking workflow setup blueprint helpers", () => {
  it("returns default sailing school catalog with 2 inventory groups and 3 courses", () => {
    const catalog = __testables.buildDefaultSeatBookingCatalog()

    expect(catalog.timezone).toBe("Europe/Berlin")
    expect(catalog.inventoryGroups).toEqual([
      { id: "fraukje", label: "Fraukje", capacity: 4 },
      { id: "rose", label: "Rose", capacity: 4 },
    ])
    expect(catalog.courses.map((course) => course.courseId)).toEqual([
      "schnupper",
      "grund",
      "intensiv",
    ])
  })

  it("builds legacy bridge bindings from catalog courses", () => {
    const catalog = __testables.buildSeatBookingCatalog({
      setupTemplate: "sailing_school_two_boats",
      catalogInput: {
        courses: [
          {
            courseId: "schnupper",
            bookingDurationMinutes: 180,
            bookingResourceId: "resource_taster",
            checkoutProductId: "checkout_taster",
            checkoutPublicUrl: "https://example.com/checkout/taster",
            availableTimes: ["09:00"],
          },
        ],
      },
    })
    const bindings = __testables.buildLegacyBindingsFromCatalog(catalog)

    expect(bindings.schnupper).toEqual({
      bookingResourceId: "resource_taster",
      checkoutProductId: "checkout_taster",
      checkoutPublicUrl: "https://example.com/checkout/taster",
      bookingDurationMinutes: 180,
    })
  })

  it("creates diagnostics with candidate IDs, URL candidates, and warnings for required mappings", () => {
    const catalog = __testables.buildSeatBookingCatalog({
      setupTemplate: "sailing_school_two_boats",
      catalogInput: {
        inventoryGroups: [
          { id: "a", label: "A", capacity: 5 },
        ],
        courses: [
          {
            courseId: "grund",
            displayName: "Weekend course",
            bookingDurationMinutes: 480,
            availableTimes: ["09:00"],
          },
        ],
      },
    })

    const diagnostics = __testables.buildCourseSetupDiagnostics({
      catalog,
      productEntities: [
        { _id: "obj_resource_weekend", name: "Weekend Course Resource" },
      ],
      checkoutEntities: [
        {
          _id: "obj_checkout_weekend",
          name: "Weekend Course Checkout",
          publicSlug: "weekend-course",
        },
      ],
    })

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].courseId).toBe("grund")
    expect(diagnostics[0].resourceCandidates[0]).toEqual({
      id: "obj_resource_weekend",
      name: "Weekend Course Resource",
    })
    expect(diagnostics[0].checkoutCandidates[0]).toEqual({
      id: "obj_checkout_weekend",
      name: "Weekend Course Checkout",
    })
    expect(diagnostics[0].checkoutPublicUrl).toBeNull()
    expect(diagnostics[0].checkoutPublicUrlCandidates).toEqual([
      "/checkout/weekend-course",
    ])
    expect(diagnostics[0].warnings).toEqual([
      "missing_booking_resource_id",
      "missing_checkout_product_id",
    ])
  })

  it("returns bootstrap interview questions with identity defaults", () => {
    const catalog = __testables.buildDefaultSeatBookingCatalog()
    const questions = __testables.buildBookingBootstrapInterviewQuestions({
      appSlug: "my-app",
      surfaceType: "booking",
      surfaceKey: "default",
      catalog,
    })

    expect(questions.length).toBeGreaterThanOrEqual(6)
    const identityQuestion = questions.find((q) => q.id === "surface_identity")
    expect(identityQuestion?.defaultValue).toEqual({
      appSlug: "my-app",
      surfaceType: "booking",
      surfaceKey: "default",
    })
    const strategyQuestion = questions.find((q) => q.id === "checkout_strategy")
    expect(strategyQuestion?.options).toEqual(["per_course", "shared"])
  })

  it("resolves course price cents from overrides and defaults", () => {
    expect(
      __testables.resolveCoursePriceCents({
        bootstrapConfig: { defaultPriceCents: 1234 },
        courseOverride: undefined,
      })
    ).toBe(1234)
    expect(
      __testables.resolveCoursePriceCents({
        bootstrapConfig: { defaultPrice: 19.99 },
        courseOverride: { price: 39.5 },
      })
    ).toBe(3950)
    expect(
      __testables.resolveCoursePriceCents({
        bootstrapConfig: {},
        courseOverride: {},
      })
    ).toBe(0)
  })
})
