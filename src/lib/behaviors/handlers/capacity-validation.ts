/**
 * CAPACITY VALIDATION BEHAVIOR
 *
 * Validates that a resource has sufficient capacity for the requested booking.
 * Works with inventory, room availability, class seats, equipment counts, etc.
 *
 * **Use Cases:**
 * - Hotel rooms: Check room availability for date range
 * - Classes: Validate seats available in sailing course
 * - Boat rentals: Check boat availability for time slot
 * - Group bookings: Validate total participants against capacity
 *
 * **Input Types Supported:**
 * - Form: Participant count, group size from form
 * - User Action: Direct quantity selection
 * - Database: Inventory levels, existing bookings
 * - Agent: AI checking availability before booking
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

export type CapacityType =
  | "inventory" // Finite count (e.g., 5 boats)
  | "seats" // Class/event seats
  | "rooms" // Hotel rooms
  | "concurrent" // Concurrent usage limit
  | "daily_limit"; // Daily booking limit

export interface CapacityValidationConfig {
  /**
   * Resource ID to check capacity for
   */
  resourceId: Id<"objects">;

  /**
   * Type of capacity check
   */
  capacityType: CapacityType;

  /**
   * Maximum capacity (if not fetched from resource)
   */
  maxCapacity?: number;

  /**
   * Form field ID for requested quantity/participants
   */
  quantityFieldId?: string;

  /**
   * Minimum quantity allowed
   * @default 1
   */
  minQuantity?: number;

  /**
   * Maximum quantity per booking
   */
  maxPerBooking?: number;

  /**
   * Whether to allow overbooking (with waitlist)
   * @default false
   */
  allowOverbooking?: boolean;

  /**
   * Buffer percentage to keep available (e.g., 10 = keep 10% buffer)
   * @default 0
   */
  bufferPercent?: number;

  /**
   * Error message when capacity exceeded
   */
  capacityExceededMessage?: string;

  /**
   * Whether validation is required to proceed
   * @default true
   */
  required?: boolean;
}

// ============================================================================
// Extracted Data
// ============================================================================

export interface ExtractedCapacityData {
  /**
   * Requested quantity/participants
   */
  requestedQuantity: number;

  /**
   * Total capacity of the resource
   */
  totalCapacity: number;

  /**
   * Currently booked/used capacity
   */
  usedCapacity: number;

  /**
   * Available capacity
   */
  availableCapacity: number;

  /**
   * Whether the request fits within capacity
   */
  hasCapacity: boolean;

  /**
   * Validation message
   */
  validationMessage: string;

  /**
   * Time slot context (if from previous behavior)
   */
  timeSlot?: {
    start: number;
    end: number;
  };
}

// ============================================================================
// Result Data
// ============================================================================

