/**
 * SEED CHECKOUT TEMPLATES
 *
 * Seeds system checkout templates into the database.
 * Similar to seedFormTemplates.ts and seedWebPublishingTemplates.ts
 *
 * Run with: npx convex run seedCheckoutTemplates:seedCheckoutTemplates
 */

import { mutation } from "./_generated/server";

export const seedCheckoutTemplates = mutation({
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

    // Check if checkout templates already exist (type: "template", subtype: "checkout")
    const existingTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "checkout"))
      .collect();

    console.log(`Found ${existingTemplates.length} existing checkout templates`);

    // Define checkout templates to seed
    const checkoutTemplates = [
      {
        code: "ticket-checkout",
        name: "Event Ticket Checkout",
        description:
          "Multi-tier event ticket checkout with quantity selection, early bird pricing, and line item breakdown. Perfect for events with multiple ticket types (VIP, General, Student, etc.). Supports early bird discounts, original price display, and secure Stripe payments.",
        category: "ticket",
        icon: "🎫",
        previewImageUrl: "/images/checkout-templates/ticket-preview.png",
        supportsFormIntegration: true, // ✅ Supports collecting forms during checkout
        features: [
          "Multiple ticket tier support (VIP, General, Student, Early Bird)",
          "Quantity selection per ticket type",
          "Early bird pricing with automatic date validation",
          "Original price strikethrough for discounts",
          "Line-by-line ticket breakdown in cart",
          "Total savings calculation",
          "Real-time price updates",
          "Secure Stripe checkout integration",
          "Mobile-responsive sticky sidebar layout",
          "Maximum tickets per order configuration",
          "Currency formatting (USD, EUR, GBP, etc.)",
          "Custom ticket descriptions and features",
        ],
        componentProps: [
          "eventId: Event reference",
          "eventName: Display name",
          "eventDate: Event date/time",
          "venue: Location (optional)",
          "tickets: Array of ticket items",
          "organizationId: Org reference",
          "theme: Visual theme",
          "onCheckout: Callback function",
          "maxTicketsPerOrder: Limit per transaction",
        ],
        dataStructure: {
          ticket: {
            id: "Product object ID",
            name: "Ticket tier name (e.g., VIP Pass)",
            description: "Ticket description",
            price: "Current price in cents",
            originalPrice: "Original price (optional)",
            currency: "USD, EUR, GBP, etc.",
            stripePriceId: "Stripe Price ID",
            customProperties: {
              ticketTier: "vip | general | student | earlybird",
              earlyBirdEndDate: "ISO date string (optional)",
              earlyBirdPrice: "Discounted price in cents (optional)",
              checkoutUrl: "Stripe checkout URL",
            },
          },
        },
        useCases: [
          "Conference and symposium tickets",
          "Concert and festival admissions",
          "Workshop and training sessions",
          "Webinar and online event registrations",
          "Fundraising gala tickets",
          "Sporting event admissions",
          "Theater and performing arts tickets",
        ],
        complexity: "intermediate",
        estimatedSetupTime: "15 minutes",
        requiredIntegrations: ["Stripe"],
        supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
        layoutOptions: ["sticky-sidebar", "embedded"],
      },
      {
        code: "product-checkout",
        name: "Product Checkout (Coming Soon)",
        description:
          "E-commerce product checkout with cart management, shipping options, and tax calculation. Perfect for physical and digital products.",
        category: "product",
        icon: "📦",
        previewImageUrl: "/images/checkout-templates/product-preview.png",
        supportsFormIntegration: false, // ❌ Does not support form integration (product-focused)
        features: [
          "Shopping cart management",
          "Shipping address collection",
          "Multiple shipping options",
          "Tax calculation by region",
          "Promo code support",
          "Product variants (size, color, etc.)",
          "Inventory tracking",
          "Order confirmation emails",
        ],
        useCases: [
          "E-commerce stores",
          "Digital product sales",
          "Merchandise shops",
          "Subscription boxes",
        ],
        complexity: "advanced",
        estimatedSetupTime: "30 minutes",
        requiredIntegrations: ["Stripe", "Shipping API"],
        comingSoon: true,
      },
      {
        code: "service-checkout",
        name: "Service Booking Checkout (Coming Soon)",
        description:
          "Time-slot based service booking with calendar integration, appointment scheduling, and deposit payments.",
        category: "service",
        icon: "⚙️",
        previewImageUrl: "/images/checkout-templates/service-preview.png",
        supportsFormIntegration: false, // ❌ Does not support form integration (booking-focused)
        features: [
          "Calendar-based time slot selection",
          "Service duration configuration",
          "Staff/resource assignment",
          "Deposit or full payment options",
          "Booking confirmation",
          "Cancellation policies",
          "Recurring appointments",
          "Email reminders",
        ],
        useCases: [
          "Consulting and coaching",
          "Medical appointments",
          "Salon and spa services",
          "Equipment rentals",
        ],
        complexity: "advanced",
        estimatedSetupTime: "45 minutes",
        requiredIntegrations: ["Stripe", "Calendar API"],
        comingSoon: true,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const template of checkoutTemplates) {
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
        console.log(`Updated checkout template: ${template.code}`);
      } else {
        // Create new template (type: "template", subtype: "checkout")
        await ctx.db.insert("objects", {
          organizationId: systemOrg._id,
          type: "template",
          subtype: "checkout",
          name: template.name,
          description: template.description,
          status: template.comingSoon ? "draft" : "published",
          customProperties: {
            ...template,
            category: template.category, // Store original category in customProperties
            version: "1.0.0",
            author: "System",
          },
          createdBy: firstUser._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        createdCount++;
        console.log(`Created checkout template: ${template.code}`);
      }
    }

    return {
      success: true,
      message: `Checkout templates seeded: ${createdCount} created, ${updatedCount} updated`,
      totalTemplates: checkoutTemplates.length,
      createdCount,
      updatedCount,
    };
  },
});
