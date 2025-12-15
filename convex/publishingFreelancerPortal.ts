/**
 * FREELANCER PORTAL PUBLISHING INTEGRATION
 *
 * This module provides a specialized query for external freelancer portal deployments.
 * It returns all the data needed for a client-facing portal in a single optimized call.
 *
 * Usage:
 * External Next.js app calls this endpoint to fetch:
 * - Organization branding (name, logo, colors)
 * - Projects assigned to the authenticated contact
 * - Invoices for the authenticated contact
 * - Contact profile information
 *
 * Authentication: OAuth 2.0 tokens with appropriate scopes
 *
 * PUBLIC QUERY - Called by external deployed portals
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * GET FREELANCER PORTAL DATA
 *
 * Returns all data needed for a freelancer portal dashboard in ONE query.
 * This reduces API calls from the external Next.js app.
 *
 * PUBLIC QUERY - No sessionId required (uses OAuth token authentication)
 *
 * Required URL params:
 * - orgSlug: Organization slug
 * - contactEmail: Email of the authenticated contact (from OAuth token)
 *
 * Returns:
 * {
 *   organization: { name, slug, logo, primaryColor, ... },
 *   contact: { firstName, lastName, email, phone, ... },
 *   projects: { active: [...], completed: [...], total: N },
 *   invoices: { pending: [...], paid: [...], overdue: [...], total: N },
 *   stats: { activeProjects: N, pendingInvoices: N, totalOwed: N, ... }
 * }
 */
export const getFreelancerPortalData = query({
  args: {
    orgSlug: v.string(),
    contactEmail: v.string(), // From OAuth token (verified by middleware)
  },
  handler: async (ctx, args) => {
    console.log("🌐 [getFreelancerPortalData] Query:", args);

    // 1. Get organization by slug
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) {
      console.log("❌ [getFreelancerPortalData] Organization not found");
      return null;
    }

    console.log("✅ [getFreelancerPortalData] Organization:", org._id);

    // 2. Find contact by email
    const allContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "contact")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const contact = allContacts.find((c) => {
      const customProps = c.customProperties as Record<string, unknown> | undefined;
      return customProps?.email === args.contactEmail;
    });

    if (!contact) {
      console.log("❌ [getFreelancerPortalData] Contact not found for email:", args.contactEmail);
      return null;
    }

    console.log("✅ [getFreelancerPortalData] Contact found:", contact._id);

    // 3. Get contact's CRM organization (if they have one)
    let crmOrganization: { _id: any; name: string; type: string } | null = null;
    const contactProps = contact.customProperties as Record<string, unknown> | undefined;
    if (contactProps?.crmOrganizationId) {
      try {
        const crmOrg = await ctx.db.get(contactProps.crmOrganizationId as any);
        // Type guard: ensure it's an object from objects table (has .type property)
        if (crmOrg && "type" in crmOrg && crmOrg.type === "crm_organization") {
          crmOrganization = {
            _id: crmOrg._id,
            name: crmOrg.name || "",
            type: crmOrg.type,
          };
        }
      } catch (e) {
        console.error("Failed to load CRM organization:", e);
      }
    }

    // 4. Fetch projects assigned to this contact
    const allProjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "project")
      )
      .collect();

    // Filter projects where this contact is the client
    const contactProjects = allProjects.filter((p) => {
      const projectProps = p.customProperties as Record<string, unknown> | undefined;
      // Check if clientOrgId matches contact's CRM organization OR contact is directly linked
      return (
        projectProps?.clientOrgId === crmOrganization?._id ||
        projectProps?.clientContactId === contact._id
      );
    });

    // Categorize projects by status
    const activeProjects = contactProjects.filter((p) =>
      ["active", "in_progress", "planning"].includes(p.status)
    );
    const completedProjects = contactProjects.filter((p) =>
      ["completed", "delivered", "archived"].includes(p.status)
    );

    console.log("📋 [getFreelancerPortalData] Projects:", {
      total: contactProjects.length,
      active: activeProjects.length,
      completed: completedProjects.length,
    });

    // 5. Fetch invoices for this contact
    const allInvoices = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "invoice")
      )
      .collect();

    // Filter invoices for this contact's organization
    const contactInvoices = allInvoices.filter((inv) => {
      const invoiceProps = inv.customProperties as Record<string, unknown> | undefined;
      return invoiceProps?.crmOrganizationId === crmOrganization?._id;
    });

    // Categorize invoices by status
    const now = Date.now();
    const pendingInvoices = contactInvoices.filter((inv) => {
      const props = inv.customProperties as Record<string, unknown> | undefined;
      return props?.paymentStatus === "pending" || props?.paymentStatus === "sent";
    });
    const paidInvoices = contactInvoices.filter((inv) => {
      const props = inv.customProperties as Record<string, unknown> | undefined;
      return props?.paymentStatus === "paid";
    });
    const overdueInvoices = contactInvoices.filter((inv) => {
      const props = inv.customProperties as Record<string, unknown> | undefined;
      const dueDate = props?.dueDate as number | undefined;
      return (
        (props?.paymentStatus === "pending" || props?.paymentStatus === "sent") &&
        dueDate &&
        dueDate < now
      );
    });

    console.log("💰 [getFreelancerPortalData] Invoices:", {
      total: contactInvoices.length,
      pending: pendingInvoices.length,
      paid: paidInvoices.length,
      overdue: overdueInvoices.length,
    });

    // 6. Calculate total amount owed
    const totalOwedInCents = pendingInvoices.reduce((sum, inv) => {
      const props = inv.customProperties as Record<string, unknown> | undefined;
      return sum + ((props?.totalInCents as number) || 0);
    }, 0);

    // 7. Find next deadline
    let nextDeadline: number | null = null;
    for (const inv of pendingInvoices) {
      const props = inv.customProperties as Record<string, unknown> | undefined;
      const dueDate = props?.dueDate as number | undefined;
      if (dueDate && (!nextDeadline || dueDate < nextDeadline)) {
        nextDeadline = dueDate;
      }
    }

    // 8. Get organization branding
    // Note: Logo and branding colors are stored in organization_settings objects
    // For now, we'll use default values and let the external app customize via env vars
    const branding = {
      name: org.name,
      slug: org.slug,
      logo: null, // External app will use NEXT_PUBLIC_ORG_LOGO_URL env var
      primaryColor: "#6B46C1", // External app will use NEXT_PUBLIC_PRIMARY_COLOR env var
      accentColor: "#9F7AEA", // External app can override via env vars
    };

    // 9. Prepare contact profile data
    const contactProfile = {
      _id: contact._id,
      firstName: contactProps?.firstName || "",
      lastName: contactProps?.lastName || "",
      email: contactProps?.email || args.contactEmail,
      phone: contactProps?.phone || "",
      company: contactProps?.company || crmOrganization?.name || "",
      // Address fields (if available)
      address: contactProps?.address || null,
      city: contactProps?.city || "",
      state: contactProps?.state || "",
      postalCode: contactProps?.postalCode || "",
      country: contactProps?.country || "",
    };

    // 10. Return complete portal data
    return {
      success: true,
      organization: branding,
      contact: contactProfile,
      crmOrganization: crmOrganization ? {
        _id: crmOrganization._id,
        name: crmOrganization.name,
        // Add other org fields if needed
      } : null,
      projects: {
        active: activeProjects,
        completed: completedProjects,
        total: contactProjects.length,
      },
      invoices: {
        pending: pendingInvoices,
        paid: paidInvoices,
        overdue: overdueInvoices,
        total: contactInvoices.length,
      },
      stats: {
        activeProjects: activeProjects.length,
        pendingInvoices: pendingInvoices.length,
        totalOwedInCents,
        currency: "EUR", // Default currency
        nextDeadline,
      },
    };
  },
});

