/**
 * API V1: CRM INTERNAL HANDLERS
 *
 * Internal query/mutation handlers for CRM API endpoints.
 * These are called by the HTTP action handlers in crm.ts.
 */

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
} from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { addressesValidator } from "../../crmOntology";
import { normalizeCrmConnectorKey } from "../../crmIntegrations";
import {
  normalizeOrgCrmSyncCandidateEnvelope,
  resolveOrgActionSyncDispatchMode,
  type OrgCrmSyncCandidateEnvelope,
} from "../../ai/orgActionSyncOutbox";

const generatedApi: any = require("../../_generated/api");

export const ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION =
  "org_crm_narrow_sync_v1" as const;

const ORG_CRM_NARROW_SYNC_DEFAULT_BATCH_LIMIT = 25;
const ORG_CRM_NARROW_SYNC_MAX_BATCH_LIMIT = 100;
const ACTIVE_CAMPAIGN_CONNECTOR_KEY = "activecampaign" as const;
const ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS_DEFAULT = 20_000;
const ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS_MIN = 100;
const ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS_MAX = 120_000;
const ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS_DEFAULT = 2;
const ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS_MIN = 1;
const ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS_MAX = 4;

type SupportedNarrowSyncConnectorKey = typeof ACTIVE_CAMPAIGN_CONNECTOR_KEY;

export type OrgCrmSyncOperationStatus =
  | "applied"
  | "failed"
  | "skipped_missing_data"
  | "skipped_unsupported";

export interface OrgCrmSyncOperationPlan {
  contact: OrgCrmSyncOperationStatus;
  organization: OrgCrmSyncOperationStatus;
  activity: OrgCrmSyncOperationStatus;
}

/**
 * HELPER: Find or create CRM organization
 * Handles organization deduplication by name
 * Supports both old address format and new addresses array
 */
interface AddressData {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface SyncObjectSnapshot {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  name: string;
  description?: string;
  customProperties?: unknown;
}

interface OrgCrmSyncContactPayload {
  email: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface OrgCrmSyncOrganizationPayload {
  name: string | null;
  website?: string;
  industry?: string;
}

interface OrgCrmSyncDispatchOutcome {
  connectorKey: string;
  dispatchStatus: "succeeded" | "failed" | "skipped";
  canonicalObjectId?: Id<"objects">;
  canonicalObjectType?: string;
  externalRecordId?: string;
  externalRecordType?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
}

interface PendingSyncCandidateRow {
  syncCandidateObjectId: Id<"objects">;
  name: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  attemptNumber: number;
  envelope: OrgCrmSyncCandidateEnvelope;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toObjectId(value: unknown): Id<"objects"> | null {
  const normalized = normalizeNonEmptyString(value);
  return normalized ? (normalized as Id<"objects">) : null;
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.round(value);
  if (normalized < min) {
    return min;
  }
  if (normalized > max) {
    return max;
  }
  return normalized;
}

function splitName(name: string | null): { firstName?: string; lastName?: string } {
  if (!name) {
    return {};
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {};
  }
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function resolveContactPayload(
  contactObject: SyncObjectSnapshot | null,
): OrgCrmSyncContactPayload {
  if (!contactObject || contactObject.type !== "crm_contact") {
    return { email: null };
  }
  const customProperties = asRecord(contactObject.customProperties);
  const email = normalizeNonEmptyString(customProperties.email);
  const nameParts = splitName(normalizeNonEmptyString(contactObject.name));

  const firstName =
    normalizeNonEmptyString(customProperties.firstName)
    || nameParts.firstName;
  const lastName =
    normalizeNonEmptyString(customProperties.lastName)
    || nameParts.lastName;
  const phone = normalizeNonEmptyString(customProperties.phone) || undefined;

  return {
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone,
  };
}

function resolveOrganizationPayload(
  organizationObject: SyncObjectSnapshot | null,
): OrgCrmSyncOrganizationPayload {
  if (!organizationObject || organizationObject.type !== "crm_organization") {
    return { name: null };
  }
  const customProperties = asRecord(organizationObject.customProperties);
  return {
    name: normalizeNonEmptyString(organizationObject.name),
    website: normalizeNonEmptyString(customProperties.website) || undefined,
    industry: normalizeNonEmptyString(customProperties.industry) || undefined,
  };
}

export function normalizeOrgCrmSyncOutboxBatchLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return ORG_CRM_NARROW_SYNC_DEFAULT_BATCH_LIMIT;
  }
  const normalized = Math.floor(value);
  if (normalized < 1) {
    return 1;
  }
  if (normalized > ORG_CRM_NARROW_SYNC_MAX_BATCH_LIMIT) {
    return ORG_CRM_NARROW_SYNC_MAX_BATCH_LIMIT;
  }
  return normalized;
}

export function normalizeOrgCrmSyncDispatchTimeoutMs(value: unknown): number {
  return normalizePositiveInteger(
    value,
    ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS_DEFAULT,
    ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS_MIN,
    ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS_MAX,
  );
}

export function normalizeOrgCrmSyncDispatchMaxAttempts(value: unknown): number {
  return normalizePositiveInteger(
    value,
    ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS_DEFAULT,
    ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS_MIN,
    ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS_MAX,
  );
}

function resolveOrgCrmSyncDispatchTimeoutMs(): number {
  return normalizeOrgCrmSyncDispatchTimeoutMs(
    process.env.ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS
      ? Number(process.env.ORG_CRM_SYNC_DISPATCH_TIMEOUT_MS)
      : undefined,
  );
}

function resolveOrgCrmSyncDispatchMaxAttempts(): number {
  return normalizeOrgCrmSyncDispatchMaxAttempts(
    process.env.ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS
      ? Number(process.env.ORG_CRM_SYNC_DISPATCH_MAX_ATTEMPTS)
      : undefined,
  );
}

function buildOrgCrmSyncDispatchTimeoutError(timeoutMs: number): Error {
  return new Error(`org_crm_sync_dispatch_timeout:${timeoutMs}ms`);
}

function isRetryableOrgCrmSyncDispatchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.message.startsWith("org_crm_sync_dispatch_timeout:")) {
    return true;
  }
  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("request_timeout")
    || normalized.includes("timeout")
    || normalized.includes("timed out")
    || normalized.includes("429")
    || normalized.includes("5xx")
  );
}

