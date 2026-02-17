# System-Level Template Sets - Architecture Guide

## 🏗️ Current Architecture

### Template Set Ownership

**Template sets are ORGANIZATION-SPECIFIC**, not system-wide. Here's how it works:

```
System Organization (slug: "system")
├── Templates (92 templates)
│   ├── Schema-driven templates (9)
│   └── Legacy HTML templates (83)
│
└── Template Sets (1)
    └── System Default Template Set (v2.0)
        ├── Contains: 5 schema-driven templates
        ├── organizationId: system org ID
        └── isSystemDefault: true

HaffNet Organization (your org)
├── Templates (0 custom templates)
│   └── (Can create custom copies of system templates)
│
└── Template Sets (0 custom sets)
    └── (Falls back to System Default when none exist)
```

### How Fallback Works

When a checkout or product needs a template set:

1. **Check for product-specific template set** → Not found
2. **Check for checkout-specific template set** → Not found
3. **Check for organization default template set** → Not found (HaffNet has no sets)
4. **Fall back to System Default template set** ✅ Uses this!

The system automatically finds and uses the System Default template set when no organization-specific sets exist.

---

## ❓ Your Question: "Should System Default be Available to ALL Organizations?"

### Current Behavior ✅ (CORRECT)

**The System Default template set IS already available to all organizations via fallback.**

You don't need to "enable" it for each org. Here's what happens:

1. System Default exists in `system` organization
2. HaffNet (and all orgs) have NO template sets
3. Template resolver checks: HaffNet sets → None found
4. Template resolver falls back to: System Default ✅

**This is the correct design!** The System Default is the "last resort" that everyone falls back to.

---

## 🎯 What You're Actually Seeing

When you go to "Edit Templates" in the Template Sets tab, you're seeing:

**System Default Template Set (owned by system org)**
- Contains 5 templates currently
- You're editing it AS super admin
- Changes affect ALL organizations (since they all fall back to it)

**You're NOT creating an org-specific copy.** You're editing the universal fallback.

---

## 🔧 How to Add More Templates to System Default

### Option 1: Seed Script (Recommended for Production)

**Use the existing seed script:**
```bash
npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
```

This will:
1. Find all 9 schema-driven templates
2. Update the System Default template set
3. Create objectLinks for all templates
4. Make it available to ALL organizations automatically

**To add MORE schema templates:**
1. Create new schema templates (e.g., `seedBadgeTemplate.ts`)
2. Update `seedSystemDefaultTemplateSet.ts` to include them
3. Re-run the seed script

### Option 2: Super Admin UI (What You're Doing)

**Edit the template set directly:**
1. Go to Super Admin → Organizations → Template Sets tab
2. Click "Edit Templates" on System Default set
3. Select all schema-driven templates you want
4. Click "Save Changes"
5. **NOW WORKS!** All 9 templates save correctly (bug fixed!)

---

## 📋 System Default Template Set - Design Pattern

### Purpose

The System Default template set serves as:
- **Ultimate fallback** for all organizations
- **Production-ready baseline** with best practices
- **Schema-driven only** for AI editing and flexibility
- **Maintained by platform team** (you as super admin)

### Characteristics

| Property | Value | Why |
|----------|-------|-----|
| `organizationId` | System org ID | Owned by platform |
| `isSystemDefault` | `true` | Marks it as the fallback |
| `isDefault` | `true` | Default within system org |
| `version` | `"2.0"` | Uses flexible template array |
| `templates` | Array of template IDs | v2.0 composition |

### Template Selection Criteria

**Include in System Default if:**
- ✅ Schema-driven (future-proof for AI)
- ✅ Production-ready (tested and stable)
- ✅ Commonly needed (80% of orgs use it)
- ✅ Maintained by platform team

**Don't include if:**
- ❌ Legacy HTML template (technical debt)
- ❌ Organization-specific branding
- ❌ Experimental/beta features
- ❌ Rarely used edge cases

