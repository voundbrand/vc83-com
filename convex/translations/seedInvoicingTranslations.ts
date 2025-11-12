/**
 * INVOICING TRANSLATIONS SEED FILE
 *
 * This file contains translations for all invoice-related UI components:
 * - Payments window: Stripe Invoice Section (ui.payments.invoicing.*)
 * - Workflows: Invoice behavior configs (ui.workflows.invoice_*)
 *
 * Note: Checkout invoice enforcement uses ui.checkout.invoice_enforcement.*
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Invoicing translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    const systemOrgId = systemOrg._id;
    const systemUserId = systemUser._id;

    // ========================================
    // PAYMENTS WINDOW: STRIPE INVOICE SECTION
    // Namespace: ui.payments.invoicing.*
    // ========================================

    const paymentsInvoicing = {
      // Connection required
      "ui.payments.invoicing.connection_required.title": {
        en: "Stripe Connection Required",
        de: "Stripe-Verbindung erforderlich",
        es: "Conexión de Stripe requerida",
        fr: "Connexion Stripe requise",
        pl: "Wymagane połączenie Stripe",
        ja: "Stripe接続が必要です",
      },
      "ui.payments.invoicing.connection_required.description": {
        en: 'Connect your Stripe account first to enable Stripe Invoicing. Go to the "Stripe Connect" tab to get started.',
        de: 'Verbinden Sie zuerst Ihr Stripe-Konto, um Stripe-Rechnungsstellung zu aktivieren. Gehen Sie zum Tab "Stripe Connect", um zu beginnen.',
        es: 'Conecte primero su cuenta de Stripe para habilitar la facturación de Stripe. Vaya a la pestaña "Stripe Connect" para comenzar.',
        fr: 'Connectez d\'abord votre compte Stripe pour activer la facturation Stripe. Accédez à l\'onglet "Stripe Connect" pour commencer.',
        pl: 'Najpierw połącz swoje konto Stripe, aby włączyć fakturowanie Stripe. Przejdź do zakładki "Stripe Connect", aby rozpocząć.',
        ja: 'Stripeの請求書発行を有効にするには、まずStripeアカウントを接続してください。開始するには「Stripe Connect」タブに移動してください。',
      },

      // Not set up
      "ui.payments.invoicing.not_setup.title": {
        en: "Stripe Invoicing Not Set Up",
        de: "Stripe-Rechnungsstellung nicht eingerichtet",
        es: "Facturación de Stripe no configurada",
        fr: "Facturation Stripe non configurée",
        pl: "Fakturowanie Stripe nie jest skonfigurowane",
        ja: "Stripe請求書発行が設定されていません",
      },
      "ui.payments.invoicing.not_setup.description": {
        en: "Stripe Invoicing is available for all accounts. Click below to set it up in your system.",
        de: "Stripe-Rechnungsstellung ist für alle Konten verfügbar. Klicken Sie unten, um es in Ihrem System einzurichten.",
        es: "La facturación de Stripe está disponible para todas las cuentas. Haga clic a continuación para configurarla en su sistema.",
        fr: "La facturation Stripe est disponible pour tous les comptes. Cliquez ci-dessous pour la configurer dans votre système.",
        pl: "Fakturowanie Stripe jest dostępne dla wszystkich kont. Kliknij poniżej, aby je skonfigurować w swoim systemie.",
        ja: "Stripeの請求書発行はすべてのアカウントで利用可能です。システムで設定するには、以下をクリックしてください。",
      },
      "ui.payments.invoicing.requirements.title": {
        en: "Requirements:",
        de: "Anforderungen:",
        es: "Requisitos:",
        fr: "Exigences:",
        pl: "Wymagania:",
        ja: "要件:",
      },
      "ui.payments.invoicing.requirements.stripe_connected": {
        en: "Stripe account connected",
        de: "Stripe-Konto verbunden",
        es: "Cuenta de Stripe conectada",
        fr: "Compte Stripe connecté",
        pl: "Konto Stripe połączone",
        ja: "Stripeアカウントが接続されています",
      },
      "ui.payments.invoicing.requirements.business_profile": {
        en: "Business profile is set up",
        de: "Geschäftsprofil ist eingerichtet",
        es: "Perfil empresarial configurado",
        fr: "Profil d'entreprise configuré",
        pl: "Profil biznesowy jest skonfigurowany",
        ja: "ビジネスプロフィールが設定されています",
      },

      // Success/Error messages
      "ui.payments.invoicing.success.title": {
        en: "Invoicing enabled successfully!",
        de: "Rechnungsstellung erfolgreich aktiviert!",
        es: "¡Facturación habilitada con éxito!",
        fr: "Facturation activée avec succès!",
        pl: "Fakturowanie zostało pomyślnie włączone!",
        ja: "請求書発行が正常に有効化されました！",
      },
      "ui.payments.invoicing.success.description": {
        en: "Stripe Invoicing is now active for your account. Click Refresh to update the UI.",
        de: "Stripe-Rechnungsstellung ist jetzt für Ihr Konto aktiv. Klicken Sie auf Aktualisieren, um die Benutzeroberfläche zu aktualisieren.",
        es: "La facturación de Stripe está ahora activa para su cuenta. Haga clic en Actualizar para actualizar la interfaz.",
        fr: "La facturation Stripe est maintenant active pour votre compte. Cliquez sur Actualiser pour mettre à jour l'interface.",
        pl: "Fakturowanie Stripe jest teraz aktywne dla Twojego konta. Kliknij Odśwież, aby zaktualizować interfejs.",
        ja: "Stripeの請求書発行がアカウントでアクティブになりました。UIを更新するには更新をクリックしてください。",
      },
      "ui.payments.invoicing.error.title": {
        en: "Failed to enable invoicing",
        de: "Rechnungsstellung konnte nicht aktiviert werden",
        es: "Error al habilitar la facturación",
        fr: "Échec de l'activation de la facturation",
        pl: "Nie udało się włączyć fakturowania",
        ja: "請求書発行の有効化に失敗しました",
      },

      // Action buttons
      "ui.payments.invoicing.buttons.enable": {
        en: "Enable Invoicing",
        de: "Rechnungsstellung aktivieren",
        es: "Habilitar facturación",
        fr: "Activer la facturation",
        pl: "Włącz fakturowanie",
        ja: "請求書発行を有効化",
      },
      "ui.payments.invoicing.buttons.enabling": {
        en: "Enabling...",
        de: "Wird aktiviert...",
        es: "Habilitando...",
        fr: "Activation...",
        pl: "Włączanie...",
        ja: "有効化中...",
      },
      "ui.payments.invoicing.buttons.dashboard": {
        en: "Open Stripe Dashboard",
        de: "Stripe-Dashboard öffnen",
        es: "Abrir panel de Stripe",
        fr: "Ouvrir le tableau de bord Stripe",
        pl: "Otwórz panel Stripe",
        ja: "Stripeダッシュボードを開く",
      },
      "ui.payments.invoicing.buttons.view_invoices": {
        en: "View Invoices",
        de: "Rechnungen anzeigen",
        es: "Ver facturas",
        fr: "Voir les factures",
        pl: "Zobacz faktury",
        ja: "請求書を表示",
      },
      "ui.payments.invoicing.buttons.create_invoice": {
        en: "Create Invoice",
        de: "Rechnung erstellen",
        es: "Crear factura",
        fr: "Créer une facture",
        pl: "Utwórz fakturę",
        ja: "請求書を作成",
      },

      // How to enable
      "ui.payments.invoicing.how_to.title": {
        en: "How to Enable Stripe Invoicing",
        de: "So aktivieren Sie Stripe-Rechnungsstellung",
        es: "Cómo habilitar la facturación de Stripe",
        fr: "Comment activer la facturation Stripe",
        pl: "Jak włączyć fakturowanie Stripe",
        ja: "Stripe請求書発行を有効にする方法",
      },
      "ui.payments.invoicing.how_to.step1": {
        en: "Go to your Stripe Dashboard (link above)",
        de: "Gehen Sie zu Ihrem Stripe-Dashboard (Link oben)",
        es: "Vaya a su panel de Stripe (enlace arriba)",
        fr: "Accédez à votre tableau de bord Stripe (lien ci-dessus)",
        pl: "Przejdź do swojego panelu Stripe (link powyżej)",
        ja: "Stripeダッシュボードに移動してください（上記のリンク）",
      },
      "ui.payments.invoicing.how_to.step2": {
        en: "Navigate to Settings → Business Settings → Capabilities",
        de: "Navigieren Sie zu Einstellungen → Geschäftseinstellungen → Funktionen",
        es: "Navegue a Configuración → Configuración empresarial → Capacidades",
        fr: "Naviguez vers Paramètres → Paramètres professionnels → Capacités",
        pl: "Przejdź do Ustawienia → Ustawienia biznesowe → Możliwości",
        ja: "設定→ビジネス設定→機能に移動してください",
      },
      "ui.payments.invoicing.how_to.step3": {
        en: 'Look for "Invoicing" capability and enable it',
        de: 'Suchen Sie nach der Funktion "Rechnungsstellung" und aktivieren Sie sie',
        es: 'Busque la capacidad "Facturación" y habilítela',
        fr: 'Recherchez la capacité "Facturation" et activez-la',
        pl: 'Poszukaj możliwości "Fakturowanie" i ją włącz',
        ja: '「請求書発行」機能を探して有効にしてください',
      },
      "ui.payments.invoicing.how_to.step4": {
        en: "Complete any required information (may require Stripe support approval)",
        de: "Vervollständigen Sie alle erforderlichen Informationen (möglicherweise ist eine Genehmigung durch den Stripe-Support erforderlich)",
        es: "Complete la información requerida (puede requerir aprobación del soporte de Stripe)",
        fr: "Complétez toutes les informations requises (peut nécessiter l'approbation du support Stripe)",
        pl: "Uzupełnij wymagane informacje (może wymagać zgody wsparcia Stripe)",
        ja: "必要な情報を入力してください（Stripeサポートの承認が必要な場合があります）",
      },
      "ui.payments.invoicing.how_to.step5": {
        en: "Return here and click Refresh to sync the new capability",
        de: "Kehren Sie hierher zurück und klicken Sie auf Aktualisieren, um die neue Funktion zu synchronisieren",
        es: "Regrese aquí y haga clic en Actualizar para sincronizar la nueva capacidad",
        fr: "Revenez ici et cliquez sur Actualiser pour synchroniser la nouvelle capacité",
        pl: "Wróć tutaj i kliknij Odśwież, aby zsynchronizować nową możliwość",
        ja: "ここに戻って更新をクリックし、新しい機能を同期してください",
      },
      "ui.payments.invoicing.how_to.note": {
        en: 'Click "Enable Invoicing" to set up invoicing in your account (requires business profile), or visit your Stripe Dashboard to create invoices. After enabling, click the Refresh button in the Stripe Connect section to update your status.',
        de: 'Klicken Sie auf "Rechnungsstellung aktivieren", um die Rechnungsstellung in Ihrem Konto einzurichten (erfordert Geschäftsprofil), oder besuchen Sie Ihr Stripe-Dashboard, um Rechnungen zu erstellen. Klicken Sie nach der Aktivierung auf die Schaltfläche Aktualisieren im Abschnitt Stripe Connect, um Ihren Status zu aktualisieren.',
        es: 'Haga clic en "Habilitar facturación" para configurar la facturación en su cuenta (requiere perfil empresarial), o visite su panel de Stripe para crear facturas. Después de habilitar, haga clic en el botón Actualizar en la sección Stripe Connect para actualizar su estado.',
        fr: 'Cliquez sur "Activer la facturation" pour configurer la facturation dans votre compte (nécessite un profil d\'entreprise), ou visitez votre tableau de bord Stripe pour créer des factures. Après l\'activation, cliquez sur le bouton Actualiser dans la section Stripe Connect pour mettre à jour votre statut.',
        pl: 'Kliknij "Włącz fakturowanie", aby skonfigurować fakturowanie na swoim koncie (wymaga profilu biznesowego), lub odwiedź swój panel Stripe, aby utworzyć faktury. Po włączeniu kliknij przycisk Odśwież w sekcji Stripe Connect, aby zaktualizować swój status.',
        ja: 'アカウントで請求書発行を設定するには「請求書発行を有効化」をクリックしてください（ビジネスプロフィールが必要）。または、Stripeダッシュボードにアクセスして請求書を作成してください。有効化後、Stripe Connectセクションの更新ボタンをクリックしてステータスを更新してください。',
      },

      // Status: Enabled
      "ui.payments.invoicing.status.enabled.title": {
        en: "Stripe Invoicing: Enabled",
        de: "Stripe-Rechnungsstellung: Aktiviert",
        es: "Facturación de Stripe: Habilitada",
        fr: "Facturation Stripe: Activée",
        pl: "Fakturowanie Stripe: Włączone",
        ja: "Stripe請求書発行：有効",
      },
      "ui.payments.invoicing.status.enabled.description": {
        en: "Your account is configured to create and manage invoices through Stripe",
        de: "Ihr Konto ist konfiguriert, um Rechnungen über Stripe zu erstellen und zu verwalten",
        es: "Su cuenta está configurada para crear y administrar facturas a través de Stripe",
        fr: "Votre compte est configuré pour créer et gérer des factures via Stripe",
        pl: "Twoje konto jest skonfigurowane do tworzenia i zarządzania fakturami przez Stripe",
        ja: "アカウントはStripeを通じて請求書を作成および管理するように設定されています",
      },

      // Configuration
      "ui.payments.invoicing.config.title": {
        en: "Invoice Configuration",
        de: "Rechnungskonfiguration",
        es: "Configuración de factura",
        fr: "Configuration de facturation",
        pl: "Konfiguracja faktury",
        ja: "請求書設定",
      },
      "ui.payments.invoicing.config.invoicing": {
        en: "Invoicing:",
        de: "Rechnungsstellung:",
        es: "Facturación:",
        fr: "Facturation:",
        pl: "Fakturowanie:",
        ja: "請求書発行：",
      },
      "ui.payments.invoicing.config.enabled": {
        en: "Enabled",
        de: "Aktiviert",
        es: "Habilitado",
        fr: "Activé",
        pl: "Włączone",
        ja: "有効",
      },
      "ui.payments.invoicing.config.collection_method": {
        en: "Collection Method:",
        de: "Inkassomethode:",
        es: "Método de cobro:",
        fr: "Méthode de recouvrement:",
        pl: "Metoda inkasa:",
        ja: "回収方法：",
      },
      "ui.payments.invoicing.config.payment_terms": {
        en: "Payment Terms:",
        de: "Zahlungsbedingungen:",
        es: "Términos de pago:",
        fr: "Conditions de paiement:",
        pl: "Warunki płatności:",
        ja: "支払条件：",
      },
      "ui.payments.invoicing.config.days_until_due": {
        en: "Days Until Due:",
        de: "Tage bis zur Fälligkeit:",
        es: "Días hasta vencimiento:",
        fr: "Jours jusqu'à l'échéance:",
        pl: "Dni do terminu płatności:",
        ja: "支払期限までの日数：",
      },
      "ui.payments.invoicing.config.auto_advance": {
        en: "Auto Advance:",
        de: "Automatischer Fortschritt:",
        es: "Avance automático:",
        fr: "Avancement automatique:",
        pl: "Automatyczne przejście:",
        ja: "自動進行：",
      },
      "ui.payments.invoicing.config.yes": {
        en: "Yes",
        de: "Ja",
        es: "Sí",
        fr: "Oui",
        pl: "Tak",
        ja: "はい",
      },
      "ui.payments.invoicing.config.no": {
        en: "No",
        de: "Nein",
        es: "No",
        fr: "Non",
        pl: "Nie",
        ja: "いいえ",
      },
      "ui.payments.invoicing.config.stripe_mode": {
        en: "Stripe Account Mode:",
        de: "Stripe-Kontomodus:",
        es: "Modo de cuenta Stripe:",
        fr: "Mode de compte Stripe:",
        pl: "Tryb konta Stripe:",
        ja: "Stripeアカウントモード：",
      },
      "ui.payments.invoicing.config.test_mode": {
        en: "Test Mode",
        de: "Testmodus",
        es: "Modo de prueba",
        fr: "Mode test",
        pl: "Tryb testowy",
        ja: "テストモード",
      },
      "ui.payments.invoicing.config.live_mode": {
        en: "Live Mode",
        de: "Live-Modus",
        es: "Modo en vivo",
        fr: "Mode en direct",
        pl: "Tryb na żywo",
        ja: "本番モード",
      },

      // Features
      "ui.payments.invoicing.features.title": {
        en: "What Stripe Invoicing Does",
        de: "Was Stripe-Rechnungsstellung leistet",
        es: "Qué hace la facturación de Stripe",
        fr: "Ce que fait la facturation Stripe",
        pl: "Co robi fakturowanie Stripe",
        ja: "Stripe請求書発行の機能",
      },
      "ui.payments.invoicing.features.branding": {
        en: "Create professional invoices with your branding",
        de: "Erstellen Sie professionelle Rechnungen mit Ihrem Branding",
        es: "Cree facturas profesionales con su marca",
        fr: "Créez des factures professionnelles avec votre image de marque",
        pl: "Twórz profesjonalne faktury z Twoją marką",
        ja: "ブランディングを含むプロフェッショナルな請求書を作成",
      },
      "ui.payments.invoicing.features.auto_send": {
        en: "Automatically send invoices to customers via email",
        de: "Rechnungen automatisch per E-Mail an Kunden senden",
        es: "Envíe automáticamente facturas a los clientes por correo electrónico",
        fr: "Envoyez automatiquement des factures aux clients par e-mail",
        pl: "Automatycznie wysyłaj faktury do klientów e-mailem",
        ja: "請求書をメールで顧客に自動送信",
      },
      "ui.payments.invoicing.features.online_payment": {
        en: "Accept payments online with hosted invoice pages",
        de: "Online-Zahlungen mit gehosteten Rechnungsseiten akzeptieren",
        es: "Acepte pagos en línea con páginas de factura alojadas",
        fr: "Acceptez les paiements en ligne avec des pages de facture hébergées",
        pl: "Przyjmuj płatności online za pomocą hostowanych stron faktur",
        ja: "ホストされた請求書ページでオンライン決済を受け付け",
      },
      "ui.payments.invoicing.features.tracking": {
        en: "Track payment status and send automatic reminders",
        de: "Zahlungsstatus verfolgen und automatische Erinnerungen senden",
        es: "Rastree el estado de pago y envíe recordatorios automáticos",
        fr: "Suivez l'état des paiements et envoyez des rappels automatiques",
        pl: "Śledź status płatności i wysyłaj automatyczne przypomnienia",
        ja: "支払いステータスを追跡し、自動リマインダーを送信",
      },
      "ui.payments.invoicing.features.tax_integration": {
        en: "Integrate with Stripe Tax for automatic tax calculation",
        de: "Integration mit Stripe Tax für automatische Steuerberechnung",
        es: "Integre con Stripe Tax para cálculo automático de impuestos",
        fr: "Intégrez avec Stripe Tax pour le calcul automatique des taxes",
        pl: "Integracja ze Stripe Tax w celu automatycznego obliczania podatków",
        ja: "Stripe Taxと統合して自動税計算",
      },

      // Manage section
      "ui.payments.invoicing.manage.title": {
        en: "Manage Invoices",
        de: "Rechnungen verwalten",
        es: "Administrar facturas",
        fr: "Gérer les factures",
        pl: "Zarządzaj fakturami",
        ja: "請求書を管理",
      },
      "ui.payments.invoicing.manage.description": {
        en: "Create, send, and manage invoices directly from your Stripe Dashboard.",
        de: "Erstellen, senden und verwalten Sie Rechnungen direkt über Ihr Stripe-Dashboard.",
        es: "Cree, envíe y administre facturas directamente desde su panel de Stripe.",
        fr: "Créez, envoyez et gérez des factures directement depuis votre tableau de bord Stripe.",
        pl: "Twórz, wysyłaj i zarządzaj fakturami bezpośrednio z panelu Stripe.",
        ja: "Stripeダッシュボードから直接請求書を作成、送信、管理します。",
      },

      // Important notes
      "ui.payments.invoicing.notes.title": {
        en: "Important Notes",
        de: "Wichtige Hinweise",
        es: "Notas importantes",
        fr: "Notes importantes",
        pl: "Ważne uwagi",
        ja: "重要な注意事項",
      },
      "ui.payments.invoicing.notes.send_auto_manual": {
        en: "Invoices can be sent automatically or manually to customers",
        de: "Rechnungen können automatisch oder manuell an Kunden gesendet werden",
        es: "Las facturas se pueden enviar automáticamente o manualmente a los clientes",
        fr: "Les factures peuvent être envoyées automatiquement ou manuellement aux clients",
        pl: "Faktury mogą być wysyłane automatycznie lub ręcznie do klientów",
        ja: "請求書は顧客に自動または手動で送信できます",
      },
      "ui.payments.invoicing.notes.online_payment": {
        en: "Customers can pay invoices online via hosted payment pages",
        de: "Kunden können Rechnungen online über gehostete Zahlungsseiten bezahlen",
        es: "Los clientes pueden pagar facturas en línea a través de páginas de pago alojadas",
        fr: "Les clients peuvent payer les factures en ligne via des pages de paiement hébergées",
        pl: "Klienci mogą płacić faktury online za pośrednictwem hostowanych stron płatności",
        ja: "顧客はホストされた支払いページを介してオンラインで請求書を支払うことができます",
      },
      "ui.payments.invoicing.notes.tax_integration": {
        en: "Combine with Stripe Tax for automatic tax calculation on invoices",
        de: "Kombinieren Sie mit Stripe Tax für automatische Steuerberechnung auf Rechnungen",
        es: "Combine con Stripe Tax para cálculo automático de impuestos en facturas",
        fr: "Combinez avec Stripe Tax pour le calcul automatique des taxes sur les factures",
        pl: "Połącz ze Stripe Tax w celu automatycznego obliczania podatków na fakturach",
        ja: "Stripe Taxと組み合わせて請求書の自動税計算を実現",
      },
      "ui.payments.invoicing.notes.custom_terms": {
        en: "Payment terms and due dates can be customized per invoice",
        de: "Zahlungsbedingungen und Fälligkeitsdaten können pro Rechnung angepasst werden",
        es: "Los términos de pago y fechas de vencimiento se pueden personalizar por factura",
        fr: "Les conditions de paiement et les dates d'échéance peuvent être personnalisées par facture",
        pl: "Warunki płatności i terminy można dostosować dla każdej faktury",
        ja: "支払条件と期日は請求書ごとにカスタマイズできます",
      },
      "ui.payments.invoicing.notes.auto_collection": {
        en: "Stripe handles payment reminders and collection automatically",
        de: "Stripe übernimmt Zahlungserinnerungen und Inkasso automatisch",
        es: "Stripe gestiona recordatorios de pago y cobro automáticamente",
        fr: "Stripe gère automatiquement les rappels de paiement et le recouvrement",
        pl: "Stripe automatycznie obsługuje przypomnienia o płatnościach i windykację",
        ja: "Stripeが支払いリマインダーと回収を自動的に処理します",
      },
    };

    // ========================================
    // WORKFLOWS: INVOICE MAPPING CONFIG
    // Namespace: ui.workflows.invoice_mapping.*
    // ========================================

    const invoiceMapping = {
      "ui.workflows.invoice_mapping.header.title": {
        en: "Invoice Mapping",
        de: "Rechnungszuordnung",
        es: "Mapeo de facturas",
        fr: "Mappage de factures",
        pl: "Mapowanie faktur",
        ja: "請求書マッピング",
      },
      "ui.workflows.invoice_mapping.header.description": {
        en: "Map form values to organizations and automatically create invoices with billing information",
        de: "Formularwerte Organisationen zuordnen und automatisch Rechnungen mit Rechnungsinformationen erstellen",
        es: "Asigne valores de formulario a organizaciones y cree facturas automáticamente con información de facturación",
        fr: "Associez les valeurs de formulaire aux organisations et créez automatiquement des factures avec les informations de facturation",
        pl: "Mapuj wartości formularza na organizacje i automatycznie twórz faktury z informacjami rozliczeniowymi",
        ja: "フォーム値を組織にマッピングし、請求情報を含む請求書を自動的に作成します",
      },

      // Template selection
      "ui.workflows.invoice_mapping.template.label": {
        en: "Invoice Template",
        de: "Rechnungsvorlage",
        es: "Plantilla de factura",
        fr: "Modèle de facture",
        pl: "Szablon faktury",
        ja: "請求書テンプレート",
      },
      "ui.workflows.invoice_mapping.template.hint": {
        en: "💡 The template determines how the invoice PDF will be formatted and what information will be displayed",
        de: "💡 Die Vorlage bestimmt, wie die Rechnungs-PDF formatiert wird und welche Informationen angezeigt werden",
        es: "💡 La plantilla determina cómo se formateará el PDF de la factura y qué información se mostrará",
        fr: "💡 Le modèle détermine la mise en forme du PDF de facture et les informations affichées",
        pl: "💡 Szablon określa formatowanie PDF faktury i wyświetlane informacje",
        ja: "💡 テンプレートは請求書PDFのフォーマット方法と表示される情報を決定します",
      },
      "ui.workflows.invoice_mapping.template.recommended": {
        en: "✨ Recommended for hospital billing (AMEOS use case)",
        de: "✨ Empfohlen für Krankenhausabrechnung (AMEOS-Anwendungsfall)",
        es: "✨ Recomendado para facturación hospitalaria (caso de uso AMEOS)",
        fr: "✨ Recommandé pour la facturation hospitalière (cas d'usage AMEOS)",
        pl: "✨ Zalecane do rozliczeń szpitalnych (przypadek użycia AMEOS)",
        ja: "✨ 病院請求に推奨（AMEOSユースケース）",
      },
      "ui.workflows.invoice_mapping.template.use_cases": {
        en: "Use Cases:",
        de: "Anwendungsfälle:",
        es: "Casos de uso:",
        fr: "Cas d'usage:",
        pl: "Przypadki użycia:",
        ja: "ユースケース：",
      },

      // Source field
      "ui.workflows.invoice_mapping.source_field.label": {
        en: "Form Field Containing Organization Info",
        de: "Formularfeld mit Organisationsinformationen",
        es: "Campo de formulario que contiene información de la organización",
        fr: "Champ de formulaire contenant les informations de l'organisation",
        pl: "Pole formularza zawierające informacje o organizacji",
        ja: "組織情報を含むフォームフィールド",
      },
      "ui.workflows.invoice_mapping.source_field.placeholder": {
        en: "-- Select Field --",
        de: "-- Feld auswählen --",
        es: "-- Seleccionar campo --",
        fr: "-- Sélectionner le champ --",
        pl: "-- Wybierz pole --",
        ja: "-- フィールドを選択 --",
      },
      "ui.workflows.invoice_mapping.source_field.hint": {
        en: "The form field that contains organization/company information (e.g., company, employer, organization_name)",
        de: "Das Formularfeld, das Organisations-/Unternehmensinformationen enthält (z. B. Unternehmen, Arbeitgeber, organization_name)",
        es: "El campo de formulario que contiene información de organización/empresa (ej., empresa, empleador, nombre_organizacion)",
        fr: "Le champ de formulaire contenant les informations d'organisation/entreprise (par ex., entreprise, employeur, nom_organisation)",
        pl: "Pole formularza zawierające informacje o organizacji/firmie (np. firma, pracodawca, nazwa_organizacji)",
        ja: "組織/企業情報を含むフォームフィールド（例：company, employer, organization_name）",
      },

      // Mapping
      "ui.workflows.invoice_mapping.mapping.label": {
        en: "Form Value → Organization Mapping",
        de: "Formularwert → Organisationszuordnung",
        es: "Valor de formulario → Mapeo de organización",
        fr: "Valeur de formulaire → Mappage d'organisation",
        pl: "Wartość formularza → Mapowanie organizacji",
        ja: "フォーム値 → 組織マッピング",
      },
      "ui.workflows.invoice_mapping.mapping.empty": {
        en: "No invoice mappings yet. Add mappings to automatically create invoices for organizations.",
        de: "Noch keine Rechnungszuordnungen. Fügen Sie Zuordnungen hinzu, um automatisch Rechnungen für Organisationen zu erstellen.",
        es: "Aún no hay mapeos de facturas. Agregue mapeos para crear facturas automáticamente para organizaciones.",
        fr: "Aucun mappage de factures pour le moment. Ajoutez des mappages pour créer automatiquement des factures pour les organisations.",
        pl: "Brak jeszcze mapowań faktur. Dodaj mapowania, aby automatycznie tworzyć faktury dla organizacji.",
        ja: "請求書マッピングはまだありません。組織の請求書を自動的に作成するにはマッピングを追加してください。",
      },
      "ui.workflows.invoice_mapping.mapping.null_option": {
        en: "-- No Invoice (Skip) --",
        de: "-- Keine Rechnung (Überspringen) --",
        es: "-- Sin factura (Omitir) --",
        fr: "-- Pas de facture (Ignorer) --",
        pl: "-- Brak faktury (Pomiń) --",
        ja: "-- 請求書なし（スキップ） --",
      },
      "ui.workflows.invoice_mapping.mapping.hint": {
        en: "💡 Map form values to CRM organizations. When matched, an invoice is automatically created with organization billing details.",
        de: "💡 Formularwerte CRM-Organisationen zuordnen. Bei Übereinstimmung wird automatisch eine Rechnung mit den Rechnungsdetails der Organisation erstellt.",
        es: "💡 Mapee valores de formulario a organizaciones CRM. Cuando coincida, se crea automáticamente una factura con los detalles de facturación de la organización.",
        fr: "💡 Associez les valeurs de formulaire aux organisations CRM. En cas de correspondance, une facture est automatiquement créée avec les détails de facturation de l'organisation.",
        pl: "💡 Mapuj wartości formularza na organizacje CRM. Po dopasowaniu automatycznie tworzona jest faktura ze szczegółami rozliczeniowymi organizacji.",
        ja: "💡 フォーム値をCRM組織にマッピングします。一致すると、組織の請求詳細を含む請求書が自動的に作成されます。",
      },
      "ui.workflows.invoice_mapping.mapping.no_orgs": {
        en: "⚠️ No CRM organizations found. Create organizations in the CRM app first to enable mapping.",
        de: "⚠️ Keine CRM-Organisationen gefunden. Erstellen Sie zuerst Organisationen in der CRM-App, um die Zuordnung zu aktivieren.",
        es: "⚠️ No se encontraron organizaciones CRM. Cree organizaciones en la aplicación CRM primero para habilitar el mapeo.",
        fr: "⚠️ Aucune organisation CRM trouvée. Créez d'abord des organisations dans l'application CRM pour activer le mappage.",
        pl: "⚠️ Nie znaleziono organizacji CRM. Najpierw utwórz organizacje w aplikacji CRM, aby włączyć mapowanie.",
        ja: "⚠️ CRM組織が見つかりません。マッピングを有効にするには、まずCRMアプリで組織を作成してください。",
      },

      // Options
      "ui.workflows.invoice_mapping.options.title": {
        en: "Behavior Options",
        de: "Verhaltensoptionen",
        es: "Opciones de comportamiento",
        fr: "Options de comportement",
        pl: "Opcje zachowania",
        ja: "動作オプション",
      },
      "ui.workflows.invoice_mapping.options.require_mapping.label": {
        en: "Require Mapping",
        de: "Zuordnung erforderlich",
        es: "Requerir mapeo",
        fr: "Exiger le mappage",
        pl: "Wymagaj mapowania",
        ja: "マッピングを必須にする",
      },
      "ui.workflows.invoice_mapping.options.require_mapping.description": {
        en: "Fail checkout if organization not found in mapping",
        de: "Checkout fehlschlagen lassen, wenn Organisation nicht in der Zuordnung gefunden wird",
        es: "Falle el checkout si la organización no se encuentra en el mapeo",
        fr: "Échec du checkout si l'organisation n'est pas trouvée dans le mappage",
        pl: "Niepowodzenie checkout, jeśli organizacja nie zostanie znaleziona w mapowaniu",
        ja: "マッピングに組織が見つからない場合、チェックアウトを失敗させる",
      },

      // Payment terms
      "ui.workflows.invoice_mapping.payment_terms.label": {
        en: "Default Payment Terms",
        de: "Standard-Zahlungsbedingungen",
        es: "Términos de pago predeterminados",
        fr: "Conditions de paiement par défaut",
        pl: "Domyślne warunki płatności",
        ja: "デフォルトの支払条件",
      },
      "ui.workflows.invoice_mapping.payment_terms.net30": {
        en: "NET 30 (Due in 30 days)",
        de: "NETTO 30 (Fällig in 30 Tagen)",
        es: "NETO 30 (Vence en 30 días)",
        fr: "NET 30 (Échéance dans 30 jours)",
        pl: "NETTO 30 (Termin 30 dni)",
        ja: "NET 30（30日以内に支払期限）",
      },
      "ui.workflows.invoice_mapping.payment_terms.net60": {
        en: "NET 60 (Due in 60 days)",
        de: "NETTO 60 (Fällig in 60 Tagen)",
        es: "NETO 60 (Vence en 60 días)",
        fr: "NET 60 (Échéance dans 60 jours)",
        pl: "NETTO 60 (Termin 60 dni)",
        ja: "NET 60（60日以内に支払期限）",
      },
      "ui.workflows.invoice_mapping.payment_terms.net90": {
        en: "NET 90 (Due in 90 days)",
        de: "NETTO 90 (Fällig in 90 Tagen)",
        es: "NETO 90 (Vence en 90 días)",
        fr: "NET 90 (Échéance dans 90 jours)",
        pl: "NETTO 90 (Termin 90 dni)",
        ja: "NET 90（90日以内に支払期限）",
      },
      "ui.workflows.invoice_mapping.payment_terms.hint": {
        en: "Default payment terms for invoices",
        de: "Standard-Zahlungsbedingungen für Rechnungen",
        es: "Términos de pago predeterminados para facturas",
        fr: "Conditions de paiement par défaut pour les factures",
        pl: "Domyślne warunki płatności dla faktur",
        ja: "請求書のデフォルト支払条件",
      },

      // Invoice field mapping
      "ui.workflows.invoice_mapping.field_mapping.label": {
        en: "Invoice Field Mapping",
        de: "Rechnungsfeldzuordnung",
        es: "Mapeo de campos de factura",
        fr: "Mappage des champs de facture",
        pl: "Mapowanie pól faktury",
        ja: "請求書フィールドマッピング",
      },
      "ui.workflows.invoice_mapping.field_mapping.optional": {
        en: "(Optional)",
        de: "(Optional)",
        es: "(Opcional)",
        fr: "(Optionnel)",
        pl: "(Opcjonalne)",
        ja: "（オプション）",
      },
      "ui.workflows.invoice_mapping.field_mapping.hint": {
        en: "Advanced: Map custom form fields to invoice fields. Leave empty to use defaults.",
        de: "Erweitert: Benutzerdefinierte Formularfelder zu Rechnungsfeldern zuordnen. Leer lassen, um Standardwerte zu verwenden.",
        es: "Avanzado: Mapee campos de formulario personalizados a campos de factura. Deje vacío para usar valores predeterminados.",
        fr: "Avancé: Associez des champs de formulaire personnalisés aux champs de facture. Laissez vide pour utiliser les valeurs par défaut.",
        pl: "Zaawansowane: Mapuj niestandardowe pola formularza na pola faktury. Pozostaw puste, aby użyć wartości domyślnych.",
        ja: "高度：カスタムフォームフィールドを請求書フィールドにマッピングします。デフォルトを使用する場合は空のままにしてください。",
      },

      // Info
      "ui.workflows.invoice_mapping.info.how_it_works": {
        en: "💡 <strong>How it works:</strong> When a form is submitted, the organization field value is extracted and matched against your mapping. If found, an invoice is automatically created for the CRM organization with billing address and payment terms.",
        de: "💡 <strong>So funktioniert es:</strong> Wenn ein Formular abgeschickt wird, wird der Wert des Organisationsfelds extrahiert und mit Ihrer Zuordnung abgeglichen. Falls gefunden, wird automatisch eine Rechnung für die CRM-Organisation mit Rechnungsadresse und Zahlungsbedingungen erstellt.",
        es: "💡 <strong>Cómo funciona:</strong> Cuando se envía un formulario, se extrae el valor del campo de organización y se compara con su mapeo. Si se encuentra, se crea automáticamente una factura para la organización CRM con dirección de facturación y términos de pago.",
        fr: "💡 <strong>Comment ça fonctionne:</strong> Lorsqu'un formulaire est soumis, la valeur du champ d'organisation est extraite et comparée à votre mappage. Si trouvée, une facture est automatiquement créée pour l'organisation CRM avec l'adresse de facturation et les conditions de paiement.",
        pl: "💡 <strong>Jak to działa:</strong> Po przesłaniu formularza wartość pola organizacji jest wyodrębniana i porównywana z Twoim mapowaniem. Jeśli zostanie znaleziona, faktura jest automatycznie tworzona dla organizacji CRM z adresem rozliczeniowym i warunkami płatności.",
        ja: "💡 <strong>仕組み:</strong>フォームが送信されると、組織フィールドの値が抽出され、マッピングと照合されます。見つかった場合、請求先住所と支払条件を含むCRM組織の請求書が自動的に作成されます。",
      },
    };

    // ========================================
    // WORKFLOWS: CONSOLIDATED INVOICE GENERATION
    // Namespace: ui.workflows.consolidated_invoice.*
    // ========================================

    const consolidatedInvoice = {
      // Ticket selection section
      "ui.workflows.consolidated_invoice.ticket_selection.title": {
        en: "TICKET SELECTION",
        de: "TICKET-AUSWAHL",
        es: "SELECCIÓN DE ENTRADAS",
        fr: "SÉLECTION DES BILLETS",
        pl: "WYBÓR BILETÓW",
        ja: "チケット選択",
      },
      "ui.workflows.consolidated_invoice.ticket_selection.description": {
        en: "Define which tickets to consolidate. At least one criterion should be specified.",
        de: "Definieren Sie, welche Tickets zusammengefasst werden sollen. Mindestens ein Kriterium sollte angegeben werden.",
        es: "Defina qué entradas consolidar. Se debe especificar al menos un criterio.",
        fr: "Définissez les billets à consolider. Au moins un critère doit être spécifié.",
        pl: "Określ, które bilety mają być skonsolidowane. Należy określić co najmniej jedno kryterium.",
        ja: "統合するチケットを定義します。少なくとも1つの基準を指定する必要があります。",
      },
      "ui.workflows.consolidated_invoice.event.label": {
        en: "Event (Optional)",
        de: "Veranstaltung (Optional)",
        es: "Evento (Opcional)",
        fr: "Événement (Optionnel)",
        pl: "Wydarzenie (Opcjonalne)",
        ja: "イベント（オプション）",
      },
      "ui.workflows.consolidated_invoice.event.all": {
        en: "-- All Events --",
        de: "-- Alle Veranstaltungen --",
        es: "-- Todos los eventos --",
        fr: "-- Tous les événements --",
        pl: "-- Wszystkie wydarzenia --",
        ja: "-- すべてのイベント --",
      },
      "ui.workflows.consolidated_invoice.event.hint": {
        en: "Filter tickets by specific event",
        de: "Tickets nach bestimmter Veranstaltung filtern",
        es: "Filtrar entradas por evento específico",
        fr: "Filtrer les billets par événement spécifique",
        pl: "Filtruj bilety według konkretnego wydarzenia",
        ja: "特定のイベントでチケットをフィルター",
      },
      "ui.workflows.consolidated_invoice.organization.label": {
        en: "Employer/Organization (Recommended) *",
        de: "Arbeitgeber/Organisation (Empfohlen) *",
        es: "Empleador/Organización (Recomendado) *",
        fr: "Employeur/Organisation (Recommandé) *",
        pl: "Pracodawca/Organizacja (Zalecane) *",
        ja: "雇用主/組織（推奨）*",
      },
      "ui.workflows.consolidated_invoice.organization.placeholder": {
        en: "-- Select Organization --",
        de: "-- Organisation auswählen --",
        es: "-- Seleccionar organización --",
        fr: "-- Sélectionner l'organisation --",
        pl: "-- Wybierz organizację --",
        ja: "-- 組織を選択 --",
      },
      "ui.workflows.consolidated_invoice.organization.hint": {
        en: "Which organization to bill (e.g., Hospital, Company)",
        de: "Welche Organisation in Rechnung gestellt werden soll (z. B. Krankenhaus, Unternehmen)",
        es: "A qué organización facturar (ej., Hospital, Empresa)",
        fr: "Quelle organisation facturer (par ex., Hôpital, Entreprise)",
        pl: "Która organizacja ma być obciążona (np. Szpital, Firma)",
        ja: "請求する組織（例：病院、会社）",
      },
      "ui.workflows.consolidated_invoice.payment_status.label": {
        en: "Payment Status",
        de: "Zahlungsstatus",
        es: "Estado de pago",
        fr: "Statut de paiement",
        pl: "Status płatności",
        ja: "支払いステータス",
      },
      "ui.workflows.consolidated_invoice.payment_status.awaiting": {
        en: "Awaiting Employer Payment",
        de: "Zahlung durch Arbeitgeber ausstehend",
        es: "Esperando pago del empleador",
        fr: "En attente du paiement de l'employeur",
        pl: "Oczekiwanie na płatność pracodawcy",
        ja: "雇用主の支払い待ち",
      },
      "ui.workflows.consolidated_invoice.payment_status.pending": {
        en: "Pending",
        de: "Ausstehend",
        es: "Pendiente",
        fr: "En attente",
        pl: "Oczekujące",
        ja: "保留中",
      },
      "ui.workflows.consolidated_invoice.payment_status.paid": {
        en: "Paid",
        de: "Bezahlt",
        es: "Pagado",
        fr: "Payé",
        pl: "Opłacone",
        ja: "支払済み",
      },
      "ui.workflows.consolidated_invoice.date_range.start": {
        en: "Start Date (Optional)",
        de: "Startdatum (Optional)",
        es: "Fecha de inicio (Opcional)",
        fr: "Date de début (Optionnel)",
        pl: "Data rozpoczęcia (Opcjonalna)",
        ja: "開始日（オプション）",
      },
      "ui.workflows.consolidated_invoice.date_range.end": {
        en: "End Date (Optional)",
        de: "Enddatum (Optional)",
        es: "Fecha de fin (Opcional)",
        fr: "Date de fin (Optionnel)",
        pl: "Data zakończenia (Opcjonalna)",
        ja: "終了日（オプション）",
      },
      "ui.workflows.consolidated_invoice.min_tickets.label": {
        en: "Minimum Ticket Count",
        de: "Minimale Ticket-Anzahl",
        es: "Cantidad mínima de entradas",
        fr: "Nombre minimum de billets",
        pl: "Minimalna liczba biletów",
        ja: "最小チケット数",
      },
      "ui.workflows.consolidated_invoice.min_tickets.hint": {
        en: "Only generate invoice if at least this many tickets found",
        de: "Rechnung nur erstellen, wenn mindestens so viele Tickets gefunden werden",
        es: "Generar factura solo si se encuentran al menos esta cantidad de entradas",
        fr: "Générer la facture uniquement si au moins ce nombre de billets est trouvé",
        pl: "Generuj fakturę tylko wtedy, gdy znaleziono co najmniej tyle biletów",
        ja: "少なくともこの数のチケットが見つかった場合にのみ請求書を生成",
      },
      "ui.workflows.consolidated_invoice.exclude_invoiced.label": {
        en: "Exclude tickets that already have an invoice",
        de: "Tickets ausschließen, die bereits eine Rechnung haben",
        es: "Excluir entradas que ya tienen factura",
        fr: "Exclure les billets qui ont déjà une facture",
        pl: "Wyklucz bilety, które już mają fakturę",
        ja: "すでに請求書があるチケットを除外",
      },

      // Invoice settings section
      "ui.workflows.consolidated_invoice.invoice_settings.title": {
        en: "INVOICE SETTINGS",
        de: "RECHNUNGSEINSTELLUNGEN",
        es: "CONFIGURACIÓN DE FACTURA",
        fr: "PARAMÈTRES DE FACTURATION",
        pl: "USTAWIENIA FAKTURY",
        ja: "請求書設定",
      },
      "ui.workflows.consolidated_invoice.invoice_prefix.label": {
        en: "Invoice Number Prefix",
        de: "Rechnungsnummer-Präfix",
        es: "Prefijo de número de factura",
        fr: "Préfixe du numéro de facture",
        pl: "Prefiks numeru faktury",
        ja: "請求書番号の接頭辞",
      },
      "ui.workflows.consolidated_invoice.invoice_prefix.placeholder": {
        en: "INV",
        de: "RG",
        es: "FACT",
        fr: "FACT",
        pl: "FAKT",
        ja: "請求",
      },
      "ui.workflows.consolidated_invoice.invoice_prefix.hint": {
        en: 'Example: "INV" → INV-2024-001',
        de: 'Beispiel: "RG" → RG-2024-001',
        es: 'Ejemplo: "FACT" → FACT-2024-001',
        fr: 'Exemple: "FACT" → FACT-2024-001',
        pl: 'Przykład: "FAKT" → FAKT-2024-001',
        ja: '例：「請求」→ 請求-2024-001',
      },
      "ui.workflows.consolidated_invoice.template.label": {
        en: "PDF Template",
        de: "PDF-Vorlage",
        es: "Plantilla PDF",
        fr: "Modèle PDF",
        pl: "Szablon PDF",
        ja: "PDFテンプレート",
      },
      "ui.workflows.consolidated_invoice.template.summary": {
        en: "B2B Consolidated (Summary)",
        de: "B2B Konsolidiert (Zusammenfassung)",
        es: "B2B Consolidado (Resumen)",
        fr: "B2B Consolidé (Résumé)",
        pl: "B2B Skonsolidowane (Podsumowanie)",
        ja: "B2B統合（サマリー）",
      },
      "ui.workflows.consolidated_invoice.template.detailed": {
        en: "B2B Consolidated (Detailed)",
        de: "B2B Konsolidiert (Detailliert)",
        es: "B2B Consolidado (Detallado)",
        fr: "B2B Consolidé (Détaillé)",
        pl: "B2B Skonsolidowane (Szczegółowe)",
        ja: "B2B統合（詳細）",
      },
      "ui.workflows.consolidated_invoice.display_options.ticket_holder": {
        en: "Include ticket holder details (names, emails)",
        de: "Ticketinhaber-Details einschließen (Namen, E-Mails)",
        es: "Incluir detalles del titular de la entrada (nombres, correos)",
        fr: "Inclure les détails du titulaire du billet (noms, e-mails)",
        pl: "Uwzględnij szczegóły posiadacza biletu (nazwiska, e-maile)",
        ja: "チケット保有者の詳細を含める（氏名、メール）",
      },
      "ui.workflows.consolidated_invoice.display_options.group_by": {
        en: "Group line items by ticket holder",
        de: "Posten nach Ticketinhaber gruppieren",
        es: "Agrupar líneas de detalle por titular de entrada",
        fr: "Regrouper les lignes par titulaire du billet",
        pl: "Grupuj pozycje według posiadacza biletu",
        ja: "チケット保有者別に項目をグループ化",
      },
      "ui.workflows.consolidated_invoice.notes.label": {
        en: "Invoice Notes (Optional)",
        de: "Rechnungsnotizen (Optional)",
        es: "Notas de factura (Opcional)",
        fr: "Notes de facture (Optionnel)",
        pl: "Notatki do faktury (Opcjonalne)",
        ja: "請求書メモ（オプション）",
      },
      "ui.workflows.consolidated_invoice.notes.placeholder": {
        en: "Add custom notes to appear on the invoice...",
        de: "Benutzerdefinierte Notizen hinzufügen, die auf der Rechnung erscheinen...",
        es: "Agregue notas personalizadas para que aparezcan en la factura...",
        fr: "Ajoutez des notes personnalisées à afficher sur la facture...",
        pl: "Dodaj niestandardowe notatki, które pojawią się na fakturze...",
        ja: "請求書に表示するカスタムメモを追加...",
      },

      // Email notifications section
      "ui.workflows.consolidated_invoice.email.title": {
        en: "EMAIL NOTIFICATIONS",
        de: "E-MAIL-BENACHRICHTIGUNGEN",
        es: "NOTIFICACIONES POR CORREO",
        fr: "NOTIFICATIONS PAR E-MAIL",
        pl: "POWIADOMIENIA E-MAIL",
        ja: "メール通知",
      },
      "ui.workflows.consolidated_invoice.email.send.label": {
        en: "Send invoice via email",
        de: "Rechnung per E-Mail senden",
        es: "Enviar factura por correo electrónico",
        fr: "Envoyer la facture par e-mail",
        pl: "Wyślij fakturę e-mailem",
        ja: "メールで請求書を送信",
      },
      "ui.workflows.consolidated_invoice.email.subject.label": {
        en: "Email Subject (Optional)",
        de: "E-Mail-Betreff (Optional)",
        es: "Asunto del correo (Opcional)",
        fr: "Objet de l'e-mail (Optionnel)",
        pl: "Temat wiadomości (Opcjonalny)",
        ja: "メール件名（オプション）",
      },
      "ui.workflows.consolidated_invoice.email.subject.placeholder": {
        en: "Your Consolidated Invoice",
        de: "Ihre konsolidierte Rechnung",
        es: "Su factura consolidada",
        fr: "Votre facture consolidée",
        pl: "Twoja skonsolidowana faktura",
        ja: "統合請求書",
      },
      "ui.workflows.consolidated_invoice.email.subject.hint": {
        en: "Leave empty for default subject",
        de: "Leer lassen für Standard-Betreff",
        es: "Dejar vacío para asunto predeterminado",
        fr: "Laisser vide pour l'objet par défaut",
        pl: "Pozostaw puste dla domyślnego tematu",
        ja: "デフォルトの件名を使用する場合は空のままにします",
      },
      "ui.workflows.consolidated_invoice.email.message.label": {
        en: "Email Message (Optional)",
        de: "E-Mail-Nachricht (Optional)",
        es: "Mensaje de correo (Opcional)",
        fr: "Message e-mail (Optionnel)",
        pl: "Treść wiadomości (Opcjonalna)",
        ja: "メールメッセージ（オプション）",
      },
      "ui.workflows.consolidated_invoice.email.message.placeholder": {
        en: "Please find attached your consolidated invoice...",
        de: "Anbei finden Sie Ihre konsolidierte Rechnung...",
        es: "Adjunto encontrará su factura consolidada...",
        fr: "Veuillez trouver ci-joint votre facture consolidée...",
        pl: "W załączeniu znajdą Państwo skonsolidowaną fakturę...",
        ja: "統合請求書を添付しております...",
      },
      "ui.workflows.consolidated_invoice.email.cc.label": {
        en: "CC Emails (Optional)",
        de: "CC-E-Mails (Optional)",
        es: "CC de correos (Opcional)",
        fr: "Emails en CC (Optionnel)",
        pl: "E-maile DW (Opcjonalne)",
        ja: "CCメール（オプション）",
      },
      "ui.workflows.consolidated_invoice.email.cc.placeholder": {
        en: "finance@company.com, billing@company.com",
        de: "finanzen@firma.de, abrechnung@firma.de",
        es: "finanzas@empresa.com, facturacion@empresa.com",
        fr: "finance@entreprise.com, facturation@entreprise.com",
        pl: "finanse@firma.pl, rozliczenia@firma.pl",
        ja: "finance@company.com, billing@company.com",
      },
      "ui.workflows.consolidated_invoice.email.cc.hint": {
        en: "Comma-separated list of additional recipients",
        de: "Kommagetrennte Liste zusätzlicher Empfänger",
        es: "Lista separada por comas de destinatarios adicionales",
        fr: "Liste séparée par des virgules de destinataires supplémentaires",
        pl: "Lista dodatkowych odbiorców rozdzielona przecinkami",
        ja: "追加の受信者のカンマ区切りリスト",
      },

      // Summary
      "ui.workflows.consolidated_invoice.summary.title": {
        en: "📋 Configuration Summary",
        de: "📋 Konfigurations-Zusammenfassung",
        es: "📋 Resumen de configuración",
        fr: "📋 Résumé de la configuration",
        pl: "📋 Podsumowanie konfiguracji",
        ja: "📋 設定サマリー",
      },
      "ui.workflows.consolidated_invoice.summary.consolidate": {
        en: "Will consolidate tickets for selected organization",
        de: "Wird Tickets für ausgewählte Organisation zusammenfassen",
        es: "Consolidará entradas para la organización seleccionada",
        fr: "Consolidera les billets pour l'organisation sélectionnée",
        pl: "Skonsoliduje bilety dla wybranej organizacji",
        ja: "選択した組織のチケットを統合します",
      },
      "ui.workflows.consolidated_invoice.summary.consolidate_criteria": {
        en: "Will consolidate tickets matching criteria",
        de: "Wird Tickets zusammenfassen, die Kriterien entsprechen",
        es: "Consolidará entradas que coincidan con los criterios",
        fr: "Consolidera les billets correspondant aux critères",
        pl: "Skonsoliduje bilety spełniające kryteria",
        ja: "基準に一致するチケットを統合します",
      },
      "ui.workflows.consolidated_invoice.summary.payment_terms": {
        en: "Payment terms:",
        de: "Zahlungsbedingungen:",
        es: "Términos de pago:",
        fr: "Conditions de paiement:",
        pl: "Warunki płatności:",
        ja: "支払条件：",
      },
      "ui.workflows.consolidated_invoice.summary.minimum": {
        en: "Minimum",
        de: "Mindestens",
        es: "Mínimo",
        fr: "Minimum",
        pl: "Minimum",
        ja: "最小",
      },
      "ui.workflows.consolidated_invoice.summary.tickets_required": {
        en: "ticket(s) required",
        de: "Ticket(s) erforderlich",
        es: "entrada(s) requerida(s)",
        fr: "billet(s) requis",
        pl: "bilet(y) wymagane",
        ja: "チケット必要",
      },
      "ui.workflows.consolidated_invoice.summary.email_sent": {
        en: "Email will be sent",
        de: "E-Mail wird gesendet",
        es: "Se enviará correo electrónico",
        fr: "L'e-mail sera envoyé",
        pl: "E-mail zostanie wysłany",
        ja: "メールが送信されます",
      },
      "ui.workflows.consolidated_invoice.summary.no_email": {
        en: "No email notification",
        de: "Keine E-Mail-Benachrichtigung",
        es: "Sin notificación por correo",
        fr: "Pas de notification par e-mail",
        pl: "Brak powiadomienia e-mail",
        ja: "メール通知なし",
      },
    };

    // ========================================
    // WORKFLOWS: INVOICE PAYMENT CONFIG
    // Namespace: ui.workflows.invoice_payment.*
    // ========================================

    const invoicePayment = {
      // Payment terms section
      "ui.workflows.invoice_payment.payment_terms.title": {
        en: "📅 Payment Terms",
        de: "📅 Zahlungsbedingungen",
        es: "📅 Términos de pago",
        fr: "📅 Conditions de paiement",
        pl: "📅 Warunki płatności",
        ja: "📅 支払条件",
      },
      "ui.workflows.invoice_payment.payment_terms.required": {
        en: "*",
        de: "*",
        es: "*",
        fr: "*",
        pl: "*",
        ja: "*",
      },
      "ui.workflows.invoice_payment.payment_terms.default.label": {
        en: "Default Payment Terms",
        de: "Standard-Zahlungsbedingungen",
        es: "Términos de pago predeterminados",
        fr: "Conditions de paiement par défaut",
        pl: "Domyślne warunki płatności",
        ja: "デフォルトの支払条件",
      },
      "ui.workflows.invoice_payment.payment_terms.net30": {
        en: "NET 30 (30 days)",
        de: "NETTO 30 (30 Tage)",
        es: "NETO 30 (30 días)",
        fr: "NET 30 (30 jours)",
        pl: "NETTO 30 (30 dni)",
        ja: "NET 30（30日）",
      },
      "ui.workflows.invoice_payment.payment_terms.net60": {
        en: "NET 60 (60 days)",
        de: "NETTO 60 (60 Tage)",
        es: "NETO 60 (60 días)",
        fr: "NET 60 (60 jours)",
        pl: "NETTO 60 (60 dni)",
        ja: "NET 60（60日）",
      },
      "ui.workflows.invoice_payment.payment_terms.net90": {
        en: "NET 90 (90 days)",
        de: "NETTO 90 (90 Tage)",
        es: "NETO 90 (90 días)",
        fr: "NET 90 (90 jours)",
        pl: "NETTO 90 (90 dni)",
        ja: "NET 90（90日）",
      },
      "ui.workflows.invoice_payment.payment_terms.employer_specific.label": {
        en: "Employer-Specific Payment Terms",
        de: "Arbeitgeberspezifische Zahlungsbedingungen",
        es: "Términos de pago específicos del empleador",
        fr: "Conditions de paiement spécifiques à l'employeur",
        pl: "Warunki płatności specyficzne dla pracodawcy",
        ja: "雇用主固有の支払条件",
      },
      "ui.workflows.invoice_payment.payment_terms.employer_specific.description": {
        en: "Override default terms for specific employers",
        de: "Standardbedingungen für bestimmte Arbeitgeber überschreiben",
        es: "Anular términos predeterminados para empleadores específicos",
        fr: "Remplacer les conditions par défaut pour des employeurs spécifiques",
        pl: "Zastąp domyślne warunki dla określonych pracodawców",
        ja: "特定の雇用主のデフォルト条件を上書き",
      },
      "ui.workflows.invoice_payment.payment_terms.default_option": {
        en: "Default",
        de: "Standard",
        es: "Predeterminado",
        fr: "Par défaut",
        pl: "Domyślne",
        ja: "デフォルト",
      },
      "ui.workflows.invoice_payment.payment_terms.business_days.label": {
        en: "Calculate due date using business days only (exclude weekends)",
        de: "Fälligkeitsdatum nur anhand von Werktagen berechnen (Wochenenden ausschließen)",
        es: "Calcular fecha de vencimiento usando solo días laborables (excluir fines de semana)",
        fr: "Calculer la date d'échéance en utilisant uniquement les jours ouvrables (exclure les week-ends)",
        pl: "Oblicz termin płatności używając tylko dni roboczych (wyklucz weekendy)",
        ja: "営業日のみを使用して期日を計算（週末を除外）",
      },
      "ui.workflows.invoice_payment.payment_terms.grace_period.label": {
        en: "Grace Period (days)",
        de: "Nachfrist (Tage)",
        es: "Período de gracia (días)",
        fr: "Période de grâce (jours)",
        pl: "Okres karencji (dni)",
        ja: "猶予期間（日数）",
      },
      "ui.workflows.invoice_payment.payment_terms.grace_period.placeholder": {
        en: "0",
        de: "0",
        es: "0",
        fr: "0",
        pl: "0",
        ja: "0",
      },
      "ui.workflows.invoice_payment.payment_terms.grace_period.hint": {
        en: "Extra days before invoice is considered late",
        de: "Zusätzliche Tage, bevor die Rechnung als verspätet gilt",
        es: "Días adicionales antes de que la factura se considere vencida",
        fr: "Jours supplémentaires avant que la facture ne soit considérée comme en retard",
        pl: "Dodatkowe dni, zanim faktura zostanie uznana za spóźnioną",
        ja: "請求書が遅延と見なされるまでの追加日数",
      },

      // CRM integration section
      "ui.workflows.invoice_payment.crm.title": {
        en: "🏢 CRM Integration",
        de: "🏢 CRM-Integration",
        es: "🏢 Integración CRM",
        fr: "🏢 Intégration CRM",
        pl: "🏢 Integracja CRM",
        ja: "🏢 CRM統合",
      },
      "ui.workflows.invoice_payment.crm.require_org.label": {
        en: "Require CRM organization for invoices",
        de: "CRM-Organisation für Rechnungen erforderlich",
        es: "Requerir organización CRM para facturas",
        fr: "Exiger une organisation CRM pour les factures",
        pl: "Wymagaj organizacji CRM dla faktur",
        ja: "請求書にCRM組織を必須にする",
      },
      "ui.workflows.invoice_payment.crm.auto_create.label": {
        en: "Auto-create CRM organization if missing",
        de: "CRM-Organisation automatisch erstellen, wenn fehlend",
        es: "Crear automáticamente organización CRM si falta",
        fr: "Créer automatiquement l'organisation CRM si manquante",
        pl: "Automatycznie utwórz organizację CRM, jeśli brakuje",
        ja: "CRM組織が存在しない場合は自動作成",
      },
      "ui.workflows.invoice_payment.crm.auto_fill.label": {
        en: "Auto-fill billing address from CRM organization",
        de: "Rechnungsadresse automatisch aus CRM-Organisation ausfüllen",
        es: "Autocompletar dirección de facturación desde organización CRM",
        fr: "Remplir automatiquement l'adresse de facturation depuis l'organisation CRM",
        pl: "Automatycznie wypełnij adres rozliczeniowy z organizacji CRM",
        ja: "CRM組織から請求先住所を自動入力",
      },
      "ui.workflows.invoice_payment.crm.require_address.label": {
        en: "Require billing address for invoices",
        de: "Rechnungsadresse für Rechnungen erforderlich",
        es: "Requerir dirección de facturación para facturas",
        fr: "Exiger une adresse de facturation pour les factures",
        pl: "Wymagaj adresu rozliczeniowego dla faktur",
        ja: "請求書に請求先住所を必須にする",
      },

      // Invoice details section
      "ui.workflows.invoice_payment.details.title": {
        en: "📄 Invoice Details",
        de: "📄 Rechnungsdetails",
        es: "📄 Detalles de factura",
        fr: "📄 Détails de la facture",
        pl: "📄 Szczegóły faktury",
        ja: "📄 請求書詳細",
      },
      "ui.workflows.invoice_payment.details.line_items.label": {
        en: "Show each product as separate line item",
        de: "Jedes Produkt als separaten Posten anzeigen",
        es: "Mostrar cada producto como línea de detalle separada",
        fr: "Afficher chaque produit comme ligne distincte",
        pl: "Pokaż każdy produkt jako osobną pozycję",
        ja: "各製品を個別の項目として表示",
      },
      "ui.workflows.invoice_payment.details.tax_breakdown.label": {
        en: "Show detailed tax breakdown",
        de: "Detaillierte Steueraufschlüsselung anzeigen",
        es: "Mostrar desglose detallado de impuestos",
        fr: "Afficher la répartition détaillée des taxes",
        pl: "Pokaż szczegółowy podział podatków",
        ja: "詳細な税金の内訳を表示",
      },
      "ui.workflows.invoice_payment.details.addons.label": {
        en: "Show add-ons as separate line items",
        de: "Add-ons als separate Posten anzeigen",
        es: "Mostrar complementos como líneas de detalle separadas",
        fr: "Afficher les modules complémentaires comme lignes distinctes",
        pl: "Pokaż dodatki jako osobne pozycje",
        ja: "アドオンを個別の項目として表示",
      },

      // Email notifications section
      "ui.workflows.invoice_payment.email.title": {
        en: "✉️ Email Notifications",
        de: "✉️ E-Mail-Benachrichtigungen",
        es: "✉️ Notificaciones por correo",
        fr: "✉️ Notifications par e-mail",
        pl: "✉️ Powiadomienia e-mail",
        ja: "✉️ メール通知",
      },
      "ui.workflows.invoice_payment.email.send.label": {
        en: "Send invoice via email",
        de: "Rechnung per E-Mail senden",
        es: "Enviar factura por correo electrónico",
        fr: "Envoyer la facture par e-mail",
        pl: "Wyślij fakturę e-mailem",
        ja: "メールで請求書を送信",
      },
      "ui.workflows.invoice_payment.email.cc.label": {
        en: "CC Emails (comma-separated)",
        de: "CC-E-Mails (kommagetrennt)",
        es: "CC de correos (separados por comas)",
        fr: "Emails en CC (séparés par des virgules)",
        pl: "E-maile DW (rozdzielone przecinkami)",
        ja: "CCメール（カンマ区切り）",
      },
      "ui.workflows.invoice_payment.email.cc.placeholder": {
        en: "accounting@company.com, billing@company.com",
        de: "buchhaltung@firma.de, abrechnung@firma.de",
        es: "contabilidad@empresa.com, facturacion@empresa.com",
        fr: "comptabilite@entreprise.com, facturation@entreprise.com",
        pl: "ksiegowosc@firma.pl, rozliczenia@firma.pl",
        ja: "accounting@company.com, billing@company.com",
      },
      "ui.workflows.invoice_payment.email.template.label": {
        en: "Email Template ID (optional)",
        de: "E-Mail-Vorlagen-ID (optional)",
        es: "ID de plantilla de correo (opcional)",
        fr: "ID du modèle d'e-mail (optionnel)",
        pl: "ID szablonu e-mail (opcjonalne)",
        ja: "メールテンプレートID（オプション）",
      },
      "ui.workflows.invoice_payment.email.template.placeholder": {
        en: "Leave blank for default template",
        de: "Leer lassen für Standardvorlage",
        es: "Dejar en blanco para plantilla predeterminada",
        fr: "Laisser vide pour le modèle par défaut",
        pl: "Pozostaw puste dla domyślnego szablonu",
        ja: "デフォルトテンプレートを使用する場合は空のままにします",
      },

      // Payment instructions section
      "ui.workflows.invoice_payment.payment_instructions.title": {
        en: "💳 Payment Instructions",
        de: "💳 Zahlungsanweisungen",
        es: "💳 Instrucciones de pago",
        fr: "💳 Instructions de paiement",
        pl: "💳 Instrukcje płatności",
        ja: "💳 支払い指示",
      },
      "ui.workflows.invoice_payment.payment_instructions.custom.label": {
        en: "Custom Payment Instructions",
        de: "Benutzerdefinierte Zahlungsanweisungen",
        es: "Instrucciones de pago personalizadas",
        fr: "Instructions de paiement personnalisées",
        pl: "Niestandardowe instrukcje płatności",
        ja: "カスタム支払い指示",
      },
      "ui.workflows.invoice_payment.payment_instructions.custom.placeholder": {
        en: "Payment due within terms. Bank transfer preferred.",
        de: "Zahlung innerhalb der Bedingungen fällig. Banküberweisung bevorzugt.",
        es: "Pago vencido según términos. Transferencia bancaria preferida.",
        fr: "Paiement dû selon les conditions. Virement bancaire préféré.",
        pl: "Płatność według warunków. Przelew bankowy preferowany.",
        ja: "条件内にお支払いください。銀行振込が望ましいです。",
      },
      "ui.workflows.invoice_payment.payment_instructions.bank_details.label": {
        en: "Bank Account Details (JSON)",
        de: "Bankkonto-Details (JSON)",
        es: "Detalles de cuenta bancaria (JSON)",
        fr: "Détails du compte bancaire (JSON)",
        pl: "Szczegóły konta bankowego (JSON)",
        ja: "銀行口座詳細（JSON）",
      },
      "ui.workflows.invoice_payment.payment_instructions.bank_details.placeholder": {
        en: '{\n  "accountName": "Company Name",\n  "iban": "DE89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "Bank Name",\n  "bankAddress": "City, Country"\n}',
        de: '{\n  "accountName": "Firmenname",\n  "iban": "DE89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "Bankname",\n  "bankAddress": "Stadt, Land"\n}',
        es: '{\n  "accountName": "Nombre de la Empresa",\n  "iban": "ES89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "Nombre del Banco",\n  "bankAddress": "Ciudad, País"\n}',
        fr: '{\n  "accountName": "Nom de l\'Entreprise",\n  "iban": "FR89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "Nom de la Banque",\n  "bankAddress": "Ville, Pays"\n}',
        pl: '{\n  "accountName": "Nazwa Firmy",\n  "iban": "PL89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "Nazwa Banku",\n  "bankAddress": "Miasto, Kraj"\n}',
        ja: '{\n  "accountName": "会社名",\n  "iban": "JP89...",\n  "swift": "COBADEFFXXX",\n  "bankName": "銀行名",\n  "bankAddress": "都市、国"\n}',
      },
    };

    // ========================================
    // INVOICING WINDOW
    // Namespace: ui.invoicing_window.*
    // ========================================

    const invoicingWindow = {
      // Window header
      "ui.invoicing_window.header.title": {
        en: "B2B/B2C Invoicing",
        de: "B2B/B2C Rechnungsstellung",
        es: "Facturación B2B/B2C",
        fr: "Facturation B2B/B2C",
        pl: "Fakturowanie B2B/B2C",
        ja: "B2B/B2C請求",
      },
      "ui.invoicing_window.header.description": {
        en: "Comprehensive invoice management with B2B consolidation",
        de: "Umfassende Rechnungsverwaltung mit B2B-Konsolidierung",
        es: "Gestión integral de facturas con consolidación B2B",
        fr: "Gestion complète des factures avec consolidation B2B",
        pl: "Kompleksowe zarządzanie fakturami z konsolidacją B2B",
        ja: "B2B統合による包括的な請求書管理",
      },

      // Tabs
      "ui.invoicing_window.tabs.create": {
        en: "Create",
        de: "Erstellen",
        es: "Crear",
        fr: "Créer",
        pl: "Utwórz",
        ja: "作成",
      },
      "ui.invoicing_window.tabs.invoices": {
        en: "All Invoices",
        de: "Alle Rechnungen",
        es: "Todas las facturas",
        fr: "Toutes les factures",
        pl: "Wszystkie faktury",
        ja: "すべての請求書",
      },
      "ui.invoicing_window.tabs.transactions": {
        en: "Transactions",
        de: "Transaktionen",
        es: "Transacciones",
        fr: "Transactions",
        pl: "Transakcje",
        ja: "取引",
      },
      "ui.invoicing_window.tabs.templates": {
        en: "Templates",
        de: "Vorlagen",
        es: "Plantillas",
        fr: "Modèles",
        pl: "Szablony",
        ja: "テンプレート",
      },

      // Sub-tabs
      "ui.invoicing_window.subtabs.draft": {
        en: "Draft",
        de: "Entwurf",
        es: "Borrador",
        fr: "Brouillon",
        pl: "Szkic",
        ja: "下書き",
      },
      "ui.invoicing_window.subtabs.sealed": {
        en: "Sealed",
        de: "Festgeschrieben",
        es: "Sellada",
        fr: "Scellée",
        pl: "Zamknięte",
        ja: "封印済み",
      },

      // Empty states
      "ui.invoicing_window.empty.draft.title": {
        en: "No Draft Invoices",
        de: "Keine Entwurfsrechnungen",
        es: "Sin facturas en borrador",
        fr: "Aucune facture en brouillon",
        pl: "Brak szkiców faktur",
        ja: "下書き請求書なし",
      },
      "ui.invoicing_window.empty.draft.description": {
        en: "Draft invoices will appear here when created from transactions.",
        de: "Entwurfsrechnungen werden hier angezeigt, wenn sie aus Transaktionen erstellt werden.",
        es: "Las facturas en borrador aparecerán aquí cuando se creen a partir de transacciones.",
        fr: "Les factures en brouillon apparaîtront ici lorsqu'elles seront créées à partir de transactions.",
        pl: "Szkice faktur pojawią się tutaj po utworzeniu z transakcji.",
        ja: "取引から作成された下書き請求書がここに表示されます。",
      },
      "ui.invoicing_window.empty.sealed.title": {
        en: "No Sealed Invoices",
        de: "Keine festgeschriebenen Rechnungen",
        es: "Sin facturas selladas",
        fr: "Aucune facture scellée",
        pl: "Brak zamkniętych faktur",
        ja: "封印済み請求書なし",
      },
      "ui.invoicing_window.empty.sealed.description": {
        en: "Sealed invoices will appear here after you finalize draft invoices.",
        de: "Festgeschriebene Rechnungen werden hier angezeigt, nachdem Sie Entwurfsrechnungen finalisiert haben.",
        es: "Las facturas selladas aparecerán aquí después de finalizar las facturas en borrador.",
        fr: "Les factures scellées apparaîtront ici après avoir finalisé les factures en brouillon.",
        pl: "Zamknięte faktury pojawią się tutaj po sfinalizowaniu szkiców faktur.",
        ja: "下書き請求書を確定すると、封印済み請求書がここに表示されます。",
      },

      // Status labels
      "ui.invoicing_window.status.draft": {
        en: "DRAFT",
        de: "ENTWURF",
        es: "BORRADOR",
        fr: "BROUILLON",
        pl: "SZKIC",
        ja: "下書き",
      },

      // Invoice list labels
      "ui.invoicing_window.list.item_count": {
        en: "{count} item{plural}",
        de: "{count} Element{plural}",
        es: "{count} artículo{plural}",
        fr: "{count} article{plural}",
        pl: "{count} element{plural}",
        ja: "{count}項目",
      },

      // Modal labels
      "ui.invoicing_window.modal.invoice_number": {
        en: "Invoice Number",
        de: "Rechnungsnummer",
        es: "Número de factura",
        fr: "Numéro de facture",
        pl: "Numer faktury",
        ja: "請求書番号",
      },
      "ui.invoicing_window.modal.status": {
        en: "Status",
        de: "Status",
        es: "Estado",
        fr: "Statut",
        pl: "Status",
        ja: "ステータス",
      },
      "ui.invoicing_window.modal.invoice_date": {
        en: "Invoice Date",
        de: "Rechnungsdatum",
        es: "Fecha de factura",
        fr: "Date de facture",
        pl: "Data faktury",
        ja: "請求日",
      },
      "ui.invoicing_window.modal.due_date": {
        en: "Due Date",
        de: "Fälligkeitsdatum",
        es: "Fecha de vencimiento",
        fr: "Date d'échéance",
        pl: "Termin płatności",
        ja: "支払期限",
      },
      "ui.invoicing_window.modal.bill_to": {
        en: "Bill To",
        de: "Rechnung an",
        es: "Facturar a",
        fr: "Facturer à",
        pl: "Faktura dla",
        ja: "請求先",
      },
      "ui.invoicing_window.modal.items": {
        en: "Items",
        de: "Artikel",
        es: "Artículos",
        fr: "Articles",
        pl: "Pozycje",
        ja: "項目",
      },
      "ui.invoicing_window.modal.subtotal": {
        en: "Subtotal:",
        de: "Zwischensumme:",
        es: "Subtotal:",
        fr: "Sous-total:",
        pl: "Suma częściowa:",
        ja: "小計：",
      },
      "ui.invoicing_window.modal.tax": {
        en: "Tax:",
        de: "Steuer:",
        es: "Impuesto:",
        fr: "Taxe:",
        pl: "Podatek:",
        ja: "税金：",
      },
      "ui.invoicing_window.modal.total": {
        en: "Total:",
        de: "Gesamt:",
        es: "Total:",
        fr: "Total:",
        pl: "Suma:",
        ja: "合計：",
      },

      // Buttons
      "ui.invoicing_window.buttons.seal": {
        en: "Seal Invoice",
        de: "Rechnung festschreiben",
        es: "Sellar factura",
        fr: "Sceller la facture",
        pl: "Zamknij fakturę",
        ja: "請求書を封印",
      },
      "ui.invoicing_window.buttons.sealing": {
        en: "Sealing...",
        de: "Wird festgeschrieben...",
        es: "Sellando...",
        fr: "Scellement en cours...",
        pl: "Zamykanie...",
        ja: "封印中...",
      },
      "ui.invoicing_window.buttons.download_pdf": {
        en: "Download PDF",
        de: "PDF herunterladen",
        es: "Descargar PDF",
        fr: "Télécharger le PDF",
        pl: "Pobierz PDF",
        ja: "PDFをダウンロード",
      },
      "ui.invoicing_window.buttons.send_email": {
        en: "Send Email",
        de: "E-Mail senden",
        es: "Enviar correo",
        fr: "Envoyer un e-mail",
        pl: "Wyślij e-mail",
        ja: "メールを送信",
      },
      "ui.invoicing_window.buttons.close": {
        en: "Close",
        de: "Schließen",
        es: "Cerrar",
        fr: "Fermer",
        pl: "Zamknij",
        ja: "閉じる",
      },

      // Create Invoice Tab
      "ui.invoicing_window.create.title": {
        en: "Create New B2B Invoice",
        de: "Neue B2B-Rechnung erstellen",
        es: "Crear nueva factura B2B",
        fr: "Créer une nouvelle facture B2B",
        pl: "Utwórz nową fakturę B2B",
        ja: "新しいB2B請求書を作成",
      },
      "ui.invoicing_window.create.description": {
        en: "Create invoices for your B2B customers from the CRM with automatic VAT calculation and credit limit validation.",
        de: "Erstellen Sie Rechnungen für Ihre B2B-Kunden aus dem CRM mit automatischer Mehrwertsteuerberechnung und Kreditlimitprüfung.",
        es: "Cree facturas para sus clientes B2B desde el CRM con cálculo automático de IVA y validación de límite de crédito.",
        fr: "Créez des factures pour vos clients B2B depuis le CRM avec calcul automatique de la TVA et validation de la limite de crédit.",
        pl: "Twórz faktury dla klientów B2B z CRM z automatycznym obliczaniem VAT i walidacją limitu kredytowego.",
        ja: "CRMからB2B顧客の請求書を作成し、VAT自動計算と与信限度額検証を行います。",
      },
      "ui.invoicing_window.create.select_customer": {
        en: "Select Customer",
        de: "Kunde auswählen",
        es: "Seleccionar cliente",
        fr: "Sélectionner le client",
        pl: "Wybierz klienta",
        ja: "顧客を選択",
      },
      "ui.invoicing_window.create.select_customer_placeholder": {
        en: "Choose a CRM organization...",
        de: "CRM-Organisation wählen...",
        es: "Elegir organización CRM...",
        fr: "Choisir une organisation CRM...",
        pl: "Wybierz organizację CRM...",
        ja: "CRM組織を選択...",
      },
      "ui.invoicing_window.create.no_b2b_orgs": {
        en: "No B2B organizations found. Please set up billing information in the CRM first.",
        de: "Keine B2B-Organisationen gefunden. Bitte richten Sie zuerst die Rechnungsinformationen im CRM ein.",
        es: "No se encontraron organizaciones B2B. Configure primero la información de facturación en el CRM.",
        fr: "Aucune organisation B2B trouvée. Veuillez d'abord configurer les informations de facturation dans le CRM.",
        pl: "Nie znaleziono organizacji B2B. Najpierw skonfiguruj informacje rozliczeniowe w CRM.",
        ja: "B2B組織が見つかりません。まずCRMで請求情報を設定してください。",
      },
      "ui.invoicing_window.create.billing_info": {
        en: "Billing Information",
        de: "Rechnungsinformationen",
        es: "Información de facturación",
        fr: "Informations de facturation",
        pl: "Informacje rozliczeniowe",
        ja: "請求情報",
      },
      "ui.invoicing_window.create.payment_terms": {
        en: "Payment Terms",
        de: "Zahlungsbedingungen",
        es: "Condiciones de pago",
        fr: "Conditions de paiement",
        pl: "Warunki płatności",
        ja: "支払条件",
      },
      "ui.invoicing_window.create.credit_limit": {
        en: "Credit Limit",
        de: "Kreditlimit",
        es: "Límite de crédito",
        fr: "Limite de crédit",
        pl: "Limit kredytowy",
        ja: "与信限度額",
      },
      "ui.invoicing_window.create.vat_number": {
        en: "VAT Number",
        de: "USt-IdNr.",
        es: "Número de IVA",
        fr: "Numéro de TVA",
        pl: "Numer VAT",
        ja: "VAT番号",
      },
      "ui.invoicing_window.create.tax_exempt": {
        en: "Tax Exempt",
        de: "Steuerbefreit",
        es: "Exento de impuestos",
        fr: "Exonéré de TVA",
        pl: "Zwolniony z podatku",
        ja: "免税",
      },
      "ui.invoicing_window.create.remaining_credit": {
        en: "Remaining Credit",
        de: "Verbleibender Kredit",
        es: "Crédito restante",
        fr: "Crédit restant",
        pl: "Pozostały kredyt",
        ja: "残与信額",
      },
      "ui.invoicing_window.create.invoice_date": {
        en: "Invoice Date",
        de: "Rechnungsdatum",
        es: "Fecha de factura",
        fr: "Date de facture",
        pl: "Data faktury",
        ja: "請求日",
      },
      "ui.invoicing_window.create.payment_terms_override": {
        en: "Payment Terms (Override)",
        de: "Zahlungsbedingungen (Überschreiben)",
        es: "Condiciones de pago (Anular)",
        fr: "Conditions de paiement (Remplacer)",
        pl: "Warunki płatności (Nadpisz)",
        ja: "支払条件（上書き）",
      },
      "ui.invoicing_window.create.use_default": {
        en: "Use default from customer",
        de: "Standard vom Kunden verwenden",
        es: "Usar predeterminado del cliente",
        fr: "Utiliser par défaut du client",
        pl: "Użyj domyślnego z klienta",
        ja: "顧客のデフォルトを使用",
      },
      "ui.invoicing_window.create.due_on_receipt": {
        en: "Due on Receipt",
        de: "Fällig bei Erhalt",
        es: "Vence al recibir",
        fr: "Dû à réception",
        pl: "Płatne przy odbiorze",
        ja: "受領時支払い",
      },
      "ui.invoicing_window.create.net15": {
        en: "Net 15 Days",
        de: "Netto 15 Tage",
        es: "Neto 15 días",
        fr: "Net 15 jours",
        pl: "Netto 15 dni",
        ja: "正味15日",
      },
      "ui.invoicing_window.create.net30": {
        en: "Net 30 Days",
        de: "Netto 30 Tage",
        es: "Neto 30 días",
        fr: "Net 30 jours",
        pl: "Netto 30 dni",
        ja: "正味30日",
      },
      "ui.invoicing_window.create.net60": {
        en: "Net 60 Days",
        de: "Netto 60 Tage",
        es: "Neto 60 días",
        fr: "Net 60 jours",
        pl: "Netto 60 dni",
        ja: "正味60日",
      },
      "ui.invoicing_window.create.net90": {
        en: "Net 90 Days",
        de: "Netto 90 Tage",
        es: "Neto 90 días",
        fr: "Net 90 jours",
        pl: "Netto 90 dni",
        ja: "正味90日",
      },
      "ui.invoicing_window.create.line_items": {
        en: "Line Items",
        de: "Positionen",
        es: "Artículos de línea",
        fr: "Lignes d'article",
        pl: "Pozycje",
        ja: "明細項目",
      },
      "ui.invoicing_window.create.description_placeholder": {
        en: "Service or product description",
        de: "Service- oder Produktbeschreibung",
        es: "Descripción del servicio o producto",
        fr: "Description du service ou produit",
        pl: "Opis usługi lub produktu",
        ja: "サービスまたは製品の説明",
      },
      "ui.invoicing_window.create.quantity_placeholder": {
        en: "Qty",
        de: "Menge",
        es: "Cant",
        fr: "Qté",
        pl: "Ilość",
        ja: "数量",
      },
      "ui.invoicing_window.create.price_placeholder": {
        en: "Unit Price (€)",
        de: "Stückpreis (€)",
        es: "Precio unitario (€)",
        fr: "Prix unitaire (€)",
        pl: "Cena jednostkowa (€)",
        ja: "単価（€）",
      },
      "ui.invoicing_window.create.remove_item": {
        en: "Remove item",
        de: "Position entfernen",
        es: "Eliminar artículo",
        fr: "Supprimer l'article",
        pl: "Usuń pozycję",
        ja: "項目を削除",
      },
      "ui.invoicing_window.create.add_item": {
        en: "Add Line Item",
        de: "Position hinzufügen",
        es: "Agregar artículo",
        fr: "Ajouter une ligne",
        pl: "Dodaj pozycję",
        ja: "明細を追加",
      },
      "ui.invoicing_window.create.totals": {
        en: "Invoice Totals",
        de: "Rechnungssummen",
        es: "Totales de factura",
        fr: "Totaux de facture",
        pl: "Sumy faktury",
        ja: "請求書合計",
      },
      "ui.invoicing_window.create.subtotal": {
        en: "Subtotal",
        de: "Zwischensumme",
        es: "Subtotal",
        fr: "Sous-total",
        pl: "Suma częściowa",
        ja: "小計",
      },
      "ui.invoicing_window.create.tax": {
        en: "Tax",
        de: "Steuer",
        es: "Impuesto",
        fr: "Taxe",
        pl: "Podatek",
        ja: "税金",
      },
      "ui.invoicing_window.create.total": {
        en: "Total",
        de: "Gesamt",
        es: "Total",
        fr: "Total",
        pl: "Łącznie",
        ja: "合計",
      },
      "ui.invoicing_window.create.notes": {
        en: "Invoice Notes (Optional)",
        de: "Rechnungsnotizen (Optional)",
        es: "Notas de factura (Opcional)",
        fr: "Notes de facture (Facultatif)",
        pl: "Notatki do faktury (Opcjonalnie)",
        ja: "請求書メモ（オプション）",
      },
      "ui.invoicing_window.create.notes_placeholder": {
        en: "Add any special instructions or notes for this invoice...",
        de: "Fügen Sie spezielle Anweisungen oder Notizen für diese Rechnung hinzu...",
        es: "Agregue instrucciones o notas especiales para esta factura...",
        fr: "Ajoutez des instructions ou des notes spéciales pour cette facture...",
        pl: "Dodaj specjalne instrukcje lub notatki dla tej faktury...",
        ja: "この請求書の特別な指示やメモを追加...",
      },
      "ui.invoicing_window.create.create_invoice": {
        en: "Create Draft Invoice",
        de: "Entwurfsrechnung erstellen",
        es: "Crear factura borrador",
        fr: "Créer une facture en brouillon",
        pl: "Utwórz szkic faktury",
        ja: "下書き請求書を作成",
      },
      "ui.invoicing_window.create.errors.missing_data": {
        en: "Please select a customer and fill in all required fields",
        de: "Bitte wählen Sie einen Kunden und füllen Sie alle Pflichtfelder aus",
        es: "Seleccione un cliente y complete todos los campos obligatorios",
        fr: "Veuillez sélectionner un client et remplir tous les champs requis",
        pl: "Wybierz klienta i wypełnij wszystkie wymagane pola",
        ja: "顧客を選択し、すべての必須フィールドを入力してください",
      },
      "ui.invoicing_window.create.errors.no_items": {
        en: "Please add at least one line item with a description and price",
        de: "Bitte fügen Sie mindestens eine Position mit Beschreibung und Preis hinzu",
        es: "Agregue al menos un artículo con descripción y precio",
        fr: "Veuillez ajouter au moins un article avec une description et un prix",
        pl: "Dodaj przynajmniej jedną pozycję z opisem i ceną",
        ja: "説明と価格を含む明細項目を少なくとも1つ追加してください",
      },
      "ui.invoicing_window.create.errors.failed": {
        en: "Failed to create invoice",
        de: "Fehler beim Erstellen der Rechnung",
        es: "Error al crear la factura",
        fr: "Échec de la création de la facture",
        pl: "Nie udało się utworzyć faktury",
        ja: "請求書の作成に失敗しました",
      },
      "ui.invoicing_window.create.warnings.credit_limit_exceeded": {
        en: "⚠️ Credit Limit Warning",
        de: "⚠️ Kreditlimit-Warnung",
        es: "⚠️ Advertencia de límite de crédito",
        fr: "⚠️ Avertissement de limite de crédit",
        pl: "⚠️ Ostrzeżenie o limicie kredytowym",
        ja: "⚠️ 与信限度額警告",
      },
      "ui.invoicing_window.create.warnings.continue_anyway": {
        en: "Do you want to continue creating this invoice anyway?",
        de: "Möchten Sie diese Rechnung trotzdem erstellen?",
        es: "¿Desea continuar creando esta factura de todos modos?",
        fr: "Voulez-vous continuer à créer cette facture quand même?",
        pl: "Czy chcesz mimo to kontynuować tworzenie tej faktury?",
        ja: "とにかくこの請求書を作成しますか？",
      },
      "ui.invoicing_window.create.success": {
        en: "Invoice created successfully! You can now seal it from the Invoices tab.",
        de: "Rechnung erfolgreich erstellt! Sie können sie jetzt auf der Registerkarte Rechnungen festschreiben.",
        es: "¡Factura creada con éxito! Ahora puede sellarla desde la pestaña Facturas.",
        fr: "Facture créée avec succès! Vous pouvez maintenant la sceller depuis l'onglet Factures.",
        pl: "Faktura utworzona pomyślnie! Teraz możesz ją zamknąć z zakładki Faktury.",
        ja: "請求書が正常に作成されました！請求書タブから封印できます。",
      },

      // Footer status
      "ui.invoicing_window.footer.invoice_count": {
        en: "{count} invoice{plural}",
        de: "{count} Rechnung{plural}",
        es: "{count} factura{plural}",
        fr: "{count} facture{plural}",
        pl: "{count} faktur{plural}",
        ja: "{count}請求書",
      },
      "ui.invoicing_window.footer.loading": {
        en: "Loading...",
        de: "Laden...",
        es: "Cargando...",
        fr: "Chargement...",
        pl: "Ładowanie...",
        ja: "読み込み中...",
      },

      // Alerts and tooltips
      "ui.invoicing_window.alerts.no_pdf": {
        en: "PDF not yet generated for this invoice",
        de: "PDF wurde für diese Rechnung noch nicht erstellt",
        es: "PDF aún no generado para esta factura",
        fr: "PDF pas encore généré pour cette facture",
        pl: "PDF jeszcze nie wygenerowany dla tej faktury",
        ja: "この請求書のPDFはまだ生成されていません",
      },
      "ui.invoicing_window.alerts.seal_first": {
        en: "Seal invoice first to generate PDF",
        de: "Rechnung zuerst festschreiben, um PDF zu generieren",
        es: "Selle la factura primero para generar el PDF",
        fr: "Sceller d'abord la facture pour générer le PDF",
        pl: "Najpierw zamknij fakturę, aby wygenerować PDF",
        ja: "PDFを生成するには、まず請求書を封印してください",
      },
      "ui.invoicing_window.alerts.coming_soon": {
        en: "Coming soon",
        de: "Demnächst verfügbar",
        es: "Próximamente",
        fr: "Bientôt disponible",
        pl: "Wkrótce dostępne",
        ja: "近日公開",
      },

      // Seal confirmation
      "ui.invoicing_window.confirm.seal_title": {
        en: "Are you sure you want to seal this draft invoice?",
        de: "Möchten Sie diese Entwurfsrechnung wirklich festschreiben?",
        es: "¿Está seguro de que desea sellar esta factura en borrador?",
        fr: "Êtes-vous sûr de vouloir sceller cette facture en brouillon?",
        pl: "Czy na pewno chcesz zamknąć ten szkic faktury?",
        ja: "この下書き請求書を封印してもよろしいですか？",
      },
      "ui.invoicing_window.confirm.seal_message": {
        en: "Sealing will:\n• Generate a final invoice number\n• Mark the invoice as immutable\n• Mark all transactions as fully invoiced\n\nThis action cannot be undone.",
        de: "Festschreiben wird:\n• Eine endgültige Rechnungsnummer generieren\n• Die Rechnung als unveränderlich markieren\n• Alle Transaktionen als vollständig in Rechnung gestellt markieren\n\nDiese Aktion kann nicht rückgängig gemacht werden.",
        es: "Sellar hará:\n• Generar un número de factura final\n• Marcar la factura como inmutable\n• Marcar todas las transacciones como facturadas completamente\n\nEsta acción no se puede deshacer.",
        fr: "Le scellement va:\n• Générer un numéro de facture final\n• Marquer la facture comme immuable\n• Marquer toutes les transactions comme entièrement facturées\n\nCette action ne peut pas être annulée.",
        pl: "Zamknięcie spowoduje:\n• Wygenerowanie ostatecznego numeru faktury\n• Oznaczenie faktury jako niezmiennej\n• Oznaczenie wszystkich transakcji jako w pełni zafakturowanych\n\nTej akcji nie można cofnąć.",
        ja: "封印すると:\n• 最終請求書番号が生成されます\n• 請求書が不変としてマークされます\n• すべての取引が完全に請求済みとしてマークされます\n\nこのアクションは元に戻せません。",
      },
      "ui.invoicing_window.success.sealed": {
        en: "Invoice sealed successfully!\nNew invoice number: {invoiceNumber}",
        de: "Rechnung erfolgreich festgeschrieben!\nNeue Rechnungsnummer: {invoiceNumber}",
        es: "¡Factura sellada exitosamente!\nNúmero de factura nuevo: {invoiceNumber}",
        fr: "Facture scellée avec succès!\nNouveau numéro de facture: {invoiceNumber}",
        pl: "Faktura pomyślnie zamknięta!\nNowy numer faktury: {invoiceNumber}",
        ja: "請求書の封印に成功しました！\n新しい請求書番号: {invoiceNumber}",
      },
    };

    // Seed all translations
    const allTranslations = {
      ...paymentsInvoicing,
      ...invoiceMapping,
      ...consolidatedInvoice,
      ...invoicePayment,
      ...invoicingWindow,
    };

    // Insert translations for each locale
    let insertedCount = 0;
    let updatedCount = 0;

    for (const [key, translations] of Object.entries(allTranslations)) {
      // Determine category from key prefix
      let category = "invoicing";
      if (key.startsWith("ui.payments.invoicing")) {
        category = "payments";
      } else if (key.startsWith("ui.workflows.invoice_mapping")) {
        category = "workflows-invoice-mapping";
      } else if (key.startsWith("ui.workflows.consolidated_invoice")) {
        category = "workflows-consolidated-invoice";
      } else if (key.startsWith("ui.workflows.invoice_payment")) {
        category = "workflows-invoice-payment";
      } else if (key.startsWith("ui.invoicing_window")) {
        category = "invoicing-window";
      }

      for (const [locale, value] of Object.entries(translations)) {
        const result = await upsertTranslation(
          ctx.db,
          systemOrgId,
          systemUserId,
          key,
          value,
          locale,
          category
        );
        if (result.inserted) insertedCount++;
        if (result.updated) updatedCount++;
      }
    }

    console.log(
      `✅ Invoicing translations seeded: ${insertedCount} inserted, ${updatedCount} updated`
    );

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      totalKeys: Object.keys(allTranslations).length,
      locales: ["en", "de", "es", "fr", "pl", "ja"],
    };
  },
});
