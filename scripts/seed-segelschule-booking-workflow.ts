#!/usr/bin/env npx tsx

import path from "node:path";
import { config as loadEnv } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../convex/_generated/dataModel";
import {
  buildAvailabilityStructureDrivenConfig,
  type AvailabilityStructureKey,
} from "../convex/lib/availabilityStructures";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { internal } = require("../convex/_generated/api") as { internal: any };

const DEFAULT_TIMEZONE = "Europe/Berlin";
const DEFAULT_AVAILABLE_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
];

const DEFAULT_INVENTORY_GROUPS = [
  { id: "fraukje", label: "Fraukje", capacity: 4 },
  { id: "rose", label: "Rose", capacity: 4 },
];

const SEGELSCHULE_APP_SLUG = "segelschule-altwarp";
const SEGELSCHULE_SURFACE_TYPE = "booking";
const SEGELSCHULE_SURFACE_KEY = "default";
const SEGELSCHULE_SEED_VERSION = "segelschule_booking_seed_v2";
const SEGELSCHULE_DEFAULT_DOMAIN_NAME = "segelschule-altwarp.test.l4yercak3.com";
const SEGELSCHULE_DEFAULT_EMAIL_DOMAIN = "mail.l4yercak3.com";
const SEGELSCHULE_DEFAULT_BRANDING = {
  primaryColor: "#0F766E",
  secondaryColor: "#D4A373",
  accentColor: "#F8FAFC",
  fontFamily: "system-ui, sans-serif",
};
const SEGELSCHULE_DEFAULT_CONTACT_EMAIL = "info@segelschule-altwarp.de";
const SEGELSCHULE_DEFAULT_PHONE = "+49 (0) 39778 123456";
const SEGELSCHULE_DEFAULT_ADDRESS = {
  addressLine1: "Am Hafen 12",
  line1: "Am Hafen 12",
  street: "Am Hafen 12",
  city: "Altwarp",
  state: "Mecklenburg-Vorpommern",
  postalCode: "17375",
  country: "Germany",
  region: "Europe",
};
const SEGELSCHULE_DEFAULT_LOCATION_NAME = "Segelschule Altwarp Hafen";

type OAuthConnectionSyncSettings = {
  email: boolean;
  calendar: boolean;
  oneDrive: boolean;
  sharePoint: boolean;
};

interface CourseTemplate {
  courseId: string;
  displayName: string;
  bookingDurationMinutes: number;
  availableTimes: string[];
  isMultiDay: boolean;
  availabilitySeedProfile: RecurringAvailabilitySeedProfile;
}

interface RecurringAvailabilityWindowTemplate {
  daysOfWeek: number[];
  startTimes: string[];
  durationMinutes: number;
}

interface RecurringAvailabilitySeedProfile {
  profileId: string;
  availabilityStructure: AvailabilityStructureKey;
  timezone: string;
  windows: RecurringAvailabilityWindowTemplate[];
}

interface OrgObjectRecord {
  _id: Id<"objects">;
  name?: string;
  subtype?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
}

interface ObjectLinkRecord {
  _id: Id<"objectLinks">;
  fromObjectId: Id<"objects">;
  toObjectId: Id<"objects">;
  linkType: string;
  properties?: Record<string, unknown>;
}

interface OrganizationRecord {
  _id: Id<"organizations">;
  name?: string;
  slug?: string;
}

interface OAuthConnectionRecord {
  id: Id<"oauthConnections">;
  provider: string;
  providerAccountId?: string;
  providerEmail: string;
  connectionType: string;
  scopes: string[];
  syncSettings: OAuthConnectionSyncSettings;
  status: string;
  lastSyncAt?: number | null;
  lastSyncError?: string | null;
  connectedAt?: number;
  updatedAt?: number;
  tokenExpiresAt?: number;
  userId?: Id<"users"> | null;
  customProperties?: Record<string, unknown>;
}

interface CourseResourceResult {
  resourceByCourseId: Record<string, Id<"objects">>;
  createdCourseIds: string[];
}

interface SettingsSeedResult {
  objectId: Id<"objects">;
  created: boolean;
  subtype: string;
  customProperties: Record<string, unknown>;
}

interface ContactSeedResult {
  objectId: Id<"objects">;
  created: boolean;
  customProperties: Record<string, unknown>;
}

interface AddressSeedResult {
  objectId: Id<"objects">;
  created: boolean;
  subtype: string;
  customProperties: Record<string, unknown>;
}

interface DomainConfigSeedResult {
  objectId: Id<"objects">;
  created: boolean;
  customProperties: Record<string, unknown>;
}

interface BookingLocationSeedResult {
  objectId: Id<"objects">;
  created: boolean;
  source: string;
  adoptedExisting: boolean;
  linkedResourceIds: string[];
  skippedResourceIds: string[];
  customProperties: Record<string, unknown>;
}

interface ResourceAvailabilitySeedResult {
  resourceId: Id<"objects">;
  availabilityStructure: AvailabilityStructureKey;
  profileId: string;
  timezone: string;
  scheduleIds: Id<"objects">[];
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
}

interface SegelschuleAvailabilitySeedResult {
  seededResourceIds: string[];
  seededProfiles: Array<{
    courseId: string;
    resourceId: string;
    availabilityStructure: AvailabilityStructureKey;
    profileId: string;
    scheduleCount: number;
    timezone: string;
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>;
  }>;
}

interface LayerWorkflowSeedResult {
  objectId: Id<"objects">;
  created: boolean;
  workflowKey: string;
  name: string;
  status: string;
}

interface GoogleCalendarSeedResult {
  configured: boolean;
  source: string | null;
  connection: OAuthConnectionRecord | null;
  candidates: Array<{
    id: string;
    email: string;
    connectionType: string;
    status: string;
    calendarSyncEnabled: boolean;
  }>;
  syncEnabled?: boolean;
  subCalendarCount?: number;
  dedicatedBookingsCalendarId?: string | null;
  blockingCalendarIds?: string[];
  pushCalendarId?: string | null;
  resourceLinks?: Array<{
    courseId: string;
    resourceId: string;
    linkId: string;
    created: boolean;
    blockingCalendarIds: string[];
    pushCalendarId: string | null;
  }>;
  orgDefaultLink?: {
    resourceId: string;
    linkId: string;
    created: boolean;
    blockingCalendarIds: string[];
    pushCalendarId: string | null;
  } | null;
  syncResult?: Record<string, unknown> | null;
  skippedReason?: string | null;
}

const COURSE_TEMPLATES: CourseTemplate[] = [
  {
    courseId: "schnupper",
    displayName: "Schnupperkurs",
    bookingDurationMinutes: 180,
    availableTimes: ["09:00", "13:00"],
    isMultiDay: false,
    availabilitySeedProfile: {
      profileId: "segelschule_taster_sessions",
      availabilityStructure: "course_session",
      timezone: DEFAULT_TIMEZONE,
      windows: [
        {
          daysOfWeek: [3, 6],
          startTimes: ["09:00", "13:00"],
          durationMinutes: 180,
        },
      ],
    },
  },
  {
    courseId: "grund",
    displayName: "Grundkurs",
    bookingDurationMinutes: 480,
    availableTimes: ["09:00"],
    isMultiDay: true,
    availabilitySeedProfile: {
      profileId: "segelschule_foundation_weekday_sessions",
      availabilityStructure: "course_session",
      timezone: DEFAULT_TIMEZONE,
      windows: [
        {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTimes: ["09:00"],
          durationMinutes: 480,
        },
      ],
    },
  },
  {
    courseId: "intensiv",
    displayName: "Intensivkurs",
    bookingDurationMinutes: 480,
    availableTimes: ["09:00"],
    isMultiDay: true,
    availabilitySeedProfile: {
      profileId: "segelschule_intensive_weekend_sessions",
      availabilityStructure: "course_session",
      timezone: DEFAULT_TIMEZONE,
      windows: [
        {
          daysOfWeek: [5, 6, 0],
          startTimes: ["09:00"],
          durationMinutes: 480,
        },
      ],
    },
  },
];

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getCommaSeparatedArg(flag: string): string[] {
  const raw = getArg(flag);
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => Boolean(value));
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function required(value: string | undefined, message: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
}

function normalizePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

function parseTimeToMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time value: ${time}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildWeeklyScheduleEntries(
  profile: RecurringAvailabilitySeedProfile
): Array<{
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}> {
  const schedules = [];

  for (const window of profile.windows) {
    for (const dayOfWeek of window.daysOfWeek) {
      for (const startTime of window.startTimes) {
        schedules.push({
          dayOfWeek,
          startTime,
          endTime: formatMinutesAsTime(
            parseTimeToMinutes(startTime) + window.durationMinutes
          ),
          isAvailable: true,
        });
      }
    }
  }

  schedules.sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }
    return left.startTime.localeCompare(right.startTime);
  });

  return schedules;
}

function unique(values: Array<string | null | undefined>): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    output.push(normalized);
    seen.add(normalized);
  }
  return output;
}

function asObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function lower(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function normalizeGoogleCalendarId(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized || null;
}

function getStoredSubCalendars(connection: OAuthConnectionRecord | null): Array<Record<string, unknown>> {
  const cp = asObjectRecord(connection?.customProperties);
  return Array.isArray(cp.subCalendars)
    ? (cp.subCalendars as Array<Record<string, unknown>>)
    : [];
}

function getPrimaryCalendarId(connection: OAuthConnectionRecord | null): string | null {
  const subCalendars = getStoredSubCalendars(connection);
  const primary = subCalendars.find((calendar) => calendar.primary === true);
  return normalizeGoogleCalendarId(primary?.calendarId) || null;
}

function normalizeConnectionSummary(connection: OAuthConnectionRecord) {
  return {
    id: String(connection.id),
    email: connection.providerEmail,
    connectionType: connection.connectionType,
    status: connection.status,
    calendarSyncEnabled: connection.syncSettings?.calendar === true,
  };
}

function isInvoiceProvider(record: OrgObjectRecord): boolean {
  return record.customProperties?.providerCode === "invoice";
}

function isStripeProvider(record: OrgObjectRecord): boolean {
  return record.customProperties?.providerCode === "stripe-connect";
}

function getCourseResourceCandidate(
  products: OrgObjectRecord[],
  courseId: string
): OrgObjectRecord | null {
  const bySeedCourseId = products.find((product) => {
    if (product.subtype !== "class") {
      return false;
    }
    const props = asObjectRecord(product.customProperties);
    return props.segelschuleCourseId === courseId;
  });
  if (bySeedCourseId) {
    return bySeedCourseId;
  }

  const byLegacyId = products.find((product) => {
    if (!["class", "appointment"].includes(String(product.subtype || ""))) {
      return false;
    }
    const props = asObjectRecord(product.customProperties);
    return props.courseId === courseId;
  });
  if (byLegacyId) {
    return byLegacyId;
  }

  return null;
}

function createResourceCustomProperties(course: CourseTemplate): Record<string, unknown> {
  const structureDrivenConfig = buildAvailabilityStructureDrivenConfig(
    course.availabilitySeedProfile.availabilityStructure,
    {
      minDuration: course.bookingDurationMinutes,
      maxDuration: course.bookingDurationMinutes,
      durationUnit: "minutes",
      capacity: 8,
      pricePerUnit: 0,
      priceUnit: "seat",
      confirmationRequired: false,
    }
  );

  return {
    source: SEGELSCHULE_SEED_VERSION,
    segelschuleCourseId: course.courseId,
    bookingSurface: SEGELSCHULE_APP_SLUG,
    bookingType: "class_enrollment",
    availabilityStructure: structureDrivenConfig.availabilityStructure,
    availabilityModel: structureDrivenConfig.availabilityModel,
    availabilityContextKey: structureDrivenConfig.availabilityContextKey,
    inventoryMode: structureDrivenConfig.inventoryMode,
    requiresBookingAddress: structureDrivenConfig.requiresBookingAddress,
    locationBehavior: structureDrivenConfig.locationBehavior,
    resourceTopologyProfile: structureDrivenConfig.resourceTopologyProfile,
    capacity: structureDrivenConfig.capacity,
    pricePerUnit: structureDrivenConfig.pricePerUnit,
    priceUnit: structureDrivenConfig.priceUnit,
    bookableConfig: {
      ...structureDrivenConfig,
      bookingType: "class_enrollment",
    },
    seatInventory: {
      groups: DEFAULT_INVENTORY_GROUPS.map((group) => ({
        groupId: group.id,
        label: group.label,
        capacity: group.capacity,
      })),
      strictSeatSelection: true,
    },
  };
}

async function listOrgObjectsByType(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  type: string
): Promise<OrgObjectRecord[]> {
  return (await client.query(
    internal.channels.router.listObjectsByOrgTypeInternal,
    { organizationId, type }
  )) as OrgObjectRecord[];
}

async function listLinksToObject(
  client: ConvexHttpClient,
  toObjectId: Id<"objects">,
  linkType?: string
): Promise<ObjectLinkRecord[]> {
  return (await client.query(internal.objectLinksInternal.getLinksToObject, {
    toObjectId,
    ...(linkType ? { linkType } : {}),
  })) as ObjectLinkRecord[];
}

async function listLinksFromObject(
  client: ConvexHttpClient,
  fromObjectId: Id<"objects">,
  linkType?: string
): Promise<ObjectLinkRecord[]> {
  return (await client.query(internal.objectLinksInternal.getLinksFromObject, {
    fromObjectId,
    ...(linkType ? { linkType } : {}),
  })) as ObjectLinkRecord[];
}

async function insertObject(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    type: string;
    subtype?: string;
    name: string;
    status: string;
    customProperties?: Record<string, unknown>;
  }
): Promise<Id<"objects">> {
  const now = Date.now();
  return (await client.mutation(
    internal.channels.router.insertObjectInternal,
    {
      organizationId: args.organizationId,
      type: args.type,
      subtype: args.subtype,
      name: args.name,
      status: args.status,
      customProperties: args.customProperties,
      createdAt: now,
      updatedAt: now,
    }
  )) as Id<"objects">;
}

async function insertObjectLink(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    fromObjectId: Id<"objects">;
    toObjectId: Id<"objects">;
    linkType: string;
    properties?: Record<string, unknown>;
  }
): Promise<Id<"objectLinks">> {
  return (await client.mutation(
    internal.channels.router.insertObjectLinkInternal,
    {
      organizationId: args.organizationId,
      fromObjectId: args.fromObjectId,
      toObjectId: args.toObjectId,
      linkType: args.linkType,
      properties: args.properties,
      createdAt: Date.now(),
    }
  )) as Id<"objectLinks">;
}

async function patchObject(
  client: ConvexHttpClient,
  args: {
    objectId: Id<"objects">;
    status?: string;
    customProperties?: Record<string, unknown>;
  }
): Promise<void> {
  await client.mutation(internal.channels.router.patchObjectInternal, {
    objectId: args.objectId,
    ...(args.status ? { status: args.status } : {}),
    ...(args.customProperties ? { customProperties: args.customProperties } : {}),
    updatedAt: Date.now(),
  });
}

async function getObjectById(
  client: ConvexHttpClient,
  objectId: Id<"objects">
): Promise<OrgObjectRecord | null> {
  return (await client.query(internal.objectsInternal.getObjectInternal, {
    objectId,
  })) as OrgObjectRecord | null;
}

async function getOrganizationByIdSafe(
  client: ConvexHttpClient,
  organizationId: string
): Promise<OrganizationRecord | null> {
  try {
    const org = (await client.query(internal.organizations.getOrgById, {
      organizationId: organizationId as Id<"organizations">,
    })) as OrganizationRecord | null;
    return org || null;
  } catch {
    return null;
  }
}

async function getOrganizationBySlugSafe(
  client: ConvexHttpClient,
  slug: string
): Promise<OrganizationRecord | null> {
  try {
    const org = (await client.query(internal.organizations.getOrgBySlug, {
      slug,
    })) as OrganizationRecord | null;
    return org || null;
  } catch {
    return null;
  }
}

async function resolveSeedUserId(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">
): Promise<Id<"users">> {
  const members = (await client.query(
    internal["stripe/platformWebhooks"].getOrganizationMembers,
    { organizationId }
  )) as Array<{
    userId: Id<"users">;
    role?: string;
    isActive?: boolean;
    user?: { _id?: Id<"users"> } | null;
  }>;

  const activeMembers = members.filter(
    (member) => member.userId && member.user && member.isActive !== false
  );
  const preferredMember =
    activeMembers.find((member) => member.role === "owner")
    || activeMembers[0]
    || members.find((member) => member.userId)
    || null;

  if (!preferredMember?.userId) {
    throw new Error("Could not resolve a userId for schedule seeding in this organization.");
  }

  return preferredMember.userId;
}

async function seedWeeklyAvailabilityProfile(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    resourceId: Id<"objects">;
    profile: RecurringAvailabilitySeedProfile;
  }
): Promise<ResourceAvailabilitySeedResult> {
  const schedules = buildWeeklyScheduleEntries(args.profile);
  const structureDrivenConfig = buildAvailabilityStructureDrivenConfig(
    args.profile.availabilityStructure
  );
  const result = (await client.mutation(
    internal.availabilityOntology.setWeeklyScheduleInternal,
    {
      resourceId: args.resourceId,
      organizationId: args.organizationId,
      userId: args.userId,
      schedules,
      timezone: args.profile.timezone,
    }
  )) as { scheduleIds: Id<"objects">[] };

  for (const [index, scheduleId] of result.scheduleIds.entries()) {
    const seededSchedule = schedules[index];
    if (!seededSchedule) {
      continue;
    }

    await patchObject(client, {
      objectId: scheduleId,
      customProperties: {
        resourceId: args.resourceId,
        dayOfWeek: seededSchedule.dayOfWeek,
        startTime: seededSchedule.startTime,
        endTime: seededSchedule.endTime,
        isAvailable: seededSchedule.isAvailable,
        timezone: args.profile.timezone,
        source: SEGELSCHULE_SEED_VERSION,
        availabilityStructure: args.profile.availabilityStructure,
        inventoryMode: structureDrivenConfig.inventoryMode,
        resourceTopologyProfile: structureDrivenConfig.resourceTopologyProfile,
        seedProfileId: args.profile.profileId,
      },
    });
  }

  const availabilitySnapshot = (await client.query(
    internal.availabilityOntology.getResourceAvailabilityInternal,
    {
      resourceId: args.resourceId,
      organizationId: args.organizationId,
    }
  )) as {
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>;
  };

  return {
    resourceId: args.resourceId,
    availabilityStructure: args.profile.availabilityStructure,
    profileId: args.profile.profileId,
    timezone: args.profile.timezone,
    scheduleIds: result.scheduleIds,
    schedules: availabilitySnapshot.schedules,
  };
}

async function seedSegelschuleCourseAvailabilities(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    resourceByCourseId: Record<string, Id<"objects">>;
  }
): Promise<SegelschuleAvailabilitySeedResult> {
  const seededProfiles: SegelschuleAvailabilitySeedResult["seededProfiles"] = [];

  for (const course of COURSE_TEMPLATES) {
    const resourceId = args.resourceByCourseId[course.courseId];
    if (!resourceId) {
      continue;
    }

    const resource = await getObjectById(client, resourceId);
    if (!resource || resource.status === "archived") {
      continue;
    }

    const availabilityResult = await seedWeeklyAvailabilityProfile(client, {
      organizationId: args.organizationId,
      userId: args.userId,
      resourceId,
      profile: course.availabilitySeedProfile,
    });

    seededProfiles.push({
      courseId: course.courseId,
      resourceId: String(resourceId),
      availabilityStructure: availabilityResult.availabilityStructure,
      profileId: availabilityResult.profileId,
      scheduleCount: availabilityResult.scheduleIds.length,
      timezone: availabilityResult.timezone,
      schedules: availabilityResult.schedules,
    });
  }

  return {
    seededResourceIds: seededProfiles.map((profile) => profile.resourceId),
    seededProfiles,
  };
}

async function getOAuthConnection(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  connectionId: Id<"oauthConnections">
): Promise<OAuthConnectionRecord | null> {
  const connection = (await client.query(
    internal["api/v1/oauthConnectionsInternal"].getOAuthConnectionInternal,
    { organizationId, connectionId }
  )) as OAuthConnectionRecord | null;
  return connection || null;
}

async function listOAuthConnectionsByProvider(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  provider: string
): Promise<OAuthConnectionRecord[]> {
  return (await client.query(
    internal["api/v1/oauthConnectionsInternal"].getOAuthConnectionsByProviderInternal,
    { organizationId, provider }
  )) as OAuthConnectionRecord[];
}

async function updateOAuthConnectionSyncSettings(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  connectionId: Id<"oauthConnections">,
  syncSettings: OAuthConnectionSyncSettings
): Promise<void> {
  await client.mutation(
    internal["api/v1/oauthConnectionsInternal"].updateOAuthConnectionSyncSettingsInternal,
    {
      organizationId,
      connectionId,
      syncSettings,
    }
  );
}

