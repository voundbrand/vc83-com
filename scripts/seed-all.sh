#!/bin/bash

# Master Seed Script - Runs all seed scripts in the correct order
# This script seeds your Convex database with all required initial data

set -e  # Exit on any error

echo "🌱 Starting complete database seeding..."
echo ""

# Check environment
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found!"
  echo "Please run: ./scripts/switch-env.sh dev (or prod)"
  exit 1
fi

CONVEX_URL=$(grep NEXT_PUBLIC_CONVEX_URL .env.local | cut -d'=' -f2)
echo "📍 Target environment: $CONVEX_URL"
echo ""
read -p "⚠️  Is this the correct environment? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "Aborted. Use ./scripts/switch-env.sh to change environment."
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/5: Seeding RBAC System (Roles & Permissions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx scripts/seed-rbac.ts
echo "✅ RBAC system seeded"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/5: Creating Super Admin User"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx scripts/seed-super-admin.ts
echo "✅ Super admin user created"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/5: Seeding Ontology Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx convex run seedOntologyData:seedAll
echo "✅ Ontology data seeded"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/8: Seeding UI Translations (6 languages: EN, DE, PL, ES, FR, JA)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "→ Login Window translations..."
npx convex run translations/seedLogin_01_BasicAuth:seed
npx convex run translations/seedLogin_02_Forms:seed
npx convex run translations/seedLogin_03a_Buttons:seed
npx convex run translations/seedLogin_03b_Errors:seed

echo "→ Welcome Window..."
npx convex run translations/seedWelcomeTranslations:seed

echo "→ Desktop UI..."
npx convex run translations/seedDesktop:seed

echo "→ Brain Window..."
npx convex run translations/seedBrainWindowTranslations:seed

echo "→ Manage Window (Main)..."
npx convex run translations/seedManage_01_MainWindow:seed

echo "→ Manage Window (Organization)..."
npx convex run translations/seedManage_02_Organization:seed

echo "→ Manage Window (Users)..."
npx convex run translations/seedManage_03_Users:seed

echo "→ Manage Window (Roles & Permissions)..."
npx convex run translations/seedManage_04_RolesPermissions:seed

echo "→ Delete Account..."
npx convex run translations/seedManage_03b_DeleteAccount:seed

echo "→ Address Translations..."
npx convex run translations/seedAddressTranslations:seed

echo "→ Profile Translations..."
npx convex run translations/seedProfileTranslations:seed

echo "→ Settings Window..."
npx convex run translations/seedSettings:seed

echo "→ Organizations Window..."
npx convex run translations/seedOrganizations:seed

echo "→ Control Panel..."
npx convex run translations/seedControlPanel:seed

echo "→ Notifications..."
npx convex run translations/seedNotifications:seed

echo "✅ All UI translations seeded (6 languages)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/8: Registering System Apps (No authentication required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "→ Payments App..."
npx convex run seedApps:registerPaymentsApp

echo "→ Web Publishing App..."
npx convex run seedApps:registerWebPublishingApp

echo "→ Media Library App..."
npx convex run seedApps:registerMediaLibraryApp

echo "✅ System apps registered"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6/8: Seeding Templates & Themes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "→ Page templates (Landing Page, Event Landing)..."
npx convex run seedTemplates:seedSystemTemplates

echo "→ Visual themes (Modern Gradient)..."
npx convex run seedTemplates:seedSystemThemes

echo "✅ Templates & themes seeded"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7/8: Creating Organization Manager for Voundbrand"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx tsx scripts/seed-org-manager.ts
echo "✅ Organization manager created"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8/8: Final Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Complete! Database fully seeded successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ RBAC system (roles & permissions)"
echo "  ✅ Super admin user created"
echo "  ✅ Ontology data (system objects, form definitions)"
echo "  ✅ UI translations (ALL windows, 6 languages: EN, DE, PL, ES, FR, JA)"
echo "  ✅ System apps registered (Payments, Web Publishing, Media Library)"
echo "  ✅ Templates & themes (Landing Page, Event Landing, Modern Gradient)"
echo "  ✅ Organization manager for Voundbrand"
echo ""
echo "🌍 Environment: $CONVEX_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Next steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Start dev server: npm run dev"
echo "  2. Login as super admin: itsmetherealremington@gmail.com"
echo "  3. Install apps via desktop UI (apps are registered, not installed)"
echo "  4. Verify translations work in all 6 languages"
echo "  5. Customize organization profile and settings"
echo ""
echo "💡 Tip: Apps are REGISTERED (visible in app store) but not INSTALLED."
echo "    Use the desktop UI to install apps to your organization."
echo ""
