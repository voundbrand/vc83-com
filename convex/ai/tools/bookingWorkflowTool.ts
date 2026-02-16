/**
 * AI Booking Workflow Configuration Tool
 *
 * Helps AI configure checkout workflows with booking/availability behaviors.
 * This tool bridges the page builder with the workflow system.
 *
 * Use Cases:
 * - Set up a sailing school course booking workflow
 * - Configure hotel room reservation checkout
 * - Create boat rental booking flow
 * - Set up appointment scheduling
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const bookingWorkflowToolDefinition = {
  type: "function" as const,
  function: {
    name: "configure_booking_workflow",
    description: `Configure a checkout workflow with booking/availability behaviors.

USE THIS TOOL TO:
1. Create booking workflows for products (courses, rooms, rentals)
2. Add availability/slot selection to checkouts
3. Configure capacity limits and validation
4. Set up booking confirmation and reminders

BOOKING BEHAVIOR TYPES:
- "availability_slot_selection" - Date/time picker for bookings
- "capacity_validation" - Check availability and limits
- "booking_creation" - Create booking after payment
- "slot_reservation" - Temporary hold during checkout

SLOT TYPES:
- "time_slot" - Single time slot (appointments, classes)
- "date_range" - Check-in/out (hotels, multi-day rentals)
- "recurring" - Recurring sessions (weekly classes)
- "flexible" - Customer chooses from options

CAPACITY TYPES:
- "inventory" - Finite count (boats, equipment)
- "seats" - Class/event seats
- "rooms" - Hotel rooms
- "concurrent" - Concurrent usage limit
- "daily_limit" - Daily booking limit

BOOKING TYPES:
- "appointment" - 1:1 meetings, consultations
- "reservation" - Room/space bookings
- "rental" - Equipment rentals
- "class_enrollment" - Group sessions, courses

EXAMPLE WORKFLOW (Sailing Course):
1. availability_slot_selection (slotType: "time_slot", show class dates)
2. capacity_validation (capacityType: "seats", max 10 students)
3. form_linking (collect participant info)
4. booking_creation (bookingType: "class_enrollment")`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "create_booking_workflow",
            "add_behavior_to_workflow",
            "list_booking_workflows",
            "get_workflow_behaviors",
            "suggest_workflow_for_product",
            "validate_workflow"
          ],
          description: "Action to perform"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will be created, execute = actually create"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode)"
        },
        // Workflow fields
        workflowId: {
          type: "string",
          description: "Existing workflow ID (for add_behavior, get_behaviors)"
        },
        workflowName: {
          type: "string",
          description: "Name for new workflow"
        },
        productId: {
          type: "string",
          description: "Product to create booking workflow for"
        },
        // Behavior configuration
        behaviorType: {
          type: "string",
          enum: [
            "availability_slot_selection",
            "capacity_validation",
            "booking_creation",
            "slot_reservation",
            "form_linking"
          ],
          description: "Type of behavior to add"
        },
        behaviorConfig: {
          type: "object",
          description: "Behavior-specific configuration",
          properties: {
            // Slot selection config
            slotType: {
              type: "string",
              enum: ["time_slot", "date_range", "recurring", "flexible"]
            },
            durationMinutes: { type: "number" },
            minAdvanceHours: { type: "number" },
            maxAdvanceDays: { type: "number" },
            timezone: { type: "string" },
            // Capacity config
            capacityType: {
              type: "string",
              enum: ["inventory", "seats", "rooms", "concurrent", "daily_limit"]
            },
            maxCapacity: { type: "number" },
            minQuantity: { type: "number" },
            maxPerBooking: { type: "number" },
            allowOverbooking: { type: "boolean" },
            // Booking creation config
            bookingType: {
              type: "string",
              enum: ["appointment", "reservation", "rental", "class_enrollment"]
            },
            requiresConfirmation: { type: "boolean" },
            sendConfirmationEmail: { type: "boolean" },
            sendReminder: { type: "boolean" },
            reminderHours: { type: "number" },
            // Slot reservation config
            expirationMinutes: { type: "number" },
            showCountdown: { type: "boolean" }
          }
        },
        priority: {
          type: "number",
          description: "Behavior priority (higher = runs first)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeConfigureBookingWorkflow = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    workflowName: v.optional(v.string()),
    productId: v.optional(v.string()),
    behaviorType: v.optional(v.string()),
    behaviorConfig: v.optional(v.any()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    data?: unknown;
    message?: string;
    error?: string;
  }> => {
    // Get organization ID
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      const session = await (ctx as any).runQuery(generatedApi.internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId || !session.userId) {
        throw new Error("Invalid session");
      }

      organizationId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Either sessionId or (organizationId and userId) required");
    }

    try {
      switch (args.action) {
        case "suggest_workflow_for_product":
          return await suggestWorkflowForProduct(ctx, organizationId, args);

        case "create_booking_workflow":
          if (!args.workflowName || !args.productId) {
            throw new Error("workflowName and productId required");
          }
          if (!userId) {
            throw new Error("userId required");
          }
          return await createBookingWorkflow(ctx, organizationId, userId, args);

        case "add_behavior_to_workflow":
          if (!args.workflowId || !args.behaviorType) {
            throw new Error("workflowId and behaviorType required");
          }
          if (!userId) {
            throw new Error("userId required");
          }
          return await addBehaviorToWorkflow(ctx, organizationId, userId, args);

        case "list_booking_workflows":
          return await listBookingWorkflows(ctx, organizationId);

        case "get_workflow_behaviors":
          if (!args.workflowId) {
            throw new Error("workflowId required");
          }
          return await getWorkflowBehaviors(ctx, organizationId, args);

        case "validate_workflow":
          if (!args.workflowId) {
            throw new Error("workflowId required");
          }
          return await validateWorkflow(ctx, organizationId, args);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action"
          };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        action: args.action,
        error: errorMessage
      };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * Suggest a booking workflow based on product type
 */
