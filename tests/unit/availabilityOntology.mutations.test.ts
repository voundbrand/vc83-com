import { describe, expect, it, vi } from "vitest"

vi.mock("../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    userId: "users_availability_test",
  })),
}))

import { createBlock, updateException } from "../../convex/availabilityOntology"

describe("availability ontology mutations", () => {
  it("accepts single-day blackout windows", async () => {
    const db = {
      get: vi.fn(async () => ({
        _id: "objects_resource_availability",
        type: "product",
        organizationId: "organizations_availability",
      })),
      insert: vi
        .fn()
        .mockResolvedValueOnce("objects_block_created")
        .mockResolvedValueOnce("objectLinks_block_created"),
    }

    const result = await (createBlock as any)._handler(
      { db },
      {
        sessionId: "session_availability",
        resourceId: "objects_resource_availability",
        startDate: Date.UTC(2026, 3, 20),
        endDate: Date.UTC(2026, 3, 20),
        reason: "One-day maintenance",
      }
    )

    expect(result).toEqual({ blockId: "objects_block_created" })
    expect(db.insert).toHaveBeenCalledWith(
      "objects",
      expect.objectContaining({
        subtype: "block",
        customProperties: expect.objectContaining({
          startDate: Date.UTC(2026, 3, 20),
          endDate: Date.UTC(2026, 3, 20),
        }),
      })
    )
  })

  it("clears custom hours when an exception is switched to unavailable", async () => {
    const existingException = {
      _id: "objects_exception_existing",
      type: "availability",
      subtype: "exception",
      customProperties: {
        resourceId: "objects_resource_availability",
        date: Date.UTC(2026, 3, 21),
        isAvailable: true,
        customHours: {
          startTime: "09:00",
          endTime: "12:00",
        },
        reason: "Special launch window",
      },
    }

    const db = {
      get: vi.fn(async (id: string) => {
        if (id === "objects_exception_existing") {
          return existingException
        }
        return null
      }),
      query: vi.fn(() => ({
        withIndex: vi.fn((_indexName, indexFn) => {
          const chain = {
            eq: vi.fn(() => chain),
          }
          indexFn(chain)
          return {
            collect: vi.fn(async () => [
              {
                toObjectId: "objects_exception_existing",
              },
            ]),
          }
        }),
      })),
      patch: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    }

    await (updateException as any)._handler(
      { db },
      {
        sessionId: "session_availability",
        exceptionId: "objects_exception_existing",
        isAvailable: false,
      }
    )

    expect(db.patch).toHaveBeenCalledWith(
      "objects_exception_existing",
      expect.objectContaining({
        customProperties: expect.objectContaining({
          isAvailable: false,
          customHours: null,
        }),
      })
    )
  })
})
