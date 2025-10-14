# Seed Scripts Guide

This directory contains scripts for seeding your Convex database with initial data.

## 🚀 Quick Start - Seed Everything

**Run this single command to seed your entire database:**

```bash
./scripts/seed-all.sh
```

This master script will:
1. ✅ Check your environment configuration
2. ✅ Seed RBAC system (roles & permissions)
3. ✅ Create super admin user
4. ✅ Seed ontology data
5. ✅ Seed all UI translations (~1,200 strings)
6. ✅ Optionally create organization managers

**Total time:** ~2-3 minutes

---

## Environment Setup

All scripts now properly use environment variables from `.env.local`. **No hardcoded URLs!**

### Switching Between Environments

**For Development:**
```bash
./scripts/switch-env.sh dev
```

**For Production:**
```bash
./scripts/switch-env.sh prod
```

**IMPORTANT:** Always check which environment you're using before running seed scripts!



## Manual Seeding (Optional)

If you prefer to run individual scripts instead of the master script, follow this order:

### 1. Seed RBAC System (Foundation)
```bash
npx tsx scripts/seed-rbac.ts
```
Creates all roles and permissions. Must run first.

### 2. Seed Super Admin User
```bash
npx tsx scripts/seed-super-admin.ts
```
Creates the super admin user with global privileges and their organization.

### 3. Seed Ontology Data (Required)
```bash
npx convex run seedOntologyData:seedAll
```
Seeds system translations, organization profiles, and settings.

### 4. Seed UI Translations (Required)
**⚠️ IMPORTANT:** After running `seedOntologyData:seedAll`, you must seed the UI translations or you'll see translation keys instead of text!

```bash
# Welcome Window
npx convex run translations/seedWelcomeTranslations:seed

# Manage Window (all parts required)
npx convex run translations/seedManage_01_MainWindow:seed
npx convex run translations/seedManage_02_Organization:seed
npx convex run translations/seedManage_03_Users:seed
npx convex run translations/seedManage_04_RolesPermissions:seed
npx convex run translations/seedManage_03b_DeleteAccount:seed

# Other UI elements
npx convex run translations/seedAddressTranslations:seed
npx convex run translations/seedProfileTranslations:seed
```

**Quick seed all UI translations (recommended):**
```bash
npx convex run translations/seedWelcomeTranslations:seed && \
npx convex run translations/seedManage_01_MainWindow:seed && \
npx convex run translations/seedManage_02_Organization:seed && \
npx convex run translations/seedManage_03_Users:seed && \
npx convex run translations/seedManage_04_RolesPermissions:seed && \
npx convex run translations/seedManage_03b_DeleteAccount:seed && \
npx convex run translations/seedAddressTranslations:seed && \
npx convex run translations/seedProfileTranslations:seed
```

This seeds ~1,200 translations across all UI components.

### 5. Seed Organization Manager (Optional)
```bash
npx tsx scripts/seed-org-manager.ts
```
Creates additional organization manager users.

## Testing Connection

Test your Convex connection before seeding:

```bash
npx tsx scripts/test-connection.ts
```

## Script Features

All seed scripts now:
- ✅ Load environment variables from `.env.local`
- ✅ Validate `NEXT_PUBLIC_CONVEX_URL` exists before running
- ✅ Exit with clear error message if environment is not configured
- ✅ No hardcoded URLs or fallbacks
- ✅ Safe to run multiple times (idempotent where possible)

## Safety Notes

⚠️ **Always verify your environment before running seeds on production!**

```bash
# Quick check
echo "Current environment: $(grep NEXT_PUBLIC_CONVEX_URL .env.local | cut -d'=' -f2)"
```

- Development: `https://aromatic-akita-723.convex.cloud`
- Production: `https://agreeable-lion-828.convex.cloud`

## Troubleshooting

**Error: "NEXT_PUBLIC_CONVEX_URL not found"**
- Make sure `.env.local` exists
- Copy from `.env.dev` or `.env.prod` depending on target environment

**Error: "User already exists"**
- Normal if you've already seeded this environment
- Scripts are mostly idempotent and will skip existing data

**Error: "Role not found"**
- Run `seed-rbac.ts` first before other scripts
- RBAC must be seeded before creating users
