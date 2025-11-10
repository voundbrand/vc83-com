/**
 * DEBUG: Check CRM contact by email
 *
 * This query helps debug why a specific email isn't being created as a CRM contact.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Find CRM contact by email across all organizations
 */
export const findContactByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Search all CRM contacts
    const allContacts = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "crm_contact"))
      .collect();

    const matchingContacts = allContacts.filter(
      (c) => c.customProperties?.email?.toLowerCase() === args.email.toLowerCase()
    );

    return {
      found: matchingContacts.length > 0,
      count: matchingContacts.length,
      contacts: matchingContacts.map((c) => ({
        _id: c._id,
        organizationId: c.organizationId,
        name: c.name,
        email: c.customProperties?.email,
        phone: c.customProperties?.phone,
        company: c.customProperties?.company,
        tags: c.customProperties?.tags,
        source: c.customProperties?.source,
        subtype: c.subtype,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  },
});

/**
 * Find user by email
 */
export const findUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();

    const matchingUsers = allUsers.filter(
      (u) => u.email?.toLowerCase() === args.email.toLowerCase()
    );

    return {
      found: matchingUsers.length > 0,
      count: matchingUsers.length,
      users: matchingUsers.map((u) => ({
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        globalRoleId: u.global_role_id,
        createdAt: u.createdAt,
      })),
    };
  },
});

/**
 * Check what happens when API processes this email
 */
export const simulateApiLookup = query({
  args: {
    email: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Exactly what the API does
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.email
    );

    return {
      organizationId: args.organizationId,
      email: args.email,
      totalContactsInOrg: existingContacts.length,
      foundExistingContact: !!existingContact,
      existingContactId: existingContact?._id,
      existingContactData: existingContact ? {
        name: existingContact.name,
        email: existingContact.customProperties?.email,
        tags: existingContact.customProperties?.tags,
        company: existingContact.customProperties?.company,
        source: existingContact.customProperties?.source,
        createdAt: existingContact.createdAt,
        updatedAt: existingContact.updatedAt,
      } : null,
      apiWouldCreate: !existingContact,
      apiWouldUpdate: !!existingContact,
    };
  },
});