async function suggestWorkflowForProduct(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { productId?: string }
) {
  if (!args.productId) {
    return {
      success: false,
      action: "suggest_workflow_for_product",
      error: "productId required"
    };
  }

  // Get product details - use internalListProducts and filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = await (ctx as any).runQuery(
    generatedApi.internal.ai.tools.internalToolMutations.internalListProducts,
    {
      organizationId,
      limit: 100,
    }
  );

  const product = products?.find((p: { _id: string }) => p._id === args.productId);

  if (!product) {
    return {
      success: false,
      action: "suggest_workflow_for_product",
      error: "Product not found"
    };
  }

  // Determine suggested workflow based on product type/subtype
  const subtype = product.subtype || "product";
  let suggestion: {
    workflowType: string;
    behaviors: Array<{
      type: string;
      priority: number;
      description: string;
      suggestedConfig: Record<string, unknown>;
    }>;
    explanation: string;
  };

  switch (subtype) {
    case "course":
    case "class":
    case "workshop":
    case "event_ticket":
      suggestion = {
        workflowType: "class_enrollment",
        behaviors: [
          {
            type: "availability_slot_selection",
            priority: 100,
            description: "Let students pick class date/time",
            suggestedConfig: {
              slotType: "time_slot",
              durationMinutes: 120,
              minAdvanceHours: 24,
              maxAdvanceDays: 90,
            }
          },
          {
            type: "capacity_validation",
            priority: 90,
            description: "Validate seats available in class",
            suggestedConfig: {
              capacityType: "seats",
              maxCapacity: 10,
              minQuantity: 1,
            }
          },
          {
            type: "form_linking",
            priority: 80,
            description: "Collect participant information",
            suggestedConfig: {
              timing: "duringCheckout",
              required: true,
            }
          },
          {
            type: "booking_creation",
            priority: 10,
            description: "Create enrollment after payment",
            suggestedConfig: {
              bookingType: "class_enrollment",
              sendConfirmationEmail: true,
              sendReminder: true,
              reminderHours: 24,
            }
          }
        ],
        explanation: `For courses/classes, I recommend:\n1. Slot selection for class dates\n2. Capacity validation (seats)\n3. Form to collect student info\n4. Booking creation with email confirmation`
      };
      break;

    case "room":
    case "accommodation":
    case "hotel":
      suggestion = {
        workflowType: "reservation",
        behaviors: [
          {
            type: "availability_slot_selection",
            priority: 100,
            description: "Check-in/check-out date picker",
            suggestedConfig: {
              slotType: "date_range",
              minAdvanceHours: 24,
              maxAdvanceDays: 365,
            }
          },
          {
            type: "capacity_validation",
            priority: 90,
            description: "Check room availability",
            suggestedConfig: {
              capacityType: "rooms",
              maxCapacity: 1,
            }
          },
          {
            type: "slot_reservation",
            priority: 85,
            description: "Hold room during checkout",
            suggestedConfig: {
              expirationMinutes: 15,
              showCountdown: true,
            }
          },
          {
            type: "booking_creation",
            priority: 10,
            description: "Create reservation after payment",
            suggestedConfig: {
              bookingType: "reservation",
              sendConfirmationEmail: true,
              sendReminder: true,
              reminderHours: 48,
            }
          }
        ],
        explanation: `For hotel/room bookings, I recommend:\n1. Date range picker (check-in/out)\n2. Room availability validation\n3. Temporary hold during checkout\n4. Reservation creation with confirmation`
      };
      break;

    case "rental":
    case "equipment":
    case "boat":
    case "vehicle":
      suggestion = {
        workflowType: "rental",
        behaviors: [
          {
            type: "availability_slot_selection",
            priority: 100,
            description: "Select rental time slot",
            suggestedConfig: {
              slotType: "time_slot",
              durationMinutes: 60,
              minAdvanceHours: 2,
              maxAdvanceDays: 30,
            }
          },
          {
            type: "capacity_validation",
            priority: 90,
            description: "Check equipment availability",
            suggestedConfig: {
              capacityType: "inventory",
              maxCapacity: 5,
            }
          },
          {
            type: "slot_reservation",
            priority: 85,
            description: "Reserve equipment during checkout",
            suggestedConfig: {
              expirationMinutes: 10,
              showCountdown: true,
            }
          },
          {
            type: "booking_creation",
            priority: 10,
            description: "Create rental booking",
            suggestedConfig: {
              bookingType: "rental",
              sendConfirmationEmail: true,
            }
          }
        ],
        explanation: `For rentals (boats, equipment), I recommend:\n1. Time slot selection\n2. Inventory availability check\n3. Equipment reservation during checkout\n4. Rental booking with confirmation`
      };
      break;

    case "appointment":
    case "consultation":
    case "service":
    default:
      suggestion = {
        workflowType: "appointment",
        behaviors: [
          {
            type: "availability_slot_selection",
            priority: 100,
            description: "Appointment time picker",
            suggestedConfig: {
              slotType: "time_slot",
              durationMinutes: 30,
              minAdvanceHours: 4,
              maxAdvanceDays: 60,
            }
          },
          {
            type: "capacity_validation",
            priority: 90,
            description: "Check consultant availability",
            suggestedConfig: {
              capacityType: "concurrent",
              maxCapacity: 1,
            }
          },
          {
            type: "booking_creation",
            priority: 10,
            description: "Create appointment",
            suggestedConfig: {
              bookingType: "appointment",
              requiresConfirmation: false,
              sendConfirmationEmail: true,
              sendReminder: true,
              reminderHours: 24,
              addToCalendar: true,
            }
          }
        ],
        explanation: `For appointments/consultations, I recommend:\n1. Time slot picker\n2. Availability validation\n3. Appointment booking with calendar invite`
      };
  }

  return {
    success: true,
    action: "suggest_workflow_for_product",
    data: {
      product: {
        id: product._id,
        name: product.name,
        type: product.type,
        subtype: product.subtype,
      },
      suggestion,
    },
    message: suggestion.explanation
  };
}

