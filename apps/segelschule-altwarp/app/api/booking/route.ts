export const dynamic = "force-dynamic"

import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  getConvexClient,
  queryInternal,
  mutateInternal,
  actionInternal,
  resolveSegelschuleOrganizationId,
} from "@/lib/server-convex"
import {
  checkRateLimit,
  resolveClientIp,
  createResendClient,
  escapeHtml,
  buildBookingConfirmationHtml,
  buildBookingNotificationHtml,
  type BookingEmailData,
} from "@/lib/email"
import {
  normalizeBookingEmailExecutionControl,
  resolveBookingEmailRecipients,
  summarizeBookingEmailAttachments,
  type BookingEmailExecutionControl,
  type BookingEmailAttachmentSummary,
} from "@/lib/booking-email-execution"
import {
  normalizeSeatSelections,
  parseBookingStartTimestamp,
  resolveSegelschuleBookingCourse,
} from "@/lib/booking-platform-bridge"
import { mapToResourceSeatSelections } from "@/lib/booking-runtime-contracts"
import { resolveSlotSeatInventory } from "@/lib/seat-group-availability"

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../../../../../convex/_generated/api")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any = generatedApi.internal
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedPublicApi: any = generatedApi.api

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface BookingPayload {
  courseId: string
  date: string
  time: string
  seats: { boatId?: string; boatName: string; seatNumbers: number[] }[]
  totalSeats: number
  termsAccepted: boolean
  formData: {
    name: string
    email: string
    phone: string
    message?: string
    tshirtSize?: string
    needsAccommodation?: boolean
  }
  paymentMethod?: string
  language: string
}

interface BridgeCheckoutSessionResult {
  sessionId: string
  clientSecret: string | null
  amount: number
  currency: string
  expiresAt: number
  checkoutUrl: string | null
}

interface BridgeCheckoutFulfillmentResult {
  success: boolean
  purchasedItemIds: string[]
  crmContactId?: Id<"objects">
  paymentId: string
  amount: number
  currency: string
  isGuestRegistration: boolean
  frontendUserId?: Id<"objects">
  invoiceType?: "employer" | "manual_b2b" | "manual_b2c" | "receipt" | "none"
}

interface BridgeCalendarConnectionDiagnostics {
  connectionId: string
  provider: string
  status: string | null
  syncEnabled: boolean
  canWriteCalendar: boolean
  pushCalendarId: string | null
  writeReady: boolean
  issues: string[]
}

interface BridgeCalendarDiagnostics {
  checkedAt: number
  linkedConnectionCount: number
  writeReadyConnectionCount: number
  writeReady: boolean
  issues: string[]
  recommendations: string[]
  connections: BridgeCalendarConnectionDiagnostics[]
  bookingStatus: string
  calendarPushScheduled: boolean
  calendarPushScheduledAt: number | null
}

interface RouterObjectRecord {
  _id: Id<"objects">
  organizationId?: Id<"organizations"> | string
  type?: string
  subtype?: string
  status?: string
  customProperties?: Record<string, unknown>
}

interface CheckoutTicketProductResolution {
  productId: Id<"objects"> | null
  product: RouterObjectRecord | null
  warnings: string[]
}

interface RouterTicketRecord extends RouterObjectRecord {
  createdAt?: number
  updatedAt?: number
}

interface RouteTransactionLineItem {
  productId?: string | null
  productName?: string | null
  productSubtype?: string | null
  quantity?: number | null
  totalPriceInCents?: number | null
  unitPriceInCents?: number | null
  ticketId?: string | null
}

interface RouteTransactionRecord extends RouterObjectRecord {
  createdAt?: number
  updatedAt?: number
  customProperties?: Record<string, unknown> & {
    checkoutSessionId?: string
    totalInCents?: number
    currency?: string
    lineItems?: RouteTransactionLineItem[]
  }
}

interface BookingWorkflowDispatchResult {
  ok: boolean
  checkedAt: number
  triggerType: string
  dispatchedWorkflows: number
  workflows: Array<{
    workflowId: string
    workflowName: string
    triggerNodeIds: string[]
  }>
  errors?: string[]
}

interface BridgeTicketContextResult {
  ticketId: string
  ticketCode: string
  holderEmail: string | null
  holderName: string | null
  lookupUrl: string | null
}

interface CapturedBookingEmailPreview {
  kind: "customer_confirmation" | "operator_notification"
  to: string[]
  subject: string
  html: string
  attachments: BookingEmailAttachmentSummary[]
}

interface BookingEmailDeliveryRecord {
  kind: "customer_confirmation" | "operator_notification"
  to: string[]
  subject: string
  transport: "resend_direct" | "ticket_generation_fallback"
  success: boolean
  messageId: string | null
  error: string | null
}

interface RouteFixtureOptions {
  ignoreOutsideAvailability: boolean
}

const TICKET_CODE_PREFIX = "SA-"
const TICKET_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  return normalized ? normalized.toLowerCase() : null
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function resolveLocaleFromLanguage(language: string): string {
  if (language === "de" || language === "ch") {
    return "de-DE"
  }
  if (language === "nl") {
    return "nl-NL"
  }
  return "en-US"
}

function formatCurrencyAmount(args: {
  amountInCents: number
  currency: string
  language: string
}): string {
  try {
    return new Intl.NumberFormat(resolveLocaleFromLanguage(args.language), {
      style: "currency",
      currency: args.currency || "EUR",
    }).format(args.amountInCents / 100)
  } catch {
    return `${args.currency || "EUR"} ${(args.amountInCents / 100).toFixed(2)}`
  }
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return String(error)
}

function extractResendMessageId(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null
  }

  const record = result as {
    id?: unknown
    data?: { id?: unknown } | null
  }

  return (
    normalizeOptionalString(record.id)
    || normalizeOptionalString(record.data?.id)
  )
}

function extractResendErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null
  }

  const record = result as {
    error?: {
      message?: unknown
      name?: unknown
    } | null
  }

  return (
    normalizeOptionalString(record.error?.message)
    || normalizeOptionalString(record.error?.name)
  )
}

function normalizeCheckoutUrl(value: unknown): string | null {
  return normalizeOptionalString(value)
}

function pushWarningOnce(warnings: string[], code: string): void {
  if (!warnings.includes(code)) {
    warnings.push(code)
  }
}

function normalizeTicketCode(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return null
  }
  const upper = normalized.toUpperCase()
  if (!/^SA-[A-Z0-9]{7}$/.test(upper)) {
    return null
  }
  return upper
}

function generateTicketCode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const bytes = randomBytes(7)
    let suffix = ""
    for (let index = 0; index < 7; index += 1) {
      suffix += TICKET_CODE_ALPHABET[bytes[index] % TICKET_CODE_ALPHABET.length]
    }
    const nextCode = `${TICKET_CODE_PREFIX}${suffix}`
    if (!existingCodes.has(nextCode)) {
      existingCodes.add(nextCode)
      return nextCode
    }
  }
  throw new Error("Unable to generate a unique ticket code")
}

function buildTicketLookupUrl(args: {
  baseUrl: string | null
  ticketCode: string
  holderEmail: string | null
}): string | null {
  if (!args.baseUrl) {
    return null
  }
  const normalizedBase = args.baseUrl.replace(/\/+$/, "")
  const params = new URLSearchParams({ code: args.ticketCode })
  if (args.holderEmail) {
    params.set("email", args.holderEmail)
  }
  return `${normalizedBase}/ticket?${params.toString()}`
}

function hasTicketFulfillmentEnabled(
  candidate: RouterObjectRecord | null | undefined
): boolean {
  return normalizeOptionalString(candidate?.customProperties?.fulfillmentType) === "ticket"
}

function isTicketProductForOrg(
  candidate: RouterObjectRecord | null | undefined,
  organizationId: string
): boolean {
  if (!candidate) {
    return false
  }
  return (
    candidate.type === "product" &&
    (
      candidate.subtype === "ticket"
      || hasTicketFulfillmentEnabled(candidate)
    ) &&
    String(candidate.organizationId || "") === organizationId
  )
}

async function resolveTicketCheckoutProduct(args: {
  convex: ReturnType<typeof getConvexClient>
  organizationId: string
  configuredProductId?: string
}): Promise<CheckoutTicketProductResolution> {
  const warnings: string[] = []
  const normalizedConfiguredProductId = args.configuredProductId?.trim()

  if (normalizedConfiguredProductId) {
    const configuredProduct = (await queryInternal(
      args.convex,
      generatedInternalApi.channels.router.getObjectByIdInternal,
      {
        objectId: normalizedConfiguredProductId as Id<"objects">,
      }
    )) as RouterObjectRecord | null

    if (
      configuredProduct
      && isTicketProductForOrg(
        configuredProduct,
        args.organizationId
      )
    ) {
      return {
        productId: configuredProduct._id,
        product: configuredProduct,
        warnings,
      }
    }

    if (!configuredProduct) {
      warnings.push("checkout_product_not_found")
    } else if (
      String(configuredProduct.organizationId || "") !== args.organizationId
    ) {
      warnings.push("checkout_product_wrong_organization")
    } else if (configuredProduct.type !== "product") {
      warnings.push("checkout_product_invalid_type")
    } else {
      warnings.push("checkout_product_not_ticket_subtype")
    }
  } else {
    warnings.push("checkout_product_binding_missing")
  }
  return {
    productId: null,
    product: null,
    warnings,
  }
}

