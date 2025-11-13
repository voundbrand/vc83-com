/**
 * EMAIL TEMPLATE RESOLVER
 *
 * Generic template resolution system for email templates.
 * Resolves template IDs to their configurations for email rendering.
 *
 * Philosophy: No hardcoded logic. Templates come from database configuration.
 * Similar pattern to pdfTemplateResolver.ts but for email templates.
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Resolved Email Template
 *
 * Generic structure for email template metadata
 */
export interface ResolvedEmailTemplate {
  _id: Id<"objects">;
  category: "luxury" | "minimal" | "internal" | "standard" | "festival" | "corporate";
  templateCode: string; // e.g., "luxury-confirmation", "sales-notification"
  name: string;
  description: string;
  version: string;
  previewImageUrl?: string;
  supportedLanguages?: string[];
}

/**
 * Resolve Email Template from Template ID
 *
 * Works with Query and Mutation contexts only (not Actions)
 * Actions should use ctx.runQuery with appropriate queries instead
 */
export async function resolveEmailTemplate(
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"objects">
): Promise<ResolvedEmailTemplate> {
  const template = await ctx.db.get(templateId);

  if (!template) {
    throw new Error(`Email template not found: ${templateId}`);
  }

  if (template.type !== "template") {
    throw new Error(`Object is not a template: ${template.type}`);
  }

  if (template.subtype !== "email") {
    throw new Error(`Template is not an email template: ${template.subtype}`);
  }

  const props = template.customProperties || {};
  const category = props.category as string;
  const templateCode = props.templateCode as string;

  // Validate this is actually an email template with required fields
  if (!category) {
    throw new Error(
      `Email template ${templateId} (${template.name}) is missing 'category' in customProperties. ` +
      `This may not be a valid email template. Expected categories: luxury, minimal, internal, standard, festival, corporate.`
    );
  }

  if (!templateCode) {
    throw new Error(
      `Email template ${templateId} (${template.name}) is missing 'templateCode' in customProperties. ` +
      `This is required for email rendering. The template may not be properly configured.`
    );
  }

  return {
    _id: template._id,
    category: category as ResolvedEmailTemplate["category"],
    templateCode,
    name: template.name,
    description: template.description || "",
    version: (props.version as string) || "1.0",
    previewImageUrl: props.previewImageUrl as string | undefined,
    supportedLanguages: props.supportedLanguages as string[] | undefined,
  };
}

/**
 * Get Default Template for Category
 *
 * Finds the system default template for a given email category.
 * Useful for fallback when no template is configured.
 * Works with Query and Mutation contexts only.
 */
export async function getDefaultEmailTemplateForCategory(
  ctx: QueryCtx | MutationCtx,
  category: "luxury" | "minimal" | "internal"
): Promise<Id<"objects"> | null> {
  // First try to find system organization
  const systemOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", "system"))
    .first();

  if (!systemOrg) {
    console.warn("System organization not found - cannot get default email template");
    return null;
  }

  // Look for default template in system org
  const templates = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", systemOrg._id).eq("type", "template")
    )
    .filter((q) => q.eq(q.field("subtype"), "email"))
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
export async function resolveEmailTemplateWithFallback(
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"objects"> | undefined,
  category: "luxury" | "minimal" | "internal"
): Promise<ResolvedEmailTemplate> {
  // Try provided template ID first
  if (templateId) {
    try {
      return await resolveEmailTemplate(ctx, templateId);
    } catch (error) {
      console.warn(`Failed to resolve email template ${templateId}, falling back to default:`, error);
    }
  }

  // Fall back to default template for category
  const defaultTemplateId = await getDefaultEmailTemplateForCategory(ctx, category);

  if (!defaultTemplateId) {
    throw new Error(`No default email template found for category: ${category}`);
  }

  return await resolveEmailTemplate(ctx, defaultTemplateId);
}
