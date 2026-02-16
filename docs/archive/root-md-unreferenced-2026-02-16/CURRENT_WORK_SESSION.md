# Current Work Session - Invoice PDF & Organization Settings

**Date**: November 28, 2025
**Status**: 🔴 **DEBUGGING IN PROGRESS** - Organization settings not saving

---

## 🎯 What We Just Completed

### ✅ Invoice PDF Fresh Data Fix (PUSHED TO MAIN)
**Commit**: `450b227`

Fixed critical issue where invoice PDF regeneration was using stale checkout session data instead of fresh CRM data.

**Changes Made**:
1. **Frontend** - Pass `crmOrganizationId` and `crmContactId` when regenerating PDFs
   - File: `src/components/window-content/invoicing-window/index.tsx`

2. **Backend** - Fetch fresh CRM data for both B2B and B2C invoices
   - File: `convex/pdfGeneration.ts`
   - Added `crmContactId` parameter support
   - Created `getContactInternal` query in `convex/crmOntology.ts`

3. **Organization Language Detection** - PDFs now respect organization locale settings
   - Priority: Organization settings → Checkout instance → Default "en"

4. **UI Enhancements**:
   - ✅ Secondary color picker added to organization settings
   - ✅ Media library integration for logo upload (Browse button)
   - ✅ Logo preview with auto-hide on error

**What Now Updates Fresh**:
- CRM organization name, billing address, VAT number
- Customer name, email, phone
- Organization branding colors
- Organization phone/email

---

## 🔴 CURRENT ISSUE: Organization Settings Not Saving

### Problem Description
When user modifies organization settings and clicks "Save All Changes", the following fields are **NOT persisting**:
- ❌ Primary Color
- ❌ Secondary Color (newly added)
- ❌ Logo URL
- ❌ Language
- ❌ Currency
- ❌ Timezone
- ❌ Invoice Prefix
- ❌ Invoice Next Number
- ❌ Payment Terms (defaultTerms)

### What We've Done So Far

#### 1. **Added Comprehensive Debugging** (NOT YET COMMITTED)

**Frontend Debugging** - `src/components/window-content/org-owner-manage-window/index.tsx`
```typescript
// Lines 386-493 - Save button click handler with extensive logging
console.log("🔵 [SAVE] Save button clicked");
console.log("🔵 [SAVE] Form data retrieved:", formData);
console.log("🔵 [SAVE] Settings.branding:", formData.settings.branding);
console.log("🔵 [SAVE] Settings.locale:", formData.settings.locale);
console.log("🔵 [SAVE] Settings.invoicing:", formData.settings.invoicing);
// ... logs for each update step
```

**Backend Debugging** - `convex/organizationOntology.ts`
```typescript
// Lines 441-499 - updateOrganizationSettings mutation with logging
console.log("🟢 [BACKEND] updateOrganizationSettings called");
console.log("🟢 [BACKEND] subtype:", args.subtype);
console.log("🟢 [BACKEND] settings:", args.settings);
console.log("🟢 [BACKEND] Existing customProperties:", settingsObj.customProperties);
console.log("🟢 [BACKEND] Updating with merged customProperties:", updatedProps);
```

#### 2. **Investigation Findings**

**Save Logic Analysis** (Lines 386-468 in index.tsx):
```typescript
// ✅ Save handler EXISTS and looks correct
await Promise.all([
  updateProfile({...}),
  updateContact({...}),
  updateSocial({...}),
  updateLegal({...}),
  // Settings mutations
  updateSettings({ subtype: "branding", settings: formData.settings.branding }),
  updateSettings({ subtype: "locale", settings: formData.settings.locale }),
  updateSettings({ subtype: "invoicing", settings: formData.settings.invoicing }),
]);
```

**Backend Mutation** (Lines 434-500 in organizationOntology.ts):
```typescript
// ✅ Mutation accepts v.record(v.string(), v.any())
// ✅ Properly merges existing + new customProperties
customProperties: {
  ...settingsObj.customProperties,
  ...args.settings, // Should include secondaryColor
}
```

