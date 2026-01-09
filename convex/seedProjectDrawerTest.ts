/**
 * SEED: Project Drawer Test Data
 *
 * Creates test data for testing the Project Meetings Drawer authentication flow.
 * Run with: npx convex run seedProjectDrawerTest:seedTestData
 *
 * This creates:
 * 1. A CRM contact with a test email
 * 2. A project linked to the organization
 * 3. A sample meeting for the project
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Test Organization ID from .env.local
// kn7024kr1pag4ck3haeqaf29zs7sfd78

/**
 * Seed test data for project drawer authentication testing
 */
export const seedTestData = mutation({
  args: {
    organizationId: v.id("organizations"),
    testEmail: v.string(), // Email to use for the test contact
  },
  handler: async (ctx, args) => {
    const { organizationId, testEmail } = args;

    // Verify organization exists
    const org = await ctx.db.get(organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    console.log(`Creating test data for organization: ${org.name}`);

    // 1. Create CRM Contact with test email
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "crm_contact")
      )
      .collect();

    // Check if contact with this email already exists
    const existingContact = existingContacts.find((c) => {
      const email = (c.customProperties as { email?: string })?.email;
      return email?.toLowerCase() === testEmail.toLowerCase();
    });

    let contactId = existingContact?._id;

    if (!existingContact) {
      contactId = await ctx.db.insert("objects", {
        organizationId,
        type: "crm_contact",
        subtype: "customer",
        name: "Test Client",
        description: "Test contact for project drawer auth testing",
        status: "active",
        customProperties: {
          email: testEmail.toLowerCase(),
          phone: "+49 123 456789",
          company: "Test Company GmbH",
          role: "Project Lead",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log(`Created CRM contact: ${contactId}`);
    } else {
      console.log(`CRM contact already exists: ${contactId}`);
    }

    // 2. Create a test project
    const existingProjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "project")
      )
      .collect();

    const existingProject = existingProjects.find(
      (p) => p.name === "Test Drawer Project"
    );

    let projectId = existingProject?._id;

    if (!existingProject) {
      projectId = await ctx.db.insert("objects", {
        organizationId,
        type: "project",
        subtype: "client_project",
        name: "Test Drawer Project",
        description: "A test project for testing the project drawer feature",
        status: "active",
        customProperties: {
          clientName: "Test Company GmbH",
          budget: 5000,
          startDate: Date.now(),
          targetEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log(`Created project: ${projectId}`);
    } else {
      console.log(`Project already exists: ${projectId}`);
    }

    // 3. Create a sample meeting for the project
    if (projectId) {
      const existingMeetings = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", organizationId).eq("type", "meeting")
        )
        .collect();

      const existingMeeting = existingMeetings.find(
        (m) => m.name === "Test Kickoff Meeting"
      );

      let meetingId = existingMeeting?._id;

      if (!existingMeeting) {
        meetingId = await ctx.db.insert("objects", {
          organizationId,
          type: "meeting",
          subtype: "project_meeting",
          name: "Test Kickoff Meeting",
          description: "Initial project kickoff and scope discussion",
          status: "completed",
          customProperties: {
            date: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
            time: "14:00",
            duration: 60,
            timezone: "Europe/Berlin",
            notes: `
## Besprochene Themen

- Projektziele wurden definiert
- Budget von 5.000€ bestätigt
- Timeline: 4 Wochen

## Nächste Schritte

- [ ] Designkonzept erstellen
- [ ] Feedback einholen
- [ ] Finales Design umsetzen
            `.trim(),
            summary: "Projektstart und Zielsetzung besprochen. Budget und Timeline bestätigt.",
            embeddedVideos: [],
            mediaLinks: [],
            attendees: [
              { name: "Test Client", email: testEmail, role: "client" },
              { name: "Remington", role: "team" },
            ],
          },
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now(),
        });
        console.log(`Created meeting: ${meetingId}`);

        // Link meeting to project
        if (meetingId) {
          await ctx.db.insert("objectLinks", {
            organizationId,
            fromObjectId: projectId,
            toObjectId: meetingId,
            linkType: "has_meeting",
            properties: {
              displayOrder: 1,
            },
            createdAt: Date.now(),
          });
          console.log(`Linked meeting to project`);
        }
      } else {
        console.log(`Meeting already exists: ${meetingId}`);
      }
    }

    return {
      success: true,
      contactId,
      projectId,
      testEmail,
      message: `Test data created successfully. Use email "${testEmail}" to test magic link auth.`,
    };
  },
});

/**
 * Query to check test data status
 */
export const getTestDataStatus = query({
  args: {
    organizationId: v.id("organizations"),
    testEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { organizationId, testEmail } = args;

    // Get organization
    const org = await ctx.db.get(organizationId);

    // Find contact
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "crm_contact")
      )
      .collect();

    const contact = contacts.find((c) => {
      const email = (c.customProperties as { email?: string })?.email;
      return email?.toLowerCase() === testEmail.toLowerCase();
    });

    // Find projects
    const projects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "project")
      )
      .collect();

    const testProject = projects.find((p) => p.name === "Test Drawer Project");

    // Find meetings
    const meetings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "meeting")
      )
      .collect();

    return {
      organization: org ? { id: org._id, name: org.name } : null,
      contact: contact
        ? {
            id: contact._id,
            name: contact.name,
            email: (contact.customProperties as { email?: string })?.email,
          }
        : null,
      project: testProject
        ? { id: testProject._id, name: testProject.name }
        : null,
      meetingsCount: meetings.length,
      isReady: !!(org && contact && testProject),
    };
  },
});

/**
 * Get the latest magic link token for testing
 */
export const getLatestMagicLinkToken = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("type"), "magic_link_token"),
          q.eq(q.field("subtype"), "project_drawer")
        )
      )
      .order("desc")
      .take(1);

    if (tokens.length === 0) return null;

    const token = tokens[0];
    const props = token.customProperties as {
      token: string;
      contactEmail: string;
      expiresAt: number;
      usedAt: number | null;
    };

    return {
      id: token._id,
      status: token.status,
      token: props.token,
      contactEmail: props.contactEmail,
      expiresAt: new Date(props.expiresAt).toISOString(),
      isExpired: Date.now() > props.expiresAt,
      isUsed: !!props.usedAt,
    };
  },
});

/**
 * List all organizations (for finding the right ID)
 */
export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    return orgs.map((org) => ({
      id: org._id,
      name: org.name,
      slug: org.slug,
    }));
  },
});

/**
 * Clean up test data
 */
export const cleanupTestData = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = args;

    // Find and delete test project
    const projects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "project")
      )
      .collect();

    const testProject = projects.find((p) => p.name === "Test Drawer Project");

    if (testProject) {
      // Delete linked meetings first
      const links = await ctx.db
        .query("objectLinks")
        .filter((q) => q.eq(q.field("fromObjectId"), testProject._id))
        .collect();

      for (const link of links) {
        await ctx.db.delete(link.toObjectId);
        await ctx.db.delete(link._id);
      }

      await ctx.db.delete(testProject._id);
      console.log("Deleted test project and linked meetings");
    }

    // Find and delete test contact
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "crm_contact")
      )
      .collect();

    const testContact = contacts.find((c) => c.name === "Test Client");

    if (testContact) {
      await ctx.db.delete(testContact._id);
      console.log("Deleted test contact");
    }

    // Clean up any magic link tokens
    const tokens = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), organizationId),
          q.eq(q.field("type"), "magic_link_token")
        )
      )
      .collect();

    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }
    console.log(`Deleted ${tokens.length} magic link tokens`);

    return { success: true, message: "Test data cleaned up" };
  },
});
