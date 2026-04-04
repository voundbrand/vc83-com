export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import {
  getConvexClient,
  queryInternal,
  resolveSegelschuleOrganizationId,
} from "@/lib/server-convex"
import { resolveSegelschuleBookingCatalog } from "@/lib/booking-platform-bridge"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal

export async function GET(request: Request) {
  try {
    const organizationId = await resolveSegelschuleOrganizationId({
      requestHost: request.headers.get("host"),
    })
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      )
    }

    const requestUrl = new URL(request.url)
    const language = requestUrl.searchParams.get("lang") || "de"
    const convex = getConvexClient()
    const catalogResolution = await resolveSegelschuleBookingCatalog({
      convex,
      queryInternalFn: queryInternal,
      generatedInternalApi,
      organizationId,
      language,
    })

    return NextResponse.json(
      {
        ok: true,
        runtimeConfigSource: catalogResolution.runtimeResolution.source,
        runtimeConfigBindingId: catalogResolution.runtimeResolution.bindingId,
        runtimeSurfaceIdentity: catalogResolution.runtimeResolution.identity,
        warnings: catalogResolution.runtimeResolution.warnings,
        boats: catalogResolution.boats,
        courses: catalogResolution.courses,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("[Booking Catalog] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load booking catalog",
      },
      { status: 500 }
    )
  }
}
