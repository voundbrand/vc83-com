/**
 * SEED TRANSLATIONS - Auto-generated
 * Generated: 2025-10-08T15:47:55.562Z
 * Total translations: 906
 *
 * Run with: npx convex run seedTranslations:seedAll
 * Dry-run: npx convex run seedTranslations:dryRun
 * Clear with: npx convex run seedTranslations:clearTranslations
 */

import { internalMutation, internalQuery } from "./_generated/server";

/**
 * DRY RUN - Preview what will be seeded without making changes
 */
export const dryRun = internalQuery({
  handler: async (ctx) => {
    console.log("🔍 DRY RUN: Analyzing translations to be seeded...\n");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      console.log("❌ System organization not found. Run: npx convex run seedOntologyData:seedAll");
      return { error: "System organization not found" };
    }

    // Get existing translations
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    const existingByLocale: Record<string, number> = {};
    existing.forEach(t => {
      existingByLocale[t.locale || 'unknown'] = (existingByLocale[t.locale || 'unknown'] || 0) + 1;
    });

    // Count translations to be added
    const toAdd: Record<string, number> = {
      en: 302,
      de: 302,
      pl: 302,
    };

    console.log("📊 Current database state:");
    console.log(`   Total existing: ${existing.length}`);
    Object.entries(existingByLocale).forEach(([locale, count]) => {
      console.log(`   - ${locale}: ${count}`);
    });

    console.log("\n📋 Translations to be seeded:");
    Object.entries(toAdd).forEach(([locale, count]) => {
      const willAdd = count - (existingByLocale[locale] || 0);
      const willSkip = existingByLocale[locale] || 0;
      console.log(`   - ${locale}: ${count} total (${willAdd} new, ${willSkip} existing)`);
    });

    console.log("\n✅ DRY RUN complete - no changes made");

    return {
      currentTotal: existing.length,
      byLocale: existingByLocale,
      willAdd: toAdd,
      preview: {
        en: { new: 302 - (existingByLocale.en || 0), skip: existingByLocale.en || 0 },
        de: { new: 302 - (existingByLocale.de || 0), skip: existingByLocale.de || 0 },
        pl: { new: 302 - (existingByLocale.pl || 0), skip: existingByLocale.pl || 0 },
      },
    };
  },
});

