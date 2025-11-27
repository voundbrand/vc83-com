import { internalMutation } from "./_generated/server";

/**
 * SEED EVENT CONFIRMATION TEMPLATE WITH SCHEMA
 *
 * Seeds the event confirmation email template with its full schema.
 * This is used when someone registers for an event - critical for all event-based workflows.
 *
 * Run with: npx convex run seedEventConfirmationTemplate:seedEventConfirmationTemplate
 */
export const seedEventConfirmationTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Seeding event confirmation template with schema...");

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

    // Event Confirmation template schema
    const eventConfirmationSchema = {
      code: "event-confirmation-v2",
      name: "Event Confirmation Email",
      description: "Confirmation email sent when someone registers for an event. Includes event details, ticket information, and calendar invite.",
      category: "event",
      version: "2.0.0",
      defaultSections: [
        {
          type: "hero",
          title: "🎉 You're Registered!",
          subtitle: "See you at {eventName}",
          image: "{eventBannerUrl}"
        },
        {
          type: "body",
          paragraphs: [
            "Hi {firstName},",
            "",
            "Great news! Your registration for **{eventName}** has been confirmed.",
            "",
            "We're excited to see you there! Here are your event details:",
            ""
          ]
        },
        {
          type: "body",
          sections: [
            {
              title: "📅 Date & Time",
              content: "{eventDate} at {eventTime}",
              icon: "calendar"
            },
            {
              title: "📍 Location",
              content: "{eventLocation}",
              icon: "map-pin"
            },
            {
              title: "🎟️ Ticket Type",
              content: "{ticketType} - {ticketPrice}",
              icon: "ticket"
            },
            {
              title: "🎫 Confirmation Code",
              content: "{confirmationCode}",
              icon: "check-circle"
            }
          ]
        },
        {
          type: "body",
          paragraphs: [
            "",
            "**What to bring:**",
            "{whatToBring}",
            "",
            "**Important notes:**",
            "{importantNotes}",
            ""
          ]
        },
        {
          type: "cta",
          text: "Add to Calendar",
          url: "{calendarUrl}",
          style: "primary"
        },
        {
          type: "body",
          paragraphs: [
            "",
            "Need to make changes? Reply to this email or contact us at {supportEmail}.",
            "",
            "Looking forward to seeing you!",
            "{organizerName}",
            "{organizerTitle}"
          ]
        }
      ],
      defaultBrandColor: "#6B46C1",
      supportedLanguages: ["en", "de", "es", "fr"],
      variables: [
        {
          name: "firstName",
          type: "string",
          description: "Attendee's first name",
          required: true,
          defaultValue: "Alex",
          aiInstructions: "Use the attendee's first name from registration. If not available, use 'Valued Attendee'."
        },
        {
          name: "lastName",
          type: "string",
          description: "Attendee's last name",
          required: false,
          defaultValue: "Johnson"
        },
        {
          name: "email",
          type: "email",
          description: "Attendee's email address",
          required: true,
          defaultValue: "alex.johnson@example.com"
        },
        {
          name: "eventName",
          type: "string",
          description: "Name of the event",
          required: true,
          defaultValue: "Tech Summit 2025",
          aiInstructions: "Use the full event name from the event database"
        },
        {
          name: "eventBannerUrl",
          type: "url",
          description: "Event banner/hero image URL",
          required: false,
          defaultValue: "https://placehold.co/600x300/6B46C1/white?text=Event+Banner"
        },
        {
          name: "eventDate",
          type: "string",
          description: "Event date in readable format",
          required: true,
          defaultValue: "Saturday, March 15, 2025",
          aiInstructions: "Format as 'DayOfWeek, Month Day, Year' for readability"
        },
        {
          name: "eventTime",
          type: "string",
          description: "Event start time",
          required: true,
          defaultValue: "2:00 PM - 6:00 PM EST",
          aiInstructions: "Include timezone. Format as 'Start - End TimeZone'"
        },
        {
          name: "eventLocation",
          type: "string",
          description: "Physical location or virtual meeting link",
          required: true,
          defaultValue: "Grand Conference Hall, 123 Main Street, San Francisco, CA",
          aiInstructions: "For virtual events, include meeting platform and link. For physical events, include full address."
        },
        {
          name: "ticketType",
          type: "string",
          description: "Type of ticket purchased",
          required: true,
          defaultValue: "General Admission",
          aiInstructions: "Specify ticket tier (e.g., 'VIP', 'Early Bird', 'General Admission')"
        },
        {
          name: "ticketPrice",
          type: "string",
          description: "Price paid for ticket",
          required: true,
          defaultValue: "$49.00",
          aiInstructions: "Include currency symbol. Use 'FREE' or 'Complimentary' for free tickets."
        },
        {
          name: "confirmationCode",
          type: "string",
          description: "Unique confirmation/ticket code",
          required: true,
          defaultValue: "EC-2025-AB12CD",
          aiInstructions: "Generate unique alphanumeric code for ticket validation"
        },
        {
          name: "whatToBring",
          type: "string",
          description: "Items attendees should bring",
          required: false,
          defaultValue: "Your confirmation email (printed or on your phone), a valid ID, and business cards for networking.",
          aiInstructions: "List essential items for the event. Be specific to event type (e.g., laptops for workshops)."
        },
        {
          name: "importantNotes",
          type: "string",
          description: "Critical information for attendees",
          required: false,
          defaultValue: "Doors open 30 minutes before start time. Parking is available in the West Lot. Light refreshments will be provided.",
          aiInstructions: "Include practical details: parking, dress code, COVID policies, accessibility info, etc."
        },
        {
          name: "calendarUrl",
          type: "url",
          description: "Calendar invite download link (.ics file)",
          required: true,
          defaultValue: "https://example.com/calendar/event-123.ics",
          aiInstructions: "Generate .ics file with event details. Include event name, date, location, and description."
        },
        {
          name: "supportEmail",
          type: "email",
          description: "Contact email for questions",
          required: true,
          defaultValue: "events@example.com",
          aiInstructions: "Use organization's event support email or general support contact"
        },
        {
          name: "organizerName",
          type: "string",
          description: "Name of event organizer",
          required: true,
          defaultValue: "The Events Team",
          aiInstructions: "Use event organizer's name or 'The [Organization] Team'"
        },
        {
          name: "organizerTitle",
          type: "string",
          description: "Title of event organizer",
          required: false,
          defaultValue: "Event Coordinator",
          aiInstructions: "Include organizer's role if appropriate"
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
          description: "Company physical address",
          required: false,
          defaultValue: "123 Main Street, Suite 100, City, State 12345, USA"
        }
      ],
      previewData: {
        header: {
          brandColor: "#6B46C1",
          companyName: "EventPro",
          logo: "https://placehold.co/200x50/6B46C1/white?text=EventPro"
        },
        recipient: {
          firstName: "Alex",
          lastName: "Johnson",
          email: "alex.johnson@example.com"
        },
        eventName: "Tech Summit 2025: Future of AI",
        eventBannerUrl: "https://placehold.co/600x300/6B46C1/white?text=Tech+Summit+2025",
        eventDate: "Saturday, March 15, 2025",
        eventTime: "2:00 PM - 6:00 PM PST",
        eventLocation: "Moscone Center West, 800 Howard Street, San Francisco, CA 94103",
        ticketType: "Early Bird - General Admission",
        ticketPrice: "$79.00",
        confirmationCode: "TS2025-A7K3M9P2",
        whatToBring: "Your smartphone with this confirmation email, a valid photo ID, and business cards for networking. We recommend bringing a laptop if you plan to participate in hands-on workshops.",
        importantNotes: "Doors open at 1:30 PM. Badge pickup starts at 1:00 PM at the West Entrance. Validated parking is available in Moscone Garage ($15 flat rate). Light snacks and beverages will be provided. Professional attire recommended.",
        calendarUrl: "https://example.com/events/tech-summit-2025.ics",
        supportEmail: "hello@eventpro.com",
        organizerName: "Sarah Martinez",
        organizerTitle: "Director of Events",
        companyName: "EventPro",
        companyAddress: "456 Conference Way, San Francisco, CA 94105"
      }
    };

    // Check if template already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "event-confirmation-v2"))
      .first();

    if (existing) {
      // Update existing template with schema
      await ctx.db.patch(existing._id, {
        name: eventConfirmationSchema.name,
        customProperties: {
          code: eventConfirmationSchema.code,
          templateCode: eventConfirmationSchema.code,
          description: eventConfirmationSchema.description,
          category: eventConfirmationSchema.category,
          supportedLanguages: eventConfirmationSchema.supportedLanguages,
          version: eventConfirmationSchema.version,
          // Schema data
          emailTemplateSchema: eventConfirmationSchema,
        },
        updatedAt: Date.now(),
      });

      console.log("✅ Updated event confirmation template with schema");
      return { action: "updated", templateId: existing._id };
    } else {
      // Create new template with schema
      const templateId = await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "template",
        subtype: "email",
        name: eventConfirmationSchema.name,
        status: "published",
        customProperties: {
          code: eventConfirmationSchema.code,
          templateCode: eventConfirmationSchema.code,
          description: eventConfirmationSchema.description,
          category: eventConfirmationSchema.category,
          supportedLanguages: eventConfirmationSchema.supportedLanguages,
          version: eventConfirmationSchema.version,
          // Schema data
          emailTemplateSchema: eventConfirmationSchema,
        },
        createdBy: firstUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("✅ Created event confirmation template with schema");
      return { action: "created", templateId };
    }
  },
});

/**
 * DELETE EVENT CONFIRMATION TEMPLATE
 *
 * Remove the event confirmation template (for testing)
 */
export const deleteEventConfirmationTemplate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Deleting event confirmation template...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Find event confirmation template
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "email"))
      .filter((q) => q.eq(q.field("customProperties.code"), "event-confirmation-v2"))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
      console.log("✅ Deleted event confirmation template");
      return { deleted: true };
    } else {
      console.log("⚠️  Event confirmation template not found");
      return { deleted: false };
    }
  },
});
