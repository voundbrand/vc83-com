/**
 * SEED BENEFITS WINDOW TRANSLATIONS
 *
 * UI translations for the Benefits window including:
 * - Window tabs and navigation
 * - Benefits list and detail views
 * - Commissions list and detail views
 * - My Claims and My Earnings tabs
 * - Form modals for creating benefits/commissions
 * - Status labels and action buttons
 * - Error messages
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Benefits Window translations...");

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
      // ============================================================================
      // MAIN TABS
      // ============================================================================
      {
        key: "ui.benefits.tabs.benefits",
        values: {
          en: "Benefits",
          de: "Vorteile",
          pl: "Korzyści",
          es: "Beneficios",
          fr: "Avantages",
          ja: "特典",
        }
      },
      {
        key: "ui.benefits.tabs.commissions",
        values: {
          en: "Commissions",
          de: "Provisionen",
          pl: "Prowizje",
          es: "Comisiones",
          fr: "Commissions",
          ja: "コミッション",
        }
      },
      {
        key: "ui.benefits.tabs.my_claims",
        values: {
          en: "My Claims",
          de: "Meine Ansprüche",
          pl: "Moje roszczenia",
          es: "Mis reclamaciones",
          fr: "Mes demandes",
          ja: "マイ申請",
        }
      },
      {
        key: "ui.benefits.tabs.my_earnings",
        values: {
          en: "My Earnings",
          de: "Meine Einnahmen",
          pl: "Moje zarobki",
          es: "Mis ganancias",
          fr: "Mes gains",
          ja: "マイ収益",
        }
      },

      // ============================================================================
      // BENEFITS LIST
      // ============================================================================
      {
        key: "ui.benefits.list.search_placeholder",
        values: {
          en: "Search benefits...",
          de: "Vorteile suchen...",
          pl: "Szukaj korzyści...",
          es: "Buscar beneficios...",
          fr: "Rechercher des avantages...",
          ja: "特典を検索...",
        }
      },
      {
        key: "ui.benefits.list.filter_all",
        values: {
          en: "All",
          de: "Alle",
          pl: "Wszystkie",
          es: "Todos",
          fr: "Tous",
          ja: "すべて",
        }
      },
      {
        key: "ui.benefits.list.new_benefit",
        values: {
          en: "New Benefit",
          de: "Neuer Vorteil",
          pl: "Nowa korzyść",
          es: "Nuevo beneficio",
          fr: "Nouvel avantage",
          ja: "新しい特典",
        }
      },
      {
        key: "ui.benefits.list.no_benefits",
        values: {
          en: "No benefits found",
          de: "Keine Vorteile gefunden",
          pl: "Nie znaleziono korzyści",
          es: "No se encontraron beneficios",
          fr: "Aucun avantage trouvé",
          ja: "特典が見つかりません",
        }
      },
      {
        key: "ui.benefits.list.no_benefits_hint",
        values: {
          en: "Be the first to offer a benefit to members!",
          de: "Seien Sie der Erste, der Mitgliedern einen Vorteil anbietet!",
          pl: "Bądź pierwszy, który zaoferuje korzyść członkom!",
          es: "¡Sé el primero en ofrecer un beneficio a los miembros!",
          fr: "Soyez le premier à offrir un avantage aux membres!",
          ja: "最初にメンバーに特典を提供しましょう！",
        }
      },
      {
        key: "ui.benefits.list.loading",
        values: {
          en: "Loading benefits...",
          de: "Vorteile werden geladen...",
          pl: "Ładowanie korzyści...",
          es: "Cargando beneficios...",
          fr: "Chargement des avantages...",
          ja: "特典を読み込み中...",
        }
      },

      // ============================================================================
      // BENEFIT SUBTYPES
      // ============================================================================
      {
        key: "ui.benefits.subtype.discount",
        values: {
          en: "Discount",
          de: "Rabatt",
          pl: "Zniżka",
          es: "Descuento",
          fr: "Réduction",
          ja: "割引",
        }
      },
      {
        key: "ui.benefits.subtype.service",
        values: {
          en: "Service",
          de: "Dienstleistung",
          pl: "Usługa",
          es: "Servicio",
          fr: "Service",
          ja: "サービス",
        }
      },
      {
        key: "ui.benefits.subtype.product",
        values: {
          en: "Product",
          de: "Produkt",
          pl: "Produkt",
          es: "Producto",
          fr: "Produit",
          ja: "商品",
        }
      },
      {
        key: "ui.benefits.subtype.event",
        values: {
          en: "Event",
          de: "Veranstaltung",
          pl: "Wydarzenie",
          es: "Evento",
          fr: "Événement",
          ja: "イベント",
        }
      },

      // ============================================================================
      // BENEFIT DETAIL
      // ============================================================================
      {
        key: "ui.benefits.detail.select_benefit",
        values: {
          en: "Select a benefit to view details",
          de: "Wählen Sie einen Vorteil aus, um Details anzuzeigen",
          pl: "Wybierz korzyść, aby zobaczyć szczegóły",
          es: "Seleccione un beneficio para ver los detalles",
          fr: "Sélectionnez un avantage pour voir les détails",
          ja: "詳細を表示するには特典を選択してください",
        }
      },
      {
        key: "ui.benefits.detail.offered_by",
        values: {
          en: "Offered by",
          de: "Angeboten von",
          pl: "Oferowane przez",
          es: "Ofrecido por",
          fr: "Offert par",
          ja: "提供者",
        }
      },
      {
        key: "ui.benefits.detail.value",
        values: {
          en: "Value",
          de: "Wert",
          pl: "Wartość",
          es: "Valor",
          fr: "Valeur",
          ja: "価値",
        }
      },
      {
        key: "ui.benefits.detail.valid_until",
        values: {
          en: "Valid until",
          de: "Gültig bis",
          pl: "Ważne do",
          es: "Válido hasta",
          fr: "Valable jusqu'au",
          ja: "有効期限",
        }
      },
      {
        key: "ui.benefits.detail.no_expiry",
        values: {
          en: "No expiry",
          de: "Kein Ablaufdatum",
          pl: "Bez wygaśnięcia",
          es: "Sin vencimiento",
          fr: "Pas d'expiration",
          ja: "無期限",
        }
      },
      {
        key: "ui.benefits.detail.claims_remaining",
        values: {
          en: "Claims remaining",
          de: "Verbleibende Ansprüche",
          pl: "Pozostałe roszczenia",
          es: "Reclamaciones restantes",
          fr: "Demandes restantes",
          ja: "残り申請数",
        }
      },
      {
        key: "ui.benefits.detail.unlimited",
        values: {
          en: "Unlimited",
          de: "Unbegrenzt",
          pl: "Nieograniczone",
          es: "Ilimitado",
          fr: "Illimité",
          ja: "無制限",
        }
      },
      {
        key: "ui.benefits.detail.claim_this_benefit",
        values: {
          en: "Claim This Benefit",
          de: "Diesen Vorteil beanspruchen",
          pl: "Skorzystaj z tej korzyści",
          es: "Reclamar este beneficio",
          fr: "Réclamer cet avantage",
          ja: "この特典を申請",
        }
      },
      {
        key: "ui.benefits.detail.edit",
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
        key: "ui.benefits.detail.contact",
        values: {
          en: "Contact",
          de: "Kontakt",
          pl: "Kontakt",
          es: "Contacto",
          fr: "Contact",
          ja: "連絡先",
        }
      },
      {
        key: "ui.benefits.detail.requirements",
        values: {
          en: "Requirements",
          de: "Anforderungen",
          pl: "Wymagania",
          es: "Requisitos",
          fr: "Conditions",
          ja: "要件",
        }
      },

      // ============================================================================
      // COMMISSIONS LIST
      // ============================================================================
      {
        key: "ui.benefits.commissions.search_placeholder",
        values: {
          en: "Search commissions...",
          de: "Provisionen suchen...",
          pl: "Szukaj prowizji...",
          es: "Buscar comisiones...",
          fr: "Rechercher des commissions...",
          ja: "コミッションを検索...",
        }
      },
      {
        key: "ui.benefits.commissions.new_commission",
        values: {
          en: "New Commission",
          de: "Neue Provision",
          pl: "Nowa prowizja",
          es: "Nueva comisión",
          fr: "Nouvelle commission",
          ja: "新しいコミッション",
        }
      },
      {
        key: "ui.benefits.commissions.no_commissions",
        values: {
          en: "No commissions found",
          de: "Keine Provisionen gefunden",
          pl: "Nie znaleziono prowizji",
          es: "No se encontraron comisiones",
          fr: "Aucune commission trouvée",
          ja: "コミッションが見つかりません",
        }
      },
      {
        key: "ui.benefits.commissions.no_commissions_hint",
        values: {
          en: "Create a commission opportunity for other members!",
          de: "Erstellen Sie eine Provisionsmöglichkeit für andere Mitglieder!",
          pl: "Stwórz możliwość prowizji dla innych członków!",
          es: "¡Crea una oportunidad de comisión para otros miembros!",
          fr: "Créez une opportunité de commission pour d'autres membres!",
          ja: "他のメンバーのためにコミッション機会を作成しましょう！",
        }
      },
      {
        key: "ui.benefits.commissions.loading",
        values: {
          en: "Loading commissions...",
          de: "Provisionen werden geladen...",
          pl: "Ładowanie prowizji...",
          es: "Cargando comisiones...",
          fr: "Chargement des commissions...",
          ja: "コミッションを読み込み中...",
        }
      },

      // ============================================================================
      // COMMISSION SUBTYPES
      // ============================================================================
      {
        key: "ui.benefits.commission_subtype.sales",
        values: {
          en: "Sales",
          de: "Vertrieb",
          pl: "Sprzedaż",
          es: "Ventas",
          fr: "Ventes",
          ja: "セールス",
        }
      },
      {
        key: "ui.benefits.commission_subtype.consulting",
        values: {
          en: "Consulting",
          de: "Beratung",
          pl: "Konsulting",
          es: "Consultoría",
          fr: "Conseil",
          ja: "コンサルティング",
        }
      },
      {
        key: "ui.benefits.commission_subtype.referral",
        values: {
          en: "Referral",
          de: "Empfehlung",
          pl: "Polecenie",
          es: "Referencia",
          fr: "Parrainage",
          ja: "紹介",
        }
      },
      {
        key: "ui.benefits.commission_subtype.partnership",
        values: {
          en: "Partnership",
          de: "Partnerschaft",
          pl: "Partnerstwo",
          es: "Asociación",
          fr: "Partenariat",
          ja: "パートナーシップ",
        }
      },

      // ============================================================================
      // COMMISSION DETAIL
      // ============================================================================
      {
        key: "ui.benefits.commission_detail.select",
        values: {
          en: "Select a commission to view details",
          de: "Wählen Sie eine Provision aus, um Details anzuzeigen",
          pl: "Wybierz prowizję, aby zobaczyć szczegóły",
          es: "Seleccione una comisión para ver los detalles",
          fr: "Sélectionnez une commission pour voir les détails",
          ja: "詳細を表示するにはコミッションを選択してください",
        }
      },
      {
        key: "ui.benefits.commission_detail.commission_rate",
        values: {
          en: "Commission Rate",
          de: "Provisionssatz",
          pl: "Stawka prowizji",
          es: "Tasa de comisión",
          fr: "Taux de commission",
          ja: "コミッション率",
        }
      },
      {
        key: "ui.benefits.commission_detail.total_paid",
        values: {
          en: "Total Paid",
          de: "Insgesamt bezahlt",
          pl: "Łącznie wypłacono",
          es: "Total pagado",
          fr: "Total payé",
          ja: "支払総額",
        }
      },
      {
        key: "ui.benefits.commission_detail.pending_payouts",
        values: {
          en: "Pending Payouts",
          de: "Ausstehende Auszahlungen",
          pl: "Oczekujące wypłaty",
          es: "Pagos pendientes",
          fr: "Paiements en attente",
          ja: "保留中の支払い",
        }
      },
      {
        key: "ui.benefits.commission_detail.submit_referral",
        values: {
          en: "Submit Referral",
          de: "Empfehlung einreichen",
          pl: "Prześlij polecenie",
          es: "Enviar referencia",
          fr: "Soumettre un parrainage",
          ja: "紹介を送信",
        }
      },
      {
        key: "ui.benefits.commission_detail.referral_details",
        values: {
          en: "Referral Details",
          de: "Empfehlungsdetails",
          pl: "Szczegóły polecenia",
          es: "Detalles de la referencia",
          fr: "Détails du parrainage",
          ja: "紹介の詳細",
        }
      },
      {
        key: "ui.benefits.commission_detail.referral_value",
        values: {
          en: "Referral Value",
          de: "Empfehlungswert",
          pl: "Wartość polecenia",
          es: "Valor de la referencia",
          fr: "Valeur du parrainage",
          ja: "紹介価値",
        }
      },

      // ============================================================================
      // MY CLAIMS TAB
      // ============================================================================
      {
        key: "ui.benefits.my_claims.title",
        values: {
          en: "My Benefit Claims",
          de: "Meine Vorteilsansprüche",
          pl: "Moje roszczenia korzyści",
          es: "Mis reclamaciones de beneficios",
          fr: "Mes demandes d'avantages",
          ja: "マイ特典申請",
        }
      },
      {
        key: "ui.benefits.my_claims.no_claims",
        values: {
          en: "You haven't claimed any benefits yet",
          de: "Sie haben noch keine Vorteile beansprucht",
          pl: "Nie skorzystałeś jeszcze z żadnych korzyści",
          es: "Aún no has reclamado ningún beneficio",
          fr: "Vous n'avez pas encore réclamé d'avantages",
          ja: "まだ特典を申請していません",
        }
      },
      {
        key: "ui.benefits.my_claims.no_claims_hint",
        values: {
          en: "Browse benefits and claim ones that interest you!",
          de: "Durchsuchen Sie Vorteile und beanspruchen Sie interessante!",
          pl: "Przeglądaj korzyści i korzystaj z tych, które Cię interesują!",
          es: "¡Explora los beneficios y reclama los que te interesen!",
          fr: "Parcourez les avantages et réclamez ceux qui vous intéressent!",
          ja: "特典を閲覧して、興味のあるものを申請しましょう！",
        }
      },
      {
        key: "ui.benefits.my_claims.loading",
        values: {
          en: "Loading your claims...",
          de: "Ihre Ansprüche werden geladen...",
          pl: "Ładowanie Twoich roszczeń...",
          es: "Cargando tus reclamaciones...",
          fr: "Chargement de vos demandes...",
          ja: "申請を読み込み中...",
        }
      },
      {
        key: "ui.benefits.my_claims.please_login",
        values: {
          en: "Please log in to view your claims",
          de: "Bitte melden Sie sich an, um Ihre Ansprüche anzuzeigen",
          pl: "Zaloguj się, aby zobaczyć swoje roszczenia",
          es: "Por favor inicia sesión para ver tus reclamaciones",
          fr: "Veuillez vous connecter pour voir vos demandes",
          ja: "申請を表示するにはログインしてください",
        }
      },

      // ============================================================================
      // MY EARNINGS TAB
      // ============================================================================
      {
        key: "ui.benefits.my_earnings.title",
        values: {
          en: "My Commission Earnings",
          de: "Meine Provisionseinnahmen",
          pl: "Moje zarobki z prowizji",
          es: "Mis ganancias de comisiones",
          fr: "Mes gains de commissions",
          ja: "マイコミッション収益",
        }
      },
      {
        key: "ui.benefits.my_earnings.pending",
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
        key: "ui.benefits.my_earnings.paid",
        values: {
          en: "Paid",
          de: "Bezahlt",
          pl: "Wypłacone",
          es: "Pagado",
          fr: "Payé",
          ja: "支払い済み",
        }
      },
      {
        key: "ui.benefits.my_earnings.total_earned",
        values: {
          en: "Total Earned",
          de: "Insgesamt verdient",
          pl: "Łącznie zarobiono",
          es: "Total ganado",
          fr: "Total gagné",
          ja: "獲得総額",
        }
      },
      {
        key: "ui.benefits.my_earnings.no_earnings",
        values: {
          en: "You haven't earned any commissions yet",
          de: "Sie haben noch keine Provisionen verdient",
          pl: "Nie zarobiłeś jeszcze żadnych prowizji",
          es: "Aún no has ganado ninguna comisión",
          fr: "Vous n'avez pas encore gagné de commissions",
          ja: "まだコミッションを獲得していません",
        }
      },
      {
        key: "ui.benefits.my_earnings.no_earnings_hint",
        values: {
          en: "Submit referrals to earn commissions!",
          de: "Reichen Sie Empfehlungen ein, um Provisionen zu verdienen!",
          pl: "Prześlij polecenia, aby zarabiać prowizje!",
          es: "¡Envía referencias para ganar comisiones!",
          fr: "Soumettez des parrainages pour gagner des commissions!",
          ja: "紹介を送信してコミッションを獲得しましょう！",
        }
      },
      {
        key: "ui.benefits.my_earnings.loading",
        values: {
          en: "Loading your earnings...",
          de: "Ihre Einnahmen werden geladen...",
          pl: "Ładowanie Twoich zarobków...",
          es: "Cargando tus ganancias...",
          fr: "Chargement de vos gains...",
          ja: "収益を読み込み中...",
        }
      },
      {
        key: "ui.benefits.my_earnings.please_login",
        values: {
          en: "Please log in to view your earnings",
          de: "Bitte melden Sie sich an, um Ihre Einnahmen anzuzeigen",
          pl: "Zaloguj się, aby zobaczyć swoje zarobki",
          es: "Por favor inicia sesión para ver tus ganancias",
          fr: "Veuillez vous connecter pour voir vos gains",
          ja: "収益を表示するにはログインしてください",
        }
      },

      // ============================================================================
      // CLAIM STATUS
      // ============================================================================
      {
        key: "ui.benefits.claim_status.pending",
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
        key: "ui.benefits.claim_status.approved",
        values: {
          en: "Approved",
          de: "Genehmigt",
          pl: "Zatwierdzony",
          es: "Aprobado",
          fr: "Approuvé",
          ja: "承認済み",
        }
      },
      {
        key: "ui.benefits.claim_status.rejected",
        values: {
          en: "Rejected",
          de: "Abgelehnt",
          pl: "Odrzucony",
          es: "Rechazado",
          fr: "Rejeté",
          ja: "却下",
        }
      },
      {
        key: "ui.benefits.claim_status.redeemed",
        values: {
          en: "Redeemed",
          de: "Eingelöst",
          pl: "Zrealizowany",
          es: "Canjeado",
          fr: "Utilisé",
          ja: "利用済み",
        }
      },
      {
        key: "ui.benefits.claim_status.expired",
        values: {
          en: "Expired",
          de: "Abgelaufen",
          pl: "Wygasły",
          es: "Expirado",
          fr: "Expiré",
          ja: "期限切れ",
        }
      },

      // ============================================================================
      // PAYOUT STATUS
      // ============================================================================
      {
        key: "ui.benefits.payout_status.pending_verification",
        values: {
          en: "Pending Verification",
          de: "Überprüfung ausstehend",
          pl: "Oczekuje na weryfikację",
          es: "Verificación pendiente",
          fr: "Vérification en attente",
          ja: "確認待ち",
        }
      },
      {
        key: "ui.benefits.payout_status.verified",
        values: {
          en: "Verified",
          de: "Verifiziert",
          pl: "Zweryfikowany",
          es: "Verificado",
          fr: "Vérifié",
          ja: "確認済み",
        }
      },
      {
        key: "ui.benefits.payout_status.processing",
        values: {
          en: "Processing",
          de: "In Bearbeitung",
          pl: "Przetwarzanie",
          es: "Procesando",
          fr: "En cours",
          ja: "処理中",
        }
      },
      {
        key: "ui.benefits.payout_status.paid",
        values: {
          en: "Paid",
          de: "Bezahlt",
          pl: "Wypłacone",
          es: "Pagado",
          fr: "Payé",
          ja: "支払い済み",
        }
      },
      {
        key: "ui.benefits.payout_status.disputed",
        values: {
          en: "Disputed",
          de: "Angefochten",
          pl: "Sporne",
          es: "Disputado",
          fr: "Contesté",
          ja: "係争中",
        }
      },
      {
        key: "ui.benefits.payout_status.cancelled",
        values: {
          en: "Cancelled",
          de: "Storniert",
          pl: "Anulowane",
          es: "Cancelado",
          fr: "Annulé",
          ja: "キャンセル",
        }
      },

      // ============================================================================
      // BENEFIT FORM MODAL
      // ============================================================================
      {
        key: "ui.benefits.form.create_benefit",
        values: {
          en: "Create Benefit",
          de: "Vorteil erstellen",
          pl: "Utwórz korzyść",
          es: "Crear beneficio",
          fr: "Créer un avantage",
          ja: "特典を作成",
        }
      },
      {
        key: "ui.benefits.form.edit_benefit",
        values: {
          en: "Edit Benefit",
          de: "Vorteil bearbeiten",
          pl: "Edytuj korzyść",
          es: "Editar beneficio",
          fr: "Modifier l'avantage",
          ja: "特典を編集",
        }
      },
      {
        key: "ui.benefits.form.name",
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
        key: "ui.benefits.form.description",
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
        key: "ui.benefits.form.type",
        values: {
          en: "Type",
          de: "Typ",
          pl: "Typ",
          es: "Tipo",
          fr: "Type",
          ja: "タイプ",
        }
      },
      {
        key: "ui.benefits.form.category",
        values: {
          en: "Category",
          de: "Kategorie",
          pl: "Kategoria",
          es: "Categoría",
          fr: "Catégorie",
          ja: "カテゴリ",
        }
      },
      {
        key: "ui.benefits.form.discount_value",
        values: {
          en: "Discount Value (%)",
          de: "Rabattwert (%)",
          pl: "Wartość zniżki (%)",
          es: "Valor del descuento (%)",
          fr: "Valeur de la réduction (%)",
          ja: "割引率 (%)",
        }
      },
      {
        key: "ui.benefits.form.valid_from",
        values: {
          en: "Valid From",
          de: "Gültig ab",
          pl: "Ważne od",
          es: "Válido desde",
          fr: "Valable à partir de",
          ja: "有効開始日",
        }
      },
      {
        key: "ui.benefits.form.valid_until",
        values: {
          en: "Valid Until",
          de: "Gültig bis",
          pl: "Ważne do",
          es: "Válido hasta",
          fr: "Valable jusqu'au",
          ja: "有効期限",
        }
      },
      {
        key: "ui.benefits.form.max_claims",
        values: {
          en: "Max Total Claims",
          de: "Maximale Gesamtansprüche",
          pl: "Maksymalna liczba roszczeń",
          es: "Máximo de reclamaciones totales",
          fr: "Nombre maximum de demandes",
          ja: "最大申請数",
        }
      },
      {
        key: "ui.benefits.form.max_claims_per_member",
        values: {
          en: "Max Claims Per Member",
          de: "Max. Ansprüche pro Mitglied",
          pl: "Max. roszczeń na członka",
          es: "Máx. reclamaciones por miembro",
          fr: "Max. demandes par membre",
          ja: "メンバーあたりの最大申請数",
        }
      },
      {
        key: "ui.benefits.form.requirements",
        values: {
          en: "Requirements",
          de: "Anforderungen",
          pl: "Wymagania",
          es: "Requisitos",
          fr: "Conditions",
          ja: "要件",
        }
      },
      {
        key: "ui.benefits.form.contact_email",
        values: {
          en: "Contact Email",
          de: "Kontakt-E-Mail",
          pl: "E-mail kontaktowy",
          es: "Correo de contacto",
          fr: "Email de contact",
          ja: "連絡先メール",
        }
      },
      {
        key: "ui.benefits.form.contact_phone",
        values: {
          en: "Contact Phone",
          de: "Kontakttelefon",
          pl: "Telefon kontaktowy",
          es: "Teléfono de contacto",
          fr: "Téléphone de contact",
          ja: "連絡先電話番号",
        }
      },
      {
        key: "ui.benefits.form.save",
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
        key: "ui.benefits.form.cancel",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        }
      },

      // ============================================================================
      // COMMISSION FORM MODAL
      // ============================================================================
      {
        key: "ui.benefits.commission_form.create",
        values: {
          en: "Create Commission",
          de: "Provision erstellen",
          pl: "Utwórz prowizję",
          es: "Crear comisión",
          fr: "Créer une commission",
          ja: "コミッションを作成",
        }
      },
      {
        key: "ui.benefits.commission_form.edit",
        values: {
          en: "Edit Commission",
          de: "Provision bearbeiten",
          pl: "Edytuj prowizję",
          es: "Editar comisión",
          fr: "Modifier la commission",
          ja: "コミッションを編集",
        }
      },
      {
        key: "ui.benefits.commission_form.commission_type",
        values: {
          en: "Commission Type",
          de: "Provisionsart",
          pl: "Typ prowizji",
          es: "Tipo de comisión",
          fr: "Type de commission",
          ja: "コミッションタイプ",
        }
      },
      {
        key: "ui.benefits.commission_form.percentage",
        values: {
          en: "Percentage",
          de: "Prozentsatz",
          pl: "Procent",
          es: "Porcentaje",
          fr: "Pourcentage",
          ja: "パーセント",
        }
      },
      {
        key: "ui.benefits.commission_form.fixed",
        values: {
          en: "Fixed Amount",
          de: "Festbetrag",
          pl: "Stała kwota",
          es: "Cantidad fija",
          fr: "Montant fixe",
          ja: "固定金額",
        }
      },
      {
        key: "ui.benefits.commission_form.commission_value",
        values: {
          en: "Commission Value",
          de: "Provisionswert",
          pl: "Wartość prowizji",
          es: "Valor de la comisión",
          fr: "Valeur de la commission",
          ja: "コミッション額",
        }
      },
      {
        key: "ui.benefits.commission_form.currency",
        values: {
          en: "Currency",
          de: "Währung",
          pl: "Waluta",
          es: "Moneda",
          fr: "Devise",
          ja: "通貨",
        }
      },
      {
        key: "ui.benefits.commission_form.target_description",
        values: {
          en: "Target Description",
          de: "Zielbeschreibung",
          pl: "Opis celu",
          es: "Descripción del objetivo",
          fr: "Description de l'objectif",
          ja: "目標の説明",
        }
      },

      // ============================================================================
      // OBJECT STATUS
      // ============================================================================
      {
        key: "ui.benefits.status.draft",
        values: {
          en: "Draft",
          de: "Entwurf",
          pl: "Wersja robocza",
          es: "Borrador",
          fr: "Brouillon",
          ja: "下書き",
        }
      },
      {
        key: "ui.benefits.status.active",
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
        key: "ui.benefits.status.paused",
        values: {
          en: "Paused",
          de: "Pausiert",
          pl: "Wstrzymany",
          es: "Pausado",
          fr: "En pause",
          ja: "一時停止",
        }
      },
      {
        key: "ui.benefits.status.expired",
        values: {
          en: "Expired",
          de: "Abgelaufen",
          pl: "Wygasły",
          es: "Expirado",
          fr: "Expiré",
          ja: "期限切れ",
        }
      },
      {
        key: "ui.benefits.status.archived",
        values: {
          en: "Archived",
          de: "Archiviert",
          pl: "Zarchiwizowany",
          es: "Archivado",
          fr: "Archivé",
          ja: "アーカイブ済み",
        }
      },

      // ============================================================================
      // ACTIONS & MESSAGES
      // ============================================================================
      {
        key: "ui.benefits.action.claim_submitted",
        values: {
          en: "Claim submitted successfully!",
          de: "Anspruch erfolgreich eingereicht!",
          pl: "Roszczenie przesłane pomyślnie!",
          es: "¡Reclamación enviada con éxito!",
          fr: "Demande soumise avec succès!",
          ja: "申請が送信されました！",
        }
      },
      {
        key: "ui.benefits.action.referral_submitted",
        values: {
          en: "Referral submitted successfully!",
          de: "Empfehlung erfolgreich eingereicht!",
          pl: "Polecenie przesłane pomyślnie!",
          es: "¡Referencia enviada con éxito!",
          fr: "Parrainage soumis avec succès!",
          ja: "紹介が送信されました！",
        }
      },
      {
        key: "ui.benefits.action.benefit_created",
        values: {
          en: "Benefit created successfully!",
          de: "Vorteil erfolgreich erstellt!",
          pl: "Korzyść utworzona pomyślnie!",
          es: "¡Beneficio creado con éxito!",
          fr: "Avantage créé avec succès!",
          ja: "特典が作成されました！",
        }
      },
      {
        key: "ui.benefits.action.commission_created",
        values: {
          en: "Commission created successfully!",
          de: "Provision erfolgreich erstellt!",
          pl: "Prowizja utworzona pomyślnie!",
          es: "¡Comisión creada con éxito!",
          fr: "Commission créée avec succès!",
          ja: "コミッションが作成されました！",
        }
      },
      {
        key: "ui.benefits.error.already_claimed",
        values: {
          en: "You have already claimed this benefit",
          de: "Sie haben diesen Vorteil bereits beansprucht",
          pl: "Już skorzystałeś z tej korzyści",
          es: "Ya has reclamado este beneficio",
          fr: "Vous avez déjà réclamé cet avantage",
          ja: "この特典はすでに申請済みです",
        }
      },
      {
        key: "ui.benefits.error.claim_limit_reached",
        values: {
          en: "Maximum claim limit reached",
          de: "Maximale Anspruchsgrenze erreicht",
          pl: "Osiągnięto maksymalny limit roszczeń",
          es: "Se alcanzó el límite máximo de reclamaciones",
          fr: "Limite maximale de demandes atteinte",
          ja: "申請上限に達しました",
        }
      },
      {
        key: "ui.benefits.error.benefit_expired",
        values: {
          en: "This benefit has expired",
          de: "Dieser Vorteil ist abgelaufen",
          pl: "Ta korzyść wygasła",
          es: "Este beneficio ha expirado",
          fr: "Cet avantage a expiré",
          ja: "この特典は期限切れです",
        }
      },
    ];

    // Get existing keys set (empty - checking is done individually now)
    const existingKeys = await getExistingTranslationKeys(ctx.db, systemOrg._id, []);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];
        if (!value) continue;

        const wasInserted = await insertTranslationIfNew(
          ctx.db,
          existingKeys,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "benefits"
        );

        if (wasInserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`✅ Benefits Window translations seeded: ${insertedCount} inserted, ${skippedCount} skipped`);
    return { insertedCount, skippedCount };
  },
});
