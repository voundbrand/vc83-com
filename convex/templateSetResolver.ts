/**
 * TEMPLATE SET RESOLVER
 *
 * Resolves which template set to use based on simple 3-level precedence:
 *
 * 1. Manual Send (explicit admin choice) - highest priority
 * 2. Context Override (Product > Checkout > Domain) - most specific wins
 * 3. Organization Default - guaranteed fallback
 *
 * Returns the resolved template set and individual template IDs for all three types.
 */

import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export interface ResolvedTemplateSet {
  setId: Id<"objects">;
  setName: string;
  ticketTemplateId: Id<"objects">;
  invoiceTemplateId: Id<"objects">;
  emailTemplateId: Id<"objects">;
  source: "manual" | "product" | "checkout" | "domain" | "organization" | "system";
}

/**
 * Resolve Template Set
 *
 * Determines which template set to use based on context and precedence rules.
 *
 * @param ctx - Query context
 * @param organizationId - Current organization
 * @param context - Optional context for overrides
 * @returns Resolved template set with all template IDs
 */
export async function resolveTemplateSet(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  context?: {
    manualSetId?: Id<"objects">;              // Manual override (highest priority)
    productId?: Id<"objects">;                // Product context
    checkoutInstanceId?: Id<"objects">;       // Checkout context
    domainConfigId?: Id<"objects">;           // Domain context
  }
): Promise<ResolvedTemplateSet> {
  // Level 1: Manual Send (explicit admin choice)
  if (context?.manualSetId) {
    const manualSet = await ctx.db.get(context.manualSetId);
    if (manualSet && manualSet.type === "template_set") {
      return buildResult(manualSet, "manual");
    }
  }

  // Level 2: Context Override (Product > Checkout > Domain)

  // Check Product override (most specific)
  if (context?.productId) {
    const product = await ctx.db.get(context.productId);
    const productSetId = product?.customProperties?.templateSetId as Id<"objects"> | undefined;

    if (productSetId) {
      const productSet = await ctx.db.get(productSetId);
      if (productSet && productSet.type === "template_set") {
        return buildResult(productSet, "product");
      }
    }
  }

  // Check Checkout override
  if (context?.checkoutInstanceId) {
    const checkout = await ctx.db.get(context.checkoutInstanceId);
    const checkoutSetId = checkout?.customProperties?.templateSetId as Id<"objects"> | undefined;

    if (checkoutSetId) {
      const checkoutSet = await ctx.db.get(checkoutSetId);
      if (checkoutSet && checkoutSet.type === "template_set") {
        return buildResult(checkoutSet, "checkout");
      }
    }
  }

  // Check Domain override
  if (context?.domainConfigId) {
    const domain = await ctx.db.get(context.domainConfigId);
    const domainSetId = domain?.customProperties?.templateSetId as Id<"objects"> | undefined;

    if (domainSetId) {
      const domainSet = await ctx.db.get(domainSetId);
      if (domainSet && domainSet.type === "template_set") {
        return buildResult(domainSet, "domain");
      }
    }
  }

  // Level 3: Organization Default
  const orgDefault = await getOrganizationDefaultSet(ctx, organizationId);
  if (orgDefault) {
    return buildResult(orgDefault, "organization");
  }

  // Ultimate fallback: System Default
  const systemDefault = await getSystemDefaultSet(ctx);
  if (systemDefault) {
    return buildResult(systemDefault, "system");
  }

  // No template set configured anywhere!
  throw new Error(
    `No template set configured for organization ${organizationId}. ` +
    `Please create and set a default template set, or seed system templates.`
  );
}

/**
 * Get Organization Default Template Set
 */
async function getOrganizationDefaultSet(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) {
  const orgSets = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "template_set")
    )
    .filter((q) => q.neq(q.field("status"), "deleted"))
    .collect();

  // Find explicit default
  const defaultSet = orgSets.find((set) => set.customProperties?.isDefault === true);
  if (defaultSet) return defaultSet;

  // Fall back to first active set
  return orgSets[0] || null;
}

/**
 * Get System Default Template Set
 */
async function getSystemDefaultSet(ctx: QueryCtx) {
  const systemOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", "system"))
    .first();

  if (!systemOrg) return null;

  const systemSets = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", systemOrg._id).eq("type", "template_set")
    )
    .filter((q) => q.neq(q.field("status"), "deleted"))
    .collect();

  // Find explicit system default
  const defaultSet = systemSets.find((set) => set.customProperties?.isSystemDefault === true);
  if (defaultSet) return defaultSet;

  // Fall back to first system set
  return systemSets[0] || null;
}

/**
 * Build Result Object
 *
 * Extracts template IDs from a template set and builds the result.
 */
function buildResult(
  set: { _id: Id<"objects">; name: string; customProperties?: Record<string, unknown> },
  source: ResolvedTemplateSet["source"]
): ResolvedTemplateSet {
  const props = set.customProperties || {};

  const ticketTemplateId = props.ticketTemplateId as Id<"objects"> | undefined;
  const invoiceTemplateId = props.invoiceTemplateId as Id<"objects"> | undefined;
  const emailTemplateId = props.emailTemplateId as Id<"objects"> | undefined;

  if (!ticketTemplateId || !invoiceTemplateId || !emailTemplateId) {
    throw new Error(
      `Template set "${set.name}" is incomplete. ` +
      `All three templates (ticket, invoice, email) must be configured.`
    );
  }

  return {
    setId: set._id,
    setName: set.name,
    ticketTemplateId,
    invoiceTemplateId,
    emailTemplateId,
    source,
  };
}

/**
 * Resolve Template Set for Checkout Session
 *
 * Convenience function for checkout flows.
 * Automatically resolves based on session context.
 */
export async function resolveTemplateSetForCheckout(
  ctx: QueryCtx,
  sessionId: Id<"objects">
): Promise<ResolvedTemplateSet> {
  const session = await ctx.db.get(sessionId);
  if (!session || session.type !== "checkout_session") {
    throw new Error("Invalid checkout session");
  }

  const organizationId = session.organizationId;
  const props = session.customProperties || {};

  // Extract context from session
  const context: Parameters<typeof resolveTemplateSet>[2] = {
    checkoutInstanceId: props.checkoutInstanceId as Id<"objects"> | undefined,
    domainConfigId: props.domainConfigId as Id<"objects"> | undefined,
  };

  // If session has products, check if any have template set overrides
  const selectedProducts = props.selectedProducts as Array<{ productId: string }> | undefined;
  if (selectedProducts && selectedProducts.length > 0) {
    // Use first product's template set if available
    // (In the future, could support per-product resolution)
    context.productId = selectedProducts[0].productId as Id<"objects">;
  }

  return await resolveTemplateSet(ctx, organizationId, context);
}

/**
 * Resolve Individual Template by Type
 *
 * Resolves a single template type (ticket, invoice, or email) from the set.
 * Useful when you only need one template type.
 */
export async function resolveIndividualTemplate(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  templateType: "ticket" | "invoice" | "email",
  context?: Parameters<typeof resolveTemplateSet>[2]
): Promise<Id<"objects">> {
  const resolved = await resolveTemplateSet(ctx, organizationId, context);

  switch (templateType) {
    case "ticket":
      return resolved.ticketTemplateId;
    case "invoice":
      return resolved.invoiceTemplateId;
    case "email":
      return resolved.emailTemplateId;
  }
}
