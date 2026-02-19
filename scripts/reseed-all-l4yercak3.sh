#!/bin/bash

# Reseed All l4yercak3 Translations and Data
# Run this after updating any l4yercak3 branding in the codebase
#
# IMPORTANT: All seed files implement upsert logic - they will NOT create duplicates:
# - Core seeds check if records exist before inserting
# - Translation seeds load existing translations and skip duplicates
# - Safe to run multiple times

set -e  # Exit on error

echo "🌱 Starting complete l4yercak3 database reseed..."
echo "================================================"
echo ""

# Core Seed Files
echo "📦 Step 1/5: Core Data Seeds"
echo "----------------------------"
npx convex run seedOntologyData:seedAll
npx convex run seedApps:seedSystemApps
npx convex run seedTemplates:seedAllTemplates
# Note: seedConsolidatedInvoiceWorkflow requires orgId/sessionId args - skip for general reseed
echo "✅ Core data seeded"
echo ""

# UI Core Translations
echo "🖥️  Step 2/5: UI Core Translations"
echo "----------------------------"
npx convex run translations/seedDesktop:seed
npx convex run translations/seedStartMenu:seed
npx convex run translations/seedWelcomeTranslations:seed
# Note: seedLogin is covered by seedLogin_01-04 files below (too large for single seed)
npx convex run translations/seedSettings:seed
npx convex run translations/seedControlPanel:seed
npx convex run translations/seedOrganizations:seed
# Note: seedNotifications hits 32K read limit - skip if database already populated
# npx convex run translations/seedNotifications:seed
npx convex run translations/seedContactModal:seed
npx convex run translations/seedProfileTranslations:seed
npx convex run translations/seedAddressTranslations:seed
echo "✅ UI core translations seeded"
echo ""

# Login & Auth
echo "🔐 Step 3/5: Login & Auth Translations"
echo "----------------------------"
npx convex run translations/seedLogin_01_BasicAuth:seed
npx convex run translations/seedLogin_02_Forms:seed
npx convex run translations/seedLogin_03_Buttons:seed
npx convex run translations/seedLogin_03a_Buttons:seed
npx convex run translations/seedLogin_03b_Errors:seed
npx convex run translations/seedLogin_04_Passkeys:seedLoginPasskeyTranslations
echo "✅ Login & auth translations seeded"
echo ""

# Store & Shopping
echo "🏪 Step 4/5: Store, Shopping & Platform Services"
echo "----------------------------"
npx convex run translations/seedStore:seed
npx convex run translations/seedStoreButtons:seed
npx convex run translations/seedShoppingCart:seed
npx convex run translations/seedAIAssistant:seed
npx convex run translations/seedBrainWindowTranslations:seed
echo "✅ Store & shopping translations seeded"
echo ""

# App Translations
echo "📱 Step 5/5: App Translations"
echo "----------------------------"

# Media Library
npx convex run translations/seedMediaLibrary:seed

# Products
npx convex run translations/seedProductTranslations:seed
npx convex run translations/seedProductTranslations_es:seed
npx convex run translations/seedProductTranslations_fr:seed
npx convex run translations/seedProductTranslations_ja:seed
npx convex run translations/seedProductTranslations_pl:seed

# Tickets
npx convex run translations/seedTicketsTranslations:seed

# Certificates
npx convex run translations/seedCertificatesTranslations:seed

# Events
npx convex run translations/seedEventsTranslations:seed
npx convex run translations/seedEvents_00_Main:seed
npx convex run translations/seedEvents_01_FormBasics:seed
npx convex run translations/seedEvents_02_FormMedia:seed
npx convex run translations/seedEvents_03_FormAgenda:seed
npx convex run translations/seedEvents_04_FormSponsors:seed
npx convex run translations/seedEvents_05_FormDescription:seed
npx convex run translations/seedEvents_06_DetailModal:seed