function validateBookingPayload(
  body: Record<string, unknown>
): { valid: true; data: BookingPayload } | { valid: false; error: string } {
  const legacyCourse = asRecord(body.course)
  const courseId =
    normalizeOptionalString(body.courseId)
    || normalizeOptionalString(legacyCourse.id)
  const date = typeof body.date === "string" ? body.date.trim() : ""
  const time = typeof body.time === "string" ? body.time.trim() : ""
  const seats = body.seats as BookingPayload["seats"] | undefined
  const totalSeats = typeof body.totalSeats === "number" ? body.totalSeats : 0
  const termsAccepted =
    body.termsAccepted === true
    || body.acceptTerms === true
    || body.agreeToTerms === true
  const formData = body.formData as BookingPayload["formData"] | undefined
  const paymentMethod = normalizeOptionalString(body.paymentMethod) || "invoice"
  const language =
    typeof body.language === "string" ? body.language.trim() : "de"

  if (!courseId) {
    return { valid: false, error: "Course selection is required." }
  }
  if (!date) {
    return { valid: false, error: "Date is required." }
  }
  if (!time) {
    return { valid: false, error: "Time is required." }
  }
  if (!seats || !Array.isArray(seats) || seats.length === 0) {
    return { valid: false, error: "At least one seat must be selected." }
  }
  if (totalSeats < 1) {
    return { valid: false, error: "At least one participant is required." }
  }
  if (!formData?.name?.trim()) {
    return { valid: false, error: "Name is required." }
  }
  if (!formData?.email?.trim() || !EMAIL_RE.test(formData.email)) {
    return { valid: false, error: "A valid email is required." }
  }
  if (!formData?.phone?.trim()) {
    return { valid: false, error: "Phone number is required." }
  }
  if (!termsAccepted) {
    return { valid: false, error: "Terms acceptance is required." }
  }

  return {
    valid: true,
    data: {
      courseId,
      date,
      time,
      seats,
      totalSeats,
      termsAccepted,
      formData: {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message?.trim() || undefined,
        tshirtSize: formData.tshirtSize?.trim() || undefined,
        needsAccommodation: formData.needsAccommodation || false,
      },
      paymentMethod,
      language,
    },
  }
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
      "[Booking] Resend resolver failed, falling back to env:",
      err
    )
  }

  const envKey = process.env.RESEND_API_KEY
  if (!envKey) throw new Error("RESEND_API_KEY is not configured")
  return envKey
}

type BookingEmailSenderProfile = {
  fromEmail: string
  replyToEmail: string | null
  source: "domain_config" | "env" | "legacy_default"
}

function formatSenderAddress(displayName: string, senderEmail: string): string {
  return senderEmail.includes("<")
    ? senderEmail
    : `${displayName} <${senderEmail}>`
}

async function resolveBookingEmailSenderProfile(
  convex: ReturnType<typeof getConvexClient>,
  organizationId: string
): Promise<BookingEmailSenderProfile> {
  try {
    const domainConfigs = (await queryInternal(
      convex,
      generatedInternalApi.domainConfigOntology.listDomainConfigsForOrg,
      {
        organizationId: organizationId as Id<"organizations">,
      }
    )) as RouterObjectRecord[] | null

    const primaryDomainConfig = Array.isArray(domainConfigs)
      ? domainConfigs.find((config) => config.status === "active") || domainConfigs[0] || null
      : null
    const emailSettings =
      primaryDomainConfig?.customProperties?.email
      && typeof primaryDomainConfig.customProperties.email === "object"
        ? (primaryDomainConfig.customProperties.email as Record<string, unknown>)
        : null
    const senderEmail = normalizeOptionalString(emailSettings?.senderEmail)
    const replyToEmail = normalizeOptionalString(emailSettings?.replyToEmail)

    if (senderEmail) {
      return {
        fromEmail: formatSenderAddress("Segelschule Altwarp", senderEmail),
        replyToEmail,
        source: "domain_config",
      }
    }
  } catch (error) {
    console.warn(
      "[Booking] Failed to resolve domain-config sender, falling back to env sender:",
      error
    )
  }

  const envSender =
    normalizeOptionalString(process.env.BOOKING_FROM_EMAIL)
    || normalizeOptionalString(process.env.AUTH_RESEND_FROM)
  const envReplyTo =
    normalizeOptionalString(process.env.BOOKING_REPLY_TO_EMAIL)
    || normalizeOptionalString(process.env.REPLY_TO_EMAIL)

  if (envSender) {
    return {
      fromEmail: formatSenderAddress("Segelschule Altwarp", envSender),
      replyToEmail: envReplyTo,
      source: "env",
    }
  }

  return {
    fromEmail: "Segelschule Altwarp <noreply@segelschule-altwarp.de>",
    replyToEmail: envReplyTo,
    source: "legacy_default",
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeOptionalString(entry))
      .filter((entry): entry is string => Boolean(entry))
  }

  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return []
  }

  try {
    const parsed = JSON.parse(normalized) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => Boolean(entry))
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return normalized
    .split(",")
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function uniqueNotificationEmails(values: Array<string | null | undefined>): string[] {
  const emails: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const normalized = normalizeEmail(value)
    if (!normalized || !EMAIL_RE.test(normalized) || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    emails.push(normalized)
  }

  return emails
}

function resolveRouteEmailExecutionControl(args: {
  request: Request
  body: Record<string, unknown>
}):
  | { ok: true; control: BookingEmailExecutionControl; authorized: boolean }
  | { ok: false; response: NextResponse } {
  const rawControl = args.body.emailExecutionControl
  if (typeof rawControl === "undefined") {
    return {
      ok: true,
      control: normalizeBookingEmailExecutionControl(undefined),
      authorized: false,
    }
  }

  const expectedToken =
    normalizeOptionalString(process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN)
  const providedToken =
    normalizeOptionalString(
      args.request.headers.get("x-segelschule-fixture-token")
    )

  if (!expectedToken || providedToken !== expectedToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "fixture_email_control_forbidden" },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    control: normalizeBookingEmailExecutionControl(rawControl),
    authorized: true,
  }
}

function resolveRouteFixtureOptions(args: {
  request: Request
  body: Record<string, unknown>
}):
  | { ok: true; options: RouteFixtureOptions; authorized: boolean }
  | { ok: false; response: NextResponse } {
  const rawOptions = args.body.fixtureOptions
  if (!rawOptions || typeof rawOptions !== "object" || Array.isArray(rawOptions)) {
    return {
      ok: true,
      options: {
        ignoreOutsideAvailability: false,
      },
      authorized: false,
    }
  }

  const expectedToken =
    normalizeOptionalString(process.env.SEGELSCHULE_BOOKING_FIXTURE_TOKEN)
  const providedToken =
    normalizeOptionalString(
      args.request.headers.get("x-segelschule-fixture-token")
    )

  if (!expectedToken || providedToken !== expectedToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "fixture_execution_forbidden" },
        { status: 403 }
      ),
    }
  }

  const record = rawOptions as Record<string, unknown>
  return {
    ok: true,
    options: {
      ignoreOutsideAvailability: record.ignoreOutsideAvailability === true,
    },
    authorized: true,
  }
}

async function resolveBookingNotificationRecipients(args: {
  convex: ReturnType<typeof getConvexClient>
  organizationId: string
}): Promise<string[]> {
  try {
    const settings = (await queryInternal(
      args.convex,
      generatedInternalApi.bookingWorkflowAutomation
        .getBookingNotificationSettingsInternal,
      {
        organizationId: args.organizationId as Id<"organizations">,
      }
    )) as RouterObjectRecord | null
    const settingsProps = (settings?.customProperties || {}) as Record<string, unknown>

    const contacts = (await queryInternal(
      args.convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      {
        organizationId: args.organizationId as Id<"organizations">,
        type: "organization_contact",
      }
    )) as RouterObjectRecord[]

    return uniqueNotificationEmails([
      ...normalizeStringArray(settingsProps.operatorEmails),
      ...contacts.flatMap((contact) => {
        const props = (contact.customProperties || {}) as Record<string, unknown>
        return [
          normalizeOptionalString(props.contactEmail),
          normalizeOptionalString(props.primaryEmail),
          normalizeOptionalString(props.supportEmail),
        ]
      }),
      process.env.BOOKING_NOTIFICATION_EMAIL?.trim() || null,
    ])
  } catch (error) {
    console.warn("[Booking] Failed to resolve operator notification recipients:", error)
    return uniqueNotificationEmails([
      process.env.BOOKING_NOTIFICATION_EMAIL?.trim() || null,
    ])
  }
}

async function mergeObjectCustomProperties(args: {
  convex: ReturnType<typeof getConvexClient>
  objectId: Id<"objects">
  additions: Record<string, unknown>
}): Promise<void> {
  const existing = (await queryInternal(
    args.convex,
    generatedInternalApi.channels.router.getObjectByIdInternal,
    { objectId: args.objectId }
  )) as RouterObjectRecord | null

  await mutateInternal(
    args.convex,
    generatedInternalApi.channels.router.patchObjectInternal,
    {
      objectId: args.objectId,
      customProperties: {
        ...((existing?.customProperties || {}) as Record<string, unknown>),
        ...args.additions,
      },
      updatedAt: Date.now(),
    }
  )
}

