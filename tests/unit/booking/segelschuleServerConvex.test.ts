import { afterEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

describe("segelschule server convex org resolution", () => {
  afterEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  it("prefers explicit org scope before platform fallbacks", async () => {
    process.env.ORG_ID = "org_explicit"
    process.env.PLATFORM_ORG_ID = "org_platform"
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID = "org_public_platform"
    process.env.L4YERCAK3_ORGANIZATION_ID = "org_legacy_platform"
    process.env.NEXT_PUBLIC_ORG_ID = "org_public"
    process.env.TEST_ORG_ID = "org_test"

    const module = await import(
      "../../../apps/segelschule-altwarp/lib/server-convex"
    )

    expect(module.getOrganizationId()).toBe("org_explicit")
  })

  it("falls back to platform env scope when no request host is available", async () => {
    delete process.env.ORG_ID
    process.env.PLATFORM_ORG_ID = "org_platform"
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID = "org_public_platform"
    process.env.L4YERCAK3_ORGANIZATION_ID = "org_legacy_platform"

    const module = await import(
      "../../../apps/segelschule-altwarp/lib/server-convex"
    )

    await expect(
      module.resolveSegelschuleOrganizationId({})
    ).resolves.toBe("org_platform")
  })
})
