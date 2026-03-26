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

const BOOKING_SETUP_BLUEPRINT_CONTRACT_VERSION =
  "booking_setup_blueprint_v1" as const;

const DEFAULT_BLUEPRINT_TIMEZONE = "Europe/Berlin";
const DEFAULT_BLUEPRINT_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
];

const DEFAULT_BLUEPRINT_INVENTORY_GROUPS = [
  { id: "fraukje", label: "Fraukje", capacity: 4 },
  { id: "rose", label: "Rose", capacity: 4 },
];

const DEFAULT_BLUEPRINT_COURSES = [
  {
    courseId: "schnupper",
    displayName: "Taster course",
    bookingDurationMinutes: 180,
    availableTimes: ["09:00", "13:00"],
    isMultiDay: false,
  },
  {
    courseId: "grund",
    displayName: "Weekend course",
    bookingDurationMinutes: 480,
    availableTimes: DEFAULT_BLUEPRINT_TIMES,
    isMultiDay: true,
  },
  {
    courseId: "intensiv",
    displayName: "Intensive sailing license course",
    bookingDurationMinutes: 480,
    availableTimes: DEFAULT_BLUEPRINT_TIMES,
    isMultiDay: true,
  },
];

type SeatBookingSetupTemplate = "sailing_school_two_boats" | "custom";

interface SeatBookingCatalogInventoryGroup {
  id: string;
  label: string;
  capacity: number;
}

interface SeatBookingCatalogCourse {
  courseId: string;
  displayName?: string;
  bookingDurationMinutes: number;
  availableTimes: string[];
  bookingResourceId?: string;
  checkoutProductId?: string;
  checkoutPublicUrl?: string;
  isMultiDay?: boolean;
}

interface SeatBookingCatalog {
  contractVersion: typeof BOOKING_SETUP_BLUEPRINT_CONTRACT_VERSION;
  timezone: string;
  defaultAvailableTimes: string[];
  inventoryGroups: SeatBookingCatalogInventoryGroup[];
  courses: SeatBookingCatalogCourse[];
}

interface BookingSetupCourseDiagnostic {
  courseId: string;
  displayName: string;
  bookingResourceId: string | null;
  checkoutProductId: string | null;
  checkoutPublicUrl: string | null;
  resourceCandidates: Array<{ id: string; name: string }>;
  checkoutCandidates: Array<{ id: string; name: string }>;
  checkoutPublicUrlCandidates: string[];
  warnings: string[];
}

type CatalogEntity = {
  _id: string;
  name?: string;
  publicSlug?: string;
};

interface BookingBootstrapQuestion {
  id: string;
  title: string;
  description: string;
  fieldPath: string;
  answerType: "string" | "number" | "boolean" | "select" | "array" | "object";
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === "false" || value === 0 || value === "0") {
    return false;
  }
  return undefined;
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeCourseId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTimeSlot(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)
    ? normalized
    : undefined;
}

function normalizeTimeSlotArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const unique = new Set<string>();
  for (const entry of value) {
    const slot = normalizeTimeSlot(entry);
    if (slot) {
      unique.add(slot);
    }
  }
  return unique.size > 0 ? Array.from(unique) : fallback;
}

function normalizeInventoryGroupId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeInventoryGroups(
  value: unknown
): SeatBookingCatalogInventoryGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const byId = new Map<string, SeatBookingCatalogInventoryGroup>();
  for (const rawGroup of value) {
    if (!rawGroup || typeof rawGroup !== "object") {
      continue;
    }
    const record = rawGroup as Record<string, unknown>;
    const id = normalizeInventoryGroupId(record.id || record.groupId);
    const label = normalizeOptionalString(record.label || record.name);
    const capacity = normalizePositiveInteger(record.capacity);
    if (!id || !label || !capacity) {
      continue;
    }
    byId.set(id, { id, label, capacity });
  }
  return Array.from(byId.values());
}

function normalizeCatalogCourses(
  value: unknown,
  fallbackTimes: string[],
): SeatBookingCatalogCourse[] {
  const courses: SeatBookingCatalogCourse[] = [];
  const appendCourse = (rawCourseId: unknown, rawValue: unknown) => {
    const courseId = normalizeCourseId(rawCourseId);
    if (!courseId || !rawValue || typeof rawValue !== "object") {
      return;
    }
    const record = rawValue as Record<string, unknown>;
    const bookingDurationMinutes = normalizePositiveInteger(
      record.bookingDurationMinutes
    );
    if (!bookingDurationMinutes) {
      return;
    }

    courses.push({
      courseId,
      displayName: normalizeOptionalString(record.displayName || record.title),
      bookingDurationMinutes,
      availableTimes: normalizeTimeSlotArray(record.availableTimes, fallbackTimes),
      bookingResourceId: normalizeOptionalString(record.bookingResourceId),
      checkoutProductId: normalizeOptionalString(record.checkoutProductId),
      checkoutPublicUrl: normalizeOptionalString(record.checkoutPublicUrl),
      isMultiDay:
        typeof record.isMultiDay === "boolean" ? record.isMultiDay : undefined,
    });
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      appendCourse(record.courseId || record.id, record);
    }
    return courses;
  }

  if (!value || typeof value !== "object") {
    return courses;
  }
  for (const [courseId, courseValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    appendCourse(courseId, courseValue);
  }
  return courses;
}

