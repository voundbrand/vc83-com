/**
 * SEED MANAGE WINDOW TRANSLATIONS - PART 5: SECURITY TAB
 *
 * Seeds translations for:
 * - Security Tab UI
 * - API Keys management
 * - Security warnings and messages
 *
 * Run: npx convex run translations/seedManage_05_Security:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Manage Window translations (Part 5: Security Tab)...");

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
      // === TAB LABEL ===
      {
        key: "ui.manage.tab.security",
        values: {
          en: "Security",
          de: "Sicherheit",
          pl: "Bezpieczeństwo",
          es: "Seguridad",
          fr: "Sécurité",
          ja: "セキュリティ",
        }
      },

      // === HEADER ===
      {
        key: "ui.manage.security.header.title",
        values: {
          en: "API Keys & Security",
          de: "API-Schlüssel & Sicherheit",
          pl: "Klucze API i bezpieczeństwo",
          es: "Claves API y seguridad",
          fr: "Clés API et sécurité",
          ja: "APIキーとセキュリティ",
        }
      },
      {
        key: "ui.manage.security.header.description",
        values: {
          en: "Manage API keys for external integrations and services. Keep your keys secure and revoke any compromised keys immediately.",
          de: "Verwalten Sie API-Schlüssel für externe Integrationen und Dienste. Bewahren Sie Ihre Schlüssel sicher auf und widerrufen Sie kompromittierte Schlüssel sofort.",
          pl: "Zarządzaj kluczami API dla zewnętrznych integracji i usług. Przechowuj klucze bezpiecznie i natychmiast odwołuj skompromitowane klucze.",
          es: "Gestione las claves API para integraciones y servicios externos. Mantenga sus claves seguras y revoque cualquier clave comprometida de inmediato.",
          fr: "Gérez les clés API pour les intégrations et services externes. Gardez vos clés en sécurité et révoquez immédiatement toute clé compromise.",
          ja: "外部統合およびサービスのAPIキーを管理します。キーを安全に保管し、侵害されたキーは直ちに取り消してください。",
        }
      },

      // === WARNINGS ===
      {
        key: "ui.manage.security.warning.api_disabled.title",
        values: {
          en: "API Keys Not Available",
          de: "API-Schlüssel nicht verfügbar",
          pl: "Klucze API niedostępne",
          es: "Claves API no disponibles",
          fr: "Clés API non disponibles",
          ja: "APIキーは利用できません",
        }
      },
      {
        key: "ui.manage.security.warning.api_disabled.message",
        values: {
          en: "API key generation has not been enabled for your organization. Please contact your system administrator to enable this feature.",
          de: "Die API-Schlüssel-Generierung wurde für Ihre Organisation nicht aktiviert. Bitte wenden Sie sich an Ihren Systemadministrator, um diese Funktion zu aktivieren.",
          pl: "Generowanie kluczy API nie zostało włączone dla Twojej organizacji. Skontaktuj się z administratorem systemu, aby włączyć tę funkcję.",
          es: "La generación de claves API no ha sido habilitada para su organización. Por favor, contacte a su administrador del sistema para habilitar esta función.",
          fr: "La génération de clés API n'a pas été activée pour votre organisation. Veuillez contacter votre administrateur système pour activer cette fonctionnalité.",
          ja: "組織でAPIキーの生成が有効になっていません。この機能を有効にするには、システム管理者にお問い合わせください。",
        }
      },
      {
        key: "ui.manage.security.warning.view_only.title",
        values: {
          en: "View Only",
          de: "Nur Ansicht",
          pl: "Tylko do odczytu",
          es: "Solo lectura",
          fr: "Lecture seule",
          ja: "表示のみ",
        }
      },
      {
        key: "ui.manage.security.warning.view_only.message",
        values: {
          en: "You don't have permission to manage API keys. Only organization owners and managers can generate and revoke API keys.",
          de: "Sie haben keine Berechtigung, API-Schlüssel zu verwalten. Nur Organisationsbesitzer und Manager können API-Schlüssel generieren und widerrufen.",
          pl: "Nie masz uprawnień do zarządzania kluczami API. Tylko właściciele organizacji i menedżerowie mogą generować i odwoływać klucze API.",
          es: "No tienes permiso para gestionar claves API. Solo los propietarios de la organización y los gerentes pueden generar y revocar claves API.",
          fr: "Vous n'avez pas la permission de gérer les clés API. Seuls les propriétaires et les gestionnaires de l'organisation peuvent générer et révoquer des clés API.",
          ja: "APIキーを管理する権限がありません。組織の所有者とマネージャーのみがAPIキーを生成および取り消すことができます。",
        }
      },

      // === BEST PRACTICES ===
      {
        key: "ui.manage.security.best_practices.title",
        values: {
          en: "Security Best Practices",
          de: "Sicherheits-Best-Practices",
          pl: "Najlepsze praktyki bezpieczeństwa",
          es: "Mejores prácticas de seguridad",
          fr: "Meilleures pratiques de sécurité",
          ja: "セキュリティのベストプラクティス",
        }
      },
      {
        key: "ui.manage.security.best_practices.item_1",
        values: {
          en: "Store API keys securely - never commit them to version control",
          de: "API-Schlüssel sicher speichern - niemals in die Versionskontrolle einchecken",
          pl: "Przechowuj klucze API bezpiecznie - nigdy nie commituj ich do kontroli wersji",
          es: "Almacene las claves API de forma segura - nunca las confirme en el control de versiones",
          fr: "Stockez les clés API en toute sécurité - ne les validez jamais dans le contrôle de version",
          ja: "APIキーを安全に保管してください - バージョン管理にコミットしないでください",
        }
      },
      {
        key: "ui.manage.security.best_practices.item_2",
        values: {
          en: "Rotate keys regularly, especially after team member departures",
          de: "Schlüssel regelmäßig rotieren, besonders nach Teammitgliedern",
          pl: "Regularnie zmieniaj klucze, szczególnie po odejściu członków zespołu",
          es: "Rote las claves regularmente, especialmente después de salidas de miembros del equipo",
          fr: "Faites tourner les clés régulièrement, surtout après le départ des membres de l'équipe",
          ja: "定期的にキーをローテーションしてください。特にチームメンバーが退職した後",
        }
      },
      {
        key: "ui.manage.security.best_practices.item_3",
        values: {
          en: "Revoke unused or compromised keys immediately",
          de: "Nicht verwendete oder kompromittierte Schlüssel sofort widerrufen",
          pl: "Natychmiast odwołaj nieużywane lub skompromitowane klucze",
          es: "Revoque inmediatamente las claves no utilizadas o comprometidas",
          fr: "Révoquez immédiatement les clés inutilisées ou compromises",
          ja: "使用されていないキーや侵害されたキーは直ちに取り消してください",
        }
      },
      {
        key: "ui.manage.security.best_practices.item_4",
        values: {
          en: "Use descriptive names to track where each key is used",
          de: "Verwenden Sie beschreibende Namen, um zu verfolgen, wo jeder Schlüssel verwendet wird",
          pl: "Użyj opisowych nazw, aby śledzić, gdzie używany jest każdy klucz",
          es: "Use nombres descriptivos para rastrear dónde se usa cada clave",
          fr: "Utilisez des noms descriptifs pour suivre où chaque clé est utilisée",
          ja: "各キーがどこで使用されているかを追跡するために、わかりやすい名前を使用してください",
        }
      },

      // === API KEYS LIST ===
      {
        key: "ui.manage.security.list.title",
        values: {
          en: "Active API Keys",
          de: "Aktive API-Schlüssel",
          pl: "Aktywne klucze API",
          es: "Claves API activas",
          fr: "Clés API actives",
          ja: "アクティブなAPIキー",
        }
      },
      {
        key: "ui.manage.security.list.button.generate",
        values: {
          en: "Generate Key",
          de: "Schlüssel generieren",
          pl: "Generuj klucz",
          es: "Generar clave",
          fr: "Générer une clé",
          ja: "キーを生成",
        }
      },
      {
        key: "ui.manage.security.list.tooltip.disabled",
        values: {
          en: "API keys are not enabled for your organization",
          de: "API-Schlüssel sind für Ihre Organisation nicht aktiviert",
          pl: "Klucze API nie są włączone dla Twojej organizacji",
          es: "Las claves API no están habilitadas para su organización",
          fr: "Les clés API ne sont pas activées pour votre organisation",
          ja: "組織でAPIキーが有効になっていません",
        }
      },
      {
        key: "ui.manage.security.list.tooltip.generate",
        values: {
          en: "Generate a new API key",
          de: "Neuen API-Schlüssel generieren",
          pl: "Generuj nowy klucz API",
          es: "Generar una nueva clave API",
          fr: "Générer une nouvelle clé API",
          ja: "新しいAPIキーを生成",
        }
      },
      {
        key: "ui.manage.security.list.empty.title",
        values: {
          en: "No API keys generated yet.",
          de: "Noch keine API-Schlüssel generiert.",
          pl: "Nie wygenerowano jeszcze żadnych kluczy API.",
          es: "Aún no se han generado claves API.",
          fr: "Aucune clé API générée pour le moment.",
          ja: "まだAPIキーは生成されていません。",
        }
      },
      {
        key: "ui.manage.security.list.empty.description",
        values: {
          en: "Click \"Generate Key\" to create your first API key.",
          de: "Klicken Sie auf \"Schlüssel generieren\", um Ihren ersten API-Schlüssel zu erstellen.",
          pl: "Kliknij \"Generuj klucz\", aby utworzyć swój pierwszy klucz API.",
          es: "Haga clic en \"Generar clave\" para crear su primera clave API.",
          fr: "Cliquez sur \"Générer une clé\" pour créer votre première clé API.",
          ja: "「キーを生成」をクリックして最初のAPIキーを作成してください。",
        }
      },

      // === TABLE HEADERS ===
      {
        key: "ui.manage.security.table.header.name",
        values: {
          en: "Name",
          de: "Name",
          pl: "Nazwa",
          es: "Nombre",
          fr: "Nom",
          ja: "名前",
        }
      },
      {
        key: "ui.manage.security.table.header.key_preview",
        values: {
          en: "Key Preview",
          de: "Schlüsselvorschau",
          pl: "Podgląd klucza",
          es: "Vista previa de clave",
          fr: "Aperçu de la clé",
          ja: "キープレビュー",
        }
      },
      {
        key: "ui.manage.security.table.header.status",
        values: {
          en: "Status",
          de: "Status",
          pl: "Status",
          es: "Estado",
          fr: "Statut",
          ja: "ステータス",
        }
      },
      {
        key: "ui.manage.security.table.header.requests",
        values: {
          en: "Requests",
          de: "Anfragen",
          pl: "Żądania",
          es: "Solicitudes",
          fr: "Requêtes",
          ja: "リクエスト",
        }
      },
      {
        key: "ui.manage.security.table.header.created",
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
        key: "ui.manage.security.table.header.actions",
        values: {
          en: "Actions",
          de: "Aktionen",
          pl: "Akcje",
          es: "Acciones",
          fr: "Actions",
          ja: "アクション",
        }
      },

      // === TABLE ROW ACTIONS ===
      {
        key: "ui.manage.security.table.action.copy",
        values: {
          en: "Copy to clipboard",
          de: "In Zwischenablage kopieren",
          pl: "Kopiuj do schowka",
          es: "Copiar al portapapeles",
          fr: "Copier dans le presse-papiers",
          ja: "クリップボードにコピー",
        }
      },
      {
        key: "ui.manage.security.table.action.copy_success",
        values: {
          en: "API key preview copied to clipboard",
          de: "API-Schlüsselvorschau in Zwischenablage kopiert",
          pl: "Podgląd klucza API skopiowany do schowka",
          es: "Vista previa de clave API copiada al portapapeles",
          fr: "Aperçu de la clé API copié dans le presse-papiers",
          ja: "APIキープレビューをクリップボードにコピーしました",
        }
      },
      {
        key: "ui.manage.security.table.action.revoke",
        values: {
          en: "Revoke",
          de: "Widerrufen",
          pl: "Odwołaj",
          es: "Revocar",
          fr: "Révoquer",
          ja: "取り消す",
        }
      },
      {
        key: "ui.manage.security.table.status.active",
        values: {
          en: "active",
          de: "aktiv",
          pl: "aktywny",
          es: "activo",
          fr: "actif",
          ja: "アクティブ",
        }
      },
      {
        key: "ui.manage.security.table.status.revoked",
        values: {
          en: "revoked",
          de: "widerrufen",
          pl: "odwołany",
          es: "revocado",
          fr: "révoqué",
          ja: "取り消し済み",
        }
      },

      // === REVOKE CONFIRMATION ===
      {
        key: "ui.manage.security.revoke.confirm.title",
        values: {
          en: "Are you sure you want to revoke the API key",
          de: "Möchten Sie den API-Schlüssel wirklich widerrufen",
          pl: "Czy na pewno chcesz odwołać klucz API",
          es: "¿Está seguro de que desea revocar la clave API",
          fr: "Êtes-vous sûr de vouloir révoquer la clé API",
          ja: "APIキーを取り消してもよろしいですか",
        }
      },
      {
        key: "ui.manage.security.revoke.confirm.message",
        values: {
          en: "This action cannot be undone and will immediately stop all requests using this key.",
          de: "Diese Aktion kann nicht rückgängig gemacht werden und stoppt sofort alle Anfragen mit diesem Schlüssel.",
          pl: "Ta akcja nie może zostać cofnięta i natychmiast zatrzyma wszystkie żądania używające tego klucza.",
          es: "Esta acción no se puede deshacer y detendrá inmediatamente todas las solicitudes que usen esta clave.",
          fr: "Cette action ne peut pas être annulée et arrêtera immédiatement toutes les requêtes utilisant cette clé.",
          ja: "この操作は元に戻すことができず、このキーを使用するすべてのリクエストが直ちに停止されます。",
        }
      },
      {
        key: "ui.manage.security.revoke.error",
        values: {
          en: "Failed to revoke",
          de: "Widerruf fehlgeschlagen",
          pl: "Nie udało się odwołać",
          es: "No se pudo revocar",
          fr: "Échec de la révocation",
          ja: "取り消しに失敗しました",
        }
      },

      // === CREATE MODAL ===
      {
        key: "ui.manage.security.create.title",
        values: {
          en: "Generate API Key",
          de: "API-Schlüssel generieren",
          pl: "Generuj klucz API",
          es: "Generar clave API",
          fr: "Générer une clé API",
          ja: "APIキーを生成",
        }
      },
      {
        key: "ui.manage.security.create.description",
        values: {
          en: "Generate a new API key for external integrations. Give it a descriptive name to help you remember where it's used.",
          de: "Generieren Sie einen neuen API-Schlüssel für externe Integrationen. Geben Sie ihm einen beschreibenden Namen, um sich zu merken, wo er verwendet wird.",
          pl: "Wygeneruj nowy klucz API dla zewnętrznych integracji. Nadaj mu opisową nazwę, aby pomóc zapamiętać, gdzie jest używany.",
          es: "Genere una nueva clave API para integraciones externas. Asígnele un nombre descriptivo para recordar dónde se usa.",
          fr: "Générez une nouvelle clé API pour les intégrations externes. Donnez-lui un nom descriptif pour vous rappeler où elle est utilisée.",
          ja: "外部統合用の新しいAPIキーを生成します。使用場所を覚えやすいように、わかりやすい名前を付けてください。",
        }
      },
      {
        key: "ui.manage.security.create.label.name",
        values: {
          en: "API Key Name:",
          de: "API-Schlüsselname:",
          pl: "Nazwa klucza API:",
          es: "Nombre de clave API:",
          fr: "Nom de la clé API:",
          ja: "APIキー名:",
        }
      },
      {
        key: "ui.manage.security.create.placeholder.name",
        values: {
          en: "e.g., Production Integration",
          de: "z.B. Produktionsintegration",
          pl: "np. Integracja produkcyjna",
          es: "ej., Integración de producción",
          fr: "par ex., Intégration de production",
          ja: "例: 本番統合",
        }
      },
      {
        key: "ui.manage.security.create.button.cancel",
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
        key: "ui.manage.security.create.button.generate",
        values: {
          en: "Generate",
          de: "Generieren",
          pl: "Generuj",
          es: "Generar",
          fr: "Générer",
          ja: "生成",
        }
      },
      {
        key: "ui.manage.security.create.error.name_required",
        values: {
          en: "Please enter a name for the API key",
          de: "Bitte geben Sie einen Namen für den API-Schlüssel ein",
          pl: "Wprowadź nazwę klucza API",
          es: "Por favor, ingrese un nombre para la clave API",
          fr: "Veuillez saisir un nom pour la clé API",
          ja: "APIキーの名前を入力してください",
        }
      },
      {
        key: "ui.manage.security.create.error.failed",
        values: {
          en: "Failed to generate",
          de: "Generierung fehlgeschlagen",
          pl: "Nie udało się wygenerować",
          es: "No se pudo generar",
          fr: "Échec de la génération",
          ja: "生成に失敗しました",
        }
      },

      // === GENERATED KEY VIEW ===
      {
        key: "ui.manage.security.generated.warning.title",
        values: {
          en: "⚠️ Important: Copy this key now!",
          de: "⚠️ Wichtig: Kopieren Sie diesen Schlüssel jetzt!",
          pl: "⚠️ Ważne: Skopiuj ten klucz teraz!",
          es: "⚠️ Importante: ¡Copie esta clave ahora!",
          fr: "⚠️ Important: Copiez cette clé maintenant!",
          ja: "⚠️ 重要: このキーを今すぐコピーしてください！",
        }
      },
      {
        key: "ui.manage.security.generated.warning.message",
        values: {
          en: "This is the only time you'll be able to see the full API key. Store it securely in your application or environment variables.",
          de: "Dies ist die einzige Gelegenheit, den vollständigen API-Schlüssel zu sehen. Speichern Sie ihn sicher in Ihrer Anwendung oder Umgebungsvariablen.",
          pl: "To jedyna okazja, aby zobaczyć pełny klucz API. Przechowuj go bezpiecznie w swojej aplikacji lub zmiennych środowiskowych.",
          es: "Esta es la única vez que podrá ver la clave API completa. Guárdela de forma segura en su aplicación o variables de entorno.",
          fr: "C'est la seule fois où vous pourrez voir la clé API complète. Stockez-la en toute sécurité dans votre application ou vos variables d'environnement.",
          ja: "これは完全なAPIキーを表示できる唯一の機会です。アプリケーションまたは環境変数に安全に保存してください。",
        }
      },
      {
        key: "ui.manage.security.generated.label.key",
        values: {
          en: "Your API Key:",
          de: "Ihr API-Schlüssel:",
          pl: "Twój klucz API:",
          es: "Su clave API:",
          fr: "Votre clé API:",
          ja: "あなたのAPIキー:",
        }
      },
      {
        key: "ui.manage.security.generated.button.copy_close",
        values: {
          en: "Copy & Close",
          de: "Kopieren & Schließen",
          pl: "Kopiuj i zamknij",
          es: "Copiar y cerrar",
          fr: "Copier et fermer",
          ja: "コピーして閉じる",
        }
      },
      {
        key: "ui.manage.security.generated.copy_success",
        values: {
          en: "API key copied to clipboard!\n\nStore it securely - you won't be able to see the full key again.",
          de: "API-Schlüssel in Zwischenablage kopiert!\n\nSpeichern Sie ihn sicher - Sie können den vollständigen Schlüssel nicht mehr sehen.",
          pl: "Klucz API skopiowany do schowka!\n\nPrzechowuj go bezpiecznie - nie będziesz mógł ponownie zobaczyć pełnego klucza.",
          es: "¡Clave API copiada al portapapeles!\n\nGuárdela de forma segura - no podrá ver la clave completa nuevamente.",
          fr: "Clé API copiée dans le presse-papiers!\n\nStockez-la en toute sécurité - vous ne pourrez plus voir la clé complète.",
          ja: "APIキーをクリップボードにコピーしました！\n\n安全に保管してください - 完全なキーを再度表示することはできません。",
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
            "manage-window-security"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Security Tab translations`);
    return { success: true, count };
  }
});
