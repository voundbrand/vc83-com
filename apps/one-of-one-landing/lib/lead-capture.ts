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
// Email: Lead Confirmation
// ---------------------------------------------------------------------------

const FOUNDER_DEMO_URLS: Record<string, string> = {
  en: "https://cal.com/voundbrand/sevenlayers-demo-en",
  de: "https://cal.com/voundbrand/sevenlayers-demo-de",
}

export function buildLeadConfirmationSubject(
  data: LeadCaptureFormData
): string {
  if (data.language === "de") {
    return `Danke, ${data.firstName} \u2014 buchen Sie Ihre pers\u00f6nliche Demo`
  }
  return `Thanks, ${data.firstName} \u2014 book your personal demo`
}

export function buildLeadConfirmationHtml(data: LeadCaptureFormData): string {
  const demoUrl = FOUNDER_DEMO_URLS[data.language] || FOUNDER_DEMO_URLS.en
  const isDE = data.language === "de"

  const heading = isDE
    ? `Danke f\u00fcr Ihr Interesse, ${escapeHtml(data.firstName)}!`
    : `Thanks for your interest, ${escapeHtml(data.firstName)}!`

  const body1 = isDE
    ? `Sie haben gerade ${escapeHtml(data.requestedPersonaName)} auf unserer Seite getestet. Clara ruft Sie an \u2014 oder hat es bereits getan.`
    : `You just tested ${escapeHtml(data.requestedPersonaName)} on our site. Clara is calling you \u2014 or already has.`

  const body2 = isDE
    ? "M\u00f6chten Sie sehen, wie das gesamte Team f\u00fcr Ihr Unternehmen arbeiten kann? Buchen Sie eine pers\u00f6nliche 30-Minuten-Demo mit unserem Gr\u00fcnder."
    : "Want to see how the full team can work for your business? Book a personal 30-minute demo with our founder."

  const ctaLabel = isDE ? "Demo buchen" : "Book your demo"

  const footer = isDE
    ? "Fragen? Antworte einfach auf diese E-Mail oder schreibe an sales@sevenlayers.io."
    : "Questions? Reply to this email or reach us at sales@sevenlayers.io."

  return emailWrapper(`
    <h1 style="color:#EDEDED;font-size:22px;margin:0 0 16px;">${heading}</h1>
    <p style="color:#CDCDCD;font-size:15px;line-height:1.6;margin:0 0 12px;">${body1}</p>
    <p style="color:#CDCDCD;font-size:15px;line-height:1.6;margin:0 0 28px;">${body2}</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${demoUrl}" style="display:inline-block;background:#E8520A;color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${ctaLabel}</a>
    </div>
    <p style="color:#666;font-size:13px;margin:0;">${footer}</p>
  `)
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