**Form Data Structure**:
```typescript
settings: {
  branding: {
    primaryColor: string;      // ✅ Added
    secondaryColor: string;     // ✅ Added (NEW)
    logo: string;              // ✅ Added
  };
  locale: {
    language: string;          // ✅ Exists
    currency: string;          // ✅ Exists
    timezone: string;          // ✅ Exists
  };
  invoicing: {
    prefix: string;            // ✅ Exists
    nextNumber: number;        // ✅ Exists
    defaultTerms: string;      // ✅ Exists
  };
}
```

---

## 🧪 Next Steps - DEBUGGING SESSION

### Step 1: Start Dev Server & Test
```bash
npm run dev
# Server should start on http://localhost:3001
```

### Step 2: Open Browser Console
1. Navigate to **http://localhost:3001**
2. Go to **Manage → Organization Details**
3. Open **Developer Console** (F12)

### Step 3: Make Changes & Save
1. Modify any settings:
   - Change primary/secondary colors
   - Change logo URL
   - Change language/currency/timezone
   - Change invoice prefix/terms
2. Click **"Save All Changes"**
3. **Observe console logs**

### Step 4: Share Logs
Copy/paste the entire console output showing:
- 🔵 [SAVE] frontend logs
- 🟢 [BACKEND] backend logs
- Any 🔴 errors

---

## 📁 Files Modified (Not Yet Committed)

### Frontend Changes:
- `src/components/window-content/org-owner-manage-window/index.tsx`
  - Added extensive debugging to save handler (lines 386-493)

- `src/components/window-content/org-owner-manage-window/organization-details-form.tsx`
  - Added secondaryColor field to FormData interface
  - Added secondary color picker UI
  - Added media library integration for logo upload

### Backend Changes:
- `convex/organizationOntology.ts`
  - Added debugging to updateOrganizationSettings mutation (lines 441-499)

---

## 🔍 What to Look For in Console Logs

### Expected Log Sequence:
```
🔵 [SAVE] Save button clicked
🔵 [SAVE] organizationFormRef.current: true
🔵 [SAVE] sessionId: k1...
🔵 [SAVE] organizationId: k2...
🔵 [SAVE] Form data retrieved: { settings: { branding: {...}, locale: {...}, invoicing: {...} } }
🔵 [SAVE] Settings.branding: { primaryColor: "...", secondaryColor: "...", logo: "..." }
🔵 [SAVE] Settings.locale: { language: "...", currency: "...", timezone: "..." }
🔵 [SAVE] Settings.invoicing: { prefix: "...", nextNumber: ..., defaultTerms: "..." }

🟢 [BACKEND] updateOrganizationSettings called
🟢 [BACKEND] subtype: branding
🟢 [BACKEND] settings: { primaryColor: "...", secondaryColor: "...", logo: "..." }
🟢 [BACKEND] Existing settings object found: true/false
✅ [BACKEND] Settings updated successfully for subtype: branding

... (repeat for locale and invoicing)

✅ [SAVE] All updates completed successfully!
```

### Potential Issues to Identify:
1. **Missing logs** = function not executing
2. **Wrong data in formData** = form not capturing changes
3. **Backend errors** = permission or validation issues
4. **Success logs but no persistence** = database issue

---

## 🚀 Once Issue is Fixed

### Commands to Run:
```bash
# 1. Typecheck
npm run typecheck

# 2. Lint
npm run lint

# 3. Production build
npm run build

# 4. Commit changes
git add .
git commit -m "fix: Organization settings now persist correctly

- Added debugging logs for settings save flow
- Fixed [IDENTIFIED ISSUE]
- Verified settings persist across page refresh

🤖 Generated with Claude Code"

# 5. Push to main
git push origin main
```

---

## 📝 Additional Context

### Media Library Component Location:
- `src/components/window-content/media-library-window/index.tsx`
- Already integrated with "Browse" button for logo upload

### Settings Mutations:
- `api.organizationOntology.updateOrganizationSettings`
- Accepts subtype: "branding" | "locale" | "invoicing"
- Stores in `objects` table with type `organization_settings`

### PDF Generation Translation Seeded:
- ✅ Production translations already deployed
- Command used: `CONVEX_DEPLOYMENT="prod:agreeable-lion-828" npx convex run translations/seedPdfTemplates`

---

## 🎯 Goal
Identify why organization settings (branding, locale, invoicing) are not persisting when user clicks "Save All Changes" button, despite the save logic appearing correct.

---

**Next Action**: Run dev server, test save functionality, and analyze console logs to identify the root cause.