function resolveCourseKeywords(course: SeatBookingCatalogCourse): string[] {
  const base = [course.courseId, course.displayName || ""]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  if (course.courseId === "schnupper") {
    base.push("taster", "trial", "intro");
  }
  if (course.courseId === "grund") {
    base.push("weekend", "basic");
  }
  if (course.courseId === "intensiv") {
    base.push("intensive", "license");
  }
  return Array.from(new Set(base));
}

function findCandidatesByKeywords(
  entities: CatalogEntity[],
  keywords: string[]
): Array<{ id: string; name: string }> {
  const normalizedKeywords = keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 0);
  if (normalizedKeywords.length === 0) {
    return [];
  }

  return entities
    .map((entity) => {
      const name = normalizeOptionalString(entity.name) || entity._id;
      const haystack = `${name} ${entity._id}`.toLowerCase();
      const score = normalizedKeywords.reduce(
        (total, keyword) => total + (haystack.includes(keyword) ? 1 : 0),
        0
      );
      return {
        id: entity._id,
        name,
        score,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map(({ id, name }) => ({ id, name }));
}

function buildDefaultSeatBookingCatalog(): SeatBookingCatalog {
  return {
    contractVersion: BOOKING_SETUP_BLUEPRINT_CONTRACT_VERSION,
    timezone: DEFAULT_BLUEPRINT_TIMEZONE,
    defaultAvailableTimes: [...DEFAULT_BLUEPRINT_TIMES],
    inventoryGroups: DEFAULT_BLUEPRINT_INVENTORY_GROUPS.map((group) => ({
      ...group,
    })),
    courses: DEFAULT_BLUEPRINT_COURSES.map((course) => ({ ...course })),
  };
}

function buildSeatBookingCatalog(args: {
  setupTemplate?: string;
  catalogInput?: unknown;
}): SeatBookingCatalog {
  const template = args.setupTemplate as SeatBookingSetupTemplate | undefined;
  const baseCatalog =
    template === "custom"
      ? {
          contractVersion: BOOKING_SETUP_BLUEPRINT_CONTRACT_VERSION,
          timezone: DEFAULT_BLUEPRINT_TIMEZONE,
          defaultAvailableTimes: [...DEFAULT_BLUEPRINT_TIMES],
          inventoryGroups: [] as SeatBookingCatalogInventoryGroup[],
          courses: [] as SeatBookingCatalogCourse[],
        }
      : buildDefaultSeatBookingCatalog();

  if (!args.catalogInput || typeof args.catalogInput !== "object") {
    return baseCatalog;
  }

  const input = args.catalogInput as Record<string, unknown>;
  const defaultAvailableTimes = normalizeTimeSlotArray(
    input.defaultAvailableTimes,
    baseCatalog.defaultAvailableTimes
  );
  const inventoryGroups = normalizeInventoryGroups(input.inventoryGroups);
  const courses = normalizeCatalogCourses(input.courses, defaultAvailableTimes);

  return {
    contractVersion: BOOKING_SETUP_BLUEPRINT_CONTRACT_VERSION,
    timezone:
      normalizeOptionalString(input.timezone) || baseCatalog.timezone,
    defaultAvailableTimes,
    inventoryGroups:
      inventoryGroups.length > 0
        ? inventoryGroups
        : baseCatalog.inventoryGroups,
    courses: courses.length > 0 ? courses : baseCatalog.courses,
  };
}

function buildLegacyBindingsFromCatalog(catalog: SeatBookingCatalog) {
  const bindings: Record<string, Record<string, unknown>> = {};
  for (const course of catalog.courses) {
    bindings[course.courseId] = {
      bookingResourceId: course.bookingResourceId,
      checkoutProductId: course.checkoutProductId,
      checkoutPublicUrl: course.checkoutPublicUrl,
      bookingDurationMinutes: course.bookingDurationMinutes,
    };
  }
  return bindings;
}

function buildCourseSetupDiagnostics(args: {
  catalog: SeatBookingCatalog;
  productEntities: CatalogEntity[];
  checkoutEntities: CatalogEntity[];
}): BookingSetupCourseDiagnostic[] {
  const checkoutEntityById = new Map(
    args.checkoutEntities.map((entity) => [entity._id, entity])
  );

  return args.catalog.courses.map((course) => {
    const keywords = resolveCourseKeywords(course);
    const resourceCandidates = findCandidatesByKeywords(
      args.productEntities,
      keywords
    );
    const checkoutCandidates = findCandidatesByKeywords(
      args.checkoutEntities,
      keywords
    );
    const checkoutPublicUrlCandidates = Array.from(
      new Set(
        checkoutCandidates
          .map((candidate) => checkoutEntityById.get(candidate.id))
          .map((entity) => normalizeOptionalString(entity?.publicSlug))
          .filter((publicSlug): publicSlug is string => Boolean(publicSlug))
          .map((publicSlug) =>
            /^https?:\/\//i.test(publicSlug)
              ? publicSlug
              : `/checkout/${publicSlug.replace(/^\/+/, "")}`
          )
      )
    );
    const warnings: string[] = [];
    if (!course.bookingResourceId) {
      warnings.push("missing_booking_resource_id");
    }
    if (!course.checkoutProductId) {
      warnings.push("missing_checkout_product_id");
    }
    return {
      courseId: course.courseId,
      displayName: course.displayName || course.courseId,
      bookingResourceId: course.bookingResourceId || null,
      checkoutProductId: course.checkoutProductId || null,
      checkoutPublicUrl: course.checkoutPublicUrl || null,
      resourceCandidates,
      checkoutCandidates,
      checkoutPublicUrlCandidates,
      warnings,
    };
  });
}

function buildCheckoutPublicUrlFromSlug(slug: string | undefined): string | undefined {
  const normalized = normalizeOptionalString(slug);
  if (!normalized) {
    return undefined;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return `/checkout/${normalized.replace(/^\/+/, "")}`;
}

function normalizeBootstrapCourseOverrides(
  value: unknown
): Map<string, Record<string, unknown>> {
  const overrides = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(value)) {
    return overrides;
  }

  for (const entry of value) {
    const record = normalizeRecord(entry);
    if (!record) {
      continue;
    }
    const courseId = normalizeCourseId(record.courseId || record.id);
    if (!courseId) {
      continue;
    }
    overrides.set(courseId, record);
  }
  return overrides;
}

function normalizePriceCents(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return undefined;
}

function normalizePriceMajorToCents(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed * 100);
    }
  }
  return undefined;
}