async function refreshGoogleSubCalendars(
  client: ConvexHttpClient,
  connectionId: Id<"oauthConnections">
): Promise<Record<string, unknown>> {
  return (await client.action(
    internal.calendarSyncSubcalendars.fetchAndStoreSubCalendars,
    { connectionId }
  )) as Record<string, unknown>;
}

async function ensureGoogleBookingsCalendar(
  client: ConvexHttpClient,
  connectionId: Id<"oauthConnections">
): Promise<Record<string, unknown>> {
  return (await client.action(
    internal.calendarSyncSubcalendars.ensureBookingsCalendar,
    { connectionId }
  )) as Record<string, unknown>;
}

async function ensureOrgDefaultCalendarSettingsObject(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">
): Promise<Id<"objects">> {
  const calendarSettings = await listOrgObjectsByType(
    client,
    organizationId,
    "calendar_settings"
  );
  const existing =
    calendarSettings.find((record) => record.subtype === "org_default")
    || calendarSettings[0]
    || null;

  if (existing) {
    if (existing.status !== "active") {
      await patchObject(client, {
        objectId: existing._id,
        status: "active",
        customProperties: asObjectRecord(existing.customProperties),
      });
    }
    return existing._id;
  }

  return await insertObject(client, {
    organizationId,
    type: "calendar_settings",
    subtype: "org_default",
    name: "Calendar Settings",
    status: "active",
  });
}

async function syncGoogleConnection(
  client: ConvexHttpClient,
  connectionId: Id<"oauthConnections">
): Promise<Record<string, unknown>> {
  return (await client.action(internal.calendarSyncOntology.syncFromGoogle, {
    connectionId,
  })) as Record<string, unknown>;
}

async function upsertCalendarLinkSettings(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    connectionId: Id<"oauthConnections">;
    resourceId?: Id<"objects">;
    blockingCalendarIds?: string[];
    pushCalendarId?: string;
  }
): Promise<{
    success: boolean;
    resourceId: Id<"objects">;
    linkId: Id<"objectLinks">;
    created: boolean;
  }> {
  try {
    return (await client.mutation(
      internal.calendarSyncSubcalendars.upsertCalendarLinkSettingsInternal,
      args
    )) as {
      success: boolean;
      resourceId: Id<"objects">;
      linkId: Id<"objectLinks">;
      created: boolean;
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Could not find public function")) {
      throw error;
    }

    const resourceId =
      args.resourceId
      || (await ensureOrgDefaultCalendarSettingsObject(client, args.organizationId));
    const existing = await getCalendarLinkSnapshot(
      client,
      resourceId,
      args.connectionId
    );
    if (existing) {
      return {
        success: true,
        resourceId,
        linkId: existing.linkId as Id<"objectLinks">,
        created: false,
      };
    }

    const linkId = await insertObjectLink(client, {
      organizationId: args.organizationId,
      fromObjectId: resourceId,
      toObjectId: resourceId,
      linkType: "calendar_linked_to",
      properties: {
        connectionId: args.connectionId,
        blockingCalendarIds: args.blockingCalendarIds || ["primary"],
        pushCalendarId: args.pushCalendarId || null,
      },
    });

    return {
      success: true,
      resourceId,
      linkId,
      created: true,
    };
  }
}

async function inspectSystemTemplateReadiness(client: ConvexHttpClient) {
  const systemOrg = await getOrganizationBySlugSafe(client, "system");
  if (!systemOrg?._id) {
    return {
      available: false,
      reason: "system_organization_missing",
    };
  }

  const systemTemplates = await listOrgObjectsByType(client, systemOrg._id, "template");
  const systemTemplateSets = await listOrgObjectsByType(client, systemOrg._id, "template_set");

  const hasTemplateCode = (codes: string[]) =>
    systemTemplates.some((template) => {
      const props = asObjectRecord(template.customProperties);
      const code = normalizeOptionalString(props.code) || normalizeOptionalString(props.templateCode);
      return !!code && codes.includes(code);
    });

  return {
    available: true,
    systemOrganizationId: String(systemOrg._id),
    counts: {
      templates: systemTemplates.length,
      templateSets: systemTemplateSets.length,
    },
    readiness: {
      systemDefaultTemplateSet: systemTemplateSets.some(
        (set) => asObjectRecord(set.customProperties).isSystemDefault === true
      ),
      ticketPdf: hasTemplateCode(["ticket_professional_v1"]),
      invoicePdf: hasTemplateCode(["invoice_b2b_single_v1", "invoice_b2c_receipt_v1"]),
      confirmationEmail: hasTemplateCode(["event-confirmation-v2", "email_event_confirmation"]),
      invoiceEmail: hasTemplateCode(["invoice-email-v2", "email_invoice_send"]),
      salesNotificationEmail: hasTemplateCode(["email_sales_notification"]),
    },
  };
}

async function resolveOrganization(
  client: ConvexHttpClient,
  args: {
    explicitOrganizationId?: string;
    organizationSlug?: string;
    envCandidates: string[];
  }
): Promise<{ organizationId: Id<"organizations">; organization: OrganizationRecord; source: string }> {
  const allCandidates = unique([
    args.explicitOrganizationId,
    ...args.envCandidates,
  ]);

  for (const candidate of allCandidates) {
    const org = await getOrganizationByIdSafe(client, candidate);
    if (org?._id) {
      return {
        organizationId: org._id,
        organization: org,
        source: `id:${candidate}`,
      };
    }
  }

  const slug = normalizeOptionalString(args.organizationSlug);
  if (slug) {
    const orgBySlug = await getOrganizationBySlugSafe(client, slug);
    if (orgBySlug?._id) {
      return {
        organizationId: orgBySlug._id,
        organization: orgBySlug,
        source: `slug:${slug}`,
      };
    }
  }

  throw new Error(
    [
      "Could not resolve a valid organizations-table ID.",
      `Tried IDs: ${allCandidates.join(", ") || "(none)"}`,
      slug ? `Tried slug: ${slug}` : "No slug provided.",
      "Pass --organization-id <organizations_id> explicitly.",
    ].join(" ")
  );
}

async function ensureInvoiceProvider(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  providers: OrgObjectRecord[]
): Promise<{
  providerId: Id<"objects">;
  created: boolean;
  normalizedStripeProviderIds: string[];
}> {
  let invoiceProvider = providers.find(isInvoiceProvider) || null;
  let created = false;

  if (!invoiceProvider) {
    const createdId = await insertObject(client, {
      organizationId,
      type: "payment_provider_config",
      name: "Invoice (Pay Later)",
      status: "active",
      customProperties: {
        providerCode: "invoice",
        accountId: "invoice-system",
        isDefault: true,
        isTestMode: false,
        supportsB2B: true,
        supportsB2C: true,
        connectedAt: Date.now(),
        source: SEGELSCHULE_SEED_VERSION,
      },
    });
    created = true;
    invoiceProvider = {
      _id: createdId,
      name: "Invoice (Pay Later)",
      status: "active",
      customProperties: {
        providerCode: "invoice",
        isDefault: true,
      },
    };
  } else {
    const invoiceProps = {
      ...asObjectRecord(invoiceProvider.customProperties),
      providerCode: "invoice",
      accountId:
        normalizeOptionalString(invoiceProvider.customProperties?.accountId)
        || "invoice-system",
      isDefault: true,
      supportsB2B: true,
      supportsB2C: true,
      source: SEGELSCHULE_SEED_VERSION,
    };
    await patchObject(client, {
      objectId: invoiceProvider._id,
      status: "active",
      customProperties: invoiceProps,
    });
  }

  const normalizedStripeProviderIds: string[] = [];
  for (const provider of providers.filter(isStripeProvider)) {
    const stripeProps = {
      ...asObjectRecord(provider.customProperties),
      isDefault: false,
      dormantForSegelschuleBooking: true,
      dormantReason: "Invoice-first booking flow for Segelschule checkout completion",
      source: SEGELSCHULE_SEED_VERSION,
    };
    await patchObject(client, {
      objectId: provider._id,
      customProperties: stripeProps,
    });
    normalizedStripeProviderIds.push(String(provider._id));
  }

  return {
    providerId: invoiceProvider._id,
    created,
    normalizedStripeProviderIds,
  };
}

async function ensureTicketProduct(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  products: OrgObjectRecord[]
): Promise<{ productId: Id<"objects">; created: boolean }> {
  const existingSeededTicket = products.find((product) => {
    if (product.subtype !== "ticket") {
      return false;
    }
    return product.customProperties?.segelschuleTicketProduct === true;
  });
  const fallbackTicket =
    existingSeededTicket
    || products.find((product) => product.subtype === "ticket" && product.status === "active")
    || products.find((product) => product.subtype === "ticket");

  if (fallbackTicket) {
    const nextProps = {
      ...asObjectRecord(fallbackTicket.customProperties),
      segelschuleTicketProduct: true,
      source: SEGELSCHULE_SEED_VERSION,
      currency:
        normalizeOptionalString(fallbackTicket.customProperties?.currency)
        || "EUR",
    };
    await patchObject(client, {
      objectId: fallbackTicket._id,
      ...(fallbackTicket.status === "active" ? {} : { status: "active" }),
      customProperties: nextProps,
    });
    return { productId: fallbackTicket._id, created: false };
  }

  const createdId = await insertObject(client, {
    organizationId,
    type: "product",
    subtype: "ticket",
    name: "Segelschule Kurs-Ticket",
    status: "active",
    customProperties: {
      source: SEGELSCHULE_SEED_VERSION,
      segelschuleTicketProduct: true,
      priceInCents: 0,
      currency: "EUR",
      taxBehavior: "inclusive",
      description: "Ticket product for Segelschule booking API fulfillment flow",
    },
  });
  return { productId: createdId, created: true };
}

async function ensureCourseResources(
  client: ConvexHttpClient,
  organizationId: Id<"organizations">,
  products: OrgObjectRecord[]
): Promise<CourseResourceResult> {
  const resourceByCourseId: Record<string, Id<"objects">> = {};
  const createdCourseIds: string[] = [];

  for (const course of COURSE_TEMPLATES) {
    const existing = getCourseResourceCandidate(products, course.courseId);

    if (!existing) {
      const resourceId = await insertObject(client, {
        organizationId,
        type: "product",
        subtype: "class",
        name: `Segelschule ${course.displayName}`,
        status: "active",
        customProperties: createResourceCustomProperties(course),
      });
      resourceByCourseId[course.courseId] = resourceId;
      createdCourseIds.push(course.courseId);
      continue;
    }

    const mergedProps = {
      ...asObjectRecord(existing.customProperties),
      ...createResourceCustomProperties(course),
      source: SEGELSCHULE_SEED_VERSION,
    };
    await patchObject(client, {
      objectId: existing._id,
      ...(existing.status === "active" ? {} : { status: "active" }),
      customProperties: mergedProps,
    });
    resourceByCourseId[course.courseId] = existing._id;
  }

  return {
    resourceByCourseId,
    createdCourseIds,
  };
}