export interface CapacityValidationResult {
  type: "capacity_validation";
  resourceId: Id<"objects">;
  capacityType: CapacityType;
  requestedQuantity: number;
  availableCapacity: number;
  totalCapacity: number;
  isValid: boolean;
  validationMessage: string;
  waitlistPosition?: number; // If overbooking allowed
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const capacityValidationHandler: BehaviorHandler<
  CapacityValidationConfig,
  ExtractedCapacityData,
  CapacityValidationResult
> = {
  type: "capacity_validation",
  name: "Capacity Validation",
  description:
    "Validate resource capacity for bookings (rooms, seats, inventory)",
  category: "validation",
  supportedInputTypes: ["form", "user_action", "database", "agent_decision", "api"],
  supportedObjectTypes: ["product", "service", "resource", "room", "equipment", "event_ticket"],
  supportedWorkflows: ["checkout", "booking", "reservation", "events"],

  /**
   * EXTRACT - Get requested quantity and current capacity
   */
  extract: (
    config: CapacityValidationConfig,
    inputs: InputSource[],
    context: Readonly<BehaviorContext>
  ): ExtractedCapacityData | null => {
    let requestedQuantity = 1;

    // Look for quantity in form inputs
    for (const input of inputs) {
      if (input.type === "form" || input.type === "user_action") {
        if (config.quantityFieldId && input.data[config.quantityFieldId]) {
          const qty = input.data[config.quantityFieldId];
          requestedQuantity = typeof qty === "number" ? qty : parseInt(String(qty), 10) || 1;
        }

        // Also check common field names
        if (input.data.participants) {
          requestedQuantity = input.data.participants as number;
        }
        if (input.data.quantity) {
          requestedQuantity = input.data.quantity as number;
        }
        if (input.data.guests) {
          requestedQuantity = input.data.guests as number;
        }
      }
    }

    // Get quantity from context objects (e.g., cart items)
    if (context.objects) {
      const resourceObj = context.objects.find(
        (o) => o.objectId === config.resourceId
      );
      if (resourceObj?.quantity) {
        requestedQuantity = resourceObj.quantity;
      }
    }

    // Get time slot from previous behavior (availability-slot-selection)
    const timeSlot = context.workflowData?.selectedSlot as
      | { start: number; end: number }
      | undefined;

    // For now, we'll use config values for capacity
    // In production, this would query the database for real-time capacity
    const totalCapacity = config.maxCapacity || 10;

    // Calculate used capacity based on capacity type
    // This is a placeholder - real implementation would query bookings
    let usedCapacity = 0;

    // Check if capacity info is in context (from database behavior or API)
    if (context.workflowData?.resourceCapacity) {
      const capInfo = context.workflowData.resourceCapacity as {
        total: number;
        used: number;
      };
      usedCapacity = capInfo.used;
    }

    // Apply buffer
    const bufferAmount = config.bufferPercent
      ? Math.ceil((totalCapacity * config.bufferPercent) / 100)
      : 0;
    const effectiveCapacity = totalCapacity - bufferAmount;
    const availableCapacity = Math.max(0, effectiveCapacity - usedCapacity);

    const hasCapacity = requestedQuantity <= availableCapacity;

    let validationMessage = hasCapacity
      ? `${availableCapacity} available`
      : config.capacityExceededMessage ||
        `Only ${availableCapacity} available, requested ${requestedQuantity}`;

    // Check min/max per booking
    if (requestedQuantity < (config.minQuantity || 1)) {
      validationMessage = `Minimum ${config.minQuantity || 1} required`;
    }
    if (config.maxPerBooking && requestedQuantity > config.maxPerBooking) {
      validationMessage = `Maximum ${config.maxPerBooking} per booking`;
    }

    return {
      requestedQuantity,
      totalCapacity,
      usedCapacity,
      availableCapacity,
      hasCapacity,
      validationMessage,
      timeSlot,
    };
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: CapacityValidationConfig,
    _?: Partial<BehaviorContext>
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

    if (!config.capacityType) {
      errors.push({
        field: "capacityType",
        message: "capacityType is required",
        code: "required",
        severity: "error",
      });
    }

    const validTypes: CapacityType[] = [
      "inventory",
      "seats",
      "rooms",
      "concurrent",
      "daily_limit",
    ];
    if (config.capacityType && !validTypes.includes(config.capacityType)) {
      errors.push({
        field: "capacityType",
        message: `capacityType must be one of: ${validTypes.join(", ")}`,
        code: "invalid_value",
        severity: "error",
      });
    }

    if (config.bufferPercent !== undefined) {
      if (config.bufferPercent < 0 || config.bufferPercent > 50) {
        errors.push({
          field: "bufferPercent",
          message: "bufferPercent must be between 0 and 50",
          code: "invalid_value",
          severity: "error",
        });
      }
    }

    return errors;
  },

  /**
   * APPLY - Validate capacity and return result
   */
  apply: (
    config: CapacityValidationConfig,
    extracted: ExtractedCapacityData,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<CapacityValidationResult> => {
    const {
      requestedQuantity,
      totalCapacity,
      availableCapacity,
      hasCapacity,
      validationMessage,
    } = extracted;

    // Check min/max constraints
    const meetsMinimum = requestedQuantity >= (config.minQuantity || 1);
    const meetsMaximum =
      !config.maxPerBooking || requestedQuantity <= config.maxPerBooking;
    const isValid = hasCapacity && meetsMinimum && meetsMaximum;

    const result: CapacityValidationResult = {
      type: "capacity_validation",
      resourceId: config.resourceId,
      capacityType: config.capacityType,
      requestedQuantity,
      availableCapacity,
      totalCapacity,
      isValid,
      validationMessage,
    };

    // If capacity exceeded but overbooking allowed, add to waitlist
    if (!hasCapacity && config.allowOverbooking) {
      result.waitlistPosition = requestedQuantity - availableCapacity;
      result.validationMessage = `Added to waitlist (position ${result.waitlistPosition})`;
      result.isValid = true; // Allow to proceed with waitlist

      return {
        success: true,
        data: result,
        actions: [
          {
            type: "add_to_waitlist",
            when: "deferred",
            payload: {
              resourceId: config.resourceId,
              requestedQuantity,
              position: result.waitlistPosition,
              sessionId: context.sessionId,
            },
          },
        ],
        modifiedContext: {
          workflowData: {
            ...context.workflowData,
            capacityValidation: result,
            isWaitlisted: true,
          },
        },
      };
    }

    // If not valid, return validation error
    if (!isValid) {
      return {
        success: true,
        data: result,
        actions: [
          {
            type: "show_capacity_error",
            when: "immediate",
            payload: {
              resourceId: config.resourceId,
              message: validationMessage,
              availableCapacity,
              requestedQuantity,
              suggestions:
                availableCapacity > 0
                  ? [`Reduce to ${availableCapacity} or fewer`]
                  : ["Choose a different date/time", "Join the waitlist"],
            },
          },
        ],
      };
    }

    // Valid - add capacity lock action
    return {
      success: true,
      data: result,
      actions: [
        {
          type: "lock_capacity",
          when: "immediate",
          payload: {
            resourceId: config.resourceId,
            quantity: requestedQuantity,
            sessionId: context.sessionId,
            expiresInMinutes: 15, // Temporary lock during checkout
            timeSlot: extracted.timeSlot,
          },
        },
      ],
      modifiedContext: {
        workflowData: {
          ...context.workflowData,
          capacityValidation: result,
          lockedQuantity: requestedQuantity,
        },
      },
    };
  },
};
