export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const generatedApi: any = require("../../../../../../convex/_generated/api");

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  const client = new ConvexHttpClient(convexUrl);
  const adminToken = process.env.CONVEX_DEPLOY_KEY;
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void;
  };

  if (adminToken && typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(adminToken);
  }

  return client;
}

export async function GET(request: NextRequest) {
  try {
    const storageId = request.nextUrl.searchParams.get("storageId")?.trim();
    if (!storageId) {
      return NextResponse.json({ error: "storageId is required" }, { status: 400 });
    }

    const convex = getConvexClient();
    const url = await convex.query(generatedApi.api.files.getFileUrl, {
      storageId: storageId as Id<"_storage">,
    });

    return NextResponse.json({ url: url || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve file URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
