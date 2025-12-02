/**
 * SEED CRM TRANSLATIONS - NOTIFICATIONS AND PIPELINE STATUS
 *
 * Success/error notifications for CRUD operations and pipeline status display
 * in organization form.
 *
 * Namespace: ui.crm
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCRM_06_NotificationsAndPipelines:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding CRM - Notifications & Pipeline Status...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) throw new Error("System user not found");

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // Pipeline Success Notifications
      {
        key: "ui.crm.pipeline.update_success",
        values: {
          en: "Pipeline updated",
          de: "Pipeline aktualisiert",
          pl: "Pipeline zaktualizowany",
          es: "Pipeline actualizado",
          fr: "Pipeline mis à jour",
          ja: "パイプライン更新",
        }
      },
      {
        key: "ui.crm.pipeline.delete_success",
        values: {
          en: "Pipeline deleted",
          de: "Pipeline gelöscht",
          pl: "Pipeline usunięty",
          es: "Pipeline eliminado",
          fr: "Pipeline supprimé",
          ja: "パイプライン削除",
        }
      },
      {
        key: "ui.crm.pipeline.create_success",
        values: {
          en: "Pipeline created",
          de: "Pipeline erstellt",
          pl: "Pipeline utworzony",
          es: "Pipeline creado",
          fr: "Pipeline créé",
          ja: "パイプライン作成",
        }
      },
      {
        key: "ui.crm.pipeline.delete_stage_success",
        values: {
          en: "Stage deleted",
          de: "Phase gelöscht",
          pl: "Etap usunięty",
          es: "Etapa eliminada",
          fr: "Étape supprimée",
          ja: "ステージ削除",
        }
      },

      // Contact/Organization Success Notifications
      {
        key: "ui.crm.contacts.delete_success",
        values: {
          en: "Contact deleted",
          de: "Kontakt gelöscht",
          pl: "Kontakt usunięty",
          es: "Contacto eliminado",
          fr: "Contact supprimé",
          ja: "連絡先削除",
        }
      },
      {
        key: "ui.crm.contacts.delete_failed",
        values: {
          en: "Failed to delete contact",
          de: "Kontakt konnte nicht gelöscht werden",
          pl: "Nie udało się usunąć kontaktu",
          es: "No se pudo eliminar el contacto",
          fr: "Échec de la suppression du contact",
          ja: "連絡先の削除に失敗",
        }
      },
      {
        key: "ui.crm.organizations.delete_success",
        values: {
          en: "Organization deleted",
          de: "Organisation gelöscht",
          pl: "Organizacja usunięta",
          es: "Organización eliminada",
          fr: "Organisation supprimée",
          ja: "組織削除",
        }
      },
      {
        key: "ui.crm.organizations.delete_failed",
        values: {
          en: "Failed to delete organization",
          de: "Organisation konnte nicht gelöscht werden",
          pl: "Nie udało się usunąć organizacji",
          es: "No se pudo eliminar la organización",
          fr: "Échec de la suppression de l'organisation",
          ja: "組織の削除に失敗",
        }
      },
      {
        key: "ui.crm.organization_form.success.updated",
        values: {
          en: "Organization updated",
          de: "Organisation aktualisiert",
          pl: "Organizacja zaktualizowana",
          es: "Organización actualizada",
          fr: "Organisation mise à jour",
          ja: "組織更新",
        }
      },
      {
        key: "ui.crm.organization_form.success.created",
        values: {
          en: "Organization created",
          de: "Organisation erstellt",
          pl: "Organizacja utworzona",
          es: "Organización creada",
          fr: "Organisation créée",
          ja: "組織作成",
        }
      },

      // Contact Detail Labels
      {
        key: "ui.crm.contact_detail.pipelines_label",
        values: {
          en: "PIPELINES",
          de: "PIPELINES",
          pl: "PIPELINE",
          es: "PIPELINES",
          fr: "PIPELINES",
          ja: "パイプライン",
        }
      },
      {
        key: "ui.crm.contact_detail.tags_label",
        values: {
          en: "TAGS",
          de: "TAGS",
          pl: "TAGI",
          es: "ETIQUETAS",
          fr: "ÉTIQUETTES",
          ja: "タグ",
        }
      },
      {
        key: "ui.crm.contact_detail.notes_label",
        values: {
          en: "NOTES",
          de: "NOTIZEN",
          pl: "NOTATKI",
          es: "NOTAS",
          fr: "NOTES",
          ja: "メモ",
        }
      },
      {
        key: "ui.crm.contact_detail.no_pipelines",
        values: {
          en: "Not in any pipelines",
          de: "Nicht in Pipelines",
          pl: "Nie w żadnych pipeline",
          es: "No está en ningún pipeline",
          fr: "Pas dans les pipelines",
          ja: "パイプラインなし",
        }
      },
      {
        key: "ui.crm.contact_detail.add_to_pipeline",
        values: {
          en: "Add",
          de: "Hinzufügen",
          pl: "Dodaj",
          es: "Añadir",
          fr: "Ajouter",
          ja: "追加",
        }
      },
      {
        key: "ui.crm.contact_detail.current_stage",
        values: {
          en: "Current Stage:",
          de: "Aktuelle Phase:",
          pl: "Obecny etap:",
          es: "Etapa actual:",
          fr: "Étape actuelle:",
          ja: "現在のステージ:",
        }
      },
      {
        key: "ui.crm.contact_detail.select_pipeline",
        values: {
          en: "Select Pipeline:",
          de: "Pipeline auswählen:",
          pl: "Wybierz pipeline:",
          es: "Seleccionar pipeline:",
          fr: "Sélectionner le pipeline:",
          ja: "パイプラインを選択:",
        }
      },
      {
        key: "ui.crm.contact_detail.select_stage",
        values: {
          en: "Select Stage:",
          de: "Phase auswählen:",
          pl: "Wybierz etap:",
          es: "Seleccionar etapa:",
          fr: "Sélectionner l'étape:",
          ja: "ステージを選択:",
        }
      },
      {
        key: "ui.crm.contact_detail.activity_label",
        values: {
          en: "ACTIVITY",
          de: "AKTIVITÄT",
          pl: "AKTYWNOŚĆ",
          es: "ACTIVIDAD",
          fr: "ACTIVITÉ",
          ja: "アクティビティ",
        }
      },
      {
        key: "ui.crm.contact_detail.created",
        values: {
          en: "Created",
          de: "Erstellt",
          pl: "Utworzono",
          es: "Creado",
          fr: "Créé",
          ja: "作成日",
        }
      },
      {
        key: "ui.crm.contact_detail.first_purchase",
        values: {
          en: "First Purchase",
          de: "Erster Kauf",
          pl: "Pierwszy zakup",
          es: "Primera compra",
          fr: "Premier achat",
          ja: "初回購入",
        }
      },
      {
        key: "ui.crm.contact_detail.last_purchase",
        values: {
          en: "Last Purchase",
          de: "Letzter Kauf",
          pl: "Ostatni zakup",
          es: "Última compra",
          fr: "Dernier achat",
          ja: "最終購入",
        }
      },
      {
        key: "ui.crm.contact_detail.last_activity",
        values: {
          en: "Last Activity",
          de: "Letzte Aktivität",
          pl: "Ostatnia aktywność",
          es: "Última actividad",
          fr: "Dernière activité",
          ja: "最終アクティビティ",
        }
      },

      // Organization Pipeline Status Section
      {
        key: "ui.crm.organization_form.sections.pipeline_status",
        values: {
          en: "Contacts & Pipeline Status",
          de: "Kontakte & Pipeline-Status",
          pl: "Kontakty i status pipeline",
          es: "Contactos y estado del pipeline",
          fr: "Contacts et état du pipeline",
          ja: "連絡先とパイプラインステータス",
        }
      },
      {
        key: "ui.crm.organization_form.pipeline_status.no_contacts",
        values: {
          en: "No Contacts Yet",
          de: "Noch keine Kontakte",
          pl: "Brak kontaktów",
          es: "Sin contactos aún",
          fr: "Pas encore de contacts",
          ja: "連絡先なし",
        }
      },
      {
        key: "ui.crm.organization_form.pipeline_status.no_contacts_hint",
        values: {
          en: "Add contacts to this organization to see their pipeline progress.",
          de: "Fügen Sie dieser Organisation Kontakte hinzu, um deren Pipeline-Fortschritt zu sehen.",
          pl: "Dodaj kontakty do tej organizacji, aby zobaczyć ich postęp w pipeline.",
          es: "Agregue contactos a esta organización para ver su progreso en el pipeline.",
          fr: "Ajoutez des contacts à cette organisation pour voir leur progression dans le pipeline.",
          ja: "この組織に連絡先を追加して、パイプラインの進行状況を確認してください。",
        }
      },
      {
        key: "ui.crm.organization_form.pipeline_status.manage_in_pipelines",
        values: {
          en: "Manage in Pipelines",
          de: "In Pipelines verwalten",
          pl: "Zarządzaj w pipeline",
          es: "Gestionar en pipelines",
          fr: "Gérer dans les pipelines",
          ja: "パイプラインで管理",
        }
      },
    ];

    // Get existing translation keys to avoid duplicates
    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(ctx.db, systemOrg._id, allKeys);

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
            "crm",
            "notifications"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} CRM notification translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  },
});
