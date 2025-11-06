/**
 * SEED CRM TRANSLATIONS - MAIN WINDOW & CONTACTS/ORGANIZATIONS LISTS
 *
 * CRM window, contact list, contact details, organization list, organization details
 *
 * Components:
 *   - src/components/window-content/crm-window.tsx
 *   - src/components/window-content/crm-window/contacts-list.tsx
 *   - src/components/window-content/crm-window/contact-detail.tsx
 *   - src/components/window-content/crm-window/organizations-list.tsx
 *   - src/components/window-content/crm-window/organization-detail.tsx
 *
 * Namespace: ui.crm
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCRM_02_MainWindow:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding CRM - Main Window & Lists...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
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
      // ============================================================
      // MAIN WINDOW TABS
      // ============================================================
      {
        key: "ui.crm.tabs.contacts",
        values: {
          en: "CONTACTS",
          de: "KONTAKTE",
          pl: "KONTAKTY",
          es: "CONTACTOS",
          fr: "CONTACTS",
          ja: "連絡先",
        }
      },
      {
        key: "ui.crm.tabs.organizations",
        values: {
          en: "ORGANIZATIONS",
          de: "ORGANISATIONEN",
          pl: "ORGANIZACJE",
          es: "ORGANIZACIONES",
          fr: "ORGANISATIONS",
          ja: "組織",
        }
      },

      // ============================================================
      // CONTACTS LIST
      // ============================================================
      {
        key: "ui.crm.contacts.search_placeholder",
        values: {
          en: "Search contacts...",
          de: "Kontakte suchen...",
          pl: "Szukaj kontaktów...",
          es: "Buscar contactos...",
          fr: "Rechercher des contacts...",
          ja: "連絡先を検索...",
        }
      },
      {
        key: "ui.crm.contacts.filter_label_source",
        values: {
          en: "SOURCE:",
          de: "QUELLE:",
          pl: "ŹRÓDŁO:",
          es: "FUENTE:",
          fr: "SOURCE:",
          ja: "ソース:",
        }
      },
      {
        key: "ui.crm.contacts.filter_label_stage",
        values: {
          en: "STAGE:",
          de: "PHASE:",
          pl: "ETAP:",
          es: "ETAPA:",
          fr: "ÉTAPE:",
          ja: "ステージ:",
        }
      },
      {
        key: "ui.crm.contacts.filter_all_sources",
        values: {
          en: "All Sources",
          de: "Alle Quellen",
          pl: "Wszystkie źródła",
          es: "Todas las fuentes",
          fr: "Toutes les sources",
          ja: "すべてのソース",
        }
      },
      {
        key: "ui.crm.contacts.filter_source_checkout",
        values: {
          en: "Checkout",
          de: "Kaufabschluss",
          pl: "Kasa",
          es: "Pago",
          fr: "Paiement",
          ja: "チェックアウト",
        }
      },
      {
        key: "ui.crm.contacts.filter_source_form",
        values: {
          en: "Form",
          de: "Formular",
          pl: "Formularz",
          es: "Formulario",
          fr: "Formulaire",
          ja: "フォーム",
        }
      },
      {
        key: "ui.crm.contacts.filter_source_manual",
        values: {
          en: "Manual",
          de: "Manuell",
          pl: "Ręczne",
          es: "Manual",
          fr: "Manuel",
          ja: "手動",
        }
      },
      {
        key: "ui.crm.contacts.filter_source_import",
        values: {
          en: "Import",
          de: "Import",
          pl: "Import",
          es: "Importar",
          fr: "Importer",
          ja: "インポート",
        }
      },
      {
        key: "ui.crm.contacts.filter_all_stages",
        values: {
          en: "All Stages",
          de: "Alle Phasen",
          pl: "Wszystkie etapy",
          es: "Todas las etapas",
          fr: "Toutes les étapes",
          ja: "すべてのステージ",
        }
      },
      {
        key: "ui.crm.contacts.stage_lead",
        values: {
          en: "Lead",
          de: "Lead",
          pl: "Lead",
          es: "Prospecto",
          fr: "Lead",
          ja: "リード",
        }
      },
      {
        key: "ui.crm.contacts.stage_prospect",
        values: {
          en: "Prospect",
          de: "Interessent",
          pl: "Prospekt",
          es: "Prospecto",
          fr: "Prospect",
          ja: "見込み客",
        }
      },
      {
        key: "ui.crm.contacts.stage_customer",
        values: {
          en: "Customer",
          de: "Kunde",
          pl: "Klient",
          es: "Cliente",
          fr: "Client",
          ja: "顧客",
        }
      },
      {
        key: "ui.crm.contacts.stage_partner",
        values: {
          en: "Partner",
          de: "Partner",
          pl: "Partner",
          es: "Socio",
          fr: "Partenaire",
          ja: "パートナー",
        }
      },
      {
        key: "ui.crm.contacts.results_count",
        values: {
          en: "{count} contact{s} found",
          de: "{count} Kontakt{s} gefunden",
          pl: "{count} kontakt{s} znaleziono",
          es: "{count} contacto{s} encontrado{s}",
          fr: "{count} contact{s} trouvé{s}",
          ja: "{count}件の連絡先が見つかりました",
        }
      },
      {
        key: "ui.crm.contacts.clear_filters",
        values: {
          en: "Clear filters",
          de: "Filter löschen",
          pl: "Wyczyść filtry",
          es: "Limpiar filtros",
          fr: "Effacer les filtres",
          ja: "フィルターをクリア",
        }
      },
      {
        key: "ui.crm.contacts.loading",
        values: {
          en: "Loading contacts...",
          de: "Kontakte werden geladen...",
          pl: "Ładowanie kontaktów...",
          es: "Cargando contactos...",
          fr: "Chargement des contacts...",
          ja: "連絡先を読み込み中...",
        }
      },
      {
        key: "ui.crm.contacts.no_contacts",
        values: {
          en: "No contacts found",
          de: "Keine Kontakte gefunden",
          pl: "Nie znaleziono kontaktów",
          es: "No se encontraron contactos",
          fr: "Aucun contact trouvé",
          ja: "連絡先が見つかりません",
        }
      },
      {
        key: "ui.crm.contacts.please_login",
        values: {
          en: "PLEASE LOG IN",
          de: "BITTE ANMELDEN",
          pl: "ZALOGUJ SIĘ",
          es: "POR FAVOR INICIA SESIÓN",
          fr: "VEUILLEZ VOUS CONNECTER",
          ja: "ログインしてください",
        }
      },
      {
        key: "ui.crm.contacts.login_required",
        values: {
          en: "You need to be logged in to view contacts",
          de: "Sie müssen angemeldet sein, um Kontakte anzuzeigen",
          pl: "Musisz być zalogowany, aby zobaczyć kontakty",
          es: "Debes iniciar sesión para ver contactos",
          fr: "Vous devez être connecté pour voir les contacts",
          ja: "連絡先を表示するにはログインが必要です",
        }
      },
      {
        key: "ui.crm.contacts.select_contact",
        values: {
          en: "SELECT A CONTACT",
          de: "KONTAKT AUSWÄHLEN",
          pl: "WYBIERZ KONTAKT",
          es: "SELECCIONA UN CONTACTO",
          fr: "SÉLECTIONNER UN CONTACT",
          ja: "連絡先を選択",
        }
      },
      {
        key: "ui.crm.contacts.select_contact_hint",
        values: {
          en: "Click a contact from the list to view details",
          de: "Klicken Sie auf einen Kontakt aus der Liste, um Details anzuzeigen",
          pl: "Kliknij kontakt z listy, aby zobaczyć szczegóły",
          es: "Haz clic en un contacto de la lista para ver los detalles",
          fr: "Cliquez sur un contact dans la liste pour voir les détails",
          ja: "リストから連絡先をクリックして詳細を表示",
        }
      },
      {
        key: "ui.crm.contacts.delete_confirm_title",
        values: {
          en: "Delete Contact?",
          de: "Kontakt löschen?",
          pl: "Usunąć kontakt?",
          es: "¿Eliminar contacto?",
          fr: "Supprimer le contact?",
          ja: "連絡先を削除しますか？",
        }
      },
      {
        key: "ui.crm.contacts.delete_confirm_message",
        values: {
          en: "Are you sure you want to delete this contact? This action cannot be undone.",
          de: "Sind Sie sicher, dass Sie diesen Kontakt löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
          pl: "Czy na pewno chcesz usunąć ten kontakt? Tej akcji nie można cofnąć.",
          es: "¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer.",
          fr: "Êtes-vous sûr de vouloir supprimer ce contact? Cette action ne peut pas être annulée.",
          ja: "この連絡先を削除してもよろしいですか？この操作は元に戻せません。",
        }
      },

      // ============================================================
      // CONTACT DETAIL
      // ============================================================
      {
        key: "ui.crm.contact_detail.organization_label",
        values: {
          en: "ORGANIZATION",
          de: "ORGANISATION",
          pl: "ORGANIZACJA",
          es: "ORGANIZACIÓN",
          fr: "ORGANISATION",
          ja: "組織",
        }
      },
      {
        key: "ui.crm.contact_detail.primary_contact",
        values: {
          en: "Primary Contact",
          de: "Hauptkontakt",
          pl: "Główny kontakt",
          es: "Contacto principal",
          fr: "Contact principal",
          ja: "主要連絡先",
        }
      },
      {
        key: "ui.crm.contact_detail.total_spent",
        values: {
          en: "TOTAL SPENT",
          de: "GESAMT AUSGEGEBEN",
          pl: "ŁĄCZNE WYDATKI",
          es: "TOTAL GASTADO",
          fr: "TOTAL DÉPENSÉ",
          ja: "総支出額",
        }
      },
      {
        key: "ui.crm.contact_detail.purchases",
        values: {
          en: "PURCHASES",
          de: "KÄUFE",
          pl: "ZAKUPY",
          es: "COMPRAS",
          fr: "ACHATS",
          ja: "購入",
        }
      },
      {
        key: "ui.crm.contact_detail.status_label",
        values: {
          en: "STATUS",
          de: "STATUS",
          pl: "STATUS",
          es: "ESTADO",
          fr: "STATUT",
          ja: "ステータス",
        }
      },
      {
        key: "ui.crm.contact_detail.source_label",
        values: {
          en: "SOURCE:",
          de: "QUELLE:",
          pl: "ŹRÓDŁO:",
          es: "FUENTE:",
          fr: "SOURCE:",
          ja: "ソース:",
        }
      },
      {
        key: "ui.crm.contact_detail.tags_label",
        values: {
          en: "TAGS",
          de: "TAGS",
          pl: "TAGI",
          es: "ETIQUETAS",
          fr: "TAGS",
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
          en: "Created:",
          de: "Erstellt:",
          pl: "Utworzono:",
          es: "Creado:",
          fr: "Créé:",
          ja: "作成日:",
        }
      },
      {
        key: "ui.crm.contact_detail.first_purchase",
        values: {
          en: "First Purchase:",
          de: "Erster Kauf:",
          pl: "Pierwszy zakup:",
          es: "Primera compra:",
          fr: "Premier achat:",
          ja: "初回購入:",
        }
      },
      {
        key: "ui.crm.contact_detail.last_purchase",
        values: {
          en: "Last Purchase:",
          de: "Letzter Kauf:",
          pl: "Ostatni zakup:",
          es: "Última compra:",
          fr: "Dernier achat:",
          ja: "最終購入:",
        }
      },
      {
        key: "ui.crm.contact_detail.last_activity",
        values: {
          en: "Last Activity:",
          de: "Letzte Aktivität:",
          pl: "Ostatnia aktywność:",
          es: "Última actividad:",
          fr: "Dernière activité:",
          ja: "最終アクティビティ:",
        }
      },

      // ============================================================
      // ORGANIZATIONS LIST
      // ============================================================
      {
        key: "ui.crm.organizations.search_placeholder",
        values: {
          en: "Search organizations...",
          de: "Organisationen suchen...",
          pl: "Szukaj organizacji...",
          es: "Buscar organizaciones...",
          fr: "Rechercher des organisations...",
          ja: "組織を検索...",
        }
      },
      {
        key: "ui.crm.organizations.results_count",
        values: {
          en: "{count} organization{s} found",
          de: "{count} Organisation{s} gefunden",
          pl: "{count} organizacj{s} znaleziono",
          es: "{count} organización{s} encontrada{s}",
          fr: "{count} organisation{s} trouvée{s}",
          ja: "{count}件の組織が見つかりました",
        }
      },
      {
        key: "ui.crm.organizations.clear_search",
        values: {
          en: "Clear search",
          de: "Suche löschen",
          pl: "Wyczyść wyszukiwanie",
          es: "Limpiar búsqueda",
          fr: "Effacer la recherche",
          ja: "検索をクリア",
        }
      },
      {
        key: "ui.crm.organizations.loading",
        values: {
          en: "Loading organizations...",
          de: "Organisationen werden geladen...",
          pl: "Ładowanie organizacji...",
          es: "Cargando organizaciones...",
          fr: "Chargement des organisations...",
          ja: "組織を読み込み中...",
        }
      },
      {
        key: "ui.crm.organizations.no_organizations",
        values: {
          en: "No organizations found",
          de: "Keine Organisationen gefunden",
          pl: "Nie znaleziono organizacji",
          es: "No se encontraron organizaciones",
          fr: "Aucune organisation trouvée",
          ja: "組織が見つかりません",
        }
      },
      {
        key: "ui.crm.organizations.please_login",
        values: {
          en: "PLEASE LOG IN",
          de: "BITTE ANMELDEN",
          pl: "ZALOGUJ SIĘ",
          es: "POR FAVOR INICIA SESIÓN",
          fr: "VEUILLEZ VOUS CONNECTER",
          ja: "ログインしてください",
        }
      },
      {
        key: "ui.crm.organizations.login_required",
        values: {
          en: "You need to be logged in to view organizations",
          de: "Sie müssen angemeldet sein, um Organisationen anzuzeigen",
          pl: "Musisz być zalogowany, aby zobaczyć organizacje",
          es: "Debes iniciar sesión para ver organizaciones",
          fr: "Vous devez être connecté pour voir les organisations",
          ja: "組織を表示するにはログインが必要です",
        }
      },
      {
        key: "ui.crm.organizations.select_organization",
        values: {
          en: "SELECT AN ORGANIZATION",
          de: "ORGANISATION AUSWÄHLEN",
          pl: "WYBIERZ ORGANIZACJĘ",
          es: "SELECCIONA UNA ORGANIZACIÓN",
          fr: "SÉLECTIONNER UNE ORGANISATION",
          ja: "組織を選択",
        }
      },
      {
        key: "ui.crm.organizations.select_organization_hint",
        values: {
          en: "Click an organization from the list to view details",
          de: "Klicken Sie auf eine Organisation aus der Liste, um Details anzuzeigen",
          pl: "Kliknij organizację z listy, aby zobaczyć szczegóły",
          es: "Haz clic en una organización de la lista para ver los detalles",
          fr: "Cliquez sur une organisation dans la liste pour voir les détails",
          ja: "リストから組織をクリックして詳細を表示",
        }
      },

      // ============================================================
      // ORGANIZATION DETAIL
      // ============================================================
      {
        key: "ui.crm.organization_detail.company_info",
        values: {
          en: "COMPANY INFO",
          de: "FIRMENINFO",
          pl: "INFORMACJE O FIRMIE",
          es: "INFORMACIÓN DE LA EMPRESA",
          fr: "INFORMATIONS SUR L'ENTREPRISE",
          ja: "会社情報",
        }
      },
      {
        key: "ui.crm.organization_detail.industry",
        values: {
          en: "Industry:",
          de: "Branche:",
          pl: "Branża:",
          es: "Industria:",
          fr: "Industrie:",
          ja: "業界:",
        }
      },
      {
        key: "ui.crm.organization_detail.company_size",
        values: {
          en: "Company Size:",
          de: "Firmengröße:",
          pl: "Wielkość firmy:",
          es: "Tamaño de la empresa:",
          fr: "Taille de l'entreprise:",
          ja: "会社規模:",
        }
      },
      {
        key: "ui.crm.organization_detail.address_label",
        values: {
          en: "ADDRESS",
          de: "ADRESSE",
          pl: "ADRES",
          es: "DIRECCIÓN",
          fr: "ADRESSE",
          ja: "住所",
        }
      },
      {
        key: "ui.crm.organization_detail.contacts_label",
        values: {
          en: "CONTACTS ({count})",
          de: "KONTAKTE ({count})",
          pl: "KONTAKTY ({count})",
          es: "CONTACTOS ({count})",
          fr: "CONTACTS ({count})",
          ja: "連絡先 ({count}件)",
        }
      },
      {
        key: "ui.crm.organization_detail.no_contacts",
        values: {
          en: "No contacts linked to this organization",
          de: "Keine Kontakte mit dieser Organisation verknüpft",
          pl: "Brak kontaktów powiązanych z tą organizacją",
          es: "No hay contactos vinculados a esta organización",
          fr: "Aucun contact lié à cette organisation",
          ja: "この組織にリンクされた連絡先はありません",
        }
      },
      {
        key: "ui.crm.organization_detail.primary_tag",
        values: {
          en: "PRIMARY",
          de: "PRIMÄR",
          pl: "GŁÓWNY",
          es: "PRINCIPAL",
          fr: "PRINCIPAL",
          ja: "主要",
        }
      },

      // ============================================================
      // COMMON BUTTONS
      // ============================================================
      {
        key: "ui.crm.buttons.cancel",
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
        key: "ui.crm.buttons.delete",
        values: {
          en: "Delete",
          de: "Löschen",
          pl: "Usuń",
          es: "Eliminar",
          fr: "Supprimer",
          ja: "削除",
        }
      },
    ];

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
            "main-window"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} CRM main window translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
