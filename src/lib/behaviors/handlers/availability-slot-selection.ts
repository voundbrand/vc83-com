/**
 * AVAILABILITY SLOT SELECTION BEHAVIOR
 *
 * Presents available time slots to customers during checkout and validates
 * their selection. Works with the booking system to query availability.
 *
 * **Use Cases:**
 * - Hotel room booking: Show available dates for room types
 * - Sailing courses: Show available class dates
 * - Boat rentals: Show available hourly/daily slots
 * - Appointments: Show available consultation times
 *
 * **Input Types Supported:**
 * - Form: Customer's selected date/time from a form field
 * - User Action: Direct slot selection in checkout UI
 * - Agent: AI agent can suggest or book slots
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

export type SlotType = "time_slot" | "date_range" | "recurring" | "flexible";

export interface AvailabilitySlotSelectionConfig {
  /**
   * Resource ID to check availability for (Convex ID)
   * Can be a product, service, room, boat, instructor, etc.
   */
  resourceId: Id<"objects">;

  /**
   * Type of slot selection
   * - time_slot: Single time slot (e.g., 9:00 AM - 10:00 AM)
   * - date_range: Date range (e.g., check-in/check-out)
   * - recurring: Recurring sessions (e.g., weekly class)
   * - flexible: Customer chooses from multiple options
   */
  slotType: SlotType;

  /**
   * Duration in minutes (for time_slot type)
   * @default 60
   */
  durationMinutes?: number;

  /**
   * Minimum advance booking time in hours
   * @default 24
   */
  minAdvanceHours?: number;

  /**
   * Maximum advance booking time in days
   * @default 90
   */
  maxAdvanceDays?: number;

  /**
   * Form field ID that contains the selected date/time
   */
  dateFieldId?: string;

  /**
   * Form field ID that contains the selected time (if separate from date)
   */
  timeFieldId?: string;

  /**
   * Form field ID for end date (for date_range type)
   */
  endDateFieldId?: string;

  /**
   * Whether to show available slots in the UI
   * @default true
   */
  showAvailableSlots?: boolean;

  /**
   * Number of slots to show
   * @default 10
   */
  maxSlotsToShow?: number;

  /**
   * Timezone for slot display
   * @default "Europe/Berlin"
   */
  timezone?: string;

  /**
   * Whether selection is required to proceed
   * @default true
   */
  required?: boolean;
}

// ============================================================================
// Extracted Data
// ============================================================================

export interface ExtractedSlotData {
  /**
   * Selected start date/time (timestamp)
   */
  selectedStart?: number;

  /**
   * Selected end date/time (timestamp) - for date_range type
   */
  selectedEnd?: number;

  /**
   * Whether a slot was selected
   */
  hasSelection: boolean;

  /**
   * Validation result
   */
  isValid: boolean;

  /**
   * Validation message
   */
  validationMessage: string;

  /**
   * Available slots (if fetched)
   */
  availableSlots?: Array<{
    start: number;
    end: number;
    available: boolean;
    capacity?: number;
    remaining?: number;
  }>;
}

// ============================================================================
// Result Data
// ============================================================================

