# Tax Settings - Where to Find Them

## ✅ Tax Settings Tab Now Available in TWO Locations!

The comprehensive Tax Settings UI is now accessible from both the **Manage Window** (for current organization) and the **Organizations Window** (for super admin management).

---

## 📍 Location 1: Manage Window (Current Organization)

**Access Path:**
1. Click **"Manage"** icon on desktop
2. Select **"Tax Settings"** tab (4th tab, Receipt icon)

**Who Can Access:**
- Organization Owners
- Business Managers
- Anyone with `manage_organization` permission

**What You'll Find:**
- Global tax settings for YOUR organization
- Enable/disable tax collection
- Configure default tax behavior (inclusive/exclusive/automatic)
- Set origin address for tax nexus
- Manage Stripe Tax integration
- View and manage tax registrations by jurisdiction

**Use Case:**
"I want to configure tax collection for my organization's products and services."

---

## 📍 Location 2: Organizations Window (Super Admin)

**Access Path:**
1. Click **"Organizations"** icon on desktop
2. Select **"Tax Settings"** tab (5th tab, Receipt icon)

**Who Can Access:**
- Super Admins only
- System administrators

**What You'll Find:**
- Same comprehensive tax settings interface
- Configure tax for the CURRENT organization
- Useful for super admins helping organizations set up tax

**Use Case:**
"As a super admin, I need to help an organization configure their tax settings."

---

## 🎯 Tab Structure

### Manage Window Tabs:
1. **Organization** - Basic org details, addresses, legal info
2. **Users & Invites** - Team member management
3. **Roles & Permissions** - Permission configuration
4. **Tax Settings** ← **NEW!** (Receipt icon 📄)

### Organizations Window Tabs:
1. **Organizations** - List all organizations
2. **Create** - Create new organizations
3. **App Availability** - Manage app access
4. **Templates** - Manage template access
5. **Tax Settings** ← **NEW!** (Receipt icon 📄)

---

## 🔗 Integration with Existing Legal Section

The Manage Window also has a **"Tax & Legal Information"** section in the **Organization** tab. This section contains:

**Basic Legal Fields:**
- Tax ID (EIN)
- VAT Number
- Company Registration Number
- Legal Entity Type

**Tax Settings Status Banner** (coming soon):
- Shows if tax collection is enabled
- Links to the Tax Settings tab
- Warns if configuration is incomplete

**Relationship:**
- **Legal Section** = Basic identification numbers
- **Tax Settings Tab** = Full tax configuration and automation

---

## 📋 Tax Settings Tab Features

### Global Settings
- ✅ Enable/Disable tax collection
- ✅ Default tax behavior (inclusive/exclusive/automatic)
- ✅ Default tax code for products

### Origin Address
- ✅ Business address for tax nexus
- ✅ Full address form (street, city, state, postal, country)
- ✅ Determines where you collect tax

### Stripe Tax Integration
- ✅ Enable automatic tax calculation
- ✅ Tax code validation
- ✅ Real-time rate updates

### Tax Registrations
- ✅ View active registrations by jurisdiction
- ✅ Add new registrations (e.g., California, New York, EU)
- ✅ Delete/manage existing registrations
- ✅ Track registration numbers and filing frequencies

---

## 🎨 Visual Guide

### Manage Window > Tax Settings Tab

```
┌─────────────────────────────────────────┐
│ Manage                            [X]   │
├─────────────────────────────────────────┤
│ Organization │ Users │ Roles │ 📄 Tax  │ ← NEW TAB
├─────────────────────────────────────────┤
│                                         │
│  💰 Tax Settings                        │
│                                         │
│  Configure tax collection and           │
│  calculation for your organization.     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Global Settings                  │   │
│  │ ☑ Enable automatic tax collection│   │
│  │ Tax Behavior: [Exclusive ▼]     │   │
│  │ Default Tax Code: [txcd_100...] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Origin Address                   │   │
│  │ 123 Main St                      │   │
│  │ San Francisco, CA 94105          │   │
│  │ United States                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Tax Registrations                │   │
│  │ • California Sales Tax           │   │
│  │ • New York Sales Tax             │   │
│  │ [+ Add Registration]             │   │
│  └─────────────────────────────────┘   │
│                                         │
│                    [Save Tax Settings] │
└─────────────────────────────────────────┘
```

### Organizations Window > Tax Settings Tab

