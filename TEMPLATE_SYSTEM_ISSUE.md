# TEMPLATE SYSTEM ISSUE - Fresh Context Needed

## 🚨 CURRENT PROBLEM

**Error when making templates available as super admin:**
```
[CONVEX M(templateAvailability:enableTemplateForOrg)]
Uncaught Error: Template with code "invoice-email-v2" not found
    at handler (../convex/templateAvailability.ts:78:35)
```

**Disconnect:**
- ✅ Templates ARE visible in Template Set UI (as org owner)
- ❌ Templates CANNOT be made available through super admin UI
- 🤔 Why? Because they're system templates but the lookup is failing

---

## 📋 CURRENT STATE

### Template Set Configuration
**Template Set ID:** `q97f0z7w84v0nv9527xf9prw2h7vc4kx`
**Name:** "System Default Template Set (v2.0 - Schema-Driven)"

**Contains:**
- Invoice PDF Template: `q9765j2y1bmt9ywy8ceqapvbdh7vbjxz` ✅ FIXED (subtype: "pdf")
- Email Templates: Referenced by template code but lookup failing

### What We Just Fixed
1. ✅ **Invoice PDF Template subtype** - Changed from "invoice" to "pdf"
2. ✅ **Currency formatting** - Now uses organization settings (EUR, de-DE)
3. ✅ **Template validation** - PDF templates now pass validation

### What's Still Broken
1. ❌ **Template availability system** - Can't find templates by code
2. ❌ **Email template resolution** - "No email template found in resolved template set"
3. ❌ **Checkout email confirmation** - Fails because no email template

---

## 🏗️ ARCHITECTURE CONTEXT

### Template Types
```typescript
// Template object structure
{
  type: "template",
  subtype: "pdf" | "email" | "web" | etc.,
  customProperties: {
    category: "invoice" | "ticket" | "certificate" | etc.,
    templateCode: "invoice_b2b_single_v1" | "invoice-email-v2" | etc.,
    // ... other properties
  }
}
```

### Template Set Structure
```typescript
// Template Set points to template IDs
{
  type: "template_set",
  customProperties: {
    invoiceTemplateId: "q9765j2y1bmt9ywy8ceqapvbdh7vbjxz", // Direct ID
    emailTemplateId: "???", // Missing or wrong?
    // OR
    templates: {
      invoice: "id",
      email: "id",
      ticket: "id"
    }
  }
}
```

### Template Availability System
```typescript
// templateAvailability.ts line 78 error
// Trying to find template by code, but search is failing
const template = await findTemplateByCode(ctx, templateCode);
if (!template) {
  throw new Error(`Template with code "${templateCode}" not found`);
}
```

---

## 🔍 ROOT CAUSE HYPOTHESIS

**The issue is likely one of these:**

1. **Template Code Mismatch**
   - Template Set references: `"invoice-email-v2"`
   - Actual template has: `"invoice_email_v2"` (underscore vs dash)
   - Or template code field is missing/wrong

2. **Template Query Logic**
   - `templateAvailability.ts` searches by `customProperties.templateCode`
   - But email templates might use different field (e.g., `code` vs `templateCode`)

3. **Subtype Filter Issue**
   - Query might be filtering by wrong subtype
   - Email templates should have `subtype: "email"` but might have something else

4. **Organization ID Issue**
   - Templates are in system org
   - Availability query might be searching in wrong org

---

## 🎯 INVESTIGATION PLAN

### Step 1: Find All Email Templates
```bash
# List all email templates in system org
npx convex run templateQueries:getAllEmailTemplates

# Check specific template by code
npx convex run checkTemplateByCode:check '{"templateCode":"invoice-email-v2"}'
```

### Step 2: Inspect Template Set
```bash
# Get full template set details
npx convex run templateSetQueries:getTemplateSetById '{"setId":"q97f0z7w84v0nv9527xf9prw2h7vc4kx"}'
```

### Step 3: Check Availability Logic
```bash
# Review templateAvailability.ts line 78
# See how it searches for templates
```

### Step 4: Fix Template Codes
- Standardize naming: Use underscores consistently
- Ensure all templates have `templateCode` in customProperties
- Update Template Set to use correct codes

---

## 📝 FILES TO CHECK

1. **convex/templateAvailability.ts** (line 78) - Where error occurs
2. **convex/templateSetQueries.ts** - How template sets resolve templates
3. **convex/seedInvoiceEmailTemplateV2.ts** - Email template seed file
4. **convex/templateSetResolver.ts** - Template resolution logic
5. **convex/pdfTemplateQueries.ts** - How templates are queried

---

## ✅ DESIRED END STATE

1. **Super Admin UI** - Can make any template available to any org
2. **Template Set Resolution** - Correctly finds all templates (PDF + Email)
3. **Checkout Flow** - Successfully generates PDFs and sends emails
4. **Consistent Naming** - All template codes use same format (underscores)

---

## 🚀 QUICK START FOR FRESH SESSION

```typescript
// 1. Check what email templates exist
npx convex run pdfTemplateQueries:getAllEmailTemplates

// 2. Check template set configuration
npx convex run templateSetQueries:getAvailableTemplateSets '{"organizationId":"kn7024kr1pag4ck3haeqaf29zs7sfd78"}'

// 3. Find templates by code pattern
npx convex run auditTemplates:auditAllTemplates

// 4. Review templateAvailability.ts error logic
cat convex/templateAvailability.ts | grep -A 20 "line 78"
```

---

## 💡 LIKELY FIX

**Update all email template seed files to:**
1. Use consistent `templateCode` format (underscores not dashes)
2. Ensure `customProperties.templateCode` exists
3. Update Template Set to reference correct codes
4. Re-run seed scripts to update database

**Example:**
```typescript
// WRONG
templateCode: "invoice-email-v2"

// CORRECT
templateCode: "invoice_email_v2"
```

---

## 🎬 CONTINUATION PROMPT

```
I need help fixing the template availability system. When I try to make schema-based
templates available as super admin, I get: "Template with code 'invoice-email-v2' not found".

Context:
1. Templates ARE visible in Template Set UI
2. Templates CANNOT be made available via super admin UI
3. Just fixed PDF template subtype issue (invoice → pdf)
4. Currency formatting now works with org settings

Please investigate:
1. Why templateAvailability.ts can't find email templates by code
2. Whether there's a template code naming mismatch (dash vs underscore)
3. How to update Template Set to correctly reference email templates
4. Fix the checkout email confirmation (currently fails: "No email template found")

Files to check: templateAvailability.ts (line 78), seedInvoiceEmailTemplateV2.ts,
templateSetResolver.ts

See TEMPLATE_SYSTEM_ISSUE.md for full context.
```