async function ensureSegelschuleOrganizationContact(
  client: ConvexHttpClient,
  args: {
    organization: OrganizationRecord;
    organizationId: Id<"organizations">;
    website: string;
  }
): Promise<ContactSeedResult> {
  const contacts = await listOrgObjectsByType(client, args.organizationId, "organization_contact");
  const existing = contacts[0] || null;
  const existingProps = asObjectRecord(existing?.customProperties);
  const normalizedPrimaryEmail =
    normalizeOptionalString(existingProps.primaryEmail)
    || normalizeOptionalString(existingProps.contactEmail)
    || SEGELSCHULE_DEFAULT_CONTACT_EMAIL;
  const normalizedPhone =
    normalizeOptionalString(existingProps.primaryPhone)
    || normalizeOptionalString(existingProps.contactPhone)
    || SEGELSCHULE_DEFAULT_PHONE;

  const mergedProps = {
    ...existingProps,
    primaryEmail: normalizedPrimaryEmail,
    contactEmail:
      normalizeOptionalString(existingProps.contactEmail)
      || normalizedPrimaryEmail,
    billingEmail:
      normalizeOptionalString(existingProps.billingEmail)
      || normalizedPrimaryEmail,
    supportEmail:
      normalizeOptionalString(existingProps.supportEmail)
      || normalizedPrimaryEmail,
    primaryPhone: normalizedPhone,
    contactPhone:
      normalizeOptionalString(existingProps.contactPhone)
      || normalizedPhone,
    supportPhone:
      normalizeOptionalString(existingProps.supportPhone)
      || normalizedPhone,
    website:
      normalizeOptionalString(existingProps.website)
      || args.website,
    source:
      normalizeOptionalString(existingProps.source)
      || SEGELSCHULE_SEED_VERSION,
  };

  if (existing) {
    await patchObject(client, {
      objectId: existing._id,
      ...(existing.status === "active" ? {} : { status: "active" }),
      customProperties: mergedProps,
    });
    return {
      objectId: existing._id,
      created: false,
      customProperties: mergedProps,
    };
  }

  const slug = normalizeOptionalString(args.organization.slug) || "segelschule-altwarp";
  const objectId = await insertObject(client, {
    organizationId: args.organizationId,
    type: "organization_contact",
    name: `${slug}-contact`,
    status: "active",
    customProperties: mergedProps,
  });

  return {
    objectId,
    created: true,
    customProperties: mergedProps,
  };
}

async function ensureOrganizationAddressObject(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    subtype: string;
    defaultName: string;
    defaults: Record<string, unknown>;
  }
): Promise<AddressSeedResult> {
  const addresses = await listOrgObjectsByType(client, args.organizationId, "address");
  const existing =
    addresses.find((record) => record.subtype === args.subtype)
    || (args.subtype === "physical"
      ? addresses.find(
          (record) => asObjectRecord(record.customProperties).isPrimary === true
        )
      : null)
    || null;

  const existingProps = asObjectRecord(existing?.customProperties);
  const mergedProps = {
    ...args.defaults,
    ...existingProps,
    addressLine1:
      normalizeOptionalString(existingProps.addressLine1)
      || normalizeOptionalString(existingProps.line1)
      || normalizeOptionalString(existingProps.street)
      || SEGELSCHULE_DEFAULT_ADDRESS.addressLine1,
    line1:
      normalizeOptionalString(existingProps.line1)
      || normalizeOptionalString(existingProps.addressLine1)
      || normalizeOptionalString(existingProps.street)
      || SEGELSCHULE_DEFAULT_ADDRESS.line1,
    street:
      normalizeOptionalString(existingProps.street)
      || normalizeOptionalString(existingProps.addressLine1)
      || normalizeOptionalString(existingProps.line1)
      || SEGELSCHULE_DEFAULT_ADDRESS.street,
    city:
      normalizeOptionalString(existingProps.city)
      || SEGELSCHULE_DEFAULT_ADDRESS.city,
    state:
      normalizeOptionalString(existingProps.state)
      || SEGELSCHULE_DEFAULT_ADDRESS.state,
    postalCode:
      normalizeOptionalString(existingProps.postalCode)
      || normalizeOptionalString(existingProps.zip)
      || SEGELSCHULE_DEFAULT_ADDRESS.postalCode,
    country:
      normalizeOptionalString(existingProps.country)
      || SEGELSCHULE_DEFAULT_ADDRESS.country,
    region:
      normalizeOptionalString(existingProps.region)
      || SEGELSCHULE_DEFAULT_ADDRESS.region,
    source:
      normalizeOptionalString(existingProps.source)
      || SEGELSCHULE_SEED_VERSION,
  };

  if (existing) {
    await patchObject(client, {
      objectId: existing._id,
      ...(existing.status === "active" ? {} : { status: "active" }),
      customProperties: mergedProps,
    });
    return {
      objectId: existing._id,
      created: false,
      subtype: args.subtype,
      customProperties: mergedProps,
    };
  }

  const objectId = await insertObject(client, {
    organizationId: args.organizationId,
    type: "address",
    subtype: args.subtype,
    name: args.defaultName,
    status: "active",
    customProperties: mergedProps,
  });

  return {
    objectId,
    created: true,
    subtype: args.subtype,
    customProperties: mergedProps,
  };
}

async function ensureSegelschuleOrganizationAddresses(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
  }
): Promise<AddressSeedResult[]> {
  return await Promise.all([
    ensureOrganizationAddressObject(client, {
      organizationId: args.organizationId,
      subtype: "physical",
      defaultName: "Segelschule Altwarp Hauptadresse",
      defaults: {
        ...SEGELSCHULE_DEFAULT_ADDRESS,
        isDefault: true,
        isPrimary: true,
        label: "Hauptadresse",
      },
    }),
    ensureOrganizationAddressObject(client, {
      organizationId: args.organizationId,
      subtype: "billing",
      defaultName: "Segelschule Altwarp Rechnungsadresse",
      defaults: {
        ...SEGELSCHULE_DEFAULT_ADDRESS,
        isDefault: true,
        isPrimary: false,
        isTaxOrigin: true,
        label: "Rechnungsadresse",
      },
    }),
  ]);
}

function buildLocationAddressFromOrgAddress(
  address: Record<string, unknown>
): Record<string, unknown> {
  return {
    street:
      normalizeOptionalString(address.street)
      || normalizeOptionalString(address.addressLine1)
      || normalizeOptionalString(address.line1)
      || SEGELSCHULE_DEFAULT_ADDRESS.street,
    street2:
      normalizeOptionalString(address.street2)
      || normalizeOptionalString(address.addressLine2)
      || normalizeOptionalString(address.line2)
      || undefined,
    city:
      normalizeOptionalString(address.city)
      || SEGELSCHULE_DEFAULT_ADDRESS.city,
    state:
      normalizeOptionalString(address.state)
      || SEGELSCHULE_DEFAULT_ADDRESS.state,
    postalCode:
      normalizeOptionalString(address.postalCode)
      || SEGELSCHULE_DEFAULT_ADDRESS.postalCode,
    country:
      normalizeOptionalString(address.country)
      || SEGELSCHULE_DEFAULT_ADDRESS.country,
  };
}

async function ensureSegelschuleBookingLocation(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    organization: OrganizationRecord;
    resourceByCourseId: Record<string, Id<"objects">>;
    contact: ContactSeedResult;
    addresses: AddressSeedResult[];
  }
): Promise<BookingLocationSeedResult> {
  const locations = await listOrgObjectsByType(client, args.organizationId, "location");
  const activeLocations = locations.filter((record) => record.status === "active");
  const seededLocation =
    activeLocations.find(
      (record) => asObjectRecord(record.customProperties).source === SEGELSCHULE_SEED_VERSION
    )
    || null;
  const existingLocation = seededLocation || activeLocations[0] || locations[0] || null;

  const physicalAddress =
    args.addresses.find((record) => record.subtype === "physical")
    || args.addresses[0]
    || null;
  const locationAddress = buildLocationAddressFromOrgAddress(
    asObjectRecord(physicalAddress?.customProperties)
  );

  let locationId: Id<"objects">;
  let created = false;
  let source = "existing_location";
  let adoptedExisting = true;
  let locationCustomProperties: Record<string, unknown>;

  if (existingLocation) {
    locationId = existingLocation._id;
    locationCustomProperties = asObjectRecord(existingLocation.customProperties);
  } else {
    const contactProps = args.contact.customProperties;
    const orgName = normalizeOptionalString(args.organization.name) || "Segelschule Altwarp";
    locationCustomProperties = {
      address: locationAddress,
      timezone: DEFAULT_TIMEZONE,
      contactEmail:
        normalizeOptionalString(contactProps.contactEmail)
        || normalizeOptionalString(contactProps.primaryEmail)
        || SEGELSCHULE_DEFAULT_CONTACT_EMAIL,
      contactPhone:
        normalizeOptionalString(contactProps.contactPhone)
        || normalizeOptionalString(contactProps.primaryPhone)
        || SEGELSCHULE_DEFAULT_PHONE,
      instructions: "Treffpunkt direkt am Hafen in Altwarp.",
      bookingAddressKind: "business_fallback",
      source: SEGELSCHULE_SEED_VERSION,
      mapsLabel: orgName,
    };
    locationId = await insertObject(client, {
      organizationId: args.organizationId,
      type: "location",
      subtype: "venue",
      name: SEGELSCHULE_DEFAULT_LOCATION_NAME,
      status: "active",
      customProperties: locationCustomProperties,
    });
    created = true;
    source = "created_from_organization_address";
    adoptedExisting = false;
  }

  const products = await listOrgObjectsByType(client, args.organizationId, "product");
  const resourceIds = new Set(Object.values(args.resourceByCourseId).map(String));
  const linkedResourceIds: string[] = [];
  const skippedResourceIds: string[] = [];

  for (const product of products) {
    if (!resourceIds.has(String(product._id))) {
      continue;
    }

    const productProps = asObjectRecord(product.customProperties);
    const existingLocationId = normalizeOptionalString(String(productProps.locationId || "")) || null;
    if (existingLocationId && existingLocationId !== String(locationId)) {
      skippedResourceIds.push(String(product._id));
      continue;
    }

    if (existingLocationId !== String(locationId)) {
      await patchObject(client, {
        objectId: product._id,
        customProperties: {
          ...productProps,
          locationId,
        },
      });
    }

    const locationLinks = await listLinksFromObject(client, product._id, "located_at");
    const alreadyLinked = locationLinks.some(
      (link) => String(link.toObjectId) === String(locationId)
    );
    if (!alreadyLinked) {
      await insertObjectLink(client, {
        organizationId: args.organizationId,
        fromObjectId: product._id,
        toObjectId: locationId,
        linkType: "located_at",
      });
    }
    linkedResourceIds.push(String(product._id));
  }

  return {
    objectId: locationId,
    created,
    source,
    adoptedExisting,
    linkedResourceIds,
    skippedResourceIds,
    customProperties: locationCustomProperties,
  };
}

