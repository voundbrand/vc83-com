/**
 * LAYERS WORKFLOW TOOL
 *
 * Creates Layers visual workflows with nodes, edges, and triggers.
 * These are canvas-based automation workflows (different from behavior-based workflows).
 *
 * Two-step process:
 * 1. Create empty workflow via layerWorkflowOntology.createWorkflow
 * 2. Save nodes/edges via layerWorkflowOntology.saveWorkflow
 *
 * Credit cost: 2
 */

import type { AITool, ToolExecutionContext } from "./registry";
import type { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

export const layersWorkflowTool: AITool = {
  name: "create_layers_workflow",
  description: `Create a Layers visual automation workflow with nodes and edges.

This creates a canvas-based workflow (NOT a behavior workflow). Use this for:
- Form submission automations (form → CRM → email → sequence)
- Payment processing flows (payment → invoice → email → CRM)
- Lead qualification workflows (contact update → if/then → stage move)

TRIGGER NODE TYPES:
- trigger_form_submitted: Fires when a form is submitted
- trigger_payment_received: Fires when payment completes
- trigger_booking_created: Fires when booking is made
- trigger_contact_created: Fires when new contact added
- trigger_contact_updated: Fires when contact changes
- trigger_webhook: Fires on external webhook
- trigger_schedule: Fires on schedule (cron)
- trigger_manual: Manual trigger

ACTION NODE TYPES (lc_ prefix = LayerCake native):
- lc_crm: Create/update CRM contact
- lc_email: Send email
- lc_sms: Send SMS
- lc_whatsapp: Send WhatsApp message
- lc_invoicing: Create invoice
- lc_checkout: Process checkout
- lc_tickets: Create ticket
- lc_bookings: Create booking
- lc_events: Event operations
- lc_forms: Form operations
- lc_ai_agent: Trigger AI agent
- lc_certificates: Generate certificate
- lc_activecampaign_sync: Sync to ActiveCampaign

LOGIC NODE TYPES:
- if_then: Conditional branching
- wait_delay: Wait for duration
- split_ab: A/B test
- filter: Filter contacts
- transform_data: Transform data
- http_request: External API call

Each node needs: { id, type, label, config, position: { x, y } }
Each edge needs: { id, source, target }

Returns the workflowId for reuse as layered context. If attachToAgentId is provided, the workflow is linked directly to that agent after creation.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Workflow name (e.g., 'Lead Capture Workflow')",
      },
      description: {
        type: "string",
        description: "What this workflow does",
      },
      nodes: {
        type: "array",
        description: "Workflow nodes (trigger + action nodes)",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique node ID (e.g., 'node-1')" },
            type: { type: "string", description: "Node type (e.g., 'trigger_form_submitted', 'lc_crm', 'lc_email')" },
            label: { type: "string", description: "Display label" },
            config: { type: "object", description: "Node configuration (action-specific)" },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
            },
          },
          required: ["id", "type", "label"],
        },
      },
      edges: {
        type: "array",
        description: "Connections between nodes",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique edge ID (e.g., 'edge-1')" },
            source: { type: "string", description: "Source node ID" },
            target: { type: "string", description: "Target node ID" },
          },
          required: ["id", "source", "target"],
        },
      },
      triggers: {
        type: "array",
        description: "Trigger configurations",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "Trigger type" },
            config: { type: "object", description: "Trigger config (e.g., { formId: '...' })" },
          },
        },
      },
      attachToAgentId: {
        type: "string",
        description: "Optional org_agent ID. When provided, the workflow is attached to that agent as reusable layered context after creation.",
      },
    },
    required: ["name", "nodes", "edges"],
  },
  execute: async (ctx: ToolExecutionContext, args: {
    name: string;
    description?: string;
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      config?: Record<string, unknown>;
      position?: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
    triggers?: Array<{
      type: string;
      config?: Record<string, unknown>;
    }>;
    attachToAgentId?: string;
  }) => {
    if (!ctx.sessionId) {
      return {
        success: false,
        error: "Session ID required for workflow creation",
      };
    }

    try {
      if (args.attachToAgentId) {
        const agent = await (ctx as any).runQuery(
          generatedApi.api.agentOntology.getAgent,
          {
            sessionId: ctx.sessionId,
            agentId: args.attachToAgentId as Id<"objects">,
          }
        );
        if (!agent) {
          return {
            success: false,
            error: "Target agent not found for workflow attachment",
          };
        }
      }

      // Step 1: Create empty workflow
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflowId = await (ctx as any).runMutation(
        generatedApi.api.layers.layerWorkflowOntology.createWorkflow,
        {
          sessionId: ctx.sessionId,
          name: args.name,
          description: args.description,
        }
      );

      // Step 2: Save nodes, edges, and triggers
      // Ensure nodes have positions (auto-layout if not provided)
      const nodesWithPositions = args.nodes.map((node, index) => ({
        ...node,
        config: node.config || {},
        position: node.position || { x: 250, y: 100 + index * 150 },
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ctx as any).runMutation(
        generatedApi.api.layers.layerWorkflowOntology.saveWorkflow,
        {
          sessionId: ctx.sessionId,
          workflowId: workflowId as Id<"objects">,
          name: args.name,
          description: args.description,
          nodes: nodesWithPositions,
          edges: args.edges,
          triggers: args.triggers || [],
        }
      );

      let attachedToAgentId: string | undefined;
      if (args.attachToAgentId) {
        await (ctx as any).runMutation(
          generatedApi.api.agentOntology.attachLayeredContextWorkflow,
          {
            sessionId: ctx.sessionId,
            agentId: args.attachToAgentId as Id<"objects">,
            workflowId: workflowId as Id<"objects">,
          }
        );
        attachedToAgentId = args.attachToAgentId;
      }

      return {
        success: true,
        workflowId,
        name: args.name,
        nodeCount: args.nodes.length,
        edgeCount: args.edges.length,
        triggerCount: (args.triggers || []).length,
        status: "draft",
        attachedToAgentId,
        message: attachedToAgentId
          ? `Created Layers workflow "${args.name}" with ${args.nodes.length} nodes and attached it to agent ${attachedToAgentId}.`
          : `Created Layers workflow "${args.name}" with ${args.nodes.length} nodes. Use the agent layered context panel to attach it, then activate_workflow to go live.`,
        nextSteps: [
          attachedToAgentId
            ? "The linked agent can now use this workflow as layered context during runtime."
            : "Attach this workflow to an agent from the Layers panel or agent detail view.",
          "Use enable_workflow to activate when ready",
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        message: `Failed to create workflow: ${errorMessage}`,
      };
    }
  },
};
