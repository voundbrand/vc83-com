/**
 * SEQUENCE TRIGGERS
 *
 * Defines trigger events and filter matching logic for sequences.
 * Maps system events to sequence enrollment opportunities.
 *
 * Trigger Types:
 * - booking_confirmed - When a booking is confirmed
 * - booking_checked_in - When customer checks in
 * - booking_completed - When booking finishes
 * - pipeline_stage_changed - When CRM contact moves stages
 * - contact_tagged - When a tag is added to contact
 * - manual_enrollment - Manual enrollment via UI/API
 */

import { Id } from "../_generated/dataModel";

// ============================================================================
// TRIGGER DEFINITIONS
// ============================================================================

/**
 * All supported trigger events
 */
export type TriggerEvent =
  | "booking_confirmed"
  | "booking_checked_in"
  | "booking_completed"
  | "booking_cancelled"
  | "pipeline_stage_changed"
  | "contact_tagged"
  | "manual_enrollment";

/**
 * Trigger filter configuration
 */
export interface TriggerFilters {
  // Booking filters
  bookingSubtypes?: string[]; // appointment, reservation, rental, class_enrollment
  locationIds?: Id<"objects">[];
  resourceIds?: Id<"objects">[];

  // Pipeline filters
  pipelineId?: Id<"objects">;
  stageId?: Id<"objects">;
  fromStageIds?: Id<"objects">[]; // Only trigger when moving FROM these stages
  toStageIds?: Id<"objects">[]; // Only trigger when moving TO these stages

  // Tag filters
  tagIds?: Id<"objects">[];

  // Contact filters
  contactTypes?: string[]; // lead, customer, vip, etc.

  // Time filters
  minDaysOut?: number; // Minimum days before booking start
  maxDaysOut?: number; // Maximum days before booking start
}

/**
 * Context passed to trigger processor
 */
export interface TriggerContext {
  organizationId: Id<"organizations">;
  triggerEvent: TriggerEvent;

  // Entity references
  contactId?: Id<"objects">;
  bookingId?: Id<"objects">;
  pipelineId?: Id<"objects">;
  stageId?: Id<"objects">;
  previousStageId?: Id<"objects">;
  tagId?: Id<"objects">;

  // Booking context
  bookingSubtype?: string;
  bookingStartDateTime?: number;
  bookingEndDateTime?: number;
  locationId?: Id<"objects">;
  resourceId?: Id<"objects">;

  // Contact context
  contactType?: string;

  // Timestamp
  triggeredAt: number;
}

// ============================================================================
// FILTER MATCHING LOGIC
// ============================================================================

/**
 * Check if a trigger context matches the sequence filters
 *
 * @param filters - Sequence trigger filters
 * @param context - Current trigger context
 * @returns true if context matches all filters
 */
export function matchesTriggerFilters(
  filters: TriggerFilters | undefined,
  context: TriggerContext
): boolean {
  // No filters = match everything
  if (!filters) {
    return true;
  }

  // Check booking subtype filter
  if (filters.bookingSubtypes && filters.bookingSubtypes.length > 0) {
    if (!context.bookingSubtype || !filters.bookingSubtypes.includes(context.bookingSubtype)) {
      return false;
    }
  }

  // Check location filter
  if (filters.locationIds && filters.locationIds.length > 0) {
    if (!context.locationId || !filters.locationIds.includes(context.locationId)) {
      return false;
    }
  }

  // Check resource filter
  if (filters.resourceIds && filters.resourceIds.length > 0) {
    if (!context.resourceId || !filters.resourceIds.includes(context.resourceId)) {
      return false;
    }
  }

  // Check pipeline filter
  if (filters.pipelineId) {
    if (context.pipelineId !== filters.pipelineId) {
      return false;
    }
  }

  // Check stage filter (current stage)
  if (filters.stageId) {
    if (context.stageId !== filters.stageId) {
      return false;
    }
  }

  // Check from-stage filter (pipeline stage change)
  if (filters.fromStageIds && filters.fromStageIds.length > 0) {
    if (!context.previousStageId || !filters.fromStageIds.includes(context.previousStageId)) {
      return false;
    }
  }

  // Check to-stage filter (pipeline stage change)
  if (filters.toStageIds && filters.toStageIds.length > 0) {
    if (!context.stageId || !filters.toStageIds.includes(context.stageId)) {
      return false;
    }
  }

  // Check tag filter
  if (filters.tagIds && filters.tagIds.length > 0) {
    if (!context.tagId || !filters.tagIds.includes(context.tagId)) {
      return false;
    }
  }

  // Check contact type filter
  if (filters.contactTypes && filters.contactTypes.length > 0) {
    if (!context.contactType || !filters.contactTypes.includes(context.contactType)) {
      return false;
    }
  }

  // Check days-out filters for booking triggers
  if ((filters.minDaysOut !== undefined || filters.maxDaysOut !== undefined) && context.bookingStartDateTime) {
    const now = Date.now();
    const daysUntilBooking = Math.floor((context.bookingStartDateTime - now) / (24 * 60 * 60 * 1000));

    if (filters.minDaysOut !== undefined && daysUntilBooking < filters.minDaysOut) {
      return false;
    }

    if (filters.maxDaysOut !== undefined && daysUntilBooking > filters.maxDaysOut) {
      return false;
    }
  }

  // All filters passed
  return true;
}

/**
 * Build trigger context from a booking object
 */
export function buildBookingTriggerContext(
  booking: {
    organizationId: Id<"organizations">;
    _id: Id<"objects">;
    subtype: string;
    customProperties: Record<string, unknown>;
  },
  triggerEvent: TriggerEvent
): TriggerContext {
  const props = booking.customProperties;

  return {
    organizationId: booking.organizationId,
    triggerEvent,
    bookingId: booking._id,
    contactId: props.contactId as Id<"objects"> | undefined,
    bookingSubtype: booking.subtype,
    bookingStartDateTime: props.startDateTime as number | undefined,
    bookingEndDateTime: props.endDateTime as number | undefined,
    locationId: props.locationId as Id<"objects"> | undefined,
    resourceId: props.resourceId as Id<"objects"> | undefined,
    triggeredAt: Date.now(),
  };
}

/**
 * Build trigger context from a pipeline stage change
 */
export function buildPipelineTriggerContext(
  organizationId: Id<"organizations">,
  contactId: Id<"objects">,
  pipelineId: Id<"objects">,
  newStageId: Id<"objects">,
  previousStageId?: Id<"objects">
): TriggerContext {
  return {
    organizationId,
    triggerEvent: "pipeline_stage_changed",
    contactId,
    pipelineId,
    stageId: newStageId,
    previousStageId,
    triggeredAt: Date.now(),
  };
}

/**
 * Build trigger context from a tag event
 */
export function buildTagTriggerContext(
  organizationId: Id<"organizations">,
  contactId: Id<"objects">,
  tagId: Id<"objects">
): TriggerContext {
  return {
    organizationId,
    triggerEvent: "contact_tagged",
    contactId,
    tagId,
    triggeredAt: Date.now(),
  };
}
