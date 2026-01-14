/**
 * AI CRM Management Tool
 *
 * Comprehensive tool for managing CRM contacts and organizations through natural language
 *
 * ⚠️ CRITICAL IDENTITY DISTINCTION:
 *
 * 1. PLATFORM USERS (users table):
 *    - YOU and your team members who LOG IN to the platform
 *    - Have authentication, permissions, sessions
 *    - CREATE projects, manage CRM, use platform features
 *    - Example: you@yourcompany.com
 *    - Table: `users`
 *    - ID format: starts with different prefix
 *
 * 2. CRM CONTACTS (objects table, type: "crm_contact"):
 *    - External people you're doing business WITH (clients, prospects, partners)
 *    - Do NOT log in to the platform
 *    - Are MANAGED through the CRM
 *    - Example: sarah@acmecorp.com (a client contact)
 *    - Table: `objects` with type="crm_contact"
 *    - ID format: Id<"objects">
 *
 * THIS TOOL ONLY MANAGES CRM CONTACTS (objects table), NOT PLATFORM USERS!
 */

import { action } from "../../_generated/server";
import type { ActionCtx } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const crmToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_crm",
    description: `Universal CRM foundation for managing companies and contacts.

USE THIS TOOL FIRST when user mentions:
- A company/client name → search_organizations to check if it exists
- A person/contact → search_contacts to check if they exist
- Creating projects, invoices, or events for clients → verify company exists first

CRITICAL RULES:
1. ALWAYS search before creating to avoid duplicates
2. If search finds nothing, ask user: "Would you like me to create [Company Name] in the CRM?"
3. After creating organization, you can link it to projects, invoices, events, etc.

SMART QUESTIONS TO ASK:
- For new companies: "What industry are they in?" "How many employees?"
- For new contacts: "What's their job title?" "Do they work at [Company]?"
- Always confirm before creating to ensure accuracy`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "search_organizations",
            "create_organization",
            "search_contacts",
            "create_contact",
            "link_contact_to_org",
            "get_organization_contacts"
          ],
          description: "Action to perform: search_organizations=find company by name, create_organization=create new company, search_contacts=find people, create_contact=create new contact/person, link_contact_to_org=associate person with company, get_organization_contacts=list all people at a company"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will be created/updated (default), execute = actually perform the operation. ALWAYS use preview first to show user what will happen!"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode - returned from preview)"
        },
        // Organization fields
        organizationId: {
          type: "string",
          description: "CRM Organization ID (for link_contact_to_org, get_organization_contacts)"
        },
        organizationName: {
          type: "string",
          description: "Company/organization name (for search_organizations, create_organization)"
        },
        organizationType: {
          type: "string",
          enum: ["customer", "prospect", "partner", "sponsor"],
          description: "Type of organization (for create_organization). customer=paying client, prospect=potential client, partner=business partner, sponsor=event sponsor"
        },
        website: {
          type: "string",
          description: "Company website URL (for create_organization)"
        },
        industry: {
          type: "string",
          description: "Industry/sector (e.g., 'Technology', 'Healthcare', 'Finance') for create_organization"
        },
        companySize: {
          type: "string",
          enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
          description: "Company size (for create_organization)"
        },
        address: {
          type: "object",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            country: { type: "string" }
          },
          description: "Company address (for create_organization)"
        },
        taxId: {
          type: "string",
          description: "Tax ID/EIN (for create_organization)"
        },
        // Contact fields
        contactId: {
          type: "string",
          description: "CRM Contact ID from objects table (NOT user ID!). Must be a CRM contact created via create_contact. Use search_contacts to find the correct ID. (for link_contact_to_org)"
        },
        firstName: {
          type: "string",
          description: "Contact first name (for create_contact, search_contacts)"
        },
        lastName: {
          type: "string",
          description: "Contact last name (for create_contact, search_contacts)"
        },
        email: {
          type: "string",
          description: "Contact email address (for create_contact, search_contacts)"
        },
        phone: {
          type: "string",
          description: "Contact phone number (for create_contact)"
        },
        jobTitle: {
          type: "string",
          description: "Contact job title/position (for create_contact)"
        },
        contactType: {
          type: "string",
          enum: ["customer", "lead", "prospect"],
          description: "Type of contact (for create_contact). customer=paying client, lead=unqualified potential, prospect=qualified potential"
        },
        notes: {
          type: "string",
          description: "Additional notes about contact or organization"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization (e.g., ['VIP', 'Enterprise', 'West Coast'])"
        },
        // Search filters
        searchQuery: {
          type: "string",
          description: "Search query (for search_organizations, search_contacts)"
        },
        filterType: {
          type: "string",
          description: "Filter by type (for search operations)"
        },
        limit: {
          type: "number",
          description: "Maximum results (default: 20)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageCRM = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")), // For work item tracking
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    // Organization fields
    organizationId_crm: v.optional(v.string()), // Renamed to avoid conflict
    organizationName: v.optional(v.string()),
    organizationType: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    taxId: v.optional(v.string()),
    // Contact fields
    contactId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    contactType: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // Search
    searchQuery: v.optional(v.string()),
    filterType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    workItemType?: string;
    data?: unknown; // Flexible for different return formats
    message?: string;
    error?: string;
  }> => {
    // Get platform organization ID and userId
    let platformOrgId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;
    let sessionId: string | undefined = args.sessionId;

    if (args.organizationId && args.userId) {
      platformOrgId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId || !session.userId) {
        throw new Error("Invalid session or user must belong to an organization");
      }

      platformOrgId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Either sessionId or (organizationId and userId) must be provided");
    }

    if (!sessionId) {
      sessionId = "ai-internal-session";
    }

    try {
      switch (args.action) {
        case "search_organizations":
          return await searchOrganizations(ctx, platformOrgId, args);

        case "create_organization":
          if (!args.organizationName || !args.organizationType) {
            throw new Error("organizationName and organizationType are required for create_organization");
          }
          if (!userId) {
            throw new Error("userId is required for create_organization");
          }
          return await createOrganization(ctx, platformOrgId, userId, args);

        case "search_contacts":
          return await searchContacts(ctx, platformOrgId, args);

        case "create_contact":
          if (!args.firstName || !args.lastName || !args.email) {
            throw new Error("firstName, lastName, and email are required for create_contact");
          }
          if (!userId) {
            throw new Error("userId is required for create_contact");
          }
          return await createContact(ctx, platformOrgId, userId, args);

        case "link_contact_to_org":
          if (!args.contactId || !args.organizationId_crm) {
            throw new Error("contactId and organizationId are required for link_contact_to_org");
          }
          if (!userId) {
            throw new Error("userId is required for link_contact_to_org");
          }
          return await linkContactToOrg(ctx, platformOrgId, userId, args);

        case "get_organization_contacts":
          if (!args.organizationId_crm) {
            throw new Error("organizationId is required for get_organization_contacts");
          }
          return await getOrganizationContacts(ctx, platformOrgId, args);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: search_organizations, create_organization, search_contacts, create_contact, link_contact_to_org, get_organization_contacts"
          };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: args.action,
        error: errorMessage,
        message: `Failed to ${args.action}: ${errorMessage}`
      };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * Search for CRM organizations by name
 */
