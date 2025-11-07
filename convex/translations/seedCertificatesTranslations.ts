/**
 * SEED CERTIFICATES WINDOW TRANSLATIONS
 *
 * Seeds translations for the Certificates app
 * Run: npx convex run translations/seedCertificatesTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Certificates translations...");

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

    const translations = [
      // === MAIN WINDOW ===
      {
        key: "ui.certificates.title",
        values: {
          en: "Professional Certificates",
          de: "Professionelle Zertifikate",
          pl: "Certyfikaty Profesjonalne",
          es: "Certificados Profesionales",
          fr: "Certificats Professionnels",
          ja: "専門資格証明書",
        },
      },
      {
        key: "ui.certificates.description",
        values: {
          en: "Issue and manage CME, CLE, CPE, and other continuing education certificates",
          de: "CME-, CLE-, CPE- und andere Weiterbildungszertifikate ausstellen und verwalten",
          pl: "Wystawiaj i zarządzaj certyfikatami CME, CLE, CPE i innymi certyfikatami kształcenia ustawicznego",
          es: "Emitir y gestionar certificados CME, CLE, CPE y otros de educación continua",
          fr: "Émettre et gérer les certificats CME, CLE, CPE et autres certificats de formation continue",
          ja: "CME、CLE、CPE、その他の継続教育証明書を発行・管理",
        },
      },
      {
        key: "ui.certificates.loading",
        values: {
          en: "Loading certificates...",
          de: "Zertifikate werden geladen...",
          pl: "Ładowanie certyfikatów...",
          es: "Cargando certificados...",
          fr: "Chargement des certificats...",
          ja: "証明書を読み込んでいます...",
        },
      },
      {
        key: "ui.certificates.login_required",
        values: {
          en: "Please log in to access certificates",
          de: "Bitte melden Sie sich an, um auf Zertifikate zuzugreifen",
          pl: "Zaloguj się, aby uzyskać dostęp do certyfikatów",
          es: "Por favor, inicia sesión para acceder a los certificados",
          fr: "Veuillez vous connecter pour accéder aux certificats",
          ja: "証明書にアクセスするにはログインしてください",
        },
      },
      {
        key: "ui.certificates.no_organization_title",
        values: {
          en: "No Organization Selected",
          de: "Keine Organisation ausgewählt",
          pl: "Nie wybrano organizacji",
          es: "No se seleccionó ninguna organización",
          fr: "Aucune organisation sélectionnée",
          ja: "組織が選択されていません",
        },
      },
      {
        key: "ui.certificates.no_organization_description",
        values: {
          en: "Please select an organization to manage certificates",
          de: "Bitte wählen Sie eine Organisation aus, um Zertifikate zu verwalten",
          pl: "Wybierz organizację, aby zarządzać certyfikatami",
          es: "Por favor, selecciona una organización para gestionar certificados",
          fr: "Veuillez sélectionner une organisation pour gérer les certificats",
          ja: "証明書を管理するには組織を選択してください",
        },
      },
      {
        key: "ui.certificates.button.issue_certificate",
        values: {
          en: "Issue Certificate",
          de: "Zertifikat ausstellen",
          pl: "Wydaj certyfikat",
          es: "Emitir certificado",
          fr: "Émettre un certificat",
          ja: "証明書を発行",
        },
      },
      {
        key: "ui.certificates.button.back_to_list",
        values: {
          en: "Back to List",
          de: "Zurück zur Liste",
          pl: "Powrót do listy",
          es: "Volver a la lista",
          fr: "Retour à la liste",
          ja: "リストに戻る",
        },
      },

      // === CERTIFICATES LIST ===
      {
        key: "ui.certificates.list.search_placeholder",
        values: {
          en: "Search by name, email, or certificate number...",
          de: "Suche nach Name, E-Mail oder Zertifikatsnummer...",
          pl: "Szukaj według nazwy, e-mail lub numeru certyfikatu...",
          es: "Buscar por nombre, correo o número de certificado...",
          fr: "Rechercher par nom, email ou numéro de certificat...",
          ja: "名前、メール、証明書番号で検索...",
        },
      },
      {
        key: "ui.certificates.list.filter.all_statuses",
        values: {
          en: "All Statuses",
          de: "Alle Status",
          pl: "Wszystkie statusy",
          es: "Todos los estados",
          fr: "Tous les statuts",
          ja: "すべてのステータス",
        },
      },
      {
        key: "ui.certificates.list.filter.all_types",
        values: {
          en: "All Types",
          de: "Alle Typen",
          pl: "Wszystkie typy",
          es: "Todos los tipos",
          fr: "Tous les types",
          ja: "すべてのタイプ",
        },
      },
      {
        key: "ui.certificates.list.no_certificates_found",
        values: {
          en: "No certificates found",
          de: "Keine Zertifikate gefunden",
          pl: "Nie znaleziono certyfikatów",
          es: "No se encontraron certificados",
          fr: "Aucun certificat trouvé",
          ja: "証明書が見つかりません",
        },
      },
      {
        key: "ui.certificates.list.adjust_filters",
        values: {
          en: "Try adjusting your search or filters",
          de: "Versuchen Sie, Ihre Suche oder Filter anzupassen",
          pl: "Spróbuj dostosować wyszukiwanie lub filtry",
          es: "Intenta ajustar tu búsqueda o filtros",
          fr: "Essayez d'ajuster votre recherche ou vos filtres",
          ja: "検索またはフィルターを調整してください",
        },
      },
      {
        key: "ui.certificates.list.issue_first",
        values: {
          en: "Issue your first certificate to get started",
          de: "Stellen Sie Ihr erstes Zertifikat aus, um zu beginnen",
          pl: "Wydaj swój pierwszy certyfikat, aby rozpocząć",
          es: "Emite tu primer certificado para comenzar",
          fr: "Émettez votre premier certificat pour commencer",
          ja: "最初の証明書を発行して開始してください",
        },
      },
      {
        key: "ui.certificates.list.table.certificate_number",
        values: {
          en: "Certificate #",
          de: "Zertifikat-Nr.",
          pl: "Certyfikat nr",
          es: "Certificado nº",
          fr: "Certificat nº",
          ja: "証明書番号",
        },
      },
      {
        key: "ui.certificates.list.table.recipient",
        values: {
          en: "Recipient",
          de: "Empfänger",
          pl: "Odbiorca",
          es: "Destinatario",
          fr: "Destinataire",
          ja: "受取人",
        },
      },
      {
        key: "ui.certificates.list.table.type",
        values: {
          en: "Type",
          de: "Typ",
          pl: "Typ",
          es: "Tipo",
          fr: "Type",
          ja: "タイプ",
        },
      },
      {
        key: "ui.certificates.list.table.points",
        values: {
          en: "Points",
          de: "Punkte",
          pl: "Punkty",
          es: "Puntos",
          fr: "Points",
          ja: "ポイント",
        },
      },
      {
        key: "ui.certificates.list.table.issued",
        values: {
          en: "Issued",
          de: "Ausgestellt",
          pl: "Wydany",
          es: "Emitido",
          fr: "Émis",
          ja: "発行日",
        },
      },
      {
        key: "ui.certificates.list.table.status",
        values: {
          en: "Status",
          de: "Status",
          pl: "Status",
          es: "Estado",
          fr: "Statut",
          ja: "ステータス",
        },
      },
      {
        key: "ui.certificates.list.table.actions",
        values: {
          en: "Actions",
          de: "Aktionen",
          pl: "Akcje",
          es: "Acciones",
          fr: "Actions",
          ja: "アクション",
        },
      },
      {
        key: "ui.certificates.list.button.view",
        values: {
          en: "View",
          de: "Anzeigen",
          pl: "Wyświetl",
          es: "Ver",
          fr: "Voir",
          ja: "表示",
        },
      },
      {
        key: "ui.certificates.list.na",
        values: {
          en: "N/A",
          de: "N/V",
          pl: "Nd.",
          es: "N/D",
          fr: "N/D",
          ja: "該当なし",
        },
      },

      // === CERTIFICATE TYPES ===
      {
        key: "ui.certificates.type.cme",
        values: {
          en: "CME",
          de: "CME",
          pl: "CME",
          es: "CME",
          fr: "CME",
          ja: "CME",
        },
      },
      {
        key: "ui.certificates.type.cle",
        values: {
          en: "CLE",
          de: "CLE",
          pl: "CLE",
          es: "CLE",
          fr: "CLE",
          ja: "CLE",
        },
      },
      {
        key: "ui.certificates.type.cpe",
        values: {
          en: "CPE",
          de: "CPE",
          pl: "CPE",
          es: "CPE",
          fr: "CPE",
          ja: "CPE",
        },
      },
      {
        key: "ui.certificates.type.ce",
        values: {
          en: "CE",
          de: "CE",
          pl: "CE",
          es: "CE",
          fr: "CE",
          ja: "CE",
        },
      },
      {
        key: "ui.certificates.type.pdu",
        values: {
          en: "PDU",
          de: "PDU",
          pl: "PDU",
          es: "PDU",
          fr: "PDU",
          ja: "PDU",
        },
      },

      // === CERTIFICATE STATUS ===
      {
        key: "ui.certificates.status.issued",
        values: {
          en: "ISSUED",
          de: "AUSGESTELLT",
          pl: "WYDANY",
          es: "EMITIDO",
          fr: "ÉMIS",
          ja: "発行済み",
        },
      },
      {
        key: "ui.certificates.status.revoked",
        values: {
          en: "REVOKED",
          de: "WIDERRUFEN",
          pl: "UNIEWAŻNIONY",
          es: "REVOCADO",
          fr: "RÉVOQUÉ",
          ja: "取り消し",
        },
      },
      {
        key: "ui.certificates.status.expired",
        values: {
          en: "EXPIRED",
          de: "ABGELAUFEN",
          pl: "WYGASŁY",
          es: "EXPIRADO",
          fr: "EXPIRÉ",
          ja: "期限切れ",
        },
      },

      // === CERTIFICATE FORM ===
      {
        key: "ui.certificates.form.title.edit",
        values: {
          en: "Edit Certificate",
          de: "Zertifikat bearbeiten",
          pl: "Edytuj certyfikat",
          es: "Editar certificado",
          fr: "Modifier le certificat",
          ja: "証明書を編集",
        },
      },
      {
        key: "ui.certificates.form.title.new",
        values: {
          en: "Issue New Certificate",
          de: "Neues Zertifikat ausstellen",
          pl: "Wydaj nowy certyfikat",
          es: "Emitir nuevo certificado",
          fr: "Émettre un nouveau certificat",
          ja: "新しい証明書を発行",
        },
      },
      {
        key: "ui.certificates.form.note_title",
        values: {
          en: "Note:",
          de: "Hinweis:",
          pl: "Uwaga:",
          es: "Nota:",
          fr: "Remarque:",
          ja: "注意:",
        },
      },
      {
        key: "ui.certificates.form.note_description",
        values: {
          en: "This is a simplified form for manual certificate issuance. In production, certificates are usually auto-issued when attendees check in to events. You'll need to select an existing transaction and event from your system.",
          de: "Dies ist ein vereinfachtes Formular für die manuelle Zertifikatsausstellung. In der Produktion werden Zertifikate normalerweise automatisch ausgestellt, wenn Teilnehmer bei Veranstaltungen einchecken. Sie müssen eine vorhandene Transaktion und Veranstaltung aus Ihrem System auswählen.",
          pl: "To uproszczony formularz do ręcznego wystawiania certyfikatów. W produkcji certyfikaty są zwykle automatycznie wystawiane, gdy uczestnicy meldują się na wydarzeniach. Musisz wybrać istniejącą transakcję i wydarzenie z systemu.",
          es: "Este es un formulario simplificado para la emisión manual de certificados. En producción, los certificados generalmente se emiten automáticamente cuando los asistentes se registran en los eventos. Deberás seleccionar una transacción y evento existentes de tu sistema.",
          fr: "Ceci est un formulaire simplifié pour l'émission manuelle de certificats. En production, les certificats sont généralement émis automatiquement lorsque les participants s'enregistrent aux événements. Vous devrez sélectionner une transaction et un événement existants de votre système.",
          ja: "これは手動証明書発行用の簡易フォームです。本番環境では、通常、参加者がイベントにチェックインすると証明書が自動発行されます。システムから既存の取引とイベントを選択する必要があります。",
        },
      },
      {
        key: "ui.certificates.form.section.certificate_type",
        values: {
          en: "Certificate Type",
          de: "Zertifikatstyp",
          pl: "Typ certyfikatu",
          es: "Tipo de certificado",
          fr: "Type de certificat",
          ja: "証明書タイプ",
        },
      },
      {
        key: "ui.certificates.form.field.point_type",
        values: {
          en: "Point Type",
          de: "Punkttyp",
          pl: "Typ punktów",
          es: "Tipo de puntos",
          fr: "Type de points",
          ja: "ポイントタイプ",
        },
      },
      {
        key: "ui.certificates.form.field.points_awarded",
        values: {
          en: "Points Awarded",
          de: "Vergebene Punkte",
          pl: "Przyznane punkty",
          es: "Puntos otorgados",
          fr: "Points attribués",
          ja: "付与ポイント",
        },
      },
      {
        key: "ui.certificates.form.field.category",
        values: {
          en: "Category",
          de: "Kategorie",
          pl: "Kategoria",
          es: "Categoría",
          fr: "Catégorie",
          ja: "カテゴリー",
        },
      },
      {
        key: "ui.certificates.form.field.category_placeholder",
        values: {
          en: "e.g., AMA PRA Category 1",
          de: "z.B. AMA PRA Kategorie 1",
          pl: "np. AMA PRA Kategoria 1",
          es: "ej., AMA PRA Categoría 1",
          fr: "ex., AMA PRA Catégorie 1",
          ja: "例: AMA PRAカテゴリー1",
        },
      },
      {
        key: "ui.certificates.form.field.unit",
        values: {
          en: "Unit",
          de: "Einheit",
          pl: "Jednostka",
          es: "Unidad",
          fr: "Unité",
          ja: "単位",
        },
      },
      {
        key: "ui.certificates.form.section.recipient_info",
        values: {
          en: "Recipient Information",
          de: "Empfängerinformationen",
          pl: "Informacje o odbiorcy",
          es: "Información del destinatario",
          fr: "Informations sur le destinataire",
          ja: "受取人情報",
        },
      },
      {
        key: "ui.certificates.form.field.full_name",
        values: {
          en: "Full Name",
          de: "Vollständiger Name",
          pl: "Imię i nazwisko",
          es: "Nombre completo",
          fr: "Nom complet",
          ja: "氏名",
        },
      },
      {
        key: "ui.certificates.form.field.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo electrónico",
          fr: "Email",
          ja: "メールアドレス",
        },
      },
      {
        key: "ui.certificates.form.field.license_number",
        values: {
          en: "License Number",
          de: "Lizenznummer",
          pl: "Numer licencji",
          es: "Número de licencia",
          fr: "Numéro de licence",
          ja: "ライセンス番号",
        },
      },
      {
        key: "ui.certificates.form.field.profession",
        values: {
          en: "Profession",
          de: "Beruf",
          pl: "Zawód",
          es: "Profesión",
          fr: "Profession",
          ja: "職業",
        },
      },
      {
        key: "ui.certificates.form.field.profession_placeholder",
        values: {
          en: "e.g., Physician, Attorney",
          de: "z.B. Arzt, Rechtsanwalt",
          pl: "np. Lekarz, Prawnik",
          es: "ej., Médico, Abogado",
          fr: "ex., Médecin, Avocat",
          ja: "例: 医師、弁護士",
        },
      },
      {
        key: "ui.certificates.form.section.event_info",
        values: {
          en: "Event Information",
          de: "Veranstaltungsinformationen",
          pl: "Informacje o wydarzeniu",
          es: "Información del evento",
          fr: "Informations sur l'événement",
          ja: "イベント情報",
        },
      },
      {
        key: "ui.certificates.form.field.event_name",
        values: {
          en: "Event Name",
          de: "Veranstaltungsname",
          pl: "Nazwa wydarzenia",
          es: "Nombre del evento",
          fr: "Nom de l'événement",
          ja: "イベント名",
        },
      },
      {
        key: "ui.certificates.form.field.event_date",
        values: {
          en: "Event Date",
          de: "Veranstaltungsdatum",
          pl: "Data wydarzenia",
          es: "Fecha del evento",
          fr: "Date de l'événement",
          ja: "イベント日",
        },
      },
      {
        key: "ui.certificates.form.button.cancel",
        values: {
          en: "Cancel",
          de: "Abbrechen",
          pl: "Anuluj",
          es: "Cancelar",
          fr: "Annuler",
          ja: "キャンセル",
        },
      },
      {
        key: "ui.certificates.form.button.issue",
        values: {
          en: "Issue Certificate",
          de: "Zertifikat ausstellen",
          pl: "Wydaj certyfikat",
          es: "Emitir certificado",
          fr: "Émettre un certificat",
          ja: "証明書を発行",
        },
      },
      {
        key: "ui.certificates.form.button.issuing",
        values: {
          en: "Issuing...",
          de: "Wird ausgestellt...",
          pl: "Wystawianie...",
          es: "Emitiendo...",
          fr: "Émission...",
          ja: "発行中...",
        },
      },

      // === CERTIFICATE DETAIL MODAL ===
      {
        key: "ui.certificates.detail.loading",
        values: {
          en: "Loading certificate details...",
          de: "Zertifikatsdetails werden geladen...",
          pl: "Ładowanie szczegółów certyfikatu...",
          es: "Cargando detalles del certificado...",
          fr: "Chargement des détails du certificat...",
          ja: "証明書の詳細を読み込んでいます...",
        },
      },
      {
        key: "ui.certificates.detail.title",
        values: {
          en: "Certificate Details",
          de: "Zertifikatsdetails",
          pl: "Szczegóły certyfikatu",
          es: "Detalles del certificado",
          fr: "Détails du certificat",
          ja: "証明書の詳細",
        },
      },
      {
        key: "ui.certificates.detail.certificate_number_label",
        values: {
          en: "CERTIFICATE NUMBER",
          de: "ZERTIFIKATSNUMMER",
          pl: "NUMER CERTYFIKATU",
          es: "NÚMERO DE CERTIFICADO",
          fr: "NUMÉRO DE CERTIFICAT",
          ja: "証明書番号",
        },
      },
      {
        key: "ui.certificates.detail.section.recipient",
        values: {
          en: "Recipient Information",
          de: "Empfängerinformationen",
          pl: "Informacje o odbiorcy",
          es: "Información del destinatario",
          fr: "Informations sur le destinataire",
          ja: "受取人情報",
        },
      },
      {
        key: "ui.certificates.detail.field.name",
        values: {
          en: "Name",
          de: "Name",
          pl: "Nazwa",
          es: "Nombre",
          fr: "Nom",
          ja: "名前",
        },
      },
      {
        key: "ui.certificates.detail.field.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo electrónico",
          fr: "Email",
          ja: "メール",
        },
      },
      {
        key: "ui.certificates.detail.field.license_number",
        values: {
          en: "License Number",
          de: "Lizenznummer",
          pl: "Numer licencji",
          es: "Número de licencia",
          fr: "Numéro de licence",
          ja: "ライセンス番号",
        },
      },
      {
        key: "ui.certificates.detail.field.profession",
        values: {
          en: "Profession",
          de: "Beruf",
          pl: "Zawód",
          es: "Profesión",
          fr: "Profession",
          ja: "職業",
        },
      },
      {
        key: "ui.certificates.detail.section.credits",
        values: {
          en: "Credits Information",
          de: "Kreditinformationen",
          pl: "Informacje o punktach",
          es: "Información de créditos",
          fr: "Informations sur les crédits",
          ja: "クレジット情報",
        },
      },
      {
        key: "ui.certificates.detail.field.points_awarded",
        values: {
          en: "Points Awarded",
          de: "Vergebene Punkte",
          pl: "Przyznane punkty",
          es: "Puntos otorgados",
          fr: "Points attribués",
          ja: "付与ポイント",
        },
      },
      {
        key: "ui.certificates.detail.field.category",
        values: {
          en: "Category",
          de: "Kategorie",
          pl: "Kategoria",
          es: "Categoría",
          fr: "Catégorie",
          ja: "カテゴリー",
        },
      },
      {
        key: "ui.certificates.detail.field.accrediting_body",
        values: {
          en: "Accrediting Body",
          de: "Akkreditierungsstelle",
          pl: "Organ akredytacyjny",
          es: "Organismo acreditador",
          fr: "Organisme d'accréditation",
          ja: "認定機関",
        },
      },
      {
        key: "ui.certificates.detail.section.event",
        values: {
          en: "Event Information",
          de: "Veranstaltungsinformationen",
          pl: "Informacje o wydarzeniu",
          es: "Información del evento",
          fr: "Informations sur l'événement",
          ja: "イベント情報",
        },
      },
      {
        key: "ui.certificates.detail.field.event_name",
        values: {
          en: "Event Name",
          de: "Veranstaltungsname",
          pl: "Nazwa wydarzenia",
          es: "Nombre del evento",
          fr: "Nom de l'événement",
          ja: "イベント名",
        },
      },
      {
        key: "ui.certificates.detail.field.event_date",
        values: {
          en: "Event Date",
          de: "Veranstaltungsdatum",
          pl: "Data wydarzenia",
          es: "Fecha del evento",
          fr: "Date de l'événement",
          ja: "イベント日",
        },
      },
      {
        key: "ui.certificates.detail.section.dates",
        values: {
          en: "Certificate Dates",
          de: "Zertifikatsdaten",
          pl: "Daty certyfikatu",
          es: "Fechas del certificado",
          fr: "Dates du certificat",
          ja: "証明書の日付",
        },
      },
      {
        key: "ui.certificates.detail.field.issued",
        values: {
          en: "Issued",
          de: "Ausgestellt",
          pl: "Wydany",
          es: "Emitido",
          fr: "Émis",
          ja: "発行日",
        },
      },
      {
        key: "ui.certificates.detail.field.expires",
        values: {
          en: "Expires",
          de: "Läuft ab",
          pl: "Wygasa",
          es: "Expira",
          fr: "Expire",
          ja: "有効期限",
        },
      },
      {
        key: "ui.certificates.detail.revoked_title",
        values: {
          en: "Certificate Revoked",
          de: "Zertifikat widerrufen",
          pl: "Certyfikat unieważniony",
          es: "Certificado revocado",
          fr: "Certificat révoqué",
          ja: "証明書が取り消されました",
        },
      },
      {
        key: "ui.certificates.detail.revoked_reason",
        values: {
          en: "Reason:",
          de: "Grund:",
          pl: "Powód:",
          es: "Razón:",
          fr: "Raison:",
          ja: "理由:",
        },
      },
      {
        key: "ui.certificates.detail.revoked_on",
        values: {
          en: "Revoked on:",
          de: "Widerrufen am:",
          pl: "Unieważniono:",
          es: "Revocado el:",
          fr: "Révoqué le:",
          ja: "取り消し日:",
        },
      },
      {
        key: "ui.certificates.detail.button.download_pdf",
        values: {
          en: "Download PDF",
          de: "PDF herunterladen",
          pl: "Pobierz PDF",
          es: "Descargar PDF",
          fr: "Télécharger PDF",
          ja: "PDFをダウンロード",
        },
      },
      {
        key: "ui.certificates.detail.button.close",
        values: {
          en: "Close",
          de: "Schließen",
          pl: "Zamknij",
          es: "Cerrar",
          fr: "Fermer",
          ja: "閉じる",
        },
      },

      // === CERTIFICATE TYPES (FULL NAMES) ===
      {
        key: "ui.certificates.type_full.cme",
        values: {
          en: "CME (Medical)",
          de: "CME (Medizin)",
          pl: "CME (Medyczny)",
          es: "CME (Médico)",
          fr: "CME (Médical)",
          ja: "CME（医療）",
        },
      },
      {
        key: "ui.certificates.type_full.cle",
        values: {
          en: "CLE (Legal)",
          de: "CLE (Recht)",
          pl: "CLE (Prawny)",
          es: "CLE (Legal)",
          fr: "CLE (Juridique)",
          ja: "CLE（法律）",
        },
      },
      {
        key: "ui.certificates.type_full.cpe",
        values: {
          en: "CPE (Accounting)",
          de: "CPE (Buchhaltung)",
          pl: "CPE (Księgowość)",
          es: "CPE (Contabilidad)",
          fr: "CPE (Comptabilité)",
          ja: "CPE（会計）",
        },
      },
      {
        key: "ui.certificates.type_full.ce",
        values: {
          en: "CE (Nursing)",
          de: "CE (Pflege)",
          pl: "CE (Pielęgniarstwo)",
          es: "CE (Enfermería)",
          fr: "CE (Soins infirmiers)",
          ja: "CE（看護）",
        },
      },
      {
        key: "ui.certificates.type_full.pdu",
        values: {
          en: "PDU (Project Management)",
          de: "PDU (Projektmanagement)",
          pl: "PDU (Zarządzanie projektami)",
          es: "PDU (Gestión de proyectos)",
          fr: "PDU (Gestion de projet)",
          ja: "PDU（プロジェクトマネジメント）",
        },
      },

      // === COMMON FIELDS ===
      {
        key: "ui.certificates.common.required_field",
        values: {
          en: "*",
          de: "*",
          pl: "*",
          es: "*",
          fr: "*",
          ja: "*",
        },
      },
      {
        key: "ui.certificates.common.credits",
        values: {
          en: "credits",
          de: "Kredite",
          pl: "punkty",
          es: "créditos",
          fr: "crédits",
          ja: "クレジット",
        },
      },
    ];

    console.log(`📝 Upserting ${translations.length} translation keys...`);

    // Upsert translations (insert new, update existing)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const trans of translations) {
      for (const [locale, value] of Object.entries(trans.values)) {
        if (typeof value === "string") {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale,
            "certificates",
            "certificates-window"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Certificates translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
