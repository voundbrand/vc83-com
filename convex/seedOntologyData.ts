/**
 * SEED ONTOLOGY DATA
 *
 * Populates the ontology tables with initial test data.
 * This includes system translations and sample content.
 */

import { internalMutation } from "./_generated/server";

export const seedAll = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Starting ontology data seeding...");

    // Get or create system organization
    let systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      console.log("Creating system organization...");
      const systemOrgId = await ctx.db.insert("organizations", {
        name: "System",
        slug: "system",
        businessName: "System Organization",
        plan: "enterprise",
        isPersonalWorkspace: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      systemOrg = await ctx.db.get(systemOrgId);
    }

    if (!systemOrg) {
      throw new Error("Systemorganisation konnte nicht erstellt werden");
    }

    // Get or create system user
    let systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      console.log("Creating system user...");
      const systemUserId = await ctx.db.insert("users", {
        email: "system@l4yercak3.com",
        firstName: "System",
        lastName: "User",
        isActive: true,
        createdAt: Date.now(),
      });
      systemUser = await ctx.db.get(systemUserId);
    }

    if (!systemUser) {
      throw new Error("Systembenutzer konnte nicht erstellt werden");
    }

    console.log("✅ System organization and user ready");

    // Seed system translations (English)
    console.log("Seeding English system translations...");
    const enSystemTranslations = [
      // Desktop translations
      { namespace: "desktop", key: "welcome-icon", value: "Welcome" },
      { namespace: "desktop", key: "login-icon", value: "Login" },
      { namespace: "desktop", key: "manage-icon", value: "Manage" },
      { namespace: "desktop", key: "settings-icon", value: "Settings" },
      { namespace: "desktop", key: "about-icon", value: "About" },

      // Window titles
      { namespace: "windows", key: "welcome-title", value: "Welcome to L4YERCAK3" },
      { namespace: "windows", key: "login-title", value: "Login" },
      { namespace: "windows", key: "manage-title", value: "Management Console" },
      { namespace: "windows", key: "settings-title", value: "Settings" },

      // Common UI
      { namespace: "common", key: "save", value: "Save" },
      { namespace: "common", key: "cancel", value: "Cancel" },
      { namespace: "common", key: "close", value: "Close" },
      { namespace: "common", key: "delete", value: "Delete" },
      { namespace: "common", key: "edit", value: "Edit" },
      { namespace: "common", key: "create", value: "Create" },

      // Auth
      { namespace: "auth", key: "email", value: "Email" },
      { namespace: "auth", key: "password", value: "Password" },
      { namespace: "auth", key: "login-button", value: "Login" },
      { namespace: "auth", key: "logout-button", value: "Logout" },
    ];

    for (const trans of enSystemTranslations) {
      await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "translation",
        subtype: "system",
        name: `${trans.namespace}.${trans.key}`,
        value: trans.value,
        locale: "en",
        status: "approved",
        customProperties: {
          namespace: trans.namespace,
          key: trans.key,
        },
        createdBy: systemUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    console.log(`✅ Created ${enSystemTranslations.length} English system translations`);

    // Seed German system translations
    console.log("Seeding German system translations...");
    const deSystemTranslations = [
      { namespace: "desktop", key: "welcome-icon", value: "Willkommen" },
      { namespace: "desktop", key: "login-icon", value: "Anmelden" },
      { namespace: "desktop", key: "manage-icon", value: "Verwalten" },
      { namespace: "desktop", key: "settings-icon", value: "Einstellungen" },
      { namespace: "desktop", key: "about-icon", value: "Über" },

      { namespace: "windows", key: "welcome-title", value: "Willkommen bei L4YERCAK3" },
      { namespace: "windows", key: "login-title", value: "Anmelden" },

      { namespace: "common", key: "save", value: "Speichern" },
      { namespace: "common", key: "cancel", value: "Abbrechen" },
      { namespace: "common", key: "close", value: "Schließen" },
    ];

    for (const trans of deSystemTranslations) {
      await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "translation",
        subtype: "system",
        name: `${trans.namespace}.${trans.key}`,
        value: trans.value,
        locale: "de",
        status: "approved",
        customProperties: {
          namespace: trans.namespace,
          key: trans.key,
        },
        createdBy: systemUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    console.log(`✅ Created ${deSystemTranslations.length} German system translations`);

    // Seed Polish system translations
    console.log("Seeding Polish system translations...");
    const plSystemTranslations = [
      { namespace: "desktop", key: "welcome-icon", value: "Witaj" },
      { namespace: "desktop", key: "login-icon", value: "Zaloguj" },
      { namespace: "desktop", key: "manage-icon", value: "Zarządzaj" },
      { namespace: "desktop", key: "settings-icon", value: "Ustawienia" },
      { namespace: "desktop", key: "about-icon", value: "O nas" },
    ];

    for (const trans of plSystemTranslations) {
      await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "translation",
        subtype: "system",
        name: `${trans.namespace}.${trans.key}`,
        value: trans.value,
        locale: "pl",
        status: "approved",
        customProperties: {
          namespace: trans.namespace,
          key: trans.key,
        },
        createdBy: systemUser._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    console.log(`✅ Created ${plSystemTranslations.length} Polish system translations`);

    // ============================================================================
    // ONTOLOGY TRANSLATIONS - Now using separate seed files!
    // ============================================================================
    console.log("⚠️  Ontology translations moved to separate seed files");
    console.log("    Run: npx convex run translations/seedWelcomeTranslations:seed");
    console.log("    Run: npx convex run translations/seedAddressTranslations:seed");
    console.log("    Run: npx convex run translations/seedProfileTranslations:seed");

    // ============================================================================
    // ORGANIZATION ONTOLOGY DATA - Now using translation keys!
    // ============================================================================
    console.log("Seeding organization ontology data...");

    // Create organization profile
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_profile",
      name: "system-profile",
      status: "active",
      customProperties: {
        industry: "Technology",
        foundedYear: 2024,
        employeeCount: "1-10",
        // ✅ Store ONLY translation keys - no fallback!
        // If translation is missing, key will be visible in UI for debugging
        bioKey: "org.profile.system.bio",
        descriptionKey: "org.profile.system.description",
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization contact info
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_contact",
      name: "system-contact",
      status: "active",
      customProperties: {
        contactEmail: "contact@l4yercak3.com",
        supportEmail: "support@l4yercak3.com",
        billingEmail: "billing@l4yercak3.com",
        contactPhone: "+1-555-L4YER83",
        website: "https://l4yercak3.com"
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization legal info
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_legal",
      name: "system-legal",
      status: "verified",
      customProperties: {
        taxId: "XX-XXXXXXX",
        vatNumber: "EUXXXXXXXXX",
        companyRegistrationNumber: "REG-2024-L4YER",
        legalEntityType: "LLC"
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization social media
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_social",
      name: "system-social",
      status: "active",
      customProperties: {
        twitter: "https://twitter.com/l4yercak3",
        linkedin: "https://linkedin.com/company/l4yercak3",
        facebook: "https://facebook.com/l4yercak3",
        instagram: "https://instagram.com/l4yercak3"
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create headquarters address
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "address",
      subtype: "physical",
      // ✅ Store translation key - if missing, key will show in UI for debugging
      name: "org.address.headquarters.name",
      description: "org.address.headquarters.description",
      status: "active",
      customProperties: {
        addressLine1: "123 Tech Street",
        addressLine2: "Suite 1983",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "USA",
        region: "Americas",
        isDefault: true,
        isPrimary: true,
        // ✅ Only translation key - no fallback!
        labelKey: "org.address.label.headquarters",
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create billing address (same as headquarters for system org)
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "address",
      subtype: "billing",
      // ✅ Store translation key - if missing, key will show in UI for debugging
      name: "org.address.billing.name",
      description: "org.address.billing.description",
      status: "active",
      customProperties: {
        addressLine1: "123 Tech Street",
        addressLine2: "Suite 1983",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "USA",
        region: "Americas",
        isDefault: true,
        isPrimary: false,
        // ✅ Only translation key - no fallback!
        labelKey: "org.address.label.billing",
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization settings - branding
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_settings",
      subtype: "branding",
      name: "system-branding",
      status: "active",
      customProperties: {
        primaryColor: "#6B46C1",
        secondaryColor: "#9F7AEA",
        logo: "/logo.png",
        customDomain: "l4yercak3.com"
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization settings - locale
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_settings",
      subtype: "locale",
      name: "system-locale",
      status: "active",
      customProperties: {
        language: "en",
        currency: "USD",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h"
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create organization settings - invoicing
    await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "organization_settings",
      subtype: "invoicing",
      name: "system-invoicing",
      status: "active",
      customProperties: {
        prefix: "INV-",
        nextNumber: 1001,
        defaultTerms: "Net 30",
        taxRate: 0.0825,
        footer: "Thank you for your business!"
      },
      createdBy: systemUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ Organization ontology data seeded");

    console.log("🎉 Ontology seeding complete!");

    return {
      success: true,
      stats: {
        systemTranslations: enSystemTranslations.length + deSystemTranslations.length + plSystemTranslations.length,
        organizationProfiles: 1,
        organizationContacts: 1,
        organizationLegal: 1,
        organizationSocial: 1,
        organizationAddresses: 2,
        organizationSettings: 3,
      },
    };
  },
});

/**
 * CLEAR ALL ONTOLOGY DATA
 * Use with caution - this deletes all objects, links, and actions
 */
export const clearAll = internalMutation({
  handler: async (ctx) => {
    console.log("🗑️ Clearing all ontology data...");

    // Delete all object actions
    const actions = await ctx.db.query("objectActions").collect();
    for (const action of actions) {
      await ctx.db.delete(action._id);
    }
    console.log(`Deleted ${actions.length} object actions`);

    // Delete all object links
    const links = await ctx.db.query("objectLinks").collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }
    console.log(`Deleted ${links.length} object links`);

    // Delete all objects
    const objects = await ctx.db.query("objects").collect();
    for (const obj of objects) {
      await ctx.db.delete(obj._id);
    }
    console.log(`Deleted ${objects.length} objects`);

    console.log("✅ Ontology data cleared");
  },
});