/**
 * Create a new booking workflow for a product
 */
async function createBookingWorkflow(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    workItemId?: string;
    conversationId?: Id<"aiConversations">;
    workflowName?: string;
    productId?: string;
    behaviorConfig?: Record<string, unknown>;
  }
) {
  const mode = args.mode || "preview";

  // Get suggestion first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestionResult = await suggestWorkflowForProduct(ctx as any, organizationId, {
    productId: args.productId
  });

  if (!suggestionResult.success) {
    return suggestionResult;
  }

  const suggestion = (suggestionResult.data as { suggestion: { workflowType: string; behaviors: Array<{ type: string; priority: number; suggestedConfig: Record<string, unknown> }> } }).suggestion;

  // Build behaviors from suggestion
  const behaviors = suggestion.behaviors.map((b, idx) => ({
    id: `beh_${Date.now()}_${idx}`,
    type: b.type,
    enabled: true,
    priority: b.priority,
    config: {
      resourceId: args.productId,
      ...b.suggestedConfig,
      ...(args.behaviorConfig || {}),
    },
    triggers: {
      workflows: ["checkout"],
    },
    metadata: {
      createdAt: Date.now(),
      createdBy: userId,
    }
  }));

  // Preview data
  const previewData = {
    id: "temp-" + Date.now(),
    type: "workflow",
    name: args.workflowName,
    status: "preview",
    details: {
      workflowType: suggestion.workflowType,
      productId: args.productId,
      behaviorsCount: behaviors.length,
      behaviors: behaviors.map(b => ({
        type: b.type,
        priority: b.priority,
      })),
    },
    preview: {
      action: "create" as const,
      confidence: "high" as const,
      reason: `Creating ${suggestion.workflowType} booking workflow`,
    }
  };

  if (mode === "preview") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "workflow_create",
        name: `Create Workflow - ${args.workflowName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_booking_workflow",
      mode: "preview",
      workItemId,
      data: {
        items: [previewData],
        behaviors: behaviors.map(b => ({
          type: b.type,
          priority: b.priority,
          config: b.config,
        })),
      },
      message: `📋 Ready to create "${args.workflowName}" with ${behaviors.length} behaviors. Review and approve.`
    };
  }

  // Execute mode - create the workflow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflowId = await (ctx as any).runMutation(
    generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkflow,
    {
      organizationId,
      userId,
      name: args.workflowName!,
      trigger: "checkout_start",
      behaviors: behaviors.map(b => ({
        type: b.type,
        config: b.config,
        enabled: b.enabled,
        priority: b.priority,
      })),
      status: "active",
    }
  );

  // Update work item
  if (args.workItemId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { workflowId },
      }
    );
  }

  return {
    success: true,
    action: "create_booking_workflow",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      workflowId,
      name: args.workflowName,
      behaviorsCount: behaviors.length,
    },
    message: `✅ Created booking workflow "${args.workflowName}" with ${behaviors.length} behaviors`
  };
}

/**
 * Add a behavior to an existing workflow
 */
async function addBehaviorToWorkflow(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    workItemId?: string;
    workflowId?: string;
    behaviorType?: string;
    behaviorConfig?: Record<string, unknown>;
    priority?: number;
  }
) {
  const mode = args.mode || "preview";

  // Get existing workflow by listing and filtering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflows = await (ctx as any).runQuery(
    generatedApi.internal.ai.tools.internalToolMutations.internalListWorkflows,
    {
      organizationId,
    }
  );

  const workflow = workflows?.find((w: { _id: string }) => w._id === args.workflowId);

  if (!workflow) {
    return {
      success: false,
      action: "add_behavior_to_workflow",
      error: "Workflow not found"
    };
  }

  const newBehavior = {
    id: `beh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: args.behaviorType!,
    enabled: true,
    priority: args.priority || 50,
    config: args.behaviorConfig || {},
    triggers: {
      workflows: ["checkout"],
    },
    metadata: {
      createdAt: Date.now(),
      createdBy: userId,
    }
  };

  if (mode === "preview") {
    return {
      success: true,
      action: "add_behavior_to_workflow",
      mode: "preview",
      data: {
        workflow: {
          id: workflow._id,
          name: workflow.name,
        },
        newBehavior: {
          type: newBehavior.type,
          priority: newBehavior.priority,
          config: newBehavior.config,
        }
      },
      message: `📋 Ready to add ${args.behaviorType} to workflow "${workflow.name}"`
    };
  }

  // Execute - add the behavior using internalAddBehaviorToWorkflow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ctx as any).runMutation(
    generatedApi.internal.ai.tools.internalToolMutations.internalAddBehaviorToWorkflow,
    {
      organizationId,
      userId,
      workflowId: args.workflowId as Id<"objects">,
      behaviorType: newBehavior.type,
      behaviorConfig: newBehavior.config,
      priority: newBehavior.priority,
    }
  );

  return {
    success: true,
    action: "add_behavior_to_workflow",
    mode: "execute",
    data: {
      workflowId: args.workflowId,
      behaviorId: newBehavior.id,
      behaviorType: args.behaviorType,
    },
    message: `✅ Added ${args.behaviorType} to workflow "${workflow.name}"`
  };
}

