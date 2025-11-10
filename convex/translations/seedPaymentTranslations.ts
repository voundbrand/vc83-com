import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

/**
 * Seed Payments Window Translations
 *
 * Provides comprehensive i18n support for the Payment Management window
 * Covers main window, transactions section, and Stripe section
 */
export const seedPaymentTranslations = internalMutation({
  args: {},
  handler: async (ctx) => {
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

    const translations = [
      // ====================
      // MAIN WINDOW
      // ====================
      {
        key: "ui.payments.title",
        values: {
          en: "Payment Management",
          de: "Zahlungsverwaltung",
          pl: "Zarządzanie płatnościami",
          es: "Gestión de pagos",
          fr: "Gestion des paiements",
          ja: "支払い管理",
        }
      },
      {
        key: "ui.payments.subtitle",
        values: {
          en: "Manage Stripe payments, tax settings, and transactions",
          de: "Verwalten Sie Stripe-Zahlungen, Steuereinstellungen und Transaktionen",
          pl: "Zarządzaj płatnościami Stripe, ustawieniami podatków i transakcjami",
          es: "Gestionar pagos de Stripe, configuración de impuestos y transacciones",
          fr: "Gérer les paiements Stripe, les paramètres fiscaux et les transactions",
          ja: "Stripe決済、税金設定、取引を管理",
        }
      },
      {
        key: "ui.payments.loading",
        values: {
          en: "Loading payment settings...",
          de: "Zahlungseinstellungen werden geladen...",
          pl: "Ładowanie ustawień płatności...",
          es: "Cargando configuración de pagos...",
          fr: "Chargement des paramètres de paiement...",
          ja: "支払い設定を読み込み中...",
        }
      },
      {
        key: "ui.payments.please_login",
        values: {
          en: "Please log in to access payment settings",
          de: "Bitte melden Sie sich an, um auf die Zahlungseinstellungen zuzugreifen",
          pl: "Zaloguj się, aby uzyskać dostęp do ustawień płatności",
          es: "Inicie sesión para acceder a la configuración de pagos",
          fr: "Veuillez vous connecter pour accéder aux paramètres de paiement",
          ja: "支払い設定にアクセスするにはログインしてください",
        }
      },
      {
        key: "ui.payments.no_org_selected",
        values: {
          en: "No Organization Selected",
          de: "Keine Organisation ausgewählt",
          pl: "Nie wybrano organizacji",
          es: "No se ha seleccionado ninguna organización",
          fr: "Aucune organisation sélectionnée",
          ja: "組織が選択されていません",
        }
      },
      {
        key: "ui.payments.select_org_prompt",
        values: {
          en: "Please select an organization to manage payment settings",
          de: "Bitte wählen Sie eine Organisation aus, um Zahlungseinstellungen zu verwalten",
          pl: "Wybierz organizację, aby zarządzać ustawieniami płatności",
          es: "Seleccione una organización para gestionar la configuración de pagos",
          fr: "Veuillez sélectionner une organisation pour gérer les paramètres de paiement",
          ja: "支払い設定を管理する組織を選択してください",
        }
      },
      {
        key: "ui.payments.status",
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
        key: "ui.payments.tab_stripe",
        values: {
          en: "Stripe",
          de: "Stripe",
          pl: "Stripe",
          es: "Stripe",
          fr: "Stripe",
          ja: "Stripe",
        }
      },
      {
        key: "ui.payments.tab_invoicing",
        values: {
          en: "Invoicing Setup",
          de: "Rechnungsstellung einrichten",
          pl: "Konfiguracja fakturowania",
          es: "Configuración de facturación",
          fr: "Configuration de la facturation",
          ja: "請求設定",
        }
      },
      {
        key: "ui.payments.powered_by_stripe",
        values: {
          en: "Powered by Stripe",
          de: "Bereitgestellt von Stripe",
          pl: "Obsługiwane przez Stripe",
          es: "Con tecnología de Stripe",
          fr: "Propulsé par Stripe",
          ja: "Stripe提供",
        }
      },
      {
        key: "ui.payments.mode",
        values: {
          en: "Mode",
          de: "Modus",
          pl: "Tryb",
          es: "Modo",
          fr: "Mode",
          ja: "モード",
        }
      },
      {
        key: "ui.payments.mode_test",
        values: {
          en: "Test",
          de: "Test",
          pl: "Test",
          es: "Prueba",
          fr: "Test",
          ja: "テスト",
        }
      },
      {
        key: "ui.payments.mode_live",
        values: {
          en: "Live",
          de: "Live",
          pl: "Na żywo",
          es: "En vivo",
          fr: "Direct",
          ja: "ライブ",
        }
      },

      // ====================
      // TRANSACTIONS SECTION
      // ====================
      {
        key: "ui.payments.transactions.loading_session",
        values: {
          en: "Loading session...",
          de: "Sitzung wird geladen...",
          pl: "Ładowanie sesji...",
          es: "Cargando sesión...",
          fr: "Chargement de la session...",
          ja: "セッションを読み込み中...",
        }
      },
      {
        key: "ui.payments.transactions.search_placeholder",
        values: {
          en: "Search by customer name or email...",
          de: "Nach Kundenname oder E-Mail suchen...",
          pl: "Szukaj według nazwy klienta lub e-maila...",
          es: "Buscar por nombre de cliente o correo electrónico...",
          fr: "Rechercher par nom de client ou e-mail...",
          ja: "顧客名またはメールで検索...",
        }
      },
      {
        key: "ui.payments.transactions.filter_all_payment",
        values: {
          en: "All Payment Statuses",
          de: "Alle Zahlungsstatus",
          pl: "Wszystkie statusy płatności",
          es: "Todos los estados de pago",
          fr: "Tous les statuts de paiement",
          ja: "すべての支払いステータス",
        }
      },
      {
        key: "ui.payments.transactions.status_paid",
        values: {
          en: "Paid",
          de: "Bezahlt",
          pl: "Opłacone",
          es: "Pagado",
          fr: "Payé",
          ja: "支払済み",
        }
      },
      {
        key: "ui.payments.transactions.status_pending",
        values: {
          en: "Pending",
          de: "Ausstehend",
          pl: "Oczekujące",
          es: "Pendiente",
          fr: "En attente",
          ja: "保留中",
        }
      },
      {
        key: "ui.payments.transactions.status_awaiting",
        values: {
          en: "Awaiting Employer",
          de: "Wartet auf Arbeitgeber",
          pl: "Oczekiwanie na pracodawcę",
          es: "Esperando empleador",
          fr: "En attente de l'employeur",
          ja: "雇用主待ち",
        }
      },
      {
        key: "ui.payments.transactions.status_awaiting_short",
        values: {
          en: "Awaiting",
          de: "Wartend",
          pl: "Oczekiwanie",
          es: "Esperando",
          fr: "En attente",
          ja: "待機中",
        }
      },
      {
        key: "ui.payments.transactions.status_failed",
        values: {
          en: "Failed",
          de: "Fehlgeschlagen",
          pl: "Nie powiodło się",
          es: "Fallido",
          fr: "Échoué",
          ja: "失敗",
        }
      },
      {
        key: "ui.payments.transactions.filter_all_invoicing",
        values: {
          en: "All Invoicing Statuses",
          de: "Alle Rechnungsstellungsstatus",
          pl: "Wszystkie statusy fakturowania",
          es: "Todos los estados de facturación",
          fr: "Tous les statuts de facturation",
          ja: "すべての請求ステータス",
        }
      },
      {
        key: "ui.payments.transactions.invoicing_not_invoiced",
        values: {
          en: "Not Invoiced",
          de: "Nicht fakturiert",
          pl: "Nie zafakturowane",
          es: "No facturado",
          fr: "Non facturé",
          ja: "未請求",
        }
      },
      {
        key: "ui.payments.transactions.invoicing_draft",
        values: {
          en: "On Draft Invoice",
          de: "Auf Rechnungsentwurf",
          pl: "Na fakturze roboczej",
          es: "En factura borrador",
          fr: "Sur facture brouillon",
          ja: "下書き請求書",
        }
      },
      {
        key: "ui.payments.transactions.invoicing_draft_short",
        values: {
          en: "Draft",
          de: "Entwurf",
          pl: "Projekt",
          es: "Borrador",
          fr: "Brouillon",
          ja: "下書き",
        }
      },
      {
        key: "ui.payments.transactions.invoicing_invoiced",
        values: {
          en: "Invoiced",
          de: "Fakturiert",
          pl: "Zafakturowane",
          es: "Facturado",
          fr: "Facturé",
          ja: "請求済み",
        }
      },
      {
        key: "ui.payments.transactions.date_7d",
        values: {
          en: "Last 7 Days",
          de: "Letzte 7 Tage",
          pl: "Ostatnie 7 dni",
          es: "Últimos 7 días",
          fr: "7 derniers jours",
          ja: "過去7日間",
        }
      },
      {
        key: "ui.payments.transactions.date_30d",
        values: {
          en: "Last 30 Days",
          de: "Letzte 30 Tage",
          pl: "Ostatnie 30 dni",
          es: "Últimos 30 días",
          fr: "30 derniers jours",
          ja: "過去30日間",
        }
      },
      {
        key: "ui.payments.transactions.date_90d",
        values: {
          en: "Last 90 Days",
          de: "Letzte 90 Tage",
          pl: "Ostatnie 90 dni",
          es: "Últimos 90 días",
          fr: "90 derniers jours",
          ja: "過去90日間",
        }
      },
      {
        key: "ui.payments.transactions.date_all",
        values: {
          en: "All Time",
          de: "Alle Zeiten",
          pl: "Cały czas",
          es: "Todo el tiempo",
          fr: "Tout le temps",
          ja: "全期間",
        }
      },
      {
        key: "ui.payments.transactions.date_custom",
        values: {
          en: "Custom Range",
          de: "Benutzerdefinierter Bereich",
          pl: "Zakres niestandardowy",
          es: "Rango personalizado",
          fr: "Plage personnalisée",
          ja: "カスタム範囲",
        }
      },
      {
        key: "ui.payments.transactions.date_from",
        values: {
          en: "From",
          de: "Von",
          pl: "Od",
          es: "Desde",
          fr: "De",
          ja: "から",
        }
      },
      {
        key: "ui.payments.transactions.date_to",
        values: {
          en: "To",
          de: "Bis",
          pl: "Do",
          es: "Hasta",
          fr: "À",
          ja: "まで",
        }
      },
      {
        key: "ui.payments.transactions.export",
        values: {
          en: "Export",
          de: "Exportieren",
          pl: "Eksportuj",
          es: "Exportar",
          fr: "Exporter",
          ja: "エクスポート",
        }
      },
      {
        key: "ui.payments.transactions.stat_revenue",
        values: {
          en: "Total Revenue",
          de: "Gesamtumsatz",
          pl: "Całkowity przychód",
          es: "Ingresos totales",
          fr: "Revenu total",
          ja: "総収益",
        }
      },
      {
        key: "ui.payments.transactions.stat_completed",
        values: {
          en: "completed",
          de: "abgeschlossen",
          pl: "ukończone",
          es: "completado",
          fr: "complété",
          ja: "完了",
        }
      },
      {
        key: "ui.payments.transactions.stat_pending",
        values: {
          en: "Pending",
          de: "Ausstehend",
          pl: "Oczekujące",
          es: "Pendiente",
          fr: "En attente",
          ja: "保留中",
        }
      },
      {
        key: "ui.payments.transactions.stat_pending_count",
        values: {
          en: "pending",
          de: "ausstehend",
          pl: "oczekujące",
          es: "pendiente",
          fr: "en attente",
          ja: "保留中",
        }
      },
      {
        key: "ui.payments.transactions.stat_avg",
        values: {
          en: "Avg. Transaction",
          de: "Durchschn. Transaktion",
          pl: "Średnia transakcja",
          es: "Transacción promedio",
          fr: "Transaction moy.",
          ja: "平均取引額",
        }
      },
      {
        key: "ui.payments.transactions.stat_b2b",
        values: {
          en: "B2B",
          de: "B2B",
          pl: "B2B",
          es: "B2B",
          fr: "B2B",
          ja: "B2B",
        }
      },
      {
        key: "ui.payments.transactions.stat_b2c",
        values: {
          en: "B2C",
          de: "B2C",
          pl: "B2C",
          es: "B2C",
          fr: "B2C",
          ja: "B2C",
        }
      },
      {
        key: "ui.payments.transactions.table_date",
        values: {
          en: "Date",
          de: "Datum",
          pl: "Data",
          es: "Fecha",
          fr: "Date",
          ja: "日付",
        }
      },
      {
        key: "ui.payments.transactions.table_customer",
        values: {
          en: "Customer / Product",
          de: "Kunde / Produkt",
          pl: "Klient / Produkt",
          es: "Cliente / Producto",
          fr: "Client / Produit",
          ja: "顧客 / 製品",
        }
      },
      {
        key: "ui.payments.transactions.table_amount",
        values: {
          en: "Amount",
          de: "Betrag",
          pl: "Kwota",
          es: "Monto",
          fr: "Montant",
          ja: "金額",
        }
      },
      {
        key: "ui.payments.transactions.table_payment",
        values: {
          en: "Payment",
          de: "Zahlung",
          pl: "Płatność",
          es: "Pago",
          fr: "Paiement",
          ja: "支払い",
        }
      },
      {
        key: "ui.payments.transactions.table_invoicing",
        values: {
          en: "Invoicing",
          de: "Rechnungsstellung",
          pl: "Fakturowanie",
          es: "Facturación",
          fr: "Facturation",
          ja: "請求",
        }
      },
      {
        key: "ui.payments.transactions.table_method",
        values: {
          en: "Method",
          de: "Methode",
          pl: "Metoda",
          es: "Método",
          fr: "Méthode",
          ja: "方法",
        }
      },
      {
        key: "ui.payments.transactions.empty_title",
        values: {
          en: "No Transactions Yet",
          de: "Noch keine Transaktionen",
          pl: "Brak transakcji",
          es: "No hay transacciones",
          fr: "Pas encore de transactions",
          ja: "取引はまだありません",
        }
      },
      {
        key: "ui.payments.transactions.empty_description",
        values: {
          en: "Transactions will appear here once you start accepting payments",
          de: "Transaktionen werden hier angezeigt, sobald Sie Zahlungen akzeptieren",
          pl: "Transakcje pojawią się tutaj po rozpoczęciu przyjmowania płatności",
          es: "Las transacciones aparecerán aquí una vez que comience a aceptar pagos",
          fr: "Les transactions apparaîtront ici une fois que vous commencerez à accepter des paiements",
          ja: "支払いを受け付け始めると、ここに取引が表示されます",
        }
      },
      {
        key: "ui.payments.transactions.empty_filtered",
        values: {
          en: "No {status} transactions found",
          de: "Keine {status} Transaktionen gefunden",
          pl: "Nie znaleziono transakcji {status}",
          es: "No se encontraron transacciones {status}",
          fr: "Aucune transaction {status} trouvée",
          ja: "{status}の取引が見つかりません",
        }
      },
      {
        key: "ui.payments.transactions.badge_b2b",
        values: {
          en: "B2B",
          de: "B2B",
          pl: "B2B",
          es: "B2B",
          fr: "B2B",
          ja: "B2B",
        }
      },

      // ====================
      // STRIPE SECTION
      // ====================
      {
        key: "ui.payments.stripe.connect_title",
        values: {
          en: "Connect Your Stripe Account",
          de: "Verbinden Sie Ihr Stripe-Konto",
          pl: "Połącz swoje konto Stripe",
          es: "Conecta tu cuenta de Stripe",
          fr: "Connectez votre compte Stripe",
          ja: "Stripeアカウントを接続",
        }
      },
      {
        key: "ui.payments.stripe.connect_subtitle",
        values: {
          en: "Accept payments and automatically calculate taxes with Stripe",
          de: "Akzeptieren Sie Zahlungen und berechnen Sie Steuern automatisch mit Stripe",
          pl: "Akceptuj płatności i automatycznie obliczaj podatki za pomocą Stripe",
          es: "Acepta pagos y calcula impuestos automáticamente con Stripe",
          fr: "Acceptez les paiements et calculez les taxes automatiquement avec Stripe",
          ja: "Stripeで支払いを受け付け、税金を自動計算",
        }
      },
      {
        key: "ui.payments.stripe.benefit_payments_title",
        values: {
          en: "Accept Payments",
          de: "Zahlungen akzeptieren",
          pl: "Akceptuj płatności",
          es: "Aceptar pagos",
          fr: "Accepter les paiements",
          ja: "支払いを受け付ける",
        }
      },
      {
        key: "ui.payments.stripe.benefit_payments_desc",
        values: {
          en: "Credit cards, debit cards, and ACH transfers",
          de: "Kreditkarten, Debitkarten und ACH-Überweisungen",
          pl: "Karty kredytowe, debetowe i przelewy ACH",
          es: "Tarjetas de crédito, débito y transferencias ACH",
          fr: "Cartes de crédit, cartes de débit et virements ACH",
          ja: "クレジットカード、デビットカード、ACH送金",
        }
      },
      {
        key: "ui.payments.stripe.benefit_tax_title",
        values: {
          en: "Automatic Tax",
          de: "Automatische Steuer",
          pl: "Automatyczne podatki",
          es: "Impuestos automáticos",
          fr: "Taxes automatiques",
          ja: "自動税金計算",
        }
      },
      {
        key: "ui.payments.stripe.benefit_tax_desc",
        values: {
          en: "Stripe Tax handles calculation for 135+ countries",
          de: "Stripe Tax berechnet Steuern für über 135 Länder",
          pl: "Stripe Tax obsługuje obliczenia dla ponad 135 krajów",
          es: "Stripe Tax calcula impuestos para más de 135 países",
          fr: "Stripe Tax gère le calcul pour plus de 135 pays",
          ja: "Stripe Taxが135か国以上の税金計算を処理",
        }
      },
      {
        key: "ui.payments.stripe.benefit_payouts_title",
        values: {
          en: "Instant Payouts",
          de: "Sofortige Auszahlungen",
          pl: "Natychmiastowe wypłaty",
          es: "Pagos instantáneos",
          fr: "Paiements instantanés",
          ja: "即時支払い",
        }
      },
      {
        key: "ui.payments.stripe.benefit_payouts_desc",
        values: {
          en: "Fast, secure payments directly to your bank",
          de: "Schnelle, sichere Zahlungen direkt auf Ihr Konto",
          pl: "Szybkie, bezpieczne płatności bezpośrednio na konto",
          es: "Pagos rápidos y seguros directamente a su banco",
          fr: "Paiements rapides et sécurisés directement sur votre compte",
          ja: "銀行口座への迅速で安全な支払い",
        }
      },
      {
        key: "ui.payments.stripe.mode_selection_title",
        values: {
          en: "Choose Connection Mode",
          de: "Verbindungsmodus wählen",
          pl: "Wybierz tryb połączenia",
          es: "Elegir modo de conexión",
          fr: "Choisir le mode de connexion",
          ja: "接続モードを選択",
        }
      },
      {
        key: "ui.payments.stripe.mode_live_title",
        values: {
          en: "Live Mode (Recommended)",
          de: "Live-Modus (Empfohlen)",
          pl: "Tryb na żywo (Zalecany)",
          es: "Modo en vivo (Recomendado)",
          fr: "Mode direct (Recommandé)",
          ja: "ライブモード（推奨）",
        }
      },
      {
        key: "ui.payments.stripe.mode_live_desc",
        values: {
          en: "Process real payments",
          de: "Echte Zahlungen verarbeiten",
          pl: "Przetwarzaj prawdziwe płatności",
          es: "Procesar pagos reales",
          fr: "Traiter les paiements réels",
          ja: "実際の支払いを処理",
        }
      },
      {
        key: "ui.payments.stripe.mode_test_title",
        values: {
          en: "Test Mode",
          de: "Testmodus",
          pl: "Tryb testowy",
          es: "Modo de prueba",
          fr: "Mode test",
          ja: "テストモード",
        }
      },
      {
        key: "ui.payments.stripe.mode_test_desc",
        values: {
          en: "Test with Stripe test cards",
          de: "Testen mit Stripe-Testkarten",
          pl: "Testuj z kartami testowymi Stripe",
          es: "Prueba con tarjetas de prueba de Stripe",
          fr: "Tester avec les cartes de test Stripe",
          ja: "Stripeテストカードでテスト",
        }
      },
      {
        key: "ui.payments.stripe.connecting",
        values: {
          en: "Connecting...",
          de: "Verbindung wird hergestellt...",
          pl: "Łączenie...",
          es: "Conectando...",
          fr: "Connexion en cours...",
          ja: "接続中...",
        }
      },
      {
        key: "ui.payments.stripe.connect_button",
        values: {
          en: "Connect Stripe Account ({mode} Mode)",
          de: "Stripe-Konto verbinden ({mode}-Modus)",
          pl: "Połącz konto Stripe (Tryb {mode})",
          es: "Conectar cuenta de Stripe (Modo {mode})",
          fr: "Connecter le compte Stripe (Mode {mode})",
          ja: "Stripeアカウントを接続（{mode}モード）",
        }
      },
      {
        key: "ui.payments.stripe.account_status",
        values: {
          en: "Stripe Account: {status}",
          de: "Stripe-Konto: {status}",
          pl: "Konto Stripe: {status}",
          es: "Cuenta de Stripe: {status}",
          fr: "Compte Stripe: {status}",
          ja: "Stripeアカウント: {status}",
        }
      },
      {
        key: "ui.payments.stripe.status_unknown",
        values: {
          en: "Unknown",
          de: "Unbekannt",
          pl: "Nieznany",
          es: "Desconocido",
          fr: "Inconnu",
          ja: "不明",
        }
      },
      {
        key: "ui.payments.stripe.account_id",
        values: {
          en: "Account ID",
          de: "Konto-ID",
          pl: "ID konta",
          es: "ID de cuenta",
          fr: "ID du compte",
          ja: "アカウントID",
        }
      },
      {
        key: "ui.payments.stripe.mode_label",
        values: {
          en: "Mode",
          de: "Modus",
          pl: "Tryb",
          es: "Modo",
          fr: "Mode",
          ja: "モード",
        }
      },
      {
        key: "ui.payments.stripe.refresh",
        values: {
          en: "Refresh",
          de: "Aktualisieren",
          pl: "Odśwież",
          es: "Actualizar",
          fr: "Actualiser",
          ja: "更新",
        }
      },
      {
        key: "ui.payments.stripe.tax_integration_title",
        values: {
          en: "Stripe Tax Integration",
          de: "Stripe Tax Integration",
          pl: "Integracja Stripe Tax",
          es: "Integración de Stripe Tax",
          fr: "Intégration Stripe Tax",
          ja: "Stripe Tax統合",
        }
      },
      {
        key: "ui.payments.stripe.tax_active",
        values: {
          en: "Automatic tax calculation is active",
          de: "Automatische Steuerberechnung ist aktiv",
          pl: "Automatyczne obliczanie podatków jest aktywne",
          es: "El cálculo automático de impuestos está activo",
          fr: "Le calcul automatique des taxes est actif",
          ja: "自動税金計算が有効です",
        }
      },
      {
        key: "ui.payments.stripe.tax_sync_needed",
        values: {
          en: "Sync your tax settings to enable Stripe Tax",
          de: "Synchronisieren Sie Ihre Steuereinstellungen, um Stripe Tax zu aktivieren",
          pl: "Zsynchronizuj ustawienia podatków, aby włączyć Stripe Tax",
          es: "Sincroniza tu configuración de impuestos para habilitar Stripe Tax",
          fr: "Synchronisez vos paramètres fiscaux pour activer Stripe Tax",
          ja: "税金設定を同期してStripe Taxを有効にする",
        }
      },
      {
        key: "ui.payments.stripe.tax_status_active",
        values: {
          en: "Active",
          de: "Aktiv",
          pl: "Aktywny",
          es: "Activo",
          fr: "Actif",
          ja: "有効",
        }
      },
      {
        key: "ui.payments.stripe.tax_status_not_synced",
        values: {
          en: "Not Synced",
          de: "Nicht synchronisiert",
          pl: "Nie zsynchronizowane",
          es: "No sincronizado",
          fr: "Non synchronisé",
          ja: "未同期",
        }
      },
      {
        key: "ui.payments.stripe.tax_behavior",
        values: {
          en: "Tax Behavior",
          de: "Steuerverhalten",
          pl: "Zachowanie podatkowe",
          es: "Comportamiento fiscal",
          fr: "Comportement fiscal",
          ja: "税動作",
        }
      },
      {
        key: "ui.payments.stripe.tax_origin_country",
        values: {
          en: "Origin Country",
          de: "Ursprungsland",
          pl: "Kraj pochodzenia",
          es: "País de origen",
          fr: "Pays d'origine",
          ja: "原産国",
        }
      },
      {
        key: "ui.payments.stripe.not_set",
        values: {
          en: "Not set",
          de: "Nicht festgelegt",
          pl: "Nie ustawiono",
          es: "No configurado",
          fr: "Non défini",
          ja: "未設定",
        }
      },
      {
        key: "ui.payments.stripe.syncing",
        values: {
          en: "Syncing...",
          de: "Wird synchronisiert...",
          pl: "Synchronizacja...",
          es: "Sincronizando...",
          fr: "Synchronisation...",
          ja: "同期中...",
        }
      },
      {
        key: "ui.payments.stripe.sync_tax_button",
        values: {
          en: "Sync Tax Settings with Stripe",
          de: "Steuereinstellungen mit Stripe synchronisieren",
          pl: "Zsynchronizuj ustawienia podatkowe ze Stripe",
          es: "Sincronizar configuración de impuestos con Stripe",
          fr: "Synchroniser les paramètres fiscaux avec Stripe",
          ja: "税金設定をStripeと同期",
        }
      },
      {
        key: "ui.payments.stripe.quick_actions",
        values: {
          en: "Quick Actions",
          de: "Schnellaktionen",
          pl: "Szybkie akcje",
          es: "Acciones rápidas",
          fr: "Actions rapides",
          ja: "クイックアクション",
        }
      },
      {
        key: "ui.payments.stripe.open_dashboard",
        values: {
          en: "Open Stripe Dashboard",
          de: "Stripe Dashboard öffnen",
          pl: "Otwórz panel Stripe",
          es: "Abrir panel de Stripe",
          fr: "Ouvrir le tableau de bord Stripe",
          ja: "Stripeダッシュボードを開く",
        }
      },
      {
        key: "ui.payments.stripe.disconnecting",
        values: {
          en: "Disconnecting...",
          de: "Verbindung wird getrennt...",
          pl: "Rozłączanie...",
          es: "Desconectando...",
          fr: "Déconnexion...",
          ja: "切断中...",
        }
      },
      {
        key: "ui.payments.stripe.disconnect_button",
        values: {
          en: "Disconnect Stripe",
          de: "Stripe trennen",
          pl: "Rozłącz Stripe",
          es: "Desconectar Stripe",
          fr: "Déconnecter Stripe",
          ja: "Stripeを切断",
        }
      },
      {
        key: "ui.payments.stripe.disconnect_confirm",
        values: {
          en: "Are you sure you want to disconnect your Stripe account? This will stop all payment processing.",
          de: "Möchten Sie Ihr Stripe-Konto wirklich trennen? Dadurch wird die gesamte Zahlungsabwicklung gestoppt.",
          pl: "Czy na pewno chcesz rozłączyć konto Stripe? Spowoduje to zatrzymanie przetwarzania wszystkich płatności.",
          es: "¿Estás seguro de que quieres desconectar tu cuenta de Stripe? Esto detendrá todo el procesamiento de pagos.",
          fr: "Êtes-vous sûr de vouloir déconnecter votre compte Stripe ? Cela arrêtera tout le traitement des paiements.",
          ja: "Stripeアカウントを切断してもよろしいですか？これによりすべての支払い処理が停止します。",
        }
      },
      {
        key: "ui.payments.stripe.disconnect_success",
        values: {
          en: "Stripe account disconnected successfully",
          de: "Stripe-Konto erfolgreich getrennt",
          pl: "Konto Stripe zostało rozłączone pomyślnie",
          es: "Cuenta de Stripe desconectada con éxito",
          fr: "Compte Stripe déconnecté avec succès",
          ja: "Stripeアカウントが正常に切断されました",
        }
      },
      {
        key: "ui.payments.stripe.disconnect_error",
        values: {
          en: "Failed to disconnect Stripe account. Please try again.",
          de: "Stripe-Konto konnte nicht getrennt werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się rozłączyć konta Stripe. Spróbuj ponownie.",
          es: "No se pudo desconectar la cuenta de Stripe. Inténtalo de nuevo.",
          fr: "Échec de la déconnexion du compte Stripe. Veuillez réessayer.",
          ja: "Stripeアカウントの切断に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.payments.stripe.tax_sync_success",
        values: {
          en: "Tax settings synced with Stripe successfully!",
          de: "Steuereinstellungen erfolgreich mit Stripe synchronisiert!",
          pl: "Ustawienia podatkowe zsynchronizowane ze Stripe pomyślnie!",
          es: "¡Configuración de impuestos sincronizada con Stripe con éxito!",
          fr: "Paramètres fiscaux synchronisés avec succès avec Stripe!",
          ja: "税金設定がStripeと正常に同期されました！",
        }
      },
      {
        key: "ui.payments.stripe.tax_sync_error",
        values: {
          en: "Failed to sync tax settings. Please try again.",
          de: "Steuereinstellungen konnten nicht synchronisiert werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się zsynchronizować ustawień podatkowych. Spróbuj ponownie.",
          es: "No se pudo sincronizar la configuración de impuestos. Inténtalo de nuevo.",
          fr: "Échec de la synchronisation des paramètres fiscaux. Veuillez réessayer.",
          ja: "税金設定の同期に失敗しました。もう一度お試しください。",
        }
      },
      {
        key: "ui.payments.stripe.tax_features_title",
        values: {
          en: "Stripe Tax Features",
          de: "Stripe Tax Funktionen",
          pl: "Funkcje Stripe Tax",
          es: "Funciones de Stripe Tax",
          fr: "Fonctionnalités de Stripe Tax",
          ja: "Stripe Tax機能",
        }
      },
      {
        key: "ui.payments.stripe.tax_feature_1",
        values: {
          en: "Automatic calculation for 135+ countries",
          de: "Automatische Berechnung für über 135 Länder",
          pl: "Automatyczne obliczenia dla ponad 135 krajów",
          es: "Cálculo automático para más de 135 países",
          fr: "Calcul automatique pour plus de 135 pays",
          ja: "135か国以上の自動計算",
        }
      },
      {
        key: "ui.payments.stripe.tax_feature_2",
        values: {
          en: "B2B reverse charge for EU VAT",
          de: "B2B-Umkehrung der Steuerschuldnerschaft für EU-Mehrwertsteuer",
          pl: "Odwrotne obciążenie B2B dla VAT UE",
          es: "Inversión del sujeto pasivo B2B para IVA de la UE",
          fr: "Autoliquidation B2B pour la TVA de l'UE",
          ja: "EU VATのB2Bリバースチャージ",
        }
      },
      {
        key: "ui.payments.stripe.tax_feature_3",
        values: {
          en: "Real-time tax rate updates",
          de: "Echtzeit-Steuersatzaktualisierungen",
          pl: "Aktualizacje stawek podatkowych w czasie rzeczywistym",
          es: "Actualizaciones de tasas de impuestos en tiempo real",
          fr: "Mises à jour des taux de taxes en temps réel",
          ja: "リアルタイム税率更新",
        }
      },
      {
        key: "ui.payments.stripe.tax_feature_4",
        values: {
          en: "Tax reporting and filing support",
          de: "Steuerberichts- und Einreichungsunterstützung",
          pl: "Wsparcie w raportowaniu i składaniu podatków",
          es: "Soporte de informes y presentación de impuestos",
          fr: "Support pour la déclaration et le dépôt des taxes",
          ja: "税務報告と提出サポート",
        }
      },

      // ====================
      // STRIPE CONNECT SECTION (ui.payments.stripe_connect)
      // ====================
      {
        key: "ui.payments.stripe_connect.status_text.active",
        values: {
          en: "Your Stripe account is active and ready to accept payments",
          de: "Ihr Stripe-Konto ist aktiv und bereit, Zahlungen zu akzeptieren",
          pl: "Twoje konto Stripe jest aktywne i gotowe do przyjmowania płatności",
          es: "Tu cuenta de Stripe está activa y lista para aceptar pagos",
          fr: "Votre compte Stripe est actif et prêt à accepter les paiements",
          ja: "Stripeアカウントは有効で、支払いを受け付ける準備ができています",
        }
      },
      {
        key: "ui.payments.stripe_connect.status_text.pending",
        values: {
          en: "Your Stripe account is pending verification",
          de: "Ihr Stripe-Konto wartet auf Verifizierung",
          pl: "Twoje konto Stripe oczekuje na weryfikację",
          es: "Tu cuenta de Stripe está pendiente de verificación",
          fr: "Votre compte Stripe est en attente de vérification",
          ja: "Stripeアカウントは確認待ちです",
        }
      },
      {
        key: "ui.payments.stripe_connect.status_text.restricted",
        values: {
          en: "Your Stripe account has restrictions. Please check your Stripe dashboard",
          de: "Ihr Stripe-Konto hat Einschränkungen. Bitte überprüfen Sie Ihr Stripe-Dashboard",
          pl: "Twoje konto Stripe ma ograniczenia. Sprawdź swój panel Stripe",
          es: "Tu cuenta de Stripe tiene restricciones. Consulta tu panel de Stripe",
          fr: "Votre compte Stripe a des restrictions. Veuillez vérifier votre tableau de bord Stripe",
          ja: "Stripeアカウントに制限があります。Stripeダッシュボードを確認してください",
        }
      },
      {
        key: "ui.payments.stripe_connect.status_text.disabled",
        values: {
          en: "Your Stripe account is disabled. Please contact Stripe support",
          de: "Ihr Stripe-Konto ist deaktiviert. Bitte kontaktieren Sie den Stripe-Support",
          pl: "Twoje konto Stripe jest wyłączone. Skontaktuj się z pomocą techniczną Stripe",
          es: "Tu cuenta de Stripe está deshabilitada. Contacta con el soporte de Stripe",
          fr: "Votre compte Stripe est désactivé. Veuillez contacter le support Stripe",
          ja: "Stripeアカウントは無効です。Stripeサポートにお問い合わせください",
        }
      },
      {
        key: "ui.payments.stripe_connect.status_text.not_connected",
        values: {
          en: "No Stripe account connected",
          de: "Kein Stripe-Konto verbunden",
          pl: "Nie połączono konta Stripe",
          es: "No hay cuenta de Stripe conectada",
          fr: "Aucun compte Stripe connecté",
          ja: "Stripeアカウントが接続されていません",
        }
      },
      {
        key: "ui.payments.stripe_connect.benefit_secure_title",
        values: {
          en: "Secure & Compliant",
          de: "Sicher & Konform",
          pl: "Bezpieczne i zgodne",
          es: "Seguro y conforme",
          fr: "Sécurisé et conforme",
          ja: "安全でコンプライアンス準拠",
        }
      },
      {
        key: "ui.payments.stripe_connect.benefit_secure_desc",
        values: {
          en: "PCI-compliant payments with advanced fraud protection",
          de: "PCI-konforme Zahlungen mit erweitertem Betrugsschutz",
          pl: "Płatności zgodne z PCI z zaawansowaną ochroną przed oszustwami",
          es: "Pagos conformes a PCI con protección avanzada contra fraude",
          fr: "Paiements conformes PCI avec protection avancée contre la fraude",
          ja: "高度な不正対策を備えたPCI準拠の支払い",
        }
      },
      {
        key: "ui.payments.stripe_connect.note_title",
        values: {
          en: "Connect Your Stripe Account:",
          de: "Verbinden Sie Ihr Stripe-Konto:",
          pl: "Połącz swoje konto Stripe:",
          es: "Conecta tu cuenta de Stripe:",
          fr: "Connectez votre compte Stripe:",
          ja: "Stripeアカウントを接続：",
        }
      },
      {
        key: "ui.payments.stripe_connect.note_existing_title",
        values: {
          en: "Already have Stripe?",
          de: "Haben Sie bereits Stripe?",
          pl: "Masz już Stripe?",
          es: "¿Ya tienes Stripe?",
          fr: "Vous avez déjà Stripe?",
          ja: "既にStripeアカウントをお持ちですか？",
        }
      },
      {
        key: "ui.payments.stripe_connect.note_existing_desc",
        values: {
          en: "You'll be able to sign in with your existing account",
          de: "Sie können sich mit Ihrem bestehenden Konto anmelden",
          pl: "Będziesz mógł zalogować się na swoje istniejące konto",
          es: "Podrás iniciar sesión con tu cuenta existente",
          fr: "Vous pourrez vous connecter avec votre compte existant",
          ja: "既存のアカウントでサインインできます",
        }
      },
      {
        key: "ui.payments.stripe_connect.note_new_title",
        values: {
          en: "New to Stripe?",
          de: "Neu bei Stripe?",
          pl: "Nowy w Stripe?",
          es: "¿Nuevo en Stripe?",
          fr: "Nouveau sur Stripe?",
          ja: "Stripeは初めてですか？",
        }
      },
      {
        key: "ui.payments.stripe_connect.note_new_desc",
        values: {
          en: "You can create an account during the connection process",
          de: "Sie können während des Verbindungsprozesses ein Konto erstellen",
          pl: "Możesz utworzyć konto podczas procesu łączenia",
          es: "Puedes crear una cuenta durante el proceso de conexión",
          fr: "Vous pouvez créer un compte pendant le processus de connexion",
          ja: "接続プロセス中にアカウントを作成できます",
        }
      },
      {
        key: "ui.payments.stripe_connect.note_requirements",
        values: {
          en: "Have ready: business information, bank details, and tax ID",
          de: "Bereiten Sie vor: Geschäftsinformationen, Bankdaten und Steuernummer",
          pl: "Przygotuj: informacje o firmie, dane bankowe i numer podatkowy",
          es: "Ten listo: información comercial, detalles bancarios y número de identificación fiscal",
          fr: "Préparez: informations commerciales, coordonnées bancaires et numéro fiscal",
          ja: "準備するもの：事業情報、銀行詳細、税務ID",
        }
      },
      {
        key: "ui.payments.stripe_connect.account_status_label",
        values: {
          en: "Account Status",
          de: "Kontostatus",
          pl: "Status konta",
          es: "Estado de la cuenta",
          fr: "Statut du compte",
          ja: "アカウントステータス",
        }
      },
      {
        key: "ui.payments.stripe_connect.account_details_title",
        values: {
          en: "Account Details",
          de: "Kontodetails",
          pl: "Szczegóły konta",
          es: "Detalles de la cuenta",
          fr: "Détails du compte",
          ja: "アカウント詳細",
        }
      },
      {
        key: "ui.payments.stripe_connect.onboarding_status",
        values: {
          en: "Onboarding Status",
          de: "Onboarding-Status",
          pl: "Status wdrożenia",
          es: "Estado de incorporación",
          fr: "Statut d'intégration",
          ja: "オンボーディングステータス",
        }
      },
      {
        key: "ui.payments.stripe_connect.onboarding_complete",
        values: {
          en: "Complete",
          de: "Vollständig",
          pl: "Ukończono",
          es: "Completo",
          fr: "Complet",
          ja: "完了",
        }
      },
      {
        key: "ui.payments.stripe_connect.onboarding_incomplete",
        values: {
          en: "Incomplete",
          de: "Unvollständig",
          pl: "Nieukończone",
          es: "Incompleto",
          fr: "Incomplet",
          ja: "未完了",
        }
      },
      {
        key: "ui.payments.stripe_connect.onboarding_incomplete_title",
        values: {
          en: "Onboarding Incomplete",
          de: "Onboarding unvollständig",
          pl: "Wdrożenie nieukończone",
          es: "Incorporación incompleta",
          fr: "Intégration incomplète",
          ja: "オンボーディング未完了",
        }
      },
      {
        key: "ui.payments.stripe_connect.onboarding_incomplete_desc",
        values: {
          en: "You need to complete your Stripe Connect onboarding to start accepting payments.",
          de: "Sie müssen Ihr Stripe Connect-Onboarding abschließen, um Zahlungen zu akzeptieren.",
          pl: "Musisz ukończyć wdrożenie Stripe Connect, aby rozpocząć przyjmowanie płatności.",
          es: "Debes completar la incorporación de Stripe Connect para comenzar a aceptar pagos.",
          fr: "Vous devez terminer votre intégration Stripe Connect pour commencer à accepter les paiements.",
          ja: "支払いを受け付け始めるには、Stripe Connectのオンボーディングを完了する必要があります。",
        }
      },
      {
        key: "ui.payments.stripe_connect.loading",
        values: {
          en: "Loading...",
          de: "Laden...",
          pl: "Ładowanie...",
          es: "Cargando...",
          fr: "Chargement...",
          ja: "読み込み中...",
        }
      },
      {
        key: "ui.payments.stripe_connect.complete_onboarding",
        values: {
          en: "Complete Onboarding",
          de: "Onboarding abschließen",
          pl: "Ukończ wdrożenie",
          es: "Completar incorporación",
          fr: "Terminer l'intégration",
          ja: "オンボーディングを完了",
        }
      },
      {
        key: "ui.payments.stripe_connect.tax_settings_title",
        values: {
          en: "Tax Settings (Stripe Tax)",
          de: "Steuereinstellungen (Stripe Tax)",
          pl: "Ustawienia podatkowe (Stripe Tax)",
          es: "Configuración de impuestos (Stripe Tax)",
          fr: "Paramètres fiscaux (Stripe Tax)",
          ja: "税金設定（Stripe Tax）",
        }
      },
      {
        key: "ui.payments.stripe_connect.tax_code",
        values: {
          en: "Default Tax Code",
          de: "Standard-Steuercode",
          pl: "Domyślny kod podatkowy",
          es: "Código de impuesto predeterminado",
          fr: "Code fiscal par défaut",
          ja: "デフォルト税コード",
        }
      },
      {
        key: "ui.payments.stripe_connect.tax_not_configured",
        values: {
          en: "Tax settings are not configured for this organization. Configure tax settings to enable automatic tax calculation with Stripe Tax.",
          de: "Steuereinstellungen sind für diese Organisation nicht konfiguriert. Konfigurieren Sie Steuereinstellungen, um automatische Steuerberechnung mit Stripe Tax zu aktivieren.",
          pl: "Ustawienia podatkowe nie są skonfigurowane dla tej organizacji. Skonfiguruj ustawienia podatkowe, aby włączyć automatyczne obliczanie podatków za pomocą Stripe Tax.",
          es: "La configuración de impuestos no está configurada para esta organización. Configure los ajustes fiscales para habilitar el cálculo automático de impuestos con Stripe Tax.",
          fr: "Les paramètres fiscaux ne sont pas configurés pour cette organisation. Configurez les paramètres fiscaux pour activer le calcul automatique des taxes avec Stripe Tax.",
          ja: "この組織の税金設定が構成されていません。Stripe Taxによる自動税金計算を有効にするには、税金設定を構成してください。",
        }
      },
      {
        key: "ui.payments.stripe_connect.tax_config_coming_soon",
        values: {
          en: "Tax settings configuration coming soon! For now, please configure via organization settings.",
          de: "Steuereinstellungskonfiguration kommt bald! Konfigurieren Sie es derzeit über die Organisationseinstellungen.",
          pl: "Konfiguracja ustawień podatkowych wkrótce! Na razie skonfiguruj przez ustawienia organizacji.",
          es: "¡Próximamente configuración de impuestos! Por ahora, configura a través de la configuración de la organización.",
          fr: "Configuration des paramètres fiscaux à venir! Pour l'instant, veuillez configurer via les paramètres de l'organisation.",
          ja: "税金設定の構成は近日公開！現在は組織設定から構成してください。",
        }
      },
      {
        key: "ui.payments.stripe_connect.setup_tax",
        values: {
          en: "Setup Tax Settings",
          de: "Steuereinstellungen einrichten",
          pl: "Skonfiguruj ustawienia podatkowe",
          es: "Configurar ajustes fiscales",
          fr: "Configurer les paramètres fiscaux",
          ja: "税金設定を構成",
        }
      },
      {
        key: "ui.payments.stripe_connect.invoice_settings_title",
        values: {
          en: "Invoice Settings (Stripe Invoicing)",
          de: "Rechnungseinstellungen (Stripe-Rechnungsstellung)",
          pl: "Ustawienia faktur (Fakturowanie Stripe)",
          es: "Configuración de facturas (Facturación de Stripe)",
          fr: "Paramètres de facture (Facturation Stripe)",
          ja: "請求書設定（Stripe請求）",
        }
      },

      // ====================
      // STRIPE INVOICE SECTION (ui.payments.invoicing)
      // ====================
      {
        key: "ui.payments.invoicing.connection_required.title",
        values: {
          en: "Stripe Connection Required",
          de: "Stripe-Verbindung erforderlich",
          pl: "Wymagane połączenie Stripe",
          es: "Se requiere conexión Stripe",
          fr: "Connexion Stripe requise",
          ja: "Stripe接続が必要",
        }
      },
      {
        key: "ui.payments.invoicing.connection_required.description",
        values: {
          en: "Please connect your Stripe account in the Stripe tab to enable invoicing features.",
          de: "Bitte verbinden Sie Ihr Stripe-Konto im Stripe-Tab, um Rechnungsfunktionen zu aktivieren.",
          pl: "Połącz swoje konto Stripe na karcie Stripe, aby włączyć funkcje fakturowania.",
          es: "Conecta tu cuenta de Stripe en la pestaña Stripe para habilitar funciones de facturación.",
          fr: "Veuillez connecter votre compte Stripe dans l'onglet Stripe pour activer les fonctionnalités de facturation.",
          ja: "請求機能を有効にするには、StripeタブでStripeアカウントを接続してください。",
        }
      },
      {
        key: "ui.payments.invoicing.not_setup.title",
        values: {
          en: "Stripe Invoicing Not Enabled",
          de: "Stripe-Rechnungsstellung nicht aktiviert",
          pl: "Fakturowanie Stripe nie jest włączone",
          es: "Facturación de Stripe no habilitada",
          fr: "Facturation Stripe non activée",
          ja: "Stripe請求が有効になっていません",
        }
      },
      {
        key: "ui.payments.invoicing.not_setup.description",
        values: {
          en: "Enable Stripe Invoicing to send professional invoices with automatic payment collection.",
          de: "Aktivieren Sie die Stripe-Rechnungsstellung, um professionelle Rechnungen mit automatischem Zahlungseinzug zu versenden.",
          pl: "Włącz fakturowanie Stripe, aby wysyłać profesjonalne faktury z automatycznym pobieraniem płatności.",
          es: "Habilita la facturación de Stripe para enviar facturas profesionales con cobro automático de pagos.",
          fr: "Activez la facturation Stripe pour envoyer des factures professionnelles avec recouvrement automatique des paiements.",
          ja: "Stripe請求を有効にして、自動支払い回収機能付きのプロフェッショナルな請求書を送信します。",
        }
      },
      {
        key: "ui.payments.invoicing.requirements.title",
        values: {
          en: "Requirements:",
          de: "Anforderungen:",
          pl: "Wymagania:",
          es: "Requisitos:",
          fr: "Exigences:",
          ja: "要件：",
        }
      },
      {
        key: "ui.payments.invoicing.requirements.stripe_connected",
        values: {
          en: "Stripe account connected",
          de: "Stripe-Konto verbunden",
          pl: "Konto Stripe połączone",
          es: "Cuenta de Stripe conectada",
          fr: "Compte Stripe connecté",
          ja: "Stripeアカウント接続済み",
        }
      },
      {
        key: "ui.payments.invoicing.requirements.business_profile",
        values: {
          en: "Business profile complete",
          de: "Geschäftsprofil vollständig",
          pl: "Profil firmowy uzupełniony",
          es: "Perfil de negocio completo",
          fr: "Profil d'entreprise complet",
          ja: "ビジネスプロフィール完了",
        }
      },
      {
        key: "ui.payments.invoicing.success.title",
        values: {
          en: "Invoicing Capability Requested!",
          de: "Rechnungsstellungsfähigkeit angefordert!",
          pl: "Zażądano możliwości fakturowania!",
          es: "¡Capacidad de facturación solicitada!",
          fr: "Capacité de facturation demandée!",
          ja: "請求機能がリクエストされました！",
        }
      },
      {
        key: "ui.payments.invoicing.success.description",
        values: {
          en: "Your request has been submitted. Stripe will review and enable invoicing for your account.",
          de: "Ihre Anfrage wurde eingereicht. Stripe wird die Rechnungsstellung für Ihr Konto prüfen und aktivieren.",
          pl: "Twoje zgłoszenie zostało przesłane. Stripe sprawdzi i włączy fakturowanie dla Twojego konta.",
          es: "Tu solicitud ha sido enviada. Stripe revisará y habilitará la facturación para tu cuenta.",
          fr: "Votre demande a été soumise. Stripe examinera et activera la facturation pour votre compte.",
          ja: "リクエストが送信されました。Stripeがアカウントの請求を確認して有効にします。",
        }
      },
      {
        key: "ui.payments.invoicing.error.title",
        values: {
          en: "Request Failed",
          de: "Anfrage fehlgeschlagen",
          pl: "Żądanie nie powiodło się",
          es: "Solicitud fallida",
          fr: "Échec de la demande",
          ja: "リクエスト失敗",
        }
      },
      {
        key: "ui.payments.invoicing.buttons.enabling",
        values: {
          en: "Enabling...",
          de: "Wird aktiviert...",
          pl: "Włączanie...",
          es: "Habilitando...",
          fr: "Activation...",
          ja: "有効化中...",
        }
      },
      {
        key: "ui.payments.invoicing.buttons.enable",
        values: {
          en: "Enable Stripe Invoicing",
          de: "Stripe-Rechnungsstellung aktivieren",
          pl: "Włącz fakturowanie Stripe",
          es: "Habilitar facturación de Stripe",
          fr: "Activer la facturation Stripe",
          ja: "Stripe請求を有効にする",
        }
      },
      {
        key: "ui.payments.invoicing.buttons.dashboard",
        values: {
          en: "Open Stripe Dashboard",
          de: "Stripe Dashboard öffnen",
          pl: "Otwórz panel Stripe",
          es: "Abrir panel de Stripe",
          fr: "Ouvrir le tableau de bord Stripe",
          ja: "Stripeダッシュボードを開く",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.note",
        values: {
          en: "Note: Invoicing capability may take a few minutes to activate after submission.",
          de: "Hinweis: Die Rechnungsstellungsfähigkeit kann nach der Einreichung einige Minuten dauern, bis sie aktiviert wird.",
          pl: "Uwaga: Możliwość fakturowania może potrwać kilka minut po przesłaniu.",
          es: "Nota: La capacidad de facturación puede tardar unos minutos en activarse después del envío.",
          fr: "Remarque: La capacité de facturation peut prendre quelques minutes pour s'activer après la soumission.",
          ja: "注：請求機能は送信後、有効化に数分かかる場合があります。",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.title",
        values: {
          en: "How to Enable Stripe Invoicing",
          de: "So aktivieren Sie die Stripe-Rechnungsstellung",
          pl: "Jak włączyć fakturowanie Stripe",
          es: "Cómo habilitar la facturación de Stripe",
          fr: "Comment activer la facturation Stripe",
          ja: "Stripe請求を有効にする方法",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.step1",
        values: {
          en: "Click 'Enable Stripe Invoicing' to request the capability from Stripe",
          de: "Klicken Sie auf 'Stripe-Rechnungsstellung aktivieren', um die Funktion von Stripe anzufordern",
          pl: "Kliknij 'Włącz fakturowanie Stripe', aby zażądać możliwości od Stripe",
          es: "Haz clic en 'Habilitar facturación de Stripe' para solicitar la capacidad de Stripe",
          fr: "Cliquez sur 'Activer la facturation Stripe' pour demander la capacité à Stripe",
          ja: "'Stripe請求を有効にする'をクリックして、Stripeに機能をリクエスト",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.step2",
        values: {
          en: "Stripe will automatically review your account (usually instant)",
          de: "Stripe überprüft Ihr Konto automatisch (normalerweise sofort)",
          pl: "Stripe automatycznie sprawdzi Twoje konto (zazwyczaj natychmiast)",
          es: "Stripe revisará tu cuenta automáticamente (generalmente instantáneo)",
          fr: "Stripe examinera automatiquement votre compte (généralement instantané)",
          ja: "Stripeがアカウントを自動的に確認します（通常は即時）",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.step3",
        values: {
          en: "Once approved, you can create and send invoices from the Stripe Dashboard",
          de: "Nach der Genehmigung können Sie Rechnungen über das Stripe Dashboard erstellen und versenden",
          pl: "Po zatwierdzeniu możesz tworzyć i wysyłać faktury z panelu Stripe",
          es: "Una vez aprobado, puedes crear y enviar facturas desde el panel de Stripe",
          fr: "Une fois approuvé, vous pouvez créer et envoyer des factures depuis le tableau de bord Stripe",
          ja: "承認後、Stripeダッシュボードから請求書を作成して送信できます",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.step4",
        values: {
          en: "Customers receive professional invoices with online payment options",
          de: "Kunden erhalten professionelle Rechnungen mit Online-Zahlungsoptionen",
          pl: "Klienci otrzymują profesjonalne faktury z opcjami płatności online",
          es: "Los clientes reciben facturas profesionales con opciones de pago en línea",
          fr: "Les clients reçoivent des factures professionnelles avec des options de paiement en ligne",
          ja: "顧客はオンライン支払いオプション付きのプロフェッショナルな請求書を受け取ります",
        }
      },
      {
        key: "ui.payments.invoicing.how_to.step5",
        values: {
          en: "Track all invoices and payments in real-time from your dashboard",
          de: "Verfolgen Sie alle Rechnungen und Zahlungen in Echtzeit über Ihr Dashboard",
          pl: "Śledź wszystkie faktury i płatności w czasie rzeczywistym z panelu",
          es: "Rastrea todas las facturas y pagos en tiempo real desde tu panel",
          fr: "Suivez toutes les factures et paiements en temps réel depuis votre tableau de bord",
          ja: "ダッシュボードからすべての請求書と支払いをリアルタイムで追跡",
        }
      },
      {
        key: "ui.payments.invoicing.status.enabled.title",
        values: {
          en: "Stripe Invoicing Enabled",
          de: "Stripe-Rechnungsstellung aktiviert",
          pl: "Fakturowanie Stripe włączone",
          es: "Facturación de Stripe habilitada",
          fr: "Facturation Stripe activée",
          ja: "Stripe請求が有効",
        }
      },
      {
        key: "ui.payments.invoicing.status.enabled.description",
        values: {
          en: "You can now create and send invoices through Stripe with automated payment collection.",
          de: "Sie können jetzt Rechnungen über Stripe mit automatischem Zahlungseinzug erstellen und versenden.",
          pl: "Możesz teraz tworzyć i wysyłać faktury przez Stripe z automatycznym pobieraniem płatności.",
          es: "Ahora puedes crear y enviar facturas a través de Stripe con cobro automático de pagos.",
          fr: "Vous pouvez maintenant créer et envoyer des factures via Stripe avec recouvrement automatique des paiements.",
          ja: "自動支払い回収機能付きでStripeを通じて請求書を作成・送信できるようになりました。",
        }
      },
      {
        key: "ui.payments.invoicing.config.title",
        values: {
          en: "Invoicing Configuration",
          de: "Rechnungskonfiguration",
          pl: "Konfiguracja fakturowania",
          es: "Configuración de facturación",
          fr: "Configuration de facturation",
          ja: "請求設定",
        }
      },
      {
        key: "ui.payments.invoicing.config.invoicing",
        values: {
          en: "Stripe Invoicing",
          de: "Stripe-Rechnungsstellung",
          pl: "Fakturowanie Stripe",
          es: "Facturación de Stripe",
          fr: "Facturation Stripe",
          ja: "Stripe請求",
        }
      },
      {
        key: "ui.payments.invoicing.config.enabled",
        values: {
          en: "Enabled",
          de: "Aktiviert",
          pl: "Włączone",
          es: "Habilitado",
          fr: "Activé",
          ja: "有効",
        }
      },
      {
        key: "ui.payments.invoicing.config.collection_method",
        values: {
          en: "Collection Method",
          de: "Einzugsmethode",
          pl: "Metoda pobierania",
          es: "Método de cobro",
          fr: "Méthode de recouvrement",
          ja: "回収方法",
        }
      },
      {
        key: "ui.payments.invoicing.config.payment_terms",
        values: {
          en: "Payment Terms",
          de: "Zahlungsbedingungen",
          pl: "Warunki płatności",
          es: "Términos de pago",
          fr: "Conditions de paiement",
          ja: "支払い条件",
        }
      },
      {
        key: "ui.payments.invoicing.config.days_until_due",
        values: {
          en: "Days Until Due",
          de: "Tage bis zur Fälligkeit",
          pl: "Dni do terminu płatności",
          es: "Días hasta el vencimiento",
          fr: "Jours jusqu'à l'échéance",
          ja: "支払期限までの日数",
        }
      },
      {
        key: "ui.payments.invoicing.config.auto_advance",
        values: {
          en: "Auto-finalize Drafts",
          de: "Entwürfe automatisch finalisieren",
          pl: "Automatyczne finalizowanie projektów",
          es: "Finalizar borradores automáticamente",
          fr: "Finaliser automatiquement les brouillons",
          ja: "下書きを自動確定",
        }
      },
      {
        key: "ui.payments.invoicing.config.yes",
        values: {
          en: "Yes",
          de: "Ja",
          pl: "Tak",
          es: "Sí",
          fr: "Oui",
          ja: "はい",
        }
      },
      {
        key: "ui.payments.invoicing.config.no",
        values: {
          en: "No",
          de: "Nein",
          pl: "Nie",
          es: "No",
          fr: "Non",
          ja: "いいえ",
        }
      },
      {
        key: "ui.payments.invoicing.config.stripe_mode",
        values: {
          en: "Stripe Mode",
          de: "Stripe-Modus",
          pl: "Tryb Stripe",
          es: "Modo Stripe",
          fr: "Mode Stripe",
          ja: "Stripeモード",
        }
      },
      {
        key: "ui.payments.invoicing.config.test_mode",
        values: {
          en: "Test Mode",
          de: "Testmodus",
          pl: "Tryb testowy",
          es: "Modo de prueba",
          fr: "Mode test",
          ja: "テストモード",
        }
      },
      {
        key: "ui.payments.invoicing.config.live_mode",
        values: {
          en: "Live Mode",
          de: "Live-Modus",
          pl: "Tryb na żywo",
          es: "Modo en vivo",
          fr: "Mode direct",
          ja: "ライブモード",
        }
      },
      {
        key: "ui.payments.invoicing.features.title",
        values: {
          en: "Stripe Invoicing Features",
          de: "Stripe-Rechnungsstellungsfunktionen",
          pl: "Funkcje fakturowania Stripe",
          es: "Funciones de facturación de Stripe",
          fr: "Fonctionnalités de facturation Stripe",
          ja: "Stripe請求機能",
        }
      },
      {
        key: "ui.payments.invoicing.features.branding",
        values: {
          en: "Professional invoices with your branding",
          de: "Professionelle Rechnungen mit Ihrem Branding",
          pl: "Profesjonalne faktury z Twoją marką",
          es: "Facturas profesionales con tu marca",
          fr: "Factures professionnelles avec votre image de marque",
          ja: "ブランド入りプロフェッショナル請求書",
        }
      },
      {
        key: "ui.payments.invoicing.features.auto_send",
        values: {
          en: "Automatic email delivery to customers",
          de: "Automatische E-Mail-Zustellung an Kunden",
          pl: "Automatyczna dostawa e-mail do klientów",
          es: "Entrega automática por correo electrónico a clientes",
          fr: "Livraison automatique par e-mail aux clients",
          ja: "顧客への自動メール配信",
        }
      },
      {
        key: "ui.payments.invoicing.features.online_payment",
        values: {
          en: "Online payment with cards, bank transfers, and more",
          de: "Online-Zahlung mit Karten, Banküberweisungen und mehr",
          pl: "Płatności online kartami, przelewami bankowymi i więcej",
          es: "Pago en línea con tarjetas, transferencias bancarias y más",
          fr: "Paiement en ligne avec cartes, virements bancaires et plus",
          ja: "カード、銀行振込などでのオンライン支払い",
        }
      },
      {
        key: "ui.payments.invoicing.features.tracking",
        values: {
          en: "Real-time payment status tracking",
          de: "Echtzeit-Zahlungsstatusverfolgung",
          pl: "Śledzenie statusu płatności w czasie rzeczywistym",
          es: "Seguimiento del estado de pago en tiempo real",
          fr: "Suivi en temps réel du statut de paiement",
          ja: "リアルタイム支払いステータス追跡",
        }
      },
      {
        key: "ui.payments.invoicing.features.tax_integration",
        values: {
          en: "Automatic tax calculation with Stripe Tax",
          de: "Automatische Steuerberechnung mit Stripe Tax",
          pl: "Automatyczne obliczanie podatków za pomocą Stripe Tax",
          es: "Cálculo automático de impuestos con Stripe Tax",
          fr: "Calcul automatique des taxes avec Stripe Tax",
          ja: "Stripe Taxでの自動税金計算",
        }
      },
      {
        key: "ui.payments.invoicing.manage.title",
        values: {
          en: "Manage Invoices",
          de: "Rechnungen verwalten",
          pl: "Zarządzaj fakturami",
          es: "Administrar facturas",
          fr: "Gérer les factures",
          ja: "請求書を管理",
        }
      },
      {
        key: "ui.payments.invoicing.manage.description",
        values: {
          en: "View, create, and manage all your invoices directly in the Stripe Dashboard.",
          de: "Zeigen Sie alle Ihre Rechnungen direkt im Stripe Dashboard an, erstellen und verwalten Sie sie.",
          pl: "Przeglądaj, twórz i zarządzaj wszystkimi fakturami bezpośrednio w panelu Stripe.",
          es: "Ver, crear y administrar todas tus facturas directamente en el panel de Stripe.",
          fr: "Afficher, créer et gérer toutes vos factures directement dans le tableau de bord Stripe.",
          ja: "Stripeダッシュボードで請求書を直接表示、作成、管理します。",
        }
      },
      {
        key: "ui.payments.invoicing.buttons.view_invoices",
        values: {
          en: "View All Invoices",
          de: "Alle Rechnungen anzeigen",
          pl: "Wyświetl wszystkie faktury",
          es: "Ver todas las facturas",
          fr: "Voir toutes les factures",
          ja: "すべての請求書を表示",
        }
      },
      {
        key: "ui.payments.invoicing.buttons.create_invoice",
        values: {
          en: "Create Invoice",
          de: "Rechnung erstellen",
          pl: "Utwórz fakturę",
          es: "Crear factura",
          fr: "Créer une facture",
          ja: "請求書を作成",
        }
      },
      {
        key: "ui.payments.invoicing.notes.title",
        values: {
          en: "Important Notes",
          de: "Wichtige Hinweise",
          pl: "Ważne uwagi",
          es: "Notas importantes",
          fr: "Notes importantes",
          ja: "重要な注意事項",
        }
      },
      {
        key: "ui.payments.invoicing.notes.send_auto_manual",
        values: {
          en: "Invoices can be sent automatically or manually from Stripe Dashboard",
          de: "Rechnungen können automatisch oder manuell über das Stripe Dashboard versendet werden",
          pl: "Faktury mogą być wysyłane automatycznie lub ręcznie z panelu Stripe",
          es: "Las facturas se pueden enviar automáticamente o manualmente desde el panel de Stripe",
          fr: "Les factures peuvent être envoyées automatiquement ou manuellement depuis le tableau de bord Stripe",
          ja: "請求書はStripeダッシュボードから自動または手動で送信できます",
        }
      },
      {
        key: "ui.payments.invoicing.notes.online_payment",
        values: {
          en: "Customers can pay online via the invoice link with various payment methods",
          de: "Kunden können online über den Rechnungslink mit verschiedenen Zahlungsmethoden bezahlen",
          pl: "Klienci mogą płacić online za pomocą linku do faktury różnymi metodami płatności",
          es: "Los clientes pueden pagar en línea a través del enlace de factura con varios métodos de pago",
          fr: "Les clients peuvent payer en ligne via le lien de facture avec diverses méthodes de paiement",
          ja: "顧客は請求書リンクから様々な支払い方法でオンライン支払いができます",
        }
      },
      {
        key: "ui.payments.invoicing.notes.tax_integration",
        values: {
          en: "Stripe Tax integration automatically calculates applicable taxes on invoices",
          de: "Die Stripe Tax-Integration berechnet automatisch anfallende Steuern auf Rechnungen",
          pl: "Integracja Stripe Tax automatycznie oblicza odpowiednie podatki na fakturach",
          es: "La integración de Stripe Tax calcula automáticamente los impuestos aplicables en las facturas",
          fr: "L'intégration Stripe Tax calcule automatiquement les taxes applicables sur les factures",
          ja: "Stripe Tax統合は請求書の該当税金を自動計算します",
        }
      },
      {
        key: "ui.payments.invoicing.notes.custom_terms",
        values: {
          en: "Set custom payment terms (net 15, 30, 60, 90 days) for different customers",
          de: "Legen Sie individuelle Zahlungsbedingungen (netto 15, 30, 60, 90 Tage) für verschiedene Kunden fest",
          pl: "Ustaw niestandardowe warunki płatności (netto 15, 30, 60, 90 dni) dla różnych klientów",
          es: "Establece términos de pago personalizados (neto 15, 30, 60, 90 días) para diferentes clientes",
          fr: "Définissez des conditions de paiement personnalisées (net 15, 30, 60, 90 jours) pour différents clients",
          ja: "顧客ごとにカスタム支払い条件（正味15、30、60、90日）を設定",
        }
      },
      {
        key: "ui.payments.invoicing.notes.auto_collection",
        values: {
          en: "Automatic collection attempts and reminders can be configured in Stripe settings",
          de: "Automatische Inkassoversuche und Erinnerungen können in den Stripe-Einstellungen konfiguriert werden",
          pl: "Automatyczne próby windykacji i przypomnienia można skonfigurować w ustawieniach Stripe",
          es: "Se pueden configurar intentos de cobro automático y recordatorios en la configuración de Stripe",
          fr: "Les tentatives de recouvrement automatique et les rappels peuvent être configurés dans les paramètres Stripe",
          ja: "自動回収試行とリマインダーはStripe設定で構成できます",
        }
      },

      // ====================
      // INVOICING SECTION (ui.payments.invoicing_section)
      // ====================
      {
        key: "ui.payments.invoicing_section.title",
        values: {
          en: "Invoice Payment Management",
          de: "Rechnungszahlungsverwaltung",
          pl: "Zarządzanie płatnościami faktur",
          es: "Gestión de pagos de facturas",
          fr: "Gestion des paiements de facture",
          ja: "請求書支払い管理",
        }
      },
      {
        key: "ui.payments.invoicing_section.subtitle",
        values: {
          en: "Enable B2B invoice payments with \"Pay Later\" option for business customers",
          de: "Aktivieren Sie B2B-Rechnungszahlungen mit der Option \"Später bezahlen\" für Geschäftskunden",
          pl: "Włącz płatności faktur B2B z opcją \"Zapłać później\" dla klientów biznesowych",
          es: "Habilitar pagos de facturas B2B con opción \"Pagar más tarde\" para clientes empresariales",
          fr: "Activer les paiements de factures B2B avec l'option \"Payer plus tard\" pour les clients professionnels",
          ja: "ビジネス顧客向けに「後払い」オプション付きB2B請求書支払いを有効にする",
        }
      },
      {
        key: "ui.payments.invoicing_section.status_enabled",
        values: {
          en: "Invoice Payment Enabled",
          de: "Rechnungszahlung aktiviert",
          pl: "Płatność faktur włączona",
          es: "Pago de facturas habilitado",
          fr: "Paiement de facture activé",
          ja: "請求書支払いが有効",
        }
      },
      {
        key: "ui.payments.invoicing_section.status_disabled",
        values: {
          en: "Invoice Payment Disabled",
          de: "Rechnungszahlung deaktiviert",
          pl: "Płatność faktur wyłączona",
          es: "Pago de facturas deshabilitado",
          fr: "Paiement de facture désactivé",
          ja: "請求書支払いが無効",
        }
      },
      {
        key: "ui.payments.invoicing_section.setup_checklist",
        values: {
          en: "Setup Checklist:",
          de: "Einrichtungscheckliste:",
          pl: "Lista kontrolna konfiguracji:",
          es: "Lista de verificación de configuración:",
          fr: "Liste de contrôle de configuration:",
          ja: "セットアップチェックリスト：",
        }
      },
      {
        key: "ui.payments.invoicing_section.checklist_invoicing_app",
        values: {
          en: "Invoicing App Enabled",
          de: "Rechnungs-App aktiviert",
          pl: "Aplikacja fakturowania włączona",
          es: "Aplicación de facturación habilitada",
          fr: "Application de facturation activée",
          ja: "請求アプリが有効",
        }
      },
      {
        key: "ui.payments.invoicing_section.checklist_crm_orgs",
        values: {
          en: "CRM Organizations",
          de: "CRM-Organisationen",
          pl: "Organizacje CRM",
          es: "Organizaciones CRM",
          fr: "Organisations CRM",
          ja: "CRM組織",
        }
      },
      {
        key: "ui.payments.invoicing_section.checklist_crm_desc",
        values: {
          en: "{count} employer organizations in CRM (will be created during checkout)",
          de: "{count} Arbeitgeberorganisationen im CRM (werden beim Checkout erstellt)",
          pl: "{count} organizacji pracodawców w CRM (zostaną utworzone podczas kasy)",
          es: "{count} organizaciones de empleadores en CRM (se crearán durante el pago)",
          fr: "{count} organisations d'employeurs dans le CRM (seront créées lors du paiement)",
          ja: "CRM内の{count}雇用主組織（チェックアウト時に作成されます）",
        }
      },
      {
        key: "ui.payments.invoicing_section.checklist_stripe_invoice",
        values: {
          en: "Stripe Invoice Integration",
          de: "Stripe-Rechnungsintegration",
          pl: "Integracja faktur Stripe",
          es: "Integración de facturación de Stripe",
          fr: "Intégration de facturation Stripe",
          ja: "Stripe請求書統合",
        }
      },
      {
        key: "ui.payments.invoicing_section.stripe_enabled_desc",
        values: {
          en: "Stripe invoicing enabled - invoices can be sent via Stripe",
          de: "Stripe-Rechnungsstellung aktiviert - Rechnungen können über Stripe gesendet werden",
          pl: "Fakturowanie Stripe włączone - faktury mogą być wysyłane przez Stripe",
          es: "Facturación de Stripe habilitada - las facturas se pueden enviar a través de Stripe",
          fr: "Facturation Stripe activée - les factures peuvent être envoyées via Stripe",
          ja: "Stripe請求が有効 - 請求書をStripe経由で送信できます",
        }
      },
      {
        key: "ui.payments.invoicing_section.stripe_disabled_desc",
        values: {
          en: "Enable in Stripe settings to send invoices via Stripe",
          de: "In Stripe-Einstellungen aktivieren, um Rechnungen über Stripe zu senden",
          pl: "Włącz w ustawieniach Stripe, aby wysyłać faktury przez Stripe",
          es: "Habilitar en la configuración de Stripe para enviar facturas a través de Stripe",
          fr: "Activer dans les paramètres Stripe pour envoyer des factures via Stripe",
          ja: "Stripe設定で有効にして、Stripe経由で請求書を送信",
        }
      },
      {
        key: "ui.payments.invoicing_section.action_enable_app",
        values: {
          en: "Enable invoicing app",
          de: "Rechnungs-App aktivieren",
          pl: "Włącz aplikację fakturowania",
          es: "Habilitar aplicación de facturación",
          fr: "Activer l'application de facturation",
          ja: "請求アプリを有効にする",
        }
      },
      {
        key: "ui.payments.invoicing_section.action_enabling",
        values: {
          en: "Enabling...",
          de: "Wird aktiviert...",
          pl: "Włączanie...",
          es: "Habilitando...",
          fr: "Activation...",
          ja: "有効化中...",
        }
      },
      {
        key: "ui.payments.invoicing_section.quick_stats",
        values: {
          en: "Quick Stats:",
          de: "Schnellstatistik:",
          pl: "Szybkie statystyki:",
          es: "Estadísticas rápidas:",
          fr: "Statistiques rapides:",
          ja: "クイック統計：",
        }
      },
      {
        key: "ui.payments.invoicing_section.stat_total_invoices",
        values: {
          en: "Total Invoices",
          de: "Gesamt Rechnungen",
          pl: "Łączna liczba faktur",
          es: "Total de facturas",
          fr: "Total des factures",
          ja: "総請求書数",
        }
      },
      {
        key: "ui.payments.invoicing_section.stat_paid",
        values: {
          en: "Paid",
          de: "Bezahlt",
          pl: "Opłacone",
          es: "Pagado",
          fr: "Payé",
          ja: "支払済み",
        }
      },
      {
        key: "ui.payments.invoicing_section.stat_pending",
        values: {
          en: "Pending",
          de: "Ausstehend",
          pl: "Oczekujące",
          es: "Pendiente",
          fr: "En attente",
          ja: "保留中",
        }
      },
      {
        key: "ui.payments.invoicing_section.stat_total_amount",
        values: {
          en: "Total Amount",
          de: "Gesamtbetrag",
          pl: "Łączna kwota",
          es: "Monto total",
          fr: "Montant total",
          ja: "合計金額",
        }
      },
      {
        key: "ui.payments.invoicing_section.stripe_integration_title",
        values: {
          en: "Stripe Invoice Integration",
          de: "Stripe-Rechnungsintegration",
          pl: "Integracja faktur Stripe",
          es: "Integración de facturación de Stripe",
          fr: "Intégration de facturation Stripe",
          ja: "Stripe請求書統合",
        }
      },
      {
        key: "ui.payments.invoicing_section.stripe_integration_desc",
        values: {
          en: "Send invoices directly through Stripe with automated payment tracking",
          de: "Senden Sie Rechnungen direkt über Stripe mit automatischer Zahlungsverfolgung",
          pl: "Wysyłaj faktury bezpośrednio przez Stripe z automatycznym śledzeniem płatności",
          es: "Enviar facturas directamente a través de Stripe con seguimiento automático de pagos",
          fr: "Envoyer des factures directement via Stripe avec suivi automatique des paiements",
          ja: "Stripeを通じて自動支払い追跡付きで請求書を直接送信",
        }
      },
      {
        key: "ui.payments.invoicing_section.stripe_enabled",
        values: {
          en: "✓ Enabled",
          de: "✓ Aktiviert",
          pl: "✓ Włączone",
          es: "✓ Habilitado",
          fr: "✓ Activé",
          ja: "✓ 有効",
        }
      },
      {
        key: "ui.payments.invoicing_section.stripe_not_enabled",
        values: {
          en: "○ Not Enabled",
          de: "○ Nicht aktiviert",
          pl: "○ Nie włączone",
          es: "○ No habilitado",
          fr: "○ Non activé",
          ja: "○ 無効",
        }
      },
      {
        key: "ui.payments.invoicing_section.configure_stripe",
        values: {
          en: "Configure in Stripe Settings",
          de: "In Stripe-Einstellungen konfigurieren",
          pl: "Konfiguruj w ustawieniach Stripe",
          es: "Configurar en ajustes de Stripe",
          fr: "Configurer dans les paramètres Stripe",
          ja: "Stripe設定で構成",
        }
      },
      {
        key: "ui.payments.invoicing_section.open_invoicing_window",
        values: {
          en: "Open Full Invoicing Window",
          de: "Vollständiges Rechnungsfenster öffnen",
          pl: "Otwórz pełne okno fakturowania",
          es: "Abrir ventana completa de facturación",
          fr: "Ouvrir la fenêtre de facturation complète",
          ja: "完全な請求ウィンドウを開く",
        }
      },
      {
        key: "ui.payments.invoicing_section.how_it_works",
        values: {
          en: "How it works:",
          de: "So funktioniert es:",
          pl: "Jak to działa:",
          es: "Cómo funciona:",
          fr: "Comment ça marche:",
          ja: "仕組み：",
        }
      },
      {
        key: "ui.payments.invoicing_section.how_step1",
        values: {
          en: "Customers select \"Invoice (Pay Later)\" at checkout",
          de: "Kunden wählen beim Checkout \"Rechnung (Später bezahlen)\"",
          pl: "Klienci wybierają \"Faktura (Zapłać później)\" podczas kasy",
          es: "Los clientes seleccionan \"Factura (Pagar más tarde)\" al pagar",
          fr: "Les clients sélectionnent \"Facture (Payer plus tard)\" lors du paiement",
          ja: "顧客がチェックアウト時に「請求書（後払い）」を選択",
        }
      },
      {
        key: "ui.payments.invoicing_section.how_step2",
        values: {
          en: "Employer organizations are created automatically from form data",
          de: "Arbeitgeberorganisationen werden automatisch aus Formulardaten erstellt",
          pl: "Organizacje pracodawców są tworzone automatycznie z danych formularza",
          es: "Las organizaciones de empleadores se crean automáticamente a partir de los datos del formulario",
          fr: "Les organisations d'employeurs sont créées automatiquement à partir des données du formulaire",
          ja: "雇用主組織がフォームデータから自動的に作成されます",
        }
      },
      {
        key: "ui.payments.invoicing_section.how_step3",
        values: {
          en: "Invoices are generated and can be sent via email or Stripe",
          de: "Rechnungen werden erstellt und können per E-Mail oder Stripe gesendet werden",
          pl: "Faktury są generowane i mogą być wysyłane przez e-mail lub Stripe",
          es: "Se generan facturas y se pueden enviar por correo electrónico o Stripe",
          fr: "Les factures sont générées et peuvent être envoyées par e-mail ou Stripe",
          ja: "請求書が生成され、メールまたはStripe経由で送信できます",
        }
      },
      {
        key: "ui.payments.invoicing_section.how_step4",
        values: {
          en: "Track payment status in the Invoicing Window",
          de: "Verfolgen Sie den Zahlungsstatus im Rechnungsfenster",
          pl: "Śledź status płatności w oknie fakturowania",
          es: "Rastrea el estado de pago en la ventana de facturación",
          fr: "Suivez l'état du paiement dans la fenêtre de facturation",
          ja: "請求ウィンドウで支払いステータスを追跡",
        }
      },
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
            "payments",
            "payments-window"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Payment translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  }
});
