import { Resend } from "resend"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadCaptureFormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  language: "en" | "de"
  requestedAgentKey: string
  requestedAgentName: string
  requestedPersonaName: string
  landingPath?: string
  salutation?: string
  title?: string
}

// ---------------------------------------------------------------------------
// Rate Limiter (in-memory, resets on deploy — fine for landing page traffic)
// ---------------------------------------------------------------------------

const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) {
    return false
  }
  entry.count++
  return true
}

// ---------------------------------------------------------------------------
// Phone masking  ("+4917112345678" → "+49 *** ***678")
// ---------------------------------------------------------------------------

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 6) {
    return "***"
  }
  return `+${digits.slice(0, 2)} *** ***${digits.slice(-3)}`
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLeadForm(body: Record<string, unknown>): {
  valid: true
  data: LeadCaptureFormData
} | {
  valid: false
  error: string
} {
  const firstName = normalizeString(body.firstName)
  const lastName = normalizeString(body.lastName)
  const email = normalizeString(body.email)
  const phone = normalizeString(body.phone)
  const language = body.language === "de" ? "de" : "en"
  const requestedAgentKey = normalizeString(body.requestedAgentKey)
  const requestedAgentName = normalizeString(body.requestedAgentName)
  const requestedPersonaName = normalizeString(body.requestedPersonaName)
  const landingPath = normalizeString(body.landingPath) || undefined
  const salutation = normalizeString(body.salutation) || "mr"
  const title = normalizeString(body.title) || ""

  if (!firstName || !lastName) {
    return { valid: false, error: "First name and last name are required." }
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { valid: false, error: "A valid business email is required." }
  }
  if (!phone) {
    return { valid: false, error: "A valid phone number is required." }
  }
  const phoneDigits = phone.replace(/\D/g, "")
  if (phoneDigits.length < 7 || phoneDigits.length > 16) {
    return { valid: false, error: "Phone number must be 7-16 digits." }
  }
  if (!requestedAgentKey || !requestedAgentName || !requestedPersonaName) {
    return { valid: false, error: "Requested agent context is incomplete." }
  }

  return {
    valid: true,
    data: {
      firstName,
      lastName,
      email,
      phone,
      language,
      requestedAgentKey,
      requestedAgentName,
      requestedPersonaName,
      landingPath,
      salutation,
      title,
    },
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

// ---------------------------------------------------------------------------
// Resend email client
// ---------------------------------------------------------------------------

export function createResendClient(apiKey?: string): Resend {
  const key = apiKey || process.env.RESEND_API_KEY
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  return new Resend(key)
}

// ---------------------------------------------------------------------------
// Email: Sales Notification
// ---------------------------------------------------------------------------

export function buildSalesNotificationSubject(data: LeadCaptureFormData): string {
  return `New Lead: ${data.firstName} ${data.lastName} — ${data.requestedPersonaName}`
}

export function buildSalesNotificationHtml(data: LeadCaptureFormData): string {
  const rows = [
    ["Name", `${data.firstName} ${data.lastName}`],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Language", data.language === "de" ? "German" : "English"],
    ["Requested Agent", `${data.requestedPersonaName} (${data.requestedAgentName})`],
    ["Source", "Seven Agents Landing Page"],
    ...(data.landingPath ? [["Landing Path", data.landingPath]] : []),
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;color:#999;font-size:13px;white-space:nowrap;border-bottom:1px solid #222;">${label}</td>
          <td style="padding:8px 12px;color:#EDEDED;font-size:13px;border-bottom:1px solid #222;">${escapeHtml(value as string)}</td>
        </tr>`
    )
    .join("")

  return emailWrapper(`
    <h1 style="color:#EDEDED;font-size:22px;margin:0 0 8px;">New Lead from Seven Agents</h1>
    <p style="color:#999;font-size:14px;margin:0 0 24px;">A verified lead just submitted the demo request form on your landing page.</p>
    <table style="width:100%;border-collapse:collapse;background:#141414;border-radius:8px;overflow:hidden;">
      ${tableRows}
    </table>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">Reply to this email to reach the lead directly.</p>
  `)
}

// ---------------------------------------------------------------------------
// Email: Lead Confirmation — Formal Greeting
// ---------------------------------------------------------------------------

const TITLE_LABELS: Record<string, string> = {
  dr: "Dr.",
  prof: "Prof.",
  prof_dr: "Prof. Dr.",
}

export function buildFormalGreeting(data: LeadCaptureFormData): string {
  const salutation = data.salutation || "mr"
  const title = data.title || ""
  const isDE = data.language === "de"
  const lastName = escapeHtml(data.lastName)
  const firstName = escapeHtml(data.firstName)
  const titleStr = TITLE_LABELS[title] || ""

  if (isDE) {
    if (salutation === "mr") {
      return titleStr
        ? `Sehr geehrter Herr ${titleStr} ${lastName}`
        : `Sehr geehrter Herr ${lastName}`
    }
    if (salutation === "mrs") {
      return titleStr
        ? `Sehr geehrte Frau ${titleStr} ${lastName}`
        : `Sehr geehrte Frau ${lastName}`
    }
    // "none"
    return titleStr
      ? `Guten Tag ${titleStr} ${lastName}`
      : `Guten Tag ${firstName} ${lastName}`
  }

  // English — academic titles supersede Mr./Mrs.
  if (salutation === "mr") {
    if (titleStr) return `Dear ${titleStr} ${lastName}`
    return `Dear Mr. ${lastName}`
  }
  if (salutation === "mrs") {
    if (titleStr) return `Dear ${titleStr} ${lastName}`
    return `Dear Mrs. ${lastName}`
  }
  // "none"
  return `Hi ${firstName}`
}

// ---------------------------------------------------------------------------
// Email: Lead Confirmation — Demo Kit (Ogilvy style)
// ---------------------------------------------------------------------------

const FOUNDER_DEMO_URLS: Record<string, string> = {
  en: "https://cal.com/voundbrand/sevenlayers-demo-en",
  de: "https://cal.com/voundbrand/sevenlayers-demo-de",
}

export function buildLeadConfirmationSubject(
  data: LeadCaptureFormData
): string {
  if (data.language === "de") {
    return "Ihr Demo-Kit \u2014 und ein Angebot f\u00fcr die ersten f\u00fcnf"
  }
  return "Your demo kit \u2014 and an offer for the first five"
}

export function buildLeadConfirmationHtml(data: LeadCaptureFormData): string {
  const demoUrl = FOUNDER_DEMO_URLS[data.language] || FOUNDER_DEMO_URLS.en
  const isDE = data.language === "de"
  const greeting = buildFormalGreeting(data)
  const demoPhone = process.env.NEXT_PUBLIC_LANDING_SHARED_DEMO_PHONE_NUMBER?.trim() || ""

  const openingLine = isDE
    ? `Sie haben gerade geh\u00f6rt, wie Clara den Anruf entgegennimmt. Innerhalb von zwei Klingelt\u00f6nen, mit vollem Kontext, zu einer Uhrzeit, zu der die meisten Unternehmen auf die Mailbox verweisen.`
    : `You just heard Clara answer the phone. In under two rings, with full context, at a time when most businesses send callers to voicemail.`

  const transitionLine = isDE
    ? `Stellen Sie sich das auf Ihrer Leitung vor \u2014 nicht als Demo, sondern als Ihr Alltag.`
    : `Now imagine that on your line \u2014 not as a demo, but as your reality.`

  const pitchParagraph = isDE
    ? `Jeder verpasste Anruf ist ein Kunde, der woanders bucht. Bei einem Unternehmen mit f\u00fcnf Standorten sind das leicht 200+ verpasste Anrufe pro Woche. Bei einem durchschnittlichen Auftragswert von 500\u00a0\u20ac sind das 100.000\u00a0\u20ac Jahresumsatz, die Ihnen entgehen. Nicht weil Ihr Team schlecht ist \u2014 sondern weil es nicht \u00fcberall gleichzeitig sein kann.`
    : `Every missed call is a customer who books elsewhere. In a business with five locations, that\u2019s easily 200+ missed calls per week. At an average deal size of \u20ac500, that\u2019s \u20ac100,000 in annual revenue walking out the door. Not because your team isn\u2019t good \u2014 because they can\u2019t be everywhere at once.`

  const offerParagraph = isDE
    ? `Das biete ich unseren ersten Kunden an: einen 2-Wochen-Test. Ich konfiguriere eine Assistentin f\u00fcr Ihr Unternehmen \u2014 Ihre \u00d6ffnungszeiten, Ihre Regeln. Sie testen intern: mit Mitarbeitern, Freunden, Familie. Keine Einrichtungsgeb\u00fchr. Keine Verpflichtung. Wenn Sie und Ihr Team \u00fcberzeugt sind, schalten wir auf Ihre echte Leitung um.`
    : `Here\u2019s what I\u2019m offering our first customers: a 2-week test. I configure an assistant for your business \u2014 your hours, your rules. You test internally: with employees, friends, family. No setup fee. No commitment. Once you and your team are convinced, we switch it to your real line.`

  const founderLine = isDE
    ? `Ich konfiguriere jeden Assistenten pers\u00f6nlich f\u00fcr unsere ersten Kunden. Dieses Ma\u00df an Aufmerksamkeit skaliert nicht \u2014 aber im Moment geh\u00f6rt es Ihnen.`
    : `I configure every agent personally for our first customers. That level of attention won\u2019t scale \u2014 but right now, it\u2019s yours.`

  const attachmentLine = isDE
    ? `Im Anhang: Ihr sevenlayers Demo-Kit (PDF)`
    : `Attached: Your sevenlayers Demo Kit (PDF)`

  const ctaLabel = isDE
    ? `30 Minuten mit Remington buchen`
    : `Book 30 minutes with Remington`

  const ps = isDE
    ? `P.S. \u2014 Sie sind einer unserer ersten f\u00fcnf Kunden. Das bedeutet Gr\u00fcnder-Aufmerksamkeit zu Early-Adopter-Konditionen. Ich erkl\u00e4re es im Gespr\u00e4ch.`
    : `P.S. \u2014 You\u2019re one of our first five customers. That means founder-level attention at early-adopter pricing. I\u2019ll explain on the call.`

  const demoPhoneBlock = demoPhone
    ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;text-align:center;">
        ${isDE ? "Demo-Nummer (jederzeit anrufen):" : "Demo number (call anytime):"} <strong style="color:#1a1a1a;">${escapeHtml(demoPhone)}</strong>
      </p>`
    : ""

  return `<!DOCTYPE html>
<html lang="${data.language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td align="center" style="padding:0 0 32px;">
          <img src="https://www.sevenlayers.io/images/sevenlayers-email-logo.png" alt="sevenlayers" width="220" style="width:220px;height:auto;" />
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:12px;padding:40px 32px;">
          <p style="color:#1a1a1a;font-size:16px;line-height:1.6;margin:0 0 24px;">${greeting},</p>
          <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">${openingLine}</p>
          <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 24px;font-weight:600;">${transitionLine}</p>
          <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">${pitchParagraph}</p>
          <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">${offerParagraph}</p>
          <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 28px;">${founderLine}</p>
          ${demoPhoneBlock}
          <p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:0 0 24px;text-align:center;">\uD83D\uDCCE ${attachmentLine}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 32px;">
              <a href="${demoUrl}" style="display:block;background:#1a1a1a;color:#ffffff;font-weight:600;font-size:16px;padding:16px 32px;border-radius:8px;text-decoration:none;text-align:center;max-width:400px;margin:0 auto;">${ctaLabel}</a>
            </td></tr>
          </table>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:0;font-style:italic;">${ps}</p>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#999;font-size:11px;margin:0;">Vound Brand UG (haftungsbeschr\u00e4nkt) \u00b7 Am Markt 11 \u00b7 17309 Pasewalk \u00b7 Germany</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Shared email wrapper (dark brand)
// ---------------------------------------------------------------------------

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 0 24px;">
          <span style="color:#EDEDED;font-size:18px;font-weight:700;letter-spacing:-0.02em;">sevenlayers</span>
        </td></tr>
        <tr><td style="background:#141414;border:1px solid #222;border-radius:12px;padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#444;font-size:11px;margin:0;">Vound Brand UG (haftungsbeschr\u00e4nkt) \u00b7 Am Markt 11 \u00b7 17309 Pasewalk \u00b7 Germany</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
