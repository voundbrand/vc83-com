/**
 * Translations for: login-window
 * Extracted from: src/components/window-content/login-window.tsx
 * Generated: 2025-10-08T16:08:57.357Z
 * Found: 24 strings
 *
 * Run with: npx convex run seedTranslations_login_window:seed
 */

import { internalMutation } from "./_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding translations for: login-window");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run: npx convex run seedOntologyData:seedAll");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run: npx convex run seedOntologyData:seedAll");
    }

    const namespace = "login-window";
    const subtype = "component";

    // Translation data extracted from component
    const translations = [
      {
            "key": "use-client",
            "value": "use client",
            "context": "\"use client\";",
            "line": 1
      },
      {
            "key": "error-please-enter-your-email-address",
            "value": "Please enter your email address",
            "context": "setError(\"Please enter your email address\");",
            "line": 25
      },
      {
            "key": "error-no-account-found-please-contact-an-administrator-f",
            "value": "No account found. Please contact an administrator for access.",
            "context": "setError(\"No account found. Please contact an administrator for access.\");",
            "line": 36
      },
      {
            "key": "error-an-error-occurred",
            "value": "An error occurred",
            "context": "setError(err instanceof Error ? err.message : \"An error occurred\");",
            "line": 48
      },
      {
            "key": "error-invalid-credentials",
            "value": "Invalid credentials",
            "context": "setError(err instanceof Error ? err.message : \"Invalid credentials\");",
            "line": 62
      },
      {
            "key": "error-passwords-do-not-match",
            "value": "Passwords do not match",
            "context": "setError(\"Passwords do not match\");",
            "line": 91
      },
      {
            "key": "error-password-must-be-at-least-6-characters",
            "value": "Password must be at least 6 characters",
            "context": "setError(\"Password must be at least 6 characters\");",
            "line": 96
      },
      {
            "key": "error-an-error-occurred",
            "value": "An error occurred",
            "context": "setError(err instanceof Error ? err.message : \"An error occurred\");",
            "line": 106
      },
      {
            "key": "placeholder-userexamplecom",
            "value": "user@example.com",
            "context": "placeholder=\"user@example.com\"",
            "line": 184
      },
      {
            "key": "checking",
            "value": "CHECKING...",
            "context": "{loading ? \"CHECKING...\" : \"CONTINUE\"}",
            "line": 194
      },
      {
            "key": "hello-welcomeuser-",
            "value": "Hello ${welcomeUser}! ",
            "context": "{welcomeUser ? `Hello ${welcomeUser}! ` : ''}Set up your password to continue",
            "line": 223
      },
      {
            "key": "placeholder-minimum-6-characters",
            "value": "Minimum 6 characters",
            "context": "placeholder=\"Minimum 6 characters\"",
            "line": 268
      },
      {
            "key": "label-hide-password",
            "value": "Hide password",
            "context": "aria-label={showPassword ? \"Hide password\" : \"Show password\"}",
            "line": 274
      },
      {
            "key": "label-show-password",
            "value": "Show password",
            "context": "aria-label={showPassword ? \"Hide password\" : \"Show password\"}",
            "line": 274
      },
      {
            "key": "label-hide-password",
            "value": "Hide password",
            "context": "aria-label={showConfirmPassword ? \"Hide password\" : \"Show password\"}",
            "line": 297
      },
      {
            "key": "label-show-password",
            "value": "Show password",
            "context": "aria-label={showConfirmPassword ? \"Hide password\" : \"Show password\"}",
            "line": 297
      },
      {
            "key": "-passwords-match",
            "value": "✓ Passwords match",
            "context": "{passwordMatch ? \"✓ Passwords match\" : \"✗ Passwords do not match\"}",
            "line": 304
      },
      {
            "key": "-passwords-do-not-match",
            "value": "✗ Passwords do not match",
            "context": "{passwordMatch ? \"✓ Passwords match\" : \"✗ Passwords do not match\"}",
            "line": 304
      },
      {
            "key": "setting-up",
            "value": "SETTING UP...",
            "context": "{loading ? \"SETTING UP...\" : \"SET PASSWORD\"}",
            "line": 315
      },
      {
            "key": "set-password",
            "value": "SET PASSWORD",
            "context": "{loading ? \"SETTING UP...\" : \"SET PASSWORD\"}",
            "line": 315
      },
      {
            "key": "label-hide-password",
            "value": "Hide password",
            "context": "aria-label={showPassword ? \"Hide password\" : \"Show password\"}",
            "line": 381
      },
      {
            "key": "label-show-password",
            "value": "Show password",
            "context": "aria-label={showPassword ? \"Hide password\" : \"Show password\"}",
            "line": 381
      },
      {
            "key": "signing-in",
            "value": "SIGNING IN...",
            "context": "{loading ? \"SIGNING IN...\" : \"SIGN IN\"}",
            "line": 394
      },
      {
            "key": "sign-in",
            "value": "SIGN IN",
            "context": "{loading ? \"SIGNING IN...\" : \"SIGN IN\"}",
            "line": 394
      }
];

    let totalAdded = 0;

    // Seed for each locale
    for (const locale of ["en", "de", "pl"]) {
      console.log(`  📝 ${locale.toUpperCase()}...`);
      let added = 0;

      for (const trans of translations) {
        const fullKey = `${namespace}.${trans.key}`;
        const value = locale === "en"
          ? trans.value
          : `[${locale.toUpperCase()}] ${trans.value}`;

        const existing = await ctx.db
          .query("objects")
          .withIndex("by_org_type_locale", q =>
            q.eq("organizationId", systemOrg._id)
             .eq("type", "translation")
             .eq("locale", locale)
          )
          .filter(q => q.eq(q.field("name"), fullKey))
          .first();

        if (!existing) {
          await ctx.db.insert("objects", {
            organizationId: systemOrg._id,
            type: "translation",
            subtype,
            name: fullKey,
            value,
            locale,
            status: locale === "en" ? "approved" : "pending",
            customProperties: {
              namespace,
              key: trans.key,
              source: "login-window",
              extractedFrom: "src/components/window-content/login-window.tsx",
              originalLine: trans.line,
              originalContext: trans.context,
            },
            createdBy: systemUser._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          added++;
        }
      }

      console.log(`     ✅ ${locale.toUpperCase()}: ${added} added`);
      totalAdded += added;
    }

    console.log(`\n🎉 Seeding complete! Added ${totalAdded} translations across 3 locales`);

    return {
      success: true,
      component: "login-window",
      namespace: "login-window",
      stringsFound: 24,
      totalAdded,
    };
  },
});

export const clear = internalMutation({
  handler: async (ctx) => {
    console.log("🗑️  Clearing translations for: login-window");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) return { deleted: 0 };

    const namespace = "login-window";
    const translations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .filter(q => q.eq(q.field("customProperties.namespace"), namespace))
      .collect();

    for (const trans of translations) {
      await ctx.db.delete(trans._id);
    }

    console.log(`✅ Deleted ${translations.length} translations`);
    return { deleted: translations.length };
  },
});
