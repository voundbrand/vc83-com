# Template Set Saving Bug - FIXED ✅

## 🐛 The Bug

**Symptom:** When editing a default template set and selecting all schema-driven templates (9 total), only 5 templates remained selected after saving.

**Root Cause:** The `updateTemplateSet` mutation in [convex/templateSetOntology.ts](../convex/templateSetOntology.ts) was **ignoring** the `templates` array parameter!

### What Was Happening

**Frontend sends (line 869-873):**
```typescript
await updateTemplateSet({
  sessionId,
  setId: templateSet._id,
  templates: [all 9 templates]  // This was being IGNORED!
});
```

**Backend was doing (OLD CODE - line 308-316):**
```typescript
// Build updated properties
const updatedProperties = {
  ...set.customProperties,
  ...(args.ticketTemplateId && { ticketTemplateId: args.ticketTemplateId }),
  ...(args.invoiceTemplateId && { invoiceTemplateId: args.invoiceTemplateId }),
  ...(args.emailTemplateId && { emailTemplateId: args.emailTemplateId }),
  ...(args.isDefault !== undefined && { isDefault: args.isDefault }),
  ...(args.tags && { tags: args.tags }),
  ...(args.previewImageUrl !== undefined && { previewImageUrl: args.previewImageUrl }),
  // ⚠️ NOTICE: args.templates is NEVER included here!
};
```

The mutation accepted the `templates` parameter (line 249) but never saved it to `customProperties`!

---

## ✅ The Fix

### Change #1: Save the `templates` Array (line 313)

**Added this line:**
```typescript
...(args.templates && { templates: args.templates }), // 🔧 FIX: Save v2.0 templates array!
```

This ensures the templates array is saved to `customProperties.templates`.

### Change #2: Update `objectLinks` (lines 327-357)

**Added this block:**
```typescript
// 🔧 FIX: Update objectLinks when templates array changes (v2.0)
if (args.templates) {
  // Delete existing template links
  const existingLinks = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q) =>
      q.eq("fromObjectId", args.setId).eq("linkType", "includes_template")
    )
    .collect();

  for (const link of existingLinks) {
    await ctx.db.delete(link._id);
  }

  // Create new links for each template
  for (const t of args.templates) {
    await ctx.db.insert("objectLinks", {
      organizationId: set.organizationId,
      fromObjectId: args.setId,
      toObjectId: t.templateId,
      linkType: "includes_template",
      properties: {
        templateType: t.templateType,
        isRequired: t.isRequired || false,
        displayOrder: t.displayOrder || 0,
      },
      createdBy: userId,
      createdAt: Date.now(),
    });
  }
}
```

This ensures:
1. Old template links are deleted
2. New template links are created for ALL selected templates
3. Template set queries can find all templates via `objectLinks`

---

## 🧪 Testing

### Before Fix
1. Edit template set
2. Select all 9 schema-driven templates
3. Click "Save Changes"
4. **Result:** Only 5 templates remain selected ❌

### After Fix
1. Edit template set
2. Select all 9 schema-driven templates
3. Click "Save Changes"
4. **Result:** All 9 templates remain selected ✅

---

## 📊 Impact

**Files Modified:** 1
- `convex/templateSetOntology.ts` (lines 313, 327-357, 366)

**Lines Added:** ~35 lines
**Lines Changed:** 3 lines

**Backwards Compatibility:** ✅ YES
- v1.0 template sets (legacy 3-template format) still work
- v2.0 template sets (flexible array format) now save correctly

---

## 🎯 What This Fixes

✅ Template set saving now works for ALL selected templates (not just first 5)
✅ `objectLinks` table stays in sync with template selections
✅ Template set previews show accurate template counts
✅ All schema-driven templates can be added to a template set

---

## 🚀 Next Steps

Now that saving works, you can:
1. Edit the System Default Template Set
2. Select ALL schema-driven templates (9 total)
3. Save changes
4. All 9 templates will persist correctly

---

## 📚 Related Documentation

- Template Set Architecture: `docs/SESSION_SUMMARY_TEMPLATE_SYSTEM_REDESIGN.md`
- Template Set v2.0 Spec: `convex/templateSetOntology.ts` (lines 1-46)
- System Default Seeding: `convex/seedSystemDefaultTemplateSet.ts`