function resolveCoursePriceCents(args: {
  bootstrapConfig: Record<string, unknown>;
  courseOverride: Record<string, unknown> | undefined;
}): number {
  const overrideCents = normalizePriceCents(args.courseOverride?.priceCents);
  if (typeof overrideCents === "number") {
    return overrideCents;
  }
  const overrideMajor = normalizePriceMajorToCents(args.courseOverride?.price);
  if (typeof overrideMajor === "number") {
    return overrideMajor;
  }

  const defaultCents = normalizePriceCents(args.bootstrapConfig.defaultPriceCents);
  if (typeof defaultCents === "number") {
    return defaultCents;
  }
  const defaultMajor = normalizePriceMajorToCents(args.bootstrapConfig.defaultPrice);
  if (typeof defaultMajor === "number") {
    return defaultMajor;
  }
  return 0;
}

function buildBookingBootstrapInterviewQuestions(args: {
  appSlug: string;
  surfaceType: string;
  surfaceKey: string;
  catalog: SeatBookingCatalog;
}): BookingBootstrapQuestion[] {
  return [
    {
      id: "business_type",
      title: "Business Type",
      description:
        "What are you selling (hotel stays, classes, rentals, appointments, event seats)?",
      fieldPath: "bootstrapInput.businessType",
      answerType: "string",
      required: true,
    },
    {
      id: "surface_identity",
      title: "Surface Identity",
      description:
        "Confirm where this setup should be saved (appSlug + surfaceType + surfaceKey).",
      fieldPath: "surfaceIdentity",
      answerType: "object",
      required: true,
      defaultValue: {
        appSlug: args.appSlug,
        surfaceType: args.surfaceType,
        surfaceKey: args.surfaceKey,
      },
    },
    {
      id: "timezone",
      title: "Timezone",
      description: "Timezone used for booking slots and availability windows.",
      fieldPath: "catalogInput.timezone",
      answerType: "string",
      required: true,
      defaultValue: args.catalog.timezone,
    },
    {
      id: "inventory_groups",
      title: "Inventory Groups",
      description:
        "Define sellable capacity groups (seat groups, unit groups, room groups).",
      fieldPath: "catalogInput.inventoryGroups",
      answerType: "array",
      required: true,
      defaultValue: args.catalog.inventoryGroups,
    },
    {
      id: "profiles",
      title: "Profiles",
      description:
        "Define booking profiles/courses (id, label, duration, times, multi-day).",
      fieldPath: "catalogInput.courses",
      answerType: "array",
      required: true,
      defaultValue: args.catalog.courses.map((course) => ({
        courseId: course.courseId,
        displayName: course.displayName || course.courseId,
        bookingDurationMinutes: course.bookingDurationMinutes,
        availableTimes: course.availableTimes,
        isMultiDay: course.isMultiDay === true,
      })),
    },
    {
      id: "pricing",
      title: "Pricing",
      description:
        "Provide default price and optional per-profile overrides for auto-created resources.",
      fieldPath: "bootstrapInput.pricing",
      answerType: "object",
      required: true,
      defaultValue: {
        currency: "EUR",
        defaultPrice: 0,
        coursePricing: [],
      },
    },
    {
      id: "checkout_strategy",
      title: "Checkout Strategy",
      description: "Choose one checkout for all profiles or one per profile.",
      fieldPath: "bootstrapInput.checkoutStrategy",
      answerType: "select",
      required: true,
      defaultValue: "per_course",
      options: ["per_course", "shared"],
    },
    {
      id: "publish_checkouts",
      title: "Publish Checkouts",
      description: "Publish checkouts immediately to generate public URLs.",
      fieldPath: "bootstrapInput.publishCheckouts",
      answerType: "boolean",
      required: true,
      defaultValue: true,
    },
  ];
}

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
            "validate_workflow",
            "generate_booking_setup_blueprint",
            "upsert_booking_surface_binding",
            "list_booking_surface_bindings",
            "bootstrap_booking_surface"
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
        appSlug: {
          type: "string",
          description: "Frontend app slug for surface binding (e.g., hotel-web, events-app)"
        },
        surfaceType: {
          type: "string",
          description: "Surface type for binding (default: booking)"
        },
        surfaceKey: {
          type: "string",
          description: "Surface key/environment slot (default: default)"
        },
        bindingEnabled: {
          type: "boolean",
          description: "Whether this surface binding is enabled (default true)"
        },
        setupTemplate: {
          type: "string",
          enum: ["sailing_school_two_boats", "custom"],
          description:
            "Setup blueprint template. sailing_school_two_boats returns a sailing-school preset with two inventory groups."
        },
        catalogInput: {
          type: "object",
          description:
            "Optional catalog override { timezone, defaultAvailableTimes, inventoryGroups[], courses[] }."
        },
        includeCalendarReadiness: {
          type: "boolean",
          description:
            "When true (default), include Google calendar write-readiness snapshot for the current session."
        },
        bootstrapInput: {
          type: "object",
          description:
            "Optional bootstrap payload for bootstrap_booking_surface. Supports catalogInput override, pricing, checkout strategy, and publish flags."
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
    appSlug: v.optional(v.string()),
    surfaceType: v.optional(v.string()),
    surfaceKey: v.optional(v.string()),
    bindingEnabled: v.optional(v.boolean()),
    setupTemplate: v.optional(v.string()),
    catalogInput: v.optional(v.any()),
    includeCalendarReadiness: v.optional(v.boolean()),
    bootstrapInput: v.optional(v.any()),
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

        case "generate_booking_setup_blueprint":
          return await generateBookingSetupBlueprint(ctx, organizationId, args);

        case "upsert_booking_surface_binding":
          if (!userId) {
            throw new Error("userId required");
          }
          return await upsertBookingSurfaceBinding(ctx, organizationId, userId, args);

        case "list_booking_surface_bindings":
          return await listBookingSurfaceBindingsAction(ctx, organizationId, args);

        case "bootstrap_booking_surface":
          if (!userId) {
            throw new Error("userId required");
          }
          return await bootstrapBookingSurface(ctx, organizationId, userId, args);

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

async function generateBookingSetupBlueprint(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: {
    mode?: string;
    sessionId?: string;
    setupTemplate?: string;
    catalogInput?: unknown;
    includeCalendarReadiness?: boolean;
  }
) {
  const mode = args.mode || "preview";
  const catalog = buildSeatBookingCatalog({
    setupTemplate: args.setupTemplate,
    catalogInput: args.catalogInput,
  });
  const legacyBindings = buildLegacyBindingsFromCatalog(catalog);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, checkouts] = await Promise.all([
    (ctx as any).runQuery(
      generatedApi.internal.ai.tools.internalToolMutations.internalListProducts,
      {
        organizationId,
        limit: 250,
      }
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx as any).runQuery(
      generatedApi.internal.ai.tools.internalToolMutations.internalListCheckouts,
      {
        organizationId,
        limit: 250,
      }
    ),
  ]);

  const productEntities: CatalogEntity[] = Array.isArray(products)
    ? products.map((product) => ({
        _id: String(product._id),
        name: normalizeOptionalString(product.name),
      }))
    : [];
  const checkoutEntities: CatalogEntity[] = Array.isArray(checkouts)
    ? checkouts.map((checkout) => ({
        _id: String(checkout._id),
        name: normalizeOptionalString(checkout.name),
        publicSlug: normalizeOptionalString(checkout.publicSlug),
      }))
    : [];

  const diagnostics = buildCourseSetupDiagnostics({
    catalog,
    productEntities,
    checkoutEntities,
  });

  const warnings = diagnostics
    .filter((course) => course.warnings.length > 0)
    .map(
      (course) =>
        `${course.courseId}: ${course.warnings.join(", ")}`
    );

  let calendarReadiness:
    | {
        generatedAt?: number;
        providerFilter?: string;
        readiness?: Record<string, unknown>;
      }
    | null = null;
  if (args.includeCalendarReadiness !== false && args.sessionId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readinessResult = await (ctx as any).runQuery(
        generatedApi.api.calendarSyncOntology.getPlannerCalendarWriteReadiness,
        {
          sessionId: args.sessionId,
          provider: "google",
        }
      );
      calendarReadiness = readinessResult || null;
    } catch {
      warnings.push("calendar_readiness_lookup_failed");
    }
  }

  const serializedCatalog = JSON.stringify(catalog);
  const serializedLegacyBindings = JSON.stringify(legacyBindings);

  const envMapping = {
    BOOKING_RUNTIME_CONFIG_JSON: serializedCatalog,
    BOOKING_COURSE_BINDINGS_JSON: serializedLegacyBindings,
    SEGELSCHULE_BOOKING_CATALOG_JSON: serializedCatalog,
    SEGELSCHULE_COURSE_BINDINGS_JSON: serializedLegacyBindings,
  };

  const nextSteps = [
    "Save the runtime config via booking surface bindings (recommended) or env wiring for your app runtime.",
    "Verify every course has both bookingResourceId and checkoutProductId before go-live.",
    "Run /api/booking/availability smoke checks for each course/date/time window.",
    "Run a checkout booking and verify booking metadata includes bookingId + platformBookingId.",
    "Confirm Google calendar write readiness and run one confirmed booking reconciliation check.",
  ];

  return {
    success: true,
    action: "generate_booking_setup_blueprint",
    mode,
    data: {
      contractVersion: BOOKING_SETUP_BLUEPRINT_CONTRACT_VERSION,
      template: args.setupTemplate || "sailing_school_two_boats",
      catalog,
      legacyBindings,
      bookingCatalogJson: JSON.stringify(catalog, null, 2),
      legacyBindingsJson: JSON.stringify(legacyBindings, null, 2),
      envMapping,
      diagnostics,
      warnings,
      calendarReadiness,
      nextSteps,
    },
    message:
      warnings.length > 0
        ? `Blueprint generated with ${warnings.length} mapping warning(s).`
        : "Blueprint generated and ready for env wiring.",
  };
}

