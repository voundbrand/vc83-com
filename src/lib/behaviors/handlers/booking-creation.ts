/**
 * BOOKING CREATION BEHAVIOR
 *
 * Creates a booking record after successful payment. Finalizes temporary
 * reservations and triggers confirmation notifications.
 *
 * **Use Cases:**
 * - Hotel: Create room reservation after payment
 * - Sailing school: Enroll student in course
 * - Boat rental: Confirm equipment reservation
 * - Appointments: Schedule consultation
 *
 * **Input Types Supported:**
 * - Event: Payment success triggers booking creation
 * - Agent: AI can create bookings directly
 * - API: External systems can create bookings
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

export type BookingType =
  | "appointment"
  | "reservation"
  | "rental"
  | "class_enrollment";

export interface BookingCreationConfig {
  /**
   * Resource being booked
   */
  resourceId: Id<"objects">;

  /**
   * Type of booking to create
   */
  bookingType: BookingType;

  /**
   * Location for the booking (optional)
   */
  locationId?: Id<"objects">;

  /**
   * Whether booking requires admin confirmation
   * @default false
   */
  requiresConfirmation?: boolean;

  /**
   * Send confirmation email
   * @default true
   */
  sendConfirmationEmail?: boolean;

  /**
   * Send reminder before booking
   * @default true
   */
  sendReminder?: boolean;

  /**
   * Hours before booking to send reminder
   * @default 24
   */
  reminderHours?: number;

  /**
   * Add to customer's calendar (if available)
   * @default true
   */
  addToCalendar?: boolean;

  /**
   * Custom fields to include in booking from form
   */
  customFieldMappings?: Array<{
    formFieldId: string;
    bookingField: string;
  }>;

  /**
   * Cancellation policy to attach
   */
  cancellationPolicy?: {
    allowCancellation: boolean;
    freeCancellationHours?: number;
    cancellationFeePercent?: number;
  };
}

// ============================================================================
// Extracted Data
// ============================================================================

export interface ExtractedBookingData {
  /**
   * Selected time slot (from previous behavior)
   */
  selectedSlot?: {
    start: number;
    end: number;
  };

  /**
   * Participants/quantity (from capacity validation)
   */
  participants: number;

  /**
   * Customer information
   */
  customer: {
    name: string;
    email: string;
    phone?: string;
  };

  /**
   * Custom field values
   */
  customFields: Record<string, unknown>;

  /**
   * Payment reference (if payment was made)
   */
  paymentReference?: string;

  /**
   * Order/transaction ID
   */
  orderId?: string;
}

// ============================================================================
// Result Data
// ============================================================================

export interface BookingCreationResult {
  type: "booking_creation";
  bookingId: string;
  bookingType: BookingType;
  status: "pending_confirmation" | "confirmed";
  resourceId: Id<"objects">;
  customer: {
    name: string;
    email: string;
  };
  slot: {
    start: number;
    end: number;
    formattedStart: string;
    formattedEnd: string;
  };
  participants: number;
  confirmationNumber: string;
}

// ============================================================================
// Behavior Handler
// ============================================================================

export const bookingCreationHandler: BehaviorHandler<
  BookingCreationConfig,
  ExtractedBookingData,
  BookingCreationResult
