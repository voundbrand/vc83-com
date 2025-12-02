/**
 * CRM ORGANIZATION PIPELINE VIEW
 *
 * Provides read-only view of organization's contacts and their pipeline stages.
 * Used in the Organization form to show overall pipeline status.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";

/**
 * GET ORGANIZATION CONTACTS WITH PIPELINE STAGES
 *
 * Returns all contacts associated with an organization,
 * along with their current pipeline stages.
 *
 * Used for read-only display in Organization form.
 */
export const getOrganizationContactsWithPipelines = query({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"), // The CRM organization (not platform org)
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const crmOrg = await ctx.db.get(args.crmOrganizationId);
    if (!crmOrg || crmOrg.type !== "crm_organization") {
      throw new Error("CRM Organization not found");
    }

    // Get all contacts linked to this organization
    const contactLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.crmOrganizationId))
      .filter((q) => q.eq(q.field("linkType"), "works_at"))
      .collect();

    // Get contact details and their pipeline positions
    const contactsWithPipelines = await Promise.all(
      contactLinks.map(async (link) => {
        const contact = await ctx.db.get(link.fromObjectId);
        if (!contact || contact.type !== "crm_contact") return null;

        // Get all pipeline positions for this contact
        const pipelineLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_object", (q) => q.eq("fromObjectId", contact._id))
          .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
          .collect();

        // Get pipeline and stage details for each position
        const pipelinePositions = await Promise.all(
          pipelineLinks.map(async (pipelineLink) => {
            const stageId = pipelineLink.toObjectId;
            const pipelineId = (pipelineLink.properties as { pipelineId?: Id<"objects"> })?.pipelineId;

            if (!pipelineId) return null;

            const [stage, pipeline] = await Promise.all([
              ctx.db.get(stageId),
              ctx.db.get(pipelineId),
            ]);

            if (!stage || !pipeline) return null;

            return {
              pipelineId: pipeline._id,
              pipelineName: pipeline.name,
              stageId: stage._id,
              stageName: stage.name,
              stageColor: (stage.customProperties as { color?: string })?.color || "#6B46C1",
              movedAt: (pipelineLink.properties as { movedAt?: number })?.movedAt || pipelineLink.createdAt,
            };
          })
        );

        return {
          contactId: contact._id,
          contactName: contact.name,
          contactEmail: (contact.customProperties as { email?: string })?.email || "",
          contactJobTitle: (contact.customProperties as { jobTitle?: string })?.jobTitle || "",
          pipelines: pipelinePositions.filter((p) => p !== null),
        };
      })
    );

    // Filter out null contacts and sort by name
    const validContacts = contactsWithPipelines
      .filter((c) => c !== null)
      .sort((a, b) => a!.contactName.localeCompare(b!.contactName));

    return {
      organizationId: crmOrg._id,
      organizationName: crmOrg.name,
      contacts: validContacts,
      totalContacts: validContacts.length,
      contactsInPipelines: validContacts.filter((c) => c!.pipelines.length > 0).length,
    };
  },
});

/**
 * GET ORGANIZATION PIPELINE SUMMARY
 *
 * Returns aggregated pipeline statistics for an organization.
 * Shows how many contacts are in each stage across all pipelines.
 */
export const getOrganizationPipelineSummary = query({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the contacts data using the same handler logic
    const crmOrg = await ctx.db.get(args.crmOrganizationId);
    if (!crmOrg || crmOrg.type !== "crm_organization") {
      throw new Error("CRM Organization not found");
    }

    // Get all contacts linked to this organization
    const contactLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.crmOrganizationId))
      .filter((q) => q.eq(q.field("linkType"), "works_at"))
      .collect();

    // Get contact details and their pipeline positions
    const contactsWithPipelines = await Promise.all(
      contactLinks.map(async (link) => {
        const contact = await ctx.db.get(link.fromObjectId);
        if (!contact || contact.type !== "crm_contact") return null;

        // Get all pipeline positions for this contact
        const pipelineLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_object", (q) => q.eq("fromObjectId", contact._id))
          .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
          .collect();

        // Get pipeline and stage details for each position
        const pipelinePositions = await Promise.all(
          pipelineLinks.map(async (pipelineLink) => {
            const stageId = pipelineLink.toObjectId;
            const pipelineId = (pipelineLink.properties as { pipelineId?: Id<"objects"> })?.pipelineId;

            if (!pipelineId) return null;

            const [stage, pipeline] = await Promise.all([
              ctx.db.get(stageId),
              ctx.db.get(pipelineId),
            ]);

            if (!stage || !pipeline) return null;

            return {
              pipelineId: pipeline._id,
              pipelineName: pipeline.name,
              stageId: stage._id,
              stageName: stage.name,
              stageColor: (stage.customProperties as { color?: string })?.color || "#6B46C1",
            };
          })
        );

        return {
          contactId: contact._id,
          pipelines: pipelinePositions.filter((p) => p !== null),
        };
      })
    );

    const validContacts = contactsWithPipelines.filter((c) => c !== null);

    // Aggregate by pipeline and stage
    const pipelineSummary = new Map<string, {
      pipelineId: Id<"objects">;
      pipelineName: string;
      stages: Map<string, {
        stageId: Id<"objects">;
        stageName: string;
        stageColor: string;
        contactCount: number;
      }>;
    }>();

    validContacts.forEach((contact) => {
      contact!.pipelines.forEach((position) => {
        // Get or create pipeline entry
        if (!pipelineSummary.has(position.pipelineId)) {
          pipelineSummary.set(position.pipelineId, {
            pipelineId: position.pipelineId,
            pipelineName: position.pipelineName,
            stages: new Map(),
          });
        }

        const pipeline = pipelineSummary.get(position.pipelineId)!;

        // Get or create stage entry
        if (!pipeline.stages.has(position.stageId)) {
          pipeline.stages.set(position.stageId, {
            stageId: position.stageId,
            stageName: position.stageName,
            stageColor: position.stageColor,
            contactCount: 0,
          });
        }

        // Increment contact count
        pipeline.stages.get(position.stageId)!.contactCount++;
      });
    });

    // Convert to array format
    const summary = Array.from(pipelineSummary.values()).map((pipeline) => ({
      pipelineId: pipeline.pipelineId,
      pipelineName: pipeline.pipelineName,
      stages: Array.from(pipeline.stages.values()),
      totalContacts: Array.from(pipeline.stages.values()).reduce(
        (sum, stage) => sum + stage.contactCount,
        0
      ),
    }));

    const totalContacts = validContacts.length;
    const contactsInPipelines = validContacts.filter((c) => c!.pipelines.length > 0).length;

    return {
      organizationId: crmOrg._id,
      organizationName: crmOrg.name,
      totalContacts,
      contactsInPipelines,
      pipelines: summary,
    };
  },
});
