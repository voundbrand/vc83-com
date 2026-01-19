/**
 * SLOT RESERVATION BEHAVIOR
 *
 * Manages temporary slot reservations during checkout to prevent double-booking.
 * Creates a "hold" on the slot that expires if checkout isn't completed.
 *
 * **Use Cases:**
 * - Hold hotel room during checkout
 * - Reserve seat in class while customer enters payment
 * - Lock boat rental slot to prevent conflicts
 * - Temporary appointment hold
 *
 * **Input Types Supported:**
 * - User Action: Customer selects a slot
 * - Event: Checkout step triggers reservation
 * - Time: Auto-release expired reservations
 */

import type {
  BehaviorHandler,
  InputSource,
  BehaviorResult,
  BehaviorContext,
  ValidationError,
} from "../types";
import type { Id } from "../../../../convex/_generated/dataModel";

// ============================================================================
// Configuration
// ============================================================================

export type ReservationAction =
  | "create" // Create new temporary reservation
  | "extend" // Extend existing reservation
  | "finalize" // Convert to permanent booking
  | "release"; // Release/cancel reservation

export interface SlotReservationConfig {
  /**
   * Resource to reserve
   */
  resourceId: Id<"objects">;

  /**
   * Action to perform
   * @default "create"
   */
  action?: ReservationAction;

  /**
   * Minutes until reservation expires
   * @default 15
   */
  expirationMinutes?: number;

  /**
   * Allow extending expiration
   * @default true
   */
  allowExtension?: boolean;

  /**
   * Maximum total reservation time (minutes)
   * @default 60
   */
  maxReservationMinutes?: number;

  /**
   * Release slot on checkout abandonment
   * @default true
   */
  releaseOnAbandon?: boolean;

  /**
   * Show countdown to customer
   * @default true
   */
  showCountdown?: boolean;

  /**
   * Warning before expiration (minutes)
   * @default 2
   */
  warningMinutes?: number;
}

// ============================================================================
// Extracted Data
// ============================================================================

export interface ExtractedReservationData {
  /**
   * Selected slot to reserve
   */
  slot?: {
    start: number;
    end: number;
  };

  /**
   * Existing reservation ID (for extend/finalize/release)
   */
  existingReservationId?: string;

  /**
   * Current reservation status
   */
  currentStatus?: "active" | "expired" | "finalized" | "released";

  /**
   * Time remaining on current reservation (ms)
   */
  timeRemaining?: number;

  /**
   * Quantity to reserve
   */
  quantity: number;

  /**
   * Session identifier
   */
  sessionId?: string;
}

// ============================================================================
// Result Data
// ============================================================================

export interface SlotReservationResult {
  type: "slot_reservation";
  action: ReservationAction;
  reservationId: string;
  resourceId: Id<"objects">;
  status: "active" | "extended" | "finalized" | "released" | "expired";
  slot?: {
    start: number;
    end: number;
  };
  expiresAt?: number;
  timeRemaining?: number;
  quantity: number;
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const slotReservationHandler: BehaviorHandler<
  SlotReservationConfig,
  ExtractedReservationData,
  SlotReservationResult
> = {
  type: "slot_reservation",
  name: "Slot Reservation",
  description:
    "Create and manage temporary slot reservations during checkout",
  category: "action",
  supportedInputTypes: ["user_action", "event", "time", "agent_decision"],
  supportedObjectTypes: ["product", "service", "resource", "room", "equipment"],
  supportedWorkflows: ["checkout", "booking", "reservation"],

  /**
   * EXTRACT - Get slot and reservation data
   */
  extract: (
    config: SlotReservationConfig,
    inputs: InputSource[],
    context: Readonly<BehaviorContext>
  ): ExtractedReservationData | null => {
    // Get slot from workflow context or inputs
    let slot = context.workflowData?.selectedSlot as
      | { start: number; end: number }
      | undefined;

    // Check inputs for slot selection
    for (const input of inputs) {
      if (input.type === "user_action" || input.type === "event") {
        if (input.data.selectedSlotStart && input.data.selectedSlotEnd) {
          slot = {
            start: input.data.selectedSlotStart as number,
            end: input.data.selectedSlotEnd as number,
          };
        }
      }
    }

    // Get existing reservation if any
    const existingReservationId = context.workflowData?.reservationId as
      | string
      | undefined;
    const currentStatus = context.workflowData?.reservationStatus as
      | "active"
      | "expired"
      | "finalized"
      | "released"
      | undefined;
    const expiresAt = context.workflowData?.reservationExpiresAt as
      | number
      | undefined;

    const timeRemaining = expiresAt ? expiresAt - Date.now() : undefined;

    // Get quantity
    let quantity = 1;
    if (context.workflowData?.lockedQuantity) {
      quantity = context.workflowData.lockedQuantity as number;
    }

    return {
      slot,
      existingReservationId,
      currentStatus,
      timeRemaining,
      quantity,
      sessionId: context.sessionId,
    };
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: SlotReservationConfig,
    _context?: Partial<BehaviorContext>
  ): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!config.resourceId) {
      errors.push({
        field: "resourceId",
        message: "resourceId is required",
        code: "required",
        severity: "error",
      });
    }

