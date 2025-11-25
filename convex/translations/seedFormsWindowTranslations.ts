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

      // Main Tabs
      {
        key: "ui.forms.tabs.create",
        values: {
          en: "Create",
          de: "Erstellen",
          pl: "Utwórz",
          es: "Crear",
          fr: "Créer",
          ja: "作成",
        }
      },
      {
        key: "ui.forms.tabs.all_forms",
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
        key: "ui.forms.tabs.responses",
        values: {
          en: "Responses",
          de: "Antworten",
          pl: "Odpowiedzi",
          es: "Respuestas",
          fr: "Réponses",
          ja: "回答",
        }
      },
      {
        key: "ui.forms.tabs.templates",
        values: {
          en: "Templates",
          de: "Vorlagen",
          pl: "Szablony",
          es: "Plantillas",
          fr: "Modèles",
          ja: "テンプレート",
        }
      },
      {
        key: "ui.forms.tabs.responses_coming_soon",
        values: {
          en: "Responses tab coming soon - View and analyze form submissions",
          de: "Antworten-Tab kommt bald - Formularantworten anzeigen und analysieren",
          pl: "Zakładka odpowiedzi wkrótce - Przeglądaj i analizuj odpowiedzi formularzy",
          es: "Pestaña de respuestas próximamente - Ver y analizar envíos de formularios",
          fr: "Onglet Réponses bientôt disponible - Voir et analyser les soumissions de formulaires",
          ja: "回答タブは近日公開 - フォーム送信の表示と分析",
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

      // Sub-tabs
      {
        key: "ui.forms.subtabs.drafts",
        values: {
          en: "Drafts",
          de: "Entwürfe",
          pl: "Szkice",
          es: "Borradores",
          fr: "Brouillons",
          ja: "下書き",
        }
      },
      {
        key: "ui.forms.subtabs.published",
        values: {
          en: "Published",
          de: "Veröffentlicht",
          pl: "Opublikowane",
          es: "Publicados",
          fr: "Publiés",
          ja: "公開済み",
        }
      },

      // Forms List - Empty State (General)
      {
        key: "ui.forms.empty_drafts_title",
        values: {
          en: "No Draft Forms",
          de: "Keine Entwürfe",
          pl: "Brak szkiców",
          es: "No hay borradores",
          fr: "Aucun brouillon",
          ja: "下書きなし",
        }
      },
      {
        key: "ui.forms.empty_drafts_description",
        values: {
          en: "Draft forms you're working on will appear here. Create a new form to get started.",
          de: "Formularentwürfe, an denen Sie arbeiten, werden hier angezeigt. Erstellen Sie ein neues Formular, um zu beginnen.",
          pl: "Szkice formularzy, nad którymi pracujesz, pojawią się tutaj. Utwórz nowy formularz, aby rozpocząć.",
          es: "Los borradores de formularios en los que estás trabajando aparecerán aquí. Crea un nuevo formulario para comenzar.",
          fr: "Les brouillons de formulaires sur lesquels vous travaillez apparaîtront ici. Créez un nouveau formulaire pour commencer.",
          ja: "作業中のフォームの下書きがここに表示されます。新しいフォームを作成して開始してください。",
        }
      },
      {
        key: "ui.forms.empty_published_title",
        values: {
          en: "No Published Forms",
          de: "Keine veröffentlichten Formulare",
          pl: "Brak opublikowanych formularzy",
          es: "No hay formularios publicados",
          fr: "Aucun formulaire publié",
          ja: "公開済みフォームなし",
        }
      },
      {
        key: "ui.forms.empty_published_description",
        values: {
          en: "Forms that are live and accepting responses will appear here. Publish a draft form to see it here.",
          de: "Live-Formulare, die Antworten akzeptieren, werden hier angezeigt. Veröffentlichen Sie einen Entwurf, um ihn hier zu sehen.",
          pl: "Formularze aktywne i przyjmujące odpowiedzi pojawią się tutaj. Opublikuj szkic formularza, aby go tu zobaczyć.",
          es: "Los formularios activos que aceptan respuestas aparecerán aquí. Publica un borrador para verlo aquí.",
          fr: "Les formulaires actifs acceptant des réponses apparaîtront ici. Publiez un brouillon pour le voir ici.",
          ja: "公開中で回答を受け付けているフォームがここに表示されます。下書きを公開してここに表示させてください。",
        }
      },

      // Forms List - Empty State (Legacy)
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
      {
        key: "ui.forms.type_label",
        values: {
          en: "Type:",
          de: "Typ:",
          pl: "Typ:",
          es: "Tipo:",
          fr: "Type:",
          ja: "タイプ:",
        }
      },

      // List View Headers
      {
        key: "ui.forms.your_forms",
        values: {
          en: "Your Forms",
          de: "Ihre Formulare",
          pl: "Twoje formularze",
          es: "Sus formularios",
          fr: "Vos formulaires",
          ja: "あなたのフォーム",
        }
      },
      {
        key: "ui.forms.count",
        values: {
          en: "form",
          de: "Formular",
          pl: "formularz",
          es: "formulario",
          fr: "formulaire",
          ja: "フォーム",
        }
      },
      {
        key: "ui.forms.count_plural",
        values: {
          en: "forms",
          de: "Formulare",
          pl: "formularze",
          es: "formularios",
          fr: "formulaires",
          ja: "フォーム",
        }
      },
      {
        key: "ui.forms.total",
        values: {
          en: "total",
          de: "gesamt",
          pl: "łącznie",
          es: "total",
          fr: "total",
          ja: "合計",
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

      // Hosting Mode
      {
        key: "ui.forms.hosting_mode_title",
        values: {
          en: "Hosting Mode",
          de: "Hosting-Modus",
          pl: "Tryb hostingu",
          es: "Modo de alojamiento",
          fr: "Mode d'hébergement",
          ja: "ホスティングモード",
        }
      },
      {
        key: "ui.forms.internal_hosting_label",
        values: {
          en: "Internal Hosting (hosted on this platform)",
          de: "Internes Hosting (gehostet auf dieser Plattform)",
          pl: "Hosting wewnętrzny (hostowany na tej platformie)",
          es: "Alojamiento interno (alojado en esta plataforma)",
          fr: "Hébergement interne (hébergé sur cette plateforme)",
          ja: "内部ホスティング（このプラットフォームでホスト）",
        }
      },
      {
        key: "ui.forms.internal_hosting_description",
        values: {
          en: "Check this if the form will be hosted on your main application. You'll need to select both a template and a theme.",
          de: "Aktivieren Sie dies, wenn das Formular auf Ihrer Hauptanwendung gehostet wird. Sie müssen sowohl eine Vorlage als auch ein Thema auswählen.",
          pl: "Zaznacz to, jeśli formularz będzie hostowany w Twojej głównej aplikacji. Musisz wybrać zarówno szablon, jak i motyw.",
          es: "Marca esto si el formulario estará alojado en tu aplicación principal. Necesitarás seleccionar tanto una plantilla como un tema.",
          fr: "Cochez ceci si le formulaire sera hébergé sur votre application principale. Vous devrez sélectionner à la fois un modèle et un thème.",
          ja: "フォームがメインアプリケーションでホストされる場合、これをチェックしてください。テンプレートとテーマの両方を選択する必要があります。",
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

      // External Hosting
      {
        key: "ui.forms.external_hosting_label",
        values: {
          en: "External Hosting (hosted on your own domain)",
          de: "Externes Hosting (auf Ihrer eigenen Domain gehostet)",
          pl: "Hosting zewnętrzny (hostowany na Twojej domenie)",
          es: "Alojamiento externo (alojado en tu propio dominio)",
          fr: "Hébergement externe (hébergé sur votre propre domaine)",
          ja: "外部ホスティング（独自ドメインでホスト）",
        }
      },
      {
        key: "ui.forms.external_hosting_description",
        values: {
          en: "Check this if the form will be hosted on your external website. The preview will show how it appears on your domain.",
          de: "Aktivieren Sie dies, wenn das Formular auf Ihrer externen Website gehostet wird. Die Vorschau zeigt, wie es auf Ihrer Domain erscheint.",
          pl: "Zaznacz to, jeśli formularz będzie hostowany na Twojej zewnętrznej stronie. Podgląd pokaże, jak wygląda na Twojej domenie.",
          es: "Marca esto si el formulario estará alojado en tu sitio web externo. La vista previa mostrará cómo aparece en tu dominio.",
          fr: "Cochez ceci si le formulaire sera hébergé sur votre site web externe. L'aperçu montrera comment il apparaît sur votre domaine.",
          ja: "フォームが外部ウェブサイトでホストされる場合、これをチェックしてください。プレビューでドメインでの表示を確認できます。",
        }
      },
      {
        key: "ui.forms.select_published_page",
        values: {
          en: "Select Published Page",
          de: "Veröffentlichte Seite auswählen",
          pl: "Wybierz opublikowaną stronę",
          es: "Seleccionar página publicada",
          fr: "Sélectionner une page publiée",
          ja: "公開ページを選択",
        }
      },
      {
        key: "ui.forms.select_page_placeholder",
        values: {
          en: "Choose a published page...",
          de: "Veröffentlichte Seite wählen...",
          pl: "Wybierz opublikowaną stronę...",
          es: "Elegir una página publicada...",
          fr: "Choisir une page publiée...",
          ja: "公開ページを選択...",
        }
      },
      {
        key: "ui.forms.published_page_hint",
        values: {
          en: "Forms will be hosted at: {externalDomain}/forms/{formId}",
          de: "Formulare werden gehostet unter: {externalDomain}/forms/{formId}",
          pl: "Formularze będą hostowane pod adresem: {externalDomain}/forms/{formId}",
          es: "Los formularios se alojarán en: {externalDomain}/forms/{formId}",
          fr: "Les formulaires seront hébergés à: {externalDomain}/forms/{formId}",
          ja: "フォームのホスティング先: {externalDomain}/forms/{formId}",
        }
      },
      {
        key: "ui.forms.no_external_pages",
        values: {
          en: "No external pages available",
          de: "Keine externen Seiten verfügbar",
          pl: "Brak dostępnych stron zewnętrznych",
          es: "No hay páginas externas disponibles",
          fr: "Aucune page externe disponible",
          ja: "利用可能な外部ページがありません",
        }
      },
      {
        key: "ui.forms.create_external_page_hint",
        values: {
          en: "Create a published page with an external domain in Web Publishing first, then link forms to it.",
          de: "Erstellen Sie zuerst eine veröffentlichte Seite mit einer externen Domain in Web Publishing und verknüpfen Sie dann Formulare damit.",
          pl: "Najpierw utwórz opublikowaną stronę z zewnętrzną domeną w Web Publishing, a następnie połącz z nią formularze.",
          es: "Primero crea una página publicada con un dominio externo en Web Publishing, luego vincula formularios a ella.",
          fr: "Créez d'abord une page publiée avec un domaine externe dans Web Publishing, puis liez-y des formulaires.",
          ja: "まずWeb Publishingで外部ドメインを持つ公開ページを作成し、その後フォームをリンクしてください。",
        }
      },
      {
        key: "ui.forms.preview_internal",
        values: {
          en: "Internal",
          de: "Intern",
          pl: "Wewnętrzny",
          es: "Interno",
          fr: "Interne",
          ja: "内部",
        }
      },
      {
        key: "ui.forms.preview_external",
        values: {
          en: "External",
          de: "Extern",
          pl: "Zewnętrzny",
          es: "Externo",
          fr: "Externe",
          ja: "外部",
        }
      },
      {
        key: "ui.forms.external_preview",
        values: {
          en: "External Form Preview",
          de: "Externe Formularvorschau",
          pl: "Zewnętrzny podgląd formularza",
          es: "Vista previa del formulario externo",
          fr: "Aperçu du formulaire externe",
          ja: "外部フォームプレビュー",
        }
      },
      {
        key: "ui.forms.showing",
        values: {
          en: "Showing",
          de: "Anzeige",
          pl: "Pokazywanie",
          es: "Mostrando",
          fr: "Affichage",
          ja: "表示中",
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
      {
        key: "ui.forms.template_from_library",
        values: {
          en: "Template selected from library",
          de: "Vorlage aus Bibliothek ausgewählt",
          pl: "Szablon wybrany z biblioteki",
          es: "Plantilla seleccionada de la biblioteca",
          fr: "Modèle sélectionné depuis la bibliothèque",
          ja: "ライブラリから選択されたテンプレート",
        }
      },
      {
        key: "ui.forms.no_template_selected_title",
        values: {
          en: "No Template Selected",
          de: "Keine Vorlage ausgewählt",
          pl: "Nie wybrano szablonu",
          es: "No hay plantilla seleccionada",
          fr: "Aucun modèle sélectionné",
          ja: "テンプレートが選択されていません",
        }
      },
      {
        key: "ui.forms.no_template_selected_message",
        values: {
          en: "Please go to the Templates tab to choose a form template.",
          de: "Bitte gehen Sie zur Registerkarte Vorlagen, um eine Formularvorlage auszuwählen.",
          pl: "Przejdź do zakładki Szablony, aby wybrać szablon formularza.",
          es: "Por favor, vaya a la pestaña Plantillas para elegir una plantilla de formulario.",
          fr: "Veuillez aller dans l'onglet Modèles pour choisir un modèle de formulaire.",
          ja: "フォームテンプレートを選択するには、テンプレートタブに移動してください。",
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

      // Templates Tab
      {
        key: "ui.forms.templates.title",
        values: {
          en: "Form Templates",
          de: "Formularvorlagen",
          pl: "Szablony formularzy",
          es: "Plantillas de formularios",
          fr: "Modèles de formulaires",
          ja: "フォームテンプレート",
        }
      },
      {
        key: "ui.forms.templates.description",
        values: {
          en: "Choose a pre-built template to get started quickly",
          de: "Wählen Sie eine vorgefertigte Vorlage für einen schnellen Start",
          pl: "Wybierz gotowy szablon, aby szybko rozpocząć",
          es: "Elija una plantilla prediseñada para comenzar rápidamente",
          fr: "Choisissez un modèle prédéfini pour démarrer rapidement",
          ja: "事前に作成されたテンプレートを選択して素早く開始",
        }
      },
      {
        key: "ui.forms.templates.empty_title",
        values: {
          en: "No Templates Available",
          de: "Keine Vorlagen verfügbar",
          pl: "Brak dostępnych szablonów",
          es: "No hay plantillas disponibles",
          fr: "Aucun modèle disponible",
          ja: "利用可能なテンプレートがありません",
        }
      },
      {
        key: "ui.forms.templates.empty_description",
        values: {
          en: "No form templates are currently enabled for your organization. Contact your administrator to enable templates.",
          de: "Für Ihre Organisation sind derzeit keine Formularvorlagen aktiviert. Wenden Sie sich an Ihren Administrator, um Vorlagen zu aktivieren.",
          pl: "Obecnie nie ma włączonych szablonów formularzy dla Twojej organizacji. Skontaktuj się z administratorem, aby włączyć szablony.",
          es: "Actualmente no hay plantillas de formularios habilitadas para su organización. Contacte a su administrador para habilitar plantillas.",
          fr: "Aucun modèle de formulaire n'est actuellement activé pour votre organisation. Contactez votre administrateur pour activer des modèles.",
          ja: "現在、組織で有効なフォームテンプレートはありません。管理者に連絡してテンプレートを有効にしてください。",
        }
      },
      {
        key: "ui.forms.templates.not_available",
        values: {
          en: "Not Available",
          de: "Nicht verfügbar",
          pl: "Niedostępne",
          es: "No disponible",
          fr: "Non disponible",
          ja: "利用不可",
        }
      },
      {
        key: "ui.forms.templates.buttons.use",
        values: {
          en: "Use Template",
          de: "Vorlage verwenden",
          pl: "Użyj szablonu",
          es: "Usar plantilla",
          fr: "Utiliser le modèle",
          ja: "テンプレートを使用",
        }
      },
      {
        key: "ui.forms.templates.buttons.preview_hint",
        values: {
          en: "Preview (coming soon)",
          de: "Vorschau (demnächst)",
          pl: "Podgląd (wkrótce)",
          es: "Vista previa (próximamente)",
          fr: "Aperçu (bientôt disponible)",
          ja: "プレビュー（近日公開）",
        }
      },
      {
        key: "ui.forms.templates.usage.title",
        values: {
          en: "Template Usage Tips",
          de: "Tipps zur Verwendung von Vorlagen",
          pl: "Wskazówki dotyczące korzystania z szablonów",
          es: "Consejos de uso de plantillas",
          fr: "Conseils d'utilisation des modèles",
          ja: "テンプレート使用のヒント",
        }
      },
      {
        key: "ui.forms.templates.usage.registration",
        values: {
          en: "Registration forms collect attendee information for events",
          de: "Anmeldeformulare sammeln Teilnehmerinformationen für Veranstaltungen",
          pl: "Formularze rejestracyjne zbierają informacje o uczestnikach wydarzeń",
          es: "Los formularios de registro recopilan información de los asistentes para eventos",
          fr: "Les formulaires d'inscription collectent les informations des participants pour les événements",
          ja: "登録フォームはイベントの参加者情報を収集します",
        }
      },
      {
        key: "ui.forms.templates.usage.survey",
        values: {
          en: "Survey forms gather feedback and opinions from participants",
          de: "Umfrageformulare sammeln Feedback und Meinungen von Teilnehmern",
          pl: "Formularze ankiet zbierają opinie i uwagi uczestników",
          es: "Los formularios de encuesta recopilan comentarios y opiniones de los participantes",
          fr: "Les formulaires de sondage recueillent les commentaires et avis des participants",
          ja: "アンケートフォームは参加者からのフィードバックと意見を収集します",
        }
      },
      {
        key: "ui.forms.templates.usage.application",
        values: {
          en: "Application forms screen and select candidates for programs",
          de: "Bewerbungsformulare prüfen und wählen Kandidaten für Programme aus",
          pl: "Formularze aplikacyjne sprawdzają i wybierają kandydatów do programów",
          es: "Los formularios de solicitud evalúan y seleccionan candidatos para programas",
          fr: "Les formulaires de candidature évaluent et sélectionnent les candidats pour les programmes",
          ja: "申請フォームはプログラムの候補者を審査・選考します",
        }
      },
      {
        key: "ui.forms.templates.usage.custom",
        values: {
          en: "All templates can be customized to fit your specific needs",
          de: "Alle Vorlagen können an Ihre spezifischen Anforderungen angepasst werden",
          pl: "Wszystkie szablony można dostosować do konkretnych potrzeb",
          es: "Todas las plantillas se pueden personalizar para adaptarse a sus necesidades específicas",
          fr: "Tous les modèles peuvent être personnalisés selon vos besoins spécifiques",
          ja: "すべてのテンプレートは特定のニーズに合わせてカスタマイズできます",
        }
      },

      // Template: HAFF Symposium Registration
      {
        key: "ui.forms.templates.haffsymposium_registration.name",
        values: {
          en: "HAFF Symposium Registration",
          de: "HAFF Symposium Anmeldung",
          pl: "Rejestracja na Sympozjum HAFF",
          es: "Registro del Simposio HAFF",
          fr: "Inscription au Symposium HAFF",
          ja: "HAFFシンポジウム登録",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.description",
        values: {
          en: "Professional conference registration with pricing tiers and add-ons",
          de: "Professionelle Konferenzanmeldung mit Preisstufen und Zusatzoptionen",
          pl: "Profesjonalna rejestracja na konferencję z poziomami cenowymi i dodatkami",
          es: "Registro profesional de conferencias con niveles de precios y complementos",
          fr: "Inscription professionnelle à une conférence avec niveaux de prix et modules complémentaires",
          ja: "価格階層とアドオン付きのプロフェッショナル会議登録",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.use_case",
        values: {
          en: "Professional Symposiums",
          de: "Professionelle Symposien",
          pl: "Profesjonalne sympozja",
          es: "Simposios profesionales",
          fr: "Symposiums professionnels",
          ja: "プロフェッショナルシンポジウム",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.features.categories",
        values: {
          en: "Multiple attendance categories (Professional, Resident, Student, etc.)",
          de: "Mehrere Teilnahmekategorien (Fachkraft, Resident, Student usw.)",
          pl: "Wiele kategorii uczestnictwa (Zawodowiec, Rezydent, Student itp.)",
          es: "Múltiples categorías de asistencia (Profesional, Residente, Estudiante, etc.)",
          fr: "Plusieurs catégories de participation (Professionnel, Résident, Étudiant, etc.)",
          ja: "複数の参加カテゴリー（専門家、研修医、学生など）",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.features.pricing",
        values: {
          en: "Dynamic pricing based on registration date and category",
          de: "Dynamische Preisgestaltung basierend auf Anmeldedatum und Kategorie",
          pl: "Dynamiczne ceny w zależności od daty rejestracji i kategorii",
          es: "Precios dinámicos según la fecha de registro y la categoría",
          fr: "Tarification dynamique selon la date d'inscription et la catégorie",
          ja: "登録日とカテゴリーに基づく動的価格設定",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.features.personal_info",
        values: {
          en: "Comprehensive personal and professional information collection",
          de: "Umfassende Erfassung persönlicher und beruflicher Informationen",
          pl: "Kompleksowe zbieranie informacji osobistych i zawodowych",
          es: "Recopilación completa de información personal y profesional",
          fr: "Collecte complète d'informations personnelles et professionnelles",
          ja: "包括的な個人情報および職業情報の収集",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.features.special_requests",
        values: {
          en: "Dietary restrictions and accessibility needs",
          de: "Diätvorschriften und Barrierefreiheitsbedarf",
          pl: "Ograniczenia dietetyczne i potrzeby związane z dostępnością",
          es: "Restricciones dietéticas y necesidades de accesibilidad",
          fr: "Restrictions alimentaires et besoins d'accessibilité",
          ja: "食事制限とアクセシビリティのニーズ",
        }
      },
      {
        key: "ui.forms.templates.haffsymposium_registration.features.ucra_addon",
        values: {
          en: "Optional add-ons like UCRA membership",
          de: "Optionale Zusätze wie UCRA-Mitgliedschaft",
          pl: "Opcjonalne dodatki, takie jak członkostwo w UCRA",
          es: "Complementos opcionales como membresía UCRA",
          fr: "Modules complémentaires optionnels comme l'adhésion à l'UCRA",
          ja: "UCRA会員資格などのオプショナルアドオン",
        }
      },

      // Template: Conference Feedback Survey
      {
        key: "ui.forms.templates.conference_feedback_survey.name",
        values: {
          en: "Conference Feedback Survey",
          de: "Konferenz-Feedback-Umfrage",
          pl: "Ankieta opinii o konferencji",
          es: "Encuesta de opinión sobre la conferencia",
          fr: "Enquête de satisfaction sur la conférence",
          ja: "会議フィードバックアンケート",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.description",
        values: {
          en: "Comprehensive post-event feedback collection",
          de: "Umfassende Feedback-Erfassung nach der Veranstaltung",
          pl: "Kompleksowe zbieranie opinii po wydarzeniu",
          es: "Recopilación completa de comentarios posteriores al evento",
          fr: "Collecte complète de commentaires après l'événement",
          ja: "イベント後の包括的なフィードバック収集",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.use_case",
        values: {
          en: "Post-Event Surveys",
          de: "Umfragen nach der Veranstaltung",
          pl: "Ankiety po wydarzeniu",
          es: "Encuestas posteriores al evento",
          fr: "Enquêtes après l'événement",
          ja: "イベント後アンケート",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.features.nps",
        values: {
          en: "Net Promoter Score (NPS) question",
          de: "Net Promoter Score (NPS) Frage",
          pl: "Pytanie o Net Promoter Score (NPS)",
          es: "Pregunta de Net Promoter Score (NPS)",
          fr: "Question du Net Promoter Score (NPS)",
          ja: "ネットプロモータースコア（NPS）質問",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.features.ratings",
        values: {
          en: "Session and speaker rating scales",
          de: "Bewertungsskalen für Sitzungen und Sprecher",
          pl: "Skale oceny sesji i prelegentów",
          es: "Escalas de calificación de sesiones y oradores",
          fr: "Échelles d'évaluation des sessions et des intervenants",
          ja: "セッションおよび講演者の評価スケール",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.features.content",
        values: {
          en: "Content quality and relevance assessment",
          de: "Bewertung der Inhaltsqualität und Relevanz",
          pl: "Ocena jakości i trafności treści",
          es: "Evaluación de la calidad y relevancia del contenido",
          fr: "Évaluation de la qualité et de la pertinence du contenu",
          ja: "コンテンツの質と関連性の評価",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.features.venue",
        values: {
          en: "Venue and logistics feedback",
          de: "Feedback zu Veranstaltungsort und Logistik",
          pl: "Opinie o miejscu i logistyce",
          es: "Comentarios sobre el lugar y la logística",
          fr: "Commentaires sur le lieu et la logistique",
          ja: "会場とロジスティクスのフィードバック",
        }
      },
      {
        key: "ui.forms.templates.conference_feedback_survey.features.future_topics",
        values: {
          en: "Future topic suggestions",
          de: "Vorschläge für zukünftige Themen",
          pl: "Sugestie przyszłych tematów",
          es: "Sugerencias de temas futuros",
          fr: "Suggestions de sujets futurs",
          ja: "今後のトピックの提案",
        }
      },

      // Template: Speaker Proposal
      {
        key: "ui.forms.templates.speaker_proposal.name",
        values: {
          en: "Speaker Proposal Form",
          de: "Redner-Vorschlagsformular",
          pl: "Formularz propozycji prelegenta",
          es: "Formulario de propuesta de ponente",
          fr: "Formulaire de proposition d'intervenant",
          ja: "講演者提案フォーム",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.description",
        values: {
          en: "Submit speaking proposals for conferences and events",
          de: "Einreichen von Vorträgen für Konferenzen und Veranstaltungen",
          pl: "Przesyłanie propozycji wystąpień na konferencje i wydarzenia",
          es: "Enviar propuestas de ponencias para conferencias y eventos",
          fr: "Soumettre des propositions de présentation pour des conférences et des événements",
          ja: "会議やイベントの講演提案を提出",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.use_case",
        values: {
          en: "Call for Papers",
          de: "Aufruf zur Einreichung von Beiträgen",
          pl: "Zgłaszanie referatów",
          es: "Convocatoria de ponencias",
          fr: "Appel à communications",
          ja: "論文募集",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.features.bio",
        values: {
          en: "Speaker biography and credentials",
          de: "Biografie und Referenzen des Redners",
          pl: "Biografia i referencje prelegenta",
          es: "Biografía y credenciales del ponente",
          fr: "Biographie et références de l'intervenant",
          ja: "講演者の経歴と資格",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.features.topic",
        values: {
          en: "Presentation topic and title",
          de: "Präsentationsthema und Titel",
          pl: "Temat i tytuł prezentacji",
          es: "Tema y título de la presentación",
          fr: "Sujet et titre de la présentation",
          ja: "プレゼンテーションのトピックとタイトル",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.features.abstract",
        values: {
          en: "Detailed abstract and learning objectives",
          de: "Ausführliches Abstract und Lernziele",
          pl: "Szczegółowy abstrakt i cele edukacyjne",
          es: "Resumen detallado y objetivos de aprendizaje",
          fr: "Résumé détaillé et objectifs d'apprentissage",
          ja: "詳細な要約と学習目標",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.features.requirements",
        values: {
          en: "Technical and equipment requirements",
          de: "Technische und Ausstattungsanforderungen",
          pl: "Wymagania techniczne i sprzętowe",
          es: "Requisitos técnicos y de equipo",
          fr: "Exigences techniques et matérielles",
          ja: "技術的要件および機器要件",
        }
      },
      {
        key: "ui.forms.templates.speaker_proposal.features.availability",
        values: {
          en: "Availability and scheduling preferences",
          de: "Verfügbarkeit und Terminpräferenzen",
          pl: "Dostępność i preferencje terminowe",
          es: "Disponibilidad y preferencias de programación",
          fr: "Disponibilité et préférences de planification",
          ja: "空き状況とスケジュールの希望",
        }
      },

      // Template: Volunteer Application
      {
        key: "ui.forms.templates.volunteer_application.name",
        values: {
          en: "Volunteer Application",
          de: "Freiwilligen-Bewerbung",
          pl: "Zgłoszenie wolontariusza",
          es: "Solicitud de voluntario",
          fr: "Candidature de bénévole",
          ja: "ボランティア申込",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.description",
        values: {
          en: "Recruit and screen event volunteers",
          de: "Rekrutierung und Screening von Veranstaltungs-Freiwilligen",
          pl: "Rekrutacja i weryfikacja wolontariuszy na wydarzenia",
          es: "Reclutar y evaluar voluntarios para eventos",
          fr: "Recruter et évaluer des bénévoles pour événements",
          ja: "イベントボランティアの募集とスクリーニング",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.use_case",
        values: {
          en: "Volunteer Recruitment",
          de: "Freiwilligen-Rekrutierung",
          pl: "Rekrutacja wolontariuszy",
          es: "Reclutamiento de voluntarios",
          fr: "Recrutement de bénévoles",
          ja: "ボランティア募集",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.features.personal",
        values: {
          en: "Personal contact information",
          de: "Persönliche Kontaktinformationen",
          pl: "Dane kontaktowe",
          es: "Información de contacto personal",
          fr: "Coordonnées personnelles",
          ja: "個人連絡先情報",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.features.availability",
        values: {
          en: "Availability schedule and time commitment",
          de: "Verfügbarkeitsplan und Zeitaufwand",
          pl: "Harmonogram dostępności i zobowiązanie czasowe",
          es: "Horario de disponibilidad y compromiso de tiempo",
          fr: "Disponibilité et engagement horaire",
          ja: "スケジュールの空き状況と時間的コミットメント",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.features.skills",
        values: {
          en: "Skills and areas of interest",
          de: "Fähigkeiten und Interessensgebiete",
          pl: "Umiejętności i obszary zainteresowań",
          es: "Habilidades y áreas de interés",
          fr: "Compétences et domaines d'intérêt",
          ja: "スキルと興味のある分野",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.features.experience",
        values: {
          en: "Previous volunteer experience",
          de: "Frühere Freiwilligen-Erfahrung",
          pl: "Poprzednie doświadczenie wolontariackie",
          es: "Experiencia voluntaria previa",
          fr: "Expérience bénévole antérieure",
          ja: "以前のボランティア経験",
        }
      },
      {
        key: "ui.forms.templates.volunteer_application.features.references",
        values: {
          en: "Emergency contact and references",
          de: "Notfallkontakt und Referenzen",
          pl: "Kontakt awaryjny i referencje",
          es: "Contacto de emergencia y referencias",
          fr: "Contact d'urgence et références",
          ja: "緊急連絡先と推薦人",
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
