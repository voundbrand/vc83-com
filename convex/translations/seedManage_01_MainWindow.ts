/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 1: MAIN WINDOW
 *
 * Seeds translations for:
 * - Main manage window UI
 * - Tabs navigation
 * - General UI elements
 *
 * Run: npx convex run translations/seedManage_01_MainWindow:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 1: Main Window)...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // === MAIN MANAGE WINDOW ===
      {
        key: "ui.manage.title",
        values: {
          en: "Manage",
          de: "Verwalten",
          pl: "Zarządzaj",
          es: "Gestionar",
          fr: "Gérer",
          ja: "管理",
        }
      },
      {
        key: "ui.manage.subtitle",
        values: {
          en: "Organization, users, and permissions management",
          de: "Organisation, Benutzer und Rechteverwaltung",
          pl: "Zarządzanie organizacją, użytkownikami i uprawnieniami",
          es: "Gestión de organización, usuarios y permisos",
          fr: "Gestion de l'organisation, des utilisateurs et des autorisations",
          ja: "組織、ユーザー、および権限の管理",
        }
      },
      {
        key: "ui.manage.your_role",
        values: {
          en: "Your role",
          de: "Deine Rolle",
          pl: "Twoja rola",
          es: "Tu rol",
          fr: "Votre rôle",
          ja: "あなたの役割",
        }
      },
      {
        key: "ui.manage.loading",
        values: {
          en: "Loading...",
          de: "Laden...",
          pl: "Ładowanie...",
          es: "Cargando...",
          fr: "Chargement...",
          ja: "読み込み中...",
        }
      },
      {
        key: "ui.manage.not_authenticated",
        values: {
          en: "Not authenticated",
          de: "Nicht authentifiziert",
          pl: "Nie uwierzytelniono",
          es: "No autenticado",
          fr: "Non authentifié",
          ja: "認証されていません",
        }
      },
      {
        key: "ui.manage.no_organization",
        values: {
          en: "No Organization",
          de: "Keine Organisation",
          pl: "Brak organizacji",
          es: "Sin organización",
          fr: "Aucune organisation",
          ja: "組織がありません",
        }
      },
      {
        key: "ui.manage.no_organization_message",
        values: {
          en: "You need to be part of an organization to access management features.",
          de: "Du musst Teil einer Organisation sein, um auf Verwaltungsfunktionen zugreifen zu können.",
          pl: "Musisz być częścią organizacji, aby uzyskać dostęp do funkcji zarządzania.",
          es: "Necesitas ser parte de una organización para acceder a las funciones de gestión.",
          fr: "Vous devez faire partie d'une organisation pour accéder aux fonctionnalités de gestion.",
          ja: "管理機能にアクセスするには、組織の一員である必要があります。",
        }
      },
      {
        key: "ui.manage.super_admin",
        values: {
          en: "SUPER ADMIN",
          de: "SUPER-ADMIN",
          pl: "SUPER ADMINISTRATOR",
          es: "SUPER ADMINISTRADOR",
          fr: "SUPER ADMINISTRATEUR",
          ja: "スーパー管理者",
        }
      },

      // === TABS ===
      {
        key: "ui.manage.tab.organization",
        values: {
          en: "Organization",
          de: "Organisation",
          pl: "Organizacja",
          es: "Organización",
          fr: "Organisation",
          ja: "組織",
        }
      },
      {
        key: "ui.manage.tab.users_invites",
        values: {
          en: "Users & Invites",
          de: "Benutzer & Einladungen",
          pl: "Użytkownicy i zaproszenia",
          es: "Usuarios e invitaciones",
          fr: "Utilisateurs et invitations",
          ja: "ユーザーと招待",
        }
      },
      {
        key: "ui.manage.tab.roles_permissions",
        values: {
          en: "Roles & Permissions",
          de: "Rollen & Berechtigungen",
          pl: "Role i uprawnienia",
          es: "Roles y permisos",
          fr: "Rôles et autorisations",
          ja: "役割と権限",
        }
      },
    ];

    // Get all unique translation keys
    const allKeys = translations.map(t => t.key);

    // Efficiently check which translations already exist
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    // Insert only new translations
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const inserted = await insertTranslationIfNew(
            ctx.db,
            existingKeys,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "manage-window-main"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Main Manage Window translations`);
    return { success: true, count };
  }
});
