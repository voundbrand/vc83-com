# Tax Settings Integration - Manage Window Enhancement

## Overview

The organization Manage Window already has a "Tax & Legal Information" section. We need to integrate the new comprehensive tax settings system with this existing UI.

## Current State

### Existing Tax & Legal Section (organization-details-form.tsx, lines 585-662)

**Fields:**
- Tax ID (EIN/Tax ID number)
- VAT Number
- Company Registration Number
- Legal Entity Type

**Storage:** `organization_legal` ontology object

### New Tax Settings System

**Components:**
- Tax Settings Tab (organizations-window/tax-settings-tab.tsx)
- Tax Breakdown UI (checkout/tax-breakdown.tsx)
- Stripe Tax Integration (convex/stripeCheckout.ts)

**Storage:** `organization_settings` (subtype: "tax") ontology object

## Integration Plan

### Option 1: Add Link to Advanced Tax Settings (RECOMMENDED)

Add a button/link in the Tax & Legal section that opens the comprehensive tax settings tab.

**Benefits:**
- Clean separation of basic (legal IDs) vs advanced (tax calculation)
- Doesn't clutter the existing UI
- Points users to full tax management

**Implementation:**
```tsx
{/* Tax & Legal Information */}
<OrganizationSection
  title={t("ui.manage.org.section.legal_tax")}
  icon={<Shield className="w-4 h-4" />}
  collapsible={true}
  defaultCollapsed={true}
>
  {/* Tax Configuration Status Banner */}
  <TaxSettingsStatusBanner
    organizationId={organizationId}
    sessionId={sessionId}
  />

  {/* Existing fields... */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Tax ID, VAT Number, etc. */}
  </div>
</OrganizationSection>
```

### Option 2: Embed Key Tax Settings

Add the most important tax settings directly to the Tax & Legal section.

**Fields to Add:**
- Tax collection enabled (toggle)
- Tax behavior (inclusive/exclusive/automatic)
- Default tax code
- Link to origin address configuration

**Benefits:**
- Everything in one place
- Quick access to enable/disable tax

**Drawbacks:**
- More cluttered UI
- Duplicates some functionality

## Recommended Approach

**Add a "Tax Configuration Status Banner" component that:**

1. **Shows current tax status:**
   ```
   ℹ️ Tax Collection: Enabled
   📍 Tax Nexus: San Francisco, CA
   📊 Tax Behavior: Exclusive (tax added to price)
   ```

2. **Provides quick action:**
   ```
   [Configure Tax Settings] button
   ```

3. **Shows warning if incomplete:**
   ```
   ⚠️ Tax collection is enabled but origin address is not configured.
   [Add Origin Address]
   ```

## Implementation Details

### 1. Create TaxSettingsStatusBanner Component

```tsx
// src/components/window-content/manage-window/tax-settings-status-banner.tsx

interface TaxSettingsStatusBannerProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function TaxSettingsStatusBanner({ organizationId, sessionId }: Props) {
  // Load tax settings
  const taxSettings = useQuery(api.organizationTaxSettings.getTaxSettings, {
    sessionId,
    organizationId,
  });

  // Load primary address for tax nexus
  const addresses = useQuery(api.organizationOntology.getOrganizationAddresses, {
    organizationId,
  });
  const primaryAddress = addresses?.find(a => a.customProperties?.isPrimary);

  if (!taxSettings) return null;

  const taxEnabled = taxSettings.customProperties?.taxEnabled;
  const originAddress = taxSettings.customProperties?.originAddress;
  const behavior = taxSettings.customProperties?.defaultTaxBehavior;

  return (
    <div className="tax-status-banner mb-4 p-4 border-2 rounded">
      {/* Status display */}
      {/* Warning if incomplete */}
      {/* Link to advanced settings */}
    </div>
  );
}
```

### 2. Key Integration Points

**A. Link to Origin Address**

The tax settings require an "origin address" for tax nexus determination. This should reference the primary address from the Addresses section.

```tsx
// In TaxSettingsStatusBanner:
{!originAddress && primaryAddress && (
  <button onClick={copyPrimaryAddressToTaxSettings}>
    Use {primaryAddress.name} as tax origin
  </button>
)}
```

**B. Navigate to Tax Settings Tab**

```tsx
// Add navigation to Organizations Window > Tax Settings Tab
<button onClick={() => {
  // Open organizations window
  // Switch to tax settings tab
  windowManager.openWindow("organizations-window");
  // TODO: Add tab navigation prop
}}>
  Configure Advanced Tax Settings
</button>
```

