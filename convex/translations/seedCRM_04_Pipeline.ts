/**
 * SEED CRM TRANSLATIONS - PIPELINE KANBAN BOARD
 *
 * CRM Pipeline/Kanban view for managing contact lifecycle stages
 *
 * Components:
 *   - src/components/window-content/crm-window/pipeline-kanban.tsx
 *   - src/components/window-content/crm-window/kanban-column.tsx
 *   - src/components/window-content/crm-window/contact-card.tsx
 *
 * Namespace: ui.crm
 * Languages: en, de, pl, es, fr, ja
 *
 * Usage:
 *   npx convex run translations/seedCRM_04_Pipeline:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding CRM - Pipeline Kanban Board...");

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
      // PIPELINE TAB
      // ============================================================
      {
        key: "ui.crm.tabs.pipeline",
        values: {
          en: "PIPELINE",
          de: "PIPELINE",
          pl: "PIPELINE",
          es: "PIPELINE",
          fr: "PIPELINE",
          ja: "パイプライン",
        }
      },

      // ============================================================
      // PIPELINE SUB-TABS
      // ============================================================
      {
        key: "ui.crm.pipeline.tabs.active",
        values: {
          en: "Active Pipelines",
          de: "Aktive Pipelines",
          pl: "Aktywne Pipeline",
          es: "Pipelines Activos",
          fr: "Pipelines Actifs",
          ja: "アクティブパイプライン",
        }
      },
      {
        key: "ui.crm.pipeline.tabs.templates",
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
        key: "ui.crm.pipeline.tabs.settings",
        values: {
          en: "Settings",
          de: "Einstellungen",
          pl: "Ustawienia",
          es: "Configuración",
          fr: "Paramètres",
          ja: "設定",
        }
      },

      // ============================================================
      // TEMPLATES TAB
      // ============================================================
      {
        key: "ui.crm.pipeline.templates.title",
        values: {
          en: "Pipeline Templates",
          de: "Pipeline-Vorlagen",
          pl: "Szablony Pipeline",
          es: "Plantillas de Pipeline",
          fr: "Modèles de Pipeline",
          ja: "パイプラインテンプレート",
        }
      },
      {
        key: "ui.crm.pipeline.templates.description",
        values: {
          en: "Copy these system templates to your organization to get started quickly",
          de: "Kopieren Sie diese Systemvorlagen in Ihre Organisation, um schnell zu starten",
          pl: "Skopiuj te szablony systemowe do swojej organizacji, aby szybko rozpocząć",
          es: "Copie estas plantillas del sistema a su organización para comenzar rápidamente",
          fr: "Copiez ces modèles système dans votre organisation pour démarrer rapidement",
          ja: "これらのシステムテンプレートを組織にコピーして、すぐに開始できます",
        }
      },
      {
        key: "ui.crm.pipeline.templates.not_authenticated",
        values: {
          en: "Please sign in to view templates",
          de: "Bitte melden Sie sich an, um Vorlagen anzuzeigen",
          pl: "Zaloguj się, aby wyświetlić szablony",
          es: "Inicie sesión para ver las plantillas",
          fr: "Veuillez vous connecter pour voir les modèles",
          ja: "テンプレートを表示するにはサインインしてください",
        }
      },
      {
        key: "ui.crm.pipeline.templates.loading",
        values: {
          en: "Loading templates...",
          de: "Lade Vorlagen...",
          pl: "Ładowanie szablonów...",
          es: "Cargando plantillas...",
          fr: "Chargement des modèles...",
          ja: "テンプレートを読み込んでいます...",
        }
      },
      {
        key: "ui.crm.pipeline.templates.no_templates",
        values: {
          en: "No templates available",
          de: "Keine Vorlagen verfügbar",
          pl: "Brak dostępnych szablonów",
          es: "No hay plantillas disponibles",
          fr: "Aucun modèle disponible",
          ja: "利用可能なテンプレートがありません",
        }
      },
      {
        key: "ui.crm.pipeline.templates.no_templates_hint",
        values: {
          en: "System templates will appear here",
          de: "Systemvorlagen werden hier angezeigt",
          pl: "Szablony systemowe pojawią się tutaj",
          es: "Las plantillas del sistema aparecerán aquí",
          fr: "Les modèles système apparaîtront ici",
          ja: "システムテンプレートがここに表示されます",
        }
      },
      {
        key: "ui.crm.pipeline.templates.use_template",
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
        key: "ui.crm.pipeline.templates.copying",
        values: {
          en: "Copying...",
          de: "Kopieren...",
          pl: "Kopiowanie...",
          es: "Copiando...",
          fr: "Copie...",
          ja: "コピー中...",
        }
      },
      {
        key: "ui.crm.pipeline.templates.ai_features",
        values: {
          en: "AI Features",
          de: "KI-Funktionen",
          pl: "Funkcje AI",
          es: "Funciones de IA",
          fr: "Fonctionnalités IA",
          ja: "AI機能",
        }
      },

      // ============================================================
      // ACTIVE PIPELINES - CRUD OPERATIONS
      // ============================================================
      {
        key: "ui.crm.pipeline.edit",
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
        key: "ui.crm.pipeline.delete",
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
        key: "ui.crm.pipeline.save",
        values: {
          en: "Save",
          de: "Speichern",
          pl: "Zapisz",
          es: "Guardar",
          fr: "Enregistrer",
          ja: "保存",
        }
      },
      {
        key: "ui.crm.pipeline.cancel",
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
        key: "ui.crm.pipeline.name",
        values: {
          en: "Pipeline Name",
          de: "Pipeline-Name",
          pl: "Nazwa Pipeline",
          es: "Nombre del Pipeline",
          fr: "Nom du Pipeline",
          ja: "パイプライン名",
        }
      },
      {
        key: "ui.crm.pipeline.description",
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
        key: "ui.crm.pipeline.name_placeholder",
        values: {
          en: "Enter pipeline name",
          de: "Pipeline-Namen eingeben",
          pl: "Wprowadź nazwę pipeline",
          es: "Ingrese el nombre del pipeline",
          fr: "Entrez le nom du pipeline",
          ja: "パイプライン名を入力",
        }
      },
      {
        key: "ui.crm.pipeline.description_placeholder",
        values: {
          en: "Enter pipeline description",
          de: "Pipeline-Beschreibung eingeben",
          pl: "Wprowadź opis pipeline",
          es: "Ingrese la descripción del pipeline",
          fr: "Entrez la description du pipeline",
          ja: "パイプラインの説明を入力",
        }
      },
      {
        key: "ui.crm.pipeline.confirm_delete",
        values: {
          en: "Are you sure you want to delete this pipeline?",
          de: "Möchten Sie diese Pipeline wirklich löschen?",
          pl: "Czy na pewno chcesz usunąć ten pipeline?",
          es: "¿Está seguro de que desea eliminar este pipeline?",
          fr: "Êtes-vous sûr de vouloir supprimer ce pipeline?",
          ja: "このパイプラインを削除してもよろしいですか？",
        }
      },
      {
        key: "ui.crm.pipeline.update_failed",
        values: {
          en: "Failed to update pipeline",
          de: "Pipeline konnte nicht aktualisiert werden",
          pl: "Nie udało się zaktualizować pipeline",
          es: "Error al actualizar el pipeline",
          fr: "Échec de la mise à jour du pipeline",
          ja: "パイプラインの更新に失敗しました",
        }
      },
      {
        key: "ui.crm.pipeline.delete_failed",
        values: {
          en: "Failed to delete pipeline",
          de: "Pipeline konnte nicht gelöscht werden",
          pl: "Nie udało się usunąć pipeline",
          es: "Error al eliminar el pipeline",
          fr: "Échec de la suppression du pipeline",
          ja: "パイプラインの削除に失敗しました",
        }
      },
      {
        key: "ui.crm.pipeline.delete_stage",
        values: {
          en: "Delete stage",
          de: "Stage löschen",
          pl: "Usuń etap",
          es: "Eliminar etapa",
          fr: "Supprimer l'étape",
          ja: "ステージを削除",
        }
      },
      {
        key: "ui.crm.pipeline.confirm_delete_stage",
        values: {
          en: "Are you sure you want to delete this stage?",
          de: "Möchten Sie dieses Stage wirklich löschen?",
          pl: "Czy na pewno chcesz usunąć ten etap?",
          es: "¿Está seguro de que desea eliminar esta etapa?",
          fr: "Êtes-vous sûr de vouloir supprimer cette étape?",
          ja: "このステージを削除してもよろしいですか？",
        }
      },
      {
        key: "ui.crm.pipeline.cannot_delete_stage_with_contacts",
        values: {
          en: "Cannot delete stage with contacts. Move contacts first.",
          de: "Stage mit Kontakten kann nicht gelöscht werden. Verschieben Sie zuerst die Kontakte.",
          pl: "Nie można usunąć etapu z kontaktami. Najpierw przenieś kontakty.",
          es: "No se puede eliminar la etapa con contactos. Mueva los contactos primero.",
          fr: "Impossible de supprimer l'étape avec des contacts. Déplacez d'abord les contacts.",
          ja: "連絡先があるステージは削除できません。まず連絡先を移動してください。",
        }
      },
      {
        key: "ui.crm.pipeline.delete_stage_failed",
        values: {
          en: "Failed to delete stage. Make sure it has no contacts.",
          de: "Stage konnte nicht gelöscht werden. Stellen Sie sicher, dass es keine Kontakte hat.",
          pl: "Nie udało się usunąć etapu. Upewnij się, że nie ma kontaktów.",
          es: "Error al eliminar la etapa. Asegúrese de que no tenga contactos.",
          fr: "Échec de la suppression de l'étape. Assurez-vous qu'elle n'a pas de contacts.",
          ja: "ステージの削除に失敗しました。連絡先がないことを確認してください。",
        }
      },
      {
        key: "ui.crm.pipeline.add_stage",
        values: {
          en: "Add Stage",
          de: "Stage hinzufügen",
          pl: "Dodaj etap",
          es: "Agregar etapa",
          fr: "Ajouter une étape",
          ja: "ステージを追加",
        }
      },
      {
        key: "ui.crm.pipeline.select_pipeline",
        values: {
          en: "Select a pipeline...",
          de: "Wählen Sie eine Pipeline...",
          pl: "Wybierz pipeline...",
          es: "Seleccione un pipeline...",
          fr: "Sélectionnez un pipeline...",
          ja: "パイプラインを選択...",
        }
      },
      {
        key: "ui.crm.pipeline.select_to_view",
        values: {
          en: "Select a pipeline to view",
          de: "Wählen Sie eine Pipeline zum Anzeigen",
          pl: "Wybierz pipeline do wyświetlenia",
          es: "Seleccione un pipeline para ver",
          fr: "Sélectionnez un pipeline à afficher",
          ja: "表示するパイプラインを選択",
        }
      },
      {
        key: "ui.crm.pipeline.no_description",
        values: {
          en: "No description",
          de: "Keine Beschreibung",
          pl: "Brak opisu",
          es: "Sin descripción",
          fr: "Pas de description",
          ja: "説明なし",
        }
      },
      {
        key: "ui.crm.pipeline.loading_stages",
        values: {
          en: "Loading pipeline stages...",
          de: "Lade Pipeline-Stages...",
          pl: "Ładowanie etapów pipeline...",
          es: "Cargando etapas del pipeline...",
          fr: "Chargement des étapes du pipeline...",
          ja: "パイプラインステージを読み込んでいます...",
        }
      },
      {
        key: "ui.crm.pipeline.create_new",
        values: {
          en: "Create New Pipeline",
          de: "Neue Pipeline erstellen",
          pl: "Utwórz nowy pipeline",
          es: "Crear nuevo pipeline",
          fr: "Créer un nouveau pipeline",
          ja: "新しいパイプラインを作成",
        }
      },
      {
        key: "ui.crm.pipeline.create",
        values: {
          en: "Create Pipeline",
          de: "Pipeline erstellen",
          pl: "Utwórz pipeline",
          es: "Crear pipeline",
          fr: "Créer un pipeline",
          ja: "パイプラインを作成",
        }
      },
      {
        key: "ui.crm.pipeline.create_failed",
        values: {
          en: "Failed to create pipeline",
          de: "Pipeline konnte nicht erstellt werden",
          pl: "Nie udało się utworzyć pipeline",
          es: "Error al crear el pipeline",
          fr: "Échec de la création du pipeline",
          ja: "パイプラインの作成に失敗しました",
        }
      },
      {
        key: "ui.crm.pipeline.name_required",
        values: {
          en: "Please enter a pipeline name",
          de: "Bitte geben Sie einen Pipeline-Namen ein",
          pl: "Wprowadź nazwę pipeline",
          es: "Por favor ingrese un nombre de pipeline",
          fr: "Veuillez entrer un nom de pipeline",
          ja: "パイプライン名を入力してください",
        }
      },

      // ============================================================
      // SETTINGS TAB
      // ============================================================
      {
        key: "ui.crm.pipeline.settings.title",
        values: {
          en: "AI & Automation Settings",
          de: "KI- und Automatisierungseinstellungen",
          pl: "Ustawienia AI i Automatyzacji",
          es: "Configuración de IA y Automatización",
          fr: "Paramètres d'IA et d'Automatisation",
          ja: "AIと自動化の設定",
        }
      },
      {
        key: "ui.crm.pipeline.settings.description",
        values: {
          en: "Configure how AI agents interact with your CRM data",
          de: "Konfigurieren Sie, wie KI-Agenten mit Ihren CRM-Daten interagieren",
          pl: "Skonfiguruj, jak agenci AI wchodzą w interakcję z danymi CRM",
          es: "Configure cómo los agentes de IA interactúan con sus datos de CRM",
          fr: "Configurez comment les agents IA interagissent avec vos données CRM",
          ja: "AIエージェントがCRMデータとどのようにやり取りするかを設定します",
        }
      },
      {
        key: "ui.crm.pipeline.settings.not_authenticated",
        values: {
          en: "Please sign in to view settings",
          de: "Bitte melden Sie sich an, um die Einstellungen anzuzeigen",
          pl: "Zaloguj się, aby wyświetlić ustawienia",
          es: "Inicie sesión para ver la configuración",
          fr: "Veuillez vous connecter pour voir les paramètres",
          ja: "設定を表示するにはサインインしてください",
        }
      },
      {
        key: "ui.crm.pipeline.settings.loading",
        values: {
          en: "Loading settings...",
          de: "Lade Einstellungen...",
          pl: "Ładowanie ustawień...",
          es: "Cargando configuración...",
          fr: "Chargement des paramètres...",
          ja: "設定を読み込んでいます...",
        }
      },
      {
        key: "ui.crm.pipeline.settings.save",
        values: {
          en: "Save Changes",
          de: "Änderungen speichern",
          pl: "Zapisz zmiany",
          es: "Guardar cambios",
          fr: "Enregistrer les modifications",
          ja: "変更を保存",
        }
      },
      {
        key: "ui.crm.pipeline.settings.saving",
        values: {
          en: "Saving...",
          de: "Speichern...",
          pl: "Zapisywanie...",
          es: "Guardando...",
          fr: "Enregistrement...",
          ja: "保存中...",
        }
      },
      {
        key: "ui.crm.pipeline.settings.save_success",
        values: {
          en: "Settings saved successfully",
          de: "Einstellungen erfolgreich gespeichert",
          pl: "Ustawienia zapisane pomyślnie",
          es: "Configuración guardada con éxito",
          fr: "Paramètres enregistrés avec succès",
          ja: "設定が正常に保存されました",
        }
      },

      // Data Sources
      {
        key: "ui.crm.pipeline.settings.data_sources.title",
        values: {
          en: "Data Source Access",
          de: "Datenquellenzugriff",
          pl: "Dostęp do źródeł danych",
          es: "Acceso a fuentes de datos",
          fr: "Accès aux sources de données",
          ja: "データソースアクセス",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.description",
        values: {
          en: "Control what data sources AI can access for enrichment",
          de: "Steuern Sie, auf welche Datenquellen die KI zur Anreicherung zugreifen kann",
          pl: "Kontroluj, do jakich źródeł danych AI może uzyskać dostęp w celu wzbogacenia",
          es: "Controle a qué fuentes de datos puede acceder la IA para el enriquecimiento",
          fr: "Contrôlez les sources de données auxquelles l'IA peut accéder pour l'enrichissement",
          ja: "AIがエンリッチメントのためにアクセスできるデータソースを制御します",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.enrichment",
        values: {
          en: "Contact Enrichment",
          de: "Kontaktanreicherung",
          pl: "Wzbogacanie kontaktów",
          es: "Enriquecimiento de contactos",
          fr: "Enrichissement des contacts",
          ja: "連絡先エンリッチメント",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.enrichment_hint",
        values: {
          en: "Allow AI to enrich contacts with publicly available data",
          de: "Erlauben Sie der KI, Kontakte mit öffentlich verfügbaren Daten anzureichern",
          pl: "Zezwól AI na wzbogacanie kontaktów danymi publicznie dostępnymi",
          es: "Permitir que la IA enriquezca los contactos con datos disponibles públicamente",
          fr: "Permettre à l'IA d'enrichir les contacts avec des données publiquement disponibles",
          ja: "AIが公開されているデータで連絡先を充実させることを許可します",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.external_apis",
        values: {
          en: "External APIs",
          de: "Externe APIs",
          pl: "Zewnętrzne API",
          es: "APIs externas",
          fr: "APIs externes",
          ja: "外部API",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.external_apis_hint",
        values: {
          en: "Access external data providers for company and contact information",
          de: "Greifen Sie auf externe Datenanbieter für Firmen- und Kontaktinformationen zu",
          pl: "Dostęp do zewnętrznych dostawców danych o firmach i kontaktach",
          es: "Acceda a proveedores de datos externos para información de empresas y contactos",
          fr: "Accéder à des fournisseurs de données externes pour les informations sur les entreprises et les contacts",
          ja: "会社と連絡先情報の外部データプロバイダーにアクセスします",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.web_search",
        values: {
          en: "Web Search",
          de: "Websuche",
          pl: "Wyszukiwanie w sieci",
          es: "Búsqueda web",
          fr: "Recherche web",
          ja: "ウェブ検索",
        }
      },
      {
        key: "ui.crm.pipeline.settings.data_sources.web_search_hint",
        values: {
          en: "Search the web for recent news and updates about contacts/companies",
          de: "Durchsuchen Sie das Web nach aktuellen Nachrichten und Updates zu Kontakten/Unternehmen",
          pl: "Przeszukaj sieć w poszukiwaniu najnowszych wiadomości i aktualizacji o kontaktach/firmach",
          es: "Busque en la web noticias recientes y actualizaciones sobre contactos/empresas",
          fr: "Recherchez sur le web les dernières nouvelles et mises à jour sur les contacts/entreprises",
          ja: "連絡先/企業に関する最新のニュースと更新をウェブで検索します",
        }
      },

      // Communication
      {
        key: "ui.crm.pipeline.settings.communication.title",
        values: {
          en: "Communication Style",
          de: "Kommunikationsstil",
          pl: "Styl komunikacji",
          es: "Estilo de comunicación",
          fr: "Style de communication",
          ja: "コミュニケーションスタイル",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.description",
        values: {
          en: "Set how AI agents should communicate",
          de: "Legen Sie fest, wie KI-Agenten kommunizieren sollen",
          pl: "Ustaw, jak agenci AI powinni komunikować się",
          es: "Establezca cómo deben comunicarse los agentes de IA",
          fr: "Définissez comment les agents IA doivent communiquer",
          ja: "AIエージェントがどのようにコミュニケーションすべきかを設定します",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.style_label",
        values: {
          en: "Style",
          de: "Stil",
          pl: "Styl",
          es: "Estilo",
          fr: "Style",
          ja: "スタイル",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.style_professional",
        values: {
          en: "Professional",
          de: "Professionell",
          pl: "Profesjonalny",
          es: "Profesional",
          fr: "Professionnel",
          ja: "プロフェッショナル",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.style_casual",
        values: {
          en: "Casual",
          de: "Lässig",
          pl: "Swobodny",
          es: "Informal",
          fr: "Décontracté",
          ja: "カジュアル",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.style_formal",
        values: {
          en: "Formal",
          de: "Förmlich",
          pl: "Formalny",
          es: "Formal",
          fr: "Formel",
          ja: "フォーマル",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.tone_label",
        values: {
          en: "Tone",
          de: "Ton",
          pl: "Ton",
          es: "Tono",
          fr: "Ton",
          ja: "トーン",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.tone_friendly",
        values: {
          en: "Friendly",
          de: "Freundlich",
          pl: "Przyjazny",
          es: "Amigable",
          fr: "Amical",
          ja: "フレンドリー",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.tone_neutral",
        values: {
          en: "Neutral",
          de: "Neutral",
          pl: "Neutralny",
          es: "Neutral",
          fr: "Neutre",
          ja: "ニュートラル",
        }
      },
      {
        key: "ui.crm.pipeline.settings.communication.tone_assertive",
        values: {
          en: "Assertive",
          de: "Bestimmt",
          pl: "Asertywny",
          es: "Asertivo",
          fr: "Assertif",
          ja: "自信がある",
        }
      },

      // Automation
      {
        key: "ui.crm.pipeline.settings.automation.title",
        values: {
          en: "Automation Preferences",
          de: "Automatisierungseinstellungen",
          pl: "Preferencje automatyzacji",
          es: "Preferencias de automatización",
          fr: "Préférences d'automatisation",
          ja: "自動化の設定",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.description",
        values: {
          en: "Configure automatic AI actions",
          de: "Konfigurieren Sie automatische KI-Aktionen",
          pl: "Skonfiguruj automatyczne działania AI",
          es: "Configure acciones automáticas de IA",
          fr: "Configurez les actions automatiques de l'IA",
          ja: "自動AIアクションを設定します",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.auto_scoring",
        values: {
          en: "Automatic Contact Scoring",
          de: "Automatische Kontaktbewertung",
          pl: "Automatyczne punktowanie kontaktów",
          es: "Puntuación automática de contactos",
          fr: "Notation automatique des contacts",
          ja: "自動連絡先スコアリング",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.auto_scoring_hint",
        values: {
          en: "AI automatically scores contacts based on engagement and fit",
          de: "KI bewertet Kontakte automatisch basierend auf Engagement und Passung",
          pl: "AI automatycznie punktuje kontakty na podstawie zaangażowania i dopasowania",
          es: "La IA califica automáticamente los contactos según el compromiso y el ajuste",
          fr: "L'IA note automatiquement les contacts en fonction de l'engagement et de l'adéquation",
          ja: "AIがエンゲージメントと適合性に基づいて連絡先を自動的にスコアリングします",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.auto_progression",
        values: {
          en: "Automatic Pipeline Progression",
          de: "Automatischer Pipeline-Fortschritt",
          pl: "Automatyczna progresja pipeline",
          es: "Progresión automática del pipeline",
          fr: "Progression automatique du pipeline",
          ja: "自動パイプライン進行",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.auto_progression_hint",
        values: {
          en: "AI can automatically move contacts through pipeline stages (requires approval)",
          de: "KI kann Kontakte automatisch durch Pipeline-Phasen verschieben (erfordert Genehmigung)",
          pl: "AI może automatycznie przenosić kontakty przez etapy pipeline (wymaga zatwierdzenia)",
          es: "La IA puede mover automáticamente los contactos a través de las etapas del pipeline (requiere aprobación)",
          fr: "L'IA peut déplacer automatiquement les contacts à travers les étapes du pipeline (nécessite une approbation)",
          ja: "AIはパイプラインステージを通じて連絡先を自動的に移動できます（承認が必要）",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.suggest_actions",
        values: {
          en: "Suggest Next Actions",
          de: "Nächste Aktionen vorschlagen",
          pl: "Sugeruj następne działania",
          es: "Sugerir próximas acciones",
          fr: "Suggérer les prochaines actions",
          ja: "次のアクションを提案",
        }
      },
      {
        key: "ui.crm.pipeline.settings.automation.suggest_actions_hint",
        values: {
          en: "AI suggests next best actions for each contact",
          de: "KI schlägt die nächsten besten Aktionen für jeden Kontakt vor",
          pl: "AI sugeruje następne najlepsze działania dla każdego kontaktu",
          es: "La IA sugiere las mejores acciones siguientes para cada contacto",
          fr: "L'IA suggère les meilleures actions suivantes pour chaque contact",
          ja: "AIが各連絡先の次の最適なアクションを提案します",
        }
      },

      // ============================================================
      // ACTIVE PIPELINES TAB
      // ============================================================
      {
        key: "ui.crm.pipeline.no_pipelines",
        values: {
          en: "No Pipelines Found",
          de: "Keine Pipelines gefunden",
          pl: "Nie znaleziono pipeline'ów",
          es: "No se encontraron pipelines",
          fr: "Aucun pipeline trouvé",
          ja: "パイプラインが見つかりません",
        }
      },
      {
        key: "ui.crm.pipeline.no_pipelines_hint",
        values: {
          en: "Go to the Templates tab to copy a pipeline template to your organization",
          de: "Gehen Sie zur Registerkarte Vorlagen, um eine Pipeline-Vorlage in Ihre Organisation zu kopieren",
          pl: "Przejdź do zakładki Szablony, aby skopiować szablon pipeline do swojej organizacji",
          es: "Vaya a la pestaña Plantillas para copiar una plantilla de pipeline a su organización",
          fr: "Accédez à l'onglet Modèles pour copier un modèle de pipeline dans votre organisation",
          ja: "テンプレートタブに移動して、パイプラインテンプレートを組織にコピーしてください",
        }
      },
      {
        key: "ui.crm.pipeline.select_pipeline",
        values: {
          en: "Pipeline:",
          de: "Pipeline:",
          pl: "Pipeline:",
          es: "Pipeline:",
          fr: "Pipeline:",
          ja: "パイプライン：",
        }
      },
      {
        key: "ui.crm.pipeline.loading",
        values: {
          en: "Loading pipelines...",
          de: "Lade Pipelines...",
          pl: "Ładowanie pipeline'ów...",
          es: "Cargando pipelines...",
          fr: "Chargement des pipelines...",
          ja: "パイプラインを読み込んでいます...",
        }
      },
      {
        key: "ui.crm.pipeline.loading_stages",
        values: {
          en: "Loading pipeline stages...",
          de: "Lade Pipeline-Phasen...",
          pl: "Ładowanie etapów pipeline...",
          es: "Cargando etapas del pipeline...",
          fr: "Chargement des étapes du pipeline...",
          ja: "パイプラインステージを読み込んでいます...",
        }
      },
      {
        key: "ui.crm.pipeline.not_authenticated",
        values: {
          en: "Please sign in to view pipelines",
          de: "Bitte melden Sie sich an, um Pipelines anzuzeigen",
          pl: "Zaloguj się, aby wyświetlić pipeline'y",
          es: "Inicie sesión para ver los pipelines",
          fr: "Veuillez vous connecter pour voir les pipelines",
          ja: "パイプラインを表示するにはサインインしてください",
        }
      },

      // ============================================================
      // PIPELINE STAGE LABELS
      // ============================================================
      {
        key: "ui.crm.pipeline.stages.lead",
        values: {
          en: "Leads",
          de: "Leads",
          pl: "Leady",
          es: "Leads",
          fr: "Prospects",
          ja: "リード",
        }
      },
      {
        key: "ui.crm.pipeline.stages.prospect",
        values: {
          en: "Prospects",
          de: "Interessenten",
          pl: "Prospekty",
          es: "Prospectos",
          fr: "Prospects qualifiés",
          ja: "見込み客",
        }
      },
      {
        key: "ui.crm.pipeline.stages.customer",
        values: {
          en: "Customers",
          de: "Kunden",
          pl: "Klienci",
          es: "Clientes",
          fr: "Clients",
          ja: "顧客",
        }
      },
      {
        key: "ui.crm.pipeline.stages.partner",
        values: {
          en: "Partners",
          de: "Partner",
          pl: "Partnerzy",
          es: "Socios",
          fr: "Partenaires",
          ja: "パートナー",
        }
      },

      // ============================================================
      // PIPELINE UI MESSAGES
      // ============================================================
      {
        key: "ui.crm.pipeline.contact_count",
        values: {
          en: "contact",
          de: "Kontakt",
          pl: "kontakt",
          es: "contacto",
          fr: "contact",
          ja: "連絡先",
        }
      },
      {
        key: "ui.crm.pipeline.no_contacts",
        values: {
          en: "No contacts in this stage",
          de: "Keine Kontakte in dieser Phase",
          pl: "Brak kontaktów na tym etapie",
          es: "No hay contactos en esta etapa",
          fr: "Aucun contact dans cette étape",
          ja: "この段階には連絡先がありません",
        }
      },
      {
        key: "ui.crm.pipeline.drag_hint",
        values: {
          en: "Drag contacts between stages to update their lifecycle",
          de: "Ziehen Sie Kontakte zwischen den Phasen, um ihren Lebenszyklus zu aktualisieren",
          pl: "Przeciągnij kontakty między etapami, aby zaktualizować ich cykl życia",
          es: "Arrastra contactos entre etapas para actualizar su ciclo de vida",
          fr: "Faites glisser les contacts entre les étapes pour mettre à jour leur cycle de vie",
          ja: "ライフサイクルを更新するには、ステージ間で連絡先をドラッグします",
        }
      },
      {
        key: "ui.crm.pipeline.total_value",
        values: {
          en: "Total Value",
          de: "Gesamtwert",
          pl: "Całkowita wartość",
          es: "Valor total",
          fr: "Valeur totale",
          ja: "合計値",
        }
      },
      {
        key: "ui.crm.pipeline.avg_value",
        values: {
          en: "Avg. Value",
          de: "Durchschn. Wert",
          pl: "Średnia wartość",
          es: "Valor promedio",
          fr: "Valeur moyenne",
          ja: "平均値",
        }
      },
      {
        key: "ui.crm.pipeline.update_failed",
        values: {
          en: "Failed to move contact. Please try again.",
          de: "Kontakt konnte nicht verschoben werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się przenieść kontaktu. Spróbuj ponownie.",
          es: "Error al mover el contacto. Por favor, inténtelo de nuevo.",
          fr: "Échec du déplacement du contact. Veuillez réessayer.",
          ja: "連絡先の移動に失敗しました。もう一度お試しください。",
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
            "pipeline"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} pipeline translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  },
});