/**
 * List all booking workflows
 */
async function listBookingWorkflows(
  ctx: unknown,
  organizationId: Id<"organizations">
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflows = await (ctx as any).runQuery(
    generatedApi.internal.ai.tools.internalToolMutations.internalListWorkflows,
    {
      organizationId,
    }
  );

  // Filter to workflows that have booking behaviors
  const bookingBehaviorTypes = [
    "availability_slot_selection",
    "capacity_validation",
    "booking_creation",
    "slot_reservation",
  ];

  const bookingWorkflows = (workflows || []).filter((w: {
    behaviors?: Array<{ type: string }>
  }) => {
    const behaviors = w.behaviors || [];
    return behaviors.some((b: { type: string }) => bookingBehaviorTypes.includes(b.type));
  });

  return {
    success: true,
    action: "list_booking_workflows",
    data: {
      workflows: bookingWorkflows.map((w: {
        _id: string;
        name: string;
        status: string;
        behaviors?: Array<{ type: string }>
      }) => ({
        id: w._id,
        name: w.name,
        status: w.status,
        behaviorsCount: (w.behaviors || []).length,
        behaviorTypes: (w.behaviors || []).map((b: { type: string }) => b.type),
      })),
      total: bookingWorkflows.length,
    },
    message: `Found ${bookingWorkflows.length} booking workflow(s)`
  };
}

