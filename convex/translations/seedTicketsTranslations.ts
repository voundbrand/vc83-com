/**
 * SEED TICKETS WINDOW TRANSLATIONS
 *
 * Seeds translations for the Tickets app
 * Run: npx convex run translations/seedTicketsTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Tickets translations...");

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
        key: "ui.tickets.title",
        values: {
          en: "Tickets",
          de: "Tickets",
          pl: "Bilety",
          es: "Entradas",
          fr: "Billets",
          ja: "チケット",
        },
      },
      {
        key: "ui.tickets.description",
        values: {
          en: "Issue and manage tickets for events - track redemptions and transfers",
          de: "Tickets für Veranstaltungen ausgeben und verwalten - Einlösungen und Übertragungen verfolgen",
          pl: "Wydawaj i zarządzaj biletami na wydarzenia - śledź realizacje i transfery",
          es: "Emitir y gestionar entradas para eventos - rastrear canjes y transferencias",
          fr: "Émettre et gérer les billets pour les événements - suivre les échanges et les transferts",
          ja: "イベントのチケットを発行・管理 - 引き換えと転送を追跡",
        },
      },
      {
        key: "ui.tickets.loading",
        values: {
          en: "Loading tickets...",
          de: "Tickets werden geladen...",
          pl: "Ładowanie biletów...",
          es: "Cargando entradas...",
          fr: "Chargement des billets...",
          ja: "チケットを読み込んでいます...",
        },
      },
      {
        key: "ui.tickets.login_required",
        values: {
          en: "Please log in to access tickets",
          de: "Bitte melden Sie sich an, um auf Tickets zuzugreifen",
          pl: "Zaloguj się, aby uzyskać dostęp do biletów",
          es: "Por favor, inicia sesión para acceder a las entradas",
          fr: "Veuillez vous connecter pour accéder aux billets",
          ja: "チケットにアクセスするにはログインしてください",
        },
      },
      {
        key: "ui.tickets.no_organization_title",
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
        key: "ui.tickets.no_organization_description",
        values: {
          en: "Please select an organization to manage tickets",
          de: "Bitte wählen Sie eine Organisation aus, um Tickets zu verwalten",
          pl: "Wybierz organizację, aby zarządzać biletami",
          es: "Por favor, selecciona una organización para gestionar entradas",
          fr: "Veuillez sélectionner une organisation pour gérer les billets",
          ja: "チケットを管理するには組織を選択してください",
        },
      },
      {
        key: "ui.tickets.button.issue_ticket",
        values: {
          en: "Issue Ticket",
          de: "Ticket ausgeben",
          pl: "Wydaj bilet",
          es: "Emitir entrada",
          fr: "Émettre un billet",
          ja: "チケットを発行",
        },
      },
      {
        key: "ui.tickets.button.back_to_list",
        values: {
          en: "Back to List",
          de: "Zurück zur Liste",
          pl: "Powrót do listy",
          es: "Volver a la lista",
          fr: "Retour à la liste",
          ja: "リストに戻る",
        },
      },

      // === TICKETS LIST ===
      {
        key: "ui.tickets.list.no_tickets_yet",
        values: {
          en: "No tickets yet. Click \"Issue Ticket\" to create one.",
          de: "Noch keine Tickets. Klicken Sie auf \"Ticket ausgeben\", um eines zu erstellen.",
          pl: "Brak biletów. Kliknij \"Wydaj bilet\", aby utworzyć.",
          es: "No hay entradas aún. Haz clic en \"Emitir entrada\" para crear una.",
          fr: "Aucun billet pour le moment. Cliquez sur \"Émettre un billet\" pour en créer un.",
          ja: "まだチケットがありません。「チケットを発行」をクリックして作成してください。",
        },
      },
      {
        key: "ui.tickets.list.filter.all_types",
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
        key: "ui.tickets.list.filter.all_statuses",
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
        key: "ui.tickets.list.sort.label",
        values: {
          en: "Sort:",
          de: "Sortieren:",
          pl: "Sortuj:",
          es: "Ordenar:",
          fr: "Trier:",
          ja: "並べ替え:",
        },
      },
      {
        key: "ui.tickets.list.sort.date",
        values: {
          en: "Date",
          de: "Datum",
          pl: "Data",
          es: "Fecha",
          fr: "Date",
          ja: "日付",
        },
      },
      {
        key: "ui.tickets.list.sort.name",
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
        key: "ui.tickets.list.sort.status",
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
        key: "ui.tickets.list.button.edit",
        values: {
          en: "Edit",
          de: "Bearbeiten",
          pl: "Edytuj",
          es: "Editar",
          fr: "Modifier",
          ja: "編集",
        },
      },
      {
        key: "ui.tickets.list.button.redeem",
        values: {
          en: "Redeem",
          de: "Einlösen",
          pl: "Zrealizuj",
          es: "Canjear",
          fr: "Échanger",
          ja: "引き換える",
        },
      },
      {
        key: "ui.tickets.list.purchased",
        values: {
          en: "Purchased:",
          de: "Gekauft:",
          pl: "Zakupiono:",
          es: "Comprado:",
          fr: "Acheté:",
          ja: "購入日:",
        },
      },
      {
        key: "ui.tickets.list.redeemed",
        values: {
          en: "Redeemed:",
          de: "Eingelöst:",
          pl: "Zrealizowano:",
          es: "Canjeado:",
          fr: "Échangé:",
          ja: "引き換え日:",
        },
      },
      {
        key: "ui.tickets.list.confirm_cancel",
        values: {
          en: "Are you sure you want to cancel this ticket?",
          de: "Möchten Sie dieses Ticket wirklich stornieren?",
          pl: "Czy na pewno chcesz anulować ten bilet?",
          es: "¿Estás seguro de que deseas cancelar esta entrada?",
          fr: "Êtes-vous sûr de vouloir annuler ce billet ?",
          ja: "このチケットをキャンセルしてもよろしいですか？",
        },
      },
      {
        key: "ui.tickets.list.confirm_redeem",
        values: {
          en: "Mark this ticket as redeemed (checked in)?",
          de: "Dieses Ticket als eingelöst (eingecheckt) markieren?",
          pl: "Oznaczyć ten bilet jako zrealizowany (zameldowany)?",
          es: "¿Marcar esta entrada como canjeada (registrada)?",
          fr: "Marquer ce billet comme échangé (enregistré) ?",
          ja: "このチケットを引き換え済み（チェックイン）としてマークしますか？",
        },
      },
      {
        key: "ui.tickets.list.error.cancel_failed",
        values: {
          en: "Failed to cancel ticket",
          de: "Ticket konnte nicht storniert werden",
          pl: "Nie udało się anulować biletu",
          es: "Error al cancelar la entrada",
          fr: "Échec de l'annulation du billet",
          ja: "チケットのキャンセルに失敗しました",
        },
      },
      {
        key: "ui.tickets.list.error.redeem_failed",
        values: {
          en: "Failed to redeem ticket",
          de: "Ticket konnte nicht eingelöst werden",
          pl: "Nie udało się zrealizować biletu",
          es: "Error al canjear la entrada",
          fr: "Échec de l'échange du billet",
          ja: "チケットの引き換えに失敗しました",
        },
      },

      // === TICKET STATUS ===
      {
        key: "ui.tickets.status.issued",
        values: {
          en: "Issued",
          de: "Ausgegeben",
          pl: "Wydany",
          es: "Emitido",
          fr: "Émis",
          ja: "発行済み",
        },
      },
      {
        key: "ui.tickets.status.redeemed",
        values: {
          en: "Redeemed",
          de: "Eingelöst",
          pl: "Zrealizowany",
          es: "Canjeado",
          fr: "Échangé",
          ja: "引き換え済み",
        },
      },
      {
        key: "ui.tickets.status.cancelled",
        values: {
          en: "Cancelled",
          de: "Storniert",
          pl: "Anulowany",
          es: "Cancelado",
          fr: "Annulé",
          ja: "キャンセル済み",
        },
      },
      {
        key: "ui.tickets.status.transferred",
        values: {
          en: "Transferred",
          de: "Übertragen",
          pl: "Przeniesiony",
          es: "Transferido",
          fr: "Transféré",
          ja: "譲渡済み",
        },
      },

      // === TICKET TYPES ===
      {
        key: "ui.tickets.type.standard",
        values: {
          en: "🎫 Standard",
          de: "🎫 Standard",
          pl: "🎫 Standardowy",
          es: "🎫 Estándar",
          fr: "🎫 Standard",
          ja: "🎫 スタンダード",
        },
      },
      {
        key: "ui.tickets.type.vip",
        values: {
          en: "⭐ VIP",
          de: "⭐ VIP",
          pl: "⭐ VIP",
          es: "⭐ VIP",
          fr: "⭐ VIP",
          ja: "⭐ VIP",
        },
      },
      {
        key: "ui.tickets.type.early_bird",
        values: {
          en: "🐦 Early Bird",
          de: "🐦 Frühbucher",
          pl: "🐦 Wczesny Ptak",
          es: "🐦 Madrugador",
          fr: "🐦 Lève-tôt",
          ja: "🐦 アーリーバード",
        },
      },
      {
        key: "ui.tickets.type.student",
        values: {
          en: "🎓 Student",
          de: "🎓 Student",
          pl: "🎓 Student",
          es: "🎓 Estudiante",
          fr: "🎓 Étudiant",
          ja: "🎓 学生",
        },
      },

      // === TICKET FORM ===
      {
        key: "ui.tickets.form.product_label",
        values: {
          en: "Product (Ticket Type)",
          de: "Produkt (Tickettyp)",
          pl: "Produkt (Typ biletu)",
          es: "Producto (Tipo de entrada)",
          fr: "Produit (Type de billet)",
          ja: "商品（チケットタイプ）",
        },
      },
      {
        key: "ui.tickets.form.product_select",
        values: {
          en: "Select a product...",
          de: "Produkt auswählen...",
          pl: "Wybierz produkt...",
          es: "Selecciona un producto...",
          fr: "Sélectionnez un produit...",
          ja: "商品を選択...",
        },
      },
      {
        key: "ui.tickets.form.product_help",
        values: {
          en: "Choose which product/ticket type to issue (e.g., VIP Ticket, Early Bird, etc.)",
          de: "Wählen Sie aus, welcher Produkt-/Tickettyp ausgegeben werden soll (z.B. VIP-Ticket, Frühbucher usw.)",
          pl: "Wybierz typ produktu/biletu do wydania (np. Bilet VIP, Wczesny Ptak itp.)",
          es: "Elige qué tipo de producto/entrada emitir (ej: Entrada VIP, Madrugador, etc.)",
          fr: "Choisissez le type de produit/billet à émettre (ex: Billet VIP, Lève-tôt, etc.)",
          ja: "発行する商品/チケットタイプを選択（例：VIPチケット、アーリーバードなど）",
        },
      },
      {
        key: "ui.tickets.form.event_label",
        values: {
          en: "Event (Optional)",
          de: "Veranstaltung (Optional)",
          pl: "Wydarzenie (Opcjonalne)",
          es: "Evento (Opcional)",
          fr: "Événement (Facultatif)",
          ja: "イベント（オプション）",
        },
      },
      {
        key: "ui.tickets.form.event_none",
        values: {
          en: "No event (standalone ticket)",
          de: "Keine Veranstaltung (eigenständiges Ticket)",
          pl: "Brak wydarzenia (samodzielny bilet)",
          es: "Sin evento (entrada independiente)",
          fr: "Aucun événement (billet autonome)",
          ja: "イベントなし（単独チケット）",
        },
      },
      {
        key: "ui.tickets.form.event_help",
        values: {
          en: "Associate this ticket with an event for check-in tracking",
          de: "Verknüpfen Sie dieses Ticket mit einer Veranstaltung für die Check-in-Verfolgung",
          pl: "Powiąż ten bilet z wydarzeniem w celu śledzenia meldowania",
          es: "Asocia esta entrada con un evento para el seguimiento de registro",
          fr: "Associez ce billet à un événement pour le suivi des enregistrements",
          ja: "チェックイン追跡のためにこのチケットをイベントに関連付ける",
        },
      },
      {
        key: "ui.tickets.form.holder_name_label",
        values: {
          en: "Holder Name",
          de: "Name des Inhabers",
          pl: "Nazwa posiadacza",
          es: "Nombre del titular",
          fr: "Nom du détenteur",
          ja: "所有者名",
        },
      },
      {
        key: "ui.tickets.form.holder_email_label",
        values: {
          en: "Holder Email",
          de: "E-Mail des Inhabers",
          pl: "E-mail posiadacza",
          es: "Correo del titular",
          fr: "Email du détenteur",
          ja: "所有者のメール",
        },
      },
      {
        key: "ui.tickets.form.holder_email_help",
        values: {
          en: "Ticket confirmation will be sent to this email",
          de: "Ticketbestätigung wird an diese E-Mail gesendet",
          pl: "Potwierdzenie biletu zostanie wysłane na ten e-mail",
          es: "La confirmación de entrada se enviará a este correo",
          fr: "La confirmation du billet sera envoyée à cet e-mail",
          ja: "チケット確認がこのメールに送信されます",
        },
      },
      {
        key: "ui.tickets.form.info_create",
        values: {
          en: "💡 Tickets are issued with \"issued\" status. Use the Redeem button to check in attendees.",
          de: "💡 Tickets werden mit dem Status \"ausgegeben\" ausgestellt. Verwenden Sie die Schaltfläche Einlösen, um Teilnehmer einzuchecken.",
          pl: "💡 Bilety są wydawane ze statusem \"wydany\". Użyj przycisku Zrealizuj, aby zameldować uczestników.",
          es: "💡 Las entradas se emiten con estado \"emitido\". Usa el botón Canjear para registrar asistentes.",
          fr: "💡 Les billets sont émis avec le statut \"émis\". Utilisez le bouton Échanger pour enregistrer les participants.",
          ja: "💡 チケットは「発行済み」ステータスで発行されます。参加者をチェックインするには引き換えボタンを使用してください。",
        },
      },
      {
        key: "ui.tickets.form.info_edit",
        values: {
          en: "💡 Update ticket holder information.",
          de: "💡 Ticketinhaber-Informationen aktualisieren.",
          pl: "💡 Zaktualizuj informacje o posiadaczu biletu.",
          es: "💡 Actualizar información del titular de la entrada.",
          fr: "💡 Mettre à jour les informations du détenteur du billet.",
          ja: "💡 チケット所有者情報を更新します。",
        },
      },
      {
        key: "ui.tickets.form.button.cancel",
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
        key: "ui.tickets.form.button.issue",
        values: {
          en: "Issue Ticket",
          de: "Ticket ausgeben",
          pl: "Wydaj bilet",
          es: "Emitir entrada",
          fr: "Émettre un billet",
          ja: "チケットを発行",
        },
      },
      {
        key: "ui.tickets.form.button.update",
        values: {
          en: "Update Ticket",
          de: "Ticket aktualisieren",
          pl: "Zaktualizuj bilet",
          es: "Actualizar entrada",
          fr: "Mettre à jour le billet",
          ja: "チケットを更新",
        },
      },
      {
        key: "ui.tickets.form.button.saving",
        values: {
          en: "Saving...",
          de: "Wird gespeichert...",
          pl: "Zapisywanie...",
          es: "Guardando...",
          fr: "Enregistrement...",
          ja: "保存中...",
        },
      },
      {
        key: "ui.tickets.form.error.save_failed",
        values: {
          en: "Failed to save ticket. Please try again.",
          de: "Ticket konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się zapisać biletu. Spróbuj ponownie.",
          es: "Error al guardar la entrada. Inténtalo de nuevo.",
          fr: "Échec de l'enregistrement du billet. Veuillez réessayer.",
          ja: "チケットの保存に失敗しました。もう一度お試しください。",
        },
      },

      // === TICKET DETAIL MODAL ===
      {
        key: "ui.tickets.detail.qr_scan",
        values: {
          en: "Scan to verify ticket",
          de: "Scannen, um Ticket zu verifizieren",
          pl: "Zeskanuj, aby zweryfikować bilet",
          es: "Escanear para verificar entrada",
          fr: "Scanner pour vérifier le billet",
          ja: "スキャンしてチケットを確認",
        },
      },
      {
        key: "ui.tickets.detail.button.download",
        values: {
          en: "Download Ticket",
          de: "Ticket herunterladen",
          pl: "Pobierz bilet",
          es: "Descargar entrada",
          fr: "Télécharger le billet",
          ja: "チケットをダウンロード",
        },
      },
      {
        key: "ui.tickets.detail.button.downloading",
        values: {
          en: "Downloading...",
          de: "Wird heruntergeladen...",
          pl: "Pobieranie...",
          es: "Descargando...",
          fr: "Téléchargement...",
          ja: "ダウンロード中...",
        },
      },
      {
        key: "ui.tickets.detail.button.print",
        values: {
          en: "Print Ticket",
          de: "Ticket drucken",
          pl: "Drukuj bilet",
          es: "Imprimir entrada",
          fr: "Imprimer le billet",
          ja: "チケットを印刷",
        },
      },
      {
        key: "ui.tickets.detail.section.holder",
        values: {
          en: "Ticket Holder",
          de: "Ticketinhaber",
          pl: "Posiadacz biletu",
          es: "Titular de la entrada",
          fr: "Détenteur du billet",
          ja: "チケット所有者",
        },
      },
      {
        key: "ui.tickets.detail.field.name",
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
        key: "ui.tickets.detail.field.email",
        values: {
          en: "Email",
          de: "E-Mail",
          pl: "E-mail",
          es: "Correo",
          fr: "Email",
          ja: "メール",
        },
      },
      {
        key: "ui.tickets.detail.field.phone",
        values: {
          en: "Phone",
          de: "Telefon",
          pl: "Telefon",
          es: "Teléfono",
          fr: "Téléphone",
          ja: "電話",
        },
      },
      {
        key: "ui.tickets.detail.field.purchased",
        values: {
          en: "Purchased",
          de: "Gekauft",
          pl: "Zakupiono",
          es: "Comprado",
          fr: "Acheté",
          ja: "購入日",
        },
      },
      {
        key: "ui.tickets.detail.section.pricing",
        values: {
          en: "Pricing",
          de: "Preisgestaltung",
          pl: "Ceny",
          es: "Precios",
          fr: "Tarification",
          ja: "価格",
        },
      },
      {
        key: "ui.tickets.detail.field.base_price",
        values: {
          en: "Base Price",
          de: "Grundpreis",
          pl: "Cena podstawowa",
          es: "Precio base",
          fr: "Prix de base",
          ja: "基本価格",
        },
      },
      {
        key: "ui.tickets.detail.field.payment_status",
        values: {
          en: "Payment Status",
          de: "Zahlungsstatus",
          pl: "Status płatności",
          es: "Estado de pago",
          fr: "Statut du paiement",
          ja: "支払いステータス",
        },
      },
      {
        key: "ui.tickets.detail.payment.pending_employer",
        values: {
          en: "Pending Employer Payment",
          de: "Arbeitgeberzahlung ausstehend",
          pl: "Oczekiwanie na płatność pracodawcy",
          es: "Pago pendiente del empleador",
          fr: "Paiement en attente de l'employeur",
          ja: "雇用主の支払い待ち",
        },
      },
      {
        key: "ui.tickets.detail.section.registration",
        values: {
          en: "Registration Details",
          de: "Registrierungsdetails",
          pl: "Szczegóły rejestracji",
          es: "Detalles de registro",
          fr: "Détails de l'inscription",
          ja: "登録詳細",
        },
      },
      {
        key: "ui.tickets.detail.section.transaction",
        values: {
          en: "Transaction Details",
          de: "Transaktionsdetails",
          pl: "Szczegóły transakcji",
          es: "Detalles de transacción",
          fr: "Détails de la transaction",
          ja: "取引詳細",
        },
      },
      {
        key: "ui.tickets.detail.field.checkout_session",
        values: {
          en: "Checkout Session",
          de: "Checkout-Sitzung",
          pl: "Sesja kasy",
          es: "Sesión de pago",
          fr: "Session de paiement",
          ja: "チェックアウトセッション",
        },
      },
      {
        key: "ui.tickets.detail.field.ticket_number_of",
        values: {
          en: "Ticket {number} of {total}",
          de: "Ticket {number} von {total}",
          pl: "Bilet {number} z {total}",
          es: "Entrada {number} de {total}",
          fr: "Billet {number} sur {total}",
          ja: "チケット {total} の {number}",
        },
      },
      {
        key: "ui.tickets.detail.field.purchase_item_id",
        values: {
          en: "Purchase Item ID",
          de: "Kaufartikel-ID",
          pl: "ID pozycji zakupu",
          es: "ID de artículo de compra",
          fr: "ID de l'article acheté",
          ja: "購入アイテムID",
        },
      },
      {
        key: "ui.tickets.detail.section.system",
        values: {
          en: "System Information",
          de: "Systeminformationen",
          pl: "Informacje systemowe",
          es: "Información del sistema",
          fr: "Informations système",
          ja: "システム情報",
        },
      },
      {
        key: "ui.tickets.detail.field.ticket_id",
        values: {
          en: "Ticket ID",
          de: "Ticket-ID",
          pl: "ID biletu",
          es: "ID de entrada",
          fr: "ID du billet",
          ja: "チケットID",
        },
      },
      {
        key: "ui.tickets.detail.field.created_at",
        values: {
          en: "Created At",
          de: "Erstellt am",
          pl: "Utworzono",
          es: "Creado el",
          fr: "Créé le",
          ja: "作成日",
        },
      },
      {
        key: "ui.tickets.detail.field.last_updated",
        values: {
          en: "Last Updated",
          de: "Zuletzt aktualisiert",
          pl: "Ostatnio zaktualizowano",
          es: "Última actualización",
          fr: "Dernière mise à jour",
          ja: "最終更新",
        },
      },
      {
        key: "ui.tickets.detail.error.no_checkout_session",
        values: {
          en: "Checkout session not found. Cannot download ticket.",
          de: "Checkout-Sitzung nicht gefunden. Ticket kann nicht heruntergeladen werden.",
          pl: "Nie znaleziono sesji kasy. Nie można pobrać biletu.",
          es: "Sesión de pago no encontrada. No se puede descargar la entrada.",
          fr: "Session de paiement introuvable. Impossible de télécharger le billet.",
          ja: "チェックアウトセッションが見つかりません。チケットをダウンロードできません。",
        },
      },
      {
        key: "ui.tickets.detail.error.download_failed",
        values: {
          en: "Failed to download ticket PDF. Please try again.",
          de: "Ticket-PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się pobrać pliku PDF biletu. Spróbuj ponownie.",
          es: "Error al descargar el PDF de entrada. Inténtalo de nuevo.",
          fr: "Échec du téléchargement du PDF du billet. Veuillez réessayer.",
          ja: "チケットPDFのダウンロードに失敗しました。もう一度お試しください。",
        },
      },
      {
        key: "ui.tickets.detail.field.not_provided",
        values: {
          en: "Not provided",
          de: "Nicht angegeben",
          pl: "Nie podano",
          es: "No proporcionado",
          fr: "Non fourni",
          ja: "未提供",
        },
      },
      {
        key: "ui.tickets.detail.field.ticket_number_na",
        values: {
          en: "Ticket #N/A",
          de: "Ticket #N/A",
          pl: "Bilet #N/D",
          es: "Entrada #N/D",
          fr: "Billet #N/D",
          ja: "チケット #N/A",
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
            "tickets",
            "tickets-window"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Tickets translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
