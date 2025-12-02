# 🌱 Database Reseeding Guide

Complete guide for reseeding your l4yercak3 database from scratch.

## 📋 Table of Contents

1. [When to Reseed](#when-to-reseed)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Automated)](#quick-start-automated)
4. [Complete Seeding (All Steps)](#complete-seeding-all-steps)
5. [Manual Seeding (Step-by-Step)](#manual-seeding-step-by-step)
6. [Troubleshooting](#troubleshooting)
7. [What Gets Seeded](#what-gets-seeded)

---

## 🎯 When to Reseed

Reseed your database when:

- ✅ Starting with a **clean/blank database**
- ✅ After **major schema changes** that require fresh data
- ✅ When **switching environments** (dev ↔ prod) for the first time
- ✅ After **data corruption** or testing that requires reset
- ✅ When **migrating to new infrastructure**

⚠️ **WARNING**: Reseeding will **delete ALL existing data**. Make sure you have backups if needed!

---

## 🚀 Prerequisites

### 1. Environment Setup

Make sure you have the correct environment configured:

```bash
# For development
./scripts/switch-env.sh dev

# For production
./scripts/switch-env.sh prod
```

This creates/updates `.env.local` with the correct Convex deployment URL.

### 2. Verify Environment

```bash
# Check which environment you're targeting
grep NEXT_PUBLIC_CONVEX_URL .env.local

# Development should show:
# NEXT_PUBLIC_CONVEX_URL=https://aromatic-akita-723.convex.cloud

# Production should show:
# NEXT_PUBLIC_CONVEX_URL=https://agreeable-lion-828.convex.cloud
```

### 3. Required Tools

Ensure you have:
- Node.js v18+
- npm/pnpm
- Convex CLI (`npm i -g convex`)

---

## ⚡ Quick Start (Automated - Basic Seeding)

The **fastest way** to seed your database is using the master seed script:

```bash
# 1. Switch to correct environment
./scripts/switch-env.sh dev  # or prod

# 2. Run master seed script
./scripts/seed-all.sh
```

### What This Does:

1. ✅ Seeds **RBAC system** (roles & permissions)
2. ✅ Creates **super admin user** (itsmetherealremington@gmail.com)
3. ✅ Seeds **ontology data** (system objects, form definitions)
4. ✅ Seeds **ALL UI translations** (6 languages: EN, DE, PL, ES, FR, JA)
5. ✅ Registers **system apps** (Payments, Web Publishing, Media Library)
6. ✅ Seeds **templates & themes** (Landing Page, Event Landing, Modern Gradient)
7. ✅ Creates **organization manager** for Voundbrand org

**✨ NOW INCLUDES EVERYTHING!** The seed-all.sh script now provides a **complete database setup** in one command.

**Estimated time**: 5-8 minutes (complete setup with all apps, translations, and templates)

---

## 🎯 Complete Seeding (Simplified!)

For a **fully seeded database** with all features, you now only need **2 simple steps**:

### Step 1: Run the Master Seed Script
```bash
./scripts/switch-env.sh dev
./scripts/seed-all.sh
```

**That's it!** This single script now:
- ✅ Seeds RBAC, super admin user, ontology data
- ✅ Seeds **ALL** UI translations (6 languages)
- ✅ Registers **ALL** system apps
- ✅ Seeds **ALL** templates & themes

### Step 2: Login & Install Apps via UI
```bash
npm run dev
# Go to http://localhost:3000
# Login with: itsmetherealremington@gmail.com
# Set your password
# Use desktop UI to install apps to your organization
```

**No more manual seeding steps!** Everything is included in seed-all.sh now.

---

## 🔧 Manual Seeding (Advanced - Step-by-Step)

If you need more control or want to understand each step, you can run seed commands individually.

**⚠️ Note**: Since seed-all.sh now includes everything, manual seeding is rarely needed. Use this section only for debugging or selective seeding.

### Step 1: Seed RBAC System
npx convex run translations/seedLogin_03a_Buttons:seed
npx convex run translations/seedLogin_03b_Errors:seed

# Desktop & System UI
npx convex run translations/seedDesktop:seed
npx convex run translations/seedControlPanel:seed
npx convex run translations/seedOrganizations:seed
npx convex run translations/seedNotifications:seed
```

---

## 🔧 Manual Seeding (Step-by-Step)

If you need more control or want to understand each step:

### Step 1: Seed RBAC System

**What it does**: Creates roles (super_admin, org_owner, org_manager, org_member, org_viewer) and their permissions.

```bash
npx tsx scripts/seed-rbac.ts
```

**Output**:
```
✅ Created role: super_admin (5 permissions)
✅ Created role: org_owner (4 permissions)
✅ Created role: org_manager (3 permissions)
✅ Created role: org_member (2 permissions)
✅ Created role: org_viewer (1 permission)
```

---

### Step 2: Create Super Admin User

**What it does**: Creates the main super admin user with full platform access.

```bash
npx tsx scripts/seed-super-admin.ts
```

**Default super admin**:
- Email: `itsmetherealremington@gmail.com`
- Organization: `Voundbrand`
- Role: `super_admin` (global platform access)

**To customize**, edit `scripts/seed-super-admin.ts`:
```typescript
const SUPER_ADMIN = {
  email: "your-email@example.com",
  firstName: "Your",
  lastName: "Name",
  organizationName: "Your Company",
  organizationSlug: "your-company",
};
```

---

### Step 3: Seed Ontology Data

**What it does**: Creates system objects for form definitions, validations, and app metadata.

```bash
npx convex run seedOntologyData:seedAll
```

**Creates**:
- Form definitions (organization profile, legal info, social links)
- Validation rules
- System templates
- App metadata structures

---

### Step 4: Seed ALL UI Translations

**What it does**: Seeds complete UI translations for all windows (6 languages: EN, DE, PL, ES, FR, JA).

```bash
# Login Window translations
npx convex run translations/seedLogin_01_BasicAuth:seed
npx convex run translations/seedLogin_02_Forms:seed
npx convex run translations/seedLogin_03a_Buttons:seed
npx convex run translations/seedLogin_03b_Errors:seed

# Welcome Window
npx convex run translations/seedWelcomeTranslations:seed

# Desktop UI
npx convex run translations/seedDesktop:seed

# Manage Window (all tabs)
npx convex run translations/seedManage_01_MainWindow:seed
npx convex run translations/seedManage_02_Organization:seed
npx convex run translations/seedManage_03_Users:seed
npx convex run translations/seedManage_04_RolesPermissions:seed
npx convex run translations/seedManage_03b_DeleteAccount:seed

# Address & Profile Forms
npx convex run translations/seedAddressTranslations:seed
npx convex run translations/seedProfileTranslations:seed

# Settings Window
npx convex run translations/seedSettings:seed

# Organizations Window
npx convex run translations/seedOrganizations:seed

# Control Panel
npx convex run translations/seedControlPanel:seed

# Notifications
npx convex run translations/seedNotifications:seed
```

**All translations included in `seed-all.sh`** - no need to run these manually!

---

### Step 5: Seed System Apps (No Authentication Required)

**What it does**: Registers system apps in the app store so they can be installed by organizations.

**⚠️ Note**: This only **registers** the apps. Installation is done separately by super admins via the desktop UI.

```bash
# Register core apps (no authentication required!)
npx convex run seedApps:registerPaymentsApp
npx convex run seedApps:registerWebPublishingApp
npx convex run seedApps:registerMediaLibraryApp

# Optional: Register Checkout App (experimental feature)
npx convex run seedCheckoutApp:seedCheckoutApp
```

**Apps that get registered**:
- 💰 **Payments App** (`payments`): Full payment platform - invoicing, recurring billing, payment management
- 🌐 **Web Publishing App** (`web-publishing`): Landing pages, website builder, SEO tools
- 🖼️ **Media Library App** (`media-library`): File uploads, image management, media organization

**After seeding**: Apps appear in the app store and can be installed to organizations via the desktop UI (requires super admin role)

**Optional Checkout App**:
```bash
# Only seed if you plan to use experimental checkout features
npx convex run seedCheckoutApp:seedCheckoutApp
```
- 💳 **Checkout App** (`app_checkout`): Simplified checkout for events, tickets, digital products (⚠️ ~80% complete, experimental)

---

### Step 6: Seed Templates & Themes

**What it does**: Registers page templates and visual themes for the Publishing App.

```bash
# Seed all templates (landing page, event page, etc.)
npx convex run seedTemplates:seedSystemTemplates

# Seed all themes (modern gradient, minimalist, etc.)
npx convex run seedTemplates:seedSystemThemes

# Or seed everything at once
npx convex run seedTemplates:seedAllTemplates
```

**Templates**:
- Landing Page (hero, content sections, CTA)
- Event Landing Page (event details, ticket sales)
- Blog Post (article layout)

**Themes**:
- Modern Gradient (colorful gradients)
- Minimalist (clean, simple)
- Dark Mode (dark backgrounds)

---

### Step 7: Seed Additional UI Translations (Optional)

**What it does**: Seeds translations for Login, Desktop, Organizations windows.

```bash
# Login Window translations (~200 strings)
npx convex run translations/seedLogin_01_BasicAuth:seed
npx convex run translations/seedLogin_02_Forms:seed
npx convex run translations/seedLogin_03a_Buttons:seed
npx convex run translations/seedLogin_03b_Errors:seed

# Desktop UI translations (~150 strings)
npx convex run translations/seedDesktop:seed

# Control Panel translations (~100 strings)
npx convex run translations/seedControlPanel:seed

# Organizations Window translations (~300 strings)
npx convex run translations/seedOrganizations:seed

# Notifications translations (~50 strings)
npx convex run translations/seedNotifications:seed
```

**Note**: The core UI translations (Step 4) are sufficient for basic operation. These are optional for complete translation coverage.

---

### Step 8: Create Organization Manager for Voundbrand

**What it does**: Creates an organization manager user for the Voundbrand organization.

```bash
npx tsx scripts/seed-org-manager.ts
```

**Default manager**:
- Email: `manager@example.com`
- Organization: `Voundbrand`
- Role: `org_manager`

**To customize**, edit `scripts/seed-org-manager.ts`.

**⚠️ Note**: This step is **automatically included** in `seed-all.sh` now, so you don't need to run it manually!

---

## 📦 What Gets Seeded

### RBAC System
- **5 roles**: super_admin, org_owner, org_manager, org_member, org_viewer
- **10+ permissions**: Granular access control for all features
- **Role-permission mappings**: Complete permission matrix

### Users & Organizations
- **1 super admin user**: Full platform access
- **1 organization**: Default workspace for super admin (Voundbrand)
- **Optional manager users**: Additional organization managers

### Ontology Data
- **Form definitions**: Organization profile, legal info, addresses
- **Validation rules**: Email, phone, URL, text length validations
- **System objects**: Metadata for dynamic forms
- **App metadata**: Structures for app configuration

### UI Translations (NOW INCLUDES EVERYTHING!)

**All translations included in seed-all.sh:**
- **Complete translation coverage** for all windows and UI elements
- **6 languages**: English (EN), German (DE), Polish (PL), Spanish (ES), French (FR), Japanese (JA)
- **Windows covered**:
  - Login Window (authentication, forms, buttons, errors)
  - Welcome Window (onboarding, taglines)
  - Desktop UI (taskbar, start menu, window chrome)
  - Manage Window (all tabs: Main, Organization, Users, Roles & Permissions, Delete Account)
  - Settings Window (user preferences, system settings)
  - Organizations Window (multi-org management)
  - Control Panel (system configuration)
  - Notifications (toast messages, alerts)
  - Address & Profile Forms (ontology-driven translation keys)

### System Apps (NOW INCLUDED IN SEED-ALL.SH!)

**Core apps registered automatically:**
- **💰 Payments App**: Full payment platform (invoices, subscriptions, billing)
- **🌐 Web Publishing App**: Landing pages, website builder, SEO tools
- **🖼️ Media Library App**: File uploads, image management, media organization

**Note**: Apps are **registered** (visible in app store) but not **installed**. Installation is done via desktop UI by super admin.

**Optional Checkout App** (not included in seed-all.sh):
- **💳 Checkout App**: Simplified checkout flow (event tickets, one-time purchases) - experimental, ~80% complete

### Templates & Themes (NOW INCLUDED IN SEED-ALL.SH!)

**All templates & themes seeded automatically:**
- **2 page templates**: Landing Page, Event Landing Page
- **1 visual theme**: Modern Gradient (purple l4yercak3 branding)
- **Metadata only**: React components live in `/src/templates/`

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to Convex"

```bash
# Make sure Convex dev server is running
npx convex dev

# In another terminal, run seed scripts
./scripts/seed-all.sh
```

### Issue: "NEXT_PUBLIC_CONVEX_URL not found"

```bash
# Switch environment first
./scripts/switch-env.sh dev

# Verify .env.local exists
cat .env.local
```

### Issue: "Role not found" errors during user creation

```bash
# Make sure RBAC is seeded first
npx tsx scripts/seed-rbac.ts

# Then create users
npx tsx scripts/seed-super-admin.ts
```

### Issue: Apps not appearing in app store

Make sure you've registered the apps:

```bash
# Register apps (no authentication required)
npx convex run seedApps:registerPaymentsApp
npx convex run seedApps:registerWebPublishingApp
npx convex run seedApps:registerMediaLibraryApp
```

Then login as super admin to install them via the desktop UI.

### Issue: Seeding hangs or times out

```bash
# Check Convex dashboard for errors
# Dashboard: https://dashboard.convex.dev

# Clear Convex cache and restart
rm -rf node_modules/.convex
npx convex dev --clear-cache
```

### Issue: "Super admin already exists"

This is **expected behavior**. The seed scripts skip if data already exists:

```
✅ Super admin already exists: itsmetherealremington@gmail.com
⏭️  Skipping super admin creation
```

---

## 🔄 Reseeding Workflow (Simplified!)

### For Development (Fresh Start)

```bash
# 1. Switch to dev environment
./scripts/switch-env.sh dev

# 2. Run master seed script (includes EVERYTHING!)
./scripts/seed-all.sh

# 3. Start dev server and login
npm run dev
# Go to http://localhost:3000
# Login and install apps via UI

# That's it! Everything is seeded automatically.
```

**What seed-all.sh includes:**
- ✅ RBAC, super admin, ontology
- ✅ ALL translations (6 languages)
- ✅ ALL system apps
- ✅ ALL templates & themes

### For Production (First Time Setup)

```bash
# 1. Switch to production
./scripts/switch-env.sh prod

# 2. VERIFY you're targeting production
grep NEXT_PUBLIC_CONVEX_URL .env.local

# 3. Run master seed script (includes EVERYTHING!)
./scripts/seed-all.sh

# 4. Deploy frontend to Vercel
npm run build
# Push to Vercel

# 5. Login to production site
# Go to https://app.l4yercak3.com
# Login and install apps via UI

# Done! No manual steps needed.
```

---

## 📝 Post-Seeding Checklist

After seeding, verify everything worked:

### 1. Check Users
```bash
# Use Convex dashboard to verify users exist
# Dashboard → Data → users table
```

### 2. Test Login
```bash
# Start dev server
npm run dev

# Login with super admin:
# Email: itsmetherealremington@gmail.com
# (Set password on first login)
```

### 3. Verify Windows
Open each window and check:
- ✅ Welcome Window displays
- ✅ Manage Window shows organization data
- ✅ Settings Window loads preferences
- ✅ All translations display correctly (no translation keys showing)

### 4. Check RBAC
- ✅ Super admin can access everything
- ✅ Role dropdowns show all roles
- ✅ Permission matrix displays correctly

### 5. Verify Apps (After Seeding Apps)
- ✅ Payments app shows in app store
- ✅ Web Publishing app available
- ✅ Media Library accessible
- ✅ Can install apps to organization

### 6. Check Templates (After Seeding Templates)
- ✅ Templates show in Publishing app
- ✅ Themes are selectable
- ✅ Preview images display

---

## 🎯 Next Steps

After successful seeding:

1. **Set user passwords**: Super admin needs to set password on first login
2. **Install apps**: Login as super admin and use desktop UI to install apps to your organization
3. **Configure Stripe**: Add Stripe keys to Convex for payment features
4. **Invite users**: Use Manage Window to invite team members
5. **Customize organization**: Update org profile, logo, addresses
6. **Create content**: Start using Web Publishing, Media Library, and Payments apps

---

## 📚 Related Documentation

- [RBAC Complete Guide](./RBAC_COMPLETE_GUIDE.md) - Role-based access control
- [Translation System](./TRANSLATION_SYSTEM.md) - i18n architecture
- [Ontology Forms](./ONTOLOGY_FORMS_SUMMARY.md) - Dynamic form system
- [App Registration](./HOW_TO_REGISTER_APPS.md) - Adding new apps
- [Shared Template System](./SHARED_TEMPLATE_SYSTEM.md) - Templates and themes

---

## 🔐 Security Notes

### Production Seeding

When seeding production:

1. **Use strong passwords**: Change default super admin password immediately
2. **Limit super admins**: Only 1-2 super admins should exist
3. **Review roles**: Ensure proper role assignments
4. **Audit logs**: Check audit logs after seeding
5. **Backup**: Take a backup immediately after successful seeding

### Environment Separation

- ❌ **Never** seed production with development data
- ❌ **Never** share super admin credentials
- ❌ **Never** commit passwords or API keys
- ✅ **Always** verify environment before seeding
- ✅ **Always** use environment-specific Stripe keys

---

## 💡 Tips

- **Idempotent**: All seed scripts are idempotent (safe to run multiple times)
- **One script does everything**: `seed-all.sh` now includes ALL translations, apps, and templates!
- **6 languages**: Translations in English, German, Polish, Spanish, French, and Japanese
- **No auth needed**: App seeding doesn't require authentication - much simpler workflow!
- **Custom data**: Edit seed scripts to add your own default data
- **Selective seeding**: Run individual seed commands only if you need debugging
- **Complete in 2 steps**: Run seed-all.sh, then login to install apps via UI

---

**Last Updated**: October 2025
**Maintainer**: Remington Splettstoesser
