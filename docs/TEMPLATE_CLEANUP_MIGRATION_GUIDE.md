# 🧹 Template Database Cleanup Migration Guide

**Purpose**: Safely remove old hardcoded HTML email templates from the database, keeping only schema-driven templates.

**Status**: Ready for execution ✅
**Risk Level**: Low (with dry-run testing)
**Estimated Time**: 15 minutes

---

## 📋 Overview

### What This Migration Does

**✅ KEEPS (Protected Templates):**
- All 5 schema-driven templates (event-confirmation-v2, transaction-receipt-v2, newsletter-confirmation, invoice-email-v2, pdf_invoice_b2b_single)
- All PDF templates (tickets, invoices, badges, programs, quotes)
- Old invoice email (email_invoice_send) temporarily for backward compatibility

**❌ REMOVES (Old Templates):**
- Hardcoded HTML email templates (replaced by schema versions)
- Hybrid HTML+Schema templates (outdated pattern)
- Legacy email templates no longer needed

**⚠️ INVESTIGATES (Manual Review):**
- Unknown template types (protected by default until reviewed)

---

## 🚀 Step-by-Step Execution

### Step 1: Audit Current Templates (Safe - Read Only)

**Purpose**: See what's currently in the database

```bash
# Start Convex backend
npx convex dev

# In another terminal, run audit
npx convex run auditTemplates:auditAllTemplates
```

**Expected Output**:
- List of all templates in database
- Categorized by: Schema Email, HTML Email, PDF, Unknown
- Recommendations for keep/remove
- Detailed breakdown

**Review the Output**:
- Check that schema templates are present (5 expected)
- Identify hardcoded HTML templates (these will be removed)
- Note any unknown templates

---

### Step 2: Create Backup (IMPORTANT!)

**Purpose**: Create a backup before any changes

```bash
npx convex run migrateCleanupTemplates:backupAllTemplates
```

