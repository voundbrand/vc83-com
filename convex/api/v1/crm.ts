/**
 * API V1: CRM ENDPOINTS
 *
 * External API for creating and managing CRM contacts.
 * Used by external websites to submit event registrations and create leads.
 *
 * Endpoints:
 * - POST /api/v1/crm/contacts/from-event - Create contact from event registration
 * - POST /api/v1/crm/contacts - Create generic contact
 * - GET /api/v1/crm/contacts - List contacts
 * - GET /api/v1/crm/contacts/:contactId - Get contact details
 *
 * Security: API key required in Authorization header
 * Scope: Returns only contacts for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * CREATE CONTACT FROM EVENT
 * Creates a CRM contact and optionally links it to an event
 *
 * POST /api/v1/crm/contacts/from-event
 *
 * Request Body:
 * {
 *   eventId?: string,          // Optional - if provided, contact will be linked to existing event
 *   eventName?: string,         // Optional - used for metadata only
 *   eventDate?: number,        // Unix timestamp - optional metadata
 *   attendeeInfo: {
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone?: string,
 *     company?: string,        // Simple company name (backward compatible)
 *     tags?: string[]          // Custom tags (will be merged with automatic tags)
 *   },
 *   organizationInfo?: {       // Optional detailed organization data
 *     name: string,            // Organization name (overrides attendeeInfo.company)
 *     website?: string,
 *     industry?: string,
 *     address?: object,
 *     taxId?: string,
 *     billingEmail?: string,
 *     phone?: string
 *   }
 * }
 *
 * Note: Contact creation is decoupled from events. The eventId is optional, and
 * if provided, the event must exist or the contact will be created without an event link.
 *
 * Response:
 * {
 *   success: true,
 *   contactId: string,
 *   eventId: string,
 *   crmOrganizationId?: string,  // ID of linked CRM organization (if created/found)
 *   organizationId: string,      // Your organization ID
 *   isNewContact: boolean,       // True if new contact, false if updated existing
 *   message: string
 * }
 */
export const createContactFromEvent = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse request body
    const body = await request.json();
    const { eventId, eventName, eventDate, attendeeInfo, organizationInfo } = body;

    // Validate required fields (eventName is optional now)
    if (!attendeeInfo?.firstName || !attendeeInfo?.lastName || !attendeeInfo?.email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: firstName, lastName, email"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create/find event and create contact
    const result = await ctx.runMutation(
      internal.api.v1.crmInternal.createContactFromEventInternal,
      {
        organizationId,
        eventId: eventId || undefined,
        eventName,
        eventDate,
        attendeeInfo: {
          firstName: attendeeInfo.firstName,
          lastName: attendeeInfo.lastName,
          email: attendeeInfo.email,
          phone: attendeeInfo.phone,
          company: attendeeInfo.company,
          tags: attendeeInfo.tags, // Pass custom tags from request
        },
        organizationInfo: organizationInfo ? {
          name: organizationInfo.name,
          website: organizationInfo.website,
          industry: organizationInfo.industry,
          address: organizationInfo.address,
          taxId: organizationInfo.taxId,
          billingEmail: organizationInfo.billingEmail,
          phone: organizationInfo.phone,
        } : undefined,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        contactId: result.contactId,
        eventId: result.eventId,
        crmOrganizationId: result.crmOrganizationId,
        organizationId: result.organizationId,
        isNewContact: result.isNewContact,
        message: result.isNewContact
          ? "Contact created successfully"
          : "Existing contact updated and linked to event",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-CRM-Organization-Id": result.crmOrganizationId || "",
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts/from-event error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE CONTACT
 * Creates a generic CRM contact
 *
 * POST /api/v1/crm/contacts
 *
 * Request Body:
 * {
 *   subtype: "lead" | "customer" | "prospect",
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   phone?: string,
 *   company?: string,           // Simple company name (backward compatible)
 *   jobTitle?: string,
 *   source?: string,
 *   sourceRef?: string,
 *   tags?: string[],
 *   notes?: string,
 *   customFields?: object,
 *   organizationInfo?: {        // Optional detailed organization data
 *     name: string,             // Organization name (overrides company field)
 *     website?: string,
 *     industry?: string,
 *     address?: object,
 *     taxId?: string,
 *     billingEmail?: string,
 *     phone?: string
 *   }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   contactId: string,
 *   crmOrganizationId?: string, // ID of linked CRM organization (if created/found)
 *   isNewContact: boolean,      // True if new contact, false if updated existing
 *   message: string
 * }
 */
export const createContact = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse request body
    const body = await request.json();
    const {
      subtype = "lead",
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      source = "api",
      sourceRef,
      tags,
      notes,
      customFields,
      organizationInfo
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: firstName, lastName, email"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create contact
    const result = await ctx.runMutation(
      internal.api.v1.crmInternal.createContactInternal,
      {
        organizationId,
        subtype,
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        source,
        sourceRef,
        tags,
        notes,
        customFields,
        organizationInfo: organizationInfo ? {
          name: organizationInfo.name,
          website: organizationInfo.website,
          industry: organizationInfo.industry,
          address: organizationInfo.address,
          taxId: organizationInfo.taxId,
          billingEmail: organizationInfo.billingEmail,
          phone: organizationInfo.phone,
        } : undefined,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        contactId: result.contactId,
        crmOrganizationId: result.crmOrganizationId,
        isNewContact: result.isNewContact,
        message: result.isNewContact
          ? "Contact created successfully"
          : "Existing contact updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
          "X-CRM-Organization-Id": result.crmOrganizationId || "",
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST CONTACTS
 * Lists CRM contacts for an organization
 *
 * GET /api/v1/crm/contacts
 *
 * Query Parameters:
 * - subtype: Filter by contact type (lead, customer, prospect)
 * - status: Filter by status (active, inactive, etc.)
 * - source: Filter by source (event, checkout, api, etc.)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   contacts: Array<{
 *     id: string,
 *     name: string,
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone: string,
 *     company: string,
 *     subtype: string,
 *     status: string,
 *     source: string,
 *     tags: string[],
 *     createdAt: number
 *   }>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listContacts = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || "active";
    const source = url.searchParams.get("source") || undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      200
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query contacts
    const result = await ctx.runQuery(
      internal.api.v1.crmInternal.listContactsInternal,
      {
        organizationId,
        subtype,
        status,
        source,
        limit,
        offset,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CONTACT
 * Gets a specific CRM contact by ID
 *
 * GET /api/v1/crm/contacts/:contactId
 *
 * Response:
 * {
 *   id: string,
 *   name: string,
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   phone: string,
 *   company: string,
 *   jobTitle: string,
 *   subtype: string,
 *   status: string,
 *   source: string,
 *   sourceRef: string,
 *   tags: string[],
 *   notes: string,
 *   customFields: object,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */
export const getContact = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract contact ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const contactId = pathParts[pathParts.length - 1];

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: "Contact ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query contact
    const contact = await ctx.runQuery(
      internal.api.v1.crmInternal.getContactInternal,
      {
        organizationId,
        contactId,
      }
    );

    if (!contact) {
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(contact),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