```
┌─────────────────────────────────────────┐
│ Organizations                     [X]   │
├─────────────────────────────────────────┤
│ List │ Create │ Apps │ Templates│📄Tax │ ← NEW TAB
├─────────────────────────────────────────┤
│                                         │
│  [Same tax settings interface]          │
│  Manages current organization's tax     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 User Workflow

### Scenario 1: Enable Tax for First Time

1. User opens **Manage Window**
2. Clicks **Tax Settings** tab
3. Checks **"Enable automatic tax collection"**
4. Selects tax behavior: **Exclusive** (US) or **Inclusive** (EU)
5. Enters **Origin Address** (business location)
6. Enables **Stripe Tax** integration
7. Clicks **Save Tax Settings**
8. Tax now automatically calculates in checkout!

### Scenario 2: Add Tax Registration

1. User opens **Manage Window** > **Tax Settings**
2. Scrolls to **Tax Registrations** section
3. Clicks **[+ Add Registration]**
4. Enters:
   - Jurisdiction: California (US-CA)
   - Registration Number: 12-3456789
   - Effective Date: 2024-01-01
   - Filing Frequency: Quarterly
5. Saves registration
6. California tax now collected automatically

### Scenario 3: Update Tax Configuration

1. Business expands to new state
2. Opens **Tax Settings** tab
3. Adds new state registration
4. System automatically starts collecting tax in new jurisdiction
5. No code changes needed!

---

## 🧩 Integration Points

### With Checkout Flow
- Tax settings automatically apply to all checkout sessions
- Stripe creates sessions with correct tax configuration
- Customers see accurate tax amounts

### With Legal Information
- Tax ID and VAT numbers in Legal section
- Used for tax registration verification
- Displayed on invoices and receipts

### With Addresses
- Primary address can be used as tax origin
- Links between address management and tax nexus
- Consistent address data across system

### With Products
- Products can have custom tax codes
- Falls back to default tax code if not specified
- Different products can have different tax behaviors

---

## 📊 Data Storage

All tax settings are stored in the **ontology system**:

**Tax Settings Object:**
```typescript
{
  type: "organization_settings",
  subtype: "tax",
  organizationId: "...",
  customProperties: {
    taxEnabled: true,
    defaultTaxBehavior: "exclusive",
    defaultTaxCode: "txcd_10000000",
    originAddress: { ... },
    stripeSettings: { ... }
  }
}
```

**Tax Registration Object:**
```typescript
{
  type: "tax_registration",
  subtype: "US-CA", // Jurisdiction code
  organizationId: "...",
  customProperties: {
    jurisdiction: "US-CA",
    registrationNumber: "...",
    effectiveDate: ...,
    filingFrequency: "quarterly"
  }
}
```

---

## ✅ Quality Status

- **TypeScript**: ✅ No type errors
- **Linting**: ✅ Only warnings (no errors)
- **Functionality**: ✅ Fully integrated
- **Documentation**: ✅ Comprehensive

---

## 🚀 Next Steps

### To Use Tax Settings:

1. **Open Tax Settings Tab** (Manage Window or Organizations Window)
2. **Enable Tax Collection**
3. **Configure Tax Behavior** (exclusive for US, inclusive for EU)
4. **Add Origin Address** (your business location)
5. **Enable Stripe Tax** (automatic rate calculation)
6. **Add Tax Registrations** (jurisdictions where you collect tax)
7. **Save Settings**

### Tax Now Works In:

- ✅ Checkout flows (automatically calculates tax)
- ✅ Stripe sessions (tax added to payments)
- ✅ Product pricing (displays with/without tax)
- ✅ Invoices (shows tax breakdown)

---

## 📞 Support

For questions about:
- **Tax configuration** → See [TAX_INTEGRATION_COMPLETE.md](./reference_docs/TAX_INTEGRATION_COMPLETE.md)
- **Stripe Tax** → See [STRIPE_TAX_INTEGRATION.md](./STRIPE_TAX_INTEGRATION.md)
- **Tax system architecture** → See [TAX_SYSTEM.md](./TAX_SYSTEM.md)
- **Integration guide** → See [TAX_SETTINGS_INTEGRATION.md](./TAX_SETTINGS_INTEGRATION.md)

---

**Status**: ✅ **LIVE AND READY TO USE!**

The Tax Settings tab is now fully integrated and accessible in both windows. Organizations can start configuring tax collection immediately!