/**
 * Get behaviors in a workflow
 */
async function getWorkflowBehaviors(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { workflowId?: string }
) {
  // Get workflow by listing and filtering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflows = await (ctx as any).runQuery(
    generatedApi.internal.ai.tools.internalToolMutations.internalListWorkflows,
    {
      organizationId,
    }
  );

  const workflow = workflows?.find((w: { _id: string }) => w._id === args.workflowId);

  if (!workflow) {
    return {
      success: false,
      action: "get_workflow_behaviors",
      error: "Workflow not found"
    };
  }

  const behaviors = (workflow.behaviors || []) as Array<{
    id: string;
    type: string;
    enabled: boolean;
    priority: number;
    config: Record<string, unknown>;
  }>;

  return {
    success: true,
    action: "get_workflow_behaviors",
    data: {
      workflow: {
        id: workflow._id,
        name: workflow.name,
      },
      behaviors: behaviors
        .sort((a, b) => b.priority - a.priority)
        .map(b => ({
          id: b.id,
          type: b.type,
          enabled: b.enabled,
          priority: b.priority,
          config: b.config,
        })),
      total: behaviors.length,
    },
    message: `Workflow "${workflow.name}" has ${behaviors.length} behavior(s)`
  };
}

/**
 * Validate a workflow configuration
 */
async function validateWorkflow(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { workflowId?: string }
) {
  // Get workflow by listing and filtering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflows = await (ctx as any).runQuery(
    generatedApi.internal.ai.tools.internalToolMutations.internalListWorkflows,
    {
      organizationId,
    }
  );

  const workflow = workflows?.find((w: { _id: string }) => w._id === args.workflowId);

  if (!workflow) {
    return {
      success: false,
      action: "validate_workflow",
      error: "Workflow not found"
    };
  }

  const behaviors = (workflow.behaviors || []) as Array<{
    type: string;
    config: Record<string, unknown>;
  }>;

  const issues: Array<{ severity: "error" | "warning"; message: string }> = [];
  const suggestions: string[] = [];

  // Check for required behaviors based on workflow type
  const hasSlotSelection = behaviors.some(b => b.type === "availability_slot_selection");
  const hasCapacityValidation = behaviors.some(b => b.type === "capacity_validation");
  const hasBookingCreation = behaviors.some(b => b.type === "booking_creation");
  const hasSlotReservation = behaviors.some(b => b.type === "slot_reservation");

  if (!hasSlotSelection) {
    suggestions.push("Consider adding availability_slot_selection for date/time picking");
  }

  if (!hasCapacityValidation) {
    suggestions.push("Consider adding capacity_validation to prevent overbooking");
  }

  if (!hasBookingCreation) {
    issues.push({
      severity: "warning",
      message: "No booking_creation behavior - bookings won't be created after payment"
    });
  }

  if (hasSlotSelection && !hasSlotReservation) {
    suggestions.push("Consider adding slot_reservation to hold slots during checkout");
  }

  // Check behavior configs
  for (const behavior of behaviors) {
    if (behavior.type === "availability_slot_selection" && !behavior.config.resourceId) {
      issues.push({
        severity: "error",
        message: "availability_slot_selection missing resourceId"
      });
    }
    if (behavior.type === "capacity_validation" && !behavior.config.resourceId) {
      issues.push({
        severity: "error",
        message: "capacity_validation missing resourceId"
      });
    }
  }

  const isValid = issues.filter(i => i.severity === "error").length === 0;

  return {
    success: true,
    action: "validate_workflow",
    data: {
      workflow: {
        id: workflow._id,
        name: workflow.name,
      },
      isValid,
      issues,
      suggestions,
      summary: {
        hasSlotSelection,
        hasCapacityValidation,
        hasBookingCreation,
        hasSlotReservation,
      }
    },
    message: isValid
      ? `✅ Workflow "${workflow.name}" is valid`
      : `⚠️ Workflow has ${issues.length} issue(s)`
  };
}