function buildSurfaceBindingRuntimeConfig(args: {
  ticketProductId: Id<"objects">;
  resourceByCourseId: Record<string, Id<"objects">>;
}) {
  return {
    timezone: DEFAULT_TIMEZONE,
    defaultAvailableTimes: [...DEFAULT_AVAILABLE_TIMES],
    inventoryGroups: DEFAULT_INVENTORY_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      capacity: group.capacity,
    })),
    courses: COURSE_TEMPLATES.map((course) => ({
      courseId: course.courseId,
      displayName: course.displayName,
      bookingDurationMinutes: course.bookingDurationMinutes,
      availableTimes: course.availableTimes,
      isMultiDay: course.isMultiDay,
      bookingResourceId: args.resourceByCourseId[course.courseId],
      checkoutProductId: args.ticketProductId,
    })),
  };
}

function buildLegacyBindings(args: {
  ticketProductId: Id<"objects">;
  resourceByCourseId: Record<string, Id<"objects">>;
}) {
  return Object.fromEntries(
    COURSE_TEMPLATES.map((course) => [
      course.courseId,
      {
        bookingResourceId: args.resourceByCourseId[course.courseId],
        checkoutProductId: args.ticketProductId,
        bookingDurationMinutes: course.bookingDurationMinutes,
      },
    ])
  );
}

async function ensureOrganizationSettingsObject(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    organizationSlug: string;
    subtype: string;
    defaultName: string;
    defaults: Record<string, unknown>;
  }
): Promise<SettingsSeedResult> {
  const settingsObjects = await listOrgObjectsByType(
    client,
    args.organizationId,
    "organization_settings"
  );
  const existing =
    settingsObjects.find((record) => record.subtype === args.subtype)
    || null;

  const existingProps = asObjectRecord(existing?.customProperties);
  const mergedProps = {
    ...args.defaults,
    ...existingProps,
    source:
      normalizeOptionalString(existingProps.source)
      || SEGELSCHULE_SEED_VERSION,
  };

  if (existing) {
    await patchObject(client, {
      objectId: existing._id,
      ...(existing.status === "active" ? {} : { status: "active" }),
      customProperties: mergedProps,
    });
    return {
      objectId: existing._id,
      created: false,
      subtype: args.subtype,
      customProperties: mergedProps,
    };
  }

  const objectId = await insertObject(client, {
    organizationId: args.organizationId,
    type: "organization_settings",
    subtype: args.subtype,
    name: `${args.organizationSlug}-settings-${args.subtype}`,
    status: "active",
    customProperties: mergedProps,
  });
  return {
    objectId,
    created: true,
    subtype: args.subtype,
    customProperties: mergedProps,
  };
}

async function ensureSegelschuleOrganizationSettings(
  client: ConvexHttpClient,
  organization: OrganizationRecord,
  organizationId: Id<"organizations">,
  operatorEmails: string[]
): Promise<SettingsSeedResult[]> {
  const slug = normalizeOptionalString(organization.slug) || "segelschule-altwarp";
  const orgName = normalizeOptionalString(organization.name) || "Segelschule Altwarp";
  const normalizedOperatorEmails =
    operatorEmails.length > 0 ? operatorEmails : [SEGELSCHULE_DEFAULT_CONTACT_EMAIL];

  return await Promise.all([
    ensureOrganizationSettingsObject(client, {
      organizationId,
      organizationSlug: slug,
      subtype: "branding",
      defaultName: "Segelschule Altwarp Branding",
      defaults: {
        organizationName: orgName,
        primaryColor: SEGELSCHULE_DEFAULT_BRANDING.primaryColor,
        secondaryColor: SEGELSCHULE_DEFAULT_BRANDING.secondaryColor,
        accentColor: SEGELSCHULE_DEFAULT_BRANDING.accentColor,
        fontFamily: SEGELSCHULE_DEFAULT_BRANDING.fontFamily,
        source: SEGELSCHULE_SEED_VERSION,
      },
    }),
    ensureOrganizationSettingsObject(client, {
      organizationId,
      organizationSlug: slug,
      subtype: "locale",
      defaultName: "Segelschule Altwarp Locale",
      defaults: {
        language: "de",
        currency: "EUR",
        timezone: DEFAULT_TIMEZONE,
        dateFormat: "DD.MM.YYYY",
        timeFormat: "24h",
        source: SEGELSCHULE_SEED_VERSION,
      },
    }),
    ensureOrganizationSettingsObject(client, {
      organizationId,
      organizationSlug: slug,
      subtype: "invoicing",
      defaultName: "Segelschule Altwarp Invoicing",
      defaults: {
        prefix: "SA-",
        nextNumber: 1001,
        defaultTerms: "net30",
        taxRate: 19,
        footer: "Vielen Dank fuer Ihre Buchung bei Segelschule Altwarp.",
        source: SEGELSCHULE_SEED_VERSION,
      },
    }),
    ensureOrganizationSettingsObject(client, {
      organizationId,
      organizationSlug: slug,
      subtype: "booking_notifications",
      defaultName: "Segelschule Altwarp Booking Notifications",
      defaults: {
        timezone: DEFAULT_TIMEZONE,
        reminderLeadDays: 7,
        operatorEmails: normalizedOperatorEmails,
        operatorReminderKinds: ["weather", "packing_list"],
        customerConfirmationMode: "route_direct",
        operatorNotificationMode: "route_direct",
        reminderWorkflowMode: "layers_schedule",
        defaultWeatherInfo: {
          de: "Bitte pruefen Sie Wind, Temperatur und Regenwahrscheinlichkeit 48 bis 24 Stunden vor Kursbeginn erneut.",
          en: "Please re-check wind, temperature, and rain forecast 48 to 24 hours before the course starts.",
          nl: "Controleer wind, temperatuur en neerslagverwachting opnieuw 48 tot 24 uur voor de cursus begint.",
        },
        defaultPackingList: [
          "Wetterfeste Kleidung",
          "Rutschfeste Schuhe mit heller Sohle",
          "Sonnen- und Regenschutz",
          "Trinkwasser",
          "Handtuch oder Wechselkleidung",
        ],
        source: SEGELSCHULE_SEED_VERSION,
      },
    }),
  ]);
}

function buildReminderWorkflowDefinition(args: {
  reminderKind: "weather" | "packing_list";
  operatorEmails: string[];
}): {
  workflowKey: string;
  name: string;
  customProperties: Record<string, unknown>;
} {
  const isWeather = args.reminderKind === "weather";
  const triggerNodeId = `${args.reminderKind}_schedule_trigger`;
  const reminderNodeId = `${args.reminderKind}_booking_reminder`;
  const workflowKey = `segelschule_${args.reminderKind}_reminder`;

  return {
    workflowKey,
    name: isWeather
      ? "Segelschule Weather Reminder"
      : "Segelschule Packing Reminder",
    customProperties: {
      source: SEGELSCHULE_SEED_VERSION,
      segelschuleWorkflowKey: workflowKey,
      nodes: [
        {
          id: triggerNodeId,
          type: "trigger_schedule",
          position: { x: 0, y: 0 },
          config: {
            cronExpression: "0 8 * * *",
            timezone: DEFAULT_TIMEZONE,
          },
          status: "active",
          label: isWeather ? "Daily Weather Trigger" : "Daily Packing Trigger",
        },
        {
          id: reminderNodeId,
          type: "lc_booking_notifications",
          position: { x: 320, y: 0 },
          config: {
            action: "send-booking-reminders",
            reminderKind: args.reminderKind,
            daysBeforeStart: 7,
            recipientKinds: ["customer", "operator"],
            bookingSubtypes: ["class_enrollment"],
            bookingSources: ["segelschule_landing"],
            operatorEmails: args.operatorEmails,
            timezone: DEFAULT_TIMEZONE,
            ...(isWeather
              ? {
                  weatherFallback: {
                    de: "Bitte pruefen Sie Wind, Temperatur und Regenwahrscheinlichkeit 48 bis 24 Stunden vor Kursbeginn erneut.",
                    en: "Please re-check wind, temperature, and rain forecast 48 to 24 hours before the course starts.",
                    nl: "Controleer wind, temperatuur en neerslagverwachting opnieuw 48 tot 24 uur voor de cursus begint.",
                  },
                }
              : {}),
          },
          status: "active",
          label: isWeather ? "Send Weather Reminder" : "Send Packing Reminder",
        },
      ],
      edges: [
        {
          id: `${triggerNodeId}_to_${reminderNodeId}`,
          source: triggerNodeId,
          target: reminderNodeId,
          sourceHandle: "trigger_out",
          targetHandle: "input",
          status: "active",
        },
      ],
      metadata: {
        description: isWeather
          ? "Daily workflow that sends the Segelschule weather reminder 7 days before course start."
          : "Daily workflow that sends the Segelschule packing list reminder 7 days before course start.",
        isActive: true,
        mode: "live",
        runCount: 0,
        version: 1,
      },
      triggers: [
        {
          nodeId: triggerNodeId,
          triggerType: "schedule_cron",
          settings: {
            cronExpression: "0 8 * * *",
            timezone: DEFAULT_TIMEZONE,
          },
          enabled: true,
        },
      ],
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    },
  };
}

