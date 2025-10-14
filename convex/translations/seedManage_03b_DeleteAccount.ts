/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 3B: DELETE ACCOUNT
 *
 * Seeds translations for:
 * - Delete account modal
 * - Warning messages
 * - Confirmation prompts
 *
 * Run: npx convex run translations/seedManage_03b_DeleteAccount:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Delete Account translations...");

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
      // === DELETE ACCOUNT MODAL ===
      {
        key: "ui.manage.delete_account.title",
        values: {
          en: "Delete Account",
          de: "Konto löschen",
          pl: "Usuń konto",
          es: "Eliminar cuenta",
          fr: "Supprimer le compte",
          ja: "アカウントを削除",
        }
      },
      {
        key: "ui.manage.delete_account.warning_title",
        values: {
          en: "⚠️ This action cannot be undone!",
          de: "⚠️ Diese Aktion kann nicht rückgängig gemacht werden!",
          pl: "⚠️ Ta akcja nie może być cofnięta!",
          es: "⚠️ ¡Esta acción no se puede deshacer!",
          fr: "⚠️ Cette action ne peut pas être annulée !",
          ja: "⚠️ この操作は元に戻せません！",
        }
      },
      {
        key: "ui.manage.delete_account.warning_message",
        values: {
          en: "You are about to permanently delete your account. This is a serious and irreversible action.",
          de: "Sie sind dabei, Ihr Konto dauerhaft zu löschen. Dies ist eine ernsthafte und unwiderrufliche Aktion.",
          pl: "Zamierzasz trwale usunąć swoje konto. To poważna i nieodwracalna akcja.",
          es: "Estás a punto de eliminar permanentemente tu cuenta. Esta es una acción seria e irreversible.",
          fr: "Vous êtes sur le point de supprimer définitivement votre compte. Il s'agit d'une action sérieuse et irréversible.",
          ja: "アカウントを完全に削除しようとしています。これは深刻で元に戻せないアクションです。",
        }
      },
      {
        key: "ui.manage.delete_account.what_happens",
        values: {
          en: "What will happen:",
          de: "Was passiert:",
          pl: "Co się stanie:",
          es: "Lo que sucederá:",
          fr: "Ce qui va se passer :",
          ja: "何が起こるか：",
        }
      },
      {
        key: "ui.manage.delete_account.consequence_1",
        values: {
          en: "All organizations you own will be archived",
          de: "Alle Organisationen, die Sie besitzen, werden archiviert",
          pl: "Wszystkie organizacje, które posiadasz, zostaną zarchiwizowane",
          es: "Todas las organizaciones que posees serán archivadas",
          fr: "Toutes les organisations que vous possédez seront archivées",
          ja: "所有するすべての組織がアーカイブされます",
        }
      },
      {
        key: "ui.manage.delete_account.consequence_2",
        values: {
          en: "You will be removed from all other organizations",
          de: "Sie werden aus allen anderen Organisationen entfernt",
          pl: "Zostaniesz usunięty ze wszystkich innych organizacji",
          es: "Serás eliminado de todas las demás organizaciones",
          fr: "Vous serez supprimé de toutes les autres organisations",
          ja: "他のすべての組織から削除されます",
        }
      },
      {
        key: "ui.manage.delete_account.consequence_3",
        values: {
          en: "Your account data will be marked for deletion",
          de: "Ihre Kontodaten werden zum Löschen markiert",
          pl: "Dane Twojego konta zostaną oznaczone do usunięcia",
          es: "Los datos de tu cuenta se marcarán para eliminación",
          fr: "Les données de votre compte seront marquées pour suppression",
          ja: "アカウントデータが削除対象としてマークされます",
        }
      },
      {
        key: "ui.manage.delete_account.consequence_4",
        values: {
          en: "All data will be permanently deleted after 2 weeks",
          de: "Alle Daten werden nach 2 Wochen dauerhaft gelöscht",
          pl: "Wszystkie dane zostaną trwale usunięte po 2 tygodniach",
          es: "Todos los datos se eliminarán permanentemente después de 2 semanas",
          fr: "Toutes les données seront définitivement supprimées après 2 semaines",
          ja: "すべてのデータは2週間後に完全に削除されます",
        }
      },
      {
        key: "ui.manage.delete_account.confirm_instruction",
        values: {
          en: "To confirm, type",
          de: "Zur Bestätigung geben Sie ein",
          pl: "Aby potwierdzić, wpisz",
          es: "Para confirmar, escribe",
          fr: "Pour confirmer, tapez",
          ja: "確認するには、次のように入力してください",
        }
      },
      {
        key: "ui.manage.delete_account.cancel",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },
      {
        key: "ui.manage.delete_account.confirm_button",
        values: {
          en: "Delete My Account",
          de: "Mein Konto löschen",
          pl: "Usuń moje konto",
          es: "Eliminar mi cuenta",
          fr: "Supprimer mon compte",
          ja: "アカウントを削除",
        }
      },
      {
        key: "ui.manage.delete_account.deleting",
        values: {
          en: "Deleting...",
          de: "Wird gelöscht...",
          pl: "Usuwanie...",
          es: "Eliminando...",
          fr: "Suppression en cours...",
          ja: "削除中...",
        }
      },
      {
        key: "ui.manage.delete_account.danger_zone",
        values: {
          en: "Danger Zone",
          de: "Gefahrenzone",
          pl: "Strefa niebezpieczna",
          es: "Zona de peligro",
          fr: "Zone dangereuse",
          ja: "危険ゾーン",
        }
      },
      {
        key: "ui.manage.delete_account.button_text",
        values: {
          en: "Delete My Account",
          de: "Mein Konto löschen",
          pl: "Usuń moje konto",
          es: "Eliminar mi cuenta",
          fr: "Supprimer mon compte",
          ja: "アカウントを削除",
        }
      },
      {
        key: "ui.manage.delete_account.button_description",
        values: {
          en: "Permanently delete your account and all associated data. This cannot be undone.",
          de: "Löschen Sie Ihr Konto und alle zugehörigen Daten dauerhaft. Dies kann nicht rückgängig gemacht werden.",
          pl: "Trwale usuń swoje konto i wszystkie powiązane dane. Nie można tego cofnąć.",
          es: "Elimina permanentemente tu cuenta y todos los datos asociados. Esto no se puede deshacer.",
          fr: "Supprimez définitivement votre compte et toutes les données associées. Cela ne peut pas être annulé.",
          ja: "アカウントと関連するすべてのデータを完全に削除します。これは元に戻せません。",
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
            "delete-account"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Delete Account translations`);
    return { success: true, count };
  }
});
