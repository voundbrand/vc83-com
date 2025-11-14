# Template Fallback Strategy & System Defaults

## Problem Statement

Currently, PDF generation can fail silently if:
1. Organization has no templates configured
2. System organization has no default templates
3. Hardcoded fallback template codes don't exist in database

## Recommended Solution: Guaranteed System Defaults

### 1. System Template Seeding (Required)

Every deployment MUST have these system-level default templates in the "system" organization:

**Invoice Templates:**
- `invoice_b2c_receipt_v1` - B2C receipt style (marked as `isDefault: true`)
- `invoice_b2b_professional_v1` - B2B professional invoice
- `invoice_detailed_breakdown_v1` - Detailed line items

**Ticket Templates:**
- `ticket_professional_v1` - Professional ticket style (marked as `isDefault: true`)
- `ticket_elegant_gold_v1` - Elegant gold theme
- `ticket_vip_premium_v1` - VIP premium design

**Email Templates:**
- `email_order_confirmation_v1` - Order confirmation (marked as `isDefault: true`)
- `email_ticket_delivery_v1` - Ticket delivery
- `email_invoice_delivery_v1` - Invoice delivery

### 2. Fallback Hierarchy (Implemented)

Current fallback hierarchy is correct, but needs validation:

**For Tickets:**
```
1. Session ticketTemplateId (organization-specific)
   ↓
2. Product ticketTemplateId (product-specific override)
   ↓
3. Domain ticketTemplateId (domain-level default)
   ↓
4. Organization default ticket template (isDefault: true)
   ↓
5. System default ticket template (system org, isDefault: true)
   ↓
6. GUARANTEED: ticket_professional_v1 (must exist via seeding)
```

**For Invoices:**
```
1. Session invoiceTemplateId (checkout-specific)
   ↓
2. Legacy pdfTemplateCode (deprecated, migration path)
   ↓
3. Organization default invoice template (isDefault: true)
   ↓
4. System default invoice template (system org, isDefault: true)
   ↓
5. GUARANTEED: invoice_b2c_receipt_v1 (must exist via seeding)
```

### 3. Required Database Changes

**Add to convex/schema.ts:**
```typescript
// In objects table customProperties:
{
  isSystemDefault: boolean,  // NEW: True for guaranteed system fallbacks
  isDefault: boolean,        // Existing: True for org-level defaults
  category: "invoice" | "ticket" | "email",
  templateCode: string,
}
```

**Validation:**
- Only ONE template per category can be `isSystemDefault: true` in system org
- Each organization can have multiple templates but only ONE `isDefault: true` per category

### 4. Seed Script (convex/seedSystemTemplates.ts)

Create a mutation that seeds system templates:

```typescript
export const seedSystemTemplates = mutation({
  handler: async (ctx) => {
    const systemOrg = await getSystemOrganization(ctx);

    // Check if system defaults already exist
    const existingDefaults = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter(q => q.eq(q.field("customProperties.isSystemDefault"), true))
      .collect();

    if (existingDefaults.length > 0) {
      console.log("✅ System default templates already exist");
      return;
    }

    // Create guaranteed system defaults
    await createTemplate(ctx, {
      category: "invoice",
      templateCode: "invoice_b2c_receipt_v1",
      isSystemDefault: true,
      isDefault: true,
    });

    await createTemplate(ctx, {
      category: "ticket",
      templateCode: "ticket_professional_v1",
      isSystemDefault: true,
      isDefault: true,
    });

    // ... create all other system templates
  }
});
```

**Run at:**
- Initial deployment
- Database migrations
- Organization onboarding (copy system defaults to new org)

### 5. Template Validation on Startup

Create a health check that validates system defaults exist:

```typescript
export const validateSystemTemplates = query({
  handler: async (ctx) => {
    const requiredCategories = ["invoice", "ticket", "email"];
    const missing = [];

    for (const category of requiredCategories) {
      const defaultTemplate = await getDefaultTemplateForCategory(
        ctx,
        category
      );

      if (!defaultTemplate) {
        missing.push(category);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `CRITICAL: Missing system default templates for: ${missing.join(", ")}`
      );
    }

    return { healthy: true, message: "All system templates present" };
  }
});
```

### 6. Organization Onboarding Flow

When creating a new organization:

