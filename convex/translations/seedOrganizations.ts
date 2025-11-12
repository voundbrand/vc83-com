/**
 * SEED ORGANIZATIONS WINDOW TRANSLATIONS
 *
 * Seeds translations for:
 * - Organizations window tabs and headers
 * - Organizations list tab (view all orgs)
 * - System organizations tab (create new orgs)
 * - Status labels, role names, buttons, and messages
 *
 * Run: npx convex run translations/seedOrganizations:seed
 */

import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Organizations window translations...");

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
      // === MAIN WINDOW HEADER ===
      {
        key: "ui.organizations.window_title",
        values: {
          en: "System Organizations",
          de: "Systemorganisationen",
          pl: "Organizacje systemowe",
          es: "Organizaciones del sistema",
          fr: "Organisations système",
          ja: "システム組織",
        }
      },
      {
        key: "ui.organizations.window_subtitle",
        values: {
          en: "Manage your organizations and create new ones",
          de: "Verwalten Sie Ihre Organisationen und erstellen Sie neue",
          pl: "Zarządzaj swoimi organizacjami i twórz nowe",
          es: "Gestiona tus organizaciones y crea nuevas",
          fr: "Gérez vos organisations et créez-en de nouvelles",
          ja: "組織を管理し、新しい組織を作成します",
        }
      },

      // === TAB LABELS ===
      {
        key: "ui.organizations.tab.list",
        values: {
          en: "Organizations",
          de: "Organisationen",
          pl: "Organizacje",
          es: "Organizaciones",
          fr: "Organisations",
          ja: "組織",
        }
      },
      {
        key: "ui.organizations.tab.create",
        values: {
          en: "Create",
          de: "Erstellen",
          pl: "Utwórz",
          es: "Crear",
          fr: "Créer",
          ja: "作成",
        }
      },

      // === LIST TAB - LOADING & EMPTY STATES ===
      {
        key: "ui.organizations.list.loading",
        values: {
          en: "Loading organizations...",
          de: "Organisationen werden geladen...",
          pl: "Ładowanie organizacji...",
          es: "Cargando organizaciones...",
          fr: "Chargement des organisations...",
          ja: "組織を読み込んでいます...",
        }
      },
      {
        key: "ui.organizations.list.empty.title",
        values: {
          en: "No Organizations Found",
          de: "Keine Organisationen gefunden",
          pl: "Nie znaleziono organizacji",
          es: "No se encontraron organizaciones",
          fr: "Aucune organisation trouvée",
          ja: "組織が見つかりません",
        }
      },
      {
        key: "ui.organizations.list.empty.description",
        values: {
          en: "You don't have access to any organizations yet.",
          de: "Sie haben noch keinen Zugriff auf Organisationen.",
          pl: "Nie masz jeszcze dostępu do żadnych organizacji.",
          es: "Aún no tienes acceso a ninguna organización.",
          fr: "Vous n'avez pas encore accès à des organisations.",
          ja: "まだ組織にアクセスできません。",
        }
      },
      {
        key: "ui.organizations.list.empty.action",
        values: {
          en: "Create a new organization using the \"Create\" tab.",
          de: "Erstellen Sie eine neue Organisation über den Tab \"Erstellen\".",
          pl: "Utwórz nową organizację za pomocą zakładki \"Utwórz\".",
          es: "Crea una nueva organización usando la pestaña \"Crear\".",
          fr: "Créez une nouvelle organisation en utilisant l'onglet \"Créer\".",
          ja: "「作成」タブを使用して新しい組織を作成します。",
        }
      },

      // === LIST TAB - HEADERS ===
      {
        key: "ui.organizations.list.title",
        values: {
          en: "Your Organizations",
          de: "Ihre Organisationen",
          pl: "Twoje organizacje",
          es: "Tus organizaciones",
          fr: "Vos organisations",
          ja: "あなたの組織",
        }
      },
      {
        key: "ui.organizations.list.subtitle",
        values: {
          en: "All organizations you have access to",
          de: "Alle Organisationen, auf die Sie Zugriff haben",
          pl: "Wszystkie organizacje, do których masz dostęp",
          es: "Todas las organizaciones a las que tienes acceso",
          fr: "Toutes les organisations auxquelles vous avez accès",
          ja: "アクセスできるすべての組織",
        }
      },
      {
        key: "ui.organizations.list.inactive_note",
        values: {
          en: "Inactive organizations are soft-deleted and can be permanently removed.",
          de: "Inaktive Organisationen sind vorläufig gelöscht und können dauerhaft entfernt werden.",
          pl: "Nieaktywne organizacje są wstępnie usunięte i mogą zostać trwale usunięte.",
          es: "Las organizaciones inactivas están eliminadas temporalmente y pueden eliminarse permanentemente.",
          fr: "Les organisations inactives sont supprimées de manière réversible et peuvent être supprimées définitivement.",
          ja: "非アクティブな組織は論理削除され、完全に削除できます。",
        }
      },

      // === STATUS BADGES ===
      {
        key: "ui.organizations.status.active",
        values: {
          en: "Active",
          de: "Aktiv",
          pl: "Aktywne",
          es: "Activo",
          fr: "Actif",
          ja: "アクティブ",
        }
      },
      {
        key: "ui.organizations.status.inactive",
        values: {
          en: "Inactive",
          de: "Inaktiv",
          pl: "Nieaktywne",
          es: "Inactivo",
          fr: "Inactif",
          ja: "非アクティブ",
        }
      },

      // === ROLE LABELS ===
      {
        key: "ui.organizations.role.label",
        values: {
          en: "Role:",
          de: "Rolle:",
          pl: "Rola:",
          es: "Rol:",
          fr: "Rôle:",
          ja: "役割：",
        }
      },
      {
        key: "ui.organizations.role.super_admin",
        values: {
          en: "Super Admin",
          de: "Super Admin",
          pl: "Super Administrator",
          es: "Super Administrador",
          fr: "Super Administrateur",
          ja: "スーパー管理者",
        }
      },
      {
        key: "ui.organizations.role.org_owner",
        values: {
          en: "Owner",
          de: "Inhaber",
          pl: "Właściciel",
          es: "Propietario",
          fr: "Propriétaire",
          ja: "オーナー",
        }
      },
      {
        key: "ui.organizations.role.business_manager",
        values: {
          en: "Manager",
          de: "Manager",
          pl: "Menedżer",
          es: "Gerente",
          fr: "Gestionnaire",
          ja: "マネージャー",
        }
      },
      {
        key: "ui.organizations.role.employee",
        values: {
          en: "Employee",
          de: "Mitarbeiter",
          pl: "Pracownik",
          es: "Empleado",
          fr: "Employé",
          ja: "従業員",
        }
      },
      {
        key: "ui.organizations.role.viewer",
        values: {
          en: "Viewer",
          de: "Betrachter",
          pl: "Przeglądający",
          es: "Visor",
          fr: "Observateur",
          ja: "閲覧者",
        }
      },

      // === ACTION BUTTONS ===
      {
        key: "ui.organizations.button.manage",
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
        key: "ui.organizations.button.archive",
        values: {
          en: "Archive",
          de: "Archivieren",
          pl: "Archiwizuj",
          es: "Archivar",
          fr: "Archiver",
          ja: "アーカイブ",
        }
      },
      {
        key: "ui.organizations.button.restore",
        values: {
          en: "Restore",
          de: "Wiederherstellen",
          pl: "Przywróć",
          es: "Restaurar",
          fr: "Restaurer",
          ja: "復元",
        }
      },
      {
        key: "ui.organizations.button.delete",
        values: {
          en: "Delete",
          de: "Löschen",
          pl: "Usuń",
          es: "Eliminar",
          fr: "Supprimer",
          ja: "削除",
        }
      },
      {
        key: "ui.organizations.button.no_access",
        values: {
          en: "No access",
          de: "Kein Zugriff",
          pl: "Brak dostępu",
          es: "Sin acceso",
          fr: "Aucun accès",
          ja: "アクセスなし",
        }
      },

      // === ARCHIVE CONFIRMATION MODAL ===
      {
        key: "ui.organizations.archive.title",
        values: {
          en: "Archive Organization",
          de: "Organisation archivieren",
          pl: "Archiwizuj organizację",
          es: "Archivar organización",
          fr: "Archiver l'organisation",
          ja: "組織をアーカイブ",
        }
      },
      {
        key: "ui.organizations.archive.message_current",
        values: {
          en: "You are about to archive your CURRENT organization \"{name}\".\n\nYou will be automatically switched to another active organization.\n\nProceed?",
          de: "Sie sind dabei, Ihre AKTUELLE Organisation \"{name}\" zu archivieren.\n\nSie werden automatisch zu einer anderen aktiven Organisation gewechselt.\n\nFortfahren?",
          pl: "Zamierzasz zarchiwizować swoją BIEŻĄCĄ organizację \"{name}\".\n\nZostaniesz automatycznie przełączony na inną aktywną organizację.\n\nKontynuować?",
          es: "Estás a punto de archivar tu organización ACTUAL \"{name}\".\n\nSerás cambiado automáticamente a otra organización activa.\n\n¿Continuar?",
          fr: "Vous êtes sur le point d'archiver votre organisation ACTUELLE \"{name}\".\n\nVous serez automatiquement basculé vers une autre organisation active.\n\nContinuer?",
          ja: "現在の組織「{name}」をアーカイブしようとしています。\n\n別のアクティブな組織に自動的に切り替わります。\n\n続行しますか？",
        }
      },
      {
        key: "ui.organizations.archive.message_other",
        values: {
          en: "Archive \"{name}\"?\n\nThe organization will be archived but data is preserved. You can permanently delete it later from the archived list.",
          de: "\"{name}\" archivieren?\n\nDie Organisation wird archiviert, aber die Daten bleiben erhalten. Sie können sie später aus der Archivliste dauerhaft löschen.",
          pl: "Zarchiwizować \"{name}\"?\n\nOrganizacja zostanie zarchiwizowana, ale dane zostaną zachowane. Możesz ją później trwale usunąć z listy zarchiwizowanych.",
          es: "¿Archivar \"{name}\"?\n\nLa organización se archivará pero los datos se conservarán. Puedes eliminarla permanentemente más tarde de la lista archivada.",
          fr: "Archiver \"{name}\"?\n\nL'organisation sera archivée mais les données sont préservées. Vous pouvez la supprimer définitivement plus tard de la liste archivée.",
          ja: "「{name}」をアーカイブしますか？\n\n組織はアーカイブされますが、データは保持されます。後でアーカイブリストから完全に削除できます。",
        }
      },
      {
        key: "ui.organizations.archive.confirm_button",
        values: {
          en: "Archive",
          de: "Archivieren",
          pl: "Archiwizuj",
          es: "Archivar",
          fr: "Archiver",
          ja: "アーカイブ",
        }
      },

      // === DELETE CONFIRMATION MODAL ===
      {
        key: "ui.organizations.delete.title",
        values: {
          en: "Delete Organization",
          de: "Organisation löschen",
          pl: "Usuń organizację",
          es: "Eliminar organización",
          fr: "Supprimer l'organisation",
          ja: "組織を削除",
        }
      },
      {
        key: "ui.organizations.delete.message",
        values: {
          en: "Delete \"{name}\"?\n\nThis will permanently remove ALL data from the database. This action CANNOT be undone!",
          de: "\"{name}\" löschen?\n\nDadurch werden ALLE Daten dauerhaft aus der Datenbank entfernt. Diese Aktion kann NICHT rückgängig gemacht werden!",
          pl: "Usunąć \"{name}\"?\n\nSpowoduje to trwałe usunięcie WSZYSTKICH danych z bazy danych. Tej akcji NIE MOŻNA cofnąć!",
          es: "¿Eliminar \"{name}\"?\n\nEsto eliminará permanentemente TODOS los datos de la base de datos. ¡Esta acción NO se puede deshacer!",
          fr: "Supprimer \"{name}\"?\n\nCela supprimera définitivement TOUTES les données de la base de données. Cette action NE PEUT PAS être annulée!",
          ja: "「{name}」を削除しますか？\n\nデータベースからすべてのデータが完全に削除されます。この操作は元に戻せません！",
        }
      },
      {
        key: "ui.organizations.delete.confirm_button",
        values: {
          en: "Delete",
          de: "Löschen",
          pl: "Usuń",
          es: "Eliminar",
          fr: "Supprimer",
          ja: "削除",
        }
      },

      // === RESTORE CONFIRMATION ===
      {
        key: "ui.organizations.restore.confirm_message",
        values: {
          en: "Restore \"{name}\"?\n\nThis will reactivate the organization and all its data.",
          de: "\"{name}\" wiederherstellen?\n\nDadurch wird die Organisation und alle ihre Daten reaktiviert.",
          pl: "Przywrócić \"{name}\"?\n\nSpowoduje to reaktywację organizacji i wszystkich jej danych.",
          es: "¿Restaurar \"{name}\"?\n\nEsto reactivará la organización y todos sus datos.",
          fr: "Restaurer \"{name}\"?\n\nCela réactivera l'organisation et toutes ses données.",
          ja: "「{name}」を復元しますか？\n\n組織とそのすべてのデータが再アクティブ化されます。",
        }
      },

      // === ERROR/ALERT MESSAGES ===
      {
        key: "ui.organizations.alert.last_active",
        values: {
          en: "Cannot archive your last active organization.\n\nTo delete your account, use the 'Delete Account' option in Settings.",
          de: "Ihre letzte aktive Organisation kann nicht archiviert werden.\n\nVerwenden Sie die Option 'Konto löschen' in den Einstellungen, um Ihr Konto zu löschen.",
          pl: "Nie można zarchiwizować ostatniej aktywnej organizacji.\n\nAby usunąć konto, użyj opcji 'Usuń konto' w Ustawieniach.",
          es: "No se puede archivar tu última organización activa.\n\nPara eliminar tu cuenta, usa la opción 'Eliminar cuenta' en Configuración.",
          fr: "Impossible d'archiver votre dernière organisation active.\n\nPour supprimer votre compte, utilisez l'option 'Supprimer le compte' dans les paramètres.",
          ja: "最後のアクティブな組織をアーカイブできません。\n\nアカウントを削除するには、設定の「アカウントを削除」オプションを使用してください。",
        }
      },
      {
        key: "ui.organizations.error.archive_failed",
        values: {
          en: "Failed to archive organization:",
          de: "Organisation konnte nicht archiviert werden:",
          pl: "Nie udało się zarchiwizować organizacji:",
          es: "Error al archivar organización:",
          fr: "Échec de l'archivage de l'organisation:",
          ja: "組織のアーカイブに失敗しました：",
        }
      },
      {
        key: "ui.organizations.error.restore_failed",
        values: {
          en: "Failed to restore organization:",
          de: "Organisation konnte nicht wiederhergestellt werden:",
          pl: "Nie udało się przywrócić organizacji:",
          es: "Error al restaurar organización:",
          fr: "Échec de la restauration de l'organisation:",
          ja: "組織の復元に失敗しました：",
        }
      },
      {
        key: "ui.organizations.error.delete_failed",
        values: {
          en: "Failed to delete organization:",
          de: "Organisation konnte nicht gelöscht werden:",
          pl: "Nie udało się usunąć organizacji:",
          es: "Error al eliminar organización:",
          fr: "Échec de la suppression de l'organisation:",
          ja: "組織の削除に失敗しました：",
        }
      },

      // === COMMON BUTTONS ===
      {
        key: "ui.organizations.button.cancel",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },

      // === CREATE TAB ===
      {
        key: "ui.organizations.create.title",
        values: {
          en: "Create New Organization",
          de: "Neue Organisation erstellen",
          pl: "Utwórz nową organizację",
          es: "Crear nueva organización",
          fr: "Créer une nouvelle organisation",
          ja: "新しい組織を作成",
        }
      },
      {
        key: "ui.organizations.create.subtitle",
        values: {
          en: "Create a new organization for a client or project. Only business name is required.",
          de: "Erstellen Sie eine neue Organisation für einen Kunden oder ein Projekt. Nur der Firmenname ist erforderlich.",
          pl: "Utwórz nową organizację dla klienta lub projektu. Wymagana jest tylko nazwa firmy.",
          es: "Crea una nueva organización para un cliente o proyecto. Solo se requiere el nombre comercial.",
          fr: "Créez une nouvelle organisation pour un client ou un projet. Seul le nom commercial est requis.",
          ja: "クライアントまたはプロジェクトの新しい組織を作成します。ビジネス名のみが必要です。",
        }
      },

      // === FORM LABELS ===
      {
        key: "ui.organizations.form.business_name",
        values: {
          en: "Business Name *",
          de: "Firmenname *",
          pl: "Nazwa firmy *",
          es: "Nombre comercial *",
          fr: "Nom commercial *",
          ja: "ビジネス名 *",
        }
      },
      {
        key: "ui.organizations.form.business_name_hint",
        values: {
          en: "Legal business name. Display name and URL slug will be generated from this.",
          de: "Offizieller Firmenname. Anzeigename und URL-Slug werden daraus generiert.",
          pl: "Oficjalna nazwa firmy. Z tego zostanie wygenerowana nazwa wyświetlana i slug URL.",
          es: "Nombre legal del negocio. El nombre para mostrar y el slug de URL se generarán a partir de esto.",
          fr: "Nom légal de l'entreprise. Le nom d'affichage et le slug d'URL seront générés à partir de ceci.",
          ja: "法的なビジネス名。表示名とURLスラッグがここから生成されます。",
        }
      },
      {
        key: "ui.organizations.form.description",
        values: {
          en: "Description",
          de: "Beschreibung",
          pl: "Opis",
          es: "Descripción",
          fr: "Description",
          ja: "説明",
        }
      },
      {
        key: "ui.organizations.form.industry",
        values: {
          en: "Industry/Type",
          de: "Branche/Typ",
          pl: "Branża/Typ",
          es: "Industria/Tipo",
          fr: "Industrie/Type",
          ja: "業種/タイプ",
        }
      },
      {
        key: "ui.organizations.form.industry_hint",
        values: {
          en: "You can add contact information and other details later in the Manage window.",
          de: "Sie können Kontaktinformationen und andere Details später im Verwaltungsfenster hinzufügen.",
          pl: "Możesz dodać informacje kontaktowe i inne szczegóły później w oknie Zarządzanie.",
          es: "Puedes agregar información de contacto y otros detalles más tarde en la ventana Gestionar.",
          fr: "Vous pouvez ajouter des informations de contact et d'autres détails plus tard dans la fenêtre Gérer.",
          ja: "連絡先情報やその他の詳細は、後で管理ウィンドウで追加できます。",
        }
      },
      {
        key: "ui.organizations.form.add_me_owner",
        values: {
          en: "Add me as organization owner (recommended)",
          de: "Mich als Organisationsinhaber hinzufügen (empfohlen)",
          pl: "Dodaj mnie jako właściciela organizacji (zalecane)",
          es: "Añadirme como propietario de la organización (recomendado)",
          fr: "M'ajouter en tant que propriétaire de l'organisation (recommandé)",
          ja: "組織のオーナーとして追加（推奨）",
        }
      },
      {
        key: "ui.organizations.form.timezone",
        values: {
          en: "Timezone",
          de: "Zeitzone",
          pl: "Strefa czasowa",
          es: "Zona horaria",
          fr: "Fuseau horaire",
          ja: "タイムゾーン",
        }
      },
      {
        key: "ui.organizations.form.timezone_hint",
        values: {
          en: "Set the default timezone for this organization. This will be used for event scheduling and time display.",
          de: "Legen Sie die Standardzeitzone für diese Organisation fest. Diese wird für die Ereignisplanung und Zeitanzeige verwendet.",
          pl: "Ustaw domyślną strefę czasową dla tej organizacji. Będzie używana do planowania wydarzeń i wyświetlania czasu.",
          es: "Establezca la zona horaria predeterminada para esta organización. Se utilizará para la programación de eventos y la visualización de tiempo.",
          fr: "Définissez le fuseau horaire par défaut pour cette organisation. Cela sera utilisé pour la planification des événements et l'affichage de l'heure.",
          ja: "この組織のデフォルトのタイムゾーンを設定します。これはイベントのスケジュールと時刻表示に使用されます。",
        }
      },
      {
        key: "ui.organizations.form.date_format",
        values: {
          en: "Date Format",
          de: "Datumsformat",
          pl: "Format daty",
          es: "Formato de fecha",
          fr: "Format de date",
          ja: "日付形式",
        }
      },
      {
        key: "ui.organizations.form.language",
        values: {
          en: "Language",
          de: "Sprache",
          pl: "Język",
          es: "Idioma",
          fr: "Langue",
          ja: "言語",
        }
      },

      // === FORM PLACEHOLDERS ===
      {
        key: "ui.organizations.placeholder.business_name",
        values: {
          en: "Acme Corporation",
          de: "Musterfirma GmbH",
          pl: "Firma Przykładowa",
          es: "Corporación Ejemplo",
          fr: "Société Exemple",
          ja: "サンプル株式会社",
        }
      },
      {
        key: "ui.organizations.placeholder.description",
        values: {
          en: "Brief description of the organization...",
          de: "Kurze Beschreibung der Organisation...",
          pl: "Krótki opis organizacji...",
          es: "Breve descripción de la organización...",
          fr: "Brève description de l'organisation...",
          ja: "組織の簡単な説明...",
        }
      },
      {
        key: "ui.organizations.placeholder.industry",
        values: {
          en: "Technology, Healthcare, etc.",
          de: "Technologie, Gesundheitswesen usw.",
          pl: "Technologia, Opieka zdrowotna itp.",
          es: "Tecnología, Salud, etc.",
          fr: "Technologie, Santé, etc.",
          ja: "テクノロジ���、医療など",
        }
      },

      // === FORM BUTTONS & STATES ===
      {
        key: "ui.organizations.button.create",
        values: {
          en: "Create Organization",
          de: "Organisation erstellen",
          pl: "Utwórz organizację",
          es: "Crear organización",
          fr: "Créer l'organisation",
          ja: "組織を作成",
        }
      },
      {
        key: "ui.organizations.button.creating",
        values: {
          en: "Creating...",
          de: "Wird erstellt...",
          pl: "Tworzenie...",
          es: "Creando...",
          fr: "Création en cours...",
          ja: "作成中...",
        }
      },

      // === SUCCESS/ERROR MESSAGES ===
      {
        key: "ui.organizations.success.title",
        values: {
          en: "Success!",
          de: "Erfolg!",
          pl: "Sukces!",
          es: "¡Éxito!",
          fr: "Succès!",
          ja: "成功！",
        }
      },
      {
        key: "ui.organizations.error.title",
        values: {
          en: "Error",
          de: "Fehler",
          pl: "Błąd",
          es: "Error",
          fr: "Erreur",
          ja: "エラー",
        }
      },
      {
        key: "ui.organizations.error.business_name_required",
        values: {
          en: "Business name is required",
          de: "Firmenname ist erforderlich",
          pl: "Nazwa firmy jest wymagana",
          es: "Se requiere el nombre comercial",
          fr: "Le nom commercial est requis",
          ja: "ビジネス名は必須です",
        }
      },
      {
        key: "ui.organizations.error.not_authenticated",
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
        key: "ui.organizations.error.create_failed",
        values: {
          en: "Failed to create organization",
          de: "Organisation konnte nicht erstellt werden",
          pl: "Nie udało się utworzyć organizacji",
          es: "Error al crear organización",
          fr: "Échec de la création de l'organisation",
          ja: "組織の作成に失敗しました",
        }
      },
    ];

    // Load ALL existing translations once (optimized!)
    const existingTranslations = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", systemOrg._id)
         .eq("type", "translation")
      )
      .collect();

    // Create lookup set for fast duplicate checking
    const existingKeys = new Set(
      existingTranslations.map(t => `${t.name}:${t.locale}`)
    );

    // Seed translations
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const lookupKey = `${trans.key}:${locale.code}`;

          // Check if translation already exists using our Set
          if (!existingKeys.has(lookupKey)) {
            await ctx.db.insert("objects", {
              organizationId: systemOrg._id,
              type: "translation",
              subtype: "ui",
              name: trans.key,
              value: value,
              locale: locale.code,
              status: "approved",
              customProperties: {
                category: "organizations",
                component: "organizations-window",
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

    console.log(`✅ Seeded ${count} Organizations window translations`);
    return { success: true, count };
  }
});