async function searchOrganizations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  platformOrgId: Id<"organizations">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const orgs = await ctx.runQuery(
    internal.ai.tools.internalToolMutations.internalSearchCrmOrganizations,
    {
      organizationId: platformOrgId,
      searchQuery: args.searchQuery || args.organizationName,
      subtype: args.filterType,
      limit: args.limit || 20,
    }
  );

  const summary = orgs.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(org: any) => ({
    id: org._id,
    name: org.name,
    type: org.subtype,
    status: org.status,
    website: org.customProperties?.website,
    industry: org.customProperties?.industry,
    size: org.customProperties?.size,
  }));

  return {
    success: true,
    action: "search_organizations",
    data: {
      organizations: summary,
      total: orgs.length,
      found: orgs.length > 0,
    },
    message: orgs.length > 0
      ? `Found ${orgs.length} organization(s). Use the exact 'id' value for operations.`
      : `No organizations found matching "${args.searchQuery || args.organizationName}". You may want to create it.`
  };
}

/**
 * Create a new CRM organization
 */
async function createOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  platformOrgId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const mode = args.mode || "preview";

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "crm_organization",
      name: args.organizationName,
      status: "preview",
      details: {
        type: args.organizationType,
        website: args.website,
        industry: args.industry,
        size: args.companySize,
        address: args.address,
        taxId: args.taxId,
        notes: args.notes,
        tags: args.tags,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New organization will be created",
        changes: {
          name: { old: null, new: args.organizationName },
          type: { old: null, new: args.organizationType },
          industry: { old: null, new: args.industry || "Not specified" },
          size: { old: null, new: args.companySize || "Not specified" },
          website: { old: null, new: args.website || "Not specified" },
          status: { old: null, new: "active" },
        }
      }
    };

    // Create work item for tracking
    const workItemId = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId: platformOrgId,
        userId,
        conversationId: args.conversationId!, // Should always be provided from chat context
        type: "crm_create_organization",
        name: `Create Organization - ${args.organizationName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_organization",
      mode: "preview",
      workItemId,
      workItemType: "crm_create_organization",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create ${args.organizationName}. Review the details and approve to proceed.`
    };
  }

  // EXECUTE MODE: Actually create the organization
  const crmOrgId = await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalCreateCrmOrganization,
    {
      organizationId: platformOrgId,
      userId,
      subtype: args.organizationType,
      name: args.organizationName,
      website: args.website,
      industry: args.industry,
      size: args.companySize,
      address: args.address,
      taxId: args.taxId,
      notes: args.notes,
      tags: args.tags,
    }
  );

  // Update work item to completed
  if (args.workItemId) {
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { organizationId: crmOrgId },
      }
    );
  }

  return {
    success: true,
    action: "create_organization",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: crmOrgId,
        type: "crm_organization",
        name: args.organizationName,
        status: "completed",
        details: {
          type: args.organizationType,
          industry: args.industry,
          size: args.companySize,
        }
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created CRM organization: ${args.organizationName}. You can now link contacts to this organization or create projects for this client.`
  };
}

/**
 * Search for contacts
 */
async function searchContacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  platformOrgId: Id<"organizations">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const contacts = await ctx.runQuery(
    internal.ai.tools.internalToolMutations.internalSearchContacts,
    {
      organizationId: platformOrgId,
      searchQuery: args.searchQuery || args.email || `${args.firstName || ""} ${args.lastName || ""}`.trim(),
      subtype: args.filterType,
      limit: args.limit || 20,
    }
  );

  const summary = contacts.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(contact: any) => ({
    id: contact._id,
    name: contact.name,
    email: contact.customProperties?.email,
    phone: contact.customProperties?.phone,
    jobTitle: contact.customProperties?.jobTitle,
    company: contact.customProperties?.company,
    type: contact.subtype,
    status: contact.status,
  }));

  return {
    success: true,
    action: "search_contacts",
    data: {
      contacts: summary,
      total: contacts.length,
      found: contacts.length > 0,
    },
    message: contacts.length > 0
      ? `Found ${contacts.length} contact(s). Use the exact 'id' value for operations.`
      : `No contacts found. You may want to create this contact.`
  };
}

/**
 * Create a new CRM contact (external person)
 *
 * IMPORTANT: This creates a CRM contact in the objects table (type: "crm_contact").
 * This is NOT a platform user - they cannot log in.
 * This is someone you're doing business WITH (client, prospect, partner).
 */
async function createContact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  platformOrgId: Id<"organizations">,
  userId: Id<"users">, // ← Platform user creating the contact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  // Create CRM contact in objects table (NOT users table!)
  const contactId = await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalCreateContact,
    {
      organizationId: platformOrgId,
      userId, // Platform user who created this CRM contact
      subtype: args.contactType || "customer",
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phone: args.phone,
      jobTitle: args.jobTitle,
      company: args.organizationName, // Store company name in contact if provided
      tags: args.tags,
    }
  );

  return {
    success: true,
    action: "create_contact",
    data: {
      contactId,
      name: `${args.firstName} ${args.lastName}`,
      email: args.email,
    },
    message: `✅ Created contact: ${args.firstName} ${args.lastName}. You can now link this contact to an organization if needed.`
  };
}

/**
 * Link CRM contact to CRM organization
 *
 * ⚠️ CRITICAL IDENTITY DISTINCTION:
 * - contactId must be from objects table (CRM contact), NOT users table!
 * - crmOrganizationId must be from objects table (CRM organization), NOT organizations table!
 * - Both are stored in the objects table as type="crm_contact" and type="crm_organization"
 *
 * Example:
 *   contactId: "k17abc..." (from objects table, type="crm_contact")
 *   crmOrganizationId: "k17xyz..." (from objects table, type="crm_organization")
 *
 * DO NOT use IDs from users table (platform users)!
 */
async function linkContactToOrg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  platformOrgId: Id<"organizations">, // ← Your platform organization
  userId: Id<"users">, // ← Platform user performing the link (YOU)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  // ⚠️ VALIDATION: Ensure contactId is provided and looks like a valid Convex ID
  const contactId = args.contactId as string;
  if (!contactId || contactId.length < 20) {
    throw new Error(`Invalid contactId: "${contactId}". This must be a CRM contact ID from the objects table. Use search_contacts to find the correct CRM contact ID.`);
  }

  // The actual validation happens in the mutation when we try to fetch the record
  // We'll verify it exists and is the correct type (crm_contact) there

  // Link two CRM objects: contact → organization
  await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalLinkContactToOrg,
    {
      organizationId: platformOrgId,
      userId,
      contactId: contactId as Id<"objects">, // ⚠️ Must be objects table ID (CRM contact)
      crmOrganizationId: args.organizationId_crm as Id<"objects">, // ⚠️ Must be objects table ID (CRM org)
      role: args.jobTitle,
    }
  );

  return {
    success: true,
    action: "link_contact_to_org",
    data: {
      contactId: args.contactId,
      organizationId: args.organizationId_crm,
    },
    message: `✅ Linked contact to organization`
  };
}

/**
 * Get all contacts for an organization
 */
async function getOrganizationContacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  platformOrgId: Id<"organizations">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const contacts = await ctx.runQuery(
    internal.ai.tools.internalToolMutations.internalGetOrganizationContacts,
    {
      organizationId: platformOrgId,
      crmOrganizationId: args.organizationId_crm as Id<"objects">,
    }
  );

  const summary = contacts.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(contact: any) => ({
    id: contact._id,
    name: contact.name,
    email: contact.customProperties?.email,
    jobTitle: contact.customProperties?.jobTitle,
    phone: contact.customProperties?.phone,
  }));

  return {
    success: true,
    action: "get_organization_contacts",
    data: {
      contacts: summary,
      total: contacts.length,
    },
    message: `Found ${contacts.length} contact(s) for this organization`
  };
}
