import { describe, expect, it, vi } from "vitest"
import {
  resolveBookingSurfaceBindingInternal,
  upsertBookingSurfaceBindingInternal,
} from "../../../convex/frontendSurfaceBindings"

function buildDbWithRecords(records: Array<Record<string, unknown>>) {
  return {
    query: vi.fn(() => ({
      withIndex: vi.fn((_indexName, indexFn) => {
        const chain = {
          eq: vi.fn(() => chain),
        }
        indexFn(chain)
        return {
          collect: vi.fn(async () => records),
        }
      }),
    })),
    insert: vi.fn(async () => "binding_new"),
    patch: vi.fn(async () => undefined),
  }
}

describe("frontend surface bindings", () => {
  it("resolves highest-priority enabled binding for app/surface identity", async () => {
    const organizationId = "org_1" as any
    const db = buildDbWithRecords([
      {
        _id: "binding_low",
        organizationId,
        status: "active",
        updatedAt: 100,
        customProperties: {
          appSlug: "segelschule-altwarp",
          surfaceType: "booking",
          surfaceKey: "default",
          enabled: true,
          priority: 10,
          runtimeConfig: { timezone: "Europe/Berlin" },
          legacyBindings: { schnupper: { bookingResourceId: "low" } },
        },
      },
      {
        _id: "binding_high",
        organizationId,
        status: "active",
        updatedAt: 200,
        customProperties: {
          appSlug: "segelschule-altwarp",
          surfaceType: "booking",
          surfaceKey: "default",
          enabled: true,
          priority: 100,
          runtimeConfig: { timezone: "Europe/Berlin" },
          legacyBindings: { schnupper: { bookingResourceId: "high" } },
        },
      },
      {
        _id: "binding_disabled",
        organizationId,
        status: "active",
        updatedAt: 300,
        customProperties: {
          appSlug: "segelschule-altwarp",
          surfaceType: "booking",
          surfaceKey: "default",
          enabled: false,
          priority: 999,
          runtimeConfig: { timezone: "Europe/Berlin" },
        },
      },
    ])

    const resolved = await (resolveBookingSurfaceBindingInternal as any)._handler(
      { db },
      {
        organizationId,
        appSlug: "segelschule-altwarp",
      }
    )

    expect(resolved?.bindingId).toBe("binding_high")
    expect(resolved?.priority).toBe(100)
    expect(resolved?.surfaceType).toBe("booking")
    expect(resolved?.surfaceKey).toBe("default")
  })

  it("creates a new binding when no existing identity matches", async () => {
    const organizationId = "org_1" as any
    const userId = "user_1" as any
    const db = buildDbWithRecords([])
    const ctx = { db }

    const result = await (upsertBookingSurfaceBindingInternal as any)._handler(
      ctx,
      {
        organizationId,
        userId,
        appSlug: "segelschule-altwarp",
        runtimeConfig: {
          timezone: "Europe/Berlin",
          inventoryGroups: [
            { id: "fraukje", label: "Fraukje", capacity: 4 },
            { id: "rose", label: "Rose", capacity: 4 },
          ],
          courses: [],
        },
      }
    )

    expect(result.success).toBe(true)
    expect(result.created).toBe(true)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db.patch).not.toHaveBeenCalled()

    const insertPayload = (db.insert as any).mock.calls[0][1]
    expect(insertPayload.type).toBe("frontend_surface_binding")
    expect(insertPayload.subtype).toBe("booking")
    expect(insertPayload.customProperties.appSlug).toBe("segelschule-altwarp")
    expect(insertPayload.customProperties.runtimeConfig).toEqual(
      expect.objectContaining({
        timezone: "Europe/Berlin",
      })
    )
  })

  it("normalizes app/surface identity tokens to lowercase on upsert", async () => {
    const organizationId = "org_1" as any
    const userId = "user_1" as any
    const db = buildDbWithRecords([])

    await (upsertBookingSurfaceBindingInternal as any)._handler(
      { db },
      {
        organizationId,
        userId,
        appSlug: " Segelschule-Altwarp ",
        surfaceType: " Booking ",
        surfaceKey: " Default ",
        runtimeConfig: {
          timezone: "Europe/Berlin",
          inventoryGroups: [],
          courses: [],
        },
      }
    )

    const insertPayload = (db.insert as any).mock.calls[0][1]
    expect(insertPayload.customProperties.appSlug).toBe("segelschule-altwarp")
    expect(insertPayload.customProperties.surfaceType).toBe("booking")
    expect(insertPayload.customProperties.surfaceKey).toBe("default")
  })
})
