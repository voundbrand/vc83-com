export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import twilio from "twilio"
import type { Id } from "../../../../../../convex/_generated/dataModel"
import {
  LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
  LANDING_DEMO_CALL_INTENT_TTL_MS,
  normalizePhoneDigits,
  normalizePhoneForLookup,
} from "@/lib/demo-call"
import {
  getConvexClient,
  getPlatformOrganizationId,
  mutateInternal,
  actionInternal,
  queryInternal,
} from "@/lib/server-convex"
import {
  checkRateLimit,
  createResendClient,
  validateLeadForm,
  buildSalesNotificationSubject,
  buildSalesNotificationHtml,
  buildLeadConfirmationSubject,
  buildLeadConfirmationHtml,
} from "@/lib/lead-capture"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal

// ---------------------------------------------------------------------------
// Credential resolution
// ---------------------------------------------------------------------------

async function resolveTwilioVerifyService(
  convex: ReturnType<typeof getConvexClient>,
  organizationId: string,
) {
  try {
    const creds = await actionInternal(
      convex,
      generatedInternalApi.integrations.twilio.resolveCredentials,
      { organizationId: organizationId as Id<"organizations"> }
    )
    if (creds?.accountSid && creds?.authToken && creds?.verifyServiceSid) {
      const client = twilio(creds.accountSid, creds.authToken)
      return client.verify.v2.services(creds.verifyServiceSid)
    }
  } catch (err) {
    console.warn("[LeadCapture:Verify] Twilio resolver failed, falling back to env:", err)
  }

  // Fallback: direct env vars
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifySid) {
    throw new Error("Twilio Verify is not configured")
  }

  const client = twilio(accountSid, authToken)
  return client.verify.v2.services(verifySid)
}

