import type { BookingReminderKind } from "./booking-workflow-utils"

export interface BookingEmailData {
  customerName: string
  customerEmail: string
  customerPhone: string
  courseName: string
  coursePrice: string
  date: string
  time: string
  seats: { boatName: string; seatNumbers: number[] }[]
  totalSeats: number
  totalAmount: number
  tshirtSize?: string
  needsAccommodation?: boolean
  message?: string
  bookingId: string
  language: string
  paymentMethod?: "invoice" | "stripe" | "free" | string
  ticketCode?: string
  ticketLookupUrl?: string
  invoiceAttachmentIncluded?: boolean
  bookingStatusLabel?: string
}

export interface BookingReminderEmailData {
  reminderKind: BookingReminderKind
  bookingId: string
  customerName: string
  customerEmail?: string
  courseName: string
  date: string
  time: string
  language: string
  ticketLookupUrl?: string
  ticketCode?: string
  weatherInfo?: string
  packingListItems?: string[]
  operatorLabel?: string
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function emailWrapper(content: string, lang = "de"): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFBEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEA;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 24px;">
          <span style="color:#1E3926;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Segelschule Altwarp</span>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #E2C786;border-radius:12px;padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#999;font-size:11px;margin:0;">Segelschule Altwarp &middot; Am Hafen 12 &middot; 17375 Altwarp &middot; Germany</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function isGerman(language: string): boolean {
  return language === "de"
}

function isDutch(language: string): boolean {
  return language === "nl"
}

export function buildBookingConfirmationHtml(data: BookingEmailData): string {
  const isDE = isGerman(data.language)
  const isNL = isDutch(data.language)

  const greeting = isDE
    ? `Vielen Dank fuer Ihre Buchung, ${escapeHtml(data.customerName)}!`
    : isNL
      ? `Bedankt voor uw boeking, ${escapeHtml(data.customerName)}!`
      : `Thank you for your booking, ${escapeHtml(data.customerName)}!`

  const subtitle = isDE
    ? "Wir freuen uns auf Sie! Hier sind Ihre Buchungsdetails:"
    : isNL
      ? "We kijken ernaar uit u te verwelkomen! Hier zijn uw boekingsgegevens:"
      : "We look forward to seeing you! Here are your booking details:"

  const seatInfo = data.seats
    .map((seat) =>
      `${escapeHtml(seat.boatName)}: ${isDE ? "Sitz" : isNL ? "Stoel" : "Seat"} ${seat.seatNumbers.join(", ")}`
    )
    .join("; ")

  const paymentMethodLabel =
    data.paymentMethod === "free"
      ? (isDE ? "Kostenfrei" : isNL ? "Gratis" : "Free")
      : data.paymentMethod === "stripe"
        ? "Stripe"
        : isDE
          ? "Rechnung (Zahlung vor Ort)"
          : isNL
            ? "Factuur (betaling ter plaatse)"
            : "Invoice (pay on site)"

  const rows = [
    [isDE ? "Buchungs-Nr." : isNL ? "Boekingsnr." : "Booking Ref.", data.bookingId],
    ...(data.ticketCode
      ? [[isDE ? "Ticket-Code" : isNL ? "Ticketcode" : "Ticket code", data.ticketCode]]
      : []),
    [isDE ? "Kurs" : isNL ? "Cursus" : "Course", data.courseName],
    [isDE ? "Datum" : "Date", data.date],
    [isDE ? "Uhrzeit" : isNL ? "Tijd" : "Time", data.time],
    [isDE ? "Teilnehmer" : isNL ? "Deelnemers" : "Participants", String(data.totalSeats)],
    [isDE ? "Boot & Plaetze" : isNL ? "Boot & Plaatsen" : "Boat & Seats", seatInfo],
    ...(data.tshirtSize
      ? [[isDE ? "T-Shirt Groesse" : isNL ? "T-Shirt Maat" : "T-Shirt Size", data.tshirtSize]]
      : []),
    [isDE ? "Zahlung" : isNL ? "Betaling" : "Payment", paymentMethodLabel],
    [isDE ? "Gesamt" : isNL ? "Totaal" : "Total", `EUR ${data.totalAmount.toFixed(2)}`],
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;color:#666;font-size:13px;white-space:nowrap;border-bottom:1px solid #E2C786;">${label}</td>
          <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(String(value))}</td>
        </tr>`
    )
    .join("")

  const footer = isDE
    ? "Bei Fragen erreichen Sie uns jederzeit per E-Mail oder Telefon."
    : isNL
      ? "Bij vragen kunt u ons altijd bereiken per e-mail of telefoon."
      : "If you have any questions, feel free to reach us by email or phone."

  const extraHints = isDE
    ? [
      "Sie erhalten weitere Infos per E-Mail.",
      "Ca. 1 Woche vor Kursbeginn senden wir Wetter-Info und Packliste.",
    ]
    : isNL
      ? [
        "U ontvangt aanvullende info per e-mail.",
        "Ongeveer 1 week voor de cursus sturen wij weerinfo en paklijst.",
      ]
      : [
        "You will receive additional details by email.",
        "About 1 week before the course we send weather info and a packing list.",
      ]

  const invoiceHint = data.invoiceAttachmentIncluded
    ? (
      isDE
        ? "Ihre Rechnung finden Sie als PDF im Anhang dieser E-Mail."
        : isNL
          ? "Uw factuur vindt u als pdf in de bijlage van deze e-mail."
          : "Your invoice is attached to this email as a PDF."
    )
    : null

  const ticketLinkCta = data.ticketLookupUrl
    ? `<p style="margin:20px 0 0;">
      <a href="${escapeHtml(data.ticketLookupUrl)}" style="display:inline-block;background:#1E3926;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
        ${isDE ? "Ticket ansehen" : isNL ? "Ticket bekijken" : "View ticket"}
      </a>
    </p>`
    : ""

  return emailWrapper(
    `
    <h1 style="color:#1E3926;font-size:22px;margin:0 0 8px;">${greeting}</h1>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">${subtitle}</p>
    <table style="width:100%;border-collapse:collapse;background:#FFFBEA;border-radius:8px;overflow:hidden;">
      ${tableRows}
    </table>
    <p style="color:#666;font-size:13px;margin:20px 0 0;">${extraHints[0]}</p>
    ${invoiceHint ? `<p style="color:#666;font-size:13px;margin:8px 0 0;">${invoiceHint}</p>` : ""}
    <p style="color:#666;font-size:13px;margin:8px 0 0;">${extraHints[1]}</p>
    ${ticketLinkCta}
    <p style="color:#666;font-size:12px;margin:24px 0 0;">${footer}</p>
  `,
    data.language
  )
}

export function buildBookingNotificationHtml(data: BookingEmailData): string {
  const seatInfo = data.seats
    .map((seat) => `${seat.boatName}: Seat ${seat.seatNumbers.join(", ")}`)
    .join("; ")

  const rows = [
    ["Booking ID", data.bookingId],
    ...(data.ticketCode ? [["Ticket Code", data.ticketCode]] : []),
    ["Customer", data.customerName],
    ["Email", data.customerEmail],
    ["Phone", data.customerPhone],
    ["Course", data.courseName],
    ["Date", data.date],
    ["Time", data.time],
    ["Seats", `${data.totalSeats} (${seatInfo})`],
    ...(data.tshirtSize ? [["T-Shirt", data.tshirtSize]] : []),
    ...(data.needsAccommodation ? [["Accommodation", "Help requested"]] : []),
    ...(data.message ? [["Message", data.message]] : []),
    ["Payment", data.paymentMethod === "free" ? "free" : data.paymentMethod === "stripe" ? "stripe" : "on_site_invoice"],
    ...(data.ticketLookupUrl ? [["Ticket Lookup URL", data.ticketLookupUrl]] : []),
    ["Total", `EUR ${data.totalAmount.toFixed(2)}`],
    ["Status", data.bookingStatusLabel || "Pending Confirmation"],
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;color:#666;font-size:13px;white-space:nowrap;border-bottom:1px solid #E2C786;">${label}</td>
          <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(String(value))}</td>
        </tr>`
    )
    .join("")