// ---------------------------------------------------------------------------
// POST /api/booking
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const clientIp = resolveClientIp(request)

    // Rate limit: 3 bookings per IP per hour
    if (!checkRateLimit(`booking-ip:${clientIp}`, 3, 3_600_000)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const emailExecutionResolution = resolveRouteEmailExecutionControl({
      request,
      body,
    })
    if (!emailExecutionResolution.ok) {
      return emailExecutionResolution.response
    }
    const fixtureOptionsResolution = resolveRouteFixtureOptions({
      request,
      body,
    })
    if (!fixtureOptionsResolution.ok) {
      return fixtureOptionsResolution.response
    }

    const validation = validateBookingPayload(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { data } = validation
    const emailExecutionControl = emailExecutionResolution.control
    const fixtureOptions = fixtureOptionsResolution.options
    const capturedEmailPreviews: CapturedBookingEmailPreview[] = []
    const requestOrigin = (() => {
      try {
        return new URL(request.url).origin
      } catch {
        return null
      }
    })()
    const ticketLookupBaseUrl =
      normalizeOptionalString(requestOrigin)
      || normalizeOptionalString(process.env.NEXTAUTH_URL)
      || normalizeOptionalString(process.env.NEXT_PUBLIC_SITE_URL)
      || null

    // Resolve org
    const organizationId = await resolveSegelschuleOrganizationId({
      requestHost: request.headers.get("host"),
    })
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      )
    }

    const convex = getConvexClient()
    const courseResolution = await resolveSegelschuleBookingCourse({
      convex,
      queryInternalFn: queryInternal,
      generatedInternalApi,
      organizationId,
      courseId: data.courseId,
      language: data.language,
    })
    const runtimeResolution = courseResolution.runtimeResolution
    const bookingRuntimeConfig = runtimeResolution.runtimeConfig
    const resolvedCourse = courseResolution.course
    if (!resolvedCourse || !courseResolution.resolvedCourseId) {
      return NextResponse.json(
        { error: "Unknown course for selected booking surface" },
        { status: 404 }
      )
    }
    if (!resolvedCourse.bookingResourceId) {
      return NextResponse.json(
        { error: "Selected course is missing its availability resource." },
        { status: 503 }
      )
    }
    if (resolvedCourse.fulfillmentType !== "ticket") {
      return NextResponse.json(
        { error: "Selected course is not configured for ticket fulfillment." },
        { status: 503 }
      )
    }

    const normalizedSeatSelection = normalizeSeatSelections({
      selections: data.seats,
      boats: bookingRuntimeConfig.boats,
    })
    if (normalizedSeatSelection.errors.length > 0) {
      return NextResponse.json(
        { error: normalizedSeatSelection.errors[0] },
        { status: 400 }
      )
    }
    if (normalizedSeatSelection.totalSeats < 1) {
      return NextResponse.json(
        { error: "At least one seat must be selected." },
        { status: 400 }
      )
    }
    if (normalizedSeatSelection.totalSeats !== data.totalSeats) {
      return NextResponse.json(
        { error: "Selected seats do not match participant count." },
        { status: 400 }
      )
    }

    const checkoutProductResolution = await resolveTicketCheckoutProduct({
      convex,
      organizationId,
      configuredProductId: resolvedCourse.checkoutProductId || undefined,
    })
    if (!checkoutProductResolution.productId) {
      return NextResponse.json(
        {
          error: "Selected course is missing its commercial checkout product.",
          warnings: [
            ...runtimeResolution.warnings,
            ...resolvedCourse.warnings,
            ...checkoutProductResolution.warnings,
          ],
        },
        { status: 503 }
      )
    }

    let resendApiKey: string | null = null
    try {
      resendApiKey = await resolveResendApiKey(convex, organizationId)
    } catch (err) {
      console.error("[Booking] Resend key resolution failed:", err)
    }

    const notificationRecipients = await resolveBookingNotificationRecipients({
      convex,
      organizationId,
    })
    const bookingStartAt = parseBookingStartTimestamp(
      data.date,
      data.time,
      bookingRuntimeConfig.timezone
    )
    const now = Date.now()
    if (resolvedCourse.priceInCents <= 0) {
      return NextResponse.json(
        { error: "Selected course is missing a valid commercial price." },
        { status: 503 }
      )
    }
    const totalAmountCents =
      resolvedCourse.priceInCents * normalizedSeatSelection.totalSeats
    const coursePriceDisplay = formatCurrencyAmount({
      amountInCents: resolvedCourse.priceInCents,
      currency: resolvedCourse.currency,
      language: data.language,
    })

    // Split name for CRM (first word → firstName, rest → lastName)
    const nameParts = data.formData.name.split(/\s+/)
    const firstName = nameParts[0] || data.formData.name
    const lastName = nameParts.slice(1).join(" ") || ""

    // -----------------------------------------------------------------
    // Create booking object
    // -----------------------------------------------------------------
    const bookingId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "booking",
        subtype: "class_enrollment",
        name: `${resolvedCourse.title} - ${data.formData.name} - ${data.date}`,
        status: "pending_confirmation",
        customProperties: {
          source: "segelschule_landing",
          requestedCourseId: data.courseId,
          courseId: resolvedCourse.courseId,
          courseAliases: resolvedCourse.aliases,
          courseName: resolvedCourse.title,
          courseDescription: resolvedCourse.description,
          courseDurationLabel: resolvedCourse.durationLabel,
          courseDurationMinutes: resolvedCourse.durationMinutes,
          coursePrice: coursePriceDisplay,
          coursePriceInCents: resolvedCourse.priceInCents,
          courseCurrency: resolvedCourse.currency,
          isMultiDay: resolvedCourse.isMultiDay,
          checkoutProductId: String(checkoutProductResolution.productId),
          bookingResourceId: resolvedCourse.bookingResourceId,
          fulfillmentType: resolvedCourse.fulfillmentType,
          date: data.date,
          time: data.time,
          bookingStartAt,
          bookingTimezone: bookingRuntimeConfig.timezone,
          seats: normalizedSeatSelection.selections,
          totalSeats: normalizedSeatSelection.totalSeats,
          customerName: data.formData.name,
          customerEmail: data.formData.email,
          customerPhone: data.formData.phone,
          firstName,
          lastName,
          message: data.formData.message,
          tshirtSize: data.formData.tshirtSize,
          needsAccommodation: data.formData.needsAccommodation,
          paymentMethod: data.paymentMethod || "invoice",
          termsAccepted: data.termsAccepted,
          termsAcceptedAt: now,
          totalAmountCents,
          language: data.language,
          ...(emailExecutionResolution.authorized
            ? {
                fixtureKey: emailExecutionControl.fixtureKey,
                fixtureLabel: emailExecutionControl.fixtureLabel,
                emailExecutionMode: emailExecutionControl.mode,
                emailCaptureEnabled: emailExecutionControl.capturePreviews,
              }
            : {}),
          ...(fixtureOptionsResolution.authorized
            ? {
                fixtureIgnoreOutsideAvailability:
                  fixtureOptions.ignoreOutsideAvailability,
              }
            : {}),
          createdAt: now,
          updatedAt: now,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // -----------------------------------------------------------------
    // Create CRM contact
    // -----------------------------------------------------------------
    const contactId = await mutateInternal(
      convex,
      generatedInternalApi.channels.router.insertObjectInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: "crm_contact",
        subtype: "customer",
        name: data.formData.name,
        status: "active",
        customProperties: {
          firstName,
          lastName,
          email: data.formData.email,
          phone: data.formData.phone,
          source: "segelschule_landing",
          sourceRef: `booking:${resolvedCourse.courseId}`,
          tags: ["segelschule_landing", "booking", resolvedCourse.courseId],
          notes: `Booked ${resolvedCourse.title} on ${data.date} at ${data.time}. ${normalizedSeatSelection.totalSeats} seat(s).`,
        },
        createdAt: now,
        updatedAt: now,
      }
    )

    // -----------------------------------------------------------------
    // Mother repo bridge: frontend account + optional booking/checkout
    // -----------------------------------------------------------------
    const bridgeWarnings: string[] = [
      ...runtimeResolution.warnings,
      ...resolvedCourse.warnings,
      ...checkoutProductResolution.warnings,
    ]
    let frontendUserId: Id<"objects"> | null = null
    let platformBookingId: Id<"objects"> | null = null
    let checkoutProductId: Id<"objects"> | null =
      checkoutProductResolution.productId
    let checkoutSession: BridgeCheckoutSessionResult | null = null
    let checkoutSessionObjectId: Id<"objects"> | null = null
    let checkoutFulfillmentResult: BridgeCheckoutFulfillmentResult | null = null
    let calendarDiagnostics: BridgeCalendarDiagnostics | null = null
    let ticketContexts: BridgeTicketContextResult[] = []
    let primaryTicketContext: BridgeTicketContextResult | null = null
    let resourceBookingBridgeError: string | null = null

    try {
      frontendUserId = await mutateInternal(
        convex,
        generatedInternalApi.auth.createOrGetGuestUser,
        {
          email: data.formData.email.toLowerCase(),
          firstName,
          lastName: lastName || undefined,
          organizationId: organizationId as Id<"organizations">,
        }
      )

      await mutateInternal(
        convex,
        generatedInternalApi.auth.linkFrontendUserToCRM,
        {
          userId: frontendUserId,
          email: data.formData.email.toLowerCase(),
          organizationId: organizationId as Id<"organizations">,
        }
      )
    } catch (bridgeError) {
      bridgeWarnings.push("frontend_account_bridge_failed")
      console.error("[Booking Bridge] frontend account wiring failed:", bridgeError)
    }

    const startDateTime = bookingStartAt
    if (!startDateTime) {
      bridgeWarnings.push("invalid_booking_datetime")
    } else {
      const bookingDurationMinutes = resolvedCourse.durationMinutes

      try {
        const slotSeatInventory = await resolveSlotSeatInventory({
          convex,
          queryInternalFn: queryInternal,
          generatedInternalApi,
          organizationId,
          bookingResourceId: resolvedCourse.bookingResourceId,
          boats: bookingRuntimeConfig.boats,
          startDateTime,
          endDateTime: startDateTime + bookingDurationMinutes * 60_000,
          timezone: bookingRuntimeConfig.timezone,
        })
        if (slotSeatInventory.seatInventory.groups.length === 0) {
          throw new Error("No boats are available for the selected date/time.")
        }

        const availableBoatIds = new Set(slotSeatInventory.availableGroupIds)
        const unavailableSelectedBoats = normalizedSeatSelection.selections
          .filter((selection) => !availableBoatIds.has(selection.boatId))
          .map((selection) => selection.boatName || selection.boatId)

        if (unavailableSelectedBoats.length > 0) {
          throw new Error(
            unavailableSelectedBoats.length === 1
              ? `${unavailableSelectedBoats[0]} is not available for the selected date/time.`
              : `These boats are not available for the selected date/time: ${unavailableSelectedBoats.join(", ")}.`
          )
        }

        const resourceSeatSelections = mapToResourceSeatSelections(
          normalizedSeatSelection.selections
        )
        const platformBookingResult = await mutateInternal(
          convex,
          generatedInternalApi.api.v1.resourceBookingsInternal
            .customerCheckoutInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            resourceId: resolvedCourse.bookingResourceId as Id<"objects">,
            startDateTime,
            endDateTime:
              startDateTime + bookingDurationMinutes * 60_000,
            timezone: bookingRuntimeConfig.timezone,
            customer: {
              firstName,
              lastName: lastName || firstName,
              email: data.formData.email,
              phone: data.formData.phone,
            },
            participants: normalizedSeatSelection.totalSeats,
            notes: data.formData.message,
            source: "segelschule_landing",
            seatSelections: resourceSeatSelections,
            seatInventory: slotSeatInventory.seatInventory,
            ...(fixtureOptions.ignoreOutsideAvailability
              ? { ignoreOutsideAvailability: true }
              : {}),
          }
        )

        platformBookingId = (platformBookingResult?.bookingId ||
          null) as Id<"objects"> | null
        calendarDiagnostics =
          (platformBookingResult?.calendarDiagnostics || null) as BridgeCalendarDiagnostics | null
        if (calendarDiagnostics && !calendarDiagnostics.writeReady) {
          pushWarningOnce(bridgeWarnings, "calendar_not_write_ready")
        }
        if (calendarDiagnostics && calendarDiagnostics.issues.length > 0) {
          for (const issueCode of calendarDiagnostics.issues) {
            pushWarningOnce(bridgeWarnings, issueCode)
          }
        }
        if (fixtureOptions.ignoreOutsideAvailability) {
          pushWarningOnce(bridgeWarnings, "fixture_outside_availability_override")
        }
      } catch (bridgeError) {
        bridgeWarnings.push("resource_booking_bridge_failed")
        resourceBookingBridgeError =
          bridgeError instanceof Error
            ? bridgeError.message
            : "No availability for the selected slot"
        console.error(
          "[Booking Bridge] resource booking checkout failed:",
          bridgeError
        )
      }
    }

    if (!platformBookingId) {
      try {
        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.patchObjectInternal,
          {
            objectId: bookingId,
            status: "cancelled",
            updatedAt: Date.now(),
          }
        )
      } catch (patchError) {
        console.error(
          "[Booking Bridge] failed to cancel local booking after resource booking failure:",
          patchError
        )
      }

      return NextResponse.json(
        {
          error:
            resourceBookingBridgeError ||
            "No availability for the selected date/time and seats.",
          bookingId,
          warnings: bridgeWarnings,
        },
        { status: 409 }
      )
    }

    if (checkoutProductId) {
      const checkoutQuantity = Math.max(1, normalizedSeatSelection.totalSeats)
      const checkoutCurrency = resolvedCourse.currency || "EUR"
      const pricePerUnit = resolvedCourse.priceInCents

      try {
        const createCheckoutSessionResult = (await mutateInternal(
          convex,
          generatedPublicApi.checkoutSessionOntology.createPublicCheckoutSession,
          {
            organizationId: organizationId as Id<"organizations">,
            customerEmail: data.formData.email,
            preferredLanguage: data.language,
          }
        )) as { checkoutSessionId: Id<"objects"> }

        checkoutSessionObjectId = createCheckoutSessionResult.checkoutSessionId
      } catch (bridgeError) {
        bridgeWarnings.push("checkout_session_create_failed")
        console.error(
          "[Booking Bridge] checkout session createPublicCheckoutSession failed:",
          bridgeError
        )
      }

      if (checkoutSessionObjectId) {
        let checkoutSessionUpdated = false
        try {
          await mutateInternal(
            convex,
            generatedPublicApi.checkoutSessionOntology.updatePublicCheckoutSession,
            {
              checkoutSessionId: checkoutSessionObjectId,
              updates: {
                customerEmail: data.formData.email,
                customerName: data.formData.name,
                customerPhone: data.formData.phone,
                customerNotes: data.formData.message,
                selectedProducts: [
                  {
                    productId: checkoutProductId,
                    quantity: checkoutQuantity,
                    pricePerUnit,
                    totalPrice: totalAmountCents,
                  },
                ],
                items: [
                  {
                    productId: checkoutProductId,
                    quantity: checkoutQuantity,
                  },
                ],
                subtotal: totalAmountCents,
                taxAmount: 0,
                totalAmount: totalAmountCents,
                currency: checkoutCurrency,
                paymentProvider: "invoice",
                stepProgress: [
                  "started",
                  "cart_completed",
                  "customer_completed",
                  "submitted_by_booking_api",
                ],
                currentStep: "submitted_by_booking_api",
                behaviorContext: {
                  metadata: {
                    source: "segelschule_landing_booking",
                    bookingId: String(bookingId),
                    platformBookingId: platformBookingId
                      ? String(platformBookingId)
                      : null,
                    frontendUserId: frontendUserId
                      ? String(frontendUserId)
                      : null,
                    contactId: String(contactId),
                    requestedCourseId: data.courseId,
                    courseId: resolvedCourse.courseId,
                    courseName: resolvedCourse.title,
                    courseDescription: resolvedCourse.description,
                    courseDurationLabel: resolvedCourse.durationLabel,
                    courseDurationMinutes: resolvedCourse.durationMinutes,
                    coursePriceInCents: resolvedCourse.priceInCents,
                    courseCurrency: resolvedCourse.currency,
                    checkoutProductId: String(checkoutProductId),
                    bookingResourceId: resolvedCourse.bookingResourceId,
                    fulfillmentType: resolvedCourse.fulfillmentType,
                    date: data.date,
                    time: data.time,
                    participants: normalizedSeatSelection.totalSeats,
                    seatSelections: normalizedSeatSelection.selections,
                    termsAccepted: data.termsAccepted,
                    runtimeConfigSource: runtimeResolution.source,
                    runtimeConfigBindingId: runtimeResolution.bindingId,
                    runtimeSurfaceIdentity: runtimeResolution.identity,
                  },
                },
              },
            }
          )
          checkoutSessionUpdated = true
        } catch (bridgeError) {
          bridgeWarnings.push("checkout_session_update_failed")
          console.error(
            "[Booking Bridge] checkout session updatePublicCheckoutSession failed:",
            bridgeError
          )
        }

        if (checkoutSessionUpdated) {
          try {
            checkoutFulfillmentResult = (await actionInternal(
              convex,
              generatedPublicApi.checkoutSessions.completeCheckoutAndFulfill,
              {
                sessionId: `segelschule-booking:${String(bookingId)}`,
                checkoutSessionId: checkoutSessionObjectId,
                paymentIntentId: `on_site_${String(bookingId)}`,
                paymentMethod: "invoice",
                ...(resendApiKey
                  ? { skipOrderConfirmationEmail: true }
                  : {}),
                ...(resendApiKey && notificationRecipients.length > 0
                  ? { skipSalesNotificationEmail: true }
                  : {}),
              }
            )) as BridgeCheckoutFulfillmentResult
          } catch (bridgeError) {
            bridgeWarnings.push("checkout_fulfillment_failed")
            console.error(
              "[Booking Bridge] completeCheckoutAndFulfill failed:",
              bridgeError
            )
          }
        }

        try {
          const checkoutSessionRecord = (await queryInternal(
            convex,
            generatedInternalApi.checkoutSessionOntology.getCheckoutSessionInternal,
            { checkoutSessionId: checkoutSessionObjectId }
          )) as RouterObjectRecord | null
          const checkoutProps = checkoutSessionRecord?.customProperties || {}
          const checkoutUrlFromSession =
            normalizeCheckoutUrl(checkoutProps.checkoutUrl)
            || normalizeCheckoutUrl(checkoutProps.checkoutSessionUrl)
            || normalizeCheckoutUrl(checkoutProps.publicCheckoutUrl)
          const fallbackCheckoutUrl =
            checkoutFulfillmentResult
              ? null
              : resolvedCourse.checkoutPublicUrl || null

          checkoutSession = {
            sessionId: String(checkoutSessionObjectId),
            clientSecret:
              typeof checkoutProps.clientSecret === "string" &&
              checkoutProps.clientSecret.trim().length > 0
                ? checkoutProps.clientSecret
                : null,
            amount:
              typeof checkoutProps.totalAmount === "number"
                ? checkoutProps.totalAmount
                : totalAmountCents,
            currency:
              typeof checkoutProps.currency === "string" &&
              checkoutProps.currency.trim().length > 0
                ? checkoutProps.currency
                : checkoutCurrency.toLowerCase(),
            expiresAt:
              typeof checkoutProps.expiresAt === "number"
                ? checkoutProps.expiresAt
                : Date.now() + 24 * 60 * 60 * 1000,
            checkoutUrl: checkoutUrlFromSession || fallbackCheckoutUrl,
          }

          if (!checkoutSession.checkoutUrl && !checkoutFulfillmentResult) {
            bridgeWarnings.push("checkout_url_missing")
          }
        } catch (bridgeError) {
          bridgeWarnings.push("checkout_session_read_failed")
          console.error(
            "[Booking Bridge] failed to read checkout session context:",
            bridgeError
          )
        }
      }
    }

    try {
      const localBooking = (await queryInternal(
        convex,
        generatedInternalApi.channels.router.getObjectByIdInternal,
        { objectId: bookingId }
      )) as { customProperties?: Record<string, unknown> } | null
      const localBookingProps = localBooking?.customProperties || {}
      await mutateInternal(
        convex,
        generatedInternalApi.channels.router.patchObjectInternal,
        {
          objectId: bookingId,
          customProperties: {
            ...localBookingProps,
            seats: normalizedSeatSelection.selections,
            totalSeats: normalizedSeatSelection.totalSeats,
            frontendUserId: frontendUserId ? String(frontendUserId) : null,
            platformBookingId: platformBookingId
              ? String(platformBookingId)
              : null,
            calendarDiagnostics,
            checkoutProductId: checkoutProductId
              ? String(checkoutProductId)
              : null,
            checkoutSessionId: checkoutSession
              ? String(checkoutSession.sessionId)
              : null,
            checkoutSessionUrl: checkoutSession?.checkoutUrl || null,
            checkoutFulfillmentStatus: checkoutFulfillmentResult
              ? (checkoutFulfillmentResult.success
                ? "completed"
                : "failed")
              : null,
            checkoutFulfillmentPaymentId: checkoutFulfillmentResult
              ? checkoutFulfillmentResult.paymentId
              : null,
            checkoutFulfillmentPurchasedItemIds: checkoutFulfillmentResult
              ? checkoutFulfillmentResult.purchasedItemIds
              : [],
            checkoutFulfillmentCrmContactId: checkoutFulfillmentResult?.crmContactId
              ? String(checkoutFulfillmentResult.crmContactId)
              : null,
            checkoutFulfillmentInvoiceType: checkoutFulfillmentResult
              ? checkoutFulfillmentResult.invoiceType || null
              : null,
            checkoutFulfillmentAmount: checkoutFulfillmentResult
              ? checkoutFulfillmentResult.amount
              : null,
            checkoutFulfillmentCurrency: checkoutFulfillmentResult
              ? checkoutFulfillmentResult.currency
              : null,
            courseId: resolvedCourse.courseId,
            courseName: resolvedCourse.title,
            courseDescription: resolvedCourse.description,
            courseDurationLabel: resolvedCourse.durationLabel,
            courseDurationMinutes: resolvedCourse.durationMinutes,
            coursePriceInCents: resolvedCourse.priceInCents,
            courseCurrency: resolvedCourse.currency,
            bookingResourceId: resolvedCourse.bookingResourceId,
            fulfillmentType: resolvedCourse.fulfillmentType,
            runtimeConfigSource: runtimeResolution.source,
            runtimeConfigBindingId: runtimeResolution.bindingId,
            runtimeSurfaceAppSlug: runtimeResolution.identity.appSlug,
            runtimeSurfaceType: runtimeResolution.identity.surfaceType,
            runtimeSurfaceKey: runtimeResolution.identity.surfaceKey,
            bridgeWarnings,
          },
          updatedAt: Date.now(),
        }
      )
    } catch (linkingError) {
      bridgeWarnings.push("local_booking_context_link_failed")
      console.error(
        "[Booking Bridge] local booking context link failed:",
        linkingError
      )
    }

    if (platformBookingId) {
      try {
        const platformBooking = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.getObjectByIdInternal,
          { objectId: platformBookingId }
        )) as { customProperties?: Record<string, unknown> } | null
        const platformBookingProps = platformBooking?.customProperties || {}

        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.patchObjectInternal,
          {
            objectId: platformBookingId,
            customProperties: {
              ...platformBookingProps,
              source: "segelschule_landing_booking",
              sourceBookingId: String(bookingId),
              linkedFrontendUserId: frontendUserId
                ? String(frontendUserId)
                : null,
              calendarDiagnostics,
              seatSelections: mapToResourceSeatSelections(
                normalizedSeatSelection.selections
              ),
              checkoutProductId: checkoutProductId
                ? String(checkoutProductId)
                : null,
              checkoutSessionId: checkoutSession
                ? String(checkoutSession.sessionId)
                : null,
              checkoutFulfillmentStatus: checkoutFulfillmentResult
                ? (checkoutFulfillmentResult.success
                  ? "completed"
                  : "failed")
                : null,
              checkoutFulfillmentPaymentId: checkoutFulfillmentResult
                ? checkoutFulfillmentResult.paymentId
                : null,
              checkoutFulfillmentPurchasedItemIds: checkoutFulfillmentResult
                ? checkoutFulfillmentResult.purchasedItemIds
                : [],
              checkoutFulfillmentCrmContactId: checkoutFulfillmentResult?.crmContactId
                ? String(checkoutFulfillmentResult.crmContactId)
                : null,
              courseId: resolvedCourse.courseId,
              courseName: resolvedCourse.title,
              courseDurationMinutes: resolvedCourse.durationMinutes,
              coursePriceInCents: resolvedCourse.priceInCents,
              courseCurrency: resolvedCourse.currency,
              bookingResourceId: resolvedCourse.bookingResourceId,
              fulfillmentType: resolvedCourse.fulfillmentType,
              runtimeConfigSource: runtimeResolution.source,
              runtimeConfigBindingId: runtimeResolution.bindingId,
            },
            updatedAt: Date.now(),
          }
        )
      } catch (linkingError) {
        bridgeWarnings.push("platform_booking_context_link_failed")
        console.error(
          "[Booking Bridge] platform booking context link failed:",
          linkingError
        )
      }
    }

    if (checkoutSessionObjectId) {
      try {
        const checkoutSessionObject = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.getObjectByIdInternal,
          { objectId: checkoutSessionObjectId }
        )) as { customProperties?: Record<string, unknown> } | null
        const checkoutSessionProps = checkoutSessionObject?.customProperties || {}

        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.patchObjectInternal,
          {
            objectId: checkoutSessionObjectId,
            customProperties: {
              ...checkoutSessionProps,
              source: "segelschule_landing_booking",
              sourceBookingId: String(bookingId),
              sourcePlatformBookingId: platformBookingId
                ? String(platformBookingId)
                : null,
              sourceContactId: String(contactId),
              sourceFrontendUserId: frontendUserId
                ? String(frontendUserId)
                : null,
              calendarDiagnostics,
              checkoutProductId: checkoutProductId
                ? String(checkoutProductId)
                : null,
              seatSelections: normalizedSeatSelection.selections,
              checkoutFulfillmentStatus: checkoutFulfillmentResult
                ? (checkoutFulfillmentResult.success
                  ? "completed"
                  : "failed")
                : null,
              checkoutFulfillmentPurchasedItemIds: checkoutFulfillmentResult
                ? checkoutFulfillmentResult.purchasedItemIds
                : [],
              checkoutFulfillmentPaymentId: checkoutFulfillmentResult
                ? checkoutFulfillmentResult.paymentId
                : null,
              courseId: resolvedCourse.courseId,
              courseName: resolvedCourse.title,
              courseDurationMinutes: resolvedCourse.durationMinutes,
              coursePriceInCents: resolvedCourse.priceInCents,
              courseCurrency: resolvedCourse.currency,
              bookingResourceId: resolvedCourse.bookingResourceId,
              fulfillmentType: resolvedCourse.fulfillmentType,
              runtimeConfigSource: runtimeResolution.source,
              runtimeConfigBindingId: runtimeResolution.bindingId,
              runtimeSurfaceAppSlug: runtimeResolution.identity.appSlug,
              runtimeSurfaceType: runtimeResolution.identity.surfaceType,
              runtimeSurfaceKey: runtimeResolution.identity.surfaceKey,
            },
            updatedAt: Date.now(),
          }
        )
      } catch (linkingError) {
        bridgeWarnings.push("checkout_session_context_link_failed")
        console.error(
          "[Booking Bridge] checkout session context link failed:",
          linkingError
        )
      }
    }

    if (
      checkoutSessionObjectId
      && checkoutFulfillmentResult?.success
    ) {
      try {
        const orgTickets = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            type: "ticket",
          }
        )) as RouterTicketRecord[]

        const checkoutTickets = orgTickets
          .filter((ticket) => {
            const ticketProps = (ticket.customProperties || {}) as Record<string, unknown>
            return (
              String(ticketProps.checkoutSessionId || "")
              === String(checkoutSessionObjectId)
            )
          })
          .sort(
            (left, right) =>
              Number(right.updatedAt || right.createdAt || 0)
              - Number(left.updatedAt || left.createdAt || 0)
          )

        if (checkoutTickets.length === 0) {
          bridgeWarnings.push("checkout_tickets_missing")
        }

        const usedTicketCodes = new Set<string>()
        for (const ticket of checkoutTickets) {
          const ticketProps = (ticket.customProperties || {}) as Record<string, unknown>
          const existingTicketCode = normalizeTicketCode(ticketProps.ticketCode)
          if (existingTicketCode) {
            usedTicketCodes.add(existingTicketCode)
          }

          const generatedOrExistingCode =
            existingTicketCode || generateTicketCode(usedTicketCodes)
          const holderEmail =
            normalizeEmail(ticketProps.holderEmail)
            || normalizeEmail(data.formData.email)
          const lookupUrl = buildTicketLookupUrl({
            baseUrl: ticketLookupBaseUrl,
            ticketCode: generatedOrExistingCode,
            holderEmail,
          })

          const nextTicketProps: Record<string, unknown> = {
            ...ticketProps,
            ticketCode: generatedOrExistingCode,
            source: "segelschule_landing_booking",
            sourceBookingId: String(bookingId),
            sourcePlatformBookingId: platformBookingId
              ? String(platformBookingId)
              : null,
            sourceCheckoutSessionId: String(checkoutSessionObjectId),
            sourceContactId: String(contactId),
            sourceFrontendUserId: frontendUserId
              ? String(frontendUserId)
              : null,
            bookingCourseId: resolvedCourse.courseId,
            bookingCourseName: resolvedCourse.title,
            bookingCourseDescription: resolvedCourse.description,
            bookingCourseDurationLabel: resolvedCourse.durationLabel,
            bookingCourseDurationMinutes: resolvedCourse.durationMinutes,
            bookingCoursePriceInCents: resolvedCourse.priceInCents,
            bookingCourseCurrency: resolvedCourse.currency,
            bookingCheckoutProductId: String(checkoutProductId),
            bookingResourceId: resolvedCourse.bookingResourceId,
            bookingFulfillmentType: resolvedCourse.fulfillmentType,
            bookingDate: data.date,
            bookingTime: data.time,
            bookingTotalSeats: normalizedSeatSelection.totalSeats,
            bookingSeatSelections: normalizedSeatSelection.selections,
            bookingTotalAmountCents: totalAmountCents,
            bookingLanguage: data.language,
            ticketLookupEmail: holderEmail,
            ticketLookupUrl: lookupUrl,
            runtimeConfigSource: runtimeResolution.source,
            runtimeConfigBindingId: runtimeResolution.bindingId,
            runtimeSurfaceAppSlug: runtimeResolution.identity.appSlug,
            runtimeSurfaceType: runtimeResolution.identity.surfaceType,
            runtimeSurfaceKey: runtimeResolution.identity.surfaceKey,
            updatedFromSegelschuleBookingApiAt: Date.now(),
          }

          try {
            await mutateInternal(
              convex,
              generatedInternalApi.channels.router.patchObjectInternal,
              {
                objectId: ticket._id,
                customProperties: nextTicketProps,
                updatedAt: Date.now(),
              }
            )
          } catch (linkingError) {
            bridgeWarnings.push("ticket_context_link_failed")
            console.error(
              "[Booking Bridge] ticket context link failed:",
              linkingError
            )
            if (!existingTicketCode) {
              continue
            }
          }

          ticketContexts.push({
            ticketId: String(ticket._id),
            ticketCode: generatedOrExistingCode,
            holderEmail,
            holderName: normalizeOptionalString(ticketProps.holderName),
            lookupUrl,
          })
        }

        const normalizedCustomerEmail = normalizeEmail(data.formData.email)
        primaryTicketContext =
          ticketContexts.find(
            (ticket) =>
              normalizeEmail(ticket.holderEmail) === normalizedCustomerEmail
          )
          || ticketContexts[0]
          || null
      } catch (ticketLookupError) {
        bridgeWarnings.push("checkout_ticket_lookup_failed")
        console.error(
          "[Booking Bridge] checkout ticket lookup failed:",
          ticketLookupError
        )
      }
    }

    if (ticketContexts.length > 0) {
      const ticketIds = ticketContexts.map((ticket) => ticket.ticketId)
      const ticketCodes = ticketContexts.map((ticket) => ticket.ticketCode)
      const ticketLookupUrl = primaryTicketContext?.lookupUrl || null

      try {
        const localBooking = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.getObjectByIdInternal,
          { objectId: bookingId }
        )) as { customProperties?: Record<string, unknown> } | null
        const localBookingProps = localBooking?.customProperties || {}
        await mutateInternal(
          convex,
          generatedInternalApi.channels.router.patchObjectInternal,
          {
            objectId: bookingId,
            customProperties: {
              ...localBookingProps,
              ticketIds,
              ticketCodes,
              primaryTicketId: primaryTicketContext?.ticketId || null,
              primaryTicketCode: primaryTicketContext?.ticketCode || null,
              primaryTicketLookupUrl: ticketLookupUrl,
            },
            updatedAt: Date.now(),
          }
        )
      } catch (linkingError) {
        bridgeWarnings.push("local_booking_ticket_context_link_failed")
        console.error(
          "[Booking Bridge] local booking ticket context link failed:",
          linkingError
        )
      }

      if (platformBookingId) {
        try {
          const platformBooking = (await queryInternal(
            convex,
            generatedInternalApi.channels.router.getObjectByIdInternal,
            { objectId: platformBookingId }
          )) as { customProperties?: Record<string, unknown> } | null
          const platformBookingProps = platformBooking?.customProperties || {}
          await mutateInternal(
            convex,
            generatedInternalApi.channels.router.patchObjectInternal,
            {
              objectId: platformBookingId,
              customProperties: {
                ...platformBookingProps,
                ticketIds,
                ticketCodes,
                primaryTicketId: primaryTicketContext?.ticketId || null,
                primaryTicketCode: primaryTicketContext?.ticketCode || null,
              },
              updatedAt: Date.now(),
            }
          )
        } catch (linkingError) {
          bridgeWarnings.push("platform_booking_ticket_context_link_failed")
          console.error(
            "[Booking Bridge] platform booking ticket context link failed:",
            linkingError
          )
        }
      }

      if (checkoutSessionObjectId) {
        try {
          const checkoutSessionObject = (await queryInternal(
            convex,
            generatedInternalApi.channels.router.getObjectByIdInternal,
            { objectId: checkoutSessionObjectId }
          )) as { customProperties?: Record<string, unknown> } | null
          const checkoutSessionProps = checkoutSessionObject?.customProperties || {}
          await mutateInternal(
            convex,
            generatedInternalApi.channels.router.patchObjectInternal,
            {
              objectId: checkoutSessionObjectId,
              customProperties: {
                ...checkoutSessionProps,
                sourceTicketIds: ticketIds,
                sourceTicketCodes: ticketCodes,
                sourcePrimaryTicketId: primaryTicketContext?.ticketId || null,
                sourcePrimaryTicketCode:
                  primaryTicketContext?.ticketCode || null,
              },
              updatedAt: Date.now(),
            }
          )
        } catch (linkingError) {
          bridgeWarnings.push("checkout_session_ticket_context_link_failed")
          console.error(
            "[Booking Bridge] checkout session ticket context link failed:",
            linkingError
          )
        }
      }
    }

    let invoiceSummary: {
      invoiceId: string
      invoiceNumber: string | null
      status: string | null
      type: string | null
      pdfUrl: string | null
      attachmentReady: boolean
    } | null = null
    let linkedTransactions: RouteTransactionRecord[] = []
    let primaryTransaction: RouteTransactionRecord | null = null
    let workflowDispatch: BookingWorkflowDispatchResult | null = null
    let confirmationEmailAttachments:
      | Array<{ filename: string; content: string; contentType: string }>
      | undefined

    if (checkoutSessionObjectId && checkoutFulfillmentResult?.success) {
      try {
        const invoice = (await queryInternal(
          convex,
          generatedInternalApi.invoicingOntology.getInvoiceByCheckoutSessionInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            checkoutSessionId: checkoutSessionObjectId,
          }
        )) as RouterObjectRecord | null

        if (!invoice) {
          if (checkoutFulfillmentResult.invoiceType !== "none") {
            pushWarningOnce(bridgeWarnings, "invoice_record_missing")
          }
        } else {
          const invoiceProps = (invoice.customProperties || {}) as Record<string, unknown>
          const invoiceLinkageProps = {
            invoiceId: String(invoice._id),
            invoiceNumber: normalizeOptionalString(invoiceProps.invoiceNumber),
            invoiceStatus: invoice.status || null,
            invoiceSubtype: invoice.subtype || null,
            invoicePdfUrl: normalizeOptionalString(invoiceProps.pdfUrl),
          }

          for (const targetObjectId of [
            bookingId,
            platformBookingId,
            checkoutSessionObjectId,
            ...ticketContexts.map((ticket) => ticket.ticketId as Id<"objects">),
          ]) {
            if (!targetObjectId) {
              continue
            }

            try {
              await mergeObjectCustomProperties({
                convex,
                objectId: targetObjectId as Id<"objects">,
                additions: invoiceLinkageProps,
              })
            } catch (error) {
              pushWarningOnce(bridgeWarnings, "invoice_context_link_failed")
              console.error(
                "[Booking Bridge] invoice context link failed:",
                targetObjectId,
                error
              )
            }
          }

          invoiceSummary = {
            invoiceId: String(invoice._id),
            invoiceNumber: normalizeOptionalString(invoiceProps.invoiceNumber),
            status: invoice.status || null,
            type: invoice.subtype || checkoutFulfillmentResult.invoiceType || null,
            pdfUrl: normalizeOptionalString(invoiceProps.pdfUrl),
            attachmentReady: false,
          }

          if (
            resendApiKey
            && invoiceSummary.type
            && invoiceSummary.type !== "none"
            && invoiceSummary.type !== "employer"
          ) {
            const generatedInvoicePdf = (await actionInternal(
              convex,
              generatedPublicApi.pdfGeneration.generateInvoicePDF,
              {
                checkoutSessionId: checkoutSessionObjectId,
                ...(invoiceProps.crmOrganizationId
                  ? { crmOrganizationId: invoiceProps.crmOrganizationId as Id<"objects"> }
                  : {}),
                ...(invoiceProps.crmContactId || checkoutFulfillmentResult.crmContactId
                  ? {
                      crmContactId: (
                        invoiceProps.crmContactId
                        || checkoutFulfillmentResult.crmContactId
                      ) as Id<"objects">,
                    }
                  : {}),
              }
            )) as
              | {
                  filename: string
                  content: string
                  contentType: string
                }
              | null

            if (generatedInvoicePdf) {
              confirmationEmailAttachments = [
                {
                  filename: generatedInvoicePdf.filename,
                  content: generatedInvoicePdf.content,
                  contentType: generatedInvoicePdf.contentType,
                },
              ]
              invoiceSummary.attachmentReady = true
            } else {
              pushWarningOnce(bridgeWarnings, "invoice_pdf_generation_failed")
            }
          }
        }
      } catch (invoiceError) {
        pushWarningOnce(bridgeWarnings, "invoice_verification_failed")
        console.error("[Booking Bridge] invoice verification failed:", invoiceError)
      }
    }

    if (checkoutSessionObjectId && checkoutFulfillmentResult?.success) {
      try {
        const orgTransactions = (await queryInternal(
          convex,
          generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
          {
            organizationId: organizationId as Id<"organizations">,
            type: "transaction",
          }
        )) as RouteTransactionRecord[]

        linkedTransactions = orgTransactions
          .filter((transaction) => {
            const transactionProps = asRecord(transaction.customProperties)
            return (
              String(transactionProps.checkoutSessionId || "")
              === String(checkoutSessionObjectId)
            )
          })
          .sort(
            (left, right) =>
              Number(right.updatedAt || right.createdAt || 0)
              - Number(left.updatedAt || left.createdAt || 0)
          )
        primaryTransaction = linkedTransactions[0] || null

        if (linkedTransactions.length === 0) {
          pushWarningOnce(bridgeWarnings, "checkout_transactions_missing")
        } else {
          const transactionIds = linkedTransactions.map((transaction) =>
            String(transaction._id)
          )
          const primaryTransactionId = String(primaryTransaction!._id)
          const transactionLinkageProps = {
            transactionIds,
            primaryTransactionId,
            primaryTransactionStatus: primaryTransaction?.status || null,
            primaryTransactionSubtype: primaryTransaction?.subtype || null,
          }

          for (const targetObjectId of [
            bookingId,
            platformBookingId,
            checkoutSessionObjectId,
            ...ticketContexts.map((ticket) => ticket.ticketId as Id<"objects">),
          ]) {
            if (!targetObjectId) {
              continue
            }

            try {
              await mergeObjectCustomProperties({
                convex,
                objectId: targetObjectId as Id<"objects">,
                additions: transactionLinkageProps,
              })
            } catch (error) {
              pushWarningOnce(bridgeWarnings, "transaction_context_link_failed")
              console.error(
                "[Booking Bridge] transaction context link failed:",
                targetObjectId,
                error
              )
            }
          }
        }
      } catch (transactionError) {
        pushWarningOnce(bridgeWarnings, "transaction_verification_failed")
        console.error(
          "[Booking Bridge] transaction verification failed:",
          transactionError
        )
      }

      if (emailExecutionResolution.authorized !== true) {
        try {
          workflowDispatch = (await actionInternal(
            convex,
            generatedInternalApi.bookingWorkflowAutomation
              .dispatchBookingCreatedLayerWorkflows,
            {
              organizationId: organizationId as Id<"organizations">,
              bookingId,
              checkoutSessionId: checkoutSessionObjectId,
              transactionIds: linkedTransactions.map((transaction) => transaction._id),
              ticketIds: ticketContexts.map((ticket) => ticket.ticketId as Id<"objects">),
              contactId,
              ...(platformBookingId ? { platformBookingId } : {}),
              ...(frontendUserId ? { frontendUserId } : {}),
              paymentMethod: data.paymentMethod || "invoice",
              ...(invoiceSummary?.invoiceId
                ? { invoiceId: invoiceSummary.invoiceId as Id<"objects"> }
                : {}),
              source: "segelschule_landing_booking",
            }
          )) as BookingWorkflowDispatchResult
        } catch (workflowError) {
          pushWarningOnce(bridgeWarnings, "booking_created_workflow_dispatch_failed")
          console.error(
            "[Booking Bridge] booking created workflow dispatch failed:",
            workflowError
          )
        }
      }
    }

    // -----------------------------------------------------------------
    // Emails (non-fatal, parallel)
    // -----------------------------------------------------------------
    const useWorkflowDrivenNotifications =
      emailExecutionResolution.authorized !== true
      && workflowDispatch?.ok === true
      && workflowDispatch.dispatchedWorkflows > 0
    const emailPromises: Promise<BookingEmailDeliveryRecord | null>[] = []
    const sentEmailDeliveries: BookingEmailDeliveryRecord[] = []

    const senderProfile = await resolveBookingEmailSenderProfile(
      convex,
      organizationId
    )
    const fromEmail = senderProfile.fromEmail
    const primaryTransactionProps = asRecord(primaryTransaction?.customProperties)
    const primaryTransactionLineItems = Array.isArray(primaryTransactionProps.lineItems)
      ? (primaryTransactionProps.lineItems as RouteTransactionLineItem[])
      : []
    const primaryTransactionLineItem = primaryTransactionLineItems[0] || null
    const commercialCurrency =
      normalizeOptionalString(primaryTransactionProps.currency)
      || resolvedCourse.currency
    const commercialTotalAmountCents =
      normalizeNumber(primaryTransactionProps.totalInCents)
      || totalAmountCents
    const commercialCourseName =
      normalizeOptionalString(primaryTransactionLineItem?.productName)
      || resolvedCourse.title
    const primaryLineItemTotalInCents =
      normalizeNumber(primaryTransactionLineItem?.totalPriceInCents)
    const primaryLineItemQuantity =
      normalizeNumber(primaryTransactionLineItem?.quantity)
    const commercialUnitPriceInCents =
      primaryLineItemTotalInCents && primaryLineItemQuantity && primaryLineItemQuantity > 0
        ? Math.round(primaryLineItemTotalInCents / primaryLineItemQuantity)
        : resolvedCourse.priceInCents
    const commercialCoursePriceDisplay = formatCurrencyAmount({
      amountInCents: commercialUnitPriceInCents,
      currency: commercialCurrency,
      language: data.language,
    })

    const emailData: BookingEmailData = {
      customerName: data.formData.name,
      customerEmail: data.formData.email,
      customerPhone: data.formData.phone,
      courseName: commercialCourseName,
      coursePrice: commercialCoursePriceDisplay,
      date: data.date,
      time: data.time,
      seats: normalizedSeatSelection.selections,
      totalSeats: normalizedSeatSelection.totalSeats,
      totalAmount: commercialTotalAmountCents / 100,
      tshirtSize: data.formData.tshirtSize,
      needsAccommodation: data.formData.needsAccommodation,
      message: data.formData.message,
      bookingId: String(bookingId),
      language: data.language,
      paymentMethod: "invoice",
      ticketCode: primaryTicketContext?.ticketCode || undefined,
      ticketLookupUrl: primaryTicketContext?.lookupUrl || undefined,
      invoiceAttachmentIncluded: Boolean(confirmationEmailAttachments?.length),
      bookingStatusLabel:
        data.paymentMethod === "invoice"
          ? "Invoice issued - payment pending on site"
          : "Pending Confirmation",
    }
    const confirmationSubject =
      data.language === "de"
        ? `Buchungsbest\u00e4tigung - ${commercialCourseName}`
        : data.language === "nl"
          ? `Boekingsbevestiging - ${commercialCourseName}`
          : `Booking Confirmation - ${commercialCourseName}`
    const operatorNotificationSubject = `New Booking: ${escapeHtml(data.formData.name)} - ${commercialCourseName}`
    const confirmationHtml = buildBookingConfirmationHtml(emailData)
    const notificationHtml = buildBookingNotificationHtml(emailData)
    const confirmationRecipients = resolveBookingEmailRecipients({
      baseRecipients: [data.formData.email],
      overrideRecipients: emailExecutionControl.customerRecipients,
      mode: emailExecutionControl.mode,
    })
    const operatorNotificationRecipients = resolveBookingEmailRecipients({
      baseRecipients: notificationRecipients,
      overrideRecipients: emailExecutionControl.operatorRecipients,
      mode: emailExecutionControl.mode,
    })

    if (!useWorkflowDrivenNotifications) {
      if (
        emailExecutionControl.capturePreviews
        && confirmationRecipients.length > 0
      ) {
        capturedEmailPreviews.push({
          kind: "customer_confirmation",
          to: confirmationRecipients,
          subject: confirmationSubject,
          html: confirmationHtml,
          attachments: summarizeBookingEmailAttachments(
            confirmationEmailAttachments
          ),
        })
      }

      if (
        emailExecutionControl.capturePreviews
        && operatorNotificationRecipients.length > 0
      ) {
        capturedEmailPreviews.push({
          kind: "operator_notification",
          to: operatorNotificationRecipients,
          subject: operatorNotificationSubject,
          html: notificationHtml,
          attachments: [],
        })
      }

      // Booking confirmation to customer
      if (
        resendApiKey
        && emailExecutionControl.mode !== "capture"
        && confirmationRecipients.length > 0
      ) {
        emailPromises.push(
          (async () => {
            try {
              const resend = createResendClient(resendApiKey!)
              const sendResult = await resend.emails.send({
                from: fromEmail,
                to: confirmationRecipients.length === 1
                  ? confirmationRecipients[0]
                  : confirmationRecipients,
                subject: confirmationSubject,
                html: confirmationHtml,
                ...(confirmationEmailAttachments
                  ? { attachments: confirmationEmailAttachments }
                  : {}),
                ...(senderProfile.replyToEmail
                  ? { replyTo: senderProfile.replyToEmail }
                  : {}),
                headers: {
                  "X-Entity-Ref-ID": `booking-confirm-${Date.now()}`,
                },
              })
              const resendError = extractResendErrorMessage(sendResult)
              if (resendError) {
                throw new Error(resendError)
              }

              return {
                kind: "customer_confirmation" as const,
                to: confirmationRecipients,
                subject: confirmationSubject,
                transport: "resend_direct" as const,
                success: true,
                messageId: extractResendMessageId(sendResult),
                error: null,
              }
            } catch (err) {
              console.error("[Booking] Direct confirmation email failed, trying fallback:", err)
              if (
                emailExecutionControl.mode !== "live"
                || !checkoutSessionObjectId
              ) {
                throw err
              }

              const fallbackResult = await actionInternal(
                convex,
                generatedInternalApi.ticketGeneration.sendOrderConfirmationEmail,
                {
                  checkoutSessionId: checkoutSessionObjectId,
                  recipientEmail: confirmationRecipients[0] || data.formData.email,
                  recipientName: data.formData.name,
                  includeInvoicePDF:
                    Boolean(invoiceSummary)
                    && invoiceSummary?.type !== "none"
                    && invoiceSummary?.type !== "employer",
                }
              )
              const success = fallbackResult?.success !== false
              return {
                kind: "customer_confirmation" as const,
                to: confirmationRecipients,
                subject: confirmationSubject,
                transport: "ticket_generation_fallback" as const,
                success,
                messageId: normalizeOptionalString(fallbackResult?.emailId),
                error: success
                  ? null
                  : normalizeOptionalString(fallbackResult?.error)
                    || normalizeErrorMessage(err),
              }
            }
          })().catch((err) => {
            console.error("[Booking] Confirmation email failed:", err)
            return {
              kind: "customer_confirmation" as const,
              to: confirmationRecipients,
              subject: confirmationSubject,
              transport: "resend_direct" as const,
              success: false,
              messageId: null,
              error: normalizeErrorMessage(err),
            }
          })
        )
      }

      // Booking notification to team
      if (
        resendApiKey
        && emailExecutionControl.mode !== "capture"
        && operatorNotificationRecipients.length > 0
      ) {
        emailPromises.push(
          (async () => {
            const resend = createResendClient(resendApiKey!)
            const sendResult = await resend.emails.send({
              from: fromEmail,
              to: operatorNotificationRecipients,
              replyTo: data.formData.email || senderProfile.replyToEmail || undefined,
              subject: operatorNotificationSubject,
              html: notificationHtml,
              headers: {
                "X-Entity-Ref-ID": `booking-notify-${Date.now()}`,
              },
            })
            const resendError = extractResendErrorMessage(sendResult)
            if (resendError) {
              throw new Error(resendError)
            }

            return {
              kind: "operator_notification" as const,
              to: operatorNotificationRecipients,
              subject: operatorNotificationSubject,
              transport: "resend_direct" as const,
              success: true,
              messageId: extractResendMessageId(sendResult),
              error: null,
            }
          })().catch((err) => {
            console.error("[Booking] Notification email failed:", err)
            return {
              kind: "operator_notification" as const,
              to: operatorNotificationRecipients,
              subject: operatorNotificationSubject,
              transport: "resend_direct" as const,
              success: false,
              messageId: null,
              error: normalizeErrorMessage(err),
            }
          })
        )
      }
    }

    const emailResults = await Promise.all(emailPromises)
    for (const result of emailResults) {
      if (result) {
        sentEmailDeliveries.push(result)
      }
    }

    return NextResponse.json(
      {
        ok: true,
        bookingId,
        contactId,
        frontendUserId,
        platformBookingId,
        checkoutProductId,
        course: {
          requestedCourseId: data.courseId,
          courseId: resolvedCourse.courseId,
          title: resolvedCourse.title,
          description: resolvedCourse.description,
          durationLabel: resolvedCourse.durationLabel,
          durationMinutes: resolvedCourse.durationMinutes,
          priceInCents: resolvedCourse.priceInCents,
          currency: resolvedCourse.currency,
          isMultiDay: resolvedCourse.isMultiDay,
          bookingResourceId: resolvedCourse.bookingResourceId,
          fulfillmentType: resolvedCourse.fulfillmentType,
        },
        checkoutSession,
        ticket: primaryTicketContext,
        tickets: ticketContexts,
        transactions: linkedTransactions.map((transaction) => ({
          transactionId: String(transaction._id),
          status: transaction.status || null,
          subtype: transaction.subtype || null,
        })),
        invoice: invoiceSummary,
        workflowDispatch,
        checkoutFulfillment: checkoutFulfillmentResult
          ? {
            success: checkoutFulfillmentResult.success,
            purchasedItemIds: checkoutFulfillmentResult.purchasedItemIds,
            crmContactId: checkoutFulfillmentResult.crmContactId
              ? String(checkoutFulfillmentResult.crmContactId)
              : null,
            paymentId: checkoutFulfillmentResult.paymentId,
            amount: checkoutFulfillmentResult.amount,
            currency: checkoutFulfillmentResult.currency,
            invoiceType: checkoutFulfillmentResult.invoiceType || null,
            isGuestRegistration: checkoutFulfillmentResult.isGuestRegistration,
            frontendUserId: checkoutFulfillmentResult.frontendUserId
              ? String(checkoutFulfillmentResult.frontendUserId)
              : null,
            completedInApi: true,
          }
          : null,
        runtimeConfigSource: runtimeResolution.source,
        runtimeConfigBindingId: runtimeResolution.bindingId,
        runtimeSurfaceIdentity: runtimeResolution.identity,
        ...(emailExecutionResolution.authorized
          ? {
              emailDispatch: {
                mode: emailExecutionControl.mode,
                capturePreviews: emailExecutionControl.capturePreviews,
                fixtureKey: emailExecutionControl.fixtureKey,
                fixtureLabel: emailExecutionControl.fixtureLabel,
                fromEmail,
                defaultReplyTo: senderProfile.replyToEmail,
                senderSource: senderProfile.source,
                previews: capturedEmailPreviews,
                deliveries: sentEmailDeliveries,
              },
            }
          : {}),
        ...(fixtureOptionsResolution.authorized
          ? {
              fixtureExecution: {
                ignoreOutsideAvailability:
                  fixtureOptions.ignoreOutsideAvailability,
              },
            }
          : {}),
        calendarDiagnostics,
        termsAccepted: data.termsAccepted,
        warnings: bridgeWarnings,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("[Booking] Failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Booking failed",
      },
      { status: 500 }
    )
  }
}
