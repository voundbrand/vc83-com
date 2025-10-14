# Translation Seed Files

This directory contains individual seed scripts for translations. Each file is self-contained with both the translation data and seeding logic.

## ✅ Structure

Each seed file follows this pattern:
- **Self-contained**: Translation data + seeding logic in one file
- **Independent**: Can be run on its own
- **Safe**: Checks for existing translations (no duplicates!)
- **Focused**: One feature/domain per file

## 📁 Available Seed Files

### 1. Welcome Window Translations
**File:** `seedWelcomeTranslations.ts`
**Run:** `npx convex run translations/seedWelcomeTranslations:seed`

**Contains:**
- `ui.welcome.tagline` - Welcome tagline
- `ui.welcome.description_para1` - First description paragraph
- `ui.welcome.description_para2` - Second description paragraph
- `ui.welcome.greeting` - Welcome greeting text
- `ui.welcome.footer` - Footer text

### 2. Address Translations
**File:** `seedAddressTranslations.ts`
**Run:** `npx convex run translations/seedAddressTranslations:seed`

**Contains:**
- `org.address.headquarters.*` - Headquarters address translations
- `org.address.billing.*` - Billing address translations
- `org.address.label.*` - Address label translations

### 3. Profile Translations
**File:** `seedProfileTranslations.ts`
**Run:** `npx convex run translations/seedProfileTranslations:seed`

**Contains:**
- `org.profile.system.bio` - System organization bio
- `org.profile.system.description` - System organization description

## 🚀 How to Use

### Seed All Translations
Run each seed file individually:
```bash
npx convex run translations/seedWelcomeTranslations:seed
npx convex run translations/seedAddressTranslations:seed
npx convex run translations/seedProfileTranslations:seed
```

### Seed Just One Feature
```bash
# Just welcome window
npx convex run translations/seedWelcomeTranslations:seed

# Just addresses
npx convex run translations/seedAddressTranslations:seed
```

### Verify Translations Work
1. Open your app
2. Go to Settings → Region
3. Change language (EN → DE → PL)
4. Open Welcome Window
5. Text should change based on selected locale!

## 📝 Creating New Translation Seed Files

### Example: Login Window Translations

**1. Create file:** `convex/translations/seedLoginTranslations.ts`

```typescript
import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Login translations...");

    // Get system org and user
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemOrg || !systemUser) {
      throw new Error("System not initialized");
    }

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
    ];

    const translations = [
      {
        key: "ui.login.title",
        values: {
          en: "Sign In",
          de: "Anmelden",
          pl: "Zaloguj się",
        }
      },
      {
        key: "ui.login.email_label",
        values: {
          en: "Email Address",
          de: "E-Mail-Adresse",
          pl: "Adres email",
        }
      },
      // Add more translations...
    ];

    // Seed logic
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const existing = await ctx.db
            .query("objects")
            .withIndex("by_org_type_locale", q =>
              q.eq("organizationId", systemOrg._id)
               .eq("type", "translation")
               .eq("locale", locale.code)
            )
            .filter(q => q.eq(q.field("name"), trans.key))
            .first();

          if (!existing) {
            await ctx.db.insert("objects", {
              organizationId: systemOrg._id,
              type: "translation",
              subtype: "ui",
              name: trans.key,
              value: value,
              locale: locale.code,
              status: "approved",
              customProperties: {
                category: "login",
              },
              createdBy: systemUser._id,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Login translations`);
    return { success: true, count };
  }
});
```

**2. Run it:**
```bash
npx convex run translations/seedLoginTranslations:seed
```

## 🎯 Translation Key Naming Convention

Follow these patterns:

### UI Translations
Format: `ui.{component}.{field}`

Examples:
- `ui.welcome.tagline`
- `ui.settings.title`
- `ui.login.email_label`
- `ui.dashboard.greeting`

### Ontology Translations
Format: `org.{type}.{identifier}.{field}`

Examples:
- `org.address.headquarters.name`
- `org.profile.system.bio`
- `org.invoice.template.title`

## 🌍 Supported Languages

Currently:
- `en` - English
- `de` - German (Deutsch)
- `pl` - Polish (Polski)

### Adding a New Language

Update `supportedLocales` in each seed file:

```typescript
const supportedLocales = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "pl", name: "Polish" },
  { code: "fr", name: "French" },  // ← Add here
];
```

Then add translations to each object:

```typescript
{
  key: "ui.welcome.tagline",
  values: {
    en: "Stack your startup tools like a pro",
    de: "Stapel deine Startup-Tools wie ein Profi",
    pl: "Ułóż narzędzia startupowe jak profesjonalista",
    fr: "Empilez vos outils de startup comme un pro",  // ← Add here
  }
}
```

## 💡 Benefits

✅ **Modular** - One file per feature, easy to navigate
✅ **Independent** - Seed only what you need
✅ **Self-contained** - Data + logic together
✅ **Git-friendly** - Smaller files = fewer conflicts
✅ **Safe** - Duplicate prevention built-in
✅ **Scalable** - Easy to add new features/languages

## 🐛 Troubleshooting

### Q: I see translation keys instead of text in the UI
**Example:** `ui.welcome.tagline` instead of "Stack your startup tools like a pro"

**Solution:**
1. Run the seed script for that component
2. Refresh your browser
3. Verify the locale is supported (EN/DE/PL)

### Q: "System organization not found" error

**Solution:**
Run the main seed first to create system data:
```bash
npx convex run seedOntologyData:seedAll
```

### Q: Want to update existing translations?

**Current behavior:** Seed scripts skip existing translations

**To update:**
1. Delete the translation from the database
2. Re-run the seed script

OR manually update via:
```bash
# Delete all welcome translations
npx convex run translations/deleteWelcomeTranslations:deleteAll

# Re-seed
npx convex run translations/seedWelcomeTranslations:seed
```

### Q: How do I know what translations are missing?

**In the UI:** Missing translations show as keys!
- ✅ Found: "Welcome to L4YERCAK3"
- ❌ Missing: "ui.welcome.greeting"

This makes it obvious which translations need to be added!

## 📚 Related Documentation

- [Translation System Architecture](../../docs/TRANSLATION_SYSTEM.md)
- [Frontend Translation Context](../../src/contexts/translation-context.tsx)
- [Backend Translation Resolver](../translationResolver.ts)
