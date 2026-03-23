export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  getOrganizationId,
  mutateInternal,
  actionInternal,
} from "@/lib/server-convex"
import {
  checkRateLimit,
  resolveClientIp,
  createResendClient,
  buildContactNotificationHtml,
} from "@/lib/email"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../convex/_generated/api").internal

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ContactPayload {
  name: string
  email: string
  subject: string
  message: string
  language: string
}

function validateContactPayload(
  body: Record<string, unknown>
): { valid: true; data: ContactPayload } | { valid: false; error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const subject = typeof body.subject === "string" ? body.subject.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""
  const language =
    typeof body.language === "string" ? body.language.trim() : "de"

  if (!name) {
    return { valid: false, error: "Name is required." }
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { valid: false, error: "A valid email is required." }
  }
  if (!subject) {
    return { valid: false, error: "Subject is required." }
  }
  if (!message) {
    return { valid: false, error: "Message is required." }
  }

  return { valid: true, data: { name, email, subject, message, language } }
}

// ---------------------------------------------------------------------------
// Resend credential resolution (org settings first, env fallback)
// ---------------------------------------------------------------------------

async function resolveResendApiKey(
  convex: ReturnType<typeof getConvexClient>,
  organizationId: string
): Promise<string> {
  try {
    const creds = await actionInternal(
      convex,
      generatedInternalApi.integrations.resend.resolveCredentials,
      { organizationId: organizationId as Id<"organizations"> }
    )
    if (creds?.apiKey) return creds.apiKey
  } catch (err) {
    console.warn(
      "[Contact] Resend resolver failed, falling back to env:",
      err
    )
  }

  const envKey = process.env.RESEND_API_KEY
  if (!envKey) throw new Error("RESEND_API_KEY is not configured")
  return envKey
}

// ---------------------------------------------------------------------------
// POST /api/contact
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const clientIp = resolveClientIp(request)

    // Rate limit: 5 contact submissions per IP per hour
    if (!checkRateLimit(`contact-ip:${clientIp}`, 5, 3_600_000)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const validation = validateContactPayload(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { data } = validation

    // Resolve org
    const organizationId = getOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      )
    }

    const convex = getConvexClient()
    const now = Date.now()

    // Split name for CRM (first word → firstName, rest → lastName)
    const nameParts = data.name.split(/\s+/)
    const firstName = nameParts[0] || data.name
    const lastName = nameParts.slice(1).join(" ") || ""

    // -----------------------------------------------------------------
    // Create CRM contact (subtype: lead)
    // -----------------------------------------------------------------
    const contactId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "crm_contact",
        subtype: "lead",
        name: data.name,
        status: "active",
        customProperties: {
          firstName,
          lastName,
          email: data.email,
          source: "segelschule_landing",
          sourceRef: "contact_form",
          tags: ["segelschule_landing", "contact_form"],
          notes: `Subject: ${data.subject}\n\n${data.message}`,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // -----------------------------------------------------------------
    // Contact notification email (non-fatal)
    // -----------------------------------------------------------------
    const notificationEmail =
      process.env.CONTACT_NOTIFICATION_EMAIL?.trim()

    if (notificationEmail) {
      let resendApiKey: string | null = null
      try {
        resendApiKey = await resolveResendApiKey(convex, organizationId)
      } catch (err) {
        console.error("[Contact] Resend key resolution failed:", err)
      }

      if (resendApiKey) {
        const fromEmail =
          process.env.CONTACT_FROM_EMAIL?.trim() ||
          "Segelschule Altwarp <noreply@segelschule-altwarp.de>"

        try {
          const resend = createResendClient(resendApiKey)
          await resend.emails.send({
            from: fromEmail,
            to: notificationEmail,
            replyTo: data.email,
            subject: `Contact Form: ${data.subject} - ${data.name}`,
            html: buildContactNotificationHtml(data),
            headers: {
              "X-Entity-Ref-ID": `contact-notify-${Date.now()}`,
            },
          })
        } catch (err) {
          console.error("[Contact] Notification email failed:", err)
        }
      }
    }

    return NextResponse.json(
      { ok: true, contactId },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("[Contact] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Contact form submission failed",
      },
      { status: 500 }
    )
  }
}