    if (
      config.expirationMinutes !== undefined &&
      (config.expirationMinutes < 1 || config.expirationMinutes > 60)
    ) {
      errors.push({
        field: "expirationMinutes",
        message: "expirationMinutes must be between 1 and 60",
        code: "invalid_value",
        severity: "error",
      });
    }

    if (
      config.maxReservationMinutes !== undefined &&
      config.maxReservationMinutes < (config.expirationMinutes || 15)
    ) {
      errors.push({
        field: "maxReservationMinutes",
        message:
          "maxReservationMinutes must be greater than expirationMinutes",
        code: "invalid_value",
        severity: "error",
      });
    }

    return errors;
  },

  /**
   * APPLY - Manage the reservation
   */
  apply: (
    config: SlotReservationConfig,
    extracted: ExtractedReservationData,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<SlotReservationResult> => {
    const action = config.action || "create";
    const expirationMs = (config.expirationMinutes || 15) * 60 * 1000;

    switch (action) {
      case "create":
        return handleCreate(config, extracted, context, expirationMs);
      case "extend":
        return handleExtend(config, extracted, context, expirationMs);
      case "finalize":
        return handleFinalize(config, extracted, context);
      case "release":
        return handleRelease(config, extracted, context);
      default:
        return {
          success: false,
          errors: [`Unknown action: ${action}`],
        };
    }
  },
};

// ============================================================================
// Action Handlers
// ============================================================================

function handleCreate(
  config: SlotReservationConfig,
  extracted: ExtractedReservationData,
  context: Readonly<BehaviorContext>,
  expirationMs: number
): BehaviorResult<SlotReservationResult> {
  if (!extracted.slot) {
    return {
      success: false,
      errors: ["No slot selected for reservation"],
    };
  }

  const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = Date.now() + expirationMs;

  const result: SlotReservationResult = {
    type: "slot_reservation",
    action: "create",
    reservationId,
    resourceId: config.resourceId,
    status: "active",
    slot: extracted.slot,
    expiresAt,
    timeRemaining: expirationMs,
    quantity: extracted.quantity,
  };

  const actions: Array<{
    type: string;
    when: "immediate" | "deferred" | "scheduled";
    scheduledFor?: number;
    payload: Record<string, unknown>;
  }> = [
    {
      type: "create_slot_reservation",
      when: "immediate",
      payload: {
        reservationId,
        resourceId: config.resourceId,
        startDateTime: extracted.slot.start,
        endDateTime: extracted.slot.end,
        quantity: extracted.quantity,
        sessionId: extracted.sessionId,
        expiresAt,
      },
    },
  ];

  // Schedule expiration cleanup
  actions.push({
    type: "schedule_reservation_expiry",
    when: "scheduled",
    scheduledFor: expiresAt,
    payload: {
      reservationId,
      resourceId: config.resourceId,
    },
  });

  // Add countdown if enabled
  if (config.showCountdown !== false) {
    actions.push({
      type: "show_reservation_countdown",
      when: "immediate",
      payload: {
        reservationId,
        expiresAt,
        warningMinutes: config.warningMinutes || 2,
      },
    });
  }

  return {
    success: true,
    data: result,
    actions,
    modifiedContext: {
      workflowData: {
        ...context.workflowData,
        reservationId,
        reservationStatus: "active",
        reservationExpiresAt: expiresAt,
      },
    },
  };
}