export interface AvailabilitySlotSelectionResult {
  type: "availability_slot_selection";
  resourceId: Id<"objects">;
  slotType: SlotType;
  selectedSlot?: {
    start: number;
    end: number;
    formattedStart: string;
    formattedEnd: string;
  };
  isValid: boolean;
  validationMessage: string;
  availableSlots?: Array<{
    start: number;
    end: number;
    formattedStart: string;
    formattedEnd: string;
  }>;
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const availabilitySlotSelectionHandler: BehaviorHandler<
  AvailabilitySlotSelectionConfig,
  ExtractedSlotData,
  AvailabilitySlotSelectionResult
> = {
  type: "availability_slot_selection",
  name: "Availability Slot Selection",
  description:
    "Present and validate time slot selection for bookings during checkout",
  category: "data",
  supportedInputTypes: ["form", "user_action", "agent_decision", "api"],
  supportedObjectTypes: ["product", "service", "resource", "room", "equipment"],
  supportedWorkflows: ["checkout", "booking", "reservation"],

  /**
   * EXTRACT - Get selected slot from form inputs and validate
   */
  extract: (
    config: AvailabilitySlotSelectionConfig,
    inputs: InputSource[],
    context: Readonly<BehaviorContext>
  ): ExtractedSlotData | null => {
    let selectedStart: number | undefined;
    let selectedEnd: number | undefined;

    // Look for slot selection in form inputs
    for (const input of inputs) {
      if (input.type === "form" || input.type === "user_action") {
        // Check for date field
        if (config.dateFieldId && input.data[config.dateFieldId]) {
          const dateValue = input.data[config.dateFieldId];
          if (typeof dateValue === "string") {
            selectedStart = new Date(dateValue).getTime();
          } else if (typeof dateValue === "number") {
            selectedStart = dateValue;
          }
        }

        // Check for separate time field
        if (config.timeFieldId && input.data[config.timeFieldId] && selectedStart) {
          const timeValue = input.data[config.timeFieldId] as string;
          // Parse time and combine with date
          const [hours, minutes] = timeValue.split(":").map(Number);
          const date = new Date(selectedStart);
          date.setHours(hours, minutes, 0, 0);
          selectedStart = date.getTime();
        }

        // Check for end date (date_range type)
        if (config.endDateFieldId && input.data[config.endDateFieldId]) {
          const endValue = input.data[config.endDateFieldId];
          if (typeof endValue === "string") {
            selectedEnd = new Date(endValue).getTime();
          } else if (typeof endValue === "number") {
            selectedEnd = endValue;
          }
        }

        // Also check for direct slot selection (from UI)
        if (input.data.selectedSlotStart) {
          selectedStart = input.data.selectedSlotStart as number;
        }
        if (input.data.selectedSlotEnd) {
          selectedEnd = input.data.selectedSlotEnd as number;
        }
      }
    }

    // Calculate end time for time_slot type
    if (selectedStart && !selectedEnd && config.slotType === "time_slot") {
      const durationMs = (config.durationMinutes || 60) * 60 * 1000;
      selectedEnd = selectedStart + durationMs;
    }

    const hasSelection = !!selectedStart;
    let isValid = true;
    let validationMessage = "Slot selection valid";

    // Validate selection
    if (hasSelection && selectedStart) {
      const now = Date.now();
      const minAdvanceMs = (config.minAdvanceHours || 24) * 60 * 60 * 1000;
      const maxAdvanceMs = (config.maxAdvanceDays || 90) * 24 * 60 * 60 * 1000;

      // Check minimum advance time
      if (selectedStart < now + minAdvanceMs) {
        isValid = false;
        validationMessage = `Booking must be at least ${config.minAdvanceHours || 24} hours in advance`;
      }

      // Check maximum advance time
      if (selectedStart > now + maxAdvanceMs) {
        isValid = false;
        validationMessage = `Booking must be within ${config.maxAdvanceDays || 90} days`;
      }

      // For date_range, check that end is after start
      if (config.slotType === "date_range" && selectedEnd) {
        if (selectedEnd <= selectedStart) {
          isValid = false;
          validationMessage = "End date must be after start date";
        }
      }
    } else if (config.required !== false) {
      isValid = false;
      validationMessage = "Please select a date and time";
    }

    return {
      selectedStart,
      selectedEnd,
      hasSelection,
      isValid,
      validationMessage,
    };
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: AvailabilitySlotSelectionConfig,
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

    if (!config.slotType) {
      errors.push({
        field: "slotType",
        message: "slotType is required",
        code: "required",
        severity: "error",
      });
    }

    const validSlotTypes: SlotType[] = [
      "time_slot",
      "date_range",
      "recurring",
      "flexible",
    ];
    if (config.slotType && !validSlotTypes.includes(config.slotType)) {
      errors.push({
        field: "slotType",
        message: `slotType must be one of: ${validSlotTypes.join(", ")}`,
        code: "invalid_value",
        severity: "error",
      });
    }

    if (
      config.durationMinutes !== undefined &&
      (config.durationMinutes < 5 || config.durationMinutes > 1440)
    ) {
      errors.push({
        field: "durationMinutes",
        message: "durationMinutes must be between 5 and 1440",
        code: "invalid_value",
        severity: "error",
      });
    }

    return errors;
  },

  /**
   * APPLY - Process slot selection and return actions
   */
  apply: (
    config: AvailabilitySlotSelectionConfig,
    extracted: ExtractedSlotData,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<AvailabilitySlotSelectionResult> => {
    const { selectedStart, selectedEnd, hasSelection, isValid, validationMessage } =
      extracted;

    // If no selection and required, show slot picker
    if (!hasSelection && config.required !== false) {
      return {
        success: true,
        data: {
          type: "availability_slot_selection",
          resourceId: config.resourceId,
          slotType: config.slotType,
          isValid: false,
          validationMessage: "Please select a date and time",
        },
        actions: [
          {
            type: "show_slot_picker",
            when: "immediate",
            payload: {
              resourceId: config.resourceId,
              slotType: config.slotType,
              durationMinutes: config.durationMinutes || 60,
              minAdvanceHours: config.minAdvanceHours || 24,
              maxAdvanceDays: config.maxAdvanceDays || 90,
              maxSlotsToShow: config.maxSlotsToShow || 10,
              timezone: config.timezone || "Europe/Berlin",
              position: "beforePayment",
            },
          },
        ],
      };
    }

    // If selection is invalid, return validation error
    if (!isValid) {
      return {
        success: true,
        data: {
          type: "availability_slot_selection",
          resourceId: config.resourceId,
          slotType: config.slotType,
          isValid: false,
          validationMessage,
        },
        actions: [
          {
            type: "show_validation_error",
            when: "immediate",
            payload: {
              field: "slot_selection",
              message: validationMessage,
            },
          },
        ],
      };
    }

    // Format dates for display
    const formatDate = (ts: number) =>
      new Date(ts).toLocaleString("de-DE", {
        timeZone: config.timezone || "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "short",
      });

    const result: AvailabilitySlotSelectionResult = {
      type: "availability_slot_selection",
      resourceId: config.resourceId,
      slotType: config.slotType,
      selectedSlot: selectedStart
        ? {
            start: selectedStart,
            end: selectedEnd || selectedStart + (config.durationMinutes || 60) * 60 * 1000,
            formattedStart: formatDate(selectedStart),
            formattedEnd: formatDate(
              selectedEnd || selectedStart + (config.durationMinutes || 60) * 60 * 1000
            ),
          }
        : undefined,
      isValid: true,
      validationMessage: "Slot selection confirmed",
    };

    return {
      success: true,
      data: result,
      actions: [
        {
          type: "reserve_slot",
          when: "immediate",
          payload: {
            resourceId: config.resourceId,
            startDateTime: selectedStart,
            endDateTime:
              selectedEnd ||
              selectedStart! + (config.durationMinutes || 60) * 60 * 1000,
            sessionId: context.sessionId,
            expiresInMinutes: 15, // Temporary reservation
          },
        },
      ],
      modifiedContext: {
        workflowData: {
          ...context.workflowData,
          selectedSlot: result.selectedSlot,
          resourceId: config.resourceId,
        },
      },
    };
  },
};