> = {
  type: "booking_creation",
  name: "Booking Creation",
  description: "Create a booking record after successful payment",
  category: "action",
  supportedInputTypes: ["event", "agent_decision", "api", "form"],
  supportedObjectTypes: ["product", "service", "resource", "room", "equipment"],
  supportedWorkflows: ["checkout", "booking", "reservation"],

  /**
   * EXTRACT - Gather booking data from context and inputs
   */
  extract: (
    config: BookingCreationConfig,
    inputs: InputSource[],
    context: Readonly<BehaviorContext>
  ): ExtractedBookingData | null => {
    // Get selected slot from workflow context (from availability-slot-selection)
    const selectedSlot = context.workflowData?.selectedSlot as
      | { start: number; end: number }
      | undefined;

    // Get participants from capacity validation or cart
    let participants = 1;
    if (context.workflowData?.lockedQuantity) {
      participants = context.workflowData.lockedQuantity as number;
    } else if (context.objects) {
      const resourceObj = context.objects.find(
        (o) => o.objectId === config.resourceId
      );
      if (resourceObj?.quantity) {
        participants = resourceObj.quantity;
      }
    }

    // Get customer information
    let customer = {
      name: "",
      email: "",
      phone: undefined as string | undefined,
    };

    // Check workflow data first (from checkout)
    if (context.workflowData?.customerInfo) {
      const info = context.workflowData.customerInfo as {
        name?: string;
        email?: string;
        phone?: string;
      };
      customer = {
        name: info.name || "",
        email: info.email || "",
        phone: info.phone,
      };
    }

    // Also check form inputs
    for (const input of inputs) {
      if (input.type === "form") {
        if (input.data.name && !customer.name) {
          customer.name = String(input.data.name);
        }
        if (input.data.email && !customer.email) {
          customer.email = String(input.data.email);
        }
        if (input.data.phone && !customer.phone) {
          customer.phone = String(input.data.phone);
        }
        // Common variations
        if (input.data.customerName && !customer.name) {
          customer.name = String(input.data.customerName);
        }
        if (input.data.customerEmail && !customer.email) {
          customer.email = String(input.data.customerEmail);
        }
      }
    }

    // Extract custom fields
    const customFields: Record<string, unknown> = {};
    if (config.customFieldMappings) {
      for (const mapping of config.customFieldMappings) {
        for (const input of inputs) {
          if (input.type === "form" && input.data[mapping.formFieldId]) {
            customFields[mapping.bookingField] = input.data[mapping.formFieldId];
          }
        }
      }
    }

    // Get payment reference
    const paymentReference = context.workflowData?.paymentReference as
      | string
      | undefined;
    const orderId = context.workflowData?.orderId as string | undefined;

    // Validate we have minimum required data
    if (!selectedSlot || !customer.email) {
      return null; // Cannot create booking without slot and customer
    }

    return {
      selectedSlot,
      participants,
      customer,
      customFields,
      paymentReference,
      orderId,
    };
  },

  /**
   * VALIDATE - Check if config is valid
   */
  validate: (
    config: BookingCreationConfig,
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

    if (!config.bookingType) {
      errors.push({
        field: "bookingType",
        message: "bookingType is required",
        code: "required",
        severity: "error",
      });
    }

    const validTypes: BookingType[] = [
      "appointment",
      "reservation",
      "rental",
      "class_enrollment",
    ];
    if (config.bookingType && !validTypes.includes(config.bookingType)) {
      errors.push({
        field: "bookingType",
        message: `bookingType must be one of: ${validTypes.join(", ")}`,
        code: "invalid_value",
        severity: "error",
      });
    }

    if (config.cancellationPolicy) {
      if (
        config.cancellationPolicy.cancellationFeePercent !== undefined &&
        (config.cancellationPolicy.cancellationFeePercent < 0 ||
          config.cancellationPolicy.cancellationFeePercent > 100)
      ) {
        errors.push({
          field: "cancellationPolicy.cancellationFeePercent",
          message: "cancellationFeePercent must be between 0 and 100",
          code: "invalid_value",
          severity: "error",
        });
      }
    }

    return errors;
  },

  /**
   * APPLY - Create the booking
   */
  apply: (
    config: BookingCreationConfig,
    extracted: ExtractedBookingData,
    context: Readonly<BehaviorContext>
  ): BehaviorResult<BookingCreationResult> => {
    const { selectedSlot, participants, customer, customFields, paymentReference, orderId } =
      extracted;

    if (!selectedSlot) {
      return {
        success: false,
        errors: ["No time slot selected"],
      };
    }

    // Generate confirmation number
    const confirmationNumber = generateConfirmationNumber(config.bookingType);

    // Determine initial status
    const status = config.requiresConfirmation
      ? "pending_confirmation"
      : "confirmed";

    // Format dates for display
    const formatDate = (ts: number) =>
      new Date(ts).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "short",
      });

    const result: BookingCreationResult = {
      type: "booking_creation",
      bookingId: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookingType: config.bookingType,
      status,
      resourceId: config.resourceId,
      customer: {
        name: customer.name,
        email: customer.email,
      },
      slot: {
        start: selectedSlot.start,
        end: selectedSlot.end,
        formattedStart: formatDate(selectedSlot.start),
        formattedEnd: formatDate(selectedSlot.end),
      },
      participants,
      confirmationNumber,
    };

    const actions = [];

    // 1. Create booking record
    actions.push({
      type: "create_booking",
      when: "immediate" as const,
      payload: {
        organizationId: context.organizationId,
        resourceId: config.resourceId,
        locationId: config.locationId,
        bookingType: config.bookingType,
        status,
        startDateTime: selectedSlot.start,
        endDateTime: selectedSlot.end,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        participants,
        confirmationNumber,
        paymentReference,
        orderId,
        customFields,
        cancellationPolicy: config.cancellationPolicy,
      },
    });

    // 2. Finalize slot reservation (convert temporary to permanent)
    actions.push({
      type: "finalize_reservation",
      when: "immediate" as const,
      payload: {
        resourceId: config.resourceId,
        sessionId: context.sessionId,
        bookingId: result.bookingId,
      },
    });

    // 3. Send confirmation email
    if (config.sendConfirmationEmail !== false) {
      actions.push({
        type: "send_booking_confirmation",
        when: "deferred" as const,
        payload: {
          bookingId: result.bookingId,
          customerEmail: customer.email,
          customerName: customer.name,
          bookingType: config.bookingType,
          confirmationNumber,
          slot: result.slot,
          participants,
        },
      });
    }

    // 4. Schedule reminder
    if (config.sendReminder !== false) {
      const reminderTime =
        selectedSlot.start - (config.reminderHours || 24) * 60 * 60 * 1000;
      if (reminderTime > Date.now()) {
        actions.push({
          type: "schedule_booking_reminder",
          when: "scheduled" as const,
          scheduledFor: reminderTime,
          payload: {
            bookingId: result.bookingId,
            customerEmail: customer.email,
            customerName: customer.name,
            slot: result.slot,
          },
        });
      }
    }

    // 5. Add to calendar (if available)
    if (config.addToCalendar !== false) {
      actions.push({
        type: "generate_calendar_event",
        when: "deferred" as const,
        payload: {
          bookingId: result.bookingId,
          title: `${config.bookingType}: ${confirmationNumber}`,
          startDateTime: selectedSlot.start,
          endDateTime: selectedSlot.end,
          attendeeEmail: customer.email,
          attendeeName: customer.name,
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
          booking: result,
          confirmationNumber,
        },
      },
    };
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a human-readable confirmation number
 */
function generateConfirmationNumber(bookingType: BookingType): string {
  const prefixes: Record<BookingType, string> = {
    appointment: "APT",
    reservation: "RES",
    rental: "RNT",
    class_enrollment: "CLS",
  };
  const prefix = prefixes[bookingType] || "BKG";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp.slice(-4)}${random}`;
}