  return emailWrapper(`
    <h1 style="color:#1E3926;font-size:22px;margin:0 0 8px;">New Booking Received</h1>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">A new course booking has been submitted on the website.</p>
    <table style="width:100%;border-collapse:collapse;background:#FFFBEA;border-radius:8px;overflow:hidden;">
      ${tableRows}
    </table>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">Reply to this email to reach the customer directly.</p>
  `)
}

function buildReminderList(items: string[]): string {
  return items
    .map(
      (item) =>
        `<li style="margin:0 0 8px 18px;color:#1E3926;font-size:14px;">${escapeHtml(item)}</li>`
    )
    .join("")
}

export function buildBookingReminderCustomerHtml(
  data: BookingReminderEmailData
): string {
  const isDE = isGerman(data.language)
  const isNL = isDutch(data.language)
  const reminderTitle =
    data.reminderKind === "weather"
      ? (isDE ? "Wetter-Info fuer Ihren Kurs" : isNL ? "Weerinfo voor uw cursus" : "Weather update for your course")
      : (isDE ? "Packliste fuer Ihren Kurs" : isNL ? "Paklijst voor uw cursus" : "Packing list for your course")

  const intro = isDE
    ? `Ihr Kurs ${escapeHtml(data.courseName)} beginnt bald. Hier ist Ihre Erinnerung fuer ${escapeHtml(data.date)} um ${escapeHtml(data.time)} Uhr.`
    : isNL
      ? `Uw cursus ${escapeHtml(data.courseName)} komt eraan. Hier is uw herinnering voor ${escapeHtml(data.date)} om ${escapeHtml(data.time)}.`
      : `Your ${escapeHtml(data.courseName)} booking is coming up. Here is your reminder for ${escapeHtml(data.date)} at ${escapeHtml(data.time)}.`

  const weatherSection =
    data.reminderKind === "weather" && data.weatherInfo
      ? `<p style="color:#1E3926;font-size:14px;line-height:1.6;margin:16px 0 0;">${escapeHtml(data.weatherInfo)}</p>`
      : ""

  const packingSection =
    data.reminderKind === "packing_list" && data.packingListItems?.length
      ? `<ul style="padding:0;margin:16px 0 0;">${buildReminderList(data.packingListItems)}</ul>`
      : ""

  const ticketLink =
    data.ticketLookupUrl
      ? `<p style="margin:20px 0 0;">
          <a href="${escapeHtml(data.ticketLookupUrl)}" style="display:inline-block;background:#1E3926;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
            ${isDE ? "Buchung ansehen" : isNL ? "Boeking bekijken" : "View booking"}
          </a>
        </p>`
      : ""

  return emailWrapper(
    `
    <h1 style="color:#1E3926;font-size:22px;margin:0 0 8px;">${reminderTitle}</h1>
    <p style="color:#666;font-size:14px;margin:0;">${intro}</p>
    ${weatherSection}
    ${packingSection}
    ${ticketLink}
  `,
    data.language
  )
}

