/**
 * Seed script: Creates the "Seven Agents" CRM pipeline in the platform organization.
 *
 * Usage:
 *   npx tsx scripts/seed-seven-agents-pipeline.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_CONVEX_URL
 *   CONVEX_DEPLOY_KEY
 *   PLATFORM_ORG_ID (or TEST_ORG_ID / NEXT_PUBLIC_PLATFORM_ORG_ID)
 *
 * Output:
 *   Prints pipeline ID + stage IDs for .env configuration.
 */

import { ConvexHttpClient } from "convex/browser"
import type { FunctionReference } from "convex/server"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { name: "New Lead", color: "#3B82F6", order: 0 },
  { name: "Contacted", color: "#F59E0B", order: 1 },
  { name: "Demo Booked", color: "#8B5CF6", order: 2 },
  { name: "Qualified", color: "#10B981", order: 3 },
  { name: "Won", color: "#22C55E", order: 4 },
  { name: "Lost", color: "#EF4444", order: 5 },
]

// ---------------------------------------------------------------------------
// Convex client (same pattern as server-convex.ts)
// ---------------------------------------------------------------------------

function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const adminToken = process.env.CONVEX_DEPLOY_KEY

  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
  if (!adminToken) throw new Error("CONVEX_DEPLOY_KEY is not set")

  const client = new ConvexHttpClient(convexUrl)
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void
  }
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(adminToken)
  }
  return client
}

function getOrganizationId(): string {
  const orgId =
    process.env.PLATFORM_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID
  if (!orgId) throw new Error("No organization ID configured")
  return orgId
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedInternalApi: any =
  require("../../../convex/_generated/api").internal

async function mutateInternal<T>(
  convex: ConvexHttpClient,
  ref: FunctionReference<"mutation", "internal">,
  args: Record<string, unknown>
): Promise<T> {
  const publicRef = ref as unknown as FunctionReference<
    "mutation",
    "public",
    Record<string, unknown>,
    T
  >
  return convex.mutation(publicRef, args)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const convex = getConvexClient()
  const organizationId = getOrganizationId()
  const now = Date.now()

  console.log(`\nSeeding "Seven Agents" pipeline for org: ${organizationId}\n`)

  // Create pipeline object
  const pipelineId = await mutateInternal<string>(
    convex,
    generatedInternalApi.channels.router.insertObjectInternal,
    {
      organizationId,
      type: "crm_pipeline",
      subtype: "sales",
      name: "Seven Agents",
      status: "active",
      customProperties: {
        description: "Leads from the Seven Agents landing page",
        category: "sales",
        isDefault: false,
      },
      createdAt: now,
      updatedAt: now,
    }
  )

  console.log(`Pipeline created: ${pipelineId}`)

  // Create stages
  const stageIds: Record<string, string> = {}

  for (const stage of PIPELINE_STAGES) {
    const stageId = await mutateInternal<string>(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId,
        type: "crm_pipeline_stage",
        name: stage.name,
        status: "active",
        customProperties: {
          color: stage.color,
          order: stage.order,
          probabilityWeight: stage.order === 5 ? 0 : (stage.order + 1) * 20,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // Link stage to pipeline
    await mutateInternal<string>(
      convex,
      generatedInternalApi.channels.router.insertObjectLinkInternal,
      {
        organizationId,
        fromObjectId: stageId,
        toObjectId: pipelineId,
        linkType: "belongs_to_pipeline",
        properties: { order: stage.order },
        createdAt: now,
      }
    )

    stageIds[stage.name] = stageId
    console.log(`  Stage "${stage.name}" created: ${stageId}`)
  }

  console.log("\n--- Add these to your .env ---\n")
  console.log(`SEVEN_AGENTS_PIPELINE_ID=${pipelineId}`)
  console.log(`SEVEN_AGENTS_FIRST_STAGE_ID=${stageIds["New Lead"]}`)
  console.log("")
}

main().catch((error) => {
  console.error("Seed failed:", error)
  process.exit(1)
})
