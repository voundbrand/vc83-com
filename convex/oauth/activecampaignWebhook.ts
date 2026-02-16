/**
 * ActiveCampaign Webhook Processing
 *
 * Handles incoming webhook events from ActiveCampaign.
 * Resolves organizations, forwards to workflows, and syncs contacts.
 */

import { action, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "../_generated/dataModel";

const generatedApi: any = require("../_generated/api");

/**
 * Find organization by ActiveCampaign account name
 * Used by webhook handler to route events to correct org
 */
export const findOrganizationByAccount = query({
  args: {
    accountName: v.string(),
  },
  handler: async (ctx, args): Promise<{ organizationId: string } | null> => {
    // Look up the oauthConnection where providerAccountId matches the AC account name
    const connection = await ctx.db
      .query("oauthConnections")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "activecampaign"),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("providerAccountId"), args.accountName)
        )
      )
      .first();

    if (!connection) {
      return null;
    }

    return {
      organizationId: connection.organizationId as string,
    };
  },
});

/**
 * Process incoming webhook event
 * Triggers workflows configured for "activecampaign_event" trigger
 */
export const processWebhookEvent = action({
  args: {
    organizationId: v.id("organizations"),
    eventType: v.string(),
    eventData: v.object({
      contact: v.optional(v.object({
        id: v.optional(v.string()),
        email: v.optional(v.string()),
        first_name: v.optional(v.string()),
        last_name: v.optional(v.string()),
        phone: v.optional(v.string()),
        tags: v.optional(v.string()),
      })),
      list: v.optional(v.object({
        id: v.optional(v.string()),
        name: v.optional(v.string()),
      })),
      tag: v.optional(v.string()),
      campaign: v.optional(v.object({
        id: v.optional(v.string()),
        name: v.optional(v.string()),
      })),
      deal: v.optional(v.object({
        id: v.optional(v.string()),
        title: v.optional(v.string()),
        value: v.optional(v.string()),
        currency: v.optional(v.string()),
        pipeline: v.optional(v.string()),
        stage: v.optional(v.string()),
      })),
      link: v.optional(v.object({
        url: v.optional(v.string()),
        name: v.optional(v.string()),
      })),
      initiatedBy: v.optional(v.string()),
      dateTime: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<{ success: boolean; workflowsTriggered: number }> => {
    console.log(`[AC Webhook] Processing ${args.eventType} for org ${args.organizationId}`);

    // Log the event for audit trail
    await (ctx as any).runMutation(generatedApi.internal.oauth.activecampaignWebhook.logWebhookEvent, {
      organizationId: args.organizationId,
      eventType: args.eventType,
      eventData: args.eventData,
    });

    // Find workflows triggered by activecampaign events
    const workflows = await (ctx as any).runQuery(generatedApi.api.workflows.workflowOntology.getWorkflowsByTriggerPublic, {
      organizationId: args.organizationId,
      triggerOn: "activecampaign_event",
    }) as Doc<"objects">[];

    let workflowsTriggered = 0;

    // Filter workflows that match this specific event type
    for (const workflow of workflows) {
      const triggerConfig = workflow.customProperties?.triggerConfig as {
        eventTypes?: string[];
      } | undefined;

      // Check if workflow is configured for this event type
      if (triggerConfig?.eventTypes && !triggerConfig.eventTypes.includes(args.eventType)) {
        continue;
      }

      // Build context for workflow
      const workflowContext = {
        activeCampaignEvent: args.eventType,
        email: args.eventData.contact?.email,
        firstName: args.eventData.contact?.first_name,
        lastName: args.eventData.contact?.last_name,
        phone: args.eventData.contact?.phone,
        listId: args.eventData.list?.id,
        listName: args.eventData.list?.name,
        tag: args.eventData.tag,
        campaignId: args.eventData.campaign?.id,
        campaignName: args.eventData.campaign?.name,
        dealId: args.eventData.deal?.id,
        dealTitle: args.eventData.deal?.title,
        dealValue: args.eventData.deal?.value,
        initiatedBy: args.eventData.initiatedBy,
        eventTime: args.eventData.dateTime,
      };

      try {
        // Execute the workflow using the workflowOntology action
        await (ctx as any).runAction(generatedApi.api.workflows.workflowOntology.executeWorkflow, {
          sessionId: "system", // System-triggered workflow
          workflowId: workflow._id,
          manualTrigger: true,
          contextData: workflowContext,
        });
        workflowsTriggered++;
      } catch (error) {
        console.error(`[AC Webhook] Failed to execute workflow ${workflow._id}:`, error);
      }
    }

    return { success: true, workflowsTriggered };
  },
});

/**
 * Sync a contact from ActiveCampaign to platform CRM
 */
export const syncContactToPlatform = action({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.string(), // e.g., "activecampaign_subscribe", "activecampaign_update"
    listName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; contactId?: Id<"objects"> }> => {
    console.log(`[AC Webhook] Syncing contact to platform: ${args.email}`);

    try {
      // Check if contact already exists
      const existingContacts = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObjects, {
        organizationId: args.organizationId,
        type: "crm_contact",
      }) as Array<{ _id: Id<"objects">; customProperties?: { email?: string } }>;

      const existingContact = existingContacts.find(
        (c) => c.customProperties?.email?.toLowerCase() === args.email.toLowerCase()
      );

      if (existingContact) {
        // Update existing contact
        await (ctx as any).runMutation(generatedApi.internal.oauth.activecampaignWebhook.updateContact, {
          contactId: existingContact._id,
          firstName: args.firstName,
          lastName: args.lastName,
          phone: args.phone,
          source: args.source,
        });

        return { success: true, contactId: existingContact._id };
      }

      // Create new contact
      const contactId = await (ctx as any).runMutation(generatedApi.internal.oauth.activecampaignWebhook.createContact, {
        organizationId: args.organizationId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        source: args.source,
        listName: args.listName,
      });

      return { success: true, contactId };
    } catch (error) {
      console.error("[AC Webhook] Failed to sync contact:", error);
      return { success: false };
    }
  },
});

/**
 * Log webhook event for audit trail
 */
export const logWebhookEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventType: v.string(),
    eventData: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "activecampaign_webhook_log",
      name: `AC Event: ${args.eventType}`,
      status: "logged",
      customProperties: {
        eventType: args.eventType,
        eventData: args.eventData,
        receivedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create a new CRM contact from ActiveCampaign
 */
export const createContact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.string(),
    listName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    const contactId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_contact",
      name: `${args.firstName || ""} ${args.lastName || ""}`.trim() || args.email,
      status: "active",
      customProperties: {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        source: args.source,
        activeCampaignList: args.listName,
        importedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return contactId;
  },
});

/**
 * Update an existing CRM contact
 */
export const updateContact = internalMutation({
  args: {
    contactId: v.id("objects"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return;

    const currentProps = contact.customProperties as Record<string, unknown> || {};

    await ctx.db.patch(args.contactId, {
      name: `${args.firstName || currentProps.firstName || ""} ${args.lastName || currentProps.lastName || ""}`.trim() || (currentProps.email as string) || "Unknown",
      customProperties: {
        ...currentProps,
        ...(args.firstName && { firstName: args.firstName }),
        ...(args.lastName && { lastName: args.lastName }),
        ...(args.phone && { phone: args.phone }),
        lastSyncedFrom: args.source,
        lastSyncedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
  },
});