export async function withOrgCrmSyncDispatchTimeout<T>(args: {
  timeoutMs: number;
  operation: () => Promise<T>;
}): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      args.operation(),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(buildOrgCrmSyncDispatchTimeoutError(args.timeoutMs));
        }, args.timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function executeOrgCrmSyncDispatchWithRetry<T>(args: {
  timeoutMs: number;
  maxAttempts: number;
  operation: () => Promise<T>;
}): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    try {
      return await withOrgCrmSyncDispatchTimeout({
        timeoutMs: args.timeoutMs,
        operation: args.operation,
      });
    } catch (error) {
      lastError = error;
      if (attempt < args.maxAttempts && isRetryableOrgCrmSyncDispatchError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw (
    lastError
    ?? new Error("org_crm_sync_dispatch_failed")
  );
}

export function buildOrgCrmSyncActivitySummary(args: {
  summary?: string;
  projectionName?: string;
  sessionId?: string;
  turnId?: string;
  correlationId?: string;
}): string {
  const baseSummary =
    normalizeNonEmptyString(args.summary)
    || normalizeNonEmptyString(args.projectionName)
    || "Org CRM projection sync";
  const contextParts = [
    normalizeNonEmptyString(args.sessionId)
      ? `session=${args.sessionId}`
      : null,
    normalizeNonEmptyString(args.turnId)
      ? `turn=${args.turnId}`
      : null,
    normalizeNonEmptyString(args.correlationId)
      ? `correlation=${args.correlationId}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const summary =
    contextParts.length > 0
      ? `${baseSummary} [${contextParts.join(", ")}]`
      : baseSummary;
  return summary.length > 1200 ? summary.slice(0, 1200) : summary;
}

export function resolveNarrowCrmSyncOperationPlan(args: {
  hasContactEmail: boolean;
  hasOrganizationPayload: boolean;
  hasActivitySummary: boolean;
  supportsOrganizationUpsert: boolean;
  supportsActivityAppend: boolean;
}): OrgCrmSyncOperationPlan {
  return {
    contact: args.hasContactEmail ? "applied" : "skipped_missing_data",
    organization: args.hasOrganizationPayload
      ? (args.supportsOrganizationUpsert ? "applied" : "skipped_unsupported")
      : "skipped_missing_data",
    activity: args.hasActivitySummary
      ? (args.supportsActivityAppend ? "applied" : "skipped_unsupported")
      : "skipped_missing_data",
  };
}

async function findOrCreateOrganization(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    name: string;
    website?: string;
    industry?: string;
    // BACKWARD COMPATIBLE: Support old single address
    address?: AddressData;
    // NEW: Support multiple addresses
    addresses?: Array<{
      type: "billing" | "shipping" | "mailing" | "physical" | "warehouse" | "other";
      isPrimary: boolean;
      label?: string;
      street?: string;
      street2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }>;
    taxId?: string;
    billingEmail?: string;
    phone?: string;
    performedBy?: Id<"users"> | Id<"objects">; // Optional - platform user or frontend_user
  }
): Promise<Id<"objects">> {
  // 1. Try to find existing organization by name (case-insensitive match)
  const existingOrgs = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
    )
    .collect();

  const existingOrg = existingOrgs.find(
    (org) => org.name.toLowerCase() === args.name.toLowerCase()
  );

  // Handle addresses: convert old address format to new format if needed
  let addressesToStore = args.addresses;
  if (!addressesToStore && args.address) {
    // Backward compatibility: convert single address to addresses array
    addressesToStore = [{
      type: "mailing" as const,
      isPrimary: true,
      label: "Primary Address",
      ...args.address,
    }];
  }

  if (existingOrg) {
    // Update existing organization with new information (merge data)
    const updatedProperties = {
      ...existingOrg.customProperties,
      // Only update fields that are provided and not empty
      ...(args.website && { website: args.website }),
      ...(args.industry && { industry: args.industry }),
      ...(args.address && { address: args.address }),
      ...(addressesToStore && { addresses: addressesToStore }),
      ...(args.taxId && { taxId: args.taxId }),
      ...(args.billingEmail && { billingEmail: args.billingEmail }),
      ...(args.phone && { phone: args.phone }),
    };

    await ctx.db.patch(existingOrg._id, {
      customProperties: updatedProperties,
      updatedAt: Date.now(),
    });

    return existingOrg._id;
  }

  // 2. Create new organization
  const orgId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "crm_organization",
    subtype: "prospect", // Default to prospect, can be upgraded to customer later
    name: args.name,
    description: `${args.industry || "Company"} organization`,
    status: "active",
    customProperties: {
      website: args.website,
      industry: args.industry,
      // Keep old address for backward compatibility
      address: args.address,
      // Add new addresses array
      addresses: addressesToStore,
      taxId: args.taxId,
      billingEmail: args.billingEmail,
      phone: args.phone,
      tags: ["api-created"],
      source: "api",
    },
    createdBy: args.performedBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Log creation (only if performedBy provided)
  if (args.performedBy) {
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: orgId,
      actionType: "created",
      actionData: {
        source: "api",
        subtype: "prospect",
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });
  }

  return orgId;
}

/**
 * CREATE CONTACT FROM EVENT (INTERNAL)
 *
 * Creates a CRM contact and optionally links it to an event.
 * Events are OPTIONAL - contact can be created standalone.
 * Handles deduplication by email.
 */
export const createContactFromEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.optional(v.id("objects")), // Optional event to link to
    eventName: v.optional(v.string()), // Optional, only used for metadata
    eventDate: v.optional(v.number()), // Optional, only used for metadata
    attendeeInfo: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
      tags: v.optional(v.array(v.string())), // Custom tags from frontend
    }),
    // Optional organization data
    organizationInfo: v.optional(v.object({
      name: v.string(),
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      // BACKWARD COMPATIBLE: Support old single address
      address: v.optional(v.object({
        street: v.optional(v.string()),
        street2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      // NEW: Support multiple addresses
      addresses: v.optional(addressesValidator),
      taxId: v.optional(v.string()),
      billingEmail: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Verify event exists (if eventId provided)
    let eventObjectId: Id<"objects"> | undefined;

    if (args.eventId) {
      const existingEvent = await ctx.db.get(args.eventId);
      if (!existingEvent || existingEvent.type !== "event") {
        console.warn(`Event ${args.eventId} not found - creating contact without event link`);
        eventObjectId = undefined; // Don't link to non-existent event
      } else if (existingEvent.organizationId !== args.organizationId) {
        console.warn(`Event ${args.eventId} belongs to different organization - creating contact without event link`);
        eventObjectId = undefined; // Don't link to event from different org
      } else {
        eventObjectId = args.eventId;
      }
    }

    // 2. Check if contact already exists by email (deduplication)
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.attendeeInfo.email
    );

    let contactId: Id<"objects">;
    let isNewContact = true;

    if (existingContact) {
      // Contact exists - update with new information (merge data)
      console.log(`♻️ UPSERT: Updating existing contact for ${args.attendeeInfo.email}`);
      contactId = existingContact._id;
      isNewContact = false;

      // Merge existing tags with new tags (deduplicate)
      const existingTags = (existingContact.customProperties?.tags as string[]) || [];
      const newTags = args.attendeeInfo.tags || [];
      const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

      // Update contact with merged data (UPSERT: update name if different)
      const updatedProperties = {
        ...existingContact.customProperties,
        // Update name fields (allow name changes)
        firstName: args.attendeeInfo.firstName,
        lastName: args.attendeeInfo.lastName,
        // Update phone if provided and not already set
        phone: args.attendeeInfo.phone || existingContact.customProperties?.phone,
        // Update company if provided and not already set
        company: args.attendeeInfo.company || existingContact.customProperties?.company,
        // Merge tags
        tags: mergedTags,
        // Track that this contact was updated via event
        lastEventSource: eventObjectId,
        lastEventUpdate: Date.now(),
      };

      // Construct updated full name
      const updatedFullName = `${args.attendeeInfo.firstName} ${args.attendeeInfo.lastName}`;

      await ctx.db.patch(existingContact._id, {
        name: updatedFullName, // Update the display name too!
        customProperties: updatedProperties,
        updatedAt: Date.now(),
      });

      // Log update action
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: contactId,
        actionType: eventObjectId ? "updated_from_event" : "updated_via_api",
        actionData: {
          eventId: eventObjectId,
          eventName: args.eventName,
          source: "api",
          fieldsUpdated: ["firstName", "lastName", "name", "tags", "lastActivity"],
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });

      console.log(`✅ Updated contact ${contactId}: "${updatedFullName}" (${args.attendeeInfo.email})`);
    } else {
      // Create new contact as "lead"
      console.log(`➕ Creating NEW contact for ${args.attendeeInfo.email}`);
      contactId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_contact",
        subtype: "lead",
        name: `${args.attendeeInfo.firstName} ${args.attendeeInfo.lastName}`,
        description: eventObjectId ? "Contact from event registration (API)" : "Contact created via API",
        status: "active",
        customProperties: {
          firstName: args.attendeeInfo.firstName,
          lastName: args.attendeeInfo.lastName,
          email: args.attendeeInfo.email,
          phone: args.attendeeInfo.phone,
          company: args.attendeeInfo.company,
          source: "api",
          sourceRef: eventObjectId,
          tags: args.attendeeInfo.tags || [], // Use tags from request, default to empty array
          createdFromEvent: !!eventObjectId, // Only true if linked to an event
        },
        createdBy: args.performedBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Log contact creation
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: contactId,
        actionType: eventObjectId ? "created_from_event" : "created",
        actionData: {
          eventId: eventObjectId,
          eventName: args.eventName,
          source: "api",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });

      console.log(`✅ Created NEW contact ${contactId}: "${args.attendeeInfo.firstName} ${args.attendeeInfo.lastName}" (${args.attendeeInfo.email})`);
    }

    // 3. Handle CRM organization (if organizationInfo provided OR company name exists)
    let crmOrganizationId: Id<"objects"> | undefined;

    // Determine organization name from organizationInfo or company field
    const orgName = args.organizationInfo?.name || args.attendeeInfo.company;

    if (orgName) {
      // Create or find organization
      crmOrganizationId = await findOrCreateOrganization(ctx, {
        organizationId: args.organizationId,
        name: orgName,
        website: args.organizationInfo?.website,
        industry: args.organizationInfo?.industry,
        address: args.organizationInfo?.address,
        addresses: args.organizationInfo?.addresses,
        taxId: args.organizationInfo?.taxId,
        billingEmail: args.organizationInfo?.billingEmail,
        phone: args.organizationInfo?.phone,
        performedBy: args.performedBy,
      });

      // Link contact to CRM organization (if not already linked)
      const orgLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q) => q.eq("fromObjectId", contactId))
        .collect();

      const existingOrgLink = orgLinks.find(
        (link) => link.toObjectId === crmOrganizationId && link.linkType === "works_at"
      );

      if (!existingOrgLink) {
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: contactId,
          toObjectId: crmOrganizationId,
          linkType: "works_at",
          properties: {
            source: "api",
            linkedAt: Date.now(),
          },
          createdBy: args.performedBy,
          createdAt: Date.now(),
        });

        // Log organization linking
        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: contactId,
          actionType: "linked_to_organization",
          actionData: {
            crmOrganizationId,
            organizationName: orgName,
            source: "api",
          },
          performedBy: args.performedBy,
          performedAt: Date.now(),
        });
      }
    }

    // 4. Link contact to event (ONLY if eventObjectId exists)
    if (eventObjectId) {
      const existingLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q) =>
          q.eq("fromObjectId", contactId)
        )
        .collect();

      const existingLink = existingLinks.find(
        (link) => link.toObjectId === eventObjectId
      );

      if (!existingLink) {
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: contactId,
          toObjectId: eventObjectId,
          linkType: "registered_for",
          properties: {
            registeredAt: Date.now(),
            source: "api",
          },
          createdBy: args.performedBy,
          createdAt: Date.now(),
        });

        // Log link creation
        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: contactId,
          actionType: "linked_to_event",
          actionData: {
            eventId: eventObjectId,
            eventName: args.eventName,
            source: "api",
          },
          performedBy: args.performedBy,
          performedAt: Date.now(),
        });
      }
    }

    return {
      contactId,
      eventId: eventObjectId,
      crmOrganizationId,
      organizationId: args.organizationId,
      isNewContact,
    };
  },
});

/**
 * CREATE CONTACT (INTERNAL)
 *
 * Creates a generic CRM contact.
 * Handles deduplication by email.
 */
export const createContactInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
    // Optional organization data
    organizationInfo: v.optional(v.object({
      name: v.string(),
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      // BACKWARD COMPATIBLE: Support old single address
      address: v.optional(v.object({
        street: v.optional(v.string()),
        street2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      // NEW: Support multiple addresses
      addresses: v.optional(addressesValidator),
      taxId: v.optional(v.string()),
      billingEmail: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),
    performedBy: v.optional(v.id("users")), // Optional for guest registrations
  },
  handler: async (ctx, args) => {
    // 1. Check if contact already exists by email (deduplication)
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.email
    );

    let contactId: Id<"objects">;
    let isNewContact = true;

    if (existingContact) {
      // Contact exists - update with merged data instead of throwing error
      contactId = existingContact._id;
      isNewContact = false;

      // Merge existing tags with new tags (deduplicate)
      const existingTags = (existingContact.customProperties?.tags as string[]) || [];
      const newTags = args.tags || [];
      const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

      // Update contact with merged data
      const updatedProperties = {
        ...existingContact.customProperties,
        // Update name fields if provided
        firstName: args.firstName || existingContact.customProperties?.firstName,
        lastName: args.lastName || existingContact.customProperties?.lastName,
        // Update fields if provided and not already set
        phone: args.phone || existingContact.customProperties?.phone,
        company: args.company || existingContact.customProperties?.company,
        jobTitle: args.jobTitle || existingContact.customProperties?.jobTitle,
        notes: args.notes || existingContact.customProperties?.notes,
        // Merge tags
        tags: mergedTags,
        // Merge custom fields
        ...(args.customFields as Record<string, unknown> | undefined || {}),
      };

      // Construct full name from updated properties
      const firstName = updatedProperties.firstName as string;
      const lastName = updatedProperties.lastName as string;
      const fullName = `${firstName} ${lastName}`;

      await ctx.db.patch(existingContact._id, {
        name: fullName,
        customProperties: updatedProperties,
        updatedAt: Date.now(),
      });

      // Log update action (only if performedBy is provided)
      if (args.performedBy) {
        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: contactId,
          actionType: "updated_via_api",
          actionData: {
            source: args.source || "api",
            fieldsUpdated: ["firstName", "lastName", "tags", "phone", "company", "jobTitle"],
          },
          performedBy: args.performedBy,
          performedAt: Date.now(),
        });
      }
    } else {
      // 2. Create new contact
      contactId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_contact",
        subtype: args.subtype,
        name: `${args.firstName} ${args.lastName}`,
        description: args.jobTitle || "Contact",
        status: "active",
        customProperties: {
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          phone: args.phone,
          company: args.company,
          jobTitle: args.jobTitle,
          source: args.source || "api",
          sourceRef: args.sourceRef,
          tags: args.tags || ["api-created"],
          notes: args.notes,
          ...(args.customFields as Record<string, unknown> | undefined || {}),
        },
        createdBy: args.performedBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 3. Log creation action (only if performedBy is provided)
      if (args.performedBy) {
        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: contactId,
          actionType: "created",
          actionData: {
            source: args.source || "api",
            subtype: args.subtype,
          },
          performedBy: args.performedBy,
          performedAt: Date.now(),
        });
      }
    }

    // 4. Handle CRM organization (if organizationInfo provided OR company name exists)
    let crmOrganizationId: Id<"objects"> | undefined;
    const orgName = args.organizationInfo?.name || args.company;

    if (orgName) {
      // Create or find organization
      crmOrganizationId = await findOrCreateOrganization(ctx, {
        organizationId: args.organizationId,
        name: orgName,
        website: args.organizationInfo?.website,
        industry: args.organizationInfo?.industry,
        address: args.organizationInfo?.address,
        addresses: args.organizationInfo?.addresses,
        taxId: args.organizationInfo?.taxId,
        billingEmail: args.organizationInfo?.billingEmail,
        phone: args.organizationInfo?.phone,
        performedBy: args.performedBy,
      });

      // Link contact to CRM organization (if not already linked)
      const orgLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q) => q.eq("fromObjectId", contactId))
        .collect();

      const existingOrgLink = orgLinks.find(
        (link) => link.toObjectId === crmOrganizationId && link.linkType === "works_at"
      );

      if (!existingOrgLink) {
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: contactId,
          toObjectId: crmOrganizationId,
          linkType: "works_at",
          properties: {
            source: "api",
            linkedAt: Date.now(),
            jobTitle: args.jobTitle,
          },
          createdBy: args.performedBy,
          createdAt: Date.now(),
        });

        // Log organization linking
        await ctx.db.insert("objectActions", {
          organizationId: args.organizationId,
          objectId: contactId,
          actionType: "linked_to_organization",
          actionData: {
            crmOrganizationId,
            organizationName: orgName,
            source: "api",
          },
          performedBy: args.performedBy,
          performedAt: Date.now(),
        });
      }
    }

    return {
      contactId,
      crmOrganizationId,
      isNewContact,
    };
  },
});

/**
 * LIST CONTACTS (INTERNAL)
 *
 * Lists CRM contacts with filtering and pagination.
 */
export const listContactsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all contacts for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      );

    const allContacts = await query.collect();

    // 2. Apply filters
    let filteredContacts = allContacts;

    if (args.subtype) {
      filteredContacts = filteredContacts.filter(
        (c) => c.subtype === args.subtype
      );
    }

    if (args.status) {
      filteredContacts = filteredContacts.filter(
        (c) => c.status === args.status
      );
    }

    if (args.source) {
      filteredContacts = filteredContacts.filter(
        (c) => c.customProperties?.source === args.source
      );
    }

    // 3. Sort by creation date (newest first)
    filteredContacts.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredContacts.length;
    const paginatedContacts = filteredContacts.slice(
      args.offset,
      args.offset + args.limit
    );

    // 5. Format response
    const contacts = paginatedContacts.map((contact) => ({
      id: contact._id,
      organizationId: contact.organizationId,
      name: contact.name,
      firstName: contact.customProperties?.firstName,
      lastName: contact.customProperties?.lastName,
      email: contact.customProperties?.email,
      phone: contact.customProperties?.phone,
      company: contact.customProperties?.company,
      jobTitle: contact.customProperties?.jobTitle,
      subtype: contact.subtype,
      status: contact.status,
      source: contact.customProperties?.source,
      tags: contact.customProperties?.tags || [],
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }));

    return {
      contacts,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET CONTACT (INTERNAL)
 *
 * Gets a specific CRM contact by ID.
 */
export const getContactInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get contact
    const contact = await ctx.db.get(args.contactId as Id<"objects">);

    if (!contact) {
      return null;
    }

    // 2. Verify organization access
    if (contact.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's a CRM contact
    if (contact.type !== "crm_contact") {
      return null;
    }

    // 4. Format response
    return {
      id: contact._id,
      organizationId: contact.organizationId,
      name: contact.name,
      firstName: contact.customProperties?.firstName,
      lastName: contact.customProperties?.lastName,
      email: contact.customProperties?.email,
      phone: contact.customProperties?.phone,
      company: contact.customProperties?.company,
      jobTitle: contact.customProperties?.jobTitle,
      subtype: contact.subtype,
      status: contact.status,
      source: contact.customProperties?.source,
      sourceRef: contact.customProperties?.sourceRef,
      tags: contact.customProperties?.tags || [],
      notes: contact.customProperties?.notes,
      customFields: contact.customProperties,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  },
});

/**
 * BULK IMPORT CONTACTS (INTERNAL)
 *
 * Imports multiple CRM contacts at once.
 * Handles deduplication by email - existing contacts are updated.
 * Requires Starter+ tier (contactImportExportEnabled feature).
 *
 * @param contacts - Array of contacts to import (max 1000 per batch)
 * @returns Import results with created/updated counts
 */
export const bulkImportContactsInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    contacts: v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      subtype: v.optional(v.string()), // "customer" | "lead" | "prospect"
      source: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
      customFields: v.optional(v.any()),
    })),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const results = {
      total: args.contacts.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Get existing contacts for deduplication
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    // Build email -> contact map for fast lookup
    const emailToContact = new Map<string, typeof existingContacts[0]>();
    for (const contact of existingContacts) {
      const email = contact.customProperties?.email as string | undefined;
      if (email) {
        emailToContact.set(email.toLowerCase(), contact);
      }
    }

    // Process each contact
    for (const contactData of args.contacts) {
      try {
        // Validate required fields
        if (!contactData.email || !contactData.firstName || !contactData.lastName) {
          results.failed++;
          results.errors.push({
            email: contactData.email || "unknown",
            error: "Missing required fields: firstName, lastName, email",
          });
          continue;
        }

        const emailLower = contactData.email.toLowerCase();
        const existingContact = emailToContact.get(emailLower);

        if (existingContact) {
          // Update existing contact
          const existingTags = (existingContact.customProperties?.tags as string[]) || [];
          const newTags = contactData.tags || [];
          const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

          const updatedProperties = {
            ...existingContact.customProperties,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            phone: contactData.phone || existingContact.customProperties?.phone,
            company: contactData.company || existingContact.customProperties?.company,
            jobTitle: contactData.jobTitle || existingContact.customProperties?.jobTitle,
            notes: contactData.notes || existingContact.customProperties?.notes,
            tags: mergedTags,
            ...((contactData.customFields as Record<string, unknown> | undefined) || {}),
            lastBulkImport: Date.now(),
          };

          await ctx.db.patch(existingContact._id, {
            name: `${contactData.firstName} ${contactData.lastName}`,
            subtype: contactData.subtype || existingContact.subtype,
            customProperties: updatedProperties,
            updatedAt: Date.now(),
          });

          results.updated++;
        } else {
          // Create new contact
          const contactId = await ctx.db.insert("objects", {
            organizationId: args.organizationId,
            type: "crm_contact",
            subtype: contactData.subtype || "lead",
            name: `${contactData.firstName} ${contactData.lastName}`,
            description: contactData.jobTitle || "Contact",
            status: "active",
            customProperties: {
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              email: contactData.email,
              phone: contactData.phone,
              company: contactData.company,
              jobTitle: contactData.jobTitle,
              source: contactData.source || "bulk-import",
              tags: contactData.tags || ["bulk-imported"],
              notes: contactData.notes,
              ...((contactData.customFields as Record<string, unknown> | undefined) || {}),
              importedAt: Date.now(),
            },
            createdBy: args.performedBy,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          // Add to map for subsequent deduplication within same batch
          const newContact = await ctx.db.get(contactId);
          if (newContact) {
            emailToContact.set(emailLower, newContact);
          }

          results.created++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: contactData.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log bulk import action (only if performedBy is provided)
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: args.organizationId as unknown as Id<"objects">, // Log against org
        actionType: "bulk_import",
        actionData: {
          source: "api",
          totalContacts: results.total,
          created: results.created,
          updated: results.updated,
          failed: results.failed,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return results;
  },
});

/**
 * UPDATE CONTACT (INTERNAL)
 *
 * Updates an existing CRM contact.
 */
export const updateContactInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.string(),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      subtype: v.optional(v.string()), // "customer" | "lead" | "prospect"
      status: v.optional(v.string()), // "active" | "inactive" | "unsubscribed" | "archived"
      tags: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
      customFields: v.optional(v.any()),
      // Address support
      address: v.optional(v.object({
        street: v.optional(v.string()),
        street2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      addresses: v.optional(addressesValidator),
    }),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get contact
    const contact = await ctx.db.get(args.contactId as Id<"objects">);

    if (!contact) {
      throw new Error("Contact not found");
    }

    // 2. Verify organization access
    if (contact.organizationId !== args.organizationId) {
      throw new Error("Contact not found");
    }

    // 3. Verify it's a CRM contact
    if (contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    // 4. Build updated properties
    const currentProps = (contact.customProperties || {}) as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    if (args.updates.firstName !== undefined) updatedProps.firstName = args.updates.firstName;
    if (args.updates.lastName !== undefined) updatedProps.lastName = args.updates.lastName;
    if (args.updates.email !== undefined) updatedProps.email = args.updates.email;
    if (args.updates.phone !== undefined) updatedProps.phone = args.updates.phone;
    if (args.updates.jobTitle !== undefined) updatedProps.jobTitle = args.updates.jobTitle;
    if (args.updates.company !== undefined) updatedProps.company = args.updates.company;
    if (args.updates.tags !== undefined) updatedProps.tags = args.updates.tags;
    if (args.updates.notes !== undefined) updatedProps.notes = args.updates.notes;
    if (args.updates.address !== undefined) updatedProps.address = args.updates.address;
    if (args.updates.addresses !== undefined) updatedProps.addresses = args.updates.addresses;
    if (args.updates.customFields !== undefined) {
      const customFields = args.updates.customFields as Record<string, unknown> | undefined;
      if (customFields) {
        Object.assign(updatedProps, customFields);
      }
    }

    // 5. Update name if first/last name changed
    let newName = contact.name;
    if (args.updates.firstName || args.updates.lastName) {
      const firstName = args.updates.firstName || currentProps.firstName || "";
      const lastName = args.updates.lastName || currentProps.lastName || "";
      newName = `${firstName} ${lastName}`.trim();
    }

    // 6. Apply updates
    await ctx.db.patch(contact._id, {
      name: newName,
      subtype: args.updates.subtype || contact.subtype,
      status: args.updates.status || contact.status,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    // 7. Log update action (only if performedBy is provided)
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: contact._id,
        actionType: "updated_via_api",
        actionData: {
          source: "api",
          fieldsUpdated: Object.keys(args.updates).filter((k) => args.updates[k as keyof typeof args.updates] !== undefined),
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * DELETE CONTACT (INTERNAL)
 *
 * Permanently deletes a CRM contact and all associated links.
 */
export const deleteContactInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get contact
    const contact = await ctx.db.get(args.contactId as Id<"objects">);

    if (!contact) {
      throw new Error("Contact not found");
    }

    // 2. Verify organization access
    if (contact.organizationId !== args.organizationId) {
      throw new Error("Contact not found");
    }

    // 3. Verify it's a CRM contact
    if (contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    // 4. Log deletion action BEFORE deleting (so we have the data)
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: contact._id,
        actionType: "deleted_via_api",
        actionData: {
          contactName: contact.name,
          email: contact.customProperties?.email,
          source: "api",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    // 5. Delete all links involving this contact
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", contact._id))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", contact._id))
      .collect();

    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    // 6. Permanently delete the contact
    await ctx.db.delete(contact._id);

    return { success: true };
  },
});

// ============================================================================
// CRM ORGANIZATION OPERATIONS (FOR CLI API)
// ============================================================================

/**
 * CREATE CRM ORGANIZATION (INTERNAL)
 *
 * Creates a CRM organization (company/account).
 */
export const createCrmOrganizationInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(), // "customer" | "prospect" | "partner" | "sponsor"
    name: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()), // "1-10" | "11-50" | "51-200" | "201-500" | "501+"
    address: v.optional(v.object({
      street: v.optional(v.string()),
      street2: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    addresses: v.optional(addressesValidator),
    phone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Handle addresses: convert old address format to new format if needed
    let addressesToStore = args.addresses;
    if (!addressesToStore && args.address) {
      addressesToStore = [{
        type: "mailing" as const,
        isPrimary: true,
        label: "Primary Address",
        ...args.address,
      }];
    }

    // Create organization
    const orgId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_organization",
      subtype: args.subtype,
      name: args.name,
      description: `${args.industry || "Company"} organization`,
      status: "active",
      customProperties: {
        website: args.website,
        industry: args.industry,
        size: args.size,
        address: args.address,
        addresses: addressesToStore,
        phone: args.phone,
        taxId: args.taxId,
        billingEmail: args.billingEmail,
        tags: args.tags || ["api-created"],
        notes: args.notes,
        source: "api",
        ...((args.customFields as Record<string, unknown> | undefined) || {}),
      },
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: orgId,
        actionType: "created",
        actionData: {
          source: "api",
          subtype: args.subtype,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { crmOrganizationId: orgId };
  },
});

/**
 * LIST CRM ORGANIZATIONS (INTERNAL)
 *
 * Lists CRM organizations with filtering and pagination.
 */
export const listCrmOrganizationsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all CRM organizations for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      );

    const allOrgs = await query.collect();

    // 2. Apply filters
    let filteredOrgs = allOrgs;

    if (args.subtype) {
      filteredOrgs = filteredOrgs.filter((o) => o.subtype === args.subtype);
    }

    if (args.status) {
      filteredOrgs = filteredOrgs.filter((o) => o.status === args.status);
    }

    // 3. Sort by creation date (newest first)
    filteredOrgs.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredOrgs.length;
    const paginatedOrgs = filteredOrgs.slice(args.offset, args.offset + args.limit);

    // 5. Format response
    const organizations = paginatedOrgs.map((org) => ({
      id: org._id,
      organizationId: org.organizationId,
      name: org.name,
      subtype: org.subtype,
      status: org.status,
      website: org.customProperties?.website,
      industry: org.customProperties?.industry,
      size: org.customProperties?.size,
      address: org.customProperties?.address,
      addresses: org.customProperties?.addresses,
      phone: org.customProperties?.phone,
      taxId: org.customProperties?.taxId,
      billingEmail: org.customProperties?.billingEmail,
      tags: org.customProperties?.tags || [],
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));

    return {
      organizations,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET CRM ORGANIZATION (INTERNAL)
 *
 * Gets a specific CRM organization by ID.
 */
export const getCrmOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    crmOrganizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get organization
    const org = await ctx.db.get(args.crmOrganizationId as Id<"objects">);

    if (!org) {
      return null;
    }

    // 2. Verify organization access
    if (org.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's a CRM organization
    if (org.type !== "crm_organization") {
      return null;
    }

    // 4. Format response
    return {
      id: org._id,
      organizationId: org.organizationId,
      name: org.name,
      subtype: org.subtype,
      status: org.status,
      website: org.customProperties?.website,
      industry: org.customProperties?.industry,
      size: org.customProperties?.size,
      address: org.customProperties?.address,
      addresses: org.customProperties?.addresses,
      phone: org.customProperties?.phone,
      taxId: org.customProperties?.taxId,
      billingEmail: org.customProperties?.billingEmail,
      tags: org.customProperties?.tags || [],
      notes: org.customProperties?.notes,
      customFields: org.customProperties,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  },
});

/**
 * UPDATE CRM ORGANIZATION (INTERNAL)
 *
 * Updates an existing CRM organization.
 */
export const updateCrmOrganizationInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    crmOrganizationId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      subtype: v.optional(v.string()), // "customer" | "prospect" | "partner" | "sponsor"
      status: v.optional(v.string()), // "active" | "inactive" | "archived"
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      size: v.optional(v.string()),
      address: v.optional(v.object({
        street: v.optional(v.string()),
        street2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      addresses: v.optional(addressesValidator),
      phone: v.optional(v.string()),
      taxId: v.optional(v.string()),
      billingEmail: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
      customFields: v.optional(v.any()),
    }),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get organization
    const org = await ctx.db.get(args.crmOrganizationId as Id<"objects">);

    if (!org) {
      throw new Error("CRM organization not found");
    }

    // 2. Verify organization access
    if (org.organizationId !== args.organizationId) {
      throw new Error("CRM organization not found");
    }

    // 3. Verify it's a CRM organization
    if (org.type !== "crm_organization") {
      throw new Error("CRM organization not found");
    }

    // 4. Build updated properties
    const currentProps = (org.customProperties || {}) as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    if (args.updates.website !== undefined) updatedProps.website = args.updates.website;
    if (args.updates.industry !== undefined) updatedProps.industry = args.updates.industry;
    if (args.updates.size !== undefined) updatedProps.size = args.updates.size;
    if (args.updates.address !== undefined) updatedProps.address = args.updates.address;
    if (args.updates.addresses !== undefined) updatedProps.addresses = args.updates.addresses;
    if (args.updates.phone !== undefined) updatedProps.phone = args.updates.phone;
    if (args.updates.taxId !== undefined) updatedProps.taxId = args.updates.taxId;
    if (args.updates.billingEmail !== undefined) updatedProps.billingEmail = args.updates.billingEmail;
    if (args.updates.tags !== undefined) updatedProps.tags = args.updates.tags;
    if (args.updates.notes !== undefined) updatedProps.notes = args.updates.notes;
    if (args.updates.customFields !== undefined) {
      const customFields = args.updates.customFields as Record<string, unknown> | undefined;
      if (customFields) {
        Object.assign(updatedProps, customFields);
      }
    }

    // 5. Apply updates
    await ctx.db.patch(org._id, {
      name: args.updates.name || org.name,
      subtype: args.updates.subtype || org.subtype,
      status: args.updates.status || org.status,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    // 6. Log update action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: org._id,
        actionType: "updated_via_api",
        actionData: {
          source: "api",
          fieldsUpdated: Object.keys(args.updates).filter((k) => args.updates[k as keyof typeof args.updates] !== undefined),
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * EXPORT CONTACTS (INTERNAL)
 *
 * Exports all CRM contacts for an organization.
 * Requires Starter+ tier (contactImportExportEnabled feature).
 *
 * @param filters - Optional filters for export
 * @param format - Export format: "json" or "csv"
 * @returns Array of contacts in requested format
 */
export const exportContactsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAfter: v.optional(v.number()),
    createdBefore: v.optional(v.number()),
    format: v.optional(v.union(v.literal("json"), v.literal("csv"))),
  },
  handler: async (ctx, args) => {
    // 1. Query all contacts for organization
    const allContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    // 2. Apply filters
    let filteredContacts = allContacts;

    if (args.subtype) {
      filteredContacts = filteredContacts.filter(
        (c) => c.subtype === args.subtype
      );
    }

    if (args.status) {
      filteredContacts = filteredContacts.filter(
        (c) => c.status === args.status
      );
    }

    if (args.source) {
      filteredContacts = filteredContacts.filter(
        (c) => c.customProperties?.source === args.source
      );
    }

    if (args.tags && args.tags.length > 0) {
      filteredContacts = filteredContacts.filter((c) => {
        const contactTags = (c.customProperties?.tags as string[]) || [];
        return args.tags!.some((tag) => contactTags.includes(tag));
      });
    }

    if (args.createdAfter) {
      filteredContacts = filteredContacts.filter(
        (c) => c.createdAt >= args.createdAfter!
      );
    }

    if (args.createdBefore) {
      filteredContacts = filteredContacts.filter(
        (c) => c.createdAt <= args.createdBefore!
      );
    }

    // 3. Sort by creation date (newest first)
    filteredContacts.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Format contacts for export
    const contacts = filteredContacts.map((contact) => ({
      id: contact._id,
      firstName: contact.customProperties?.firstName || "",
      lastName: contact.customProperties?.lastName || "",
      email: contact.customProperties?.email || "",
      phone: contact.customProperties?.phone || "",
      company: contact.customProperties?.company || "",
      jobTitle: contact.customProperties?.jobTitle || "",
      subtype: contact.subtype || "",
      status: contact.status || "",
      source: contact.customProperties?.source || "",
      tags: (contact.customProperties?.tags as string[]) || [],
      notes: contact.customProperties?.notes || "",
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }));

    // 5. Return based on format
    if (args.format === "csv") {
      // Convert to CSV format
      const headers = [
        "id",
        "firstName",
        "lastName",
        "email",
        "phone",
        "company",
        "jobTitle",
        "subtype",
        "status",
        "source",
        "tags",
        "notes",
        "createdAt",
        "updatedAt",
      ];

      const csvRows = [headers.join(",")];

      for (const contact of contacts) {
        const row = headers.map((header) => {
          const value = contact[header as keyof typeof contact];
          if (Array.isArray(value)) {
            return `"${value.join(";")}"`;
          }
          if (typeof value === "string") {
            // Escape quotes and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value ?? "");
        });
        csvRows.push(row.join(","));
      }

      return {
        format: "csv" as const,
        total: contacts.length,
        data: csvRows.join("\n"),
      };
    }

    // Default: JSON format
    return {
      format: "json" as const,
      total: contacts.length,
      contacts,
    };
  },
});

async function getScopedObjectSnapshot(args: {
  ctx: ActionCtx;
  organizationId: Id<"organizations">;
  objectId: Id<"objects"> | null;
}): Promise<SyncObjectSnapshot | null> {
  if (!args.objectId) {
    return null;
  }
  const object = await (args.ctx as any).runQuery(
    generatedApi.internal.objectsInternal.getObjectInternal,
    { objectId: args.objectId },
  );
  if (!object || object.organizationId !== args.organizationId) {
    return null;
  }
  return object as SyncObjectSnapshot;
}

async function resolveActiveCampaignConnectionId(args: {
  ctx: ActionCtx;
  organizationId: Id<"organizations">;
}): Promise<Id<"oauthConnections"> | null> {
  const connection = await (args.ctx as any).runQuery(
    generatedApi.internal.oauth.activecampaign.getConnectionByOrg,
    { organizationId: args.organizationId },
  );
  return (connection?._id as Id<"oauthConnections"> | undefined) || null;
}

function resolveSupportedConnectorKey(
  connectorKey: string | null,
): SupportedNarrowSyncConnectorKey | null {
  if (connectorKey === ACTIVE_CAMPAIGN_CONNECTOR_KEY) {
    return connectorKey;
  }
  return null;
}

async function dispatchCandidateToActiveCampaign(args: {
  ctx: ActionCtx;
  organizationId: Id<"organizations">;
  connectionId: Id<"oauthConnections">;
  candidate: PendingSyncCandidateRow;
  projectionObject: SyncObjectSnapshot | null;
  contactObject: SyncObjectSnapshot | null;
  organizationObject: SyncObjectSnapshot | null;
}): Promise<OrgCrmSyncDispatchOutcome> {
  const contactPayload = resolveContactPayload(args.contactObject);
  const organizationPayload = resolveOrganizationPayload(args.organizationObject);
  const activitySummary = buildOrgCrmSyncActivitySummary({
    summary:
      normalizeNonEmptyString(args.projectionObject?.description)
      || normalizeNonEmptyString(asRecord(args.projectionObject?.customProperties).summary)
      || undefined,
    projectionName: normalizeNonEmptyString(args.projectionObject?.name) || undefined,
    sessionId: args.candidate.envelope.sessionId,
    turnId: args.candidate.envelope.turnId,
    correlationId: args.candidate.envelope.correlationId,
  });

  const operationPlan = resolveNarrowCrmSyncOperationPlan({
    hasContactEmail: Boolean(contactPayload.email),
    hasOrganizationPayload: Boolean(organizationPayload.name),
    hasActivitySummary: Boolean(activitySummary),
    supportsOrganizationUpsert: false,
    supportsActivityAppend: false,
  });

  const canonicalObjectId =
    args.contactObject?._id || args.organizationObject?._id || args.projectionObject?._id;
  const canonicalObjectType =
    args.contactObject?.type
    || args.organizationObject?.type
    || args.projectionObject?.type;

  if (!contactPayload.email) {
    return {
      connectorKey: ACTIVE_CAMPAIGN_CONNECTOR_KEY,
      dispatchStatus: "skipped",
      canonicalObjectId,
      canonicalObjectType,
      errorMessage: "Missing contact email for ActiveCampaign narrow sync.",
      metadata: {
        contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
        connectorKey: ACTIVE_CAMPAIGN_CONNECTOR_KEY,
        skipReason: "missing_contact_email",
        operationPlan,
        activitySummary,
        candidateName: args.candidate.name,
      },
    };
  }

  const dispatchTimeoutMs = resolveOrgCrmSyncDispatchTimeoutMs();
  const dispatchMaxAttempts = resolveOrgCrmSyncDispatchMaxAttempts();

  try {
    const upsertedContact = await executeOrgCrmSyncDispatchWithRetry({
      timeoutMs: dispatchTimeoutMs,
      maxAttempts: dispatchMaxAttempts,
      operation: async () =>
        await (args.ctx as any).runAction(
          generatedApi.internal.oauth.activecampaign.upsertContact,
          {
            connectionId: args.connectionId,
            email: contactPayload.email,
            firstName: contactPayload.firstName,
            lastName: contactPayload.lastName,
            phone: contactPayload.phone,
          },
        ),
    });
    const upsertedContactRecord = asRecord(upsertedContact);
    const externalRecordId = normalizeNonEmptyString(upsertedContactRecord.id);

    return {
      connectorKey: ACTIVE_CAMPAIGN_CONNECTOR_KEY,
      dispatchStatus: "succeeded",
      canonicalObjectId,
      canonicalObjectType,
      externalRecordId: externalRecordId || undefined,
      externalRecordType: "activecampaign_contact",
      metadata: {
        contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
        connectorKey: ACTIVE_CAMPAIGN_CONNECTOR_KEY,
        operationPlan,
        activitySummary,
        candidateName: args.candidate.name,
        contactEmail: contactPayload.email,
        organizationName: organizationPayload.name || undefined,
      },
    };
  } catch (error) {
    return {
      connectorKey: ACTIVE_CAMPAIGN_CONNECTOR_KEY,
      dispatchStatus: "failed",
      canonicalObjectId,
      canonicalObjectType,
      errorMessage:
        error instanceof Error ? error.message : "ActiveCampaign dispatch failed.",
      metadata: {
        contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
        connectorKey: ACTIVE_CAMPAIGN_CONNECTOR_KEY,
        operationPlan: {
          ...operationPlan,
          contact: "failed",
        },
        activitySummary,
        candidateName: args.candidate.name,
        contactEmail: contactPayload.email,
      },
    };
  }
}

/**
 * DISPATCH ORG CRM SYNC OUTBOX (INTERNAL ACTION)
 *
 * Runs narrow external CRM sync V1 for pending OAR sync candidates.
 * Scope: contact upsert plus organization/activity payload planning with fail-closed
 * connector behavior. Broad external action execution remains out of scope.
 */
export const dispatchOrgCrmSyncOutboxInternal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    externalWritesEnabled: v.boolean(),
    connectorKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeOrgCrmSyncOutboxBatchLimit(args.limit);
    const normalizedConnectorKey = normalizeCrmConnectorKey(args.connectorKey);
    const supportedConnectorKey = normalizedConnectorKey
      ? resolveSupportedConnectorKey(normalizedConnectorKey)
      : ACTIVE_CAMPAIGN_CONNECTOR_KEY;

    const pendingCandidates = (await (ctx as any).runQuery(
      generatedApi.internal.ai.orgActionSyncOutbox.listPendingSyncCandidates,
      {
        organizationId: args.organizationId,
        limit,
      },
    )) as PendingSyncCandidateRow[];

    if (!pendingCandidates.length) {
      return {
        contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
        processed: 0,
        results: [],
        counts: { succeeded: 0, failed: 0, skipped: 0 },
      };
    }

    const activeCampaignConnectionId = supportedConnectorKey
      ? await resolveActiveCampaignConnectionId({
          ctx,
          organizationId: args.organizationId,
        })
      : null;

    const results: Array<{
      syncCandidateObjectId: Id<"objects">;
      dispatchStatus: "succeeded" | "failed" | "skipped";
      outboxStatus: string;
      connectorKey: string;
      attemptNumber: number;
      bindingId: string | null;
      errorMessage?: string;
      externalRecordId?: string;
      externalRecordType?: string;
    }> = [];

    for (const candidate of pendingCandidates) {
      const attemptNumber =
        typeof candidate.attemptNumber === "number"
        && Number.isFinite(candidate.attemptNumber)
        && candidate.attemptNumber > 0
          ? Math.floor(candidate.attemptNumber)
          : 1;
      const envelope = normalizeOrgCrmSyncCandidateEnvelope(candidate.envelope);

      let outcome: OrgCrmSyncDispatchOutcome;

      if (!envelope) {
        outcome = {
          connectorKey: normalizedConnectorKey || ACTIVE_CAMPAIGN_CONNECTOR_KEY,
          dispatchStatus: "failed",
          errorMessage: "Invalid sync candidate envelope.",
          metadata: {
            contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
            failureReason: "invalid_envelope",
          },
        };
      } else if (normalizedConnectorKey && !supportedConnectorKey) {
        outcome = {
          connectorKey: normalizedConnectorKey,
          dispatchStatus: "skipped",
          errorMessage: `Unsupported narrow sync connector: ${normalizedConnectorKey}.`,
          metadata: {
            contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
            skipReason: "unsupported_connector",
          },
        };
      } else {
        const dispatchMode = resolveOrgActionSyncDispatchMode({
          externalWritesEnabled: args.externalWritesEnabled,
          targetSystemClass: "external_connector",
        });
        const projectionObject = await getScopedObjectSnapshot({
          ctx,
          organizationId: args.organizationId,
          objectId: toObjectId(envelope.projectionObjectId),
        });
        const contactObject = await getScopedObjectSnapshot({
          ctx,
          organizationId: args.organizationId,
          objectId: toObjectId(envelope.targetContactObjectId),
        });
        const organizationObject = await getScopedObjectSnapshot({
          ctx,
          organizationId: args.organizationId,
          objectId: toObjectId(envelope.targetOrganizationObjectId),
        });

        if (dispatchMode !== "dispatch") {
          outcome = {
            connectorKey: supportedConnectorKey || ACTIVE_CAMPAIGN_CONNECTOR_KEY,
            dispatchStatus: "skipped",
            canonicalObjectId:
              contactObject?._id || organizationObject?._id || projectionObject?._id,
            canonicalObjectType:
              contactObject?.type || organizationObject?.type || projectionObject?.type,
            errorMessage: "External writes are disabled for narrow CRM sync.",
            metadata: {
              contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
              skipReason: "external_writes_disabled",
            },
          };
        } else if (!activeCampaignConnectionId) {
          outcome = {
            connectorKey: supportedConnectorKey || ACTIVE_CAMPAIGN_CONNECTOR_KEY,
            dispatchStatus: "skipped",
            canonicalObjectId:
              contactObject?._id || organizationObject?._id || projectionObject?._id,
            canonicalObjectType:
              contactObject?.type || organizationObject?.type || projectionObject?.type,
            errorMessage: "No active ActiveCampaign connection found for organization.",
            metadata: {
              contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
              skipReason: "no_active_connection",
            },
          };
        } else {
          outcome = await dispatchCandidateToActiveCampaign({
            ctx,
            organizationId: args.organizationId,
            connectionId: activeCampaignConnectionId,
            candidate,
            projectionObject,
            contactObject,
            organizationObject,
          });
        }
      }

      try {
        const receipt = await (ctx as any).runMutation(
          generatedApi.internal.ai.orgActionSyncOutbox.recordSyncDispatchReceipt,
          {
            organizationId: args.organizationId,
            syncCandidateObjectId: candidate.syncCandidateObjectId,
            dispatchStatus: outcome.dispatchStatus,
            connectorKey: outcome.connectorKey,
            canonicalObjectId: outcome.canonicalObjectId,
            canonicalObjectType: outcome.canonicalObjectType,
            externalRecordId: outcome.externalRecordId,
            externalRecordType: outcome.externalRecordType,
            correlationId: envelope?.correlationId,
            sessionId: envelope?.sessionId,
            syncedAt: outcome.dispatchStatus === "succeeded" ? Date.now() : undefined,
            errorMessage: outcome.errorMessage,
            attemptNumber,
            metadata: outcome.metadata,
          },
        );

        results.push({
          syncCandidateObjectId: candidate.syncCandidateObjectId,
          dispatchStatus: outcome.dispatchStatus,
          outboxStatus: receipt.outboxStatus,
          connectorKey: outcome.connectorKey,
          attemptNumber: receipt.attemptNumber,
          bindingId: receipt.bindingId ? String(receipt.bindingId) : null,
          errorMessage: outcome.errorMessage,
          externalRecordId: outcome.externalRecordId,
          externalRecordType: outcome.externalRecordType,
        });
      } catch (error) {
        results.push({
          syncCandidateObjectId: candidate.syncCandidateObjectId,
          dispatchStatus: "failed",
          outboxStatus: "failed",
          connectorKey: outcome.connectorKey,
          attemptNumber,
          bindingId: null,
          errorMessage:
            error instanceof Error
              ? `Failed to persist sync receipt: ${error.message}`
              : "Failed to persist sync receipt.",
          externalRecordId: outcome.externalRecordId,
          externalRecordType: outcome.externalRecordType,
        });
      }
    }

    const counts = results.reduce(
      (acc, result) => {
        if (result.dispatchStatus === "succeeded") {
          acc.succeeded += 1;
        } else if (result.dispatchStatus === "failed") {
          acc.failed += 1;
        } else {
          acc.skipped += 1;
        }
        return acc;
      },
      { succeeded: 0, failed: 0, skipped: 0 },
    );

    return {
      contractVersion: ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
      processed: results.length,
      counts,
      results,
    };
  },
});
