/**
 * TEMPLATE DATABASE AUDIT SCRIPT
 *
 * This script audits all templates currently in the database and categorizes them:
 * - Schema-driven templates (KEEP)
 * - Hardcoded HTML templates (REMOVE)
 * - Legacy templates (EVALUATE)
 *
 * Run with:
 * ```bash
 * npx convex run auditTemplates:auditAllTemplates
 * ```
 */

import { query } from "./_generated/server";

export const auditAllTemplates = query({
  args: {},
  handler: async (ctx) => {
    console.log("\n🔍 ==============================================");
    console.log("🔍 TEMPLATE DATABASE AUDIT");
    console.log("🔍 ==============================================\n");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Fetch ALL templates from database
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    console.log(`📊 Total templates found: ${allTemplates.length}\n`);

    // Categorize templates
    const schemaEmailTemplates: any[] = [];
    const htmlEmailTemplates: any[] = [];
    const pdfTemplates: any[] = [];
    const unknownTemplates: any[] = [];

    for (const template of allTemplates) {
      const props = template.customProperties || {};
      const code = props.code || props.templateCode || "unknown";
      const category = props.category || "unknown";
      const hasSchema = !!props.emailTemplateSchema;
      const hasHtml = !!props.html;

      const info = {
        _id: template._id,
        name: template.name,
        code,
        category,
        subtype: template.subtype,
        status: template.status,
        hasSchema,
        hasHtml,
        version: props.version,
        createdAt: template.createdAt,
      };

      if (template.subtype === "pdf") {
        pdfTemplates.push(info);
      } else if (template.subtype === "email") {
        if (hasSchema && !hasHtml) {
          schemaEmailTemplates.push(info);
        } else if (hasHtml) {
          htmlEmailTemplates.push(info);
        } else {
          unknownTemplates.push(info);
        }
      } else {
        unknownTemplates.push(info);
      }
    }

    // Display results
    console.log("📧 EMAIL TEMPLATES\n");

    console.log(`✅ Schema-Driven Email Templates (${schemaEmailTemplates.length}) - KEEP THESE:`);
    schemaEmailTemplates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`);
      console.log(`      Code: ${t.code}`);
      console.log(`      Category: ${t.category}`);
      console.log(`      Version: ${t.version || "N/A"}`);
      console.log(`      Status: ${t.status}`);
      console.log("");
    });

    console.log(`❌ Hardcoded HTML Email Templates (${htmlEmailTemplates.length}) - REMOVE THESE:`);
    htmlEmailTemplates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`);
      console.log(`      Code: ${t.code}`);
      console.log(`      Category: ${t.category}`);
      console.log(`      Has HTML: ${t.hasHtml ? "Yes" : "No"}`);
      console.log(`      Has Schema: ${t.hasSchema ? "Yes" : "No"}`);
      console.log(`      Status: ${t.status}`);
      console.log("");
    });

    console.log(`\n📄 PDF TEMPLATES (${pdfTemplates.length}) - EVALUATE:\n`);
    pdfTemplates.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name}`);
      console.log(`      Code: ${t.code}`);
      console.log(`      Category: ${t.category}`);
      console.log(`      Status: ${t.status}`);
      console.log("");
    });

    if (unknownTemplates.length > 0) {
      console.log(`\n⚠️  UNKNOWN/OTHER TEMPLATES (${unknownTemplates.length}) - INVESTIGATE:\n`);
      unknownTemplates.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name}`);
        console.log(`      Code: ${t.code}`);
        console.log(`      Subtype: ${t.subtype}`);
        console.log(`      Status: ${t.status}`);
        console.log("");
      });
    }

    // Summary and recommendations
    console.log("\n📋 SUMMARY\n");
    console.log(`Total Templates: ${allTemplates.length}`);
    console.log(`├── ✅ Schema Email Templates: ${schemaEmailTemplates.length} (KEEP)`);
    console.log(`├── ❌ HTML Email Templates: ${htmlEmailTemplates.length} (REMOVE)`);
    console.log(`├── 📄 PDF Templates: ${pdfTemplates.length} (EVALUATE)`);
    console.log(`└── ⚠️  Unknown Templates: ${unknownTemplates.length} (INVESTIGATE)`);

    console.log("\n💡 RECOMMENDATIONS\n");
    console.log("1. KEEP: All schema-driven email templates (these are our new v2.0 templates)");
    console.log("2. REMOVE: All hardcoded HTML email templates (replaced by schema versions)");
    console.log("3. KEEP: PDF templates (these are still functional)");
    console.log("4. INVESTIGATE: Unknown templates (check if they're being used)");

    console.log("\n🚀 NEXT STEPS\n");
    console.log("1. Review the list above");
    console.log("2. Confirm which templates to remove");
    console.log("3. Run migration script with --dry-run flag");
    console.log("4. If dry-run looks good, run actual migration");
    console.log("5. Verify System Default Template Set still works");

    console.log("\n==============================================\n");

    return {
      summary: {
        total: allTemplates.length,
        schemaEmail: schemaEmailTemplates.length,
        htmlEmail: htmlEmailTemplates.length,
        pdf: pdfTemplates.length,
        unknown: unknownTemplates.length,
      },
      templates: {
        schemaEmail: schemaEmailTemplates,
        htmlEmail: htmlEmailTemplates,
        pdf: pdfTemplates,
        unknown: unknownTemplates,
      },
      recommendations: {
        keep: ["Schema-driven email templates", "PDF templates (evaluate each)"],
        remove: ["Hardcoded HTML email templates"],
        investigate: ["Unknown/uncategorized templates"],
      },
    };
  },
});

/**
 * GET DETAILED TEMPLATE INFO
 *
 * Fetch full details for a specific template by ID
 */
export const getTemplateDetails = query({
  args: {},
  handler: async (ctx) => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Fetch all templates with full details
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    return allTemplates.map((t) => ({
      _id: t._id,
      name: t.name,
      type: t.type,
      subtype: t.subtype,
      status: t.status,
      customProperties: t.customProperties,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  },
});

/**
 * FIND TEMPLATES BY CODE
 *
 * Search for templates by their code/templateCode
 */
export const findTemplatesByCode = query({
  args: {},
  handler: async (ctx) => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Our 5 schema-driven template codes
    const schemaCodes = [
      "event-confirmation-v2",
      "transaction-receipt-v2",
      "newsletter-confirmation",
      "invoice-email-v2",
      "pdf_invoice_b2b_single",
    ];

    // Fetch all templates
    const allTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .collect();

    const found: Record<string, any> = {};
    const notFound: string[] = [];

    for (const code of schemaCodes) {
      const template = allTemplates.find(
        (t) =>
          t.customProperties?.code === code ||
          t.customProperties?.templateCode === code
      );

      if (template) {
        found[code] = {
          _id: template._id,
          name: template.name,
          status: template.status,
        };
      } else {
        notFound.push(code);
      }
    }

    console.log("\n🔍 Schema Template Status Check\n");
    console.log("✅ Found:");
    Object.entries(found).forEach(([code, info]) => {
      console.log(`   ${code}: ${info.name} (${info.status})`);
    });

    if (notFound.length > 0) {
      console.log("\n❌ Not Found:");
      notFound.forEach((code) => {
        console.log(`   ${code}`);
      });
    }

    return { found, notFound };
  },
});
