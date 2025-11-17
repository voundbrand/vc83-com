/**
 * WORKFLOWS WINDOW TRANSLATIONS
 *
 * Translation seeds for the workflows management system.
 * Namespace: ui.workflows
 * Run: npx convex run translations/seedWorkflowsTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Workflows translations...");

    // Get system organization and user
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

    // Define translations with multi-locale structure
    const translations = [
      // ========================================
      // MAIN WINDOW
      // ========================================
      { key: "ui.workflows.title", values: { en: "WORKFLOWS", de: "WORKFLOWS", es: "FLUJOS DE TRABAJO", fr: "FLUX DE TRAVAIL", ja: "ワークフロー", pl: "PRZEPŁYWY PRACY" } },
      { key: "ui.workflows.subtitle", values: { en: "Orchestrate multi-object behaviors and automation", de: "Multi-Objekt-Verhaltensweisen und Automatisierung orchestrieren", es: "Orquestar comportamientos y automatización de múltiples objetos", fr: "Orchestrer les comportements multi-objets et l'automatisation", ja: "マルチオブジェクトの動作と自動化を調整", pl: "Orkiestruj zachowania wielu obiektów i automatyzację" } },
      { key: "ui.workflows.button.create", values: { en: "CREATE", de: "ERSTELLEN", es: "CREAR", fr: "CRÉER", ja: "作成", pl: "UTWÓRZ" } },

      // ========================================
      // TABS
      // ========================================
      { key: "ui.workflows.tab.all", values: { en: "All Workflows", de: "Alle Workflows", es: "Todos los Flujos", fr: "Tous les Flux", ja: "すべてのワークフロー", pl: "Wszystkie Przepływy" } },
      { key: "ui.workflows.tab.builder", values: { en: "Builder", de: "Builder", es: "Constructor", fr: "Constructeur", ja: "ビルダー", pl: "Kreator" } },
      { key: "ui.workflows.tab.templates", values: { en: "Templates", de: "Vorlagen", es: "Plantillas", fr: "Modèles", ja: "テンプレート", pl: "Szablony" } },
      { key: "ui.workflows.tab.settings", values: { en: "Settings", de: "Einstellungen", es: "Configuración", fr: "Paramètres", ja: "設定", pl: "Ustawienia" } },

      // ========================================
      // AUTH REQUIRED
      // ========================================
      { key: "ui.workflows.auth_required.title", values: { en: "Authentication Required", de: "Authentifizierung erforderlich", es: "Autenticación Requerida", fr: "Authentification Requise", ja: "認証が必要です", pl: "Wymagana Autoryzacja" } },
      { key: "ui.workflows.auth_required.message", values: { en: "Please sign in to access the Workflows app", de: "Bitte melden Sie sich an, um auf die Workflows-App zuzugreifen", es: "Inicie sesión para acceder a la aplicación de Flujos de Trabajo", fr: "Veuillez vous connecter pour accéder à l'application Flux de Travail", ja: "ワークフローアプリにアクセスするにはサインインしてください", pl: "Zaloguj się, aby uzyskać dostęp do aplikacji Przepływy Pracy" } },

      // ========================================
      // TEMPLATES PLACEHOLDER
      // ========================================
      { key: "ui.workflows.templates.title", values: { en: "WORKFLOW TEMPLATES", de: "WORKFLOW-VORLAGEN", es: "PLANTILLAS DE FLUJO", fr: "MODÈLES DE FLUX", ja: "ワークフローテンプレート", pl: "SZABLONY PRZEPŁYWÓW" } },
      { key: "ui.workflows.templates.message", values: { en: "Pre-built workflow templates coming soon", de: "Vorgefertigte Workflow-Vorlagen kommen bald", es: "Plantillas de flujo preconfiguradas próximamente", fr: "Modèles de flux pré-construits à venir", ja: "事前構築されたワークフローテンプレートは近日公開", pl: "Gotowe szablony przepływów już wkrótce" } },

      // ========================================
      // SETTINGS PLACEHOLDER
      // ========================================
      { key: "ui.workflows.settings.title", values: { en: "WORKFLOW SETTINGS", de: "WORKFLOW-EINSTELLUNGEN", es: "CONFIGURACIÓN DE FLUJO", fr: "PARAMÈTRES DE FLUX", ja: "ワークフロー設定", pl: "USTAWIENIA PRZEPŁYWÓW" } },
      { key: "ui.workflows.settings.message", values: { en: "Workflow system settings coming soon", de: "Workflow-Systemeinstellungen kommen bald", es: "Configuración del sistema de flujo próximamente", fr: "Paramètres système de flux à venir", ja: "ワークフローシステム設定は近日公開", pl: "Ustawienia systemu przepływów już wkrótce" } },

      // ========================================
      // WORKFLOW LIST - EMPTY STATE
      // ========================================
      { key: "ui.workflows.empty.title", values: { en: "No workflows yet", de: "Noch keine Workflows", es: "Aún no hay flujos", fr: "Aucun flux pour le moment", ja: "まだワークフローがありません", pl: "Jeszcze brak przepływów" } },
      { key: "ui.workflows.empty.description", values: { en: "Create your first workflow to orchestrate multi-object behaviors and automation.", de: "Erstellen Sie Ihren ersten Workflow, um Multi-Objekt-Verhaltensweisen und Automatisierung zu orchestrieren.", es: "Cree su primer flujo para orquestar comportamientos y automatización de múltiples objetos.", fr: "Créez votre premier flux pour orchestrer les comportements multi-objets et l'automatisation.", ja: "最初のワークフローを作成して、マルチオブジェクトの動作と自動化を調整します。", pl: "Utwórz swój pierwszy przepływ, aby orkiestrować zachowania wielu obiektów i automatyzację." } },
      { key: "ui.workflows.empty.action", values: { en: "Create Your First Workflow", de: "Erstellen Sie Ihren ersten Workflow", es: "Crear su Primer Flujo", fr: "Créer Votre Premier Flux", ja: "最初のワークフローを作成", pl: "Utwórz Swój Pierwszy Przepływ" } },

      // ========================================
      // WORKFLOW LIST - SEARCH & FILTERS
      // ========================================
      { key: "ui.workflows.list.search.placeholder", values: { en: "Search workflows...", de: "Workflows suchen...", es: "Buscar flujos...", fr: "Rechercher des flux...", ja: "ワークフローを検索...", pl: "Szukaj przepływów..." } },
      { key: "ui.workflows.list.filters.status.all", values: { en: "All Status", de: "Alle Status", es: "Todos los Estados", fr: "Tous les Statuts", ja: "すべてのステータス", pl: "Wszystkie Statusy" } },
      { key: "ui.workflows.list.filters.status.active", values: { en: "Active", de: "Aktiv", es: "Activo", fr: "Actif", ja: "アクティブ", pl: "Aktywne" } },
      { key: "ui.workflows.list.filters.status.draft", values: { en: "Draft", de: "Entwurf", es: "Borrador", fr: "Brouillon", ja: "下書き", pl: "Szkic" } },
      { key: "ui.workflows.list.filters.status.archived", values: { en: "Archived", de: "Archiviert", es: "Archivado", fr: "Archivé", ja: "アーカイブ済み", pl: "Zarchiwizowane" } },
      { key: "ui.workflows.list.filters.type.all", values: { en: "All Types", de: "Alle Typen", es: "Todos los Tipos", fr: "Tous les Types", ja: "すべてのタイプ", pl: "Wszystkie Typy" } },
      { key: "ui.workflows.list.filters.type.checkout", values: { en: "Checkout Flow", de: "Checkout-Ablauf", es: "Flujo de Pago", fr: "Flux de Paiement", ja: "チェックアウトフロー", pl: "Przepływ Płatności" } },
      { key: "ui.workflows.list.filters.type.form", values: { en: "Form Processing", de: "Formularverarbeitung", es: "Procesamiento de Formularios", fr: "Traitement de Formulaires", ja: "フォーム処理", pl: "Przetwarzanie Formularzy" } },
      { key: "ui.workflows.list.filters.type.event", values: { en: "Event Registration", de: "Veranstaltungsregistrierung", es: "Registro de Eventos", fr: "Inscription aux Événements", ja: "イベント登録", pl: "Rejestracja Wydarzeń" } },

      // ========================================
      // WORKFLOW LIST - STATS & SECTIONS
      // ========================================
      { key: "ui.workflows.list.stats.active", values: { en: "Active", de: "Aktiv", es: "Activo", fr: "Actif", ja: "アクティブ", pl: "Aktywne" } },
      { key: "ui.workflows.list.stats.draft", values: { en: "Draft", de: "Entwurf", es: "Borrador", fr: "Brouillon", ja: "下書き", pl: "Szkic" } },
      { key: "ui.workflows.list.stats.archived", values: { en: "Archived", de: "Archiviert", es: "Archivado", fr: "Archivé", ja: "アーカイブ済み", pl: "Zarchiwizowane" } },
      { key: "ui.workflows.list.sections.active", values: { en: "Active Workflows", de: "Aktive Workflows", es: "Flujos Activos", fr: "Flux Actifs", ja: "アクティブなワークフロー", pl: "Aktywne Przepływy" } },
      { key: "ui.workflows.list.sections.draft", values: { en: "Draft Workflows", de: "Workflow-Entwürfe", es: "Flujos en Borrador", fr: "Flux Brouillons", ja: "下書きワークフロー", pl: "Przepływy Robocze" } },
      { key: "ui.workflows.list.sections.archived", values: { en: "Archived Workflows", de: "Archivierte Workflows", es: "Flujos Archivados", fr: "Flux Archivés", ja: "アーカイブされたワークフロー", pl: "Zarchiwizowane Przepływy" } },
      { key: "ui.workflows.list.noResults", values: { en: "No workflows match your filters", de: "Keine Workflows entsprechen Ihren Filtern", es: "Ningún flujo coincide con sus filtros", fr: "Aucun flux ne correspond à vos filtres", ja: "フィルターに一致するワークフローがありません", pl: "Żadne przepływy nie pasują do twoich filtrów" } },

      // ========================================
      // WORKFLOW CARD - STATUS
      // ========================================
      { key: "ui.workflows.card.status.active", values: { en: "Active", de: "Aktiv", es: "Activo", fr: "Actif", ja: "アクティブ", pl: "Aktywne" } },
      { key: "ui.workflows.card.status.draft", values: { en: "Draft", de: "Entwurf", es: "Borrador", fr: "Brouillon", ja: "下書き", pl: "Szkic" } },
      { key: "ui.workflows.card.status.archived", values: { en: "Archived", de: "Archiviert", es: "Archivado", fr: "Archivé", ja: "アーカイブ済み", pl: "Zarchiwizowane" } },

      // ========================================
      // WORKFLOW CARD - STATS
      // ========================================
      { key: "ui.workflows.card.stats.objects", values: { en: "Objects", de: "Objekte", es: "Objetos", fr: "Objets", ja: "オブジェクト", pl: "Obiekty" } },
      { key: "ui.workflows.card.stats.behaviors", values: { en: "Behaviors", de: "Verhaltensweisen", es: "Comportamientos", fr: "Comportements", ja: "動作", pl: "Zachowania" } },
      { key: "ui.workflows.card.trigger.label", values: { en: "Trigger", de: "Auslöser", es: "Disparador", fr: "Déclencheur", ja: "トリガー", pl: "Wyzwalacz" } },

      // ========================================
      // WORKFLOW CARD - MENU
      // ========================================
      { key: "ui.workflows.card.menu.edit", values: { en: "Edit Workflow", de: "Workflow bearbeiten", es: "Editar Flujo", fr: "Modifier le Flux", ja: "ワークフローを編集", pl: "Edytuj Przepływ" } },
      { key: "ui.workflows.card.menu.activate", values: { en: "Activate", de: "Aktivieren", es: "Activar", fr: "Activer", ja: "アクティブ化", pl: "Aktywuj" } },
      { key: "ui.workflows.card.menu.setDraft", values: { en: "Set to Draft", de: "Als Entwurf setzen", es: "Establecer como Borrador", fr: "Définir comme Brouillon", ja: "下書きに設定", pl: "Ustaw jako Szkic" } },
      { key: "ui.workflows.card.menu.duplicate", values: { en: "Duplicate", de: "Duplizieren", es: "Duplicar", fr: "Dupliquer", ja: "複製", pl: "Duplikuj" } },
      { key: "ui.workflows.card.menu.archive", values: { en: "Archive", de: "Archivieren", es: "Archivar", fr: "Archiver", ja: "アーカイブ", pl: "Archiwizuj" } },
      { key: "ui.workflows.card.menu.confirmDelete", values: { en: "Are you sure you want to archive this workflow?", de: "Möchten Sie diesen Workflow wirklich archivieren?", es: "¿Está seguro de que desea archivar este flujo?", fr: "Êtes-vous sûr de vouloir archiver ce flux ?", ja: "このワークフローをアーカイブしてもよろしいですか？", pl: "Czy na pewno chcesz zarchiwizować ten przepływ?" } },
      { key: "ui.workflows.card.menu.copySuffix", values: { en: "(Copy)", de: "(Kopie)", es: "(Copia)", fr: "(Copie)", ja: "（コピー）", pl: "(Kopia)" } },

      // ========================================
      // WORKFLOW CARD - ACTIONS
      // ========================================
      { key: "ui.workflows.card.actions.runNow.label", values: { en: "Run Now", de: "Jetzt ausführen", es: "Ejecutar Ahora", fr: "Exécuter Maintenant", ja: "今すぐ実行", pl: "Uruchom Teraz" } },
      { key: "ui.workflows.card.actions.runNow.tooltip", values: { en: "Manually execute this workflow", de: "Diesen Workflow manuell ausführen", es: "Ejecutar este flujo manualmente", fr: "Exécuter ce flux manuellement", ja: "このワークフローを手動で実行", pl: "Ręcznie uruchom ten przepływ" } },
      { key: "ui.workflows.card.actions.running", values: { en: "Running...", de: "Wird ausgeführt...", es: "Ejecutando...", fr: "En cours d'exécution...", ja: "実行中...", pl: "Uruchamianie..." } },
      { key: "ui.workflows.card.actions.autoTrigger.label", values: { en: "Auto-trigger only", de: "Nur Auto-Trigger", es: "Solo auto-disparo", fr: "Déclenchement automatique uniquement", ja: "自動トリガーのみ", pl: "Tylko auto-wyzwalacz" } },
      { key: "ui.workflows.card.actions.autoTrigger.tooltip", values: { en: "This workflow can only be triggered automatically", de: "Dieser Workflow kann nur automatisch ausgelöst werden", es: "Este flujo solo puede dispararse automáticamente", fr: "Ce flux ne peut être déclenché qu'automatiquement", ja: "このワークフローは自動的にのみトリガーできます", pl: "Ten przepływ może być wyzwalany tylko automatycznie" } },
      { key: "ui.workflows.card.actions.edit", values: { en: "Edit", de: "Bearbeiten", es: "Editar", fr: "Modifier", ja: "編集", pl: "Edytuj" } },

      // ========================================
      // WORKFLOW CARD - EXECUTION
      // ========================================
      { key: "ui.workflows.card.execution.success.title", values: { en: "Workflow Executed", de: "Workflow ausgeführt", es: "Flujo Ejecutado", fr: "Flux Exécuté", ja: "ワークフロー実行完了", pl: "Przepływ Wykonany" } },
      { key: "ui.workflows.card.execution.success.message", values: { en: "Workflow completed successfully", de: "Workflow erfolgreich abgeschlossen", es: "Flujo completado exitosamente", fr: "Flux terminé avec succès", ja: "ワークフローが正常に完了しました", pl: "Przepływ zakończony pomyślnie" } },
      { key: "ui.workflows.card.execution.failed.title", values: { en: "Workflow Failed", de: "Workflow fehlgeschlagen", es: "Flujo Fallido", fr: "Flux Échoué", ja: "ワークフロー失敗", pl: "Przepływ Nieudany" } },
      { key: "ui.workflows.card.execution.failed.message", values: { en: "Workflow execution failed", de: "Workflow-Ausführung fehlgeschlagen", es: "La ejecución del flujo falló", fr: "L'exécution du flux a échoué", ja: "ワークフローの実行に失敗しました", pl: "Wykonanie przepływu nie powiodło się" } },
      { key: "ui.workflows.card.execution.error.title", values: { en: "Execution Error", de: "Ausführungsfehler", es: "Error de Ejecución", fr: "Erreur d'Exécution", ja: "実行エラー", pl: "Błąd Wykonania" } },
      { key: "ui.workflows.card.execution.error.message", values: { en: "An error occurred during execution", de: "Bei der Ausführung ist ein Fehler aufgetreten", es: "Ocurrió un error durante la ejecución", fr: "Une erreur s'est produite lors de l'exécution", ja: "実行中にエラーが発生しました", pl: "Wystąpił błąd podczas wykonywania" } },

      // ========================================
      // WORKFLOW CARD - EXPORT
      // ========================================
      { key: "ui.workflows.card.export.title", values: { en: "Logs Exported", de: "Logs exportiert", es: "Registros Exportados", fr: "Journaux Exportés", ja: "ログがエクスポートされました", pl: "Logi Wyeksportowane" } },
      { key: "ui.workflows.card.export.success", values: { en: "Workflow execution logs have been downloaded", de: "Workflow-Ausführungslogs wurden heruntergeladen", es: "Los registros de ejecución del flujo se han descargado", fr: "Les journaux d'exécution du flux ont été téléchargés", ja: "ワークフロー実行ログがダウンロードされました", pl: "Logi wykonania przepływu zostały pobrane" } },

      // ========================================
      // WORKFLOW CARD - MODAL
      // ========================================
      { key: "ui.workflows.card.modal.title", values: { en: "Workflow Execution Progress", de: "Workflow-Ausführungsfortschritt", es: "Progreso de Ejecución del Flujo", fr: "Progression de l'Exécution du Flux", ja: "ワークフロー実行の進行状況", pl: "Postęp Wykonania Przepływu" } },
      { key: "ui.workflows.card.modal.executing", values: { en: "Executing workflow...", de: "Workflow wird ausgeführt...", es: "Ejecutando flujo...", fr: "Exécution du flux...", ja: "ワークフローを実行中...", pl: "Wykonywanie przepływu..." } },
      { key: "ui.workflows.card.modal.completed", values: { en: "Workflow completed successfully!", de: "Workflow erfolgreich abgeschlossen!", es: "¡Flujo completado exitosamente!", fr: "Flux terminé avec succès !", ja: "ワークフローが正常に完了しました！", pl: "Przepływ zakończony pomyślnie!" } },
      { key: "ui.workflows.card.modal.failed", values: { en: "Workflow execution failed", de: "Workflow-Ausführung fehlgeschlagen", es: "La ejecución del flujo falló", fr: "L'exécution du flux a échoué", ja: "ワークフローの実行に失敗しました", pl: "Wykonanie przepływu nie powiodło się" } },
      { key: "ui.workflows.card.modal.viewInvoice.title", values: { en: "View Invoice", de: "Rechnung anzeigen", es: "Ver Factura", fr: "Voir la Facture", ja: "請求書を表示", pl: "Zobacz Fakturę" } },
      { key: "ui.workflows.card.modal.viewInvoice.message", values: { en: "Invoice {{invoiceNumber}} created", de: "Rechnung {{invoiceNumber}} erstellt", es: "Factura {{invoiceNumber}} creada", fr: "Facture {{invoiceNumber}} créée", ja: "請求書 {{invoiceNumber}} が作成されました", pl: "Faktura {{invoiceNumber}} utworzona" } },
      { key: "ui.workflows.card.modal.viewInvoice.button", values: { en: "View Invoice", de: "Rechnung anzeigen", es: "Ver Factura", fr: "Voir la Facture", ja: "請求書を表示", pl: "Zobacz Fakturę" } },
      { key: "ui.workflows.card.modal.exportLogs", values: { en: "Export Logs", de: "Logs exportieren", es: "Exportar Registros", fr: "Exporter les Journaux", ja: "ログをエクスポート", pl: "Eksportuj Logi" } },
      { key: "ui.workflows.card.modal.close", values: { en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", ja: "閉じる", pl: "Zamknij" } },

      // ========================================
      // WORKFLOW BUILDER - HEADER
      // ========================================
      { key: "ui.workflows.builder.header.back", values: { en: "Back", de: "Zurück", es: "Volver", fr: "Retour", ja: "戻る", pl: "Wstecz" } },
      { key: "ui.workflows.builder.header.help", values: { en: "Help", de: "Hilfe", es: "Ayuda", fr: "Aide", ja: "ヘルプ", pl: "Pomoc" } },
      { key: "ui.workflows.builder.header.helpTooltip", values: { en: "Show workflow builder help", de: "Workflow-Builder-Hilfe anzeigen", es: "Mostrar ayuda del constructor de flujo", fr: "Afficher l'aide du constructeur de flux", ja: "ワークフロービルダーのヘルプを表示", pl: "Pokaż pomoc kreatora przepływów" } },
      { key: "ui.workflows.builder.header.save", values: { en: "Save", de: "Speichern", es: "Guardar", fr: "Enregistrer", ja: "保存", pl: "Zapisz" } },
      { key: "ui.workflows.builder.header.saving", values: { en: "Saving...", de: "Wird gespeichert...", es: "Guardando...", fr: "Enregistrement...", ja: "保存中...", pl: "Zapisywanie..." } },
      { key: "ui.workflows.builder.header.namePlaceholder", values: { en: "Workflow Name", de: "Workflow-Name", es: "Nombre del Flujo", fr: "Nom du Flux", ja: "ワークフロー名", pl: "Nazwa Przepływu" } },
      { key: "ui.workflows.builder.header.descriptionPlaceholder", values: { en: "Add description...", de: "Beschreibung hinzufügen...", es: "Agregar descripción...", fr: "Ajouter une description...", ja: "説明を追加...", pl: "Dodaj opis..." } },
      { key: "ui.workflows.builder.header.subtypePlaceholder", values: { en: "Subtype (e.g. checkout-flow)", de: "Untertyp (z.B. checkout-flow)", es: "Subtipo (ej. checkout-flow)", fr: "Sous-type (ex. checkout-flow)", ja: "サブタイプ（例：checkout-flow）", pl: "Podtyp (np. checkout-flow)" } },
      { key: "ui.workflows.builder.header.subtypeTooltip", values: { en: "Workflow subtype for categorization", de: "Workflow-Untertyp zur Kategorisierung", es: "Subtipo de flujo para categorización", fr: "Sous-type de flux pour la catégorisation", ja: "分類用のワークフローサブタイプ", pl: "Podtyp przepływu do kategoryzacji" } },
      { key: "ui.workflows.builder.header.triggerLabel", values: { en: "Trigger:", de: "Auslöser:", es: "Disparador:", fr: "Déclencheur:", ja: "トリガー：", pl: "Wyzwalacz:" } },
      { key: "ui.workflows.builder.header.triggerTooltip", values: { en: "When this workflow should execute", de: "Wann dieser Workflow ausgeführt werden soll", es: "Cuándo debe ejecutarse este flujo", fr: "Quand ce flux doit s'exécuter", ja: "このワークフローを実行するタイミング", pl: "Kiedy ten przepływ powinien się wykonać" } },
      { key: "ui.workflows.builder.header.triggers.manual", values: { en: "Manual (Run Now button)", de: "Manuell (Jetzt ausführen-Button)", es: "Manual (Botón Ejecutar Ahora)", fr: "Manuel (Bouton Exécuter Maintenant)", ja: "手動（今すぐ実行ボタン）", pl: "Ręczny (Przycisk Uruchom Teraz)" } },
      { key: "ui.workflows.builder.header.triggers.scheduled", values: { en: "Scheduled (Time-based)", de: "Geplant (Zeitbasiert)", es: "Programado (Basado en Tiempo)", fr: "Planifié (Basé sur le Temps)", ja: "スケジュール（時間ベース）", pl: "Zaplanowany (Oparty na Czasie)" } },
      { key: "ui.workflows.builder.header.triggers.eventCompletion", values: { en: "Event Completion", de: "Veranstaltungsabschluss", es: "Finalización de Evento", fr: "Achèvement d'Événement", ja: "イベント完了", pl: "Zakończenie Wydarzenia" } },
      { key: "ui.workflows.builder.header.triggers.apiCall", values: { en: "API Call", de: "API-Aufruf", es: "Llamada API", fr: "Appel API", ja: "API呼び出し", pl: "Wywołanie API" } },
      { key: "ui.workflows.builder.header.triggers.checkoutStart", values: { en: "Checkout Start", de: "Checkout-Start", es: "Inicio de Pago", fr: "Début de Paiement", ja: "チェックアウト開始", pl: "Rozpoczęcie Płatności" } },
      { key: "ui.workflows.builder.header.triggers.formSubmit", values: { en: "Form Submit", de: "Formular absenden", es: "Envío de Formulario", fr: "Soumission de Formulaire", ja: "フォーム送信", pl: "Wysłanie Formularza" } },
      { key: "ui.workflows.builder.header.triggers.paymentComplete", values: { en: "Payment Complete", de: "Zahlung abgeschlossen", es: "Pago Completado", fr: "Paiement Terminé", ja: "支払い完了", pl: "Płatność Zakończona" } },

      // ========================================
      // WORKFLOW BUILDER - VALIDATION
      // ========================================
      { key: "ui.workflows.builder.validation.nameRequired.title", values: { en: "Name Required", de: "Name erforderlich", es: "Nombre Requerido", fr: "Nom Requis", ja: "名前が必要です", pl: "Nazwa Wymagana" } },
      { key: "ui.workflows.builder.validation.nameRequired.message", values: { en: "Please enter a workflow name", de: "Bitte geben Sie einen Workflow-Namen ein", es: "Ingrese un nombre de flujo", fr: "Veuillez entrer un nom de flux", ja: "ワークフロー名を入力してください", pl: "Wprowadź nazwę przepływu" } },
      { key: "ui.workflows.builder.validation.emptyWorkflow.title", values: { en: "Empty Workflow", de: "Leerer Workflow", es: "Flujo Vacío", fr: "Flux Vide", ja: "空のワークフロー", pl: "Pusty Przepływ" } },
      { key: "ui.workflows.builder.validation.emptyWorkflow.message", values: { en: "Please add at least one object or behavior to the workflow", de: "Bitte fügen Sie mindestens ein Objekt oder eine Verhaltensweise zum Workflow hinzu", es: "Agregue al menos un objeto o comportamiento al flujo", fr: "Veuillez ajouter au moins un objet ou un comportement au flux", ja: "ワークフローに少なくとも1つのオブジェクトまたは動作を追加してください", pl: "Dodaj przynajmniej jeden obiekt lub zachowanie do przepływu" } },

      // ========================================
      // WORKFLOW BUILDER - SUCCESS
      // ========================================
      { key: "ui.workflows.builder.success.updated.title", values: { en: "Workflow Updated", de: "Workflow aktualisiert", es: "Flujo Actualizado", fr: "Flux Mis à Jour", ja: "ワークフローを更新しました", pl: "Przepływ Zaktualizowany" } },
      { key: "ui.workflows.builder.success.updated.message", values: { en: "Successfully updated {{name}}", de: "{{name}} erfolgreich aktualisiert", es: "{{name}} actualizado exitosamente", fr: "{{name}} mis à jour avec succès", ja: "{{name}}を正常に更新しました", pl: "Pomyślnie zaktualizowano {{name}}" } },
      { key: "ui.workflows.builder.success.created.title", values: { en: "Workflow Created", de: "Workflow erstellt", es: "Flujo Creado", fr: "Flux Créé", ja: "ワークフローを作成しました", pl: "Przepływ Utworzony" } },
      { key: "ui.workflows.builder.success.created.message", values: { en: "Successfully created {{name}}", de: "{{name}} erfolgreich erstellt", es: "{{name}} creado exitosamente", fr: "{{name}} créé avec succès", ja: "{{name}}を正常に作成しました", pl: "Pomyślnie utworzono {{name}}" } },

      // ========================================
      // WORKFLOW BUILDER - ERROR
      // ========================================
      { key: "ui.workflows.builder.error.title", values: { en: "Save Failed", de: "Speichern fehlgeschlagen", es: "Guardado Fallido", fr: "Échec de l'Enregistrement", ja: "保存に失敗しました", pl: "Zapisywanie Nieudane" } },
      { key: "ui.workflows.builder.error.message", values: { en: "Failed to save workflow: {{error}}", de: "Workflow konnte nicht gespeichert werden: {{error}}", es: "Error al guardar el flujo: {{error}}", fr: "Échec de l'enregistrement du flux : {{error}}", ja: "ワークフローの保存に失敗しました：{{error}}", pl: "Nie udało się zapisać przepływu: {{error}}" } },

      // ========================================
      // CANVAS - EMPTY STATE (Builder Tab)
      // ========================================
      // Note: These use the shortened format without "ui.workflows." prefix
      // Component uses: t("canvas.empty.title") with useNamespaceTranslations("ui.workflows")
      { key: "ui.workflows.canvas.empty.title", values: { en: "Empty Workflow", de: "Leerer Workflow", es: "Flujo Vacío", fr: "Flux Vide", ja: "空のワークフロー", pl: "Pusty Przepływ" } },
      { key: "ui.workflows.canvas.empty.description", values: { en: "Add objects from the left panel and behaviors from the right panel to build your workflow.", de: "Fügen Sie Objekte aus dem linken Panel und Verhaltensweisen aus dem rechten Panel hinzu, um Ihren Workflow zu erstellen.", es: "Agregue objetos del panel izquierdo y comportamientos del panel derecho para construir su flujo.", fr: "Ajoutez des objets depuis le panneau de gauche et des comportements depuis le panneau de droite pour créer votre flux.", ja: "左側のパネルからオブジェクトを追加し、右側のパネルから動作を追加してワークフローを構築します。", pl: "Dodaj obiekty z lewego panelu i zachowania z prawego panelu, aby zbudować przepływ." } },
      { key: "ui.workflows.canvas.empty.quickStart.title", values: { en: "💡 Quick Start:", de: "💡 Schnellstart:", es: "💡 Inicio Rápido:", fr: "💡 Démarrage Rapide:", ja: "💡 クイックスタート：", pl: "💡 Szybki Start:" } },
      { key: "ui.workflows.canvas.empty.quickStart.step1", values: { en: "1. Add objects (products, forms, checkouts) from the left panel", de: "1. Fügen Sie Objekte (Produkte, Formulare, Checkouts) aus dem linken Panel hinzu", es: "1. Agregue objetos (productos, formularios, pagos) del panel izquierdo", fr: "1. Ajoutez des objets (produits, formulaires, paiements) depuis le panneau de gauche", ja: "1. 左側のパネルからオブジェクト（製品、フォーム、チェックアウト）を追加", pl: "1. Dodaj obiekty (produkty, formularze, płatności) z lewego panelu" } },
      { key: "ui.workflows.canvas.empty.quickStart.step2", values: { en: "2. Add behaviors (payment processing, invoicing, etc.) from the right panel", de: "2. Fügen Sie Verhaltensweisen (Zahlungsabwicklung, Rechnungsstellung, etc.) aus dem rechten Panel hinzu", es: "2. Agregue comportamientos (procesamiento de pagos, facturación, etc.) del panel derecho", fr: "2. Ajoutez des comportements (traitement des paiements, facturation, etc.) depuis le panneau de droite", ja: "2. 右側のパネルから動作（支払い処理、請求など）を追加", pl: "2. Dodaj zachowania (przetwarzanie płatności, fakturowanie, itp.) z prawego panelu" } },
      { key: "ui.workflows.canvas.empty.quickStart.step3", values: { en: "3. Configure each behavior by clicking the settings icon", de: "3. Konfigurieren Sie jede Verhaltensweise, indem Sie auf das Einstellungssymbol klicken", es: "3. Configure cada comportamiento haciendo clic en el ícono de configuración", fr: "3. Configurez chaque comportement en cliquant sur l'icône des paramètres", ja: "3. 設定アイコンをクリックして各動作を設定", pl: "3. Skonfiguruj każde zachowanie, klikając ikonę ustawień" } },
      { key: "ui.workflows.canvas.empty.quickStart.step4", values: { en: "4. Save and test your workflow", de: "4. Speichern und testen Sie Ihren Workflow", es: "4. Guarde y pruebe su flujo", fr: "4. Enregistrez et testez votre flux", ja: "4. ワークフローを保存してテスト", pl: "4. Zapisz i przetestuj swój przepływ" } },

      // ========================================
      // CANVAS - LEGEND
      // ========================================
      { key: "ui.workflows.canvas.legend.title", values: { en: "Legend", de: "Legende", es: "Leyenda", fr: "Légende", ja: "凡例", pl: "Legenda" } },
      { key: "ui.workflows.canvas.legend.objectFlow", values: { en: "Object Flow", de: "Objektfluss", es: "Flujo de Objetos", fr: "Flux d'Objets", ja: "オブジェクトフロー", pl: "Przepływ Obiektów" } },
      { key: "ui.workflows.canvas.legend.behaviorAction", values: { en: "Behavior Action", de: "Verhaltensaktion", es: "Acción de Comportamiento", fr: "Action de Comportement", ja: "動作アクション", pl: "Akcja Zachowania" } },

      // ========================================
      // CANVAS - NODES
      // ========================================
      { key: "ui.workflows.canvas.nodes.remove", values: { en: "Remove", de: "Entfernen", es: "Eliminar", fr: "Supprimer", ja: "削除", pl: "Usuń" } },
      { key: "ui.workflows.canvas.nodes.priority", values: { en: "Priority", de: "Priorität", es: "Prioridad", fr: "Priorité", ja: "優先度", pl: "Priorytet" } },
      { key: "ui.workflows.canvas.nodes.enabled", values: { en: "Enabled", de: "Aktiviert", es: "Habilitado", fr: "Activé", ja: "有効", pl: "Włączone" } },
      { key: "ui.workflows.canvas.nodes.disabled", values: { en: "Disabled", de: "Deaktiviert", es: "Deshabilitado", fr: "Désactivé", ja: "無効", pl: "Wyłączone" } },

      // ========================================
      // CANVAS - EDGES (Connection Labels)
      // ========================================
      // Note: These use the shortened format without "ui.workflows." prefix
      // because useNamespaceTranslations("ui.workflows") automatically adds it
      { key: "ui.workflows.canvas.edges.collectsDataFor", values: { en: "collects data for", de: "sammelt Daten für", es: "recopila datos para", fr: "collecte des données pour", ja: "データを収集", pl: "zbiera dane dla" } },
      { key: "ui.workflows.canvas.edges.soldThrough", values: { en: "sold through", de: "verkauft über", es: "vendido a través de", fr: "vendu via", ja: "販売経路", pl: "sprzedawane przez" } },
      { key: "ui.workflows.canvas.edges.collectedIn", values: { en: "collected in", de: "gesammelt in", es: "recopilado en", fr: "collecté dans", ja: "収集先", pl: "zebrane w" } },
      { key: "ui.workflows.canvas.edges.linksToWorkflow", values: { en: "links to workflow", de: "verknüpft mit Workflow", es: "enlaza con flujo", fr: "lié au flux", ja: "ワークフローにリンク", pl: "łączy z przepływem" } },
      { key: "ui.workflows.canvas.edges.duringCheckout", values: { en: "during checkout", de: "während des Checkouts", es: "durante el pago", fr: "pendant le paiement", ja: "チェックアウト中", pl: "podczas płatności" } },
      { key: "ui.workflows.canvas.edges.readsResponsesFrom", values: { en: "reads responses from", de: "liest Antworten von", es: "lee respuestas de", fr: "lit les réponses de", ja: "応答を読み取る元", pl: "odczytuje odpowiedzi z" } },
      { key: "ui.workflows.canvas.edges.addsAddons", values: { en: "adds {{count}} add-ons", de: "fügt {{count}} Add-ons hinzu", es: "agrega {{count}} complementos", fr: "ajoute {{count}} modules complémentaires", ja: "{{count}}個のアドオンを追加", pl: "dodaje {{count}} dodatków" } },
      { key: "ui.workflows.canvas.edges.detectsEmployerFrom", values: { en: "detects employer from", de: "erkennt Arbeitgeber von", es: "detecta empleador de", fr: "détecte l'employeur de", ja: "雇用主を検出", pl: "wykrywa pracodawcę z" } },
      { key: "ui.workflows.canvas.edges.autoFillsBilling", values: { en: "auto-fills billing", de: "füllt Abrechnung automatisch aus", es: "rellena facturación automáticamente", fr: "remplit automatiquement la facturation", ja: "請求を自動入力", pl: "automatycznie wypełnia rozliczenia" } },
      { key: "ui.workflows.canvas.edges.mapsOrganizationFrom", values: { en: "maps organization from", de: "ordnet Organisation von", es: "mapea organización de", fr: "mappe l'organisation de", ja: "組織をマッピング", pl: "mapuje organizację z" } },
      { key: "ui.workflows.canvas.edges.createsInvoiceFor", values: { en: "creates invoice for", de: "erstellt Rechnung für", es: "crea factura para", fr: "crée une facture pour", ja: "請求書を作成", pl: "tworzy fakturę dla" } },
      { key: "ui.workflows.canvas.edges.processesPayment", values: { en: "processes payment", de: "verarbeitet Zahlung", es: "procesa pago", fr: "traite le paiement", ja: "支払いを処理", pl: "przetwarza płatność" } },
      { key: "ui.workflows.canvas.edges.generatesInvoice", values: { en: "generates invoice", de: "generiert Rechnung", es: "genera factura", fr: "génère une facture", ja: "請求書を生成", pl: "generuje fakturę" } },
      { key: "ui.workflows.canvas.edges.calculatesTax", values: { en: "calculates tax", de: "berechnet Steuer", es: "calcula impuestos", fr: "calcule la taxe", ja: "税金を計算", pl: "oblicza podatek" } },
      { key: "ui.workflows.canvas.edges.configuresPayment", values: { en: "configures payment options", de: "konfiguriert Zahlungsoptionen", es: "configura opciones de pago", fr: "configure les options de paiement", ja: "支払いオプションを設定", pl: "konfiguruje opcje płatności" } },

      // ========================================
      // OBJECT SELECTOR PANEL (Builder Tab)
      // ========================================
      // Note: These use the shortened format without "ui.workflows." prefix
      // Component uses: t("objectSelector.title") with useNamespaceTranslations("ui.workflows")
      { key: "ui.workflows.objectSelector.title", values: { en: "OBJECTS", de: "OBJEKTE", es: "OBJETOS", fr: "OBJETS", ja: "オブジェクト", pl: "OBIEKTY" } },
      { key: "ui.workflows.objectSelector.description", values: { en: "Add objects to your workflow", de: "Objekte zu Ihrem Workflow hinzufügen", es: "Agregar objetos a su flujo", fr: "Ajouter des objets à votre flux", ja: "ワークフローにオブジェクトを追加", pl: "Dodaj obiekty do przepływu" } },
      { key: "ui.workflows.objectSelector.searchPlaceholder", values: { en: "Search objects...", de: "Objekte suchen...", es: "Buscar objetos...", fr: "Rechercher des objets...", ja: "オブジェクトを検索...", pl: "Szukaj obiektów..." } },
      { key: "ui.workflows.objectSelector.filters.all", values: { en: "All", de: "Alle", es: "Todos", fr: "Tous", ja: "すべて", pl: "Wszystkie" } },
      { key: "ui.workflows.objectSelector.filters.products", values: { en: "Products", de: "Produkte", es: "Productos", fr: "Produits", ja: "製品", pl: "Produkty" } },
      { key: "ui.workflows.objectSelector.filters.forms", values: { en: "Forms", de: "Formulare", es: "Formularios", fr: "Formulaires", ja: "フォーム", pl: "Formularze" } },
      { key: "ui.workflows.objectSelector.filters.checkouts", values: { en: "Checkouts", de: "Checkouts", es: "Pagos", fr: "Paiements", ja: "チェックアウト", pl: "Płatności" } },
      { key: "ui.workflows.objectSelector.filters.crmOrgs", values: { en: "CRM Orgs", de: "CRM-Organisationen", es: "Organizaciones CRM", fr: "Organisations CRM", ja: "CRM組織", pl: "Organizacje CRM" } },
      { key: "ui.workflows.objectSelector.filters.crmContacts", values: { en: "CRM Contacts", de: "CRM-Kontakte", es: "Contactos CRM", fr: "Contacts CRM", ja: "CRM連絡先", pl: "Kontakty CRM" } },
      { key: "ui.workflows.objectSelector.noObjectsFound", values: { en: "No objects found", de: "Keine Objekte gefunden", es: "No se encontraron objetos", fr: "Aucun objet trouvé", ja: "オブジェクトが見つかりません", pl: "Nie znaleziono obiektów" } },
      { key: "ui.workflows.objectSelector.selectedCount", values: { en: "{{count}} selected", de: "{{count}} ausgewählt", es: "{{count}} seleccionados", fr: "{{count}} sélectionnés", ja: "{{count}}個選択済み", pl: "{{count}} wybranych" } },

      // ========================================
      // BEHAVIOR CONFIG PANEL (Builder Tab)
      // ========================================
      // Note: These use the shortened format without "ui.workflows." prefix
      // Component uses: t("behaviorConfig.title") with useNamespaceTranslations("ui.workflows")
      { key: "ui.workflows.behaviorConfig.title", values: { en: "BEHAVIORS", de: "VERHALTENSWEISEN", es: "COMPORTAMIENTOS", fr: "COMPORTEMENTS", ja: "動作", pl: "ZACHOWANIA" } },
      { key: "ui.workflows.behaviorConfig.description", values: { en: "Configure workflow behaviors", de: "Workflow-Verhaltensweisen konfigurieren", es: "Configurar comportamientos del flujo", fr: "Configurer les comportements du flux", ja: "ワークフローの動作を設定", pl: "Skonfiguruj zachowania przepływu" } },
      { key: "ui.workflows.behaviorConfig.noBehaviors", values: { en: "No behaviors added", de: "Keine Verhaltensweisen hinzugefügt", es: "No se agregaron comportamientos", fr: "Aucun comportement ajouté", ja: "動作が追加されていません", pl: "Nie dodano zachowań" } },
      { key: "ui.workflows.behaviorConfig.clickToAdd", values: { en: "Click + to add behaviors", de: "Klicken Sie auf +, um Verhaltensweisen hinzuzufügen", es: "Haga clic en + para agregar comportamientos", fr: "Cliquez sur + pour ajouter des comportements", ja: "+をクリックして動作を追加", pl: "Kliknij +, aby dodać zachowania" } },
      { key: "ui.workflows.behaviorConfig.addModal.title", values: { en: "ADD BEHAVIOR", de: "VERHALTENSWEISE HINZUFÜGEN", es: "AGREGAR COMPORTAMIENTO", fr: "AJOUTER COMPORTEMENT", ja: "動作を追加", pl: "DODAJ ZACHOWANIE" } },
      { key: "ui.workflows.behaviorConfig.addModal.description", values: { en: "Select a behavior type to add to your workflow", de: "Wählen Sie einen Verhaltenstyp aus, um ihn zu Ihrem Workflow hinzuzufügen", es: "Seleccione un tipo de comportamiento para agregar a su flujo", fr: "Sélectionnez un type de comportement à ajouter à votre flux", ja: "ワークフローに追加する動作タイプを選択", pl: "Wybierz typ zachowania do dodania do przepływu" } },
      { key: "ui.workflows.behaviorConfig.behaviorCount", values: { en: "{{count}} configured", de: "{{count}} konfiguriert", es: "{{count}} configurados", fr: "{{count}} configurés", ja: "{{count}}個設定済み", pl: "{{count}} skonfigurowanych" } },
      { key: "ui.workflows.behaviorConfig.priority", values: { en: "Priority", de: "Priorität", es: "Prioridad", fr: "Priorité", ja: "優先度", pl: "Priorytet" } },
      { key: "ui.workflows.behaviorConfig.enabled", values: { en: "Enabled", de: "Aktiviert", es: "Habilitado", fr: "Activé", ja: "有効", pl: "Włączone" } },
      { key: "ui.workflows.behaviorConfig.disabled", values: { en: "Disabled", de: "Deaktiviert", es: "Deshabilitado", fr: "Désactivé", ja: "無効", pl: "Wyłączone" } },
      { key: "ui.workflows.behaviorConfig.appliedTo", values: { en: "Applied to:", de: "Angewendet auf:", es: "Aplicado a:", fr: "Appliqué à:", ja: "適用先：", pl: "Zastosowane do:" } },
      { key: "ui.workflows.behaviorConfig.missingObjects", values: { en: "Missing required objects: {{objects}}", de: "Fehlende erforderliche Objekte: {{objects}}", es: "Objetos requeridos faltantes: {{objects}}", fr: "Objets requis manquants : {{objects}}", ja: "必要なオブジェクトがありません：{{objects}}", pl: "Brakujące wymagane obiekty: {{objects}}" } },

      // ========================================
      // BEHAVIOR TYPES - NAMES
      // ========================================
      { key: "ui.workflows.behaviorTypes.conditional.name", values: { en: "Conditional Branch", de: "Bedingte Verzweigung", es: "Rama Condicional", fr: "Branche Conditionnelle", ja: "条件分岐", pl: "Rozgałęzienie Warunkowe" } },
      { key: "ui.workflows.behaviorTypes.conditional.description", values: { en: "Add IF/ELSE branching logic based on conditions", de: "WENN/SONST-Verzweigungslogik basierend auf Bedingungen hinzufügen", es: "Agregar lógica de ramificación IF/ELSE basada en condiciones", fr: "Ajouter une logique de branchement IF/ELSE basée sur des conditions", ja: "条件に基づくIF/ELSE分岐ロジックを追加", pl: "Dodaj logikę rozgałęzień IF/ELSE na podstawie warunków" } },

      { key: "ui.workflows.behaviorTypes.employerDetection.name", values: { en: "Employer Detection", de: "Arbeitgebererkennung", es: "Detección de Empleador", fr: "Détection d'Employeur", ja: "雇用主検出", pl: "Wykrywanie Pracodawcy" } },
      { key: "ui.workflows.behaviorTypes.employerDetection.description", values: { en: "Detect employer from form data and match to CRM", de: "Arbeitgeber aus Formulardaten erkennen und mit CRM abgleichen", es: "Detectar empleador de datos del formulario y hacer coincidir con CRM", fr: "Détecter l'employeur à partir des données du formulaire et faire correspondre au CRM", ja: "フォームデータから雇用主を検出してCRMに照合", pl: "Wykryj pracodawcę z danych formularza i dopasuj do CRM" } },

      { key: "ui.workflows.behaviorTypes.invoiceMapping.name", values: { en: "Invoice Mapping", de: "Rechnungszuordnung", es: "Mapeo de Facturas", fr: "Mappage de Factures", ja: "請求書マッピング", pl: "Mapowanie Faktur" } },
      { key: "ui.workflows.behaviorTypes.invoiceMapping.description", values: { en: "Map form values to CRM organizations for invoicing", de: "Formularwerte CRM-Organisationen für die Rechnungsstellung zuordnen", es: "Mapear valores de formulario a organizaciones CRM para facturación", fr: "Mapper les valeurs du formulaire aux organisations CRM pour la facturation", ja: "請求のためにフォーム値をCRM組織にマッピング", pl: "Mapuj wartości formularza do organizacji CRM w celu fakturowania" } },

      { key: "ui.workflows.behaviorTypes.formLinking.name", values: { en: "Form Linking", de: "Formularverknüpfung", es: "Vinculación de Formularios", fr: "Liaison de Formulaires", ja: "フォームリンク", pl: "Łączenie Formularzy" } },
      { key: "ui.workflows.behaviorTypes.formLinking.description", values: { en: "Link forms to checkout flow", de: "Formulare mit Checkout-Ablauf verknüpfen", es: "Vincular formularios al flujo de pago", fr: "Lier les formulaires au flux de paiement", ja: "フォームをチェックアウトフローにリンク", pl: "Połącz formularze z przepływem płatności" } },

      { key: "ui.workflows.behaviorTypes.addonCalculation.name", values: { en: "Add-on Calculation", de: "Add-on-Berechnung", es: "Cálculo de Complementos", fr: "Calcul de Modules Complémentaires", ja: "アドオン計算", pl: "Obliczanie Dodatków" } },
      { key: "ui.workflows.behaviorTypes.addonCalculation.description", values: { en: "Calculate add-ons based on form responses", de: "Add-ons basierend auf Formularantworten berechnen", es: "Calcular complementos basados en respuestas del formulario", fr: "Calculer les modules complémentaires basés sur les réponses du formulaire", ja: "フォーム回答に基づいてアドオンを計算", pl: "Oblicz dodatki na podstawie odpowiedzi formularza" } },

      { key: "ui.workflows.behaviorTypes.paymentProviderSelection.name", values: { en: "Payment Provider Selection", de: "Zahlungsanbieter-Auswahl", es: "Selección de Proveedor de Pago", fr: "Sélection du Fournisseur de Paiement", ja: "支払いプロバイダー選択", pl: "Wybór Dostawcy Płatności" } },
      { key: "ui.workflows.behaviorTypes.paymentProviderSelection.description", values: { en: "Control which payment providers are available based on conditions", de: "Steuern Sie, welche Zahlungsanbieter basierend auf Bedingungen verfügbar sind", es: "Controlar qué proveedores de pago están disponibles según condiciones", fr: "Contrôler quels fournisseurs de paiement sont disponibles selon les conditions", ja: "条件に基づいて利用可能な支払いプロバイダーを制御", pl: "Kontroluj, którzy dostawcy płatności są dostępni na podstawie warunków" } },

      { key: "ui.workflows.behaviorTypes.stripePayment.name", values: { en: "Stripe Payment", de: "Stripe-Zahlung", es: "Pago Stripe", fr: "Paiement Stripe", ja: "Stripe支払い", pl: "Płatność Stripe" } },
      { key: "ui.workflows.behaviorTypes.stripePayment.description", values: { en: "Configure Stripe payment processing and styling", de: "Stripe-Zahlungsabwicklung und -Styling konfigurieren", es: "Configurar procesamiento y estilo de pago Stripe", fr: "Configurer le traitement et le style de paiement Stripe", ja: "Stripe支払い処理とスタイリングを設定", pl: "Skonfiguruj przetwarzanie płatności Stripe i stylizację" } },

      { key: "ui.workflows.behaviorTypes.invoicePayment.name", values: { en: "Invoice Payment", de: "Rechnungszahlung", es: "Pago de Factura", fr: "Paiement de Facture", ja: "請求書支払い", pl: "Płatność Fakturą" } },
      { key: "ui.workflows.behaviorTypes.invoicePayment.description", values: { en: "Configure B2B invoice generation and payment terms", de: "B2B-Rechnungserstellung und Zahlungsbedingungen konfigurieren", es: "Configurar generación de facturas B2B y términos de pago", fr: "Configurer la génération de factures B2B et les conditions de paiement", ja: "B2B請求書生成と支払条件を設定", pl: "Skonfiguruj generowanie faktur B2B i warunki płatności" } },

      { key: "ui.workflows.behaviorTypes.taxCalculation.name", values: { en: "Tax Calculation", de: "Steuerberechnung", es: "Cálculo de Impuestos", fr: "Calcul de Taxes", ja: "税金計算", pl: "Obliczanie Podatków" } },
      { key: "ui.workflows.behaviorTypes.taxCalculation.description", values: { en: "Calculate taxes based on jurisdiction and customer type", de: "Steuern basierend auf Gerichtsbarkeit und Kundentyp berechnen", es: "Calcular impuestos según jurisdicción y tipo de cliente", fr: "Calculer les taxes selon la juridiction et le type de client", ja: "管轄と顧客タイプに基づいて税金を計算", pl: "Oblicz podatki na podstawie jurysdykcji i typu klienta" } },

      { key: "ui.workflows.behaviorTypes.consolidatedInvoiceGeneration.name", values: { en: "Consolidated Invoice Generation", de: "Konsolidierte Rechnungserstellung", es: "Generación de Factura Consolidada", fr: "Génération de Facture Consolidée", ja: "統合請求書生成", pl: "Generowanie Skonsolidowanej Faktury" } },
      { key: "ui.workflows.behaviorTypes.consolidatedInvoiceGeneration.description", values: { en: "Generate a single invoice consolidating multiple tickets (e.g., hospital pays for all doctors)", de: "Eine einzelne Rechnung erstellen, die mehrere Tickets konsolidiert (z.B. Krankenhaus zahlt für alle Ärzte)", es: "Generar una única factura consolidando múltiples boletos (ej., hospital paga por todos los médicos)", fr: "Générer une seule facture consolidant plusieurs billets (p. ex., l'hôpital paie pour tous les médecins)", ja: "複数のチケットを統合した単一の請求書を生成（例：病院がすべての医師の分を支払う）", pl: "Wygeneruj pojedynczą fakturę konsolidującą wiele biletów (np. szpital płaci za wszystkich lekarzy)" } },
    ];

    // Upsert translations (insert new, update existing)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of translations) {
      for (const [locale, value] of Object.entries(translation.values)) {
        if (typeof value === "string") {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            translation.key,
            value,
            locale,
            "workflows",
            "workflows-window"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Workflows translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