**Save the Output**:
1. Copy the entire JSON output
2. Save to a file: `backup-templates-YYYY-MM-DD.json`
3. Store safely (you'll need this for rollback if needed)

**Why This Matters**:
- Allows rollback if something goes wrong
- Peace of mind during migration
- Required for production deployment

---

### Step 3: Dry-Run Migration (Safe - No Changes)

**Purpose**: Preview what will be deleted WITHOUT actually deleting

```bash
# DRY RUN (default - no changes)
npx convex run migrateCleanupTemplates:cleanupOldTemplates '{"dryRun": true}'
```

**Expected Output**:
```
🧹 TEMPLATE CLEANUP - DRY RUN MODE (SAFE)
🧹 No templates will be deleted

✅ PROTECTED TEMPLATES (X) - Will NOT be deleted:
   1. Event Confirmation Email
      Code: event-confirmation-v2
      Reason: Schema-driven template (protected by code)
   ...

❌ TEMPLATES TO DELETE (Y):
   1. Modern Minimal Email
      Code: modern-minimal
      Category: email
      Reason: Hardcoded HTML email template (replaced by schema versions)
   ...

📋 SUMMARY
Mode: DRY RUN (no changes)
Total Templates Scanned: Z
Protected Templates: X
Templates to Delete: Y
```

**Review Carefully**:
- ✅ Check that all 5 schema templates are PROTECTED
- ✅ Check that PDF templates are PROTECTED
- ✅ Verify templates marked for deletion are actually old/unused
- ❌ If any important templates are marked for deletion, STOP and investigate

---

### Step 4: Execute Migration (Production)

**⚠️ CAUTION: This will permanently delete templates!**

**Before Running**:
- [ ] Dry-run completed and reviewed
- [ ] Backup created and saved
- [ ] All schema templates are protected
- [ ] Team notified (if applicable)
- [ ] Rollback plan ready

**Execute**:
```bash
# ACTUAL CLEANUP (changes database!)
npx convex run migrateCleanupTemplates:cleanupOldTemplates '{"dryRun": false}'
```

**Monitor Output**:
- Watch for any errors
- Verify deleted count matches dry-run preview
- Check for "Successfully deleted X templates" message

---

### Step 5: Verify System (Post-Migration)

**1. Check Schema Templates Still Exist**:
```bash
npx convex run auditTemplates:findTemplatesByCode
```

**Expected**: All 5 schema template codes should be found.

**2. Run Full Audit Again**:
```bash
npx convex run auditTemplates:auditAllTemplates
```

**Expected**:
- Schema templates: 5
- HTML templates: 0 (all removed)
- PDF templates: Same as before

**3. Test System Default Template Set**:
```bash
# Reseed to verify it still works
npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
```

**Expected**: No errors, "✅ Updated system default template set" message.

**4. Test in UI** (if applicable):
- Navigate to Templates window
- Verify schema templates are visible
- Try creating a test event/transaction
- Verify emails send correctly

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong and you need to restore templates:

### Option 1: Rollback from Backup

**Requirements**: You saved the backup from Step 2

```bash
# Prepare the backup data (edit the file path)
# Load your backup JSON file and pass the templates array

npx convex run migrateCleanupTemplates:rollbackDeletion '{"deletedTemplates": [...]}'
```

**Note**: Restored templates will have NEW IDs. You may need to update the System Default Template Set.

### Option 2: Reseed Schema Templates

If only schema templates were accidentally deleted:

```bash
npx convex run seedAllSchemaTemplates:seedAllSchemaTemplates '{"overwrite": true}'
```

---

## 📊 Protection Rules (What's Safe)

### Templates are PROTECTED if:

1. **By Code** - Matches protected codes:
   - `event-confirmation-v2`
   - `transaction-receipt-v2`
   - `newsletter-confirmation`
   - `invoice-email-v2`
   - `email_invoice_send` (temporary backward compat)
   - `pdf_invoice_b2b_single`

2. **By Type** - All PDF templates (`subtype: "pdf"`)

3. **By Category** - Matches protected categories:
   - ticket, invoice, receipt, badge, eventdoc, quote, leadmagnet

4. **By Structure** - Has schema but no HTML (schema-driven pattern)

5. **By Default** - Unknown types (protected until manually reviewed)

### Templates are DELETED if:

1. **Hardcoded HTML** - Email with HTML but no schema
2. **Hybrid Pattern** - Email with both HTML and schema (outdated)
3. **Explicitly Matched** - Doesn't match any protection rules

---

## 🧪 Testing Checklist

### Pre-Migration Testing:
- [ ] Run audit script - review output
- [ ] Create backup - save JSON
- [ ] Run dry-run - verify deletion list
- [ ] Confirm schema templates are protected
- [ ] Confirm PDF templates are protected

### Post-Migration Testing:
- [ ] Run audit again - verify cleanup
- [ ] Check schema templates exist
- [ ] Reseed System Default Template Set
- [ ] Test event email sending
- [ ] Test transaction email sending
- [ ] Test invoice email sending

### Production Deployment:
- [ ] Run backup in production
- [ ] Run dry-run in production
- [ ] Review production deletion list
- [ ] Get approval (if needed)
- [ ] Execute migration
- [ ] Verify post-migration
- [ ] Monitor for issues

---

## 📈 Expected Results

### Before Migration:
```
Total Templates: ~20-30
├── Schema Email: 5
├── HTML Email: 15-20 (will be deleted)
├── PDF: 5-10 (kept)
└── Unknown: 0-5 (kept, investigate)
```

### After Migration:
```
Total Templates: ~10-15
├── Schema Email: 5 (kept)
├── HTML Email: 0 (deleted)
├── PDF: 5-10 (kept)
└── Unknown: 0-5 (kept)
```

**Result**: ~50-70% reduction in templates, keeping only functional ones.

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Template X is marked for deletion but we need it"

**Solution**: Add its code to `protectedCodes` array in `migrateCleanupTemplates.ts` before running.

### Issue 2: "System Default Template Set broken after migration"

**Solution**:
```bash
npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
```

### Issue 3: "Accidentally deleted important template"

**Solution**: Use rollback from backup (see Rollback Plan above).

### Issue 4: "Unknown templates marked for deletion"

**Solution**: They're protected by default. Review manually, then add to deletion list if truly unused.

---

## 🎯 Migration Workflow (Quick Reference)

```bash
# 1. AUDIT (read-only)
npx convex run auditTemplates:auditAllTemplates

# 2. BACKUP (create safety net)
npx convex run migrateCleanupTemplates:backupAllTemplates > backup.json

# 3. DRY-RUN (preview changes)
npx convex run migrateCleanupTemplates:cleanupOldTemplates '{"dryRun": true}'

# 4. REVIEW OUTPUT (carefully!)
# - Check protected templates
# - Verify deletion list
# - Confirm no mistakes

# 5. EXECUTE (actual cleanup)
npx convex run migrateCleanupTemplates:cleanupOldTemplates '{"dryRun": false}'

# 6. VERIFY (post-migration)
npx convex run auditTemplates:auditAllTemplates
npx convex run auditTemplates:findTemplatesByCode
npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'

# 7. TEST (in UI)
# - Send test event email
# - Send test transaction email
# - Verify templates render correctly
```

---

## 💡 Best Practices

1. **Always run dry-run first** - Never execute without previewing
2. **Always create backup** - You'll need it for rollback
3. **Review deletion list carefully** - Don't trust automation blindly
4. **Test in development first** - Before production migration
5. **Have rollback plan ready** - Know how to restore if needed
6. **Monitor after migration** - Watch for email issues
7. **Document any custom changes** - If you modify protection rules

---

## 📞 Support & Questions

**If you encounter issues:**

1. **Check logs** - Migration script provides detailed output
2. **Run audit** - See current state: `npx convex run auditTemplates:auditAllTemplates`
3. **Check backup** - Ensure you have it before rollback
4. **Review protection rules** - Verify they match your needs

**Common Questions:**

**Q: Is this safe to run in production?**
A: Yes, IF you follow the workflow: audit → backup → dry-run → review → execute

**Q: Can I rollback if something breaks?**
A: Yes, using the backup created in Step 2

**Q: Will this break existing emails?**
A: No, schema templates are protected and will continue working

**Q: What if I have custom templates?**
A: Add their codes to `protectedCodes` array before running

---

## 🎊 Migration Status

**Current Phase**: Ready for execution ✅

**Next Steps**:
1. Run audit in your environment
2. Review what will be deleted
3. Create backup
4. Execute dry-run
5. Run migration
6. Verify results

**Questions to Answer First**:
- Do you have any custom email templates you want to keep?
- Are there any templates in use that aren't in our protected list?
- Do you want to keep the old invoice email for backward compatibility?

---

**Last Updated**: January 27, 2025
**Migration Scripts**:
- `convex/auditTemplates.ts`
- `convex/migrateCleanupTemplates.ts`
