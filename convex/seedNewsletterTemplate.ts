import { internalMutation } from "./_generated/server";

/**
 * SEED NEWSLETTER TEMPLATE WITH SCHEMA
 *
 * Seeds the newsletter confirmation email template with its full schema.
 * This is a manual seed for testing schema-based templates.
 *
 * Run with: npx convex run seedNewsletterTemplate:seedNewsletterTemplate
 */
export const seedNewsletterTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Seeding newsletter template with schema...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get first user for createdBy
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) {
      throw new Error("No users found. Create a user first before seeding templates.");
    }

    // Newsletter template schema (from schema-examples/newsletter-confirmation-schema.json)
    const newsletterSchema = {
      code: "newsletter-confirmation",
      name: "Newsletter Confirmation Email",
      description: "Confirmation email sent when someone subscribes to your newsletter. Includes welcome message and what to expect.",
      category: "marketing",
      version: "1.0.0",
      defaultSections: [
        {
          type: "hero",
          title: "Welcome to {newsletterName}!",
          subtitle: "You're now subscribed to our newsletter",
          image: "{welcomeImageUrl}"
        },
        {
          type: "body",
          paragraphs: [
            "Hi {firstName},",
            "",
            "Thanks for subscribing to {newsletterName}! We're excited to have you in our community.",
            "",
            "Here's what you can expect:",
            ""
          ]
        },
        {
          type: "body",
          sections: [
            {
              title: "📧 Regular Updates",
              content: "{emailFrequency} - We'll send you {contentDescription}",
              icon: "mail"
            },
            {
              title: "🎁 Exclusive Content",
              content: "Get access to {exclusiveContent}",
              icon: "gift"
            },
            {
              title: "🔔 No Spam",
              content: "We respect your inbox. You can unsubscribe anytime.",
              icon: "shield"
            }
          ]
        },
        {
          type: "body",
          paragraphs: [
            "",
            "{additionalMessage}",
            "",
            "Best regards,",
            "{senderName}",
            "{senderTitle}"
          ]
        },
        {
          type: "cta",
          text: "{ctaText}",
          url: "{ctaUrl}",
          style: "primary"
        }
      ],
      defaultBrandColor: "#6B46C1",
      supportedLanguages: ["en", "de", "es", "fr"],
      variables: [
        {
          name: "firstName",
          type: "string",
          description: "Subscriber's first name",
          required: true,
          defaultValue: "Sarah",
          aiInstructions: "Use the subscriber's first name from the database. If not available, use a friendly generic greeting."
        },
        {
          name: "lastName",
          type: "string",
          description: "Subscriber's last name",
          required: false,
          defaultValue: "Johnson"
        },
        {
          name: "email",
          type: "email",
          description: "Subscriber's email address",
          required: true,
          defaultValue: "sarah.johnson@example.com"
        },
        {
          name: "newsletterName",
          type: "string",
          description: "Name of the newsletter/publication",
          required: true,
          defaultValue: "Weekly Insights",
          aiInstructions: "Use the newsletter's brand name from organization settings"
        },
        {
          name: "welcomeImageUrl",
          type: "url",
          description: "Hero image URL (optional)",
          required: false,
          defaultValue: "https://placehold.co/600x300/6B46C1/white?text=Welcome"
        },
        {
          name: "emailFrequency",
          type: "string",
          description: "How often subscribers will receive emails",
          required: true,
          defaultValue: "Every Tuesday",
          aiInstructions: "Specify the email frequency (e.g., 'Every Monday', 'Twice a month', 'Weekly')"
        },
        {
          name: "contentDescription",
          type: "string",
          description: "What content subscribers will receive",
          required: true,
          defaultValue: "industry insights, tips, and exclusive resources",
          aiInstructions: "Describe the type of content subscribers can expect (be specific and enticing)"
        },
        {
          name: "exclusiveContent",
          type: "string",
          description: "Exclusive perks for subscribers",
          required: true,
          defaultValue: "early access to new products, special discounts, and member-only content",
          aiInstructions: "Highlight subscriber benefits and exclusive perks"
        },
        {
          name: "additionalMessage",
          type: "string",
          description: "Additional personalized message",
          required: false,
          defaultValue: "We're glad you're here. Feel free to reply to this email if you have any questions or feedback.",
          aiInstructions: "Add a warm, personal touch. Encourage engagement or provide helpful next steps."
        },
        {
          name: "senderName",
          type: "string",
          description: "Name of the person/team sending the email",
          required: true,
          defaultValue: "The Team",
          aiInstructions: "Use the sender's name from organization settings or the newsletter editor's name"
        },
        {
          name: "senderTitle",
          type: "string",
          description: "Title of the sender",
          required: false,
          defaultValue: "Newsletter Editor",
          aiInstructions: "Include sender's title/role if appropriate (e.g., 'Founder', 'Editor-in-Chief')"
        },
        {
          name: "ctaText",
          type: "string",
          description: "Call-to-action button text",
          required: true,
          defaultValue: "Visit Our Blog",
          aiInstructions: "Create an engaging CTA that encourages immediate action (e.g., 'Read Latest Articles', 'Explore Resources', 'Update Preferences')"
        },
        {
          name: "ctaUrl",
          type: "url",
          description: "Call-to-action destination URL",
          required: true,
          defaultValue: "https://example.com/blog",
          aiInstructions: "Link to the newsletter archive, blog, or preference center"
        },
        {
          name: "companyName",
          type: "string",
          description: "Company/organization name",
          required: true,
          defaultValue: "Your Company"
        },
        {
          name: "companyAddress",
          type: "string",
          description: "Company physical address (for CAN-SPAM compliance)",
          required: false,
          defaultValue: "123 Main Street, Suite 100, City, State 12345, USA"
        },
        {
          name: "unsubscribeUrl",
          type: "url",
          description: "Unsubscribe link (required for newsletters)",
          required: true,
          defaultValue: "https://example.com/unsubscribe",
          aiInstructions: "Generate the unsubscribe URL with subscriber token"
        },
        {
          name: "preferenceCenterUrl",
          type: "url",
          description: "Link to email preferences",
          required: false,
          defaultValue: "https://example.com/preferences"
        }
      ],
      previewData: {
        header: {
          brandColor: "#6B46C1",
          companyName: "Acme Corp",
          logo: "https://placehold.co/200x50/6B46C1/white?text=ACME"
        },
        recipient: {
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@example.com"
        },
        newsletterName: "Weekly Insights",
        welcomeImageUrl: "https://placehold.co/600x300/6B46C1/white?text=Welcome+Aboard",
        emailFrequency: "Every Tuesday at 9 AM",
        contentDescription: "curated industry news, actionable tips, and exclusive interviews",
        exclusiveContent: "early access to new features, special discounts, and VIP community access",
        additionalMessage: "We're thrilled to have you join our community of 10,000+ subscribers. Reply to this email anytime - we read every message!",
        senderName: "Alex Martinez",
        senderTitle: "Editor-in-Chief",
        ctaText: "Read Latest Issue",
        ctaUrl: "https://example.com/newsletter/latest",
        companyName: "Acme Corp",
        companyAddress: "123 Innovation Drive, San Francisco, CA 94105",
        unsubscribeUrl: "https://example.com/unsubscribe?token=abc123",
        preferenceCenterUrl: "https://example.com/preferences"
      }
    };

    // Check if template already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "newsletter-confirmation"))
      .first();

    if (existing) {
      // Update existing template with schema
      await ctx.db.patch(existing._id, {
        name: newsletterSchema.name,
        customProperties: {
          code: newsletterSchema.code,
          templateCode: newsletterSchema.code,
          description: newsletterSchema.description,
          category: newsletterSchema.category,
          supportedLanguages: newsletterSchema.supportedLanguages,
          version: newsletterSchema.version,
          // Schema data
          emailTemplateSchema: newsletterSchema,
        },
        updatedAt: Date.now(),
      });

      console.log("✅ Updated newsletter template with schema");
      return { action: "updated", templateId: existing._id };
    } else {
      // Create new template with schema
      const templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "email",
        name: newsletterSchema.name,
        status: "published",
        customProperties: {
          code: newsletterSchema.code,
          templateCode: newsletterSchema.code,
          description: newsletterSchema.description,
          category: newsletterSchema.category,
          supportedLanguages: newsletterSchema.supportedLanguages,
          version: newsletterSchema.version,
          // Schema data
          emailTemplateSchema: newsletterSchema,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("✅ Created newsletter template with schema");
      return { action: "created", templateId };
    }
  },
});

/**
 * DELETE NEWSLETTER TEMPLATE
 *
 * Remove the newsletter template (for testing)
 */
export const deleteNewsletterTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Deleting newsletter template...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find newsletter template
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "newsletter-confirmation"))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
      console.log("✅ Deleted newsletter template");
      return { deleted: true };
    } else {
      console.log("⚠️  Newsletter template not found");
      return { deleted: false };
    }
  },
});
