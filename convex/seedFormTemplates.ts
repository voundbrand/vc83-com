/**
 * SEED FORM TEMPLATES
 *
 * Seeds system form templates into the database.
 * Similar to seedWebPublishingTemplates.ts
 *
 * NOTE: This seeds the form TEMPLATE metadata.
 * The actual form schema with fields is imported from:
 * - src/templates/forms/haffsymposium-registration/schema.ts
 *
 * Run with: npx convex run seedFormTemplates:seedFormTemplates
 */

import { mutation } from "./_generated/server";
import { haffSymposiumFormSchema } from "../src/templates/forms/haffsymposium-registration/schema";

export const seedFormTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    // Get first user (needed for createdBy field)
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Please create a user first with seedAdmin.");
    }

    // Get or create system organization
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      const systemOrgId = await ctx.db.insert("organizations", {
        name: "System",
        slug: "system",
        isActive: true,
        businessName: "System",
        plan: "enterprise",
        isPersonalWorkspace: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      systemOrg = await ctx.db.get(systemOrgId);
    }

    if (!systemOrg) {
      throw new Error("Failed to create system organization");
    }

    // Check if form templates already exist
    const existingTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "form"))
      .collect();

    console.log(`Found ${existingTemplates.length} existing form templates`);

    // Define form templates to seed
    const formTemplates = [
      {
        code: "haffsymposium-registration",
        name: "HaffSymposium - Event Registration (Multi-Category)",
        description:
          "Comprehensive multi-category event registration form with conditional sections for external participants, employees, partners, speakers, sponsors, and organizers. Includes personal info, arrival times, accommodation, activities, and special requests. Perfect for complex events with different attendee types.",
        category: "event",
        previewImageUrl: "/images/form-templates/haffsymposium-preview.png",
        features: [
          "6 attendee category types with conditional sections",
          "Personal information collection (salutation, title, name, email, phone)",
          "Organization and profession details",
          "Event-specific questions (arrival time, accommodation, activities)",
          "Add-on selections (UCRA boat event with pricing)",
          "BBQ participation tracking",
          "Support activities selection (for organizers)",
          "Billing address collection (for paid categories)",
          "Special requests and dietary restrictions",
          "Multi-language support (German)",
          "Responsive mobile-friendly design",
          "Real-time conditional field validation",
        ],
        fieldTypes: [
          "radio",
          "select",
          "text",
          "email",
          "tel",
          "time",
          "textarea",
          "checkbox",
        ],
        useCases: [
          "Medical symposiums and conferences",
          "Multi-stakeholder events",
          "Professional association gatherings",
          "Events with different pricing tiers",
          "Conferences with sponsors and speakers",
          "Events requiring detailed logistics planning",
        ],
        complexity: "advanced",
        estimatedFields: 25,
        supportedLanguages: ["de", "en"],
        // Import the actual form schema with fields!
        formSchema: haffSymposiumFormSchema,
      },
      // You can add more starter templates here:
      // {
      //   code: "contact-form",
      //   name: "Simple Contact Form",
      //   description: "Basic contact form with name, email, subject, and message fields.",
      //   category: "general",
      //   ...
      // },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const template of formTemplates) {
      // Check if template already exists by code
      const existing = existingTemplates.find(
        (t) => t.customProperties?.code === template.code
      );

      if (existing) {
        // Update existing template
        await ctx.db.patch(existing._id, {
          name: template.name,
          description: template.description,
          customProperties: {
            ...existing.customProperties,
            ...template,
          },
          updatedAt: Date.now(),
        });
        updatedCount++;
        console.log(`Updated form template: ${template.code}`);
      } else {
        // Create new template (type: "template", subtype: "form")
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "template",
          subtype: "form",
          name: template.name,
          description: template.description,
          status: "published",
          customProperties: {
            ...template,
            version: "1.0.0",
            author: "System",
          },
          createdBy: firstUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        createdCount++;
        console.log(`Created form template: ${template.code}`);
      }
    }

    return {
      success: true,
      message: `Form templates seeded: ${createdCount} created, ${updatedCount} updated`,
      totalTemplates: formTemplates.length,
      createdCount,
      updatedCount,
    };
  },
});