export const seedAll = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding translations into ontology...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run: npx convex run seedOntologyData:seedAll");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run: npx convex run seedOntologyData:seedAll");
    }

    let totalImported = 0;
    let totalSkipped = 0;


    // English (en) - 302 translations
    console.log("\n📝 Importing English (en)...");
    {
      const translations_en = [
  {
    "namespace": "about-window",
    "key": "about-window.title",
    "value": "About L4YERCAK3",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.description",
    "value": "Stack Your Startup Tools Like a Pro",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.content.intro",
    "value": "L4YERCAK3 is a retro-inspired productivity platform that brings all your startup tools together in one nostalgic desktop experience.",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.content.features",
    "value": "Experience the satisfaction of organizing your business tools like the good old days, with modern functionality.",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "common",
    "key": "common.appName",
    "value": "L4YERCAK3",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.tagline",
    "value": "Stack Your Startup Tools Like a Pro",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.continue",
    "value": "CONTINUE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.cancel",
    "value": "CANCEL",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.save",
    "value": "SAVE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.delete",
    "value": "DELETE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.edit",
    "value": "EDIT",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.close",
    "value": "CLOSE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.back",
    "value": "BACK",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.submit",
    "value": "SUBMIT",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.ok",
    "value": "OK",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.yes",
    "value": "YES",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.no",
    "value": "NO",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.loading",
    "value": "LOADING...",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.saving",
    "value": "SAVING...",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.success",
    "value": "SUCCESS",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.error",
    "value": "ERROR",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.time.date",
    "value": "Date",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.time.time",
    "value": "Time",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.welcome",
    "value": "Welcome",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.login",
    "value": "Login",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.about",
    "value": "About",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.settings",
    "value": "Settings",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.manage",
    "value": "Manage",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.accessibility.doubleClick",
    "value": "Double-click to open {{name}}",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.accessibility.openApp",
    "value": "Open {{name}} application",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.timeout",
    "value": "Request timed out. Please try again.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.offline",
    "value": "You appear to be offline. Please check your connection.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.serverError",
    "value": "Server error. Please try again later.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.required",
    "value": "This field is required",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.invalidEmail",
    "value": "Please enter a valid email address",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.passwordTooShort",
    "value": "Password must be at least {{min}} characters",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.passwordsDontMatch",
    "value": "Passwords must match",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.unauthorized",
    "value": "You are not authorized to access this resource",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.sessionExpired",
    "value": "Your session has expired. Please log in again.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalidCredentials",
    "value": "Invalid email or password",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.close",
    "value": "Close window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.minimize",
    "value": "Minimize window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.maximize",
    "value": "Maximize window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.accessibility.dragHandle",
    "value": "Drag to move window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.accessibility.window",
    "value": "Application window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.title",
    "value": "ACCESS SYSTEM",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.subtitle",
    "value": "Enter your email to continue",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.emailLabel",
    "value": "EMAIL",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.emailPlaceholder",
    "value": "user@example.com",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.continueButton",
    "value": "CONTINUE",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.checkingButton",
    "value": "CHECKING...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.note",
    "value": "Note: This is an invite-only system. You must have been granted access by an administrator to sign in.",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.title",
    "value": "SIGN IN",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.passwordLabel",
    "value": "PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.signInButton",
    "value": "SIGN IN",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.signingInButton",
    "value": "SIGNING IN...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.differentEmailButton",
    "value": "USE DIFFERENT EMAIL",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.title",
    "value": "WELCOME!",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.subtitle",
    "value": "Set up your password to continue",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.firstNameLabel",
    "value": "FIRST NAME (Optional)",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.lastNameLabel",
    "value": "LAST NAME (Optional)",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.passwordLabel",
    "value": "PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.passwordPlaceholder",
    "value": "Minimum 6 characters",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.confirmPasswordLabel",
    "value": "CONFIRM PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.setPasswordButton",
    "value": "SET PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.settingUpButton",
    "value": "SETTING UP...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.backButton",
    "value": "BACK",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.welcomeMessage",
    "value": "Welcome, {{name}}!",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.loggedInMessage",
    "value": "You are currently logged in",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.superAdminBadge",
    "value": "[SUPER ADMIN]",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.emailLabel",
    "value": "Email:",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.userIdLabel",
    "value": "User ID:",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.logOutButton",
    "value": "LOG OUT",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.validation.passwordsMatch",
    "value": "✓ Passwords match",
    "subtype": "validation",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.validation.passwordsDontMatch",
    "value": "✗ Passwords do not match",
    "subtype": "validation",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.enterEmail",
    "value": "Please enter your email address",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.noAccount",
    "value": "No account found. Please contact an administrator for access.",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.invalidCredentials",
    "value": "Invalid credentials",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.passwordsDontMatch",
    "value": "Passwords do not match",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.passwordTooShort",
    "value": "Password must be at least 6 characters",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.genericError",
    "value": "An error occurred",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.accessibility.showPassword",
    "value": "Show password",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.accessibility.hidePassword",
    "value": "Hide password",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.title",
    "value": "Organization Settings",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.name.label",
    "value": "Organization Name",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.name.placeholder",
    "value": "Enter organization name",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.description.label",
    "value": "Description",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.description.placeholder",
    "value": "Brief description of your organization",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.title",
    "value": "General Settings",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.timezone",
    "value": "Timezone",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.language",
    "value": "Default Language",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.title",
    "value": "Roles & Permissions",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.description",
    "value": "Manage user roles and their permissions",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.admin",
    "value": "Administrator",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.member",
    "value": "Member",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.viewer",
    "value": "Viewer",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.read",
    "value": "Read",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.write",
    "value": "Write",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.delete",
    "value": "Delete",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.manage",
    "value": "Manage",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.title",
    "value": "User Management",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.name",
    "value": "Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.email",
    "value": "Email",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.role",
    "value": "Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.status",
    "value": "Status",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.actions",
    "value": "Actions",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.button",
    "value": "Invite User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.title",
    "value": "Invite New User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.emailLabel",
    "value": "Email Address",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.emailPlaceholder",
    "value": "user@example.com",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.roleLabel",
    "value": "Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.sendButton",
    "value": "Send Invitation",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.sendingButton",
    "value": "Sending...",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.title",
    "value": "Edit User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.firstNameLabel",
    "value": "First Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.lastNameLabel",
    "value": "Last Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.roleLabel",
    "value": "Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.statusLabel",
    "value": "Status",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.saveButton",
    "value": "Save Changes",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.savingButton",
    "value": "Saving...",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.active",
    "value": "Active",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.inactive",
    "value": "Inactive",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.pending",
    "value": "Pending",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.title",
    "value": "Management Center",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.users",
    "value": "Users",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.roles",
    "value": "Roles & Permissions",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.organization",
    "value": "Organization",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.title",
    "value": "Mobile Menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.showMenu",
    "value": "Show menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.hideMenu",
    "value": "Hide menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.applications",
    "value": "Applications",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.settings",
    "value": "Settings",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.welcome",
    "value": "Welcome",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.login",
    "value": "Login",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.about",
    "value": "About",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.settings",
    "value": "Settings",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.controlPanel",
    "value": "Control Panel",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.manage",
    "value": "Manage",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.title",
    "value": "Start Menu",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.programs",
    "value": "Programs",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.settings",
    "value": "Settings",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.shutdown",
    "value": "Shut Down",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.taskbar.start",
    "value": "Start",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.primary",
    "value": "Primary Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.secondary",
    "value": "Secondary Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.outline",
    "value": "Outline Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.small",
    "value": "Small",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.medium",
    "value": "Medium",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.large",
    "value": "Large",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.title",
    "value": "Settings",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.general",
    "value": "General",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.appearance",
    "value": "Appearance",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.language",
    "value": "Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.general.title",
    "value": "General Settings",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.general.description",
    "value": "Configure your account and preferences",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.title",
    "value": "Appearance",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.label",
    "value": "Theme",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.light",
    "value": "Light",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.dark",
    "value": "Dark",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.label",
    "value": "Window Style",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.windows",
    "value": "Windows",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.mac",
    "value": "Mac",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.title",
    "value": "Language Preferences",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.current",
    "value": "Current Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.select",
    "value": "Select Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.description",
    "value": "Choose your preferred language for the interface",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.title",
    "value": "Start",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.title",
    "value": "Programs",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.accessories",
    "value": "Accessories",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.games",
    "value": "Games",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.settings",
    "value": "Settings",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.shutdown",
    "value": "Shut Down",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.help",
    "value": "Help & Support",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "validation",
    "key": "validation.required",
    "value": "This field is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.email.invalid",
    "value": "Please enter a valid email address",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.email.required",
    "value": "Email is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.tooShort",
    "value": "Password must be at least {{min}} characters",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.required",
    "value": "Password is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.match",
    "value": "✓ Passwords match",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.noMatch",
    "value": "✗ Passwords do not match",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.name.required",
    "value": "Name is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.name.tooLong",
    "value": "Name cannot exceed {{max}} characters",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.title",
    "value": "L4YERCAK3",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.subtitle",
    "value": "Stack Your Startup Tools Like a Pro",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.paragraph1",
    "value": "Imagine a retro desktop where you layer on marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.paragraph2",
    "value": "No more tab-juggling chaos. Just you, your tools, and that satisfying click of a floppy disk saving your next big idea.",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.closing",
    "value": "Welcome to the retro desktop experience!",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.footer",
    "value": "Built for startups • Inspired by the '90s • Powered by L4YERCAK3",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-session",
    "value": "Invalid session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-not-found",
    "value": "Invalid session: Session not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-no-user",
    "value": "Invalid session: No user associated with session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-expired",
    "value": "Session expired: Please log in again",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-or-expired-session",
    "value": "Invalid or expired session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.not-authenticated",
    "value": "Not authenticated",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.no-active-session",
    "value": "No active session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-credentials",
    "value": "Invalid credentials",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.password-already-set",
    "value": "Password already set. Please use sign in.",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.status-check-failed",
    "value": "Failed to check user status",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.update-organization",
    "value": "You don't have permission to update organization settings",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manage-users",
    "value": "You don't have permission to manage users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.permission-required",
    "value": "Permission denied: You need '{permission}' permission to perform this action",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.one-of-required",
    "value": "Permission denied: You need one of [{permissions}] permissions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.all-required",
    "value": "Permission denied: You need [{missingPermissions}] permissions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.super-admin-only-assign",
    "value": "Only super admins can assign or remove super admin role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.owner-assign-restricted",
    "value": "Only super admins and organization owners can assign or remove owner role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manager-role-limits",
    "value": "Business managers can only assign employee or viewer roles",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.cannot-change-own-role",
    "value": "You cannot change your own role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.only-super-admin-remove-owner",
    "value": "Only super admins can remove organization owners",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.only-super-admin-remove-admin",
    "value": "Only super admins can remove other super admins",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.profile-update-restricted",
    "value": "You can only update your own profile or profiles of users in your organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.invite-restricted",
    "value": "Unauthorized: Only org owners and managers can invite users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.invite-role-restricted",
    "value": "Unauthorized: You don't have permission to invite users with this role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.role-hierarchy-restricted",
    "value": "Permission denied: You cannot manage this user due to role hierarchy restrictions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.cannot-create-users",
    "value": "Permission denied: Cannot create users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.super-admin-required",
    "value": "Access denied: Super admin privileges required",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.view-translations-required",
    "value": "Permission denied: You need 'view_translations' permission to view translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manage-translations-required",
    "value": "Permission denied: You need 'manage_translations' permission to create translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.approve-translations-required",
    "value": "Permission denied: You need 'approve_translations' permission to delete translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.not-member",
    "value": "Not a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.user-not-member",
    "value": "User is not a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.cannot-remove-self",
    "value": "You cannot remove yourself from the organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.already-member",
    "value": "User is already a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.access-denied",
    "value": "Access denied: No membership in this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.no-active-membership",
    "value": "Access denied: No active membership in organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.no-org-membership",
    "value": "Access denied: No membership in this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.must-be-member",
    "value": "Access denied: You must be a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.current-user-not-found",
    "value": "Current user role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.invalid",
    "value": "Invalid role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.target-user-not-found",
    "value": "Target user's role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.not-found",
    "value": "Role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.invalid-or-inactive",
    "value": "Access denied: Invalid or inactive role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.not-found",
    "value": "User not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.not-found-contact-admin",
    "value": "User not found. Please contact an administrator.",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.email-exists",
    "value": "User with this email already exists",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.not-found",
    "value": "Organization not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.no-org-access",
    "value": "Unauthorized: You don't have access to this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.org-required",
    "value": "Organization required for non-global users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.object-not-found",
    "value": "Object not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.objects-not-found",
    "value": "One or both objects not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.link-not-found",
    "value": "Link not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.system.org-not-found",
    "value": "System organization not found - run seedOntologyData first",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.config.convex-url-missing",
    "value": "Convex URL not configured",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.config.resend-key-missing",
    "value": "RESEND_API_KEY is not configured",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.email.send-failed",
    "value": "Failed to send email: {error}",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.generic.occurred",
    "value": "An error occurred",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-auth-outside-provider",
    "value": "useAuth must be used within an AuthProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-permissions-outside-provider",
    "value": "usePermissions must be used within a PermissionProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-translation-outside-provider",
    "value": "useTranslation must be used within TranslationProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "success",
    "key": "success.users.created-with-invite",
    "value": "User created. They will receive an email invitation to set their password.",
    "subtype": "success",
    "context": "Comprehensive translations: success"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.title",
    "value": "Permission Denied",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.message",
    "value": "You don't have permission to perform this action. Required permission: {permissionName}",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.specific-message",
    "value": "You don't have the '{permission}' permission.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-organization.title",
    "value": "Organization Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-organization.message",
    "value": "You need organization management permissions to modify organization settings.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-organization.title",
    "value": "View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-organization.message",
    "value": "You need permission to view organization details.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-users.title",
    "value": "User Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-users.message",
    "value": "You need user management permissions to invite, remove, or modify user roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-users.title",
    "value": "View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-users.message",
    "value": "You need permission to view team members.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.update-profile.title",
    "value": "Profile Update Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.update-profile.message",
    "value": "You need permission to update user profiles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-roles.title",
    "value": "View Roles Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-roles.message",
    "value": "You need permission to view roles and permissions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-roles.title",
    "value": "Role Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-roles.message",
    "value": "You need role management permissions to create, update, or delete roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-permissions.title",
    "value": "View Permissions Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-permissions.message",
    "value": "You need permission to view available permissions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-permissions.title",
    "value": "Permission Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-permissions.message",
    "value": "You need permission to assign or remove permissions from roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-financials.title",
    "value": "Financial Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-financials.message",
    "value": "You need financial management permissions to modify billing and subscriptions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-invoice.title",
    "value": "Invoice Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-invoice.message",
    "value": "You need permission to create and generate invoices.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.approve-invoice.title",
    "value": "Invoice Approval Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.approve-invoice.message",
    "value": "You need permission to approve and sign off on invoices.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-financials.title",
    "value": "View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-financials.message",
    "value": "You need permission to view financial reports.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-operations.title",
    "value": "Operations Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-operations.message",
    "value": "You need operations management permissions to manage tasks, projects, and events.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-task.title",
    "value": "Task Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-task.message",
    "value": "You need permission to create new tasks.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.assign-task.title",
    "value": "Task Assignment Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.assign-task.message",
    "value": "You need permission to assign tasks to team members.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.execute-task.title",
    "value": "Task Execution Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.execute-task.message",
    "value": "You need permission to complete and update tasks.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-operations.title",
    "value": "View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-operations.message",
    "value": "You need permission to view tasks and operational data.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-report.title",
    "value": "Report Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-report.message",
    "value": "You need permission to generate custom reports and analytics.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-reports.title",
    "value": "View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-reports.message",
    "value": "You need permission to access dashboards and reports.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.export-data.title",
    "value": "Data Export Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.export-data.message",
    "value": "You need permission to download and export data.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-audit-logs.title",
    "value": "Audit Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-audit-logs.message",
    "value": "You need permission to view audit trail and security logs.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.install-apps.title",
    "value": "App Installation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.install-apps.message",
    "value": "You need permission to install and configure apps from the app store.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-apps.title",
    "value": "App Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-apps.message",
    "value": "You need permission to configure and manage installed apps.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-apps.title",
    "value": "View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-apps.message",
    "value": "You need permission to view installed apps and their configurations.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  }
];

      for (const trans of translations_en) {
        // Check if translation already exists
        const existing = await ctx.db
          .query("objects")
          .withIndex("by_org_type_locale", q =>
            q.eq("organizationId", systemOrg._id)
             .eq("type", "translation")
             .eq("locale", "en")
          )
          .filter(q => q.eq(q.field("name"), trans.key))
          .first();

        if (!existing) {
          await ctx.db.insert("objects", {
            organizationId: systemOrg._id,
            type: "translation",
            subtype: trans.subtype,
            name: trans.key,
            value: trans.value,
            locale: "en",
            status: "approved",
            customProperties: {
              namespace: trans.namespace,
              key: trans.key,
              context: trans.context,
            },
            createdBy: systemUser._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          totalImported++;
        } else {
          totalSkipped++;
        }
      }

      console.log(`   ✅ English: ${translations_en.length} processed`);
    }

    // Deutsch (de) - 302 translations
    console.log("\n📝 Importing Deutsch (de)...");
    {
      const translations_de = [
  {
    "namespace": "about-window",
    "key": "about-window.title",
    "value": "[DE] About L4YERCAK3",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.description",
    "value": "[DE] Stack Your Startup Tools Like a Pro",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.content.intro",
    "value": "[DE] L4YERCAK3 is a retro-inspired productivity platform that brings all your startup tools together in one nostalgic desktop experience.",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.content.features",
    "value": "[DE] Experience the satisfaction of organizing your business tools like the good old days, with modern functionality.",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "common",
    "key": "common.appName",
    "value": "[DE] L4YERCAK3",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.tagline",
    "value": "[DE] Stack Your Startup Tools Like a Pro",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.continue",
    "value": "[DE] CONTINUE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.cancel",
    "value": "[DE] CANCEL",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.save",
    "value": "[DE] SAVE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.delete",
    "value": "[DE] DELETE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.edit",
    "value": "[DE] EDIT",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.close",
    "value": "[DE] CLOSE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.back",
    "value": "[DE] BACK",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.submit",
    "value": "[DE] SUBMIT",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.ok",
    "value": "[DE] OK",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.yes",
    "value": "[DE] YES",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.no",
    "value": "[DE] NO",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.loading",
    "value": "[DE] LOADING...",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.saving",
    "value": "[DE] SAVING...",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.success",
    "value": "[DE] SUCCESS",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.error",
    "value": "[DE] ERROR",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.time.date",
    "value": "[DE] Date",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.time.time",
    "value": "[DE] Time",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.welcome",
    "value": "[DE] Welcome",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.login",
    "value": "[DE] Login",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.about",
    "value": "[DE] About",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.settings",
    "value": "[DE] Settings",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.manage",
    "value": "[DE] Manage",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.accessibility.doubleClick",
    "value": "[DE] Double-click to open {{name}}",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.accessibility.openApp",
    "value": "[DE] Open {{name}} application",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.timeout",
    "value": "[DE] Request timed out. Please try again.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.offline",
    "value": "[DE] You appear to be offline. Please check your connection.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.serverError",
    "value": "[DE] Server error. Please try again later.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.required",
    "value": "[DE] This field is required",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.invalidEmail",
    "value": "[DE] Please enter a valid email address",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.passwordTooShort",
    "value": "[DE] Password must be at least {{min}} characters",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.passwordsDontMatch",
    "value": "[DE] Passwords must match",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.unauthorized",
    "value": "[DE] You are not authorized to access this resource",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.sessionExpired",
    "value": "[DE] Your session has expired. Please log in again.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalidCredentials",
    "value": "[DE] Invalid email or password",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.close",
    "value": "[DE] Close window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.minimize",
    "value": "[DE] Minimize window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.maximize",
    "value": "[DE] Maximize window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.accessibility.dragHandle",
    "value": "[DE] Drag to move window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.accessibility.window",
    "value": "[DE] Application window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.title",
    "value": "[DE] ACCESS SYSTEM",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.subtitle",
    "value": "[DE] Enter your email to continue",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.emailLabel",
    "value": "[DE] EMAIL",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.emailPlaceholder",
    "value": "[DE] user@example.com",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.continueButton",
    "value": "[DE] CONTINUE",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.checkingButton",
    "value": "[DE] CHECKING...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.note",
    "value": "[DE] Note: This is an invite-only system. You must have been granted access by an administrator to sign in.",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.title",
    "value": "[DE] SIGN IN",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.passwordLabel",
    "value": "[DE] PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.signInButton",
    "value": "[DE] SIGN IN",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.signingInButton",
    "value": "[DE] SIGNING IN...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.differentEmailButton",
    "value": "[DE] USE DIFFERENT EMAIL",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.title",
    "value": "[DE] WELCOME!",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.subtitle",
    "value": "[DE] Set up your password to continue",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.firstNameLabel",
    "value": "[DE] FIRST NAME (Optional)",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.lastNameLabel",
    "value": "[DE] LAST NAME (Optional)",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.passwordLabel",
    "value": "[DE] PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.passwordPlaceholder",
    "value": "[DE] Minimum 6 characters",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.confirmPasswordLabel",
    "value": "[DE] CONFIRM PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.setPasswordButton",
    "value": "[DE] SET PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.settingUpButton",
    "value": "[DE] SETTING UP...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.backButton",
    "value": "[DE] BACK",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.welcomeMessage",
    "value": "[DE] Welcome, {{name}}!",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.loggedInMessage",
    "value": "[DE] You are currently logged in",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.superAdminBadge",
    "value": "[DE] [SUPER ADMIN]",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.emailLabel",
    "value": "[DE] Email:",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.userIdLabel",
    "value": "[DE] User ID:",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.logOutButton",
    "value": "[DE] LOG OUT",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.validation.passwordsMatch",
    "value": "[DE] ✓ Passwords match",
    "subtype": "validation",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.validation.passwordsDontMatch",
    "value": "[DE] ✗ Passwords do not match",
    "subtype": "validation",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.enterEmail",
    "value": "[DE] Please enter your email address",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.noAccount",
    "value": "[DE] No account found. Please contact an administrator for access.",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.invalidCredentials",
    "value": "[DE] Invalid credentials",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.passwordsDontMatch",
    "value": "[DE] Passwords do not match",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.passwordTooShort",
    "value": "[DE] Password must be at least 6 characters",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.genericError",
    "value": "[DE] An error occurred",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.accessibility.showPassword",
    "value": "[DE] Show password",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.accessibility.hidePassword",
    "value": "[DE] Hide password",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.title",
    "value": "[DE] Organization Settings",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.name.label",
    "value": "[DE] Organization Name",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.name.placeholder",
    "value": "[DE] Enter organization name",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.description.label",
    "value": "[DE] Description",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.description.placeholder",
    "value": "[DE] Brief description of your organization",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.title",
    "value": "[DE] General Settings",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.timezone",
    "value": "[DE] Timezone",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.language",
    "value": "[DE] Default Language",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.title",
    "value": "[DE] Roles & Permissions",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.description",
    "value": "[DE] Manage user roles and their permissions",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.admin",
    "value": "[DE] Administrator",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.member",
    "value": "[DE] Member",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.viewer",
    "value": "[DE] Viewer",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.read",
    "value": "[DE] Read",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.write",
    "value": "[DE] Write",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.delete",
    "value": "[DE] Delete",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.manage",
    "value": "[DE] Manage",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.title",
    "value": "[DE] User Management",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.name",
    "value": "[DE] Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.email",
    "value": "[DE] Email",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.role",
    "value": "[DE] Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.status",
    "value": "[DE] Status",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.actions",
    "value": "[DE] Actions",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.button",
    "value": "[DE] Invite User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.title",
    "value": "[DE] Invite New User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.emailLabel",
    "value": "[DE] Email Address",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.emailPlaceholder",
    "value": "[DE] user@example.com",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.roleLabel",
    "value": "[DE] Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.sendButton",
    "value": "[DE] Send Invitation",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.sendingButton",
    "value": "[DE] Sending...",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.title",
    "value": "[DE] Edit User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.firstNameLabel",
    "value": "[DE] First Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.lastNameLabel",
    "value": "[DE] Last Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.roleLabel",
    "value": "[DE] Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.statusLabel",
    "value": "[DE] Status",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.saveButton",
    "value": "[DE] Save Changes",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.savingButton",
    "value": "[DE] Saving...",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.active",
    "value": "[DE] Active",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.inactive",
    "value": "[DE] Inactive",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.pending",
    "value": "[DE] Pending",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.title",
    "value": "[DE] Management Center",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.users",
    "value": "[DE] Users",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.roles",
    "value": "[DE] Roles & Permissions",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.organization",
    "value": "[DE] Organization",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.title",
    "value": "[DE] Mobile Menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.showMenu",
    "value": "[DE] Show menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.hideMenu",
    "value": "[DE] Hide menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.applications",
    "value": "[DE] Applications",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.settings",
    "value": "[DE] Settings",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.welcome",
    "value": "[DE] Welcome",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.login",
    "value": "[DE] Login",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.about",
    "value": "[DE] About",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.settings",
    "value": "[DE] Settings",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.controlPanel",
    "value": "[DE] Control Panel",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.manage",
    "value": "[DE] Manage",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.title",
    "value": "[DE] Start Menu",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.programs",
    "value": "[DE] Programs",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.settings",
    "value": "[DE] Settings",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.shutdown",
    "value": "[DE] Shut Down",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.taskbar.start",
    "value": "[DE] Start",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.primary",
    "value": "[DE] Primary Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.secondary",
    "value": "[DE] Secondary Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.outline",
    "value": "[DE] Outline Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.small",
    "value": "[DE] Small",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.medium",
    "value": "[DE] Medium",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.large",
    "value": "[DE] Large",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.title",
    "value": "[DE] Settings",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.general",
    "value": "[DE] General",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.appearance",
    "value": "[DE] Appearance",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.language",
    "value": "[DE] Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.general.title",
    "value": "[DE] General Settings",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.general.description",
    "value": "[DE] Configure your account and preferences",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.title",
    "value": "[DE] Appearance",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.label",
    "value": "[DE] Theme",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.light",
    "value": "[DE] Light",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.dark",
    "value": "[DE] Dark",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.label",
    "value": "[DE] Window Style",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.windows",
    "value": "[DE] Windows",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.mac",
    "value": "[DE] Mac",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.title",
    "value": "[DE] Language Preferences",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.current",
    "value": "[DE] Current Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.select",
    "value": "[DE] Select Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.description",
    "value": "[DE] Choose your preferred language for the interface",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.title",
    "value": "[DE] Start",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.title",
    "value": "[DE] Programs",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.accessories",
    "value": "[DE] Accessories",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.games",
    "value": "[DE] Games",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.settings",
    "value": "[DE] Settings",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.shutdown",
    "value": "[DE] Shut Down",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.help",
    "value": "[DE] Help & Support",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "validation",
    "key": "validation.required",
    "value": "[DE] This field is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.email.invalid",
    "value": "[DE] Please enter a valid email address",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.email.required",
    "value": "[DE] Email is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.tooShort",
    "value": "[DE] Password must be at least {{min}} characters",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.required",
    "value": "[DE] Password is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.match",
    "value": "[DE] ✓ Passwords match",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.noMatch",
    "value": "[DE] ✗ Passwords do not match",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.name.required",
    "value": "[DE] Name is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.name.tooLong",
    "value": "[DE] Name cannot exceed {{max}} characters",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.title",
    "value": "[DE] L4YERCAK3",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.subtitle",
    "value": "[DE] Stack Your Startup Tools Like a Pro",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.paragraph1",
    "value": "[DE] Imagine a retro desktop where you layer on marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.paragraph2",
    "value": "[DE] No more tab-juggling chaos. Just you, your tools, and that satisfying click of a floppy disk saving your next big idea.",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.closing",
    "value": "[DE] Welcome to the retro desktop experience!",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.footer",
    "value": "[DE] Built for startups • Inspired by the '90s • Powered by L4YERCAK3",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-session",
    "value": "[DE] Invalid session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-not-found",
    "value": "[DE] Invalid session: Session not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-no-user",
    "value": "[DE] Invalid session: No user associated with session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-expired",
    "value": "[DE] Session expired: Please log in again",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-or-expired-session",
    "value": "[DE] Invalid or expired session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.not-authenticated",
    "value": "[DE] Not authenticated",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.no-active-session",
    "value": "[DE] No active session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-credentials",
    "value": "[DE] Invalid credentials",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.password-already-set",
    "value": "[DE] Password already set. Please use sign in.",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.status-check-failed",
    "value": "[DE] Failed to check user status",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.update-organization",
    "value": "[DE] You don't have permission to update organization settings",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manage-users",
    "value": "[DE] You don't have permission to manage users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.permission-required",
    "value": "[DE] Permission denied: You need '{permission}' permission to perform this action",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.one-of-required",
    "value": "[DE] Permission denied: You need one of [{permissions}] permissions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.all-required",
    "value": "[DE] Permission denied: You need [{missingPermissions}] permissions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.super-admin-only-assign",
    "value": "[DE] Only super admins can assign or remove super admin role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.owner-assign-restricted",
    "value": "[DE] Only super admins and organization owners can assign or remove owner role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manager-role-limits",
    "value": "[DE] Business managers can only assign employee or viewer roles",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.cannot-change-own-role",
    "value": "[DE] You cannot change your own role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.only-super-admin-remove-owner",
    "value": "[DE] Only super admins can remove organization owners",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.only-super-admin-remove-admin",
    "value": "[DE] Only super admins can remove other super admins",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.profile-update-restricted",
    "value": "[DE] You can only update your own profile or profiles of users in your organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.invite-restricted",
    "value": "[DE] Unauthorized: Only org owners and managers can invite users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.invite-role-restricted",
    "value": "[DE] Unauthorized: You don't have permission to invite users with this role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.role-hierarchy-restricted",
    "value": "[DE] Permission denied: You cannot manage this user due to role hierarchy restrictions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.cannot-create-users",
    "value": "[DE] Permission denied: Cannot create users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.super-admin-required",
    "value": "[DE] Access denied: Super admin privileges required",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.view-translations-required",
    "value": "[DE] Permission denied: You need 'view_translations' permission to view translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manage-translations-required",
    "value": "[DE] Permission denied: You need 'manage_translations' permission to create translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.approve-translations-required",
    "value": "[DE] Permission denied: You need 'approve_translations' permission to delete translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.not-member",
    "value": "[DE] Not a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.user-not-member",
    "value": "[DE] User is not a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.cannot-remove-self",
    "value": "[DE] You cannot remove yourself from the organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.already-member",
    "value": "[DE] User is already a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.access-denied",
    "value": "[DE] Access denied: No membership in this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.no-active-membership",
    "value": "[DE] Access denied: No active membership in organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.no-org-membership",
    "value": "[DE] Access denied: No membership in this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.must-be-member",
    "value": "[DE] Access denied: You must be a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.current-user-not-found",
    "value": "[DE] Current user role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.invalid",
    "value": "[DE] Invalid role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.target-user-not-found",
    "value": "[DE] Target user's role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.not-found",
    "value": "[DE] Role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.invalid-or-inactive",
    "value": "[DE] Access denied: Invalid or inactive role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.not-found",
    "value": "[DE] User not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.not-found-contact-admin",
    "value": "[DE] User not found. Please contact an administrator.",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.email-exists",
    "value": "[DE] User with this email already exists",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.not-found",
    "value": "[DE] Organization not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.no-org-access",
    "value": "[DE] Unauthorized: You don't have access to this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.org-required",
    "value": "[DE] Organization required for non-global users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.object-not-found",
    "value": "[DE] Object not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.objects-not-found",
    "value": "[DE] One or both objects not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.link-not-found",
    "value": "[DE] Link not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.system.org-not-found",
    "value": "[DE] System organization not found - run seedOntologyData first",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.config.convex-url-missing",
    "value": "[DE] Convex URL not configured",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.config.resend-key-missing",
    "value": "[DE] RESEND_API_KEY is not configured",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.email.send-failed",
    "value": "[DE] Failed to send email: {error}",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.generic.occurred",
    "value": "[DE] An error occurred",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-auth-outside-provider",
    "value": "[DE] useAuth must be used within an AuthProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-permissions-outside-provider",
    "value": "[DE] usePermissions must be used within a PermissionProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-translation-outside-provider",
    "value": "[DE] useTranslation must be used within TranslationProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "success",
    "key": "success.users.created-with-invite",
    "value": "[DE] User created. They will receive an email invitation to set their password.",
    "subtype": "success",
    "context": "Comprehensive translations: success"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.title",
    "value": "[DE] Permission Denied",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.message",
    "value": "[DE] You don't have permission to perform this action. Required permission: {permissionName}",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.specific-message",
    "value": "[DE] You don't have the '{permission}' permission.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-organization.title",
    "value": "[DE] Organization Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-organization.message",
    "value": "[DE] You need organization management permissions to modify organization settings.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-organization.title",
    "value": "[DE] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-organization.message",
    "value": "[DE] You need permission to view organization details.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-users.title",
    "value": "[DE] User Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-users.message",
    "value": "[DE] You need user management permissions to invite, remove, or modify user roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-users.title",
    "value": "[DE] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-users.message",
    "value": "[DE] You need permission to view team members.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.update-profile.title",
    "value": "[DE] Profile Update Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.update-profile.message",
    "value": "[DE] You need permission to update user profiles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-roles.title",
    "value": "[DE] View Roles Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-roles.message",
    "value": "[DE] You need permission to view roles and permissions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-roles.title",
    "value": "[DE] Role Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-roles.message",
    "value": "[DE] You need role management permissions to create, update, or delete roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-permissions.title",
    "value": "[DE] View Permissions Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-permissions.message",
    "value": "[DE] You need permission to view available permissions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-permissions.title",
    "value": "[DE] Permission Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-permissions.message",
    "value": "[DE] You need permission to assign or remove permissions from roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-financials.title",
    "value": "[DE] Financial Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-financials.message",
    "value": "[DE] You need financial management permissions to modify billing and subscriptions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-invoice.title",
    "value": "[DE] Invoice Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-invoice.message",
    "value": "[DE] You need permission to create and generate invoices.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.approve-invoice.title",
    "value": "[DE] Invoice Approval Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.approve-invoice.message",
    "value": "[DE] You need permission to approve and sign off on invoices.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-financials.title",
    "value": "[DE] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-financials.message",
    "value": "[DE] You need permission to view financial reports.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-operations.title",
    "value": "[DE] Operations Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-operations.message",
    "value": "[DE] You need operations management permissions to manage tasks, projects, and events.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-task.title",
    "value": "[DE] Task Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-task.message",
    "value": "[DE] You need permission to create new tasks.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.assign-task.title",
    "value": "[DE] Task Assignment Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.assign-task.message",
    "value": "[DE] You need permission to assign tasks to team members.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.execute-task.title",
    "value": "[DE] Task Execution Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.execute-task.message",
    "value": "[DE] You need permission to complete and update tasks.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-operations.title",
    "value": "[DE] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-operations.message",
    "value": "[DE] You need permission to view tasks and operational data.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-report.title",
    "value": "[DE] Report Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-report.message",
    "value": "[DE] You need permission to generate custom reports and analytics.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-reports.title",
    "value": "[DE] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-reports.message",
    "value": "[DE] You need permission to access dashboards and reports.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.export-data.title",
    "value": "[DE] Data Export Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.export-data.message",
    "value": "[DE] You need permission to download and export data.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-audit-logs.title",
    "value": "[DE] Audit Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-audit-logs.message",
    "value": "[DE] You need permission to view audit trail and security logs.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.install-apps.title",
    "value": "[DE] App Installation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.install-apps.message",
    "value": "[DE] You need permission to install and configure apps from the app store.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-apps.title",
    "value": "[DE] App Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-apps.message",
    "value": "[DE] You need permission to configure and manage installed apps.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-apps.title",
    "value": "[DE] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-apps.message",
    "value": "[DE] You need permission to view installed apps and their configurations.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  }
];

      for (const trans of translations_de) {
        // Check if translation already exists
        const existing = await ctx.db
          .query("objects")
          .withIndex("by_org_type_locale", q =>
            q.eq("organizationId", systemOrg._id)
             .eq("type", "translation")
             .eq("locale", "de")
          )
          .filter(q => q.eq(q.field("name"), trans.key))
          .first();

        if (!existing) {
          await ctx.db.insert("objects", {
            organizationId: systemOrg._id,
            type: "translation",
            subtype: trans.subtype,
            name: trans.key,
            value: trans.value,
            locale: "de",
            status: "pending",
            customProperties: {
              namespace: trans.namespace,
              key: trans.key,
              context: trans.context,
            },
            createdBy: systemUser._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          totalImported++;
        } else {
          totalSkipped++;
        }
      }

      console.log(`   ✅ Deutsch: ${translations_de.length} processed`);
    }

    // Polski (pl) - 302 translations
    console.log("\n📝 Importing Polski (pl)...");
    {
      const translations_pl = [
  {
    "namespace": "about-window",
    "key": "about-window.title",
    "value": "[PL] About L4YERCAK3",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.description",
    "value": "[PL] Stack Your Startup Tools Like a Pro",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.content.intro",
    "value": "[PL] L4YERCAK3 is a retro-inspired productivity platform that brings all your startup tools together in one nostalgic desktop experience.",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "about-window",
    "key": "about-window.content.features",
    "value": "[PL] Experience the satisfaction of organizing your business tools like the good old days, with modern functionality.",
    "subtype": "component",
    "context": "UI component: about-window.json"
  },
  {
    "namespace": "common",
    "key": "common.appName",
    "value": "[PL] L4YERCAK3",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.tagline",
    "value": "[PL] Stack Your Startup Tools Like a Pro",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.continue",
    "value": "[PL] CONTINUE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.cancel",
    "value": "[PL] CANCEL",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.save",
    "value": "[PL] SAVE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.delete",
    "value": "[PL] DELETE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.edit",
    "value": "[PL] EDIT",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.close",
    "value": "[PL] CLOSE",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.back",
    "value": "[PL] BACK",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.submit",
    "value": "[PL] SUBMIT",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.ok",
    "value": "[PL] OK",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.yes",
    "value": "[PL] YES",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.actions.no",
    "value": "[PL] NO",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.loading",
    "value": "[PL] LOADING...",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.saving",
    "value": "[PL] SAVING...",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.success",
    "value": "[PL] SUCCESS",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.status.error",
    "value": "[PL] ERROR",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.time.date",
    "value": "[PL] Date",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "common",
    "key": "common.time.time",
    "value": "[PL] Time",
    "subtype": "ui",
    "context": "UI component: common.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.welcome",
    "value": "[PL] Welcome",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.login",
    "value": "[PL] Login",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.about",
    "value": "[PL] About",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.settings",
    "value": "[PL] Settings",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.labels.manage",
    "value": "[PL] Manage",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.accessibility.doubleClick",
    "value": "[PL] Double-click to open {{name}}",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "desktop-icon",
    "key": "desktop-icon.accessibility.openApp",
    "value": "[PL] Open {{name}} application",
    "subtype": "component",
    "context": "UI component: desktop-icon.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.timeout",
    "value": "[PL] Request timed out. Please try again.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.offline",
    "value": "[PL] You appear to be offline. Please check your connection.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.network.serverError",
    "value": "[PL] Server error. Please try again later.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.required",
    "value": "[PL] This field is required",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.invalidEmail",
    "value": "[PL] Please enter a valid email address",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.passwordTooShort",
    "value": "[PL] Password must be at least {{min}} characters",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.validation.passwordsDontMatch",
    "value": "[PL] Passwords must match",
    "subtype": "validation",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.unauthorized",
    "value": "[PL] You are not authorized to access this resource",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.sessionExpired",
    "value": "[PL] Your session has expired. Please log in again.",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalidCredentials",
    "value": "[PL] Invalid email or password",
    "subtype": "ui",
    "context": "UI component: errors.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.close",
    "value": "[PL] Close window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.minimize",
    "value": "[PL] Minimize window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.controls.maximize",
    "value": "[PL] Maximize window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.accessibility.dragHandle",
    "value": "[PL] Drag to move window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "floating-window",
    "key": "floating-window.accessibility.window",
    "value": "[PL] Application window",
    "subtype": "component",
    "context": "UI component: floating-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.title",
    "value": "[PL] ACCESS SYSTEM",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.subtitle",
    "value": "[PL] Enter your email to continue",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.emailLabel",
    "value": "[PL] EMAIL",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.emailPlaceholder",
    "value": "[PL] user@example.com",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.continueButton",
    "value": "[PL] CONTINUE",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.checkingButton",
    "value": "[PL] CHECKING...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.check.note",
    "value": "[PL] Note: This is an invite-only system. You must have been granted access by an administrator to sign in.",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.title",
    "value": "[PL] SIGN IN",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.passwordLabel",
    "value": "[PL] PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.signInButton",
    "value": "[PL] SIGN IN",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.signingInButton",
    "value": "[PL] SIGNING IN...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.signin.differentEmailButton",
    "value": "[PL] USE DIFFERENT EMAIL",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.title",
    "value": "[PL] WELCOME!",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.subtitle",
    "value": "[PL] Set up your password to continue",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.firstNameLabel",
    "value": "[PL] FIRST NAME (Optional)",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.lastNameLabel",
    "value": "[PL] LAST NAME (Optional)",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.passwordLabel",
    "value": "[PL] PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.passwordPlaceholder",
    "value": "[PL] Minimum 6 characters",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.confirmPasswordLabel",
    "value": "[PL] CONFIRM PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.setPasswordButton",
    "value": "[PL] SET PASSWORD",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.settingUpButton",
    "value": "[PL] SETTING UP...",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.setup.backButton",
    "value": "[PL] BACK",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.welcomeMessage",
    "value": "[PL] Welcome, {{name}}!",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.loggedInMessage",
    "value": "[PL] You are currently logged in",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.superAdminBadge",
    "value": "[PL] [SUPER ADMIN]",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.emailLabel",
    "value": "[PL] Email:",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.userIdLabel",
    "value": "[PL] User ID:",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.modes.authenticated.logOutButton",
    "value": "[PL] LOG OUT",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.validation.passwordsMatch",
    "value": "[PL] ✓ Passwords match",
    "subtype": "validation",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.validation.passwordsDontMatch",
    "value": "[PL] ✗ Passwords do not match",
    "subtype": "validation",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.enterEmail",
    "value": "[PL] Please enter your email address",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.noAccount",
    "value": "[PL] No account found. Please contact an administrator for access.",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.invalidCredentials",
    "value": "[PL] Invalid credentials",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.passwordsDontMatch",
    "value": "[PL] Passwords do not match",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.passwordTooShort",
    "value": "[PL] Password must be at least 6 characters",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.errors.genericError",
    "value": "[PL] An error occurred",
    "subtype": "error",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.accessibility.showPassword",
    "value": "[PL] Show password",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "login-window",
    "key": "login-window.accessibility.hidePassword",
    "value": "[PL] Hide password",
    "subtype": "component",
    "context": "UI component: login-window.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.title",
    "value": "[PL] Organization Settings",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.name.label",
    "value": "[PL] Organization Name",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.name.placeholder",
    "value": "[PL] Enter organization name",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.description.label",
    "value": "[PL] Description",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.description.placeholder",
    "value": "[PL] Brief description of your organization",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.title",
    "value": "[PL] General Settings",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.timezone",
    "value": "[PL] Timezone",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-org",
    "key": "manage-org.settings.language",
    "value": "[PL] Default Language",
    "subtype": "component",
    "context": "UI component: manage-org.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.title",
    "value": "[PL] Roles & Permissions",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.description",
    "value": "[PL] Manage user roles and their permissions",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.admin",
    "value": "[PL] Administrator",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.member",
    "value": "[PL] Member",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.roles.viewer",
    "value": "[PL] Viewer",
    "subtype": "component",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.read",
    "value": "[PL] Read",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.write",
    "value": "[PL] Write",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.delete",
    "value": "[PL] Delete",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-roles",
    "key": "manage-roles.permissions.manage",
    "value": "[PL] Manage",
    "subtype": "permission",
    "context": "UI component: manage-roles.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.title",
    "value": "[PL] User Management",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.name",
    "value": "[PL] Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.email",
    "value": "[PL] Email",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.role",
    "value": "[PL] Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.status",
    "value": "[PL] Status",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.table.columns.actions",
    "value": "[PL] Actions",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.button",
    "value": "[PL] Invite User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.title",
    "value": "[PL] Invite New User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.emailLabel",
    "value": "[PL] Email Address",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.emailPlaceholder",
    "value": "[PL] user@example.com",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.roleLabel",
    "value": "[PL] Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.sendButton",
    "value": "[PL] Send Invitation",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.invite.sendingButton",
    "value": "[PL] Sending...",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.title",
    "value": "[PL] Edit User",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.firstNameLabel",
    "value": "[PL] First Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.lastNameLabel",
    "value": "[PL] Last Name",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.roleLabel",
    "value": "[PL] Role",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.statusLabel",
    "value": "[PL] Status",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.saveButton",
    "value": "[PL] Save Changes",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.edit.savingButton",
    "value": "[PL] Saving...",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.active",
    "value": "[PL] Active",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.inactive",
    "value": "[PL] Inactive",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-users",
    "key": "manage-users.status.pending",
    "value": "[PL] Pending",
    "subtype": "component",
    "context": "UI component: manage-users.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.title",
    "value": "[PL] Management Center",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.users",
    "value": "[PL] Users",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.roles",
    "value": "[PL] Roles & Permissions",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "manage-window",
    "key": "manage-window.tabs.organization",
    "value": "[PL] Organization",
    "subtype": "component",
    "context": "UI component: manage-window.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.title",
    "value": "[PL] Mobile Menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.showMenu",
    "value": "[PL] Show menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.hideMenu",
    "value": "[PL] Hide menu",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.applications",
    "value": "[PL] Applications",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "mobile-panel",
    "key": "mobile-panel.settings",
    "value": "[PL] Settings",
    "subtype": "component",
    "context": "UI component: mobile-panel.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.welcome",
    "value": "[PL] Welcome",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.login",
    "value": "[PL] Login",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.about",
    "value": "[PL] About",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.settings",
    "value": "[PL] Settings",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.controlPanel",
    "value": "[PL] Control Panel",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.desktop.manage",
    "value": "[PL] Manage",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.title",
    "value": "[PL] Start Menu",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.programs",
    "value": "[PL] Programs",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.settings",
    "value": "[PL] Settings",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.startMenu.shutdown",
    "value": "[PL] Shut Down",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "navigation",
    "key": "navigation.taskbar.start",
    "value": "[PL] Start",
    "subtype": "ui",
    "context": "UI component: navigation.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.primary",
    "value": "[PL] Primary Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.secondary",
    "value": "[PL] Secondary Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.outline",
    "value": "[PL] Outline Button",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.small",
    "value": "[PL] Small",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.medium",
    "value": "[PL] Medium",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "retro-button",
    "key": "retro-button.sizes.large",
    "value": "[PL] Large",
    "subtype": "component",
    "context": "UI component: retro-button.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.title",
    "value": "[PL] Settings",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.general",
    "value": "[PL] General",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.appearance",
    "value": "[PL] Appearance",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.tabs.language",
    "value": "[PL] Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.general.title",
    "value": "[PL] General Settings",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.general.description",
    "value": "[PL] Configure your account and preferences",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.title",
    "value": "[PL] Appearance",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.label",
    "value": "[PL] Theme",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.light",
    "value": "[PL] Light",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.theme.dark",
    "value": "[PL] Dark",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.label",
    "value": "[PL] Window Style",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.windows",
    "value": "[PL] Windows",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.appearance.windowStyle.mac",
    "value": "[PL] Mac",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.title",
    "value": "[PL] Language Preferences",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.current",
    "value": "[PL] Current Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.select",
    "value": "[PL] Select Language",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "settings-window",
    "key": "settings-window.language.description",
    "value": "[PL] Choose your preferred language for the interface",
    "subtype": "component",
    "context": "UI component: settings-window.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.title",
    "value": "[PL] Start",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.title",
    "value": "[PL] Programs",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.accessories",
    "value": "[PL] Accessories",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.games",
    "value": "[PL] Games",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.programs.settings",
    "value": "[PL] Settings",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.shutdown",
    "value": "[PL] Shut Down",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "start-menu",
    "key": "start-menu.help",
    "value": "[PL] Help & Support",
    "subtype": "component",
    "context": "UI component: start-menu.json"
  },
  {
    "namespace": "validation",
    "key": "validation.required",
    "value": "[PL] This field is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.email.invalid",
    "value": "[PL] Please enter a valid email address",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.email.required",
    "value": "[PL] Email is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.tooShort",
    "value": "[PL] Password must be at least {{min}} characters",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.required",
    "value": "[PL] Password is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.match",
    "value": "[PL] ✓ Passwords match",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.password.noMatch",
    "value": "[PL] ✗ Passwords do not match",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.name.required",
    "value": "[PL] Name is required",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "validation",
    "key": "validation.name.tooLong",
    "value": "[PL] Name cannot exceed {{max}} characters",
    "subtype": "ui",
    "context": "UI component: validation.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.title",
    "value": "[PL] L4YERCAK3",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.subtitle",
    "value": "[PL] Stack Your Startup Tools Like a Pro",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.paragraph1",
    "value": "[PL] Imagine a retro desktop where you layer on marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.paragraph2",
    "value": "[PL] No more tab-juggling chaos. Just you, your tools, and that satisfying click of a floppy disk saving your next big idea.",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.intro.closing",
    "value": "[PL] Welcome to the retro desktop experience!",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "welcome-window",
    "key": "welcome-window.footer",
    "value": "[PL] Built for startups • Inspired by the '90s • Powered by L4YERCAK3",
    "subtype": "component",
    "context": "UI component: welcome-window.json"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-session",
    "value": "[PL] Invalid session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-not-found",
    "value": "[PL] Invalid session: Session not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-no-user",
    "value": "[PL] Invalid session: No user associated with session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.session-expired",
    "value": "[PL] Session expired: Please log in again",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-or-expired-session",
    "value": "[PL] Invalid or expired session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.not-authenticated",
    "value": "[PL] Not authenticated",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.no-active-session",
    "value": "[PL] No active session",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.invalid-credentials",
    "value": "[PL] Invalid credentials",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.password-already-set",
    "value": "[PL] Password already set. Please use sign in.",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.auth.status-check-failed",
    "value": "[PL] Failed to check user status",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.update-organization",
    "value": "[PL] You don't have permission to update organization settings",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manage-users",
    "value": "[PL] You don't have permission to manage users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.permission-required",
    "value": "[PL] Permission denied: You need '{permission}' permission to perform this action",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.one-of-required",
    "value": "[PL] Permission denied: You need one of [{permissions}] permissions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.all-required",
    "value": "[PL] Permission denied: You need [{missingPermissions}] permissions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.super-admin-only-assign",
    "value": "[PL] Only super admins can assign or remove super admin role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.owner-assign-restricted",
    "value": "[PL] Only super admins and organization owners can assign or remove owner role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manager-role-limits",
    "value": "[PL] Business managers can only assign employee or viewer roles",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.cannot-change-own-role",
    "value": "[PL] You cannot change your own role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.only-super-admin-remove-owner",
    "value": "[PL] Only super admins can remove organization owners",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.only-super-admin-remove-admin",
    "value": "[PL] Only super admins can remove other super admins",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.profile-update-restricted",
    "value": "[PL] You can only update your own profile or profiles of users in your organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.invite-restricted",
    "value": "[PL] Unauthorized: Only org owners and managers can invite users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.invite-role-restricted",
    "value": "[PL] Unauthorized: You don't have permission to invite users with this role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.role-hierarchy-restricted",
    "value": "[PL] Permission denied: You cannot manage this user due to role hierarchy restrictions",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.cannot-create-users",
    "value": "[PL] Permission denied: Cannot create users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.super-admin-required",
    "value": "[PL] Access denied: Super admin privileges required",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.view-translations-required",
    "value": "[PL] Permission denied: You need 'view_translations' permission to view translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.manage-translations-required",
    "value": "[PL] Permission denied: You need 'manage_translations' permission to create translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.permissions.approve-translations-required",
    "value": "[PL] Permission denied: You need 'approve_translations' permission to delete translations",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.not-member",
    "value": "[PL] Not a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.user-not-member",
    "value": "[PL] User is not a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.cannot-remove-self",
    "value": "[PL] You cannot remove yourself from the organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.already-member",
    "value": "[PL] User is already a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.access-denied",
    "value": "[PL] Access denied: No membership in this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.no-active-membership",
    "value": "[PL] Access denied: No active membership in organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.no-org-membership",
    "value": "[PL] Access denied: No membership in this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.membership.must-be-member",
    "value": "[PL] Access denied: You must be a member of this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.current-user-not-found",
    "value": "[PL] Current user role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.invalid",
    "value": "[PL] Invalid role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.target-user-not-found",
    "value": "[PL] Target user's role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.not-found",
    "value": "[PL] Role not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.roles.invalid-or-inactive",
    "value": "[PL] Access denied: Invalid or inactive role",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.not-found",
    "value": "[PL] User not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.not-found-contact-admin",
    "value": "[PL] User not found. Please contact an administrator.",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.users.email-exists",
    "value": "[PL] User with this email already exists",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.not-found",
    "value": "[PL] Organization not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.no-org-access",
    "value": "[PL] Unauthorized: You don't have access to this organization",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.organizations.org-required",
    "value": "[PL] Organization required for non-global users",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.object-not-found",
    "value": "[PL] Object not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.objects-not-found",
    "value": "[PL] One or both objects not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.ontology.link-not-found",
    "value": "[PL] Link not found",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.system.org-not-found",
    "value": "[PL] System organization not found - run seedOntologyData first",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.config.convex-url-missing",
    "value": "[PL] Convex URL not configured",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.config.resend-key-missing",
    "value": "[PL] RESEND_API_KEY is not configured",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.email.send-failed",
    "value": "[PL] Failed to send email: {error}",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.generic.occurred",
    "value": "[PL] An error occurred",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-auth-outside-provider",
    "value": "[PL] useAuth must be used within an AuthProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-permissions-outside-provider",
    "value": "[PL] usePermissions must be used within a PermissionProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "errors",
    "key": "errors.dev.use-translation-outside-provider",
    "value": "[PL] useTranslation must be used within TranslationProvider",
    "subtype": "error",
    "context": "Comprehensive translations: errors"
  },
  {
    "namespace": "success",
    "key": "success.users.created-with-invite",
    "value": "[PL] User created. They will receive an email invitation to set their password.",
    "subtype": "success",
    "context": "Comprehensive translations: success"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.title",
    "value": "[PL] Permission Denied",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.message",
    "value": "[PL] You don't have permission to perform this action. Required permission: {permissionName}",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.denied.specific-message",
    "value": "[PL] You don't have the '{permission}' permission.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-organization.title",
    "value": "[PL] Organization Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-organization.message",
    "value": "[PL] You need organization management permissions to modify organization settings.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-organization.title",
    "value": "[PL] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-organization.message",
    "value": "[PL] You need permission to view organization details.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-users.title",
    "value": "[PL] User Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-users.message",
    "value": "[PL] You need user management permissions to invite, remove, or modify user roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-users.title",
    "value": "[PL] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-users.message",
    "value": "[PL] You need permission to view team members.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.update-profile.title",
    "value": "[PL] Profile Update Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.update-profile.message",
    "value": "[PL] You need permission to update user profiles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-roles.title",
    "value": "[PL] View Roles Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-roles.message",
    "value": "[PL] You need permission to view roles and permissions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-roles.title",
    "value": "[PL] Role Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-roles.message",
    "value": "[PL] You need role management permissions to create, update, or delete roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-permissions.title",
    "value": "[PL] View Permissions Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-permissions.message",
    "value": "[PL] You need permission to view available permissions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-permissions.title",
    "value": "[PL] Permission Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-permissions.message",
    "value": "[PL] You need permission to assign or remove permissions from roles.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-financials.title",
    "value": "[PL] Financial Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-financials.message",
    "value": "[PL] You need financial management permissions to modify billing and subscriptions.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-invoice.title",
    "value": "[PL] Invoice Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-invoice.message",
    "value": "[PL] You need permission to create and generate invoices.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.approve-invoice.title",
    "value": "[PL] Invoice Approval Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.approve-invoice.message",
    "value": "[PL] You need permission to approve and sign off on invoices.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-financials.title",
    "value": "[PL] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-financials.message",
    "value": "[PL] You need permission to view financial reports.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-operations.title",
    "value": "[PL] Operations Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-operations.message",
    "value": "[PL] You need operations management permissions to manage tasks, projects, and events.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-task.title",
    "value": "[PL] Task Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-task.message",
    "value": "[PL] You need permission to create new tasks.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.assign-task.title",
    "value": "[PL] Task Assignment Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.assign-task.message",
    "value": "[PL] You need permission to assign tasks to team members.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.execute-task.title",
    "value": "[PL] Task Execution Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.execute-task.message",
    "value": "[PL] You need permission to complete and update tasks.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-operations.title",
    "value": "[PL] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-operations.message",
    "value": "[PL] You need permission to view tasks and operational data.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-report.title",
    "value": "[PL] Report Creation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.create-report.message",
    "value": "[PL] You need permission to generate custom reports and analytics.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-reports.title",
    "value": "[PL] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-reports.message",
    "value": "[PL] You need permission to access dashboards and reports.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.export-data.title",
    "value": "[PL] Data Export Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.export-data.message",
    "value": "[PL] You need permission to download and export data.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-audit-logs.title",
    "value": "[PL] Audit Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-audit-logs.message",
    "value": "[PL] You need permission to view audit trail and security logs.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.install-apps.title",
    "value": "[PL] App Installation Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.install-apps.message",
    "value": "[PL] You need permission to install and configure apps from the app store.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-apps.title",
    "value": "[PL] App Management Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.manage-apps.message",
    "value": "[PL] You need permission to configure and manage installed apps.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-apps.title",
    "value": "[PL] View Access Required",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  },
  {
    "namespace": "permissions",
    "key": "permissions.view-apps.message",
    "value": "[PL] You need permission to view installed apps and their configurations.",
    "subtype": "permission",
    "context": "Comprehensive translations: permissions"
  }
];

      for (const trans of translations_pl) {
        // Check if translation already exists
        const existing = await ctx.db
          .query("objects")
          .withIndex("by_org_type_locale", q =>
            q.eq("organizationId", systemOrg._id)
             .eq("type", "translation")
             .eq("locale", "pl")
          )
          .filter(q => q.eq(q.field("name"), trans.key))
          .first();

        if (!existing) {
          await ctx.db.insert("objects", {
            organizationId: systemOrg._id,
            type: "translation",
            subtype: trans.subtype,
            name: trans.key,
            value: trans.value,
            locale: "pl",
            status: "pending",
            customProperties: {
              namespace: trans.namespace,
              key: trans.key,
              context: trans.context,
            },
            createdBy: systemUser._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          totalImported++;
        } else {
          totalSkipped++;
        }
      }

      console.log(`   ✅ Polski: ${translations_pl.length} processed`);
    }

    console.log(`\n🎉 Translation seeding complete!`);
    console.log(`   Imported: ${totalImported}`);
    console.log(`   Skipped (existing): ${totalSkipped}`);
    console.log(`   Total: ${totalImported + totalSkipped}`);

    return {
      success: true,
      totalImported,
      totalSkipped,
      locales: ["en", "de", "pl"],
    };
  },
});

/**
 * Clear all translations from the database
 */
export const clearTranslations = internalMutation({
  handler: async (ctx) => {
    console.log("🗑️  Clearing all translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      console.log("No system organization found");
      return { deleted: 0 };
    }

    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    for (const trans of translations) {
      await ctx.db.delete(trans._id);
    }

    console.log(`✅ Deleted ${translations.length} translations`);

    return { deleted: translations.length };
  },
});

/**
 * Get translation statistics
 */
export const getStats = internalMutation({
  handler: async (ctx) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) return null;

    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    const byLocale: Record<string, number> = {};
    const bySubtype: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    translations.forEach(t => {
      byLocale[t.locale || 'unknown'] = (byLocale[t.locale || 'unknown'] || 0) + 1;
      bySubtype[t.subtype || 'unknown'] = (bySubtype[t.subtype || 'unknown'] || 0) + 1;
      byStatus[t.status || 'unknown'] = (byStatus[t.status || 'unknown'] || 0) + 1;
    });

    return {
      total: translations.length,
      byLocale,
      bySubtype,
      byStatus,
    };
  },
});