async function resolveResendApiKey(
  convex: ReturnType<typeof getConvexClient>,
  organizationId: string,
): Promise<string> {
  try {
    const creds = await actionInternal(
      convex,
      generatedInternalApi.integrations.resend.resolveCredentials,
      { organizationId: organizationId as Id<"organizations"> }
    )
    if (creds?.apiKey) return creds.apiKey
  } catch (err) {
    console.warn("[LeadCapture:Verify] Resend resolver failed, falling back to env:", err)
  }

  // Fallback: direct env var
  const envKey = process.env.RESEND_API_KEY
  if (!envKey) throw new Error("RESEND_API_KEY is not configured")
  return envKey
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

function resolveClaraAgentId(): string {
  return (
    process.env.CLARA_ELEVENLABS_AGENT_ID?.trim() ||
    "agent_4501kkk9m4fdezp8hby997w5v630"
  )
}

// ---------------------------------------------------------------------------
// POST /api/lead-capture/verify
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const clientIp = resolveClientIp(request)

    const otpActive = process.env.NEXT_PUBLIC_LEAD_CAPTURE_OTP_ACTIVE !== "false"

    const body = (await request.json()) as Record<string, unknown>
    const code = typeof body.code === "string" ? body.code.trim() : ""
    const landingPath =
      typeof body.landingPath === "string" ? body.landingPath.trim() : undefined

    if (otpActive && (!code || code.length < 4 || code.length > 8)) {
      return NextResponse.json(
        { error: "invalid_code" },
        { status: 400 }
      )
    }

    const validation = validateLeadForm(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { data } = validation
    const normalizedPhone = normalizePhoneForLookup(data.phone)
    const phoneDigits = normalizePhoneDigits(data.phone)

    if (!normalizedPhone || !phoneDigits) {
      return NextResponse.json(
        { error: "A valid phone number is required." },
        { status: 400 }
      )
    }

    // Rate limit: 10 verify attempts per phone per hour
    if (!checkRateLimit(`verify:${phoneDigits}`, 10, 3_600_000)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      )
    }

    // Also rate limit by IP
    if (!checkRateLimit(`verify-ip:${clientIp}`, 20, 3_600_000)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      )
    }

    // -----------------------------------------------------------------------
    // Step 1: Resolve org + credentials
    // -----------------------------------------------------------------------
    const organizationId = getPlatformOrganizationId()
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      )
    }

    const convex = getConvexClient()

    // -----------------------------------------------------------------------
    // Step 2: Verify OTP via Twilio (skipped when OTP is not active)
    // -----------------------------------------------------------------------
    if (otpActive) {
      const verifyService = await resolveTwilioVerifyService(convex, organizationId)
      const check = await verifyService.verificationChecks.create({
        to: normalizedPhone,
        code,
      })

      if (check.status !== "approved") {
        return NextResponse.json(
          { error: "invalid_code" },
          { status: 400 }
        )
      }
    }

    // -----------------------------------------------------------------------
    // Step 3: Convex operations (intent + CRM contact + pipeline)
    // -----------------------------------------------------------------------
    const now = Date.now()

    // Create demo call intent
    const intentId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
        subtype: "one_of_one_landing",
        name: `landing-lead:${data.requestedAgentKey}:${phoneDigits}:${now}`,
        status: "pending",
        customProperties: {
          source: "one_of_one_landing",
          phoneNormalized: normalizedPhone,
          phoneDigits,
          requestedAgentKey: data.requestedAgentKey,
          requestedAgentName: data.requestedAgentName,
          requestedPersonaName: data.requestedPersonaName,
          language: data.language,
          landingPath,
          leadEmail: data.email,
          leadFirstName: data.firstName,
          leadLastName: data.lastName,
          verified: otpActive,
          createdAt: now,
          updatedAt: now,
          expiresAt: now + LANDING_DEMO_CALL_INTENT_TTL_MS,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // Create CRM contact
    const contactId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "crm_contact",
        subtype: "lead",
        name: `${data.firstName} ${data.lastName}`,
        status: "active",
        customProperties: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: normalizedPhone,
          source: "landing_lead_capture",
          sourceRef: `seven-agents:${data.requestedAgentKey}`,
          tags: ["seven-agents", "landing-page"],
          notes: `Requested agent: ${data.requestedPersonaName} (${data.requestedAgentName}). Language: ${data.language}.`,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // Add to pipeline (if configured)
    const pipelineId = process.env.SEVEN_AGENTS_PIPELINE_ID?.trim()
    const firstStageId = process.env.SEVEN_AGENTS_FIRST_STAGE_ID?.trim()

    if (pipelineId && firstStageId && contactId) {
      try {
        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.insertObjectLinkInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            fromObjectId: contactId as Id<"objects">,
            toObjectId: firstStageId as Id<"objects">,
            linkType: "in_pipeline",
            properties: {
              pipelineId: pipelineId as Id<"objects">,
              movedAt: now,
              aiData: { score: 0, confidence: 0, reasoning: [] },
            },
            createdAt: now,
          }
        )
      } catch (pipelineError) {
        // Non-fatal: log but don't fail the request
        console.error("[LeadCapture:Verify] Pipeline link failed:", pipelineError)
      }
    }

    // -----------------------------------------------------------------------
    // Step 4: Emails + Outbound call (in parallel — all non-fatal)
    // -----------------------------------------------------------------------
    const emailAndCallPromises: Promise<unknown>[] = []

    // Resolve Resend API key from org settings (with env fallback)
    let resendApiKey: string | null = null
    try {
      resendApiKey = await resolveResendApiKey(convex, organizationId)
    } catch (err) {
      console.error("[LeadCapture:Verify] Resend key resolution failed:", err)
    }

    // Sales notification email
    const salesEmail = process.env.LANDING_LEAD_SALES_EMAIL?.trim()
    const fromEmail =
      process.env.LANDING_LEAD_FROM_EMAIL?.trim() ||
      "sevenlayers <team@mail.sevenlayers.io>"

    if (salesEmail && resendApiKey) {
      emailAndCallPromises.push(
        sendSalesEmail(resendApiKey, fromEmail, salesEmail, data).catch((err) =>
          console.error("[LeadCapture:Verify] Sales email failed:", err)
        )
      )
    }

    // Lead confirmation email
    if (resendApiKey) {
      emailAndCallPromises.push(
        sendConfirmationEmail(resendApiKey, fromEmail, data).catch((err) =>
          console.error("[LeadCapture:Verify] Confirmation email failed:", err)
        )
      )
    }

    // Outbound call via ElevenLabs
    const outboundPhoneId = process.env.LANDING_OUTBOUND_PHONE_NUMBER_ID?.trim()
    let elevenLabsApiKey: string | null = null
    try {
      const elCreds = await queryInternal(
        convex,
        generatedInternalApi.integrations.elevenlabs.resolveCredentials,
        { organizationId: organizationId as Id<"organizations"> }
      ) as { apiKey: string } | null
      elevenLabsApiKey = elCreds?.apiKey ?? null
    } catch (err) {
      console.warn("[LeadCapture:Verify] ElevenLabs resolver failed, falling back to env:", err)
      elevenLabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() ?? null
    }

    if (outboundPhoneId && elevenLabsApiKey) {
      emailAndCallPromises.push(
        triggerOutboundCall({
          apiKey: elevenLabsApiKey,
          agentId: resolveClaraAgentId(),
          phoneNumberId: outboundPhoneId,
          toNumber: normalizedPhone,
          leadName: data.firstName,
          requestedAgent: data.requestedPersonaName,
        }).catch((err) =>
          console.error("[LeadCapture:Verify] Outbound call failed:", err)
        )
      )
    }

    await Promise.all(emailAndCallPromises)

    return NextResponse.json(
      {
        ok: true,
        intentId,
        contactId,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    console.error("[LeadCapture:Verify] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Verification failed",
      },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Email senders
// ---------------------------------------------------------------------------

async function sendSalesEmail(
  apiKey: string,
  from: string,
  to: string,
  data: import("@/lib/lead-capture").LeadCaptureFormData
) {
  const resend = createResendClient(apiKey)
  await resend.emails.send({
    from,
    to,
    replyTo: data.email,
    subject: buildSalesNotificationSubject(data),
    html: buildSalesNotificationHtml(data),
    headers: {
      "X-Entity-Ref-ID": `lead-sales-${Date.now()}`,
    },
  })
}

async function sendConfirmationEmail(
  apiKey: string,
  from: string,
  data: import("@/lib/lead-capture").LeadCaptureFormData
) {
  const resend = createResendClient(apiKey)
  await resend.emails.send({
    from,
    to: data.email,
    replyTo: process.env.LANDING_LEAD_SALES_EMAIL || "sales@sevenlayers.io",
    subject: buildLeadConfirmationSubject(data),
    html: buildLeadConfirmationHtml(data),
    headers: {
      "X-Entity-Ref-ID": `lead-confirm-${Date.now()}`,
    },
  })
}

// ---------------------------------------------------------------------------
// ElevenLabs outbound call
// ---------------------------------------------------------------------------

async function triggerOutboundCall(args: {
  apiKey: string
  agentId: string
  phoneNumberId: string
  toNumber: string
  leadName: string
  requestedAgent: string
}) {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    {
      method: "POST",
      headers: {
        "xi-api-key": args.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: args.agentId,
        agent_phone_number_id: args.phoneNumberId,
        to_number: args.toNumber,
        conversation_initiation_client_data: {
          dynamic_variables: {
            lead_name: args.leadName,
            requested_agent: args.requestedAgent,
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `ElevenLabs outbound call failed (${response.status}): ${errorBody}`
    )
  }

  const result = (await response.json()) as {
    success?: boolean
    conversation_id?: string
    callSid?: string
  }
  return result
}