async function upsertBookingSurfaceBinding(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    appSlug?: string;
    surfaceType?: string;
    surfaceKey?: string;
    bindingEnabled?: boolean;
    priority?: number;
    setupTemplate?: string;
    catalogInput?: unknown;
  }
) {
  const mode = args.mode || "preview";
  const appSlug = normalizeOptionalString(args.appSlug) || "segelschule-altwarp";
  const surfaceType = normalizeOptionalString(args.surfaceType) || "booking";
  const surfaceKey = normalizeOptionalString(args.surfaceKey) || "default";
  const catalog = buildSeatBookingCatalog({
    setupTemplate: args.setupTemplate,
    catalogInput: args.catalogInput,
  });
  const legacyBindings = buildLegacyBindingsFromCatalog(catalog);
  const payload = {
    organizationId,
    userId,
    appSlug,
    surfaceType,
    surfaceKey,
    enabled: args.bindingEnabled !== false,
    priority: Math.round(args.priority || 100),
    runtimeConfig: catalog,
    legacyBindings,
  };

  if (mode === "preview") {
    return {
      success: true,
      action: "upsert_booking_surface_binding",
      mode: "preview",
      data: {
        payload,
        bookingCatalogJson: JSON.stringify(catalog, null, 2),
        legacyBindingsJson: JSON.stringify(legacyBindings, null, 2),
      },
      message:
        `Ready to ${surfaceType}/${surfaceKey} upsert surface binding for app "${appSlug}".`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runMutation(
    generatedApi.internal.frontendSurfaceBindings.upsertBookingSurfaceBindingInternal,
    payload
  );

  return {
    success: true,
    action: "upsert_booking_surface_binding",
    mode: "execute",
    data: result,
    message:
      `Surface binding saved for ${appSlug}:${surfaceType}:${surfaceKey}.`,
  };
}

async function bootstrapBookingSurface(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    appSlug?: string;
    surfaceType?: string;
    surfaceKey?: string;
    bindingEnabled?: boolean;
    priority?: number;
    setupTemplate?: string;
    catalogInput?: unknown;
    bootstrapInput?: unknown;
  }
) {
  const mode = normalizeOptionalString(args.mode) || "interview";
  const appSlug = normalizeOptionalString(args.appSlug) || "my-app";
  const surfaceType = normalizeOptionalString(args.surfaceType) || "booking";
  const surfaceKey = normalizeOptionalString(args.surfaceKey) || "default";
  const bootstrapConfig = normalizeRecord(args.bootstrapInput) || {};
  const catalogInput =
    typeof bootstrapConfig.catalogInput !== "undefined"
      ? bootstrapConfig.catalogInput
      : args.catalogInput;

  const catalog = buildSeatBookingCatalog({
    setupTemplate: args.setupTemplate,
    catalogInput,
  });

  if (mode !== "execute") {
    const questions = buildBookingBootstrapInterviewQuestions({
      appSlug,
      surfaceType,
      surfaceKey,
      catalog,
    });
    return {
      success: true,
      action: "bootstrap_booking_surface",
      mode: "interview",
      data: {
        appSlug,
        surfaceType,
        surfaceKey,
        questions,
        suggestedCatalog: catalog,
        hints: [
          "Answer questions, then call bootstrap_booking_surface with mode=execute and bootstrapInput.",
          "bootstrapInput.coursePricing supports per-course overrides for price/currency/resource/checkout names.",
          "Set bootstrapInput.checkoutStrategy=shared to use one checkout for all courses.",
          "Use bootstrapInput.reuseExistingCheckouts=true if you explicitly want to reuse already existing checkouts.",
        ],
      },
      message: "Bootstrap interview ready. Provide answers and rerun in execute mode.",
    };
  }

  const checkoutStrategy =
    normalizeOptionalString(bootstrapConfig.checkoutStrategy) === "shared"
      ? "shared"
      : "per_course";
  const pricingConfig = normalizeRecord(bootstrapConfig.pricing) || {};
  const effectivePricingConfig = {
    ...pricingConfig,
    ...bootstrapConfig,
  };
  const publishCheckouts = normalizeBoolean(bootstrapConfig.publishCheckouts) !== false;
  const reuseExistingResources = (() => {
    const explicit = normalizeBoolean(bootstrapConfig.reuseExistingResources);
    if (typeof explicit === "boolean") {
      return explicit;
    }
    const shared = normalizeBoolean(bootstrapConfig.reuseExistingMappings);
    if (typeof shared === "boolean") {
      return shared;
    }
    return true;
  })();
  const reuseExistingCheckouts = (() => {
    const explicit = normalizeBoolean(bootstrapConfig.reuseExistingCheckouts);
    if (typeof explicit === "boolean") {
      return explicit;
    }
    const shared = normalizeBoolean(bootstrapConfig.reuseExistingMappings);
    if (typeof shared === "boolean") {
      return shared;
    }
    return false;
  })();
  const productStatus =
    normalizeOptionalString(bootstrapConfig.productStatus) === "draft"
      ? "draft"
      : "active";
  const paymentMode = (() => {
    const candidate = normalizeOptionalString(bootstrapConfig.paymentMode);
    if (candidate === "b2b" || candidate === "hybrid" || candidate === "b2c") {
      return candidate;
    }
    return "b2c";
  })();
  const currency =
    (normalizeOptionalString(effectivePricingConfig.currency) || "EUR").toUpperCase();
  const resourceSubtype =
    normalizeOptionalString(bootstrapConfig.resourceSubtype) || "class";
  const checkoutNamePrefix =
    normalizeOptionalString(bootstrapConfig.checkoutNamePrefix)
    || `${appSlug} Booking`;
  const resourceNamePrefix =
    normalizeOptionalString(bootstrapConfig.resourceNamePrefix) || "";
  const courseOverrides = normalizeBootstrapCourseOverrides(
    bootstrapConfig.coursePricing || pricingConfig.coursePricing
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productsRaw, checkoutsRaw] = await Promise.all([
    (ctx as any).runQuery(
      generatedApi.internal.ai.tools.internalToolMutations.internalListProducts,
      {
        organizationId,
        limit: 250,
      }
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx as any).runQuery(
      generatedApi.internal.ai.tools.internalToolMutations.internalListCheckouts,
      {
        organizationId,
        limit: 250,
      }
    ),
  ]);

  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const checkouts = Array.isArray(checkoutsRaw) ? checkoutsRaw : [];

  const productEntities: CatalogEntity[] = products.map((product) => ({
    _id: String(product._id),
    name: normalizeOptionalString(product.name),
  }));
  const checkoutEntities: CatalogEntity[] = checkouts.map((checkout) => ({
    _id: String(checkout._id),
    name: normalizeOptionalString(checkout.name),
    publicSlug: normalizeOptionalString(checkout.publicSlug),
  }));

  const checkoutEntityById = new Map(
    checkoutEntities.map((checkout) => [checkout._id, checkout])
  );
  const totalCapacity = Math.max(
    1,
    catalog.inventoryGroups.reduce((sum, group) => sum + group.capacity, 0)
  );
  const createdResources: Array<{
    courseId: string;
    bookingResourceId: string;
    name: string;
    reused: boolean;
    priceCents?: number;
    currency?: string;
  }> = [];
  const createdCheckouts: Array<{
    courseId: string;
    checkoutProductId: string;
    checkoutPublicUrl: string | null;
    name: string;
    reused: boolean;
    published: boolean;
  }> = [];
  const updatedCourses = catalog.courses.map((course) => ({ ...course }));

  for (const course of updatedCourses) {
    const override = courseOverrides.get(course.courseId);
    const overrideResourceId = normalizeOptionalString(override?.bookingResourceId);
    if (overrideResourceId) {
      course.bookingResourceId = overrideResourceId;
    }

    if (!course.bookingResourceId && reuseExistingResources) {
      const resourceCandidate = findCandidatesByKeywords(
        productEntities,
        resolveCourseKeywords(course)
      )[0];
      if (resourceCandidate) {
        course.bookingResourceId = resourceCandidate.id;
        createdResources.push({
          courseId: course.courseId,
          bookingResourceId: resourceCandidate.id,
          name: resourceCandidate.name,
          reused: true,
        });
      }
    }

    if (!course.bookingResourceId) {
      const priceCents = resolveCoursePriceCents({
        bootstrapConfig: effectivePricingConfig,
        courseOverride: override,
      });
      const resourceName =
        normalizeOptionalString(override?.resourceName)
        || `${resourceNamePrefix ? `${resourceNamePrefix} ` : ""}${course.displayName || course.courseId} Resource`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdId = await (ctx as any).runMutation(
        generatedApi.internal.ai.tools.internalToolMutations.internalCreateProductWithDetails,
        {
          organizationId,
          userId,
          subtype: resourceSubtype,
          name: resourceName,
          description: `Auto-created booking resource for ${course.displayName || course.courseId}.`,
          price: priceCents,
          currency,
          status: productStatus,
          bookingSettings: {
            minDuration: course.bookingDurationMinutes,
            maxDuration: course.bookingDurationMinutes,
            durationUnit: "minutes",
            slotIncrement: course.isMultiDay ? 60 : 30,
            capacity: totalCapacity,
            confirmationRequired: false,
            priceUnit: course.isMultiDay ? "day" : "session",
          },
        }
      );
      const bookingResourceId = String(createdId);
      course.bookingResourceId = bookingResourceId;
      productEntities.push({
        _id: bookingResourceId,
        name: resourceName,
      });
      createdResources.push({
        courseId: course.courseId,
        bookingResourceId,
        name: resourceName,
        reused: false,
        priceCents,
        currency,
      });
    }
  }

  const createCheckoutForCourses = async (args: {
    checkoutName: string;
    courseIds: string[];
    productIds: string[];
  }): Promise<{ checkoutProductId: string; checkoutPublicUrl: string | null }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdResult = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateCheckoutPageWithDetails,
      {
        organizationId,
        userId,
        name: args.checkoutName,
        description: `Auto-created checkout for ${args.courseIds.join(", ")}`,
        productIds: args.productIds.map((id) => id as Id<"objects">),
        paymentMode,
        settings: {
          currency,
        },
      }
    );
    const createdRecord = normalizeRecord(createdResult) || {};
    const checkoutProductId = String(createdRecord.checkoutId || "");
    const createdSlug = normalizeOptionalString(createdRecord.publicSlug);
    if (!checkoutProductId) {
      throw new Error("Failed to create checkout instance");
    }

    let checkoutPublicUrl = buildCheckoutPublicUrlFromSlug(createdSlug) || null;
    if (publishCheckouts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const publishResult = await (ctx as any).runMutation(
        generatedApi.internal.ai.tools.internalToolMutations.internalPublishCheckout,
        {
          organizationId,
          userId,
          checkoutId: checkoutProductId as Id<"objects">,
        }
      );
      const publishRecord = normalizeRecord(publishResult) || {};
      checkoutPublicUrl =
        normalizeOptionalString(publishRecord.publicUrl) || checkoutPublicUrl;
    }

    checkoutEntities.push({
      _id: checkoutProductId,
      name: args.checkoutName,
      publicSlug: createdSlug,
    });
    checkoutEntityById.set(checkoutProductId, {
      _id: checkoutProductId,
      name: args.checkoutName,
      publicSlug: createdSlug,
    });

    return {
      checkoutProductId,
      checkoutPublicUrl,
    };
  };

  if (checkoutStrategy === "shared") {
    const sharedCourseIds = updatedCourses.map((course) => course.courseId);
    const sharedProductIds = Array.from(
      new Set(
        updatedCourses
          .map((course) => normalizeOptionalString(course.bookingResourceId))
          .filter((id): id is string => Boolean(id))
      )
    );
    let sharedCheckoutProductId: string | undefined;
    let sharedCheckoutPublicUrl: string | null = null;

    if (reuseExistingCheckouts) {
      const sharedCandidate = findCandidatesByKeywords(
        checkoutEntities,
        [appSlug, surfaceType, "booking", "checkout"]
      )[0];
      if (sharedCandidate) {
        sharedCheckoutProductId = sharedCandidate.id;
        sharedCheckoutPublicUrl =
          buildCheckoutPublicUrlFromSlug(
            checkoutEntityById.get(sharedCandidate.id)?.publicSlug
          ) || null;
      }
    }

    if (!sharedCheckoutProductId && sharedProductIds.length > 0) {
      const createdShared = await createCheckoutForCourses({
        checkoutName: `${checkoutNamePrefix} Checkout`,
        courseIds: sharedCourseIds,
        productIds: sharedProductIds,
      });
      sharedCheckoutProductId = createdShared.checkoutProductId;
      sharedCheckoutPublicUrl = createdShared.checkoutPublicUrl;
    }

    if (sharedCheckoutProductId) {
      for (const course of updatedCourses) {
        const override = courseOverrides.get(course.courseId);
        const overrideCheckoutId = normalizeOptionalString(
          override?.checkoutProductId
        );
        const overrideCheckoutUrl = normalizeOptionalString(
          override?.checkoutPublicUrl
        );
        course.checkoutProductId = overrideCheckoutId || sharedCheckoutProductId;
        if (overrideCheckoutUrl) {
          course.checkoutPublicUrl = overrideCheckoutUrl;
        } else if (!course.checkoutPublicUrl && sharedCheckoutPublicUrl) {
          course.checkoutPublicUrl = sharedCheckoutPublicUrl;
        }
        createdCheckouts.push({
          courseId: course.courseId,
          checkoutProductId: course.checkoutProductId,
          checkoutPublicUrl: course.checkoutPublicUrl || null,
          name: `${checkoutNamePrefix} Checkout`,
          reused: Boolean(overrideCheckoutId || reuseExistingCheckouts),
          published: publishCheckouts,
        });
      }
    }
  } else {
    for (const course of updatedCourses) {
      const override = courseOverrides.get(course.courseId);
      const overrideCheckoutId = normalizeOptionalString(override?.checkoutProductId);
      const overrideCheckoutUrl = normalizeOptionalString(override?.checkoutPublicUrl);
      if (overrideCheckoutId) {
        course.checkoutProductId = overrideCheckoutId;
      }

      if (!course.checkoutPublicUrl && course.checkoutProductId) {
        const existing = checkoutEntityById.get(course.checkoutProductId);
        course.checkoutPublicUrl = buildCheckoutPublicUrlFromSlug(
          existing?.publicSlug
        );
      }
      if (overrideCheckoutUrl) {
        course.checkoutPublicUrl = overrideCheckoutUrl;
      }

      if (!course.checkoutProductId && reuseExistingCheckouts) {
        const checkoutCandidate = findCandidatesByKeywords(
          checkoutEntities,
          resolveCourseKeywords(course)
        )[0];
        if (checkoutCandidate) {
          course.checkoutProductId = checkoutCandidate.id;
          const existing = checkoutEntityById.get(checkoutCandidate.id);
          if (!course.checkoutPublicUrl) {
            course.checkoutPublicUrl = buildCheckoutPublicUrlFromSlug(
              existing?.publicSlug
            );
          }
          createdCheckouts.push({
            courseId: course.courseId,
            checkoutProductId: checkoutCandidate.id,
            checkoutPublicUrl: course.checkoutPublicUrl || null,
            name: checkoutCandidate.name,
            reused: true,
            published: false,
          });
        }
      }

      if (!course.checkoutProductId && course.bookingResourceId) {
        const checkoutName =
          normalizeOptionalString(override?.checkoutName)
          || `${checkoutNamePrefix} ${course.displayName || course.courseId} Checkout`;
        const createdCheckout = await createCheckoutForCourses({
          checkoutName,
          courseIds: [course.courseId],
          productIds: [course.bookingResourceId],
        });
        course.checkoutProductId = createdCheckout.checkoutProductId;
        if (!course.checkoutPublicUrl && createdCheckout.checkoutPublicUrl) {
          course.checkoutPublicUrl = createdCheckout.checkoutPublicUrl;
        }
        createdCheckouts.push({
          courseId: course.courseId,
          checkoutProductId: course.checkoutProductId,
          checkoutPublicUrl: course.checkoutPublicUrl || null,
          name: checkoutName,
          reused: false,
          published: publishCheckouts,
        });
      }
    }
  }

  const updatedCatalog: SeatBookingCatalog = {
    ...catalog,
    courses: updatedCourses,
  };
  const diagnostics = buildCourseSetupDiagnostics({
    catalog: updatedCatalog,
    productEntities,
    checkoutEntities,
  });
  const warnings = diagnostics
    .filter((course) => course.warnings.length > 0)
    .map((course) => `${course.courseId}: ${course.warnings.join(", ")}`);
  const legacyBindings = buildLegacyBindingsFromCatalog(updatedCatalog);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binding = await (ctx as any).runMutation(
    generatedApi.internal.frontendSurfaceBindings.upsertBookingSurfaceBindingInternal,
    {
      organizationId,
      userId,
      appSlug,
      surfaceType,
      surfaceKey,
      enabled: args.bindingEnabled !== false,
      priority: Math.round(args.priority || 100),
      runtimeConfig: updatedCatalog,
      legacyBindings,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindings = await (ctx as any).runQuery(
    generatedApi.internal.frontendSurfaceBindings.listBookingSurfaceBindingsInternal,
    {
      organizationId,
      appSlug,
      surfaceType,
    }
  );

  const pass = warnings.length === 0;

  return {
    success: true,
    action: "bootstrap_booking_surface",
    mode: "execute",
    data: {
      pass,
      appSlug,
      surfaceType,
      surfaceKey,
      catalog: updatedCatalog,
      bookingCatalogJson: JSON.stringify(updatedCatalog, null, 2),
      legacyBindings,
      legacyBindingsJson: JSON.stringify(legacyBindings, null, 2),
      diagnostics,
      warnings,
      createdResources,
      createdCheckouts,
      binding,
      bindings,
      totalBindings: Array.isArray(bindings) ? bindings.length : 0,
    },
    message: pass
      ? `Bootstrap completed: ${appSlug}:${surfaceType}:${surfaceKey} is fully mapped.`
      : `Bootstrap completed with ${warnings.length} unresolved mapping warning(s).`,
  };
}

async function listBookingSurfaceBindingsAction(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: {
    appSlug?: string;
    surfaceType?: string;
  }
) {
  const appSlug = normalizeOptionalString(args.appSlug) || undefined;
  const surfaceType = normalizeOptionalString(args.surfaceType) || undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindings = await (ctx as any).runQuery(
    generatedApi.internal.frontendSurfaceBindings.listBookingSurfaceBindingsInternal,
    {
      organizationId,
      appSlug,
      surfaceType,
    }
  );

  return {
    success: true,
    action: "list_booking_surface_bindings",
    data: {
      bindings,
      total: Array.isArray(bindings) ? bindings.length : 0,
    },
    message:
      `Found ${Array.isArray(bindings) ? bindings.length : 0} booking surface binding(s).`,
  };
}

export const __testables = {
  buildDefaultSeatBookingCatalog,
  buildSeatBookingCatalog,
  buildLegacyBindingsFromCatalog,
  buildCourseSetupDiagnostics,
  buildBookingBootstrapInterviewQuestions,
  resolveCoursePriceCents,
};
