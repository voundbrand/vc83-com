/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 4: ROLES & PERMISSIONS
 *
 * Seeds translations for:
 * - Roles & Permissions tab
 * - Permission matrix
 * - System summary
 *
 * Run: npx convex run translations/seedManage_04_RolesPermissions:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 4: Roles & Permissions)...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found.");
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
      // === ROLES & PERMISSIONS TAB ===
      {
        key: "ui.manage.roles_perms.title",
        values: {
          en: "Roles & Permissions",
          de: "Rollen & Berechtigungen",
          pl: "Role i uprawnienia",
          es: "Roles y permisos",
          fr: "Rôles et autorisations",
          ja: "役割と権限",
        }
      },
      {
        key: "ui.manage.roles_perms.by_role",
        values: {
          en: "By Role",
          de: "Nach Rolle",
          pl: "Według roli",
          es: "Por rol",
          fr: "Par rôle",
          ja: "役割別",
        }
      },
      {
        key: "ui.manage.roles_perms.by_permission",
        values: {
          en: "By Permission",
          de: "Nach Berechtigung",
          pl: "Według uprawnień",
          es: "Por permiso",
          fr: "Par autorisation",
          ja: "権限別",
        }
      },
      {
        key: "ui.manage.roles_perms.matrix",
        values: {
          en: "Matrix",
          de: "Matrix",
          pl: "Macierz",
          es: "Matriz",
          fr: "Matrice",
          ja: "マトリックス",
        }
      },
      {
        key: "ui.manage.roles_perms.view_only",
        values: {
          en: "View Only",
          de: "Nur ansehen",
          pl: "Tylko do odczytu",
          es: "Solo lectura",
          fr: "Lecture seule",
          ja: "表示のみ",
        }
      },
      {
        key: "ui.manage.roles_perms.view_only_message",
        values: {
          en: "Only organization owners and super admins can modify roles and permissions.",
          de: "Nur Organisationsinhaber und Super-Admins können Rollen und Berechtigungen ändern.",
          pl: "Tylko właściciele organizacji i super administratorzy mogą modyfikować role i uprawnienia.",
          es: "Solo los propietarios de la organización y los super administradores pueden modificar roles y permisos.",
          fr: "Seuls les propriétaires d'organisation et les super administrateurs peuvent modifier les rôles et les autorisations.",
          ja: "組織オーナーとスーパー管理者のみが役割と権限を変更できます。",
        }
      },
      {
        key: "ui.manage.roles_perms.access_restricted",
        values: {
          en: "Access Restricted",
          de: "Zugriff eingeschränkt",
          pl: "Dostęp ograniczony",
          es: "Acceso restringido",
          fr: "Accès restreint",
          ja: "アクセス制限",
        }
      },
      {
        key: "ui.manage.roles_perms.access_restricted_message",
        values: {
          en: "You don't have permission to view roles and permissions. Contact your organization owner for access.",
          de: "Du hast keine Berechtigung, Rollen und Berechtigungen anzuzeigen. Kontaktiere deinen Organisationsinhaber für Zugriff.",
          pl: "Nie masz uprawnień do wyświetlania ról i uprawnień. Skontaktuj się z właścicielem organizacji, aby uzyskać dostęp.",
          es: "No tienes permiso para ver roles y permisos. Contacta al propietario de la organización para obtener acceso.",
          fr: "Vous n'avez pas la permission de voir les rôles et les autorisations. Contactez le propriétaire de l'organisation pour obtenir l'accès.",
          ja: "役割と権限を表示する権限がありません。アクセスについては組織オーナーにお問い合わせください。",
        }
      },
      {
        key: "ui.manage.roles_perms.permissions_count",
        values: {
          en: "{count} permissions",
          de: "{count} Berechtigungen",
          pl: "{count} uprawnień",
          es: "{count} permisos",
          fr: "{count} autorisations",
          ja: "{count}件の権限",
        }
      },
      {
        key: "ui.manage.roles_perms.no_permissions",
        values: {
          en: "No permissions assigned",
          de: "Keine Berechtigungen zugewiesen",
          pl: "Nie przypisano uprawnień",
          es: "No se asignaron permisos",
          fr: "Aucune autorisation attribuée",
          ja: "権限が割り当てられていません",
        }
      },
      {
        key: "ui.manage.roles_perms.permission",
        values: {
          en: "Permission",
          de: "Berechtigung",
          pl: "Uprawnienie",
          es: "Permiso",
          fr: "Autorisation",
          ja: "権限",
        }
      },
      {
        key: "ui.manage.roles_perms.system_summary",
        values: {
          en: "System Summary",
          de: "Systemübersicht",
          pl: "Podsumowanie systemu",
          es: "Resumen del sistema",
          fr: "Résumé du système",
          ja: "システム概要",
        }
      },
      {
        key: "ui.manage.roles_perms.roles",
        values: {
          en: "Roles",
          de: "Rollen",
          pl: "Role",
          es: "Roles",
          fr: "Rôles",
          ja: "役割",
        }
      },
      {
        key: "ui.manage.roles_perms.permissions",
        values: {
          en: "Permissions",
          de: "Berechtigungen",
          pl: "Uprawnienia",
          es: "Permisos",
          fr: "Autorisations",
          ja: "権限",
        }
      },
      {
        key: "ui.manage.roles_perms.resources",
        values: {
          en: "Resources",
          de: "Ressourcen",
          pl: "Zasoby",
          es: "Recursos",
          fr: "Ressources",
          ja: "リソース",
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
            "manage-window-roles-permissions"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Roles & Permissions translations`);
    return { success: true, count };
  }
});