export function buildBookingReminderOperatorHtml(
  data: BookingReminderEmailData
): string {
  const reminderLabel =
    data.reminderKind === "weather" ? "Weather reminder dispatched" : "Packing list reminder dispatched"
  const content =
    data.reminderKind === "weather"
      ? (data.weatherInfo || "No weather summary stored on the booking.")
      : (data.packingListItems?.join(", ") || "No packing list stored on the booking.")

  return emailWrapper(`
    <h1 style="color:#1E3926;font-size:22px;margin:0 0 8px;">${reminderLabel}</h1>
    <p style="color:#666;font-size:14px;margin:0 0 16px;">${escapeHtml(data.operatorLabel || "An automated pre-course reminder was sent.")}</p>
    <table style="width:100%;border-collapse:collapse;background:#FFFBEA;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:8px 12px;color:#666;font-size:13px;border-bottom:1px solid #E2C786;">Booking</td>
        <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(data.bookingId)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#666;font-size:13px;border-bottom:1px solid #E2C786;">Customer</td>
        <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(data.customerName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#666;font-size:13px;border-bottom:1px solid #E2C786;">Course</td>
        <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(data.courseName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#666;font-size:13px;border-bottom:1px solid #E2C786;">Start</td>
        <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(`${data.date} ${data.time}`)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#666;font-size:13px;border-bottom:1px solid #E2C786;">Content</td>
        <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(content)}</td>
      </tr>
    </table>
  `)
}
