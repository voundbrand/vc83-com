/**
 * LINK OBJECTS TOOL
 *
 * Creates relationships (objectLinks) between platform objects.
 * Used by AI skills to wire compositions together:
 *   form -> product, workflow -> sequence, checkout -> product, etc.
 *
 * Credit cost: 0 (free — linking is a structural operation, not a creation)
 */

import type { AITool, ToolExecutionContext } from "./registry";
import type { Id } from "../../_generated/dataModel";
const generatedApi: any = require("../../_generated/api");

/**
 * Valid link types with descriptions for the LLM
 */
const VALID_LINK_TYPES = [
  "product_form",         // product requires this form for purchase
  "checkout_product",     // checkout page sells this product
  "workflow_form",        // workflow triggered by this form
  "workflow_sequence",    // workflow enrolls contacts in this sequence
  "project_contact",      // contact assigned to this project
  "event_product",        // event uses this ticket product
  "form_ticket",          // form linked to ticket product
  "sponsored_by",         // event sponsored by CRM organization
  "works_at",             // contact works at CRM organization
  "certifies_completion_of", // certificate for event completion
] as const;

export const linkObjectsTool: AITool = {
  name: "link_objects",
  description: `Create a relationship between two platform objects.

USE THIS to wire objects together after creating them:
- Link a form to a product: linkType = "product_form"
- Link a checkout to a product: linkType = "checkout_product"
- Link a workflow to a form trigger: linkType = "workflow_form"
- Link a workflow to a sequence: linkType = "workflow_sequence"
- Link a contact to a project: linkType = "project_contact"
- Link an event to a ticket product: linkType = "event_product"

This is FREE (0 credits). Always link objects after creating them to complete the composition.

VALID LINK TYPES: ${VALID_LINK_TYPES.join(", ")}`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      fromObjectId: {
        type: "string",
        description: "Source object ID (the 'from' side of the relationship)",
      },
      toObjectId: {
        type: "string",
        description: "Target object ID (the 'to' side of the relationship)",
      },
      linkType: {
        type: "string",
        enum: [...VALID_LINK_TYPES],
        description: "Type of relationship between the objects",
      },
      properties: {
        type: "object",
        description: "Optional metadata about the relationship (e.g., { timing: 'duringCheckout' })",
      },
    },
    required: ["fromObjectId", "toObjectId", "linkType"],
  },
  execute: async (ctx: ToolExecutionContext, args: {
    fromObjectId: string;
    toObjectId: string;
    linkType: string;
    properties?: Record<string, unknown>;
  }) => {
    // Validate link type
    if (!VALID_LINK_TYPES.includes(args.linkType as typeof VALID_LINK_TYPES[number])) {
      return {
        success: false,
        error: `Invalid link type "${args.linkType}". Valid types: ${VALID_LINK_TYPES.join(", ")}`,
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const linkId = await (ctx as any).runMutation(
        generatedApi.internal.ai.tools.internalToolMutations.internalCreateObjectLink,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          fromObjectId: args.fromObjectId as Id<"objects">,
          toObjectId: args.toObjectId as Id<"objects">,
          linkType: args.linkType,
          properties: args.properties || {},
        }
      );

      return {
        success: true,
        linkId,
        linkType: args.linkType,
        fromObjectId: args.fromObjectId,
        toObjectId: args.toObjectId,
        message: `Linked objects via "${args.linkType}"`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: `Failed to link objects: ${errorMessage}`,
      };
    }
  },
};