**C. Show Tax Status in Organization Info**

Add a small indicator next to the organization name showing tax status:

```tsx
// In ManageWindow header:
<p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
  {taxEnabled && "✓ Tax Enabled"} • {formatRoleName(role)}
</p>
```

## Field Relationships

### Tax ID → Used for:
- Legal identification
- Stripe Tax registration verification
- Invoicing

### VAT Number → Used for:
- EU VAT compliance
- Stripe Tax automatic validation
- B2B reverse charge mechanism

### Origin Address → Used for:
- Tax nexus determination
- Stripe Tax automatic rate calculation
- Multi-jurisdiction compliance

### Default Tax Behavior → Used for:
- Checkout price display
- Invoice total calculation
- Stripe Tax configuration

## User Flow

### Scenario 1: Enable Tax for First Time

1. User clicks "Edit Organization"
2. Scrolls to "Tax & Legal Information"
3. Sees banner: "⚠️ Tax collection not configured"
4. Clicks "Configure Tax Settings"
5. Opens Organizations Window → Tax Settings Tab
6. Enables tax, sets behavior, adds origin address
7. Returns to Manage Window
8. Banner now shows: "✓ Tax Enabled"

### Scenario 2: Update Tax Registration

1. User opens "Tax & Legal Information"
2. Updates VAT Number
3. Banner prompts: "Update tax settings with new VAT?"
4. Clicks "Sync to Tax Settings"
5. VAT number automatically added to tax registrations

### Scenario 3: Add Multiple Tax Jurisdictions

1. User configured California tax
2. Now expands to New York
3. Opens Tax Settings Tab
4. Adds New York tax registration
5. System automatically enables NY tax collection

## Data Synchronization

### From Legal Section → Tax Settings

When user updates legal fields, optionally sync:

```typescript
// When VAT number is updated:
if (newVatNumber && taxEnabled) {
  // Prompt: "Add VAT registration to tax settings?"
  // Create tax registration for EU with this VAT
}

// When tax ID is updated:
if (newTaxId && taxEnabled) {
  // Update Stripe Tax registration
}
```

### From Tax Settings → Legal Section

```typescript
// When tax registration is added:
if (newRegistration.type === "vat") {
  // Suggest updating VAT number in legal section
}
```

## Migration Path

### For Existing Organizations

```typescript
// Migration helper:
async function migrateToNewTaxSystem(org: Organization) {
  const legal = await getLegalInfo(org);

  if (legal.taxId || legal.vatNumber) {
    // They have tax info, probably need tax enabled
    await updateTaxSettings({
      organizationId: org._id,
      taxEnabled: true,
      defaultTaxBehavior: "exclusive", // US default
      // Prompt for origin address
    });

    if (legal.vatNumber) {
      // Create EU tax registration
      await createTaxRegistration({
        organizationId: org._id,
        jurisdiction: "EU",
        registrationNumber: legal.vatNumber,
      });
    }
  }
}
```

## Summary of Changes Needed

### Minimal Changes (Recommended for MVP):

1. ✅ **Add TaxSettingsStatusBanner component**
   - Shows tax enabled/disabled status
   - Links to advanced tax settings
   - Warns if configuration incomplete

2. ✅ **Add "Configure Tax Settings" button**
   - Opens Organizations Window
   - Navigates to Tax Settings Tab

3. ✅ **Show tax status in header**
   - Small indicator showing if tax is enabled

### Future Enhancements:

4. ⏳ **Add two-way sync**
   - VAT number ↔ Tax registrations
   - Tax ID ↔ Stripe Tax
   - Primary address ↔ Origin address

5. ⏳ **Add tax status widget**
   - Mini dashboard showing:
     - Tax collected this month
     - Active jurisdictions
     - Upcoming filing deadlines

6. ⏳ **Add quick actions**
   - "Enable tax for this product"
   - "Add tax registration"
   - "View tax reports"

## Files to Create/Modify

### Create:
- [ ] `src/components/window-content/manage-window/tax-settings-status-banner.tsx`

### Modify:
- [ ] `src/components/window-content/manage-window/organization-details-form.tsx`
  - Add TaxSettingsStatusBanner import
  - Add banner to Tax & Legal section
  - Add tax query hooks

### Optional (Future):
- [ ] `src/components/window-content/manage-window/tax-sync-helpers.ts`
  - Helper functions for two-way sync
  - Migration utilities