async function ensureSegelschuleReminderWorkflows(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    operatorEmails: string[];
  }
): Promise<LayerWorkflowSeedResult[]> {
  const workflows = await listOrgObjectsByType(
    client,
    args.organizationId,
    "layer_workflow"
  );

  const definitions = [
    buildReminderWorkflowDefinition({
      reminderKind: "weather",
      operatorEmails: args.operatorEmails,
    }),
    buildReminderWorkflowDefinition({
      reminderKind: "packing_list",
      operatorEmails: args.operatorEmails,
    }),
  ];

  const results: LayerWorkflowSeedResult[] = [];

  for (const definition of definitions) {
    const existing =
      workflows.find(
        (workflow) =>
          asObjectRecord(workflow.customProperties).segelschuleWorkflowKey
          === definition.workflowKey
      )
      || workflows.find((workflow) => workflow.name === definition.name)
      || null;

    if (existing) {
      await patchObject(client, {
        objectId: existing._id,
        ...(existing.status === "active" ? {} : { status: "active" }),
        customProperties: {
          ...asObjectRecord(existing.customProperties),
          ...definition.customProperties,
        },
      });
      results.push({
        objectId: existing._id,
        created: false,
        workflowKey: definition.workflowKey,
        name: existing.name || definition.name,
        status: "active",
      });
      continue;
    }

    const objectId = await insertObject(client, {
      organizationId: args.organizationId,
      type: "layer_workflow",
      subtype: "workflow",
      name: definition.name,
      status: "active",
      customProperties: definition.customProperties,
    });

    results.push({
      objectId,
      created: true,
      workflowKey: definition.workflowKey,
      name: definition.name,
      status: "active",
    });
  }

  return results;
}

async function ensureSegelschuleDomainConfig(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    localSiteUrl: string;
  }
): Promise<DomainConfigSeedResult> {
  const domainConfigs = await listOrgObjectsByType(client, args.organizationId, "domain_config");
  const existing =
    domainConfigs.find((record) => record.status === "active")
    || domainConfigs[0]
    || null;

  const existingProps = asObjectRecord(existing?.customProperties);
  const existingEmail = asObjectRecord(existingProps.email);
  const existingBranding = asObjectRecord(existingProps.branding);
  const existingWebPublishing = asObjectRecord(existingProps.webPublishing);

  const mergedProps = {
    ...existingProps,
    domainName: normalizeOptionalString(existingProps.domainName) || SEGELSCHULE_DEFAULT_DOMAIN_NAME,
    displayName: normalizeOptionalString(existingProps.displayName) || "Segelschule Altwarp",
    source: normalizeOptionalString(existingProps.source) || SEGELSCHULE_SEED_VERSION,
    email: {
      emailDomain: SEGELSCHULE_DEFAULT_EMAIL_DOMAIN,
      senderEmail: `booking@${SEGELSCHULE_DEFAULT_EMAIL_DOMAIN}`,
      systemEmail: `system@${SEGELSCHULE_DEFAULT_EMAIL_DOMAIN}`,
      salesEmail: `booking@${SEGELSCHULE_DEFAULT_EMAIL_DOMAIN}`,
      replyToEmail: `support@${SEGELSCHULE_DEFAULT_EMAIL_DOMAIN}`,
      defaultTemplateCode: "event-confirmation-v2",
      ...existingEmail,
    },
    branding: {
      ...SEGELSCHULE_DEFAULT_BRANDING,
      ...existingBranding,
    },
    webPublishing: {
      siteUrl: args.localSiteUrl,
      ...existingWebPublishing,
    },
  };

  if (existing) {
    await patchObject(client, {
      objectId: existing._id,
      ...(existing.status === "active" ? {} : { status: "active" }),
      customProperties: mergedProps,
    });
    return {
      objectId: existing._id,
      created: false,
      customProperties: mergedProps,
    };
  }

  const objectId = await insertObject(client, {
    organizationId: args.organizationId,
    type: "domain_config",
    subtype: "platform",
    name: "Segelschule Altwarp Domain",
    status: "active",
    customProperties: mergedProps,
  });

  return {
    objectId,
    created: true,
    customProperties: mergedProps,
  };
}

async function resolveGoogleConnection(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    explicitConnectionId?: string | null;
    explicitConnectionEmail?: string | null;
  }
): Promise<{
    connection: OAuthConnectionRecord | null;
    source: string | null;
    candidates: OAuthConnectionRecord[];
    skippedReason?: string | null;
  }> {
  const allGoogleConnections = await listOAuthConnectionsByProvider(
    client,
    args.organizationId,
    "google"
  );
  const activeConnections = allGoogleConnections.filter(
    (connection) => connection.status === "active"
  );

  const explicitConnectionId = normalizeOptionalString(args.explicitConnectionId);
  if (explicitConnectionId) {
    const connection = allGoogleConnections.find(
      (candidate) => String(candidate.id) === explicitConnectionId
    );
    if (!connection) {
      throw new Error(`Google connection ${explicitConnectionId} not found for this organization.`);
    }
    return {
      connection,
      source: `id:${explicitConnectionId}`,
      candidates: allGoogleConnections,
    };
  }

  const explicitConnectionEmail = lower(args.explicitConnectionEmail);
  if (explicitConnectionEmail) {
    const matchingConnections = allGoogleConnections.filter(
      (candidate) => lower(candidate.providerEmail) === explicitConnectionEmail
    );
    if (matchingConnections.length === 0) {
      throw new Error(`Google connection for ${explicitConnectionEmail} not found for this organization.`);
    }
    if (matchingConnections.length > 1) {
      throw new Error(
        `Multiple Google connections found for ${explicitConnectionEmail}. Pass --google-connection-id explicitly.`
      );
    }
    return {
      connection: matchingConnections[0],
      source: `email:${explicitConnectionEmail}`,
      candidates: allGoogleConnections,
    };
  }

  const activeOrganizational = activeConnections.filter(
    (connection) => connection.connectionType === "organizational"
  );
  if (activeOrganizational.length === 1) {
    return {
      connection: activeOrganizational[0],
      source: "auto:single_organizational_google_connection",
      candidates: allGoogleConnections,
    };
  }

  if (activeConnections.length === 1) {
    return {
      connection: activeConnections[0],
      source: "auto:single_active_google_connection",
      candidates: allGoogleConnections,
    };
  }

  return {
    connection: null,
    source: null,
    candidates: allGoogleConnections,
    skippedReason:
      activeConnections.length === 0
        ? "no_active_google_connection"
        : "multiple_active_google_connections_require_explicit_selection",
  };
}

async function getCalendarLinkSnapshot(
  client: ConvexHttpClient,
  targetObjectId: Id<"objects">,
  connectionId: Id<"oauthConnections">
): Promise<{
  linkId: string;
  blockingCalendarIds: string[];
  pushCalendarId: string | null;
} | null> {
  const links = await listLinksToObject(client, targetObjectId, "calendar_linked_to");
  const match = links.find(
    (link) => String(link.properties?.connectionId || "") === String(connectionId)
  );
  if (!match) {
    return null;
  }
  const properties = asObjectRecord(match.properties);
  return {
    linkId: String(match._id),
    blockingCalendarIds: Array.isArray(properties.blockingCalendarIds)
      ? (properties.blockingCalendarIds as string[])
      : [],
    pushCalendarId: normalizeGoogleCalendarId(properties.pushCalendarId),
  };
}

async function ensureGoogleCalendarSetup(
  client: ConvexHttpClient,
  args: {
    organizationId: Id<"organizations">;
    resourceByCourseId: Record<string, Id<"objects">>;
    explicitConnectionId?: string;
    explicitConnectionEmail?: string;
    explicitPushCalendarId?: string;
    blockingCalendarIds: string[];
    skipDedicatedPushCalendar: boolean;
    skipOrgDefaultLink: boolean;
    skipInitialSync: boolean;
  }
): Promise<GoogleCalendarSeedResult> {
  const resolution = await resolveGoogleConnection(client, {
    organizationId: args.organizationId,
    explicitConnectionId: args.explicitConnectionId,
    explicitConnectionEmail: args.explicitConnectionEmail,
  });

  const candidates = resolution.candidates.map(normalizeConnectionSummary);
  if (!resolution.connection) {
    return {
      configured: false,
      source: resolution.source,
      connection: null,
      candidates,
      skippedReason: resolution.skippedReason || "no_google_connection_selected",
    };
  }

  const initialConnection = await getOAuthConnection(
    client,
    args.organizationId,
    resolution.connection.id
  );
  if (!initialConnection) {
    throw new Error(`Failed to reload Google connection ${String(resolution.connection.id)}.`);
  }

  const nextSyncSettings: OAuthConnectionSyncSettings = {
    email: initialConnection.syncSettings?.email === true,
    calendar: true,
    oneDrive: initialConnection.syncSettings?.oneDrive === true,
    sharePoint: initialConnection.syncSettings?.sharePoint === true,
  };
  await updateOAuthConnectionSyncSettings(
    client,
    args.organizationId,
    initialConnection.id,
    nextSyncSettings
  );

  const refreshResult = await refreshGoogleSubCalendars(client, initialConnection.id);
  let dedicatedBookingsCalendarId: string | null = null;
  if (!args.explicitPushCalendarId && !args.skipDedicatedPushCalendar) {
    const bookingsCalendarResult = await ensureGoogleBookingsCalendar(
      client,
      initialConnection.id
    );
    dedicatedBookingsCalendarId =
      normalizeGoogleCalendarId(bookingsCalendarResult.calendarId) || null;
  }

  const refreshedConnection = await getOAuthConnection(
    client,
    args.organizationId,
    initialConnection.id
  );
  if (!refreshedConnection) {
    throw new Error(`Failed to refresh Google connection ${String(initialConnection.id)}.`);
  }

  const primaryCalendarId = getPrimaryCalendarId(refreshedConnection);
  const blockingCalendarIds =
    args.blockingCalendarIds.length > 0
      ? args.blockingCalendarIds
      : [primaryCalendarId || "primary"];
  const pushCalendarId =
    normalizeOptionalString(args.explicitPushCalendarId)
    || dedicatedBookingsCalendarId
    || null;

  const resourceLinks: GoogleCalendarSeedResult["resourceLinks"] = [];
  for (const course of COURSE_TEMPLATES) {
    const resourceId = args.resourceByCourseId[course.courseId];
    const upsertResult = await upsertCalendarLinkSettings(client, {
      organizationId: args.organizationId,
      connectionId: refreshedConnection.id,
      resourceId,
      blockingCalendarIds,
      ...(pushCalendarId ? { pushCalendarId } : {}),
    });
    const snapshot = await getCalendarLinkSnapshot(
      client,
      upsertResult.resourceId,
      refreshedConnection.id
    );
    resourceLinks.push({
      courseId: course.courseId,
      resourceId: String(upsertResult.resourceId),
      linkId: snapshot?.linkId || String(upsertResult.linkId),
      created: upsertResult.created,
      blockingCalendarIds: snapshot?.blockingCalendarIds || blockingCalendarIds,
      pushCalendarId: snapshot?.pushCalendarId || pushCalendarId,
    });
  }

  let orgDefaultLink: GoogleCalendarSeedResult["orgDefaultLink"] = null;
  if (!args.skipOrgDefaultLink) {
    const orgDefaultUpsert = await upsertCalendarLinkSettings(client, {
      organizationId: args.organizationId,
      connectionId: refreshedConnection.id,
      blockingCalendarIds,
      ...(pushCalendarId ? { pushCalendarId } : {}),
    });
    const snapshot = await getCalendarLinkSnapshot(
      client,
      orgDefaultUpsert.resourceId,
      refreshedConnection.id
    );
    orgDefaultLink = {
      resourceId: String(orgDefaultUpsert.resourceId),
      linkId: snapshot?.linkId || String(orgDefaultUpsert.linkId),
      created: orgDefaultUpsert.created,
      blockingCalendarIds: snapshot?.blockingCalendarIds || blockingCalendarIds,
      pushCalendarId: snapshot?.pushCalendarId || pushCalendarId,
    };
  }

  const syncResult = args.skipInitialSync
    ? null
    : await syncGoogleConnection(client, refreshedConnection.id);

  return {
    configured: true,
    source: resolution.source,
    connection: refreshedConnection,
    candidates,
    syncEnabled: true,
    subCalendarCount: Number(refreshResult.count || getStoredSubCalendars(refreshedConnection).length || 0),
    dedicatedBookingsCalendarId:
      dedicatedBookingsCalendarId
      || normalizeGoogleCalendarId(asObjectRecord(refreshedConnection.customProperties).bookingsCalendarId),
    blockingCalendarIds,
    pushCalendarId,
    resourceLinks,
    orgDefaultLink,
    syncResult,
  };
}

