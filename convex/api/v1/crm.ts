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
 * Security: Triple authentication support
 * - API keys (full access or scoped permissions)
 * - OAuth tokens (scope-based access control)
 * - CLI sessions (full organization access via MCP tools)
 * Scope: Returns only contacts for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";

const generatedApi: any = require("../../_generated/api");

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
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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

    // 3. Create/find event and create contact
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.createContactFromEventInternal,
      {
        organizationId: authContext.organizationId, // Use main org ID for event creation
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

    // 4. Return success
    return new Response(
      JSON.stringify({
        success: true,
        contactId: result.contactId,
        eventId: result.eventId,
        crmOrganizationId: result.crmOrganizationId,
        organizationId: authContext.organizationId,
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
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = authContext.userId;

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

    // 3. Create contact
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.createContactInternal,
      {
        organizationId: authContext.organizationId, // Use main org ID
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

    // 4. Return success
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
          "X-Organization-Id": authContext.organizationId,
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
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["contacts:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // 3. Query contacts
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.crmInternal.listContactsInternal,
      {
        organizationId: authContext.organizationId, // Use main org ID
        subtype,
        status,
        source,
        limit,
        offset,
      }
    );

    // 4. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
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
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["contacts:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // 3. Query contact
    const contact = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.crmInternal.getContactInternal,
      {
        organizationId: authContext.organizationId, // Use main org ID
        contactId,
      }
    );

    if (!contact) {
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Return response
    return new Response(
      JSON.stringify(contact),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
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

/**
 * BULK IMPORT CONTACTS
 * Imports multiple CRM contacts at once
 *
 * POST /api/v1/crm/contacts/bulk
 *
 * Request Body:
 * {
 *   contacts: Array<{
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone?: string,
 *     company?: string,
 *     jobTitle?: string,
 *     subtype?: "customer" | "lead" | "prospect",
 *     source?: string,
 *     tags?: string[],
 *     notes?: string,
 *     customFields?: object
 *   }>
 * }
 *
 * Response:
 * {
 *   success: true,
 *   total: number,
 *   created: number,
 *   updated: number,
 *   failed: number,
 *   errors: Array<{ email: string, error: string }>
 * }
 *
 * Note: Requires Starter+ tier (contactImportExportEnabled feature)
 * Max 1000 contacts per request
 */
export const bulkImportContacts = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Check feature access (Starter+ only)
    try {
      await (ctx as any).runQuery(generatedApi.internal.licensing.helpers.checkFeatureAccessInternal, {
        organizationId: authContext.organizationId,
        featureFlag: "contactImportExportEnabled",
      });
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bulk import requires Starter tier or higher. Please upgrade your plan.",
          code: "FEATURE_NOT_AVAILABLE",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { contacts } = body;

    // Validate contacts array
    if (!Array.isArray(contacts)) {
      return new Response(
        JSON.stringify({ error: "contacts must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "contacts array cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (contacts.length > 1000) {
      return new Response(
        JSON.stringify({
          error: "Maximum 1000 contacts per request. Split into multiple requests.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Run bulk import
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.bulkImportContactsInternal,
      {
        organizationId: authContext.organizationId,
        contacts,
        performedBy: authContext.userId,
      }
    );

    // 6. Return response
    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts/bulk error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * EXPORT CONTACTS
 * Exports CRM contacts in JSON or CSV format
 *
 * GET /api/v1/crm/contacts/export
 *
 * Query Parameters:
 * - format: "json" | "csv" (default: "json")
 * - subtype: Filter by contact type (customer, lead, prospect)
 * - status: Filter by status (active, inactive, unsubscribed, archived)
 * - source: Filter by source
 * - tags: Comma-separated list of tags to filter by
 * - createdAfter: Unix timestamp - only contacts created after this time
 * - createdBefore: Unix timestamp - only contacts created before this time
 *
 * Response (JSON format):
 * {
 *   format: "json",
 *   total: number,
 *   contacts: Array<{
 *     id: string,
 *     firstName: string,
 *     lastName: string,
 *     email: string,
 *     phone: string,
 *     company: string,
 *     jobTitle: string,
 *     subtype: string,
 *     status: string,
 *     source: string,
 *     tags: string[],
 *     notes: string,
 *     createdAt: number,
 *     updatedAt: number
 *   }>
 * }
 *
 * Response (CSV format):
 * {
 *   format: "csv",
 *   total: number,
 *   data: string (CSV content)
 * }
 *
 * Note: Requires Starter+ tier (contactImportExportEnabled feature)
 */
export const exportContacts = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["contacts:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Check feature access (Starter+ only)
    try {
      await (ctx as any).runQuery(generatedApi.internal.licensing.helpers.checkFeatureAccessInternal, {
        organizationId: authContext.organizationId,
        featureFlag: "contactImportExportEnabled",
      });
    } catch {
      return new Response(
        JSON.stringify({
          error: "Contact export requires Starter tier or higher. Please upgrade your plan.",
          code: "FEATURE_NOT_AVAILABLE",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse query parameters
    const url = new URL(request.url);
    const format = (url.searchParams.get("format") as "json" | "csv") || "json";
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const source = url.searchParams.get("source") || undefined;
    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : undefined;
    const createdAfter = url.searchParams.get("createdAfter")
      ? parseInt(url.searchParams.get("createdAfter")!)
      : undefined;
    const createdBefore = url.searchParams.get("createdBefore")
      ? parseInt(url.searchParams.get("createdBefore")!)
      : undefined;

    // 5. Run export query
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.crmInternal.exportContactsInternal,
      {
        organizationId: authContext.organizationId,
        subtype,
        status,
        source,
        tags,
        createdAfter,
        createdBefore,
        format,
      }
    );

    // 6. Return response based on format
    if (format === "csv") {
      return new Response(result.data, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="contacts-export-${Date.now()}.csv"`,
          "X-Organization-Id": authContext.organizationId,
          "X-Total-Count": String(result.total),
        },
      });
    }

    // JSON format
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
          "X-Total-Count": String(result.total),
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts/export error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE CONTACT
 * Updates an existing CRM contact
 *
 * PATCH /api/v1/crm/contacts/:contactId
 *
 * Request Body:
 * {
 *   firstName?: string,
 *   lastName?: string,
 *   email?: string,
 *   phone?: string,
 *   company?: string,
 *   jobTitle?: string,
 *   subtype?: "lead" | "customer" | "prospect",
 *   status?: "active" | "inactive" | "unsubscribed" | "archived",
 *   tags?: string[],
 *   notes?: string,
 *   customFields?: object,
 *   address?: object,
 *   addresses?: object[]
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const updateContact = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key, OAuth, or CLI session)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // 4. Parse request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      subtype,
      status,
      tags,
      notes,
      customFields,
      address,
      addresses,
    } = body;

    // 5. Run update mutation
    await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.updateContactInternal,
      {
        organizationId: authContext.organizationId,
        contactId,
        updates: {
          firstName,
          lastName,
          email,
          phone,
          company,
          jobTitle,
          subtype,
          status,
          tags,
          notes,
          customFields,
          address,
          addresses,
        },
        performedBy: authContext.userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts/:id (PATCH) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Contact not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE CONTACT
 * Permanently deletes a CRM contact
 *
 * DELETE /api/v1/crm/contacts/:contactId
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const deleteContact = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key, OAuth, or CLI session)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // 4. Run delete mutation
    await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.deleteContactInternal,
      {
        organizationId: authContext.organizationId,
        contactId,
        performedBy: authContext.userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/contacts/:id (DELETE) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Contact not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// CRM ORGANIZATION ENDPOINTS
// ============================================================================

/**
 * LIST CRM ORGANIZATIONS
 * Lists CRM organizations (companies/accounts)
 *
 * GET /api/v1/crm/organizations
 *
 * Query Parameters:
 * - subtype: Filter by organization type (customer, prospect, partner, sponsor)
 * - status: Filter by status (active, inactive, archived)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   organizations: Array<{...}>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listCrmOrganizations = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:read scope
    const scopeCheck = requireScopes(authContext, ["contacts:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query organizations
    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.crmInternal.listCrmOrganizationsInternal,
      {
        organizationId: authContext.organizationId,
        subtype,
        status,
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
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/organizations (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE CRM ORGANIZATION
 * Creates a new CRM organization (company/account)
 *
 * POST /api/v1/crm/organizations
 *
 * Request Body:
 * {
 *   subtype: "customer" | "prospect" | "partner" | "sponsor",
 *   name: string,
 *   website?: string,
 *   industry?: string,
 *   size?: string,
 *   address?: object,
 *   addresses?: object[],
 *   phone?: string,
 *   taxId?: string,
 *   billingEmail?: string,
 *   tags?: string[],
 *   notes?: string,
 *   customFields?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   crmOrganizationId: string
 * }
 */
export const createCrmOrganization = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      subtype = "prospect",
      name,
      website,
      industry,
      size,
      address,
      addresses,
      phone,
      taxId,
      billingEmail,
      tags,
      notes,
      customFields,
    } = body;

    // Validate required fields
    if (!name) {
      return new Response(
        JSON.stringify({ error: "Missing required field: name" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create organization
    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.createCrmOrganizationInternal,
      {
        organizationId: authContext.organizationId,
        subtype,
        name,
        website,
        industry,
        size,
        address,
        addresses,
        phone,
        taxId,
        billingEmail,
        tags,
        notes,
        customFields,
        performedBy: authContext.userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        crmOrganizationId: result.crmOrganizationId,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/organizations (POST) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CRM ORGANIZATION
 * Gets a specific CRM organization by ID
 *
 * GET /api/v1/crm/organizations/:organizationId
 *
 * Response: Organization object
 */
export const getCrmOrganization = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:read scope
    const scopeCheck = requireScopes(authContext, ["contacts:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract organization ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const crmOrganizationId = pathParts[pathParts.length - 1];

    if (!crmOrganizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query organization
    const org = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.crmInternal.getCrmOrganizationInternal,
      {
        organizationId: authContext.organizationId,
        crmOrganizationId,
      }
    );

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(org),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/organizations/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE CRM ORGANIZATION
 * Updates an existing CRM organization
 *
 * PATCH /api/v1/crm/organizations/:organizationId
 *
 * Request Body:
 * {
 *   name?: string,
 *   subtype?: string,
 *   status?: string,
 *   website?: string,
 *   industry?: string,
 *   size?: string,
 *   address?: object,
 *   addresses?: object[],
 *   phone?: string,
 *   taxId?: string,
 *   billingEmail?: string,
 *   tags?: string[],
 *   notes?: string,
 *   customFields?: object
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const updateCrmOrganization = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require contacts:write scope
    const scopeCheck = requireScopes(authContext, ["contacts:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract organization ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const crmOrganizationId = pathParts[pathParts.length - 1];

    if (!crmOrganizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      name,
      subtype,
      status,
      website,
      industry,
      size,
      address,
      addresses,
      phone,
      taxId,
      billingEmail,
      tags,
      notes,
      customFields,
    } = body;

    // 5. Run update mutation
    await (ctx as any).runMutation(
      generatedApi.internal.api.v1.crmInternal.updateCrmOrganizationInternal,
      {
        organizationId: authContext.organizationId,
        crmOrganizationId,
        updates: {
          name,
          subtype,
          status,
          website,
          industry,
          size,
          address,
          addresses,
          phone,
          taxId,
          billingEmail,
          tags,
          notes,
          customFields,
        },
        performedBy: authContext.userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /crm/organizations/:id (PATCH) error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "CRM organization not found" ? 404 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});
