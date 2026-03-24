export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getConvexClient,
  mutateInternal,
  resolveHubGwOrganizationId,
} from "@/lib/server-convex";
import type { Id } from "../../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../../../../../convex/_generated/api").internal;

/**
 * POST /api/benefits — Create a new benefit
 */
export async function POST(request: Request) {
  try {
    const orgId = await resolveHubGwOrganizationId({
      requestHost:
        request.headers.get("x-forwarded-host") || request.headers.get("host"),
    });
    if (!orgId) {
      return NextResponse.json(
        { error: "Unable to resolve organization scope from request host" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const now = Date.now();

    const convex = getConvexClient();
    const objectId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: orgId as Id<"organizations">,
        type: "benefit",
        subtype: body.subtype || "discount",
        name: body.title,
        status: "active",
        customProperties: {
          category: body.category,
          discount: body.discount,
          discountType: body.discountType,
          discountValue: body.discountValue,
          fullDescription: body.fullDescription,
          redemptionInstructions: body.redemptionInstructions,
          redemptionCode: body.redemptionCode,
          redemptionLink: body.redemptionLink,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
        },
        createdAt: now,
        updatedAt: now,
      }
    );

    return NextResponse.json({ id: objectId });
  } catch (error) {
    console.error("[api/benefits] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create benefit" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/benefits?id=<objectId> — Soft-delete (archive) a benefit
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get("id");
    if (!objectId) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();

    // Fetch the object first to verify it exists and is a benefit
    const obj = await convex.query(
      generatedInternalApi.channels.router.getObjectByIdInternal as never,
      { objectId } as never
    );

    if (!obj || (obj as { type?: string }).type !== "benefit") {
      return NextResponse.json(
        { error: "Benefit not found" },
        { status: 404 }
      );
    }

    // Soft delete by patching status to archived
    await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: (obj as { organizationId: Id<"organizations"> }).organizationId,
        type: "benefit",
        name: (obj as { name: string }).name,
        status: "archived",
        createdAt: (obj as { createdAt: number }).createdAt,
        updatedAt: Date.now(),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/benefits] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete benefit" },
      { status: 500 }
    );
  }
}
