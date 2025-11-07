/**
 * SEED FORMS WINDOW TRANSLATIONS
 *
 * UI translations for the Forms window including:
 * - Window header and navigation
 * - Form list view
 * - Form builder
 * - Form status labels
 * - Action buttons
 * - Modal messages
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Forms Window translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

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
      // Window Header
      {
        key: "ui.forms.title",
        values: {
          en: "Forms",
          de: "Formulare",
          pl: "Formularze",
          es: "Formularios",
          fr: "Formulaires",
          ja: "フォーム",
        }
      },
      {
        key: "ui.forms.subtitle",
        values: {
          en: "Create forms for registrations, surveys, and applications",
          de: "Erstellen Sie Formulare für Registrierungen, Umfragen und Bewerbungen",
          pl: "Twórz formularze do rejestracji, ankiet i aplikacji",
          es: "Crear formularios para registros, encuestas y solicitudes",
          fr: "Créer des formulaires pour les inscriptions, sondages et candidatures",
          ja: "登録、アンケート、申請用のフォームを作成",
        }
      },

      // Navigation Buttons
      {
        key: "ui.forms.button_new_form",
        values: {
          en: "New Form",
          de: "Neues Formular",
          pl: "Nowy formularz",
          es: "Nuevo formulario",
          fr: "Nouveau formulaire",
          ja: "新しいフォーム",
        }
      },
      {
        key: "ui.forms.tab_all_forms",
        values: {
          en: "All Forms",
          de: "Alle Formulare",
          pl: "Wszystkie formularze",
          es: "Todos los formularios",
          fr: "Tous les formulaires",
          ja: "すべてのフォーム",
        }
      },
      {
        key: "ui.forms.tab_all_responses",
        values: {
          en: "All Responses",
          de: "Alle Antworten",
          pl: "Wszystkie odpowiedzi",
          es: "Todas las respuestas",
          fr: "Toutes les réponses",
          ja: "すべての回答",
        }
      },

      // Forms List - Empty State
      {
        key: "ui.forms.empty_title",
        values: {
          en: "No Forms Yet",
          de: "Noch keine Formulare",
          pl: "Brak formularzy",
          es: "Aún no hay formularios",
          fr: "Aucun formulaire pour le moment",
          ja: "まだフォームがありません",
        }
      },
      {
        key: "ui.forms.empty_description",
        values: {
          en: "Create your first form to collect registrations, surveys, or applications.",
          de: "Erstellen Sie Ihr erstes Formular, um Registrierungen, Umfragen oder Bewerbungen zu sammeln.",
          pl: "Utwórz swój pierwszy formularz do zbierania rejestracji, ankiet lub aplikacji.",
          es: "Cree su primer formulario para recopilar registros, encuestas o solicitudes.",
          fr: "Créez votre premier formulaire pour collecter des inscriptions, sondages ou candidatures.",
          ja: "登録、アンケート、申請を収集するための最初のフォームを作成します。",
        }
      },
      {
        key: "ui.forms.button_create_first",
        values: {
          en: "Create Your First Form",
          de: "Erstellen Sie Ihr erstes Formular",
          pl: "Utwórz swój pierwszy formularz",
          es: "Crear su primer formulario",
          fr: "Créer votre premier formulaire",
          ja: "最初のフォームを作成",
        }
      },

      // Form Types
      {
        key: "ui.forms.type_registration",
        values: {
          en: "registration",
          de: "Registrierung",
          pl: "rejestracja",
          es: "registro",
          fr: "inscription",
          ja: "登録",
        }
      },
      {
        key: "ui.forms.type_survey",
        values: {
          en: "survey",
          de: "Umfrage",
          pl: "ankieta",
          es: "encuesta",
          fr: "sondage",
          ja: "アンケート",
        }
      },
      {
        key: "ui.forms.type_application",
        values: {
          en: "application",
          de: "Bewerbung",
          pl: "aplikacja",
          es: "solicitud",
          fr: "candidature",
          ja: "申請",
        }
      },
      {
        key: "ui.forms.type_form",
        values: {
          en: "form",
          de: "Formular",
          pl: "formularz",
          es: "formulario",
          fr: "formulaire",
          ja: "フォーム",
        }
      },

      // Status Badges
      {
        key: "ui.forms.status_draft",
        values: {
          en: "Draft",
          de: "Entwurf",
          pl: "Szkic",
          es: "Borrador",
          fr: "Brouillon",
          ja: "下書き",
        }
      },
      {
        key: "ui.forms.status_published",
        values: {
          en: "Published",
          de: "Veröffentlicht",
          pl: "Opublikowany",
          es: "Publicado",
          fr: "Publié",
          ja: "公開済み",
        }
      },
      {
        key: "ui.forms.status_archived",
        values: {
          en: "Archived",
          de: "Archiviert",
          pl: "Zarchiwizowany",
          es: "Archivado",
          fr: "Archivé",
          ja: "アーカイブ済み",
        }
      },

      // Form Stats
      {
        key: "ui.forms.stats_fields",
        values: {
          en: "fields",
          de: "Felder",
          pl: "pola",
          es: "campos",
          fr: "champs",
          ja: "フィールド",
        }
      },
      {
        key: "ui.forms.stats_responses",
        values: {
          en: "responses",
          de: "Antworten",
          pl: "odpowiedzi",
          es: "respuestas",
          fr: "réponses",
          ja: "回答",
        }
      },

      // Action Buttons
      {
        key: "ui.forms.button_edit",
        values: {
          en: "Edit",
          de: "Bearbeiten",
          pl: "Edytuj",
          es: "Editar",
          fr: "Modifier",
          ja: "編集",
        }
      },
      {
        key: "ui.forms.button_preview",
        values: {
          en: "Preview",
          de: "Vorschau",
          pl: "Podgląd",
          es: "Vista previa",
          fr: "Aperçu",
          ja: "プレビュー",
        }
      },
      {
        key: "ui.forms.button_delete",
        values: {
          en: "Delete",
          de: "Löschen",
          pl: "Usuń",
          es: "Eliminar",
          fr: "Supprimer",
          ja: "削除",
        }
      },

      // Form Builder
      {
        key: "ui.forms.builder_title_create",
        values: {
          en: "Create New Form",
          de: "Neues Formular erstellen",
          pl: "Utwórz nowy formularz",
          es: "Crear nuevo formulario",
          fr: "Créer un nouveau formulaire",
          ja: "新しいフォームを作成",
        }
      },
      {
        key: "ui.forms.builder_title_edit",
        values: {
          en: "Edit Form",
          de: "Formular bearbeiten",
          pl: "Edytuj formularz",
          es: "Editar formulario",
          fr: "Modifier le formulaire",
          ja: "フォームを編集",
        }
      },
      {
        key: "ui.forms.button_back_to_forms",
        values: {
          en: "Back to Forms",
          de: "Zurück zu Formularen",
          pl: "Powrót do formularzy",
          es: "Volver a formularios",
          fr: "Retour aux formulaires",
          ja: "フォームに戻る",
        }
      },

      // Builder Sections
      {
        key: "ui.forms.section_select_template",
        values: {
          en: "Select Form Template",
          de: "Formularvorlage auswählen",
          pl: "Wybierz szablon formularza",
          es: "Seleccionar plantilla de formulario",
          fr: "Sélectionner un modèle de formulaire",
          ja: "フォームテンプレートを選択",
        }
      },
      {
        key: "ui.forms.section_select_theme",
        values: {
          en: "Select Theme",
          de: "Design auswählen",
          pl: "Wybierz motyw",
          es: "Seleccionar tema",
          fr: "Sélectionner un thème",
          ja: "テーマを選択",
        }
      },
      {
        key: "ui.forms.section_link_event",
        values: {
          en: "Link to Event (Optional)",
          de: "Mit Event verknüpfen (Optional)",
          pl: "Połącz z wydarzeniem (opcjonalnie)",
          es: "Vincular a evento (opcional)",
          fr: "Lier à un événement (optionnel)",
          ja: "イベントにリンク（オプション）",
        }
      },
      {
        key: "ui.forms.link_event_description",
        values: {
          en: "Link this form to an event to automatically connect form responses with event tickets.",
          de: "Verknüpfen Sie dieses Formular mit einem Event, um Formularantworten automatisch mit Event-Tickets zu verbinden.",
          pl: "Połącz ten formularz z wydarzeniem, aby automatycznie powiązać odpowiedzi formularza z biletami na wydarzenie.",
          es: "Vincule este formulario a un evento para conectar automáticamente las respuestas del formulario con los boletos del evento.",
          fr: "Liez ce formulaire à un événement pour connecter automatiquement les réponses du formulaire aux billets d'événement.",
          ja: "このフォームをイベントにリンクして、フォームの回答をイベントチケットと自動的に接続します。",
        }
      },
      {
        key: "ui.forms.no_event",
        values: {
          en: "No Event",
          de: "Kein Event",
          pl: "Brak wydarzenia",
          es: "Sin evento",
          fr: "Pas d'événement",
          ja: "イベントなし",
        }
      },
      {
        key: "ui.forms.no_event_description",
        values: {
          en: "Form is not linked to any event",
          de: "Formular ist mit keinem Event verknüpft",
          pl: "Formularz nie jest połączony z żadnym wydarzeniem",
          es: "El formulario no está vinculado a ningún evento",
          fr: "Le formulaire n'est lié à aucun événement",
          ja: "フォームはどのイベントともリンクされていません",
        }
      },

      // Form Fields
      {
        key: "ui.forms.label_form_type",
        values: {
          en: "Form Type",
          de: "Formulartyp",
          pl: "Typ formularza",
          es: "Tipo de formulario",
          fr: "Type de formulaire",
          ja: "フォームタイプ",
        }
      },
      {
        key: "ui.forms.label_form_name",
        values: {
          en: "Form Name",
          de: "Formularname",
          pl: "Nazwa formularza",
          es: "Nombre del formulario",
          fr: "Nom du formulaire",
          ja: "フォーム名",
        }
      },
      {
        key: "ui.forms.label_description",
        values: {
          en: "Description (Optional)",
          de: "Beschreibung (Optional)",
          pl: "Opis (opcjonalnie)",
          es: "Descripción (opcional)",
          fr: "Description (optionnel)",
          ja: "説明（オプション）",
        }
      },
      {
        key: "ui.forms.placeholder_form_name",
        values: {
          en: "e.g., HaffSymposium 2024 Registration",
          de: "z.B. HaffSymposium 2024 Anmeldung",
          pl: "np. Rejestracja HaffSymposium 2024",
          es: "p.ej., Registro HaffSymposium 2024",
          fr: "par ex., Inscription HaffSymposium 2024",
          ja: "例：HaffSymposium 2024登録",
        }
      },
      {
        key: "ui.forms.placeholder_description",
        values: {
          en: "Describe what this form is for...",
          de: "Beschreiben Sie, wofür dieses Formular ist...",
          pl: "Opisz, do czego służy ten formularz...",
          es: "Describa para qué es este formulario...",
          fr: "Décrivez à quoi sert ce formulaire...",
          ja: "このフォームの目的を説明してください...",
        }
      },

      // Form Type Options
      {
        key: "ui.forms.type_option_registration",
        values: {
          en: "Registration - Event sign-ups",
          de: "Registrierung - Event-Anmeldungen",
          pl: "Rejestracja - Zapisy na wydarzenia",
          es: "Registro - Inscripciones a eventos",
          fr: "Inscription - Inscriptions aux événements",
          ja: "登録 - イベント申込み",
        }
      },
      {
        key: "ui.forms.type_option_survey",
        values: {
          en: "Survey - Feedback collection",
          de: "Umfrage - Feedback-Sammlung",
          pl: "Ankieta - Zbieranie opinii",
          es: "Encuesta - Recopilación de comentarios",
          fr: "Sondage - Collecte de commentaires",
          ja: "アンケート - フィードバック収集",
        }
      },
      {
        key: "ui.forms.type_option_application",
        values: {
          en: "Application - Speaker proposals",
          de: "Bewerbung - Vorschläge für Referenten",
          pl: "Aplikacja - Propozycje prelegentów",
          es: "Solicitud - Propuestas de ponentes",
          fr: "Candidature - Propositions de conférenciers",
          ja: "申請 - スピーカー提案",
        }
      },

      // Live Preview
      {
        key: "ui.forms.live_preview",
        values: {
          en: "Live Preview",
          de: "Live-Vorschau",
          pl: "Podgląd na żywo",
          es: "Vista previa en vivo",
          fr: "Aperçu en direct",
          ja: "ライブプレビュー",
        }
      },
      {
        key: "ui.forms.preview_select_prompt",
        values: {
          en: "Select Template & Theme",
          de: "Vorlage & Design auswählen",
          pl: "Wybierz szablon i motyw",
          es: "Seleccionar plantilla y tema",
          fr: "Sélectionner modèle et thème",
          ja: "テンプレートとテーマを選択",
        }
      },
      {
        key: "ui.forms.preview_select_description",
        values: {
          en: "Choose a form template and theme from the left panel to see a live preview here.",
          de: "Wählen Sie eine Formularvorlage und ein Design aus dem linken Bereich, um hier eine Live-Vorschau zu sehen.",
          pl: "Wybierz szablon formularza i motyw z lewego panelu, aby zobaczyć podgląd na żywo tutaj.",
          es: "Elija una plantilla de formulario y un tema del panel izquierdo para ver una vista previa en vivo aquí.",
          fr: "Choisissez un modèle de formulaire et un thème dans le panneau de gauche pour voir un aperçu en direct ici.",
          ja: "左側のパネルからフォームテンプレートとテーマを選択して、ここでライブプレビューを表示します。",
        }
      },

      // Submit Section
      {
        key: "ui.forms.submit_note",
        values: {
          en: "Form will be created as a",
          de: "Formular wird erstellt als",
          pl: "Formularz zostanie utworzony jako",
          es: "El formulario se creará como",
          fr: "Le formulaire sera créé en tant que",
          ja: "フォームは次のように作成されます：",
        }
      },
      {
        key: "ui.forms.button_create_form",
        values: {
          en: "Create Form",
          de: "Formular erstellen",
          pl: "Utwórz formularz",
          es: "Crear formulario",
          fr: "Créer le formulaire",
          ja: "フォームを作成",
        }
      },
      {
        key: "ui.forms.button_update_form",
        values: {
          en: "Update Form",
          de: "Formular aktualisieren",
          pl: "Zaktualizuj formularz",
          es: "Actualizar formulario",
          fr: "Mettre à jour le formulaire",
          ja: "フォームを更新",
        }
      },
      {
        key: "ui.forms.button_creating",
        values: {
          en: "Creating...",
          de: "Wird erstellt...",
          pl: "Tworzenie...",
          es: "Creando...",
          fr: "Création...",
          ja: "作成中...",
        }
      },
      {
        key: "ui.forms.button_updating",
        values: {
          en: "Updating...",
          de: "Wird aktualisiert...",
          pl: "Aktualizowanie...",
          es: "Actualizando...",
          fr: "Mise à jour...",
          ja: "更新中...",
        }
      },

      // Messages & Alerts
      {
        key: "ui.forms.auth_required_title",
        values: {
          en: "Authentication Required",
          de: "Authentifizierung erforderlich",
          pl: "Wymagana autoryzacja",
          es: "Autenticación requerida",
          fr: "Authentification requise",
          ja: "認証が必要です",
        }
      },
      {
        key: "ui.forms.auth_required_message",
        values: {
          en: "Please log in to create forms.",
          de: "Bitte melden Sie sich an, um Formulare zu erstellen.",
          pl: "Zaloguj się, aby tworzyć formularze.",
          es: "Inicie sesión para crear formularios.",
          fr: "Veuillez vous connecter pour créer des formulaires.",
          ja: "フォームを作成するにはログインしてください。",
        }
      },
      {
        key: "ui.forms.templates_unavailable_title",
        values: {
          en: "Templates or Themes Not Available",
          de: "Vorlagen oder Designs nicht verfügbar",
          pl: "Szablony lub motywy niedostępne",
          es: "Plantillas o temas no disponibles",
          fr: "Modèles ou thèmes non disponibles",
          ja: "テンプレートまたはテーマが利用できません",
        }
      },
      {
        key: "ui.forms.no_templates_message",
        values: {
          en: "Your organization does not have any form templates enabled yet.",
          de: "Ihre Organisation hat noch keine Formularvorlagen aktiviert.",
          pl: "Twoja organizacja nie ma jeszcze włączonych szablonów formularzy.",
          es: "Su organización aún no tiene plantillas de formularios habilitadas.",
          fr: "Votre organisation n'a pas encore de modèles de formulaires activés.",
          ja: "あなたの組織にはまだフォームテンプレートが有効になっていません。",
        }
      },
      {
        key: "ui.forms.no_themes_message",
        values: {
          en: "No themes found in system.",
          de: "Keine Designs im System gefunden.",
          pl: "Nie znaleziono motywów w systemie.",
          es: "No se encontraron temas en el sistema.",
          fr: "Aucun thème trouvé dans le système.",
          ja: "システムにテーマが見つかりません。",
        }
      },
      {
        key: "ui.forms.contact_admin",
        values: {
          en: "Contact your system administrator to enable templates.",
          de: "Wenden Sie sich an Ihren Systemadministrator, um Vorlagen zu aktivieren.",
          pl: "Skontaktuj się z administratorem systemu, aby włączyć szablony.",
          es: "Póngase en contacto con su administrador del sistema para habilitar plantillas.",
          fr: "Contactez votre administrateur système pour activer les modèles.",
          ja: "テンプレートを有効にするには、システム管理者に連絡してください。",
        }
      },

      // Success Messages
      {
        key: "ui.forms.success_title",
        values: {
          en: "Success!",
          de: "Erfolg!",
          pl: "Sukces!",
          es: "¡Éxito!",
          fr: "Succès !",
          ja: "成功！",
        }
      },
      {
        key: "ui.forms.form_created",
        values: {
          en: "Form created successfully!",
          de: "Formular erfolgreich erstellt!",
          pl: "Formularz utworzony pomyślnie!",
          es: "¡Formulario creado con éxito!",
          fr: "Formulaire créé avec succès !",
          ja: "フォームが正常に作成されました！",
        }
      },
      {
        key: "ui.forms.form_updated",
        values: {
          en: "Form updated successfully!",
          de: "Formular erfolgreich aktualisiert!",
          pl: "Formularz zaktualizowany pomyślnie!",
          es: "¡Formulario actualizado con éxito!",
          fr: "Formulaire mis à jour avec succès !",
          ja: "フォームが正常に更新されました！",
        }
      },

      // Edit Mode Alert
      {
        key: "ui.forms.editing_mode_title",
        values: {
          en: "Editing Mode",
          de: "Bearbeitungsmodus",
          pl: "Tryb edycji",
          es: "Modo de edición",
          fr: "Mode édition",
          ja: "編集モード",
        }
      },
      {
        key: "ui.forms.editing_mode_message",
        values: {
          en: "You are editing an existing form. Changes will update the form immediately.",
          de: "Sie bearbeiten ein bestehendes Formular. Änderungen werden das Formular sofort aktualisieren.",
          pl: "Edytujesz istniejący formularz. Zmiany zaktualizują formularz natychmiast.",
          es: "Está editando un formulario existente. Los cambios actualizarán el formulario inmediatamente.",
          fr: "Vous modifiez un formulaire existant. Les modifications mettront à jour le formulaire immédiatement.",
          ja: "既存のフォームを編集しています。変更はすぐにフォームを更新します。",
        }
      },

      // Delete Confirmation
      {
        key: "ui.forms.delete_modal_title",
        values: {
          en: "Delete Form",
          de: "Formular löschen",
          pl: "Usuń formularz",
          es: "Eliminar formulario",
          fr: "Supprimer le formulaire",
          ja: "フォームを削除",
        }
      },
      {
        key: "ui.forms.delete_confirm_message",
        values: {
          en: "Are you sure you want to delete",
          de: "Sind Sie sicher, dass Sie löschen möchten",
          pl: "Czy na pewno chcesz usunąć",
          es: "¿Está seguro de que desea eliminar",
          fr: "Êtes-vous sûr de vouloir supprimer",
          ja: "削除してもよろしいですか",
        }
      },
      {
        key: "ui.forms.delete_warning",
        values: {
          en: "This action cannot be undone. All responses will be preserved but the form template will be deleted.",
          de: "Diese Aktion kann nicht rückgängig gemacht werden. Alle Antworten bleiben erhalten, aber die Formularvorlage wird gelöscht.",
          pl: "Ta akcja nie może być cofnięta. Wszystkie odpowiedzi zostaną zachowane, ale szablon formularza zostanie usunięty.",
          es: "Esta acción no se puede deshacer. Todas las respuestas se conservarán pero la plantilla del formulario se eliminará.",
          fr: "Cette action ne peut pas être annulée. Toutes les réponses seront conservées mais le modèle de formulaire sera supprimé.",
          ja: "この操作は元に戻せません。すべての回答は保持されますが、フォームテンプレートは削除されます。",
        }
      },
      {
        key: "ui.forms.button_confirm_delete",
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
        key: "ui.forms.button_cancel",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },

      // Error Messages
      {
        key: "ui.forms.error_title",
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
        key: "ui.forms.no_events_message",
        values: {
          en: "No events found. Create an event first to link it to this form.",
          de: "Keine Events gefunden. Erstellen Sie zuerst ein Event, um es mit diesem Formular zu verknüpfen.",
          pl: "Nie znaleziono wydarzeń. Najpierw utwórz wydarzenie, aby połączyć je z tym formularzem.",
          es: "No se encontraron eventos. Cree un evento primero para vincularlo a este formulario.",
          fr: "Aucun événement trouvé. Créez d'abord un événement pour le lier à ce formulaire.",
          ja: "イベントが見つかりません。このフォームにリンクするには、まずイベントを作成してください。",
        }
      },

      // Tooltips
      {
        key: "ui.forms.tooltip_edit",
        values: {
          en: "Edit form",
          de: "Formular bearbeiten",
          pl: "Edytuj formularz",
          es: "Editar formulario",
          fr: "Modifier le formulaire",
          ja: "フォームを編集",
        }
      },
      {
        key: "ui.forms.tooltip_publish",
        values: {
          en: "Publish form (make it live)",
          de: "Formular veröffentlichen (live schalten)",
          pl: "Opublikuj formularz (ustaw jako aktywny)",
          es: "Publicar formulario (hacerlo activo)",
          fr: "Publier le formulaire (le rendre actif)",
          ja: "フォームを公開（ライブにする）",
        }
      },
      {
        key: "ui.forms.tooltip_unpublish",
        values: {
          en: "Unpublish form (change to draft)",
          de: "Formular zurückziehen (zu Entwurf ändern)",
          pl: "Cofnij publikację formularza (zmień na szkic)",
          es: "Despublicar formulario (cambiar a borrador)",
          fr: "Dépublier le formulaire (changer en brouillon)",
          ja: "フォームの公開を取り消す（下書きに変更）",
        }
      },
      {
        key: "ui.forms.tooltip_preview_soon",
        values: {
          en: "Preview coming soon",
          de: "Vorschau demnächst verfügbar",
          pl: "Podgląd wkrótce",
          es: "Vista previa próximamente",
          fr: "Aperçu bientôt disponible",
          ja: "プレビューは近日公開",
        }
      },
      {
        key: "ui.forms.tooltip_delete",
        values: {
          en: "Delete form",
          de: "Formular löschen",
          pl: "Usuń formularz",
          es: "Eliminar formulario",
          fr: "Supprimer le formulaire",
          ja: "フォームを削除",
        }
      },

      // Character Counter
      {
        key: "ui.forms.characters",
        values: {
          en: "characters",
          de: "Zeichen",
          pl: "znaków",
          es: "caracteres",
          fr: "caractères",
          ja: "文字",
        }
      },

      // Auth Placeholder
      {
        key: "ui.forms.sign_in_prompt",
        values: {
          en: "Please sign in to access Forms",
          de: "Bitte melden Sie sich an, um auf Formulare zuzugreifen",
          pl: "Zaloguj się, aby uzyskać dostęp do formularzy",
          es: "Inicie sesión para acceder a los formularios",
          fr: "Veuillez vous connecter pour accéder aux formulaires",
          ja: "フォームにアクセスするにはサインインしてください",
        }
      },

      // Template Info Labels
      {
        key: "ui.forms.label_template",
        values: {
          en: "Template:",
          de: "Vorlage:",
          pl: "Szablon:",
          es: "Plantilla:",
          fr: "Modèle :",
          ja: "テンプレート：",
        }
      },
      {
        key: "ui.forms.label_theme",
        values: {
          en: "Theme:",
          de: "Design:",
          pl: "Motyw:",
          es: "Tema:",
          fr: "Thème :",
          ja: "テーマ：",
        }
      },
      {
        key: "ui.forms.label_colors",
        values: {
          en: "Colors:",
          de: "Farben:",
          pl: "Kolory:",
          es: "Colores:",
          fr: "Couleurs :",
          ja: "カラー：",
        }
      },

      // Color Palette Titles
      {
        key: "ui.forms.color_primary_gradient",
        values: {
          en: "Primary Gradient",
          de: "Primärer Verlauf",
          pl: "Gradient podstawowy",
          es: "Degradado principal",
          fr: "Dégradé principal",
          ja: "プライマリグラデーション",
        }
      },
      {
        key: "ui.forms.color_background",
        values: {
          en: "Background",
          de: "Hintergrund",
          pl: "Tło",
          es: "Fondo",
          fr: "Arrière-plan",
          ja: "背景",
        }
      },
      {
        key: "ui.forms.color_text",
        values: {
          en: "Text",
          de: "Text",
          pl: "Tekst",
          es: "Texto",
          fr: "Texte",
          ja: "テキスト",
        }
      },
      {
        key: "ui.forms.color_secondary",
        values: {
          en: "Secondary",
          de: "Sekundär",
          pl: "Drugorzędny",
          es: "Secundario",
          fr: "Secondaire",
          ja: "セカンダリ",
        }
      },

      // Required Field Indicator
      {
        key: "ui.forms.required_indicator",
        values: {
          en: "*",
          de: "*",
          pl: "*",
          es: "*",
          fr: "*",
          ja: "*",
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
            "forms",
            "forms-window"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Forms Window translations`);
    return { success: true, count };
  }
});
