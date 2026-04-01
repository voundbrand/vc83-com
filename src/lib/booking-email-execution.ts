export type BookingEmailDeliveryMode = "live" | "capture" | "redirect"

export interface BookingEmailExecutionControl {
  mode: BookingEmailDeliveryMode
  capturePreviews: boolean
  markAsSent: boolean
  customerRecipients: string[]
  operatorRecipients: string[]
  fixtureKey: string | null
  fixtureLabel: string | null
}

export interface BookingEmailAttachmentSummary {
  filename: string
  contentType: string
  base64Length: number
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return null
  }

  const lowered = normalized.toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lowered) ? lowered : null
}

export function normalizeBookingEmailRecipients(value: unknown): string[] {
  if (Array.isArray(value)) {
    const seen = new Set<string>()
    const recipients: string[] = []

    for (const entry of value) {
      const normalized = normalizeEmail(entry)
      if (!normalized || seen.has(normalized)) {
        continue
      }
      seen.add(normalized)
      recipients.push(normalized)
    }

    return recipients
  }

  const normalized = normalizeOptionalString(value)
  if (!normalized) {
    return []
  }

  try {
    const parsed = JSON.parse(normalized) as unknown
    if (Array.isArray(parsed)) {
      return normalizeBookingEmailRecipients(parsed)
    }
  } catch {
    // fall through to comma-separated parsing
  }

  return normalizeBookingEmailRecipients(normalized.split(","))
}

export function normalizeBookingEmailExecutionControl(
  value: unknown,
  options?: {
    defaultMarkAsSent?: boolean
  }
): BookingEmailExecutionControl {
  const defaultMarkAsSent = options?.defaultMarkAsSent === true

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      mode: "live",
      capturePreviews: false,
      markAsSent: defaultMarkAsSent,
      customerRecipients: [],
      operatorRecipients: [],
      fixtureKey: null,
      fixtureLabel: null,
    }
  }

  const record = value as Record<string, unknown>
  const rawMode = normalizeOptionalString(record.mode)
  const mode: BookingEmailDeliveryMode =
    rawMode === "capture" || rawMode === "redirect" ? rawMode : "live"

  return {
    mode,
    capturePreviews:
      typeof record.capturePreviews === "boolean"
        ? record.capturePreviews
        : mode !== "live",
    markAsSent:
      typeof record.markAsSent === "boolean"
        ? record.markAsSent
        : defaultMarkAsSent,
    customerRecipients: normalizeBookingEmailRecipients(record.customerRecipients),
    operatorRecipients: normalizeBookingEmailRecipients(record.operatorRecipients),
    fixtureKey: normalizeOptionalString(record.fixtureKey),
    fixtureLabel: normalizeOptionalString(record.fixtureLabel),
  }
}

export function resolveBookingEmailRecipients(args: {
  baseRecipients: string[]
  overrideRecipients: string[]
  mode: BookingEmailDeliveryMode
}): string[] {
  if (args.mode === "redirect" && args.overrideRecipients.length > 0) {
    return [...args.overrideRecipients]
  }
  return [...args.baseRecipients]
}

export function summarizeBookingEmailAttachments(
  attachments:
    | Array<{
        filename: string
        content: string
        contentType: string
      }>
    | undefined
): BookingEmailAttachmentSummary[] {
  return (attachments || []).map((attachment) => ({
    filename: attachment.filename,
    contentType: attachment.contentType,
    base64Length: attachment.content.length,
  }))
}
