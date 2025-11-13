/**
 * PDF TEMPLATE RESOLVER
 *
 * Generic template resolution system that works with the template ontology.
 * Resolves template IDs to their configurations for any PDF category.
 *
 * Philosophy: No hardcoded B2B/B2C logic. Templates come from database configuration.
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

/**
 * Resolved PDF Template
 *
 * Generic structure that works for all PDF categories
 */
export interface ResolvedPdfTemplate {
  _id: Id<"objects">;
  category: "invoice" | "ticket" | "certificate" | "receipt" | "badge";
  templateCode: string; // e.g., "invoice_b2b_single_v1", "ticket_professional_v1"
  name: string;
  description: string;
  version: string;
  html?: string;
  css?: string;
  requiredFields?: unknown[];
  defaultStyling?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontSize?: string;
    fontFamily?: string;
  };
}

/**
 * Resolve PDF Template from Template ID
 *
 * Works with Query and Mutation contexts only (not Actions)
 * Actions should use ctx.runQuery with pdfTemplateQueries instead
 */
export async function resolvePdfTemplate(
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"objects">
): Promise<ResolvedPdfTemplate> {
  const template = await ctx.db.get(templateId);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  if (template.type !== "template") {
    throw new Error(`Object is not a template: ${template.type}`);
  }

  if (template.subtype !== "pdf") {
    throw new Error(`Template is not a PDF template: ${template.subtype}`);
  }

  const props = template.customProperties || {};
  const category = props.category as string;
  const templateCode = props.templateCode as string;

  // Validate this is actually a PDF template with required fields
  if (!category) {
    throw new Error(
      `Template ${templateId} (${template.name}) is missing 'category' in customProperties. ` +
      `This may not be a valid PDF template. Expected categories: invoice, ticket, certificate, receipt, badge.`
    );
  }

  if (!templateCode) {
    throw new Error(
      `Template ${templateId} (${template.name}) is missing 'templateCode' in customProperties. ` +
      `This is required for PDF generation. The template may not be properly configured.`
    );
  }

  return {
    _id: template._id,
    category: category as ResolvedPdfTemplate["category"],
    templateCode,
    name: template.name,
    description: template.description || "",
    version: (props.version as string) || "1.0",
    html: props.html as string | undefined,
    css: props.css as string | undefined,
    requiredFields: props.requiredFields as unknown[] | undefined,
    defaultStyling: props.defaultStyling as ResolvedPdfTemplate["defaultStyling"] | undefined,
  };
}

/**
 * Get Default Template for Category
 *
 * Finds the system default template for a given category.
 * Useful for fallback when no template is configured.
 * Works with Query and Mutation contexts only.
 */
export async function getDefaultTemplateForCategory(
  ctx: QueryCtx | MutationCtx,
  category: "invoice" | "ticket" | "certificate" | "receipt" | "badge",
  organizationId?: Id<"organizations">
): Promise<Id<"objects"> | null> {
  // First try to find system organization
  const systemOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", "system"))
    .first();

  if (!systemOrg) {
    console.warn("System organization not found - cannot get default template");
    return null;
  }

  // Look for default template in system org
  const templates = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", systemOrg._id).eq("type", "template")
    )
    .filter((q) => q.eq(q.field("subtype"), "pdf"))
    .filter((q) => q.eq(q.field("status"), "published"))
    .collect();

  // Find matching category and default flag
  const defaultTemplate = templates.find((t) => {
    const props = t.customProperties || {};
    return props.category === category && props.isDefault === true;
  });

  if (defaultTemplate) {
    return defaultTemplate._id;
  }

  // Fallback: return first matching category
  const firstMatch = templates.find((t) => {
    const props = t.customProperties || {};
    return props.category === category;
  });

  return firstMatch?._id || null;
}

/**
 * Resolve Template with Fallback
 *
 * Tries to resolve the given template ID, falls back to default if not found.
 * Works with Query and Mutation contexts only.
 */
export async function resolvePdfTemplateWithFallback(
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"objects"> | undefined,
  category: "invoice" | "ticket" | "certificate" | "receipt" | "badge",
  organizationId?: Id<"organizations">
): Promise<ResolvedPdfTemplate> {
  // Try provided template ID first
  if (templateId) {
    try {
      return await resolvePdfTemplate(ctx, templateId);
    } catch (error) {
      console.warn(`Failed to resolve template ${templateId}, falling back to default:`, error);
    }
  }

  // Fall back to default template for category
  const defaultTemplateId = await getDefaultTemplateForCategory(ctx, category, organizationId);

  if (!defaultTemplateId) {
    throw new Error(`No default template found for category: ${category}`);
  }

  return await resolvePdfTemplate(ctx, defaultTemplateId);
}