```typescript
export const createOrganization = mutation({
  handler: async (ctx, args) => {
    // 1. Create organization
    const orgId = await ctx.db.insert("organizations", { ... });

    // 2. Copy system default templates to new organization
    await copySystemTemplatesToOrganization(ctx, orgId);

    return orgId;
  }
});

async function copySystemTemplatesToOrganization(ctx, orgId) {
  const systemOrg = await getSystemOrganization(ctx);

  const systemTemplates = await ctx.db
    .query("objects")
    .withIndex("by_org_type", q =>
      q.eq("organizationId", systemOrg._id).eq("type", "template")
    )
    .filter(q => q.eq(q.field("customProperties.isSystemDefault"), true))
    .collect();

  for (const template of systemTemplates) {
    await ctx.db.insert("objects", {
      ...template,
      _id: undefined, // Generate new ID
      organizationId: orgId,
      customProperties: {
        ...template.customProperties,
        isSystemDefault: false, // Only system org has these
        isDefault: true, // But set as org default
      }
    });
  }
}
```

### 7. Error Handling Improvements

Replace `return null` with descriptive errors:

**In pdfGeneration.ts:**
```typescript
// Instead of:
if (!defaultTemplateId) {
  templateCode = "ticket_professional_v1"; // hardcoded fallback
}

// Do this:
if (!defaultTemplateId) {
  throw new Error(
    `CRITICAL: No default ticket template found. ` +
    `System may not be properly seeded. ` +
    `Run seedSystemTemplates mutation immediately.`
  );
}
```

### 8. Migration Path

**For existing deployments:**

1. **Check for system org:**
   ```sql
   SELECT * FROM organizations WHERE slug = 'system';
   ```

2. **Run seed script:**
   ```bash
   npx convex run seedSystemTemplates
   ```

3. **Validate:**
   ```bash
   npx convex run validateSystemTemplates
   ```

4. **For each existing organization:**
   ```bash
   npx convex run copySystemTemplatesToOrganization --orgId <id>
   ```

### 9. Testing Strategy

**Unit Tests:**
```typescript
test("PDF generation falls back to system default when org has no templates", async () => {
  // Create org with NO templates
  const orgId = await createOrg({ hasTemplates: false });

  // Generate invoice
  const pdf = await generateInvoicePDF({ checkoutSessionId, orgId });

  // Should succeed using system default
  expect(pdf).not.toBeNull();
  expect(pdf.filename).toContain("invoice-");
});

test("Throws error when system defaults missing", async () => {
  // Delete system defaults (disaster scenario)
  await deleteAllSystemTemplates();

  // Should throw clear error
  await expect(generateInvoicePDF({ checkoutSessionId }))
    .rejects.toThrow(/system may not be properly seeded/i);
});
```

**Integration Tests:**
```typescript
test("New organization gets system default templates", async () => {
  const orgId = await createOrganization({ name: "Test Org" });

  const templates = await getOrganizationTemplates(orgId);

  expect(templates).toHaveLength(3); // invoice, ticket, email
  expect(templates.every(t => t.customProperties.isDefault)).toBe(true);
});
```

## Benefits

1. ✅ **Zero Silent Failures**: Clear errors when templates missing
2. ✅ **Guaranteed Fallbacks**: System always has working templates
3. ✅ **Easy Onboarding**: New orgs get templates automatically
4. ✅ **Migration Safe**: Existing orgs can be backfilled
5. ✅ **Developer Experience**: Clear error messages for debugging

## Implementation Checklist

- [ ] Add `isSystemDefault` field to template schema
- [ ] Create `seedSystemTemplates` mutation
- [ ] Create `validateSystemTemplates` health check
- [ ] Update `createOrganization` to copy system templates
- [ ] Update `getDefaultTemplateForCategory` to throw errors instead of returning null
- [ ] Remove hardcoded fallback template codes
- [ ] Add migration script for existing deployments
- [ ] Add unit tests for fallback scenarios
- [ ] Add integration tests for org onboarding
- [ ] Document template management in admin docs

## Files to Modify

1. `convex/schema.ts` - Add isSystemDefault field
2. `convex/pdfTemplateResolver.ts` - Better error handling
3. `convex/pdfGeneration.ts` - Remove hardcoded fallbacks
4. `convex/seedSystemTemplates.ts` - NEW: Seeding script
5. `convex/organizationOntology.ts` - Update createOrganization
6. `PRODUCTION_SEED_FILES.md` - Document required seed data