---

## 🎨 Organization-Specific Template Sets

### When Organizations Should Create Their Own Sets

Organizations create custom template sets when they want:
- **Custom branding** (different colors, logos, fonts)
- **Different template combinations** (exclude some, add others)
- **Industry-specific needs** (healthcare vs retail)
- **A/B testing** (multiple sets for different products)

### How It Works

**Example: HaffNet creates "VIP Events" template set:**
```bash
# HaffNet creates a custom set
npx convex run templateSetOntology:createTemplateSet '{
  "sessionId": "...",
  "organizationId": "haffnet-org-id",
  "name": "VIP Events Template Set",
  "description": "Luxury branding for premium events",
  "templates": [
    {
      "templateId": "event-confirmation-template-id",
      "templateType": "event",
      "isRequired": true,
      "displayOrder": 1
    },
    {
      "templateId": "vip-invoice-template-id",
      "templateType": "invoice",
      "isRequired": true,
      "displayOrder": 2
    }
  ],
  "isDefault": true,
  "tags": ["vip", "luxury"]
}'
```

**Now HaffNet has:**
- **Org Default:** VIP Events template set
- **Fallback:** System Default template set (if VIP set doesn't have a needed template)

---

## 🔀 Template Resolution Order

When a checkout needs templates, the system checks in this order:

```
1. Product-specific template set
   ↓ (not found)
2. Checkout-specific template set
   ↓ (not found)
3. Domain-specific template set
   ↓ (not found)
4. Organization default template set (HaffNet's VIP set)
   ↓ (not found OR missing a template type)
5. SYSTEM DEFAULT TEMPLATE SET ✅
```

**The System Default is ALWAYS the final fallback.**

---

## 🚀 Production Deployment Strategy

### Initial Deployment

1. **Seed System Default template set** (one time)
   ```bash
   npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet
   ```

2. **Verify it exists:**
   ```bash
   npx convex run templateSetOntology:getTemplateSets '{
     "sessionId": "...",
     "organizationId": "system-org-id",
     "includeSystem": true
   }'
   ```

3. **All organizations automatically fall back to it** ✅

### Adding New Templates to System Default

**When you create a new schema template:**

1. Create seed script: `convex/seedNewTemplate.ts`
2. Run seed script to create template
3. Update `seedSystemDefaultTemplateSet.ts` to include it
4. Re-run system default seed script
5. All orgs now have access to the new template via fallback

**Example: Adding Badge Template:**

```typescript
// convex/seedSystemDefaultTemplateSet.ts

// Add this:
const badgeTemplate = systemTemplates.find((t) =>
  t.customProperties?.code === "badge-attendee-v1"
);

// Add to templates array:
{
  templateId: badgeTemplate._id,
  templateType: "badge",
  isRequired: false,
  displayOrder: 6,
}
```

---

## ✅ Summary

### What You Wanted:
> "I want the default template set to be created ONCE in the system organization and automatically available to ALL organizations on the platform."

### What We Have:
✅ **Already implemented!**

- System Default template set exists in system org
- It contains 5 schema-driven templates currently
- ALL organizations automatically fall back to it
- You can add more templates via UI or seed script
- **Bug fix ensures all selected templates save correctly**

### What to Do Now:

1. **Edit the System Default template set via UI:**
   - Go to Super Admin → Organizations → Template Sets
   - Click "Edit Templates"
   - Select all 9 schema-driven templates
   - Save changes (now works with bug fix!)

2. **Or re-run the seed script to update it programmatically:**
   ```bash
   npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
   ```

3. **All organizations will automatically use it as their fallback!** ✅

---

## 🎯 Key Takeaways

1. **System Default IS already system-wide** via automatic fallback
2. **No need to "enable" it per organization** - it's the universal fallback
3. **Organizations can create custom sets** if they want different branding
4. **Editing System Default affects all orgs** that don't have custom sets
5. **The bug that prevented saving all templates is now FIXED** ✅