function handleExtend(
  config: SlotReservationConfig,
  extracted: ExtractedReservationData,
  context: Readonly<BehaviorContext>,
  expirationMs: number
): BehaviorResult<SlotReservationResult> {
  if (!extracted.existingReservationId) {
    return {
      success: false,
      errors: ["No existing reservation to extend"],
    };
  }

  if (extracted.currentStatus !== "active") {
    return {
      success: false,
      errors: [`Cannot extend reservation with status: ${extracted.currentStatus}`],
    };
  }

  if (config.allowExtension === false) {
    return {
      success: false,
      errors: ["Reservation extension not allowed"],
    };
  }

  // Check max reservation time
  const originalStart =
    context.workflowData?.reservationCreatedAt as number || Date.now();
  const totalTime = Date.now() - originalStart + expirationMs;
  const maxTime = (config.maxReservationMinutes || 60) * 60 * 1000;

  if (totalTime > maxTime) {
    return {
      success: false,
      errors: ["Maximum reservation time exceeded"],
    };
  }

  const newExpiresAt = Date.now() + expirationMs;

  const result: SlotReservationResult = {
    type: "slot_reservation",
    action: "extend",
    reservationId: extracted.existingReservationId,
    resourceId: config.resourceId,
    status: "extended",
    slot: extracted.slot,
    expiresAt: newExpiresAt,
    timeRemaining: expirationMs,
    quantity: extracted.quantity,
  };

  return {
    success: true,
    data: result,
    actions: [
      {
        type: "extend_slot_reservation",
        when: "immediate" as const,
        payload: {
          reservationId: extracted.existingReservationId,
          newExpiresAt,
        },
      },
      {
        type: "schedule_reservation_expiry",
        when: "scheduled" as const,
        scheduledFor: newExpiresAt,
        payload: {
          reservationId: extracted.existingReservationId,
          resourceId: config.resourceId,
        },
      },
    ],
    modifiedContext: {
      workflowData: {
        ...context.workflowData,
        reservationStatus: "active",
        reservationExpiresAt: newExpiresAt,
      },
    },
  };
}

function handleFinalize(
  config: SlotReservationConfig,
  extracted: ExtractedReservationData,
  context: Readonly<BehaviorContext>
): BehaviorResult<SlotReservationResult> {
  if (!extracted.existingReservationId) {
    return {
      success: false,
      errors: ["No existing reservation to finalize"],
    };
  }

  if (extracted.currentStatus !== "active") {
    return {
      success: false,
      errors: [`Cannot finalize reservation with status: ${extracted.currentStatus}`],
    };
  }

  const result: SlotReservationResult = {
    type: "slot_reservation",
    action: "finalize",
    reservationId: extracted.existingReservationId,
    resourceId: config.resourceId,
    status: "finalized",
    slot: extracted.slot,
    quantity: extracted.quantity,
  };

  return {
    success: true,
    data: result,
    actions: [
      {
        type: "finalize_slot_reservation",
        when: "immediate" as const,
        payload: {
          reservationId: extracted.existingReservationId,
          resourceId: config.resourceId,
          bookingId: context.workflowData?.bookingId,
        },
      },
      {
        type: "cancel_reservation_expiry",
        when: "immediate" as const,
        payload: {
          reservationId: extracted.existingReservationId,
        },
      },
    ],
    modifiedContext: {
      workflowData: {
        ...context.workflowData,
        reservationStatus: "finalized",
        reservationExpiresAt: undefined,
      },
    },
  };
}

function handleRelease(
  config: SlotReservationConfig,
  extracted: ExtractedReservationData,
  context: Readonly<BehaviorContext>
): BehaviorResult<SlotReservationResult> {
  if (!extracted.existingReservationId) {
    return {
      success: true,
      skipped: true,
      data: null,
      warnings: ["No reservation to release"],
    };
  }

  const result: SlotReservationResult = {
    type: "slot_reservation",
    action: "release",
    reservationId: extracted.existingReservationId,
    resourceId: config.resourceId,
    status: "released",
    slot: extracted.slot,
    quantity: extracted.quantity,
  };

  return {
    success: true,
    data: result,
    actions: [
      {
        type: "release_slot_reservation",
        when: "immediate" as const,
        payload: {
          reservationId: extracted.existingReservationId,
          resourceId: config.resourceId,
          reason: "user_cancelled",
        },
      },
      {
        type: "cancel_reservation_expiry",
        when: "immediate" as const,
        payload: {
          reservationId: extracted.existingReservationId,
        },
      },
    ],
    modifiedContext: {
      workflowData: {
        ...context.workflowData,
        reservationId: undefined,
        reservationStatus: "released",
        reservationExpiresAt: undefined,
      },
    },
  };
}