/**
 * GET PROJECT DETAILS FOR PORTAL
 *
 * Returns detailed project information including milestones and tasks.
 * Used by the project detail page in the freelancer portal.
 *
 * PUBLIC QUERY
 */
export const getProjectForPortal = query({
  args: {
    orgSlug: v.string(),
    projectId: v.id("objects"),
    contactEmail: v.string(), // For access control
  },
  handler: async (ctx, args) => {
    // 1. Get organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) return null;

    // 2. Verify contact has access to this project
    const allContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "contact")
      )
      .collect();

    const contact = allContacts.find((c) => {
      const props = c.customProperties as Record<string, unknown> | undefined;
      return props?.email === args.contactEmail;
    });

    if (!contact) return null;

    // 3. Get project
    const project = await ctx.db.get(args.projectId);
    if (!project || project.organizationId !== org._id) return null;

    const projectProps = project.customProperties as Record<string, unknown> | undefined;

    // 4. Verify access (contact must be client on this project)
    const contactProps = contact.customProperties as Record<string, unknown> | undefined;
    const crmOrgId = contactProps?.crmOrganizationId;
    const hasAccess = (
      projectProps?.clientOrgId === crmOrgId ||
      projectProps?.clientContactId === contact._id
    );

    if (!hasAccess) return null;

    // 5. Get milestones for this project
    const allLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_milestone")
      )
      .collect();

    const milestones = await Promise.all(
      allLinks.map(async (link) => {
        const milestone = await ctx.db.get(link.toObjectId);
        return milestone;
      })
    );

    // Filter out null milestones and sort by order
    const validMilestones = milestones.filter((m) => m !== null);
    validMilestones.sort((a, b) => {
      const aOrder = (a.customProperties as any)?.displayOrder || 0;
      const bOrder = (b.customProperties as any)?.displayOrder || 0;
      return aOrder - bOrder;
    });

    // 6. Get tasks (client-visible only)
    const allTasks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_task")
      )
      .collect();

    const tasks = await Promise.all(
      allTasks.map(async (link) => {
        const task = await ctx.db.get(link.toObjectId);
        return task;
      })
    );

    // Only return client-visible tasks
    const clientVisibleTasks = tasks.filter((t) => {
      if (!t) return false;
      const taskProps = t.customProperties as Record<string, unknown> | undefined;
      return taskProps?.clientVisible === true;
    });

    return {
      project,
      milestones: validMilestones,
      tasks: clientVisibleTasks,
    };
  },
});

/**
 * GET INVOICE DETAILS FOR PORTAL
 *
 * Returns detailed invoice information.
 * Used by the invoice detail page in the freelancer portal.
 *
 * PUBLIC QUERY
 */
export const getInvoiceForPortal = query({
  args: {
    orgSlug: v.string(),
    invoiceId: v.id("objects"),
    contactEmail: v.string(), // For access control
  },
  handler: async (ctx, args) => {
    // 1. Get organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) return null;

    // 2. Verify contact
    const allContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", org._id).eq("type", "contact")
      )
      .collect();

    const contact = allContacts.find((c) => {
      const props = c.customProperties as Record<string, unknown> | undefined;
      return props?.email === args.contactEmail;
    });

    if (!contact) return null;

    // 3. Get invoice
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.organizationId !== org._id) return null;

    const invoiceProps = invoice.customProperties as Record<string, unknown> | undefined;

    // 4. Verify access (invoice must be for contact's CRM organization)
    const contactProps = contact.customProperties as Record<string, unknown> | undefined;
    const crmOrgId = contactProps?.crmOrganizationId;
    const hasAccess = invoiceProps?.crmOrganizationId === crmOrgId;

    if (!hasAccess) return null;

    return {
      invoice,
    };
  },
});
