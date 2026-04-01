import { Resend } from "resend"
import {
  escapeHtml,
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
  type BookingEmailData,
} from "../../../src/lib/booking-email-templates"

export {
  escapeHtml,
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
}
export type { BookingEmailData }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactEmailData {
  name: string
  email: string
  subject: string
  message: string
  language: string
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
// Client IP resolution
// ---------------------------------------------------------------------------

export function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

// ---------------------------------------------------------------------------
// Booking email templates are shared with workflow automation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Email: Contact Form Notification (to team)
// ---------------------------------------------------------------------------

export function buildContactNotificationHtml(data: ContactEmailData): string {
  const rows = [
    ["Name", data.name],
    ["Email", data.email],
    ["Subject", data.subject],
    ["Message", data.message],
    ["Language", data.language],
    ["Source", "Segelschule Altwarp Website"],
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #E2C786;">${label}</td>
          <td style="padding:8px 12px;color:#1E3926;font-size:13px;border-bottom:1px solid #E2C786;">${escapeHtml(value as string)}</td>
        </tr>`
    )
    .join("")

  return emailWrapper(`
    <h1 style="color:#1E3926;font-size:22px;margin:0 0 8px;">New Contact Form Submission</h1>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Someone submitted the contact form on the Segelschule Altwarp website.</p>
    <table style="width:100%;border-collapse:collapse;background:#FFFBEA;border-radius:8px;overflow:hidden;">
      ${tableRows}
    </table>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">Reply to this email to reach them directly.</p>
  `)
}
