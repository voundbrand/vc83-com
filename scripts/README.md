# Seed Scripts Guide

This directory contains scripts for seeding your Convex database with initial data.

## Environment Setup

All scripts now properly use environment variables from `.env.local`. **No hardcoded URLs!**

### Switching Between Environments

**For Development:**
```bash
cp .env.dev .env.local
```

**For Production:**
```bash
cp .env.prod .env.local
```

**IMPORTANT:** Always check which environment you're using before running seed scripts!

```bash
# Check current environment
grep NEXT_PUBLIC_CONVEX_URL .env.local
```

## Seeding Order

Run these scripts in order for a fresh database:

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

### 3. Seed Ontology Data (Optional)
```bash
npx convex run seedOntologyData:seedAll
```
Seeds system translations, organization profiles, and settings.

### 4. Seed Organization Manager (Optional)
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
