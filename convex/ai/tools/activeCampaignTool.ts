/**
 * ActiveCampaign AI Tool
 *
 * Allows AI agents to interact with ActiveCampaign for email marketing automation.
 * Supports contact sync, list management, tagging, and automation triggers.
 */

import type { AITool, ToolExecutionContext } from "./registry";
import { internal } from "../../_generated/api";

export const activeCampaignToolDefinition: AITool = {
  name: "activecampaign",
  description: `Manage contacts, lists, and automations in ActiveCampaign. Use this tool to:
- Sync contacts from CRM to ActiveCampaign
- Add contacts to email lists
- Apply tags to contacts for segmentation
- Trigger email automations
- Check connection status

IMPORTANT: Always check connection status first before attempting operations.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "check_connection",
          "sync_contact",
          "add_to_list",
          "add_tag",
          "remove_tag",
          "get_lists",
          "get_tags",
          "get_contact",
        ],
        description: "The action to perform",
      },
      email: {
        type: "string",
        description: "Contact email address (required for contact operations)",
      },
      firstName: {
        type: "string",
        description: "Contact first name",
      },
      lastName: {
        type: "string",
        description: "Contact last name",
      },
      phone: {
        type: "string",
        description: "Contact phone number",
      },
      listId: {
        type: "string",
        description: "ActiveCampaign list ID (required for add_to_list)",
      },
      tagId: {
        type: "string",
        description: "ActiveCampaign tag ID (required for add_tag/remove_tag)",
      },
      customFields: {
        type: "object",
        description: "Custom field values to sync (key-value pairs)",
      },
    },
    required: ["action"],
  },
  permissions: ["integrations:read", "integrations:write"],
  execute: executeActiveCampaignTool,
};

async function executeActiveCampaignTool(
  ctx: ToolExecutionContext,
  args: {
    action: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    listId?: string;
    tagId?: string;
    customFields?: Record<string, string>;
  }
): Promise<unknown> {
  // First, check if ActiveCampaign is connected
  const connection = await ctx.runQuery(internal.oauth.activecampaign.getConnectionByOrg, {
    organizationId: ctx.organizationId,
  });

  // Handle check_connection action
  if (args.action === "check_connection") {
    if (!connection) {
      return {
        success: true,
        isConnected: false,
        message: "ActiveCampaign is not connected for this organization",
        instructions: [
          "To connect ActiveCampaign:",
          "1. Open Settings (gear icon)",
          "2. Go to Integrations tab",
          "3. Click on ActiveCampaign",
          "4. Enter your API URL and API Key",
          "5. Click Connect",
        ],
        actionButton: {
          label: "Open Settings > Integrations",
          action: "open_settings_integrations",
        },
      };
    }

    return {
      success: true,
      isConnected: true,
      provider: "activecampaign",
      connectedEmail: connection.providerEmail,
      accountName: connection.providerAccountId,
      status: connection.status,
      connectedAt: connection.connectedAt,
      message: `ActiveCampaign connected: ${connection.providerEmail}`,
    };
  }

  // For all other actions, connection is required
  if (!connection) {
    return {
      success: false,
      error: "ActiveCampaign not connected",
      message: "Please connect ActiveCampaign first in Settings > Integrations",
      requiresConnection: true,
    };
  }

  try {
    switch (args.action) {
      case "sync_contact": {
        if (!args.email) {
          return {
            success: false,
            error: "Email is required for sync_contact action",
          };
        }

        const fieldValues: Array<{ field: string; value: string }> = [];
        if (args.customFields) {
          for (const [field, value] of Object.entries(args.customFields)) {
            fieldValues.push({ field, value });
          }
        }

        const contact = await ctx.runAction(internal.oauth.activecampaign.upsertContact, {
          connectionId: connection._id,
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
          phone: args.phone,
          fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
        });

        return {
          success: true,
          message: `Contact synced successfully: ${args.email}`,
          data: {
            activeCampaignContactId: contact.id,
            email: args.email,
          },
        };
      }

      case "add_to_list": {
        if (!args.email) {
          return { success: false, error: "Email is required" };
        }
        if (!args.listId) {
          return { success: false, error: "listId is required for add_to_list" };
        }

        // First ensure contact exists
        const contact = await ctx.runAction(internal.oauth.activecampaign.upsertContact, {
          connectionId: connection._id,
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
        });

        // Add to list
        await ctx.runAction(internal.oauth.activecampaign.subscribeToList, {
          connectionId: connection._id,
          contactId: contact.id,
          listId: args.listId,
        });

        return {
          success: true,
          message: `Contact ${args.email} added to list ${args.listId}`,
          data: {
            contactId: contact.id,
            listId: args.listId,
          },
        };
      }

      case "add_tag": {
        if (!args.email) {
          return { success: false, error: "Email is required" };
        }
        if (!args.tagId) {
          return { success: false, error: "tagId is required for add_tag" };
        }

        // First ensure contact exists
        const contact = await ctx.runAction(internal.oauth.activecampaign.upsertContact, {
          connectionId: connection._id,
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
        });

        // Add tag
        await ctx.runAction(internal.oauth.activecampaign.addTagToContact, {
          connectionId: connection._id,
          contactId: contact.id,
          tagId: args.tagId,
        });

        return {
          success: true,
          message: `Tag ${args.tagId} added to contact ${args.email}`,
          data: {
            contactId: contact.id,
            tagId: args.tagId,
          },
        };
      }

      case "get_lists": {
        const lists = await ctx.runAction(internal.oauth.activecampaign.fetchLists, {
          connectionId: connection._id,
        });

        return {
          success: true,
          message: `Found ${lists.length} lists`,
          data: {
            lists: lists.map((list: { id: string; name: string }) => ({
              id: list.id,
              name: list.name,
            })),
          },
        };
      }

      case "get_tags": {
        const tags = await ctx.runAction(internal.oauth.activecampaign.fetchTags, {
          connectionId: connection._id,
        });

        return {
          success: true,
          message: `Found ${tags.length} tags`,
          data: {
            tags: tags.map((tag: { id: string; tag: string }) => ({
              id: tag.id,
              name: tag.tag,
            })),
          },
        };
      }

      case "get_contact": {
        if (!args.email) {
          return { success: false, error: "Email is required" };
        }

        const contacts = await ctx.runAction(internal.oauth.activecampaign.fetchContacts, {
          connectionId: connection._id,
          limit: 1,
        });

        // Search for contact by email (AC API doesn't have direct email search in basic fetch)
        const contact = contacts.find(
          (c: { email: string }) => c.email.toLowerCase() === args.email?.toLowerCase()
        );

        if (!contact) {
          return {
            success: true,
            found: false,
            message: `No contact found with email: ${args.email}`,
          };
        }

        return {
          success: true,
          found: true,
          message: `Contact found: ${args.email}`,
          data: contact,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${args.action}`,
        };
    }
  } catch (error) {
    console.error("[activecampaign tool] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to execute ActiveCampaign action",
    };
  }
}
