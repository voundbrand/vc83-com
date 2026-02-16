/**
 * BEHAVIOR: ACTIVECAMPAIGN SYNC
 *
 * Syncs contact data to ActiveCampaign when triggered in a workflow.
 * Can add contacts to lists, apply tags, and trigger automations.
 *
 * Priority: 15 (runs after contact creation, near end of workflow)
 *
 * Config Options:
 * - action: "upsert_contact" | "add_to_list" | "add_tag" | "trigger_automation"
 * - listId: ActiveCampaign list ID (for add_to_list)
 * - tagId: ActiveCampaign tag ID (for add_tag)
 * - automationId: ActiveCampaign automation ID (for trigger_automation)
 * - fieldMappings: Map context fields to AC custom fields
 *
 * Context Input:
 * - contactId: Platform CRM contact ID
 * - email: Contact email (required)
 * - firstName, lastName, phone: Contact details
 * - customFields: Any additional field mappings
 *
 * Returns:
 * - activeCampaignContactId: AC contact ID
 * - syncedAt: Timestamp of sync
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../../_generated/api");
import type { Id } from "../../_generated/dataModel";

interface ActiveCampaignSyncContext {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  contactId?: Id<"objects">;
  customFields?: Record<string, string>;
  customerData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

interface ActiveCampaignSyncConfig {
  action: "upsert_contact" | "add_to_list" | "add_tag" | "trigger_automation" | "full_sync";
  listId?: string;
  tagId?: string;
  automationId?: string;
  fieldMappings?: Record<string, string>;
  dryRun?: boolean;
}

interface ActiveCampaignConnection {
  _id: Id<"oauthConnections">;
  organizationId: string;
  provider: string;
  status: string;
  providerEmail?: string;
  providerAccountId?: string;
}

interface ActiveCampaignContactResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const executeActiveCampaignSync = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    requiresConnection?: boolean;
    data?: {
      activeCampaignContactId?: string;
      email?: string;
      action?: string;
      syncedAt?: number;
      dryRun?: boolean;
    };
  }> => {
    console.log("✓ [Behavior] ActiveCampaign Sync");

    const config = args.config as ActiveCampaignSyncConfig;
    const context = args.context as ActiveCampaignSyncContext;

    // Get email from context (try multiple sources)
    const email = context.email || context.customerData?.email;
    if (!email) {
      return {
        success: false,
        error: "Email is required for ActiveCampaign sync",
      };
    }

    // Check if org has ActiveCampaign connected
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: args.organizationId,
    }) as ActiveCampaignConnection | null;

    if (!connection) {
      console.log("⚠️ ActiveCampaign not connected for this organization");
      return {
        success: false,
        error: "ActiveCampaign not connected. Please connect ActiveCampaign in Settings > Integrations.",
        requiresConnection: true,
      };
    }

    // DRY RUN MODE
    if (config.dryRun) {
      console.log(`🧪 [DRY RUN] Would sync to ActiveCampaign: ${email}`);
      return {
        success: true,
        message: `[DRY RUN] Would sync contact ${email} to ActiveCampaign`,
        data: {
          email,
          action: config.action,
          dryRun: true,
        },
      };
    }

    try {
      const firstName = context.firstName || context.customerData?.firstName;
      const lastName = context.lastName || context.customerData?.lastName;
      const phone = context.phone || context.customerData?.phone;

      // Build field values from mappings
      const fieldValues: Array<{ field: string; value: string }> = [];
      if (config.fieldMappings && context.customFields) {
        for (const [acField, contextField] of Object.entries(config.fieldMappings)) {
          const value = context.customFields[contextField];
          if (value) {
            fieldValues.push({ field: acField, value });
          }
        }
      }

      let activeCampaignContactId: string | undefined;

      // Execute based on action type
      switch (config.action) {
        case "upsert_contact":
        case "full_sync": {
          // Create or update contact in ActiveCampaign
          const contact = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.upsertContact, {
            connectionId: connection._id,
            email,
            firstName,
            lastName,
            phone,
            fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
          }) as ActiveCampaignContactResponse;
          activeCampaignContactId = contact.id;
          console.log(`✅ Contact synced to ActiveCampaign: ${activeCampaignContactId}`);

          // For full_sync, also add to list and tags if configured
          if (config.action === "full_sync") {
            if (config.listId && activeCampaignContactId) {
              await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.subscribeToList, {
                connectionId: connection._id,
                contactId: activeCampaignContactId,
                listId: config.listId,
              });
              console.log(`✅ Contact added to list: ${config.listId}`);
            }

            if (config.tagId && activeCampaignContactId) {
              await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.addTagToContact, {
                connectionId: connection._id,
                contactId: activeCampaignContactId,
                tagId: config.tagId,
              });
              console.log(`✅ Tag applied to contact: ${config.tagId}`);
            }
          }
          break;
        }

        case "add_to_list": {
          if (!config.listId) {
            return {
              success: false,
              error: "listId is required for add_to_list action",
            };
          }

          // First ensure contact exists
          const contactForList = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.upsertContact, {
            connectionId: connection._id,
            email,
            firstName,
            lastName,
          }) as ActiveCampaignContactResponse;
          activeCampaignContactId = contactForList.id;

          // Then add to list
          await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.subscribeToList, {
            connectionId: connection._id,
            contactId: activeCampaignContactId,
            listId: config.listId,
          });
          console.log(`✅ Contact added to list: ${config.listId}`);
          break;
        }

        case "add_tag": {
          if (!config.tagId) {
            return {
              success: false,
              error: "tagId is required for add_tag action",
            };
          }

          // First ensure contact exists
          const contactForTag = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.upsertContact, {
            connectionId: connection._id,
            email,
            firstName,
            lastName,
          }) as ActiveCampaignContactResponse;
          activeCampaignContactId = contactForTag.id;

          // Then add tag
          await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.addTagToContact, {
            connectionId: connection._id,
            contactId: activeCampaignContactId,
            tagId: config.tagId,
          });
          console.log(`✅ Tag applied to contact: ${config.tagId}`);
          break;
        }

        case "trigger_automation": {
          // For automation triggers, we add the contact with a special tag
          // that's linked to the automation in ActiveCampaign
          const contactForAutomation = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.upsertContact, {
            connectionId: connection._id,
            email,
            firstName,
            lastName,
          }) as ActiveCampaignContactResponse;
          activeCampaignContactId = contactForAutomation.id;

          // Add automation trigger tag if configured
          if (config.automationId) {
            await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.addTagToContact, {
              connectionId: connection._id,
              contactId: activeCampaignContactId,
              tagId: config.automationId,
            });
          }
          console.log(`✅ Automation triggered for contact: ${activeCampaignContactId}`);
          break;
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${config.action}`,
          };
      }

      return {
        success: true,
        message: `Successfully synced to ActiveCampaign`,
        data: {
          activeCampaignContactId,
          email,
          action: config.action,
          syncedAt: Date.now(),
        },
      };
    } catch (error) {
      console.error("❌ ActiveCampaign sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "ActiveCampaign sync failed",
      };
    }
  },
});
