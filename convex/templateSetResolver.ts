/**
 * TEMPLATE SET RESOLVER (v2.0 - Flexible Composition)
 *
 * Resolves which template set to use based on 6-level precedence:
 *
 * 1. Manual Send (explicit admin choice) - highest priority
 * 2. Product Override - product-specific branding
 * 3. Checkout Override - checkout-specific configuration
 * 4. Domain Override - domain-specific branding
 * 5. Organization Default - org's default set
 * 6. System Default - guaranteed fallback
 *
 * Returns the resolved template set with flexible template map.
 * Supports both v1.0 (legacy 3-template) and v2.0 (flexible) formats.
 */

import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  type TemplateCapability,
  getTemplateTypePriorityForCapability,
  normalizeTemplateCapability,
} from "../src/templates/template-types";

export interface ResolvedTemplateSet {
  setId: Id<"objects">;
  setName: string;
  version: string; // "1.0" or "2.0"
  templates: Map<string, Id<"objects">>; // templateType/capability -> templateId
  capabilities: Map<TemplateCapability, Id<"objects">>; // canonical capability -> templateId
  source: "manual" | "product" | "checkout" | "domain" | "organization" | "system";

  // v1.0 backward compatibility (deprecated but maintained)
  ticketTemplateId?: Id<"objects">;
  invoiceTemplateId?: Id<"objects">;
  emailTemplateId?: Id<"objects">;
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
 * Build Result Object (v2.0 - Flexible)
 *
 * Extracts template IDs from a template set and builds the result.
 * Supports both v1.0 (legacy) and v2.0 (flexible) formats.
 */
function buildResult(
  set: { _id: Id<"objects">; name: string; customProperties?: Record<string, unknown> },
  source: ResolvedTemplateSet["source"]
): ResolvedTemplateSet {
  const props = set.customProperties || {};
  const version = (props.version as string) || "1.0";
  const templates = new Map<string, Id<"objects">>();

  if (version === "2.0" && Array.isArray(props.templates)) {
    // v2.0: Flexible composition
    for (const t of props.templates as Array<{ templateId: string; templateType: string }>) {
      templates.set(t.templateType, t.templateId as Id<"objects">);
    }

    const capabilities = buildCapabilityMap(templates);

    // Extract legacy fields for backward compatibility with smart fallback
    // v2.0 uses granular types ("event", "invoice_email", "receipt", "newsletter")
    // But checkout/UI expects v1.0 types ("ticket", "email", "invoice")
    //
    // Mapping strategy:
    // - ticketTemplateId: "ticket" (v1.0) OR "event" (v2.0 - event confirmations act as tickets)
    // - emailTemplateId: "email" (v1.0) OR "invoice_email" (v2.0) OR "event" (v2.0 fallback)
    // - invoiceTemplateId: "invoice" (same in both versions)
    const ticketTemplateId =
      capabilities.get("document_ticket") || templates.get("ticket") || templates.get("event");
    const invoiceTemplateId =
      capabilities.get("document_invoice") || templates.get("invoice");
    const emailTemplateId =
      capabilities.get("transactional_email") ||
      templates.get("email") ||
      templates.get("invoice_email") ||
      templates.get("event");

    return {
      setId: set._id,
      setName: set.name,
      version,
      templates,
      capabilities,
      source,
      // Backward compatibility
      ticketTemplateId,
      invoiceTemplateId,
      emailTemplateId,
    };
  } else {
    // v1.0: Legacy 3-template format
    const ticketTemplateId = props.ticketTemplateId as Id<"objects"> | undefined;
    const invoiceTemplateId = props.invoiceTemplateId as Id<"objects"> | undefined;
    const emailTemplateId = props.emailTemplateId as Id<"objects"> | undefined;

    if (!ticketTemplateId || !invoiceTemplateId || !emailTemplateId) {
      throw new Error(
        `Template set "${set.name}" is incomplete. ` +
        `All three templates (ticket, invoice, email) must be configured.`
      );
    }

    // Convert to v2.0 map format internally
    templates.set("ticket", ticketTemplateId);
    templates.set("invoice", invoiceTemplateId);
    templates.set("email", emailTemplateId);
    const capabilities = buildCapabilityMap(templates);

    return {
      setId: set._id,
      setName: set.name,
      version: "1.0",
      templates,
      capabilities,
      source,
      // Backward compatibility
      ticketTemplateId,
      invoiceTemplateId,
      emailTemplateId,
    };
  }
}

function buildCapabilityMap(
  templates: Map<string, Id<"objects">>
): Map<TemplateCapability, Id<"objects">> {
  const capabilities = new Map<TemplateCapability, Id<"objects">>();

  const capabilityOrder: TemplateCapability[] = [
    "document_invoice",
    "document_ticket",
    "transactional_email",
    "web_event_page",
    "checkout_surface",
  ];

  for (const capability of capabilityOrder) {
    const candidateTemplateTypes = getTemplateTypePriorityForCapability(capability);
    for (const templateType of candidateTemplateTypes) {
      const templateId = templates.get(templateType);
      if (templateId) {
        capabilities.set(capability, templateId);
        break;
      }
    }
  }

  return capabilities;
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
 * Resolve Individual Template by Selector (v2.0 - Flexible)
 *
 * Resolves a single template by canonical capability or legacy template type.
 *
 * @param ctx - Query context
 * @param organizationId - Organization ID
 * @param templateSelector - Capability/type selector (e.g., "document_ticket", "ticket", "email")
 * @param context - Optional context for overrides
 * @returns Template ID or null if not found in set
 */
export async function resolveIndividualTemplate(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  templateSelector: string,
  context?: Parameters<typeof resolveTemplateSet>[2]
): Promise<Id<"objects"> | null> {
  const resolved = await resolveTemplateSet(ctx, organizationId, context);

  // Direct key lookup first (supports both canonical capability keys and legacy type keys).
  const directTemplateId = resolved.templates.get(templateSelector);
  if (directTemplateId) {
    return directTemplateId;
  }

  const capability = normalizeTemplateCapability(templateSelector);
  if (capability) {
    // Canonical capability lookup.
    const capabilityTemplateId = resolved.capabilities.get(capability);
    if (capabilityTemplateId) {
      return capabilityTemplateId;
    }

    // Compatibility lookup through prioritized legacy keys.
    for (const legacyType of getTemplateTypePriorityForCapability(capability)) {
      const legacyTemplateId = resolved.templates.get(legacyType);
      if (legacyTemplateId) {
        return legacyTemplateId;
      }
    }

    // Backward compatibility via v1 compatibility fields.
    if (capability === "document_ticket" && resolved.ticketTemplateId) {
      return resolved.ticketTemplateId;
    }
    if (capability === "document_invoice" && resolved.invoiceTemplateId) {
      return resolved.invoiceTemplateId;
    }
    if (capability === "transactional_email" && resolved.emailTemplateId) {
      return resolved.emailTemplateId;
    }
  }

  // Backward compatibility: check legacy fields
  if (templateSelector === "ticket" && resolved.ticketTemplateId) {
    return resolved.ticketTemplateId;
  }
  if (templateSelector === "invoice" && resolved.invoiceTemplateId) {
    return resolved.invoiceTemplateId;
  }
  if (templateSelector === "email" && resolved.emailTemplateId) {
    return resolved.emailTemplateId;
  }

  // Template type not found in set
  return null;
}

/**
 * Get All Templates from Set
 *
 * Returns all templates in the resolved set as a map.
 * Useful for displaying all available templates or batch operations.
 *
 * @param ctx - Query context
 * @param organizationId - Organization ID
 * @param context - Optional context for overrides
 * @returns Map of templateType -> templateId
 */
export async function getAllTemplatesFromSet(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  context?: Parameters<typeof resolveTemplateSet>[2]
): Promise<Map<string, Id<"objects">>> {
  const resolved = await resolveTemplateSet(ctx, organizationId, context);
  return resolved.templates;
}