async function main() {
  const envPath = getArg("--env") || "apps/segelschule-altwarp/.env.local";
  const resolvedEnvPath = path.resolve(process.cwd(), envPath);
  loadEnv({ path: resolvedEnvPath, override: false });

  const convexUrl = required(
    process.env.NEXT_PUBLIC_CONVEX_URL,
    `NEXT_PUBLIC_CONVEX_URL is required. Checked ${resolvedEnvPath}.`
  );
  const deployKey = required(
    process.env.CONVEX_DEPLOY_KEY,
    `CONVEX_DEPLOY_KEY is required. Checked ${resolvedEnvPath}.`
  );

  const explicitOrganizationId = getArg("--organization-id");
  const explicitOrganizationSlug = getArg("--organization-slug");
  const appSlug = normalizeOptionalString(getArg("--app-slug")) || SEGELSCHULE_APP_SLUG;
  const surfaceType = normalizeOptionalString(getArg("--surface-type")) || SEGELSCHULE_SURFACE_TYPE;
  const surfaceKey = normalizeOptionalString(getArg("--surface-key")) || SEGELSCHULE_SURFACE_KEY;
  const inspectOnly = hasFlag("--inspect-only");

  const localBackendBaseUrl =
    normalizeOptionalString(getArg("--backend-base-url"))
    || normalizeOptionalString(process.env.NEXT_PUBLIC_APP_URL)
    || "http://localhost:3000";
  const localSegelschulePort =
    normalizePositiveNumber(Number(getArg("--segelschule-port") || 3002)) || 3002;
  const localSegelschuleBaseUrl =
    normalizeOptionalString(getArg("--segelschule-base-url"))
    || normalizeOptionalString(process.env.NEXTAUTH_URL)
    || `http://localhost:${localSegelschulePort}`;

  const explicitGoogleConnectionId =
    normalizeOptionalString(getArg("--google-connection-id"))
    || normalizeOptionalString(process.env.SEGELSCHULE_GOOGLE_CONNECTION_ID);
  const explicitGoogleConnectionEmail =
    normalizeOptionalString(getArg("--google-connection-email"))
    || normalizeOptionalString(process.env.SEGELSCHULE_GOOGLE_CONNECTION_EMAIL);
  const explicitPushCalendarId =
    normalizeOptionalString(getArg("--google-push-calendar-id"))
    || normalizeOptionalString(process.env.SEGELSCHULE_GOOGLE_PUSH_CALENDAR_ID);
  const blockingCalendarIds = getCommaSeparatedArg("--google-blocking-calendar-ids");
  const skipDedicatedPushCalendar = hasFlag("--skip-dedicated-push-calendar");
  const skipOrgDefaultLink = hasFlag("--skip-org-default-calendar-link");
  const skipInitialSync = hasFlag("--skip-google-sync");

  const client = new ConvexHttpClient(convexUrl);
  const maybeAdminClient = client as ConvexHttpClient & {
    setAdminAuth?: (token: string) => void;
  };
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(deployKey);
  }

  const organizationResolution = await resolveOrganization(client, {
    explicitOrganizationId,
    organizationSlug: explicitOrganizationSlug || process.env.SEGELSCHULE_ORG_SLUG,
    envCandidates: [
      process.env.ORG_ID || null,
      process.env.NEXT_PUBLIC_ORG_ID || null,
      process.env.PLATFORM_ORG_ID || null,
      process.env.NEXT_PUBLIC_PLATFORM_ORG_ID || null,
    ],
  });

  const organizationId = organizationResolution.organizationId;
  const providersBefore = await listOrgObjectsByType(
    client,
    organizationId,
    "payment_provider_config"
  );
  const productsBefore = await listOrgObjectsByType(client, organizationId, "product");
  const bindingsBefore = (await client.query(
    internal.frontendSurfaceBindings.listBookingSurfaceBindingsInternal,
    {
      organizationId,
      appSlug,
      surfaceType,
    }
  )) as Array<Record<string, unknown>>;
  const settingsBefore = await listOrgObjectsByType(client, organizationId, "organization_settings");
  const contactsBefore = await listOrgObjectsByType(client, organizationId, "organization_contact");
  const addressesBefore = await listOrgObjectsByType(client, organizationId, "address");
  const locationsBefore = await listOrgObjectsByType(client, organizationId, "location");
  const layerWorkflowsBefore = await listOrgObjectsByType(client, organizationId, "layer_workflow");
  const domainConfigsBefore = await listOrgObjectsByType(client, organizationId, "domain_config");
  const googleConnectionsBefore = await listOAuthConnectionsByProvider(
    client,
    organizationId,
    "google"
  );
  const systemTemplateReadiness = await inspectSystemTemplateReadiness(client);

  if (inspectOnly) {
    console.log(
      JSON.stringify(
        {
          envPath: resolvedEnvPath,
          organizationResolution,
          inspection: {
            paymentProviders: providersBefore.map((provider) => ({
              id: provider._id,
              name: provider.name || null,
              status: provider.status || null,
              providerCode: provider.customProperties?.providerCode || null,
              isDefault: provider.customProperties?.isDefault || false,
            })),
            ticketProducts: productsBefore
              .filter((product) => product.subtype === "ticket")
              .map((product) => ({
                id: product._id,
                name: product.name || null,
                status: product.status || null,
              })),
            classResources: productsBefore
              .filter((product) =>
                ["class", "appointment"].includes(String(product.subtype || ""))
              )
              .map((product) => ({
                id: product._id,
                name: product.name || null,
                subtype: product.subtype || null,
                status: product.status || null,
                segelschuleCourseId: product.customProperties?.segelschuleCourseId || null,
                hasBookableConfig: Boolean(product.customProperties?.bookableConfig),
              })),
            surfaceBindings: bindingsBefore,
            organizationSettings: settingsBefore.map((setting) => ({
              id: setting._id,
              subtype: setting.subtype || null,
              status: setting.status || null,
              source: setting.customProperties?.source || null,
            })),
            organizationContacts: contactsBefore.map((contact) => ({
              id: contact._id,
              name: contact.name || null,
              status: contact.status || null,
              email:
                normalizeOptionalString(contact.customProperties?.contactEmail)
                || normalizeOptionalString(contact.customProperties?.primaryEmail)
                || null,
              phone:
                normalizeOptionalString(contact.customProperties?.contactPhone)
                || normalizeOptionalString(contact.customProperties?.primaryPhone)
                || null,
            })),
            organizationAddresses: addressesBefore.map((address) => ({
              id: address._id,
              subtype: address.subtype || null,
              status: address.status || null,
              isPrimary: asObjectRecord(address.customProperties).isPrimary === true,
              addressLine1:
                normalizeOptionalString(address.customProperties?.addressLine1)
                || normalizeOptionalString(address.customProperties?.line1)
                || normalizeOptionalString(address.customProperties?.street)
                || null,
              city: asObjectRecord(address.customProperties).city || null,
              postalCode: asObjectRecord(address.customProperties).postalCode || null,
              country: asObjectRecord(address.customProperties).country || null,
            })),
            locations: locationsBefore.map((location) => ({
              id: location._id,
              name: location.name || null,
              subtype: location.subtype || null,
              status: location.status || null,
              source: asObjectRecord(location.customProperties).source || null,
              bookingAddressKind: asObjectRecord(location.customProperties).bookingAddressKind || null,
            })),
            layerWorkflows: layerWorkflowsBefore.map((workflow) => ({
              id: workflow._id,
              name: workflow.name || null,
              subtype: workflow.subtype || null,
              status: workflow.status || null,
              workflowKey: asObjectRecord(workflow.customProperties).segelschuleWorkflowKey || null,
            })),
            domainConfigs: domainConfigsBefore.map((config) => ({
              id: config._id,
              name: config.name || null,
              status: config.status || null,
              domainName: asObjectRecord(config.customProperties).domainName || null,
              senderEmail: asObjectRecord(asObjectRecord(config.customProperties).email).senderEmail || null,
              siteUrl: asObjectRecord(asObjectRecord(config.customProperties).webPublishing).siteUrl || null,
            })),
            googleConnections: googleConnectionsBefore.map(normalizeConnectionSummary),
            systemTemplateReadiness,
          },
        },
        null,
        2
      )
    );
    return;
  }

  const invoiceProviderResult = await ensureInvoiceProvider(
    client,
    organizationId,
    providersBefore
  );

  const productsAfterProviderSetup = await listOrgObjectsByType(
    client,
    organizationId,
    "product"
  );
  const ticketProductResult = await ensureTicketProduct(
    client,
    organizationId,
    productsAfterProviderSetup
  );

  const productsAfterTicketSetup = await listOrgObjectsByType(
    client,
    organizationId,
    "product"
  );
  const resourceResult = await ensureCourseResources(
    client,
    organizationId,
    productsAfterTicketSetup
  );
  const seedUserId = await resolveSeedUserId(client, organizationId);
  const availabilitySeedResult = await seedSegelschuleCourseAvailabilities(client, {
    organizationId,
    userId: seedUserId,
    resourceByCourseId: resourceResult.resourceByCourseId,
  });
  const contactResult = await ensureSegelschuleOrganizationContact(client, {
    organization: organizationResolution.organization,
    organizationId,
    website: localSegelschuleBaseUrl,
  });
  const addressResults = await ensureSegelschuleOrganizationAddresses(client, {
    organizationId,
  });
  const bookingLocationResult = await ensureSegelschuleBookingLocation(client, {
    organizationId,
    organization: organizationResolution.organization,
    resourceByCourseId: resourceResult.resourceByCourseId,
    contact: contactResult,
    addresses: addressResults,
  });

  const runtimeConfig = buildSurfaceBindingRuntimeConfig({
    ticketProductId: ticketProductResult.productId,
    resourceByCourseId: resourceResult.resourceByCourseId,
  });
  const legacyBindings = buildLegacyBindings({
    ticketProductId: ticketProductResult.productId,
    resourceByCourseId: resourceResult.resourceByCourseId,
  });

  const upsertBindingResult = (await client.mutation(
    internal.frontendSurfaceBindings.upsertBookingSurfaceBindingInternal,
    {
      organizationId,
      appSlug,
      surfaceType,
      surfaceKey,
      name: `${appSlug}:${surfaceType}:${surfaceKey}`,
      enabled: true,
      priority: 100,
      runtimeConfig,
      legacyBindings,
    }
  )) as {
    success: boolean;
    bindingId: string;
    created: boolean;
  };

  const settingsResult = await ensureSegelschuleOrganizationSettings(
    client,
    organizationResolution.organization,
    organizationId,
    [
      normalizeOptionalString(contactResult.customProperties.contactEmail)
      || normalizeOptionalString(contactResult.customProperties.primaryEmail)
      || SEGELSCHULE_DEFAULT_CONTACT_EMAIL,
    ].filter((value): value is string => Boolean(value))
  );
  const reminderWorkflowResults = await ensureSegelschuleReminderWorkflows(client, {
    organizationId,
    operatorEmails: [
      normalizeOptionalString(contactResult.customProperties.contactEmail)
      || normalizeOptionalString(contactResult.customProperties.primaryEmail)
      || SEGELSCHULE_DEFAULT_CONTACT_EMAIL,
    ].filter((value): value is string => Boolean(value)),
  });
  const bookingNotificationSettings = settingsResult.find(
    (result) => result.subtype === "booking_notifications"
  );
  if (bookingNotificationSettings) {
    await patchObject(client, {
      objectId: bookingNotificationSettings.objectId,
      customProperties: {
        ...bookingNotificationSettings.customProperties,
        reminderWorkflowIds: reminderWorkflowResults.reduce<Record<string, string>>(
          (accumulator, workflow) => ({
            ...accumulator,
            [workflow.workflowKey]: String(workflow.objectId),
          }),
          {}
        ),
      },
    });
  }
  const domainConfigResult = await ensureSegelschuleDomainConfig(client, {
    organizationId,
    localSiteUrl: localSegelschuleBaseUrl,
  });
  const googleResult = await ensureGoogleCalendarSetup(client, {
    organizationId,
    resourceByCourseId: resourceResult.resourceByCourseId,
    ...(explicitGoogleConnectionId ? { explicitConnectionId: explicitGoogleConnectionId } : {}),
    ...(explicitGoogleConnectionEmail ? { explicitConnectionEmail: explicitGoogleConnectionEmail } : {}),
    ...(explicitPushCalendarId ? { explicitPushCalendarId } : {}),
    blockingCalendarIds,
    skipDedicatedPushCalendar,
    skipOrgDefaultLink,
    skipInitialSync,
  });

  const providersAfter = await listOrgObjectsByType(
    client,
    organizationId,
    "payment_provider_config"
  );
  const bindingsAfter = (await client.query(
    internal.frontendSurfaceBindings.listBookingSurfaceBindingsInternal,
    {
      organizationId,
      appSlug,
      surfaceType,
    }
  )) as Array<Record<string, unknown>>;
  const settingsAfter = await listOrgObjectsByType(client, organizationId, "organization_settings");
  const contactsAfter = await listOrgObjectsByType(client, organizationId, "organization_contact");
  const addressesAfter = await listOrgObjectsByType(client, organizationId, "address");
  const locationsAfter = await listOrgObjectsByType(client, organizationId, "location");
  const layerWorkflowsAfter = await listOrgObjectsByType(client, organizationId, "layer_workflow");
  const domainConfigsAfter = await listOrgObjectsByType(client, organizationId, "domain_config");

  const checkoutCatalogEnv = {
    timezone: runtimeConfig.timezone,
    defaultAvailableTimes: runtimeConfig.defaultAvailableTimes,
    inventoryGroups: runtimeConfig.inventoryGroups,
    courses: runtimeConfig.courses.map((course) => ({
      courseId: course.courseId,
      bookingDurationMinutes: course.bookingDurationMinutes,
      availableTimes: course.availableTimes,
      isMultiDay: course.isMultiDay,
      bookingResourceId: course.bookingResourceId,
      checkoutProductId: course.checkoutProductId,
    })),
  };

  console.log(
    JSON.stringify(
      {
        envPath: resolvedEnvPath,
        organization: {
          id: organizationId,
          name: organizationResolution.organization.name || null,
          slug: organizationResolution.organization.slug || null,
          resolvedFrom: organizationResolution.source,
        },
        prepared: {
          invoiceProvider: {
            id: invoiceProviderResult.providerId,
            created: invoiceProviderResult.created,
          },
          stripeProvidersMarkedDormant: invoiceProviderResult.normalizedStripeProviderIds,
          ticketProduct: {
            id: ticketProductResult.productId,
            created: ticketProductResult.created,
          },
          createdCourseResources: resourceResult.createdCourseIds,
          resourceByCourseId: resourceResult.resourceByCourseId,
          seededAvailabilityProfiles: availabilitySeedResult.seededProfiles,
          organizationContact: {
            id: contactResult.objectId,
            created: contactResult.created,
            email:
              normalizeOptionalString(contactResult.customProperties.contactEmail)
              || normalizeOptionalString(contactResult.customProperties.primaryEmail)
              || null,
            phone:
              normalizeOptionalString(contactResult.customProperties.contactPhone)
              || normalizeOptionalString(contactResult.customProperties.primaryPhone)
              || null,
          },
          organizationAddresses: addressResults.map((result) => ({
            id: result.objectId,
            subtype: result.subtype,
            created: result.created,
            isPrimary: result.customProperties.isPrimary === true,
            addressLine1:
              normalizeOptionalString(result.customProperties.addressLine1)
              || normalizeOptionalString(result.customProperties.line1)
              || normalizeOptionalString(result.customProperties.street)
              || null,
          })),
          bookingLocation: {
            id: bookingLocationResult.objectId,
            created: bookingLocationResult.created,
            source: bookingLocationResult.source,
            adoptedExisting: bookingLocationResult.adoptedExisting,
            linkedResourceIds: bookingLocationResult.linkedResourceIds,
            skippedResourceIds: bookingLocationResult.skippedResourceIds,
          },
          surfaceBinding: {
            id: upsertBindingResult.bindingId,
            created: upsertBindingResult.created,
          },
          organizationSettings: settingsResult.map((result) => ({
            id: result.objectId,
            subtype: result.subtype,
            created: result.created,
          })),
          reminderWorkflows: reminderWorkflowResults.map((result) => ({
            id: result.objectId,
            workflowKey: result.workflowKey,
            name: result.name,
            created: result.created,
            status: result.status,
          })),
          domainConfig: {
            id: domainConfigResult.objectId,
            created: domainConfigResult.created,
            senderEmail: asObjectRecord(domainConfigResult.customProperties.email).senderEmail || null,
            siteUrl: asObjectRecord(domainConfigResult.customProperties.webPublishing).siteUrl || null,
          },
          googleCalendar: googleResult,
          systemTemplateReadiness,
        },
        verification: {
          providers: providersAfter.map((provider) => ({
            id: provider._id,
            name: provider.name || null,
            status: provider.status || null,
            providerCode: provider.customProperties?.providerCode || null,
            isDefault: provider.customProperties?.isDefault || false,
          })),
          bindingCount: bindingsAfter.length,
          organizationSettings: settingsAfter.map((setting) => ({
            id: setting._id,
            subtype: setting.subtype || null,
            status: setting.status || null,
            source: setting.customProperties?.source || null,
          })),
          organizationContacts: contactsAfter.map((contact) => ({
            id: contact._id,
            name: contact.name || null,
            status: contact.status || null,
            email:
              normalizeOptionalString(contact.customProperties?.contactEmail)
              || normalizeOptionalString(contact.customProperties?.primaryEmail)
              || null,
          })),
          organizationAddresses: addressesAfter.map((address) => ({
            id: address._id,
            subtype: address.subtype || null,
            status: address.status || null,
            isPrimary: asObjectRecord(address.customProperties).isPrimary === true,
            addressLine1:
              normalizeOptionalString(address.customProperties?.addressLine1)
              || normalizeOptionalString(address.customProperties?.line1)
              || normalizeOptionalString(address.customProperties?.street)
              || null,
          })),
          locations: locationsAfter.map((location) => ({
            id: location._id,
            name: location.name || null,
            subtype: location.subtype || null,
            status: location.status || null,
            bookingAddressKind: asObjectRecord(location.customProperties).bookingAddressKind || null,
          })),
          layerWorkflows: layerWorkflowsAfter.map((workflow) => ({
            id: workflow._id,
            name: workflow.name || null,
            subtype: workflow.subtype || null,
            status: workflow.status || null,
            workflowKey: asObjectRecord(workflow.customProperties).segelschuleWorkflowKey || null,
          })),
          seededAvailabilityResourceIds: availabilitySeedResult.seededResourceIds,
          domainConfigs: domainConfigsAfter.map((config) => ({
            id: config._id,
            name: config.name || null,
            status: config.status || null,
            domainName: asObjectRecord(config.customProperties).domainName || null,
            senderEmail: asObjectRecord(asObjectRecord(config.customProperties).email).senderEmail || null,
            siteUrl: asObjectRecord(asObjectRecord(config.customProperties).webPublishing).siteUrl || null,
          })),
        },
        envSuggestions: {
          SEGELSCHULE_BOOKING_CATALOG_JSON: JSON.stringify(checkoutCatalogEnv),
          SEGELSCHULE_SURFACE_APP_SLUG: appSlug,
          SEGELSCHULE_SURFACE_TYPE: surfaceType,
          SEGELSCHULE_SURFACE_KEY: surfaceKey,
          NEXT_PUBLIC_APP_URL: localBackendBaseUrl,
          NEXTAUTH_URL: localSegelschuleBaseUrl,
          NEXT_PUBLIC_L4YERCAK3_BACKEND_URL: localBackendBaseUrl,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
