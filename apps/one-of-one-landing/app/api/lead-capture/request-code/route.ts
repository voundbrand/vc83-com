export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import twilio from "twilio"
import type { Id } from "../../../../../../convex/_generated/dataModel"
import { normalizePhoneForLookup } from "@/lib/demo-call"
import { checkRateLimit, maskPhone, validateLeadForm } from "@/lib/lead-capture"
import {
  getConvexClient,
  getPlatformOrganizationId,
  actionInternal,
} from "@/lib/server-convex"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal

async function resolveTwilioVerifyService() {
  const organizationId = getPlatformOrganizationId()
  if (organizationId) {
    try {
      const convex = getConvexClient()
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
      console.warn("[LeadCapture:RequestCode] Convex resolver failed, falling back to env:", err)
    }
  }

  // Fallback: direct env vars (in case Convex is unreachable)
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifySid) {
    throw new Error("Twilio Verify is not configured")
  }

  const client = twilio(accountSid, authToken)
  return client.verify.v2.services(verifySid)
}

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

export async function POST(request: Request) {
  try {
    const clientIp = resolveClientIp(request)

    // Rate limit: 5 code requests per IP per hour
    if (!checkRateLimit(`request-code:${clientIp}`, 5, 3_600_000)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const validation = validateLeadForm(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { data } = validation
    const normalizedPhone = normalizePhoneForLookup(data.phone)

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "A valid phone number with country code is required." },
        { status: 400 }
      )
    }

    // OTP toggle: when disabled, skip Twilio and return immediately
    const otpActive = process.env.NEXT_PUBLIC_LEAD_CAPTURE_OTP_ACTIVE !== "false"

    if (!otpActive) {
      return NextResponse.json(
        {
          ok: true,
          phoneMasked: maskPhone(normalizedPhone),
          otpSkipped: true,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    // Send SMS verification code via Twilio Verify
    const verifyService = await resolveTwilioVerifyService()
    await verifyService.verifications.create({
      to: normalizedPhone,
      channel: "sms",
    })

    return NextResponse.json(
      {
        ok: true,
        phoneMasked: maskPhone(normalizedPhone),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    console.error("[LeadCapture:RequestCode] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send verification code",
      },
      { status: 500 }
    )
  }
}