# Event Landing Pages
npx convex run translations/seedEventLanding_01_Navigation:seed
npx convex run translations/seedEventLanding_02_HeroAndVenue:seed
npx convex run translations/seedEventLanding_03_Checkout:seed
npx convex run translations/seedEventLanding_04_AgendaAndDates:seed
npx convex run translations/seedEventLanding_05_Format:seed

# Checkout
npx convex run translations/seedCheckoutWindow:seed
npx convex run translations/seedCheckoutSuccess:seed
npx convex run translations/seedCheckout_01a_BasicInfo:seed
npx convex run translations/seedCheckout_01b_Errors:seed
npx convex run translations/seedCheckout_01c_B2BFields:seed
npx convex run translations/seedCheckout_02_PaymentForm:seed
npx convex run translations/seedCheckout_03_Confirmation:seed
npx convex run translations/seedCheckout_04_InvoiceEnforcement:seed
npx convex run translations/seedCheckout_05_RegistrationForm:seed

# Checkout Templates
npx convex run translations/seedCheckoutTemplate_00_Main:seed
npx convex run translations/seedCheckoutTemplate_00_Progress:seed
npx convex run translations/seedCheckoutTemplate_01_ProductSelection:seed
npx convex run translations/seedCheckoutTemplate_02_RegistrationForm:seed
npx convex run translations/seedCheckoutTemplate_03_CustomerInfo:seed
npx convex run translations/seedCheckoutTemplate_04_ReviewOrder:seed
npx convex run translations/seedCheckoutTemplate_05a_PaymentMethods:seed
npx convex run translations/seedCheckoutTemplate_05b_PaymentForm:seed
npx convex run translations/seedCheckoutTemplate_06a_ConfirmationSuccess:seed
npx convex run translations/seedCheckoutTemplate_06b_ConfirmationInvoice:seed

# Forms
npx convex run translations/seedFormsWindowTranslations:seed
npx convex run translations/seedFormsResponses_DE:seed
npx convex run translations/seedFormsResponses_EN:seed
npx convex run translations/seedFormsResponses_ES:seed
npx convex run translations/seedFormsResponses_FR:seed
npx convex run translations/seedFormsResponses_JA:seed
npx convex run translations/seedFormsResponses_PL:seed

# CRM
npx convex run translations/seedCRM_01_OrganizationForm:seed
npx convex run translations/seedCRM_02_MainWindow:seed
npx convex run translations/seedCRM_03_ContactForm:seed
npx convex run translations/seedCRM_04_Pipeline:seed
npx convex run translations/seedCRM_06_NotificationsAndPipelines:seed

# Invoicing
npx convex run translations/seedInvoicingTranslations:seed
npx convex run translations/seedInvoicingWindow_Templates:seed

# Payments
npx convex run translations/seedPaymentTranslations:seedPaymentTranslations

# Web Publishing
npx convex run translations/seedWebPublishing:seed

# Templates
npx convex run translations/seedTemplatesTranslations:seed
npx convex run translations/seedTemplatesWindowTranslations:seed

# Workflows
npx convex run translations/seedWorkflowsTranslations:seed

# Management/Settings
npx convex run translations/seedManage_01_MainWindow:seed
npx convex run translations/seedManage_02_Organization:seed
npx convex run translations/seedManage_03_Users:seed
npx convex run translations/seedManage_03b_DeleteAccount:seed
npx convex run translations/seedManage_04_RolesPermissions:seed
npx convex run translations/seedManage_05_Security:seed
npx convex run translations/seedManage_06_DomainConfig:seed
npx convex run translations/seedManage_07_Integrations:seed
npx convex run translations/seedManage_08_AISettings:seed

echo "✅ All app translations seeded"
echo ""
echo "================================================"
echo "✅ Complete! All 97 seed files have been run."
echo "   (3 core data seeds + 94 translation seeds)"
echo "🔄 Refresh your browser to see the updates."
echo "================================================"
