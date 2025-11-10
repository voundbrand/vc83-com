/**
 * EVENTS TRANSLATIONS - FORM SPONSORS
 *
 * Event Sponsors section translations:
 * - Sponsor selection
 * - Sponsor levels
 * - Sponsor management
 *
 * Namespace: ui.events.form
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

interface Translation {
  locale: string;
  key: string;
  value: string;
}

const translations: Translation[] = [
  // ===== ENGLISH =====
  // Event Form - Sponsors
  { locale: "en", key: "ui.events.form.sponsors", value: "Event Sponsors (Optional)" },
  { locale: "en", key: "ui.events.form.add_sponsor", value: "Add Sponsor" },
  { locale: "en", key: "ui.events.form.sponsor_org", value: "-- Select CRM Organization --" },
  { locale: "en", key: "ui.events.form.sponsor_level", value: "Sponsorship Level" },
  { locale: "en", key: "ui.events.form.sponsor_platinum", value: "Platinum" },
  { locale: "en", key: "ui.events.form.sponsor_gold", value: "Gold" },
  { locale: "en", key: "ui.events.form.sponsor_silver", value: "Silver" },
  { locale: "en", key: "ui.events.form.sponsor_bronze", value: "Bronze" },
  { locale: "en", key: "ui.events.form.sponsor_community", value: "Community" },
  { locale: "en", key: "ui.events.form.add_sponsor_button", value: "Add" },
  { locale: "en", key: "ui.events.form.cancel_sponsor", value: "Cancel" },
  { locale: "en", key: "ui.events.form.remove_sponsor", value: "Remove" },
  { locale: "en", key: "ui.events.form.edit_sponsor", value: "Edit sponsor in CRM" },
  { locale: "en", key: "ui.events.form.remove_sponsor_title", value: "Remove sponsor" },
  { locale: "en", key: "ui.events.form.no_sponsors", value: "No sponsors added yet" },
  { locale: "en", key: "ui.events.form.current_sponsors", value: "Current Sponsors ({count})" },
  { locale: "en", key: "ui.events.form.sponsor_help", value: "Select a sponsor organization. The sponsor level is set in CRM and will be used automatically." },
  { locale: "en", key: "ui.events.form.sponsor_remove_confirm", value: "Remove this sponsor from the event?" },
  { locale: "en", key: "ui.events.form.sponsor_add_failed", value: "Failed to add sponsor. Please try again." },
  { locale: "en", key: "ui.events.form.sponsor_remove_failed", value: "Failed to remove sponsor. Please try again." },

  // ===== GERMAN =====
  // Event Form - Sponsors
  { locale: "de", key: "ui.events.form.sponsors", value: "Veranstaltungssponsoren (Optional)" },
  { locale: "de", key: "ui.events.form.add_sponsor", value: "Sponsor hinzufügen" },
  { locale: "de", key: "ui.events.form.sponsor_org", value: "-- CRM-Organisation auswählen --" },
  { locale: "de", key: "ui.events.form.sponsor_level", value: "Sponsorenstufe" },
  { locale: "de", key: "ui.events.form.sponsor_platinum", value: "Platin" },
  { locale: "de", key: "ui.events.form.sponsor_gold", value: "Gold" },
  { locale: "de", key: "ui.events.form.sponsor_silver", value: "Silber" },
  { locale: "de", key: "ui.events.form.sponsor_bronze", value: "Bronze" },
  { locale: "de", key: "ui.events.form.sponsor_community", value: "Community" },
  { locale: "de", key: "ui.events.form.add_sponsor_button", value: "Hinzufügen" },
  { locale: "de", key: "ui.events.form.cancel_sponsor", value: "Abbrechen" },
  { locale: "de", key: "ui.events.form.remove_sponsor", value: "Entfernen" },
  { locale: "de", key: "ui.events.form.edit_sponsor", value: "Sponsor im CRM bearbeiten" },
  { locale: "de", key: "ui.events.form.remove_sponsor_title", value: "Sponsor entfernen" },
  { locale: "de", key: "ui.events.form.no_sponsors", value: "Noch keine Sponsoren hinzugefügt" },
  { locale: "de", key: "ui.events.form.current_sponsors", value: "Aktuelle Sponsoren ({count})" },
  { locale: "de", key: "ui.events.form.sponsor_help", value: "Wählen Sie eine Sponsororganisation aus. Die Sponsorenstufe wird im CRM festgelegt und automatisch verwendet." },
  { locale: "de", key: "ui.events.form.sponsor_remove_confirm", value: "Diesen Sponsor von der Veranstaltung entfernen?" },
  { locale: "de", key: "ui.events.form.sponsor_add_failed", value: "Sponsor konnte nicht hinzugefügt werden. Bitte versuchen Sie es erneut." },
  { locale: "de", key: "ui.events.form.sponsor_remove_failed", value: "Sponsor konnte nicht entfernt werden. Bitte versuchen Sie es erneut." },

  // ===== SPANISH =====
  // Event Form - Sponsors
  { locale: "es", key: "ui.events.form.sponsors", value: "Patrocinadores del evento (Opcional)" },
  { locale: "es", key: "ui.events.form.add_sponsor", value: "Añadir patrocinador" },
  { locale: "es", key: "ui.events.form.sponsor_org", value: "-- Seleccionar organización CRM --" },
  { locale: "es", key: "ui.events.form.sponsor_level", value: "Nivel de patrocinio" },
  { locale: "es", key: "ui.events.form.sponsor_platinum", value: "Platino" },
  { locale: "es", key: "ui.events.form.sponsor_gold", value: "Oro" },
  { locale: "es", key: "ui.events.form.sponsor_silver", value: "Plata" },
  { locale: "es", key: "ui.events.form.sponsor_bronze", value: "Bronce" },
  { locale: "es", key: "ui.events.form.sponsor_community", value: "Comunidad" },
  { locale: "es", key: "ui.events.form.add_sponsor_button", value: "Añadir" },
  { locale: "es", key: "ui.events.form.cancel_sponsor", value: "Cancelar" },
  { locale: "es", key: "ui.events.form.remove_sponsor", value: "Eliminar" },
  { locale: "es", key: "ui.events.form.edit_sponsor", value: "Editar patrocinador en CRM" },
  { locale: "es", key: "ui.events.form.remove_sponsor_title", value: "Eliminar patrocinador" },
  { locale: "es", key: "ui.events.form.no_sponsors", value: "Aún no se han añadido patrocinadores" },
  { locale: "es", key: "ui.events.form.current_sponsors", value: "Patrocinadores actuales ({count})" },
  { locale: "es", key: "ui.events.form.sponsor_help", value: "Selecciona una organización patrocinadora. El nivel de patrocinio se establece en CRM y se usará automáticamente." },
  { locale: "es", key: "ui.events.form.sponsor_remove_confirm", value: "¿Eliminar este patrocinador del evento?" },
  { locale: "es", key: "ui.events.form.sponsor_add_failed", value: "Error al añadir el patrocinador. Por favor, inténtalo de nuevo." },
  { locale: "es", key: "ui.events.form.sponsor_remove_failed", value: "Error al eliminar el patrocinador. Por favor, inténtalo de nuevo." },

  // ===== FRENCH =====
  // Event Form - Sponsors
  { locale: "fr", key: "ui.events.form.sponsors", value: "Sponsors de l'événement (Facultatif)" },
  { locale: "fr", key: "ui.events.form.add_sponsor", value: "Ajouter un sponsor" },
  { locale: "fr", key: "ui.events.form.sponsor_org", value: "-- Sélectionner une organisation CRM --" },
  { locale: "fr", key: "ui.events.form.sponsor_level", value: "Niveau de sponsoring" },
  { locale: "fr", key: "ui.events.form.sponsor_platinum", value: "Platine" },
  { locale: "fr", key: "ui.events.form.sponsor_gold", value: "Or" },
  { locale: "fr", key: "ui.events.form.sponsor_silver", value: "Argent" },
  { locale: "fr", key: "ui.events.form.sponsor_bronze", value: "Bronze" },
  { locale: "fr", key: "ui.events.form.sponsor_community", value: "Communauté" },
  { locale: "fr", key: "ui.events.form.add_sponsor_button", value: "Ajouter" },
  { locale: "fr", key: "ui.events.form.cancel_sponsor", value: "Annuler" },
  { locale: "fr", key: "ui.events.form.remove_sponsor", value: "Supprimer" },
  { locale: "fr", key: "ui.events.form.edit_sponsor", value: "Modifier le sponsor dans CRM" },
  { locale: "fr", key: "ui.events.form.remove_sponsor_title", value: "Supprimer le sponsor" },
  { locale: "fr", key: "ui.events.form.no_sponsors", value: "Aucun sponsor ajouté pour le moment" },
  { locale: "fr", key: "ui.events.form.current_sponsors", value: "Sponsors actuels ({count})" },
  { locale: "fr", key: "ui.events.form.sponsor_help", value: "Sélectionnez une organisation sponsor. Le niveau de sponsoring est défini dans le CRM et sera utilisé automatiquement." },
  { locale: "fr", key: "ui.events.form.sponsor_remove_confirm", value: "Supprimer ce sponsor de l'événement ?" },
  { locale: "fr", key: "ui.events.form.sponsor_add_failed", value: "Échec de l'ajout du sponsor. Veuillez réessayer." },
  { locale: "fr", key: "ui.events.form.sponsor_remove_failed", value: "Échec de la suppression du sponsor. Veuillez réessayer." },

  // ===== JAPANESE =====
  // Event Form - Sponsors
  { locale: "ja", key: "ui.events.form.sponsors", value: "イベントスポンサー（オプション）" },
  { locale: "ja", key: "ui.events.form.add_sponsor", value: "スポンサーを追加" },
  { locale: "ja", key: "ui.events.form.sponsor_org", value: "-- CRM組織を選択 --" },
  { locale: "ja", key: "ui.events.form.sponsor_level", value: "スポンサーシップレベル" },
  { locale: "ja", key: "ui.events.form.sponsor_platinum", value: "プラチナ" },
  { locale: "ja", key: "ui.events.form.sponsor_gold", value: "ゴールド" },
  { locale: "ja", key: "ui.events.form.sponsor_silver", value: "シルバー" },
  { locale: "ja", key: "ui.events.form.sponsor_bronze", value: "ブロンズ" },
  { locale: "ja", key: "ui.events.form.sponsor_community", value: "コミュニティ" },
  { locale: "ja", key: "ui.events.form.add_sponsor_button", value: "追加" },
  { locale: "ja", key: "ui.events.form.cancel_sponsor", value: "キャンセル" },
  { locale: "ja", key: "ui.events.form.remove_sponsor", value: "削除" },
  { locale: "ja", key: "ui.events.form.edit_sponsor", value: "CRMでスポンサーを編集" },
  { locale: "ja", key: "ui.events.form.remove_sponsor_title", value: "スポンサーを削除" },
  { locale: "ja", key: "ui.events.form.no_sponsors", value: "まだスポンサーが追加されていません" },
  { locale: "ja", key: "ui.events.form.current_sponsors", value: "現在のスポンサー（{count}）" },
  { locale: "ja", key: "ui.events.form.sponsor_help", value: "スポンサー組織を選択してください。スポンサーシップレベルはCRMで設定され、自動的に使用されます。" },
  { locale: "ja", key: "ui.events.form.sponsor_remove_confirm", value: "このスポンサーをイベントから削除しますか？" },
  { locale: "ja", key: "ui.events.form.sponsor_add_failed", value: "スポンサーの追加に失敗しました。もう一度お試しください。" },
  { locale: "ja", key: "ui.events.form.sponsor_remove_failed", value: "スポンサーの削除に失敗しました。もう一度お試しください。" },

  // ===== POLISH =====
  // Event Form - Sponsors
  { locale: "pl", key: "ui.events.form.sponsors", value: "Sponsorzy wydarzenia (Opcjonalnie)" },
  { locale: "pl", key: "ui.events.form.add_sponsor", value: "Dodaj sponsora" },
  { locale: "pl", key: "ui.events.form.sponsor_org", value: "-- Wybierz organizację CRM --" },
  { locale: "pl", key: "ui.events.form.sponsor_level", value: "Poziom sponsoringu" },
  { locale: "pl", key: "ui.events.form.sponsor_platinum", value: "Platynowy" },
  { locale: "pl", key: "ui.events.form.sponsor_gold", value: "Złoty" },
  { locale: "pl", key: "ui.events.form.sponsor_silver", value: "Srebrny" },
  { locale: "pl", key: "ui.events.form.sponsor_bronze", value: "Brązowy" },
  { locale: "pl", key: "ui.events.form.sponsor_community", value: "Społecznościowy" },
  { locale: "pl", key: "ui.events.form.add_sponsor_button", value: "Dodaj" },
  { locale: "pl", key: "ui.events.form.cancel_sponsor", value: "Anuluj" },
  { locale: "pl", key: "ui.events.form.remove_sponsor", value: "Usuń" },
  { locale: "pl", key: "ui.events.form.edit_sponsor", value: "Edytuj sponsora w CRM" },
  { locale: "pl", key: "ui.events.form.remove_sponsor_title", value: "Usuń sponsora" },
  { locale: "pl", key: "ui.events.form.no_sponsors", value: "Nie dodano jeszcze żadnych sponsorów" },
  { locale: "pl", key: "ui.events.form.current_sponsors", value: "Obecni sponsorzy ({count})" },
  { locale: "pl", key: "ui.events.form.sponsor_help", value: "Wybierz organizację sponsora. Poziom sponsoringu jest ustawiany w CRM i będzie używany automatycznie." },
  { locale: "pl", key: "ui.events.form.sponsor_remove_confirm", value: "Usunąć tego sponsora z wydarzenia?" },
  { locale: "pl", key: "ui.events.form.sponsor_add_failed", value: "Nie udało się dodać sponsora. Spróbuj ponownie." },
  { locale: "pl", key: "ui.events.form.sponsor_remove_failed", value: "Nie udało się usunąć sponsora. Spróbuj ponownie." },
];

/**
 * Seed events form sponsors translations
 * AUTO-FINDS system org and user (no args needed!)
 *
 * Run: npx convex run translations/seedEvents_04_FormSponsors:seed
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📅 Seeding Events Form Sponsors Translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of translations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        translation.locale,
        "events",
        "events-window"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded Events Form Sponsors translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
